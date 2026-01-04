"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, FileText, Sparkles, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function FilesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const searchMutation = trpc.document.search.useMutation({
    onSuccess: (data) => {
      setSearchResults(data);
      setIsSearching(false);
      setHasSearched(true);
    },
    onError: () => {
      setIsSearching(false);
      setHasSearched(true);
    },
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    searchMutation.mutate({
      query: searchQuery,
      topK: 20,
    });
  };

  const exampleQueries = [
    "financial reports and analysis",
    "user agreements and terms",
    "technical documentation",
    "meeting notes and summaries",
  ];

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          Semantic File Search
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Find documents by meaning, not just keywords
        </p>
      </div>

      {/* Search Box */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Describe what you're looking for..."
                className="pl-12 py-6 text-lg rounded-xl border-slate-200 dark:border-slate-600 focus:border-blue-500"
                disabled={isSearching}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-slate-500">Try:</span>
                {exampleQueries.map((query, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSearchQuery(query)}
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    {query}
                  </button>
                ))}
              </div>
              <Button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="gradient-primary border-0"
              >
                {isSearching ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {hasSearched && (
        <div className="space-y-4">
          {searchResults.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                  Found {searchResults.length} relevant sections
                </h2>
                <span className="text-sm text-slate-500">
                  Sorted by relevance
                </span>
              </div>

              <div className="grid gap-4">
                {searchResults.map((result, index) => (
                  <Card
                    key={index}
                    className="border-0 shadow-sm card-hover overflow-hidden"
                  >
                    <CardContent className="p-0">
                      <div className="flex">
                        {/* Relevance indicator */}
                        <div
                          className={`w-1 ${
                            result.score > 0.8
                              ? "bg-green-500"
                              : result.score > 0.6
                              ? "bg-blue-500"
                              : "bg-yellow-500"
                          }`}
                        />

                        <div className="flex-1 p-5">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-slate-800 dark:text-white">
                                  {result.metadata.filename}
                                </h3>
                                <span
                                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                                    result.score > 0.8
                                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                      : result.score > 0.6
                                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                  }`}
                                >
                                  {(result.score * 100).toFixed(0)}% match
                                </span>
                              </div>

                              <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3 mb-3">
                                {result.content}
                              </p>

                              {result.document && (
                                <p className="text-xs text-slate-400">
                                  Uploaded {formatDate(result.document.createdAt)}
                                </p>
                              )}
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-shrink-0 text-slate-400 hover:text-blue-600"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
                  No results found
                </h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  We couldn't find any documents matching "{searchQuery}".
                  Try different keywords or upload more documents.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty state */}
      {!hasSearched && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-3">
              Semantic Search
            </h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Unlike keyword search, semantic search understands the meaning of your query.
              Search for concepts, topics, or ideas and find relevant documents even if they
              don't contain exact keywords.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
