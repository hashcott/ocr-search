'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, HardDrive, Bot, Key, Save, Loader2, CheckCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { trpc } from '@/lib/trpc/client';

export default function SettingsPage() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  // LLM State
  const [chatProvider, setChatProvider] = useState<'ollama' | 'openai'>('ollama');
  const [chatModel, setChatModel] = useState('llama3');
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState('http://localhost:11434');
  const [openaiKey, setOpenaiKey] = useState('');

  // Embedding State
  const [embeddingProvider, setEmbeddingProvider] = useState<'ollama' | 'openai'>('ollama');
  const [embeddingModel, setEmbeddingModel] = useState('nomic-embed-text');

  // Load existing config
  const { data: config } = trpc.config.get.useQuery();

  useEffect(() => {
    if (config) {
      if ('llm' in config && config.llm) {
        setChatProvider(config.llm.provider as any);
        setChatModel(config.llm.model);
        if (config.llm.baseUrl) setOllamaBaseUrl(config.llm.baseUrl);
      }
      if ('embedding' in config && config.embedding) {
        setEmbeddingProvider(config.embedding.provider as any);
        setEmbeddingModel(config.embedding.model);
      }
    }
  }, [config]);

  // Fetch models
  const { 
    data: chatModels, 
    refetch: refetchChatModels, 
    isLoading: isLoadingChatModels,
    error: chatError 
  } = trpc.config.listModels.useQuery(
    {
      provider: chatProvider,
      baseUrl: chatProvider === 'ollama' ? ollamaBaseUrl : undefined,
      apiKey: chatProvider === 'openai' ? openaiKey : undefined,
    },
    {
      enabled: !!(chatProvider === 'ollama' || (chatProvider === 'openai' && openaiKey)),
      retry: false,
    }
  );

  const { 
    data: embeddingModels, 
    refetch: refetchEmbeddingModels, 
    isLoading: isLoadingEmbeddingModels,
    error: embeddingError 
  } = trpc.config.listModels.useQuery(
    {
      provider: embeddingProvider,
      baseUrl: embeddingProvider === 'ollama' ? ollamaBaseUrl : undefined,
      apiKey: embeddingProvider === 'openai' ? openaiKey : undefined,
    },
    {
      enabled: !!(embeddingProvider === 'ollama' || (embeddingProvider === 'openai' && openaiKey)),
      retry: false,
    }
  );

  // Filter models based on type (heuristic)
  const filteredChatModels = chatModels && chatModels.length > 0 ? chatModels.filter(m => 
    chatProvider === 'openai' ? m.startsWith('gpt-') : true
  ) : [];
  
  const filteredEmbeddingModels = embeddingModels && embeddingModels.length > 0 ? embeddingModels.filter(m => 
    embeddingProvider === 'openai' ? m.startsWith('text-embedding-') : true
  ) : [];

  // Auto-select first model if current one is not in list
  useEffect(() => {
    if (filteredChatModels.length > 0 && !filteredChatModels.includes(chatModel)) {
      setChatModel(filteredChatModels[0]);
    }
  }, [filteredChatModels, chatModel]);

  useEffect(() => {
    if (filteredEmbeddingModels.length > 0 && !filteredEmbeddingModels.includes(embeddingModel)) {
      setEmbeddingModel(filteredEmbeddingModels[0]);
    }
  }, [filteredEmbeddingModels, embeddingModel]);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast({
      title: 'Settings saved',
      description: 'Your configuration has been updated.',
    });
  };

  return (
    <div className="custom-scrollbar mx-auto h-full max-w-4xl space-y-6 overflow-y-auto p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Configure your FileAI system settings
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-primary h-9 rounded-lg">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="database" className="space-y-4">
        <TabsList className="grid w-full grid-cols-1 gap-2 md:grid-cols-4 h-auto bg-accent border-border rounded-lg border p-1">
          <TabsTrigger
            value="database"
            className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"
          >
            <Database className="mr-2 h-4 w-4" />
            Database
          </TabsTrigger>
          <TabsTrigger
            value="storage"
            className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"
          >
            <HardDrive className="mr-2 h-4 w-4" />
            Storage
          </TabsTrigger>
          <TabsTrigger
            value="llm"
            className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"
          >
            <Bot className="mr-2 h-4 w-4" />
            LLM
          </TabsTrigger>
          <TabsTrigger
            value="api"
            className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"
          >
            <Key className="mr-2 h-4 w-4" />
            API Keys
          </TabsTrigger>
        </TabsList>

        <TabsContent value="database">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="text-primary h-5 w-5" />
                Database Configuration
              </CardTitle>
              <CardDescription>Configure MongoDB and Qdrant connections</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mongodb">MongoDB URI</Label>
                <div className="flex gap-2">
                  <Input
                    id="mongodb"
                    defaultValue="mongodb://localhost:27017/fileai"
                    className="bg-accent border-border font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" className="border-border">
                    <CheckCircle className="text-chart-2 h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="qdrant">Qdrant URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="qdrant"
                    defaultValue="http://localhost:6333"
                    className="bg-accent border-border font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" className="border-border">
                    <CheckCircle className="text-chart-2 h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="collection">Collection Name</Label>
                <Input
                  id="collection"
                  defaultValue="documents"
                  className="bg-accent border-border"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <HardDrive className="text-primary h-5 w-5" />
                Storage Configuration
              </CardTitle>
              <CardDescription>Configure file storage settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Storage Type</Label>
                <Select defaultValue="local">
                  <SelectTrigger className="bg-accent border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="local">Local Storage</SelectItem>
                    <SelectItem value="s3">Amazon S3</SelectItem>
                    <SelectItem value="minio">MinIO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="storagePath">Storage Path</Label>
                <Input
                  id="storagePath"
                  defaultValue="./uploads"
                  className="bg-accent border-border"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="llm">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bot className="text-primary h-5 w-5" />
                LLM Configuration
              </CardTitle>
              <CardDescription>Configure language model settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-medium">Chat Model</h4>
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select value={chatProvider} onValueChange={(v: any) => setChatProvider(v)}>
                      <SelectTrigger className="bg-accent border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="ollama">Ollama (Local)</SelectItem>
                        <SelectItem value="openai">OpenAI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <div className="flex gap-2">
                      <Select value={chatModel} onValueChange={setChatModel}>
                        <SelectTrigger className="bg-accent border-border flex-1">
                          <SelectValue placeholder={isLoadingChatModels ? "Loading..." : "Select model"} />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {isLoadingChatModels && (
                            <SelectItem value="__loading__" disabled>Loading models...</SelectItem>
                          )}
                          
                          {filteredChatModels.map((model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}

                          {!isLoadingChatModels && chatModel && !filteredChatModels.includes(chatModel) && (
                            <SelectItem value={chatModel} disabled>
                              {chatModel} {filteredChatModels.length > 0 ? '(Unavailable)' : '(Not found)'}
                            </SelectItem>
                          )}

                          {!isLoadingChatModels && filteredChatModels.length === 0 && (
                            <SelectItem value="__no_models__" disabled>
                              {chatError ? `Error: ${chatError.message}` : 
                               chatProvider === 'openai' && !openaiKey ? "Enter API Key" : 
                               "No models found (Check URL/Key)"}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => refetchChatModels()}
                        disabled={isLoadingChatModels}
                        className="border-border"
                      >
                        <RefreshCw className={`h-4 w-4 ${isLoadingChatModels ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                  {chatProvider === 'ollama' && (
                    <div className="space-y-2">
                      <Label>Base URL</Label>
                      <Input
                        value={ollamaBaseUrl}
                        onChange={(e) => setOllamaBaseUrl(e.target.value)}
                        className="bg-accent border-border"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Embedding Model</h4>
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select value={embeddingProvider} onValueChange={(v: any) => setEmbeddingProvider(v)}>
                      <SelectTrigger className="bg-accent border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="ollama">Ollama (Local)</SelectItem>
                        <SelectItem value="openai">OpenAI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <div className="flex gap-2">
                      <Select value={embeddingModel} onValueChange={setEmbeddingModel}>
                        <SelectTrigger className="bg-accent border-border flex-1">
                          <SelectValue placeholder={isLoadingEmbeddingModels ? "Loading..." : "Select model"} />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {isLoadingEmbeddingModels && (
                            <SelectItem value="__loading__" disabled>Loading models...</SelectItem>
                          )}
                          
                          {filteredEmbeddingModels.map((model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}

                          {!isLoadingEmbeddingModels && embeddingModel && !filteredEmbeddingModels.includes(embeddingModel) && (
                            <SelectItem value={embeddingModel} disabled>
                              {embeddingModel} {filteredEmbeddingModels.length > 0 ? '(Unavailable)' : '(Not found)'}
                            </SelectItem>
                          )}

                          {!isLoadingEmbeddingModels && filteredEmbeddingModels.length === 0 && (
                            <SelectItem value="__no_models__" disabled>
                              {embeddingError ? `Error: ${embeddingError.message}` : 
                               embeddingProvider === 'openai' && !openaiKey ? "Enter API Key" : 
                               "No models found (Check URL/Key)"}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => refetchEmbeddingModels()}
                        disabled={isLoadingEmbeddingModels}
                        className="border-border"
                      >
                        <RefreshCw className={`h-4 w-4 ${isLoadingEmbeddingModels ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Key className="text-primary h-5 w-5" />
                API Keys
              </CardTitle>
              <CardDescription>Manage your API keys for external services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openai">OpenAI API Key</Label>
                <Input
                  id="openai"
                  type="password"
                  placeholder="sk-..."
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  className="bg-accent border-border font-mono"
                />
                <p className="text-muted-foreground text-xs">
                  Required if using OpenAI for chat or embeddings
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="qdrantKey">Qdrant API Key</Label>
                <Input
                  id="qdrantKey"
                  type="password"
                  placeholder="Optional for cloud Qdrant"
                  className="bg-accent border-border font-mono"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
