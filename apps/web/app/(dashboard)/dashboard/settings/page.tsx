"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Database,
  HardDrive,
  Bot,
  Key,
  Save,
  RefreshCw,
  CheckCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast({
      title: "Settings saved",
      description: "Your configuration has been updated.",
    });
  };

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            Settings
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Configure your RAG system settings
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="gradient-primary border-0"
        >
          {isSaving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="database" className="space-y-6">
        <TabsList className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-xl">
          <TabsTrigger
            value="database"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg"
          >
            <Database className="h-4 w-4 mr-2" />
            Database
          </TabsTrigger>
          <TabsTrigger
            value="storage"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg"
          >
            <HardDrive className="h-4 w-4 mr-2" />
            Storage
          </TabsTrigger>
          <TabsTrigger
            value="llm"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg"
          >
            <Bot className="h-4 w-4 mr-2" />
            LLM
          </TabsTrigger>
          <TabsTrigger
            value="api"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg"
          >
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </TabsTrigger>
        </TabsList>

        <TabsContent value="database">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                Database Configuration
              </CardTitle>
              <CardDescription>
                Configure MongoDB and Qdrant connections
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mongodb">MongoDB URI</Label>
                  <div className="flex gap-2">
                    <Input
                      id="mongodb"
                      defaultValue="mongodb://localhost:27017/search-pdf"
                      className="font-mono text-sm"
                    />
                    <Button variant="outline" size="icon">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qdrant">Qdrant URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="qdrant"
                      defaultValue="http://localhost:6333"
                      className="font-mono text-sm"
                    />
                    <Button variant="outline" size="icon">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="collection">Collection Name</Label>
                  <Input id="collection" defaultValue="documents" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-purple-600" />
                Storage Configuration
              </CardTitle>
              <CardDescription>
                Configure file storage settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Storage Type</Label>
                <Select defaultValue="local">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local Storage</SelectItem>
                    <SelectItem value="s3">Amazon S3</SelectItem>
                    <SelectItem value="minio">MinIO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="storagePath">Storage Path</Label>
                <Input id="storagePath" defaultValue="./uploads" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="llm">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-green-600" />
                LLM Configuration
              </CardTitle>
              <CardDescription>
                Configure language model settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Chat Model</h4>
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select defaultValue="ollama">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ollama">Ollama (Local)</SelectItem>
                        <SelectItem value="openai">OpenAI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Input defaultValue="llama3" />
                  </div>
                  <div className="space-y-2">
                    <Label>Base URL</Label>
                    <Input defaultValue="http://localhost:11434" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Embedding Model</h4>
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select defaultValue="ollama">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ollama">Ollama (Local)</SelectItem>
                        <SelectItem value="openai">OpenAI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Input defaultValue="nomic-embed-text" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-yellow-600" />
                API Keys
              </CardTitle>
              <CardDescription>
                Manage your API keys for external services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="openai">OpenAI API Key</Label>
                <Input
                  id="openai"
                  type="password"
                  placeholder="sk-..."
                  className="font-mono"
                />
                <p className="text-xs text-slate-500">
                  Required if using OpenAI for chat or embeddings
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="qdrantKey">Qdrant API Key</Label>
                <Input
                  id="qdrantKey"
                  type="password"
                  placeholder="Optional for cloud Qdrant"
                  className="font-mono"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

