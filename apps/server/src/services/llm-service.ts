import { ChatOpenAI } from '@langchain/openai';
import { ChatOllama } from '@langchain/ollama';
import { SystemConfig } from '../db/models/SystemConfig';

let llmInstance: ChatOpenAI | ChatOllama | null = null;

export async function getLLM(): Promise<ChatOpenAI | ChatOllama> {
  if (llmInstance) {
    return llmInstance;
  }

  const config = await SystemConfig.findOne();

  if (!config || !config.llm) {
    // Default to Ollama
    llmInstance = new ChatOllama({
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'llama3',
      temperature: 0.7,
    });
    return llmInstance;
  }

  switch (config.llm.provider) {
    case 'openai':
      llmInstance = new ChatOpenAI({
        openAIApiKey: config.llm.apiKey || process.env.OPENAI_API_KEY,
        modelName: config.llm.model || 'gpt-4-turbo-preview',
        temperature: config.llm.temperature || 0.7,
      });
      break;

    case 'ollama':
    default:
      llmInstance = new ChatOllama({
        baseUrl: config.llm.baseUrl || 'http://localhost:11434',
        model: config.llm.model || 'llama3',
        temperature: config.llm.temperature || 0.7,
      });
      break;
  }

  return llmInstance;
}

export async function listModels(
  provider: 'ollama' | 'openai',
  baseUrl?: string,
  apiKey?: string
): Promise<string[]> {
  if (provider === 'ollama') {
    const baseUrlClean = baseUrl?.replace(/\/$/, '') || 'http://localhost:11434';
    const urlsToTry = [
      `${baseUrlClean}/api/tags`,
    ];

    // If localhost is used, also try host.docker.internal and 127.0.0.1
    if (baseUrlClean.includes('localhost')) {
      urlsToTry.push(baseUrlClean.replace('localhost', 'host.docker.internal') + '/api/tags');
      urlsToTry.push(baseUrlClean.replace('localhost', '127.0.0.1') + '/api/tags');
    }

    for (const url of urlsToTry) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const data = (await response.json()) as { models: { name: string }[] };
          return data.models.map((m) => m.name);
        }
      } catch (error) {
        // Continue to next URL
        console.debug(`Failed to fetch from ${url}:`, error);
      }
    }

    console.warn(`Failed to fetch Ollama models from all attempted URLs: ${urlsToTry.join(', ')}`);
    return [];
  } else if (provider === 'openai') {
    if (!apiKey) return [];
    
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      
      if (!response.ok) {
        console.warn(`Failed to fetch OpenAI models: ${response.statusText}`);
        return [];
      }
      
      const data = (await response.json()) as { data: { id: string }[] };
      return data.data
        .map((m) => m.id)
        .filter((id) => id.startsWith('gpt-') || id.startsWith('text-embedding-'))
        .sort();
    } catch (error) {
      console.error('Error fetching OpenAI models:', error);
      return [];
    }
  }
  
  return [];
}

export function resetLLM() {
  llmInstance = null;
}
