import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { getLLM } from './llm-service';
import { searchVectorStore } from './vector-service';
import { RAGResponse, SearchResult } from '@fileai/shared';

// Minimum similarity score threshold for initial filtering
const MIN_SIMILARITY_SCORE = 0.3;

/**
 * Deduplicate search results by documentId, keeping the highest scoring chunk for each document.
 * Multiple chunks from the same document are merged into a single result with combined content.
 */
function deduplicateByDocument(results: SearchResult[]): SearchResult[] {
  const documentMap = new Map<string, SearchResult & { allContent: string[] }>();

  for (const result of results) {
    const docId = result.metadata?.documentId as string;
    if (!docId) continue;

    const existing = documentMap.get(docId);
    if (!existing) {
      // First chunk from this document
      documentMap.set(docId, {
        ...result,
        allContent: [result.content],
      });
    } else {
      // Add content from additional chunk
      existing.allContent.push(result.content);
      // Keep the higher score
      if (result.score > existing.score) {
        existing.score = result.score;
      }
    }
  }

  // Convert back to SearchResult array, combining content from multiple chunks
  return Array.from(documentMap.values()).map(({ allContent, ...rest }) => ({
    ...rest,
    // Combine all chunks' content with separator for context
    content: allContent.join('\n\n---\n\n'),
  }));
}

/**
 * LLM-based source verification prompt
 * Asks the LLM to identify which sources are relevant to the question
 */
const SOURCE_VERIFICATION_PROMPT = `You are a relevance evaluator. Given a question and a list of document sources, determine which sources contain information relevant to answering the question.

Question: {question}

Sources:
{sources}

Analyze each source and return ONLY a JSON array of relevant source numbers (1-indexed).
For example, if sources 1 and 3 are relevant but source 2 is not, return: [1, 3]
If no sources are relevant, return: []

IMPORTANT: Return ONLY the JSON array, no other text or explanation.

Relevant sources:`;

/**
 * Use LLM to verify which sources are actually relevant to the question
 */
async function verifySourcesWithLLM(
  question: string,
  sources: SearchResult[]
): Promise<SearchResult[]> {
  if (sources.length === 0) return [];
  if (sources.length === 1) return sources; // Single source, skip verification

  try {
    const llm = await getLLM();
    const prompt = PromptTemplate.fromTemplate(SOURCE_VERIFICATION_PROMPT);
    const chain = RunnableSequence.from([prompt, llm, new StringOutputParser()]);

    // Format sources for the prompt
    const sourcesText = sources
      .map((source, index) => {
        const filename = (source.metadata?.filename as string) || 'Unknown file';
        // Truncate content to avoid too long context
        const content =
          source.content.length > 500 ? source.content.substring(0, 500) + '...' : source.content;
        return `[Source ${index + 1}] (${filename})\n${content}`;
      })
      .join('\n\n');

    const result = await chain.invoke({
      question,
      sources: sourcesText,
    });

    // Parse the JSON response
    const cleanedResult = result.trim();
    // Extract JSON array from response (handle cases where LLM adds extra text)
    const jsonMatch = cleanedResult.match(/\[[\d,\s]*\]/);

    if (!jsonMatch) {
      console.warn('LLM source verification returned invalid format, using all sources');
      return sources;
    }

    const relevantIndices: number[] = JSON.parse(jsonMatch[0]);

    // Filter sources based on LLM's selection (convert 1-indexed to 0-indexed)
    const verifiedSources = sources.filter((_, index) => relevantIndices.includes(index + 1));

    // If LLM says no sources are relevant but we have high-scoring ones, keep the best
    if (verifiedSources.length === 0 && sources.length > 0) {
      // Keep sources with score >= 0.6 as a fallback
      const highScoreSources = sources.filter((s) => s.score >= 0.6);
      return highScoreSources.length > 0 ? highScoreSources : [sources[0]];
    }

    return verifiedSources;
  } catch (error) {
    console.error('LLM source verification failed:', error);
    // Fallback to returning all sources if verification fails
    return sources;
  }
}

const RAG_PROMPT_TEMPLATE = `You are a helpful AI assistant that answers questions based on the provided context from documents.

Context from documents:
{context}

Chat History:
{chat_history}

Question: {question}

Please provide a comprehensive answer based on the context above and the chat history. If the context doesn't contain enough information to answer the question, say so clearly. Always cite which parts of the context you used to form your answer.

Answer:`;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function performRAGQuery(
  query: string,
  userId: string,
  topK: number = 5,
  documentIds?: string[],
  chatHistory: ChatMessage[] = []
): Promise<RAGResponse> {
  // 1. Search for relevant documents (get more results to account for deduplication and verification)
  const filter = documentIds ? { documentId: { $in: documentIds } } : undefined;
  // Fetch more chunks to ensure we have enough after deduplication
  const expandedTopK = topK * 3;
  const rawResults = await searchVectorStore(query, userId, expandedTopK, filter);

  if (rawResults.length === 0) {
    return {
      answer: "I couldn't find any relevant information in your documents to answer this question.",
      sources: [],
    };
  }

  // 2. Filter out very low-scoring results (initial filtering)
  const relevantResults = rawResults.filter((result) => result.score >= MIN_SIMILARITY_SCORE);

  if (relevantResults.length === 0) {
    return {
      answer: "I couldn't find any relevant information in your documents to answer this question.",
      sources: [],
    };
  }

  // 3. Deduplicate results by documentId and limit to topK documents
  const deduplicatedResults = deduplicateByDocument(relevantResults).slice(0, topK);

  // 4. Use LLM to verify which sources are actually relevant
  const verifiedSources = await verifySourcesWithLLM(query, deduplicatedResults);

  if (verifiedSources.length === 0) {
    return {
      answer: "I couldn't find any relevant information in your documents to answer this question.",
      sources: [],
    };
  }

  // 5. Prepare context from verified sources only
  const context = verifiedSources
    .map((result, index) => {
      return `[Source ${index + 1}] ${result.content}`;
    })
    .join('\n\n');

  // 6. Create RAG chain and generate answer
  const llm = await getLLM();
  const prompt = PromptTemplate.fromTemplate(RAG_PROMPT_TEMPLATE);
  const chain = RunnableSequence.from([prompt, llm, new StringOutputParser()]);

  const chatHistoryText = chatHistory
    .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');

  const answer = await chain.invoke({
    context,
    chat_history: chatHistoryText,
    question: query,
  });

  return {
    answer,
    sources: verifiedSources,
  };
}

// Streaming version for real-time responses
export async function performRAGQueryStream(
  query: string,
  userId: string,
  topK: number = 5,
  documentIds?: string[],
  chatHistory: ChatMessage[] = []
) {
  // 1. Search for relevant documents (get more results to account for deduplication)
  const filter = documentIds ? { documentId: { $in: documentIds } } : undefined;
  const expandedTopK = topK * 3;
  const rawResults = await searchVectorStore(query, userId, expandedTopK, filter);

  if (rawResults.length === 0) {
    return {
      stream: null,
      sources: [],
    };
  }

  // 2. Filter out very low-scoring results (initial filtering)
  const relevantResults = rawResults.filter((result) => result.score >= MIN_SIMILARITY_SCORE);

  if (relevantResults.length === 0) {
    return {
      stream: null,
      sources: [],
    };
  }

  // 3. Deduplicate results by documentId and limit to topK documents
  const deduplicatedResults = deduplicateByDocument(relevantResults).slice(0, topK);

  // 4. Use LLM to verify which sources are actually relevant
  const verifiedSources = await verifySourcesWithLLM(query, deduplicatedResults);

  if (verifiedSources.length === 0) {
    return {
      stream: null,
      sources: [],
    };
  }

  // 5. Prepare context from verified sources only
  const context = verifiedSources
    .map((result, index) => {
      return `[Source ${index + 1}] ${result.content}`;
    })
    .join('\n\n');

  // 6. Create streaming chain
  const llm = await getLLM();
  const prompt = PromptTemplate.fromTemplate(RAG_PROMPT_TEMPLATE);

  const chain = RunnableSequence.from([prompt, llm, new StringOutputParser()]);

  const chatHistoryText = chatHistory
    .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');

  const stream = await chain.stream({
    context,
    chat_history: chatHistoryText,
    question: query,
  });

  return {
    stream,
    sources: verifiedSources,
  };
}
