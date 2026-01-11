import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { getLLM } from "./llm-service";
import { searchVectorStore } from "./vector-service";
import { RAGResponse, SearchResult } from "@fileai/shared";

/**
 * Deduplicate search results by documentId, keeping the highest scoring chunk for each document.
 * Multiple chunks from the same document are merged into a single result with combined content.
 */
function deduplicateByDocument(results: SearchResult[]): SearchResult[] {
    const documentMap = new Map<
        string,
        SearchResult & { allContent: string[] }
    >();

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
        content: allContent.join("\n\n---\n\n"),
    }));
}

const RAG_PROMPT_TEMPLATE = `You are a helpful AI assistant that answers questions based on the provided context from documents.

Context from documents:
{context}

Question: {question}

Please provide a comprehensive answer based on the context above. If the context doesn't contain enough information to answer the question, say so clearly. Always cite which parts of the context you used to form your answer.

Answer:`;

export async function performRAGQuery(
    query: string,
    userId: string,
    topK: number = 5,
    documentIds?: string[]
): Promise<RAGResponse> {
    // 1. Search for relevant documents (get more results to account for deduplication)
    const filter = documentIds
        ? { documentId: { $in: documentIds } }
        : undefined;
    // Fetch more chunks to ensure we have enough after deduplication
    const expandedTopK = topK * 3;
    const rawResults = await searchVectorStore(
        query,
        userId,
        expandedTopK,
        filter
    );

    if (rawResults.length === 0) {
        return {
            answer: "I couldn't find any relevant information in your documents to answer this question.",
            sources: [],
        };
    }

    // 2. Deduplicate results by documentId and limit to topK documents
    const searchResults = deduplicateByDocument(rawResults).slice(0, topK);

    // 3. Prepare context from search results
    const context = searchResults
        .map((result, index) => {
            return `[Source ${index + 1}] ${result.content}`;
        })
        .join("\n\n");

    // 3. Create RAG chain
    const llm = await getLLM();

    const prompt = PromptTemplate.fromTemplate(RAG_PROMPT_TEMPLATE);

    const chain = RunnableSequence.from([
        prompt,
        llm,
        new StringOutputParser(),
    ]);

    // 4. Generate answer
    const answer = await chain.invoke({
        context,
        question: query,
    });

    return {
        answer,
        sources: searchResults,
    };
}

// Streaming version for real-time responses
export async function performRAGQueryStream(
    query: string,
    userId: string,
    topK: number = 5,
    documentIds?: string[]
) {
    // Search for relevant documents (get more results to account for deduplication)
    const filter = documentIds
        ? { documentId: { $in: documentIds } }
        : undefined;
    const expandedTopK = topK * 3;
    const rawResults = await searchVectorStore(
        query,
        userId,
        expandedTopK,
        filter
    );

    if (rawResults.length === 0) {
        return {
            stream: null,
            sources: [],
        };
    }

    // Deduplicate results by documentId and limit to topK documents
    const searchResults = deduplicateByDocument(rawResults).slice(0, topK);

    // Prepare context
    const context = searchResults
        .map((result, index) => {
            return `[Source ${index + 1}] ${result.content}`;
        })
        .join("\n\n");

    // Create streaming chain
    const llm = await getLLM();
    const prompt = PromptTemplate.fromTemplate(RAG_PROMPT_TEMPLATE);

    const chain = RunnableSequence.from([
        prompt,
        llm,
        new StringOutputParser(),
    ]);

    const stream = await chain.stream({
        context,
        question: query,
    });

    return {
        stream,
        sources: searchResults,
    };
}
