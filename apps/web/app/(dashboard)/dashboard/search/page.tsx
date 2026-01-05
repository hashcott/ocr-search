"use client";

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search,
  Send,
  FileText,
  MessageSquare,
  Trash2,
  Plus,
  Bot,
  User,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { useWebSocket } from "@/lib/use-websocket";

interface Source {
  id?: string;
  content?: string;
  score?: number;
  metadata?: Record<string, any>;
  // Flattened fields (from chat history)
  filename?: string;
  documentId?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export default function SearchPage() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  // WebSocket integration for real-time chat notifications
  useWebSocket(
    undefined, // No document handler needed here
    (data) => {
      // Handle chat completed notification
      if (data.chatId === currentChatId) {
        toast({
          title: "✅ Response Ready",
          description: `Found ${data.sourcesCount} relevant sources`,
        });
      }
    }
  );

  const { data: chats, refetch: refetchChats } = trpc.chat.list.useQuery();
  
  const { data: currentChat } = trpc.chat.getById.useQuery(
    { id: currentChatId! },
    { enabled: !!currentChatId }
  );

  const createChatMutation = trpc.chat.create.useMutation({
    onSuccess: (data) => {
      setCurrentChatId(data.id);
      refetchChats();
    },
  });

  const deleteChatMutation = trpc.chat.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Chat deleted" });
      refetchChats();
      if (currentChatId) {
        setCurrentChatId(null);
        setMessages([]);
      }
    },
  });

  const sendMessageMutation = trpc.chat.sendMessage.useMutation();

  useEffect(() => {
    if (currentChat) {
      setMessages(currentChat.messages as Message[]);
    }
  }, [currentChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isStreaming) return;

    let chatId = currentChatId;

    if (!chatId) {
      const chat = await createChatMutation.mutateAsync({
        title: query.substring(0, 50),
      });
      chatId = chat.id;
      setCurrentChatId(chatId);
    }

    const userMessage: Message = { role: "user", content: query };
    setMessages((prev) => [...prev, userMessage]);
    setQuery("");
    setIsStreaming(true);

    try {
      const result = await sendMessageMutation.mutateAsync({
        chatId: chatId!,
        message: query,
        topK: 5,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.message,
          sources: result.sources as any,
        },
      ]);

      // Note: WebSocket will handle the notification and sound
      // This toast is just for immediate feedback
      toast({
        title: "Response Generated",
        description: `Found ${result.sources?.length || 0} relevant sources`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] animate-fadeIn">
      {/* Chat History Sidebar */}
      <div className="w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <Button
            onClick={handleNewChat}
            className="w-full gradient-primary border-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Conversation
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
            Recent Chats
          </p>
          {chats?.length === 0 && (
            <div className="text-center py-8">
              <MessageSquare className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No conversations yet</p>
            </div>
          )}
          {chats?.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setCurrentChatId(chat.id)}
              className={`group p-3 rounded-xl cursor-pointer transition-all ${
                currentChatId === chat.id
                  ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                  : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 dark:text-white truncate text-sm">
                    {chat.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {chat.messageCount} messages
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChatMutation.mutate({ id: chat.id });
                  }}
                  className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mb-6">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">
                Ask anything about your documents
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-center max-w-md mb-8">
                I'll search through your uploaded documents and provide answers with citations.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                {[
                  "What are the key findings in my reports?",
                  "Summarize the main topics covered",
                  "Find information about specific topics",
                  "Compare data across documents",
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setQuery(suggestion)}
                    className="p-4 text-left bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
                  >
                    <p className="text-sm text-slate-700 dark:text-slate-200">
                      {suggestion}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-4 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-2xl rounded-2xl p-4 ${
                      message.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                    
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                          Sources
                        </p>
                        <div className="space-y-2">
                          {message.sources.slice(0, 3).map((source, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                  {source.metadata?.filename || source.filename || "Unknown file"}
                                </span>
                                <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full ml-auto">
                                  {((source.score || 0) * 100).toFixed(0)}%
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                {source.content || "No content available"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {message.role === "user" && (
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                    </div>
                  )}
                </div>
              ))}

              {isStreaming && (
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                      </div>
                      <span className="text-sm text-slate-500">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="relative">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question about your documents..."
                disabled={isStreaming}
                className="pr-14 py-6 text-base rounded-xl border-slate-200 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500"
              />
              <Button
                type="submit"
                disabled={isStreaming || !query.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 gradient-primary border-0 rounded-lg"
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
