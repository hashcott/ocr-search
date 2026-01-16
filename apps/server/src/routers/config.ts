import { router, publicProcedure, adminProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { SystemConfigSchema } from '@fileai/shared';
import { SystemConfig } from '../db/models/SystemConfig';
import { User } from '../db/models/User';
import { listModels } from '../services/llm-service';

export const configRouter = router({
  // Check if application is initialized (has at least one user)
  isInitialized: publicProcedure.query(async () => {
    const userCount = await User.countDocuments();
    return {
      isInitialized: userCount > 0,
    };
  }),

  get: publicProcedure.query(async () => {
    const config = await SystemConfig.findOne();

    if (!config) {
      return {
        isSetupComplete: false,
      };
    }

    return {
      isSetupComplete: config.isSetupComplete,
      storage: config.storage,
      vectorDB: config.vectorDB,
      llm: {
        provider: config.llm.provider,
        model: config.llm.model,
        baseUrl: config.llm.baseUrl,
        temperature: config.llm.temperature,
      },
      embedding: {
        provider: config.embedding.provider,
        model: config.embedding.model,
        baseUrl: config.embedding.baseUrl,
      },
    };
  }),

  save: publicProcedure
    .input(
      SystemConfigSchema.omit({
        id: true,
        createdAt: true,
        updatedAt: true,
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if app is already initialized
      const userCount = await User.countDocuments();
      const isInitialized = userCount > 0;

      // If initialized, require admin role
      if (isInitialized) {
        if (!ctx.userId || ctx.userRole !== 'admin') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only admin can update configuration after initial setup',
          });
        }
      }

      try {
        // Update or create config
        const config = await SystemConfig.findOneAndUpdate(
          {},
          { ...input, isSetupComplete: true },
          { upsert: true, new: true }
        );

        return {
          success: true,
          id: config._id.toString(),
        };
      } catch (error) {
        console.error('Config save error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to save configuration',
        });
      }
    }),

  testConnection: adminProcedure
    .input(
      z.object({
        type: z.enum(['database', 'storage', 'vector', 'llm']),
        config: z.record(z.any()),
      })
    )
    .mutation(async ({ input: _input }) => {
      // TODO: Implement connection testing
      return { success: true, message: 'Connection successful' };
    }),

  listModels: publicProcedure
    .input(
      z.object({
        provider: z.enum(['ollama', 'openai']),
        baseUrl: z.string().optional(),
        apiKey: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      // Proxy to LLM service
      return listModels(input.provider, input.baseUrl, input.apiKey);
    }),
});
