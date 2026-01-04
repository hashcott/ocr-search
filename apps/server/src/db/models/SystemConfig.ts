import mongoose, { Schema, Document } from "mongoose";

export interface ISystemConfig extends Document {
  isSetupComplete: boolean;
  database: {
    url: string;
  };
  storage: {
    type: "s3" | "local" | "minio";
    config: {
      bucket?: string;
      region?: string;
      accessKeyId?: string;
      secretAccessKey?: string;
      endpoint?: string;
      localPath?: string;
    };
  };
  vectorDB: {
    type: "qdrant" | "meilisearch" | "mongodb";
    config: {
      url: string;
      apiKey?: string;
      collectionName?: string;
    };
  };
  llm: {
    provider: "ollama" | "openai";
    model: string;
    apiKey?: string;
    baseUrl?: string;
    temperature?: number;
  };
  embedding: {
    provider: "ollama" | "openai";
    model: string;
    apiKey?: string;
    baseUrl?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SystemConfigSchema = new Schema<ISystemConfig>(
  {
    isSetupComplete: {
      type: Boolean,
      default: false,
    },
    database: {
      url: String,
    },
    storage: {
      type: {
        type: String,
        enum: ["s3", "local", "minio"],
      },
      config: {
        bucket: String,
        region: String,
        accessKeyId: String,
        secretAccessKey: String,
        endpoint: String,
        localPath: String,
      },
    },
    vectorDB: {
      type: {
        type: String,
        enum: ["qdrant", "meilisearch", "mongodb"],
      },
      config: {
        url: String,
        apiKey: String,
        collectionName: String,
      },
    },
    llm: {
      provider: {
        type: String,
        enum: ["ollama", "openai"],
      },
      model: String,
      apiKey: String,
      baseUrl: String,
      temperature: Number,
    },
    embedding: {
      provider: {
        type: String,
        enum: ["ollama", "openai"],
      },
      model: String,
      apiKey: String,
      baseUrl: String,
    },
  },
  {
    timestamps: true,
  }
);

export const SystemConfig = mongoose.model<ISystemConfig>(
  "SystemConfig",
  SystemConfigSchema
);

