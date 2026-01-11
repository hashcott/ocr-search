'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, FileText, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function FilesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';
  const hasAutoSearchedRef = useRef(false);

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<
    Array<{
      content: string;
      score: number;
      metadata: { filename?: string };
      document?: { createdAt: string };
    }>
  >([]);
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

  // Auto-search when query parameter is present
  const performSearch = useCallback(
    (query: string) => {
      if (!query.trim()) return;
      setIsSearching(true);
      searchMutation.mutate({
        query: query,
        topK: 20,
      });
    },
    [searchMutation]
  );

  useEffect(() => {
    if (initialQuery && !hasAutoSearchedRef.current) {
      hasAutoSearchedRef.current = true;
      performSearch(initialQuery);
      // Clear query param from URL to prevent re-search on refresh
      router.replace('/dashboard/files', { scroll: false });
    }
  }, [initialQuery, performSearch, router]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    performSearch(searchQuery);
  };

  const exampleQueries = [
    'financial reports',
    'user agreements',
    'technical docs',
    'meeting notes',
  ];

  return (
    <div className="custom-scrollbar mx-auto h-full max-w-5xl space-y-6 overflow-y-auto p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Semantic Search</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Find documents by meaning, not just keywords.
          </p>
        </div>
        <div className="bg-primary/10 flex items-center gap-2 rounded-lg px-3 py-1.5">
          <Sparkles className="text-primary h-4 w-4" />
          <span className="text-primary text-xs font-medium">AI-Powered</span>
        </div>
      </div>

      {/* Search Form */}
      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <Search className="text-muted-foreground absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Describe what you're looking for..."
                className="bg-accent border-border h-12 rounded-lg pl-11 text-base"
                disabled={isSearching}
              />
            </div>

            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground text-xs">Try:</span>
                {exampleQueries.map((query, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSearchQuery(query)}
                    className="bg-accent hover:bg-primary/10 hover:text-primary border-border rounded-md border px-3 py-1 text-xs font-medium transition-colors"
                  >
                    {query}
                  </button>
                ))}
              </div>
              <Button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="bg-primary h-10 w-full rounded-lg px-5 font-medium sm:w-auto"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">
              Results
              <span className="text-muted-foreground ml-2 text-sm font-normal">
                {searchResults.length} found
              </span>
            </h2>
          </div>

          <div className="space-y-3">
            {searchResults.length > 0 ? (
              searchResults.map((result, index) => (
                <Card
                  key={index}
                  className="bg-card border-border hover:border-primary/30 transition-colors"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="bg-primary/10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg">
                        <FileText className="text-primary h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center justify-between gap-4">
                          <h3 className="truncate font-medium">{result.metadata.filename}</h3>
                          <span className="text-chart-2 bg-chart-2/10 flex-shrink-0 rounded px-2 py-0.5 text-xs font-medium">
                            {(result.score * 100).toFixed(0)}% match
                          </span>
                        </div>

                        <p className="text-muted-foreground mb-3 line-clamp-2 text-sm">
                          {result.content}
                        </p>

                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground text-xs">
                            {result.document
                              ? formatDate(result.document.createdAt)
                              : 'Unknown date'}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:bg-primary/10 h-7 rounded-md text-xs"
                          >
                            View
                            <ArrowRight className="ml-1 h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="p-12 text-center">
                  <div className="bg-accent mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg">
                    <Search className="text-muted-foreground h-6 w-6" />
                  </div>
                  <h3 className="mb-1 font-medium">No results found</h3>
                  <p className="text-muted-foreground mx-auto max-w-sm text-sm">
                    Try different keywords or upload more documents to expand your knowledge base.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Initial State */}
      {!hasSearched && (
        <Card className="bg-card border-border">
          <CardContent className="p-12 text-center">
            <div className="bg-primary mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl">
              <Sparkles className="text-primary-foreground h-8 w-8" />
            </div>
            <h3 className="mb-2 text-lg font-medium">Semantic Search</h3>
            <p className="text-muted-foreground mx-auto max-w-md text-sm">
              Search by meaning instead of exact keywords. Describe what you&apos;re looking for and
              let AI find the most relevant documents.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
