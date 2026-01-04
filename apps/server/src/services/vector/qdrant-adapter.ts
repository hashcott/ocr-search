import { QdrantClient } from "@qdrant/js-client-rest";
import { VectorStoreAdapter, VectorDocument, SearchResult } from "@search-pdf/shared";
import { getEmbedding } from "../embedding-service";

interface QdrantConfig {
  url: string;
  apiKey?: string;
  collectionName: string;
}

export class QdrantAdapter implements VectorStoreAdapter {
  private client: QdrantClient;
  private collectionName: string;
  private initialized = false;

  constructor(config: QdrantConfig) {
    this.client = new QdrantClient({
      url: config.url,
      apiKey: config.apiKey,
    });
    this.collectionName = config.collectionName;
  }

  private async ensureCollection() {
    if (this.initialized) return;

    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (c) => c.name === this.collectionName
      );

      if (!exists) {
        // Create collection
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: 1536, // Default for OpenAI embeddings, adjust based on model
            distance: "Cosine",
          },
        });
        console.log(`Created Qdrant collection: ${this.collectionName}`);
      }

      this.initialized = true;
    } catch (error) {
      console.error("Failed to ensure Qdrant collection:", error);
      throw error;
    }
  }

  async upsert(documents: VectorDocument[]): Promise<void> {
    await this.ensureCollection();

    const points = [];

    for (const doc of documents) {
      // Generate embedding for document content
      const embedding = await getEmbedding(doc.content);

      points.push({
        id: doc.id,
        vector: embedding,
        payload: {
          content: doc.content,
          ...doc.metadata,
        },
      });
    }

    await this.client.upsert(this.collectionName, {
      wait: true,
      points,
    });
  }

  async search(
    query: string,
    topK: number,
    filter?: Record<string, any>
  ): Promise<SearchResult[]> {
    await this.ensureCollection();

    // Generate embedding for query
    const queryEmbedding = await getEmbedding(query);

    // Build filter if provided
    const qdrantFilter = filter
      ? {
          must: Object.entries(filter).map(([key, value]) => ({
            key,
            match: { value },
          })),
        }
      : undefined;

    const results = await this.client.search(this.collectionName, {
      vector: queryEmbedding,
      limit: topK,
      filter: qdrantFilter,
      with_payload: true,
    });

    return results.map((result) => ({
      id: result.id.toString(),
      content: result.payload?.content as string,
      score: result.score,
      metadata: result.payload || {},
    }));
  }

  async delete(ids: string[]): Promise<void> {
    await this.ensureCollection();

    await this.client.delete(this.collectionName, {
      wait: true,
      points: ids,
    });
  }
}

