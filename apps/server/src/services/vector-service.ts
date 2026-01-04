import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { getVectorStore } from "./vector";
import { CHUNK_SIZE, CHUNK_OVERLAP } from "@search-pdf/shared";

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
});

export async function storeInVectorDB(
  documentId: string,
  text: string,
  metadata: Record<string, any>
) {
  // Split text into chunks
  const chunks = await textSplitter.splitText(text);

  // Prepare documents for vector store
  const documents = chunks.map((chunk, index) => ({
    id: `${documentId}_chunk_${index}`,
    content: chunk,
    metadata: {
      ...metadata,
      chunkIndex: index,
      totalChunks: chunks.length,
    },
  }));

  // Store in vector database
  const vectorStore = await getVectorStore();
  await vectorStore.upsert(documents);

  console.log(`Stored ${documents.length} chunks for document ${documentId}`);
}

export async function searchVectorStore(
  query: string,
  userId: string,
  topK: number = 5,
  filter?: Record<string, any>
) {
  const vectorStore = await getVectorStore();

  // Add userId to filter
  const searchFilter = {
    ...filter,
    userId,
  };

  const results = await vectorStore.search(query, topK, searchFilter);

  return results;
}

export async function deleteFromVectorDB(documentId: string) {
  const vectorStore = await getVectorStore();

  // Find all chunk IDs for this document
  // In a real implementation, you might want to query first
  // For now, we'll construct the IDs based on our naming convention
  const results = await vectorStore.search("", 1000, { documentId });

  const chunkIds = results.map((r) => r.id);

  if (chunkIds.length > 0) {
    await vectorStore.delete(chunkIds);
    console.log(`Deleted ${chunkIds.length} chunks for document ${documentId}`);
  }
}

