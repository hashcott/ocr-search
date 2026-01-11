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
    <div className="p-8 sm:p-10 space-y-10 max-w-6xl mx-auto animate-fadeIn">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Semantic Explorer</h1>
          <p className="text-muted-foreground mt-2 text-lg font-medium">
            Search your document universe using conceptual intelligence.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-2xl border border-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Neural Search Active</span>
        </div>
      </div>

      {/* Search Console - Premium Glass */}
      <Card className="glass border-none shadow-2xl overflow-hidden rounded-[2.5rem] group">
        <CardContent className="p-10">
          <form onSubmit={handleSearch} className="space-y-8">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/5 rounded-3xl blur-xl group-focus-within:bg-primary/10 transition-colors" />
              <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-primary/50 group-focus-within:text-primary transition-colors" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Describe your inquiry (e.g., 'What are the core technical risks?')"
                  className="bg-black/5 dark:bg-background/40 border-black/5 dark:border-white/5 pl-16 h-20 text-xl rounded-3xl focus:ring-primary shadow-inner placeholder:text-muted-foreground/30 font-medium"
                  disabled={isSearching}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Neural Paths:</span>
                {exampleQueries.map((query, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSearchQuery(query)}
                    className="px-4 py-1.5 rounded-xl bg-primary/5 text-xs font-bold text-primary hover:bg-primary/20 transition-all border border-primary/10"
                  >
                    {query}
                  </button>
                ))}
              </div>
              <Button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="bg-ai-gradient shadow-ai border-none rounded-2xl h-14 px-10 font-bold hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
              >
                {isSearching ? (
                  <div className="flex items-center gap-3 font-black uppercase tracking-widest text-xs">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                    Analyzing
                  </div>
                ) : (
                  <div className="flex items-center gap-3 font-black uppercase tracking-widest text-xs">
                    <Sparkles className="h-4 w-4" />
                    Initialize Search
                  </div>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Dynamic Results Grid */}
      {hasSearched && (
        <div className="space-y-8 animate-slideUp">
          <div className="flex items-center justify-between px-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              Search Results
              <span className="text-sm font-medium text-muted-foreground bg-accent px-3 py-1 rounded-full">{searchResults.length} assets mapped</span>
            </h2>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
              Ranked by context score
              <ArrowRight className="h-3 w-3" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 pb-20">
            {searchResults.length > 0 ? (
              searchResults.map((result, index) => (
                <Card
                  key={index}
                  className="glass border-none shadow-xl overflow-hidden rounded-3xl group/card hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                >
                  <CardContent className="p-0 flex">
                    {/* Relevance indicator */}
                    <div className="w-2 bg-ai-gradient opacity-40 group-hover/card:opacity-100 transition-opacity" />

                    <div className="flex-1 p-8">
                      <div className="flex items-start gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover/card:scale-110 transition-transform shadow-inner">
                          <FileText className="h-7 w-7 text-primary" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold truncate pr-4 text-foreground/90 group-hover/card:text-primary transition-colors">
                              {result.metadata.filename}
                            </h3>
                            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                                {(result.score * 100).toFixed(0)}% Semantic Match
                              </span>
                            </div>
                          </div>

                          <div className="relative bg-black/5 dark:bg-black/20 rounded-2xl p-6 border border-black/5 dark:border-white/5 group-hover/card:border-primary/20 transition-colors">
                            <p className="text-lg text-foreground/70 italic leading-relaxed font-medium">
                              &quot;{result.content}&quot;
                            </p>
                          </div>

                          <div className="mt-6 flex items-center justify-between">
                            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                              <span>Asset Indexed: {result.document ? formatDate(result.document.createdAt) : 'Historical'}</span>
                              <div className="w-1 h-1 rounded-full bg-muted-foreground/20" />
                              <span>Organization Context: Personal Vault</span>
                            </div>
                            <Button
                              variant="ghost"
                              className="text-primary hover:text-white hover:bg-primary rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all"
                            >
                              Explore Source
                              <ArrowRight className="h-3 w-3 ml-2" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="glass border-none shadow-xl rounded-[2.5rem]">
                <CardContent className="p-24 text-center space-y-6">
                  <div className="w-24 h-24 rounded-[2rem] bg-rose-500/10 flex items-center justify-center mx-auto shadow-inner">
                    <Search className="h-10 w-10 text-rose-500/60" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold">Neural Mapping Failed</h3>
                    <p className="text-muted-foreground max-w-md mx-auto text-lg">
                      Unable to find relevant conceptual vectors matching &quot;{searchQuery}&quot;.
                      Try abstracting your inquiry or expanding the knowledge base.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setSearchQuery("")}
                    className="rounded-xl border-border/40 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 font-bold px-8 h-12"
                  >
                    Clear Map
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Initial Strategy State */}
      {!hasSearched && (
        <Card className="glass border-none shadow-2xl rounded-[3rem] overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <CardContent className="p-20 text-center relative z-10">
            <div className="w-28 h-28 rounded-[2.5rem] bg-ai-gradient shadow-ai flex items-center justify-center mx-auto mb-10 scale-110 group-hover:rotate-12 transition-transform duration-500">
              <Sparkles className="h-12 w-12 text-white" />
            </div>
            <div className="space-y-6 max-w-2xl mx-auto">
              <h3 className="text-4xl font-black tracking-tight">
                Conceptual Intelligence
              </h3>
              <p className="text-muted-foreground text-xl leading-relaxed font-medium">
                Unlike primitive keyword indexes, Semantic Explorer utilizes multi-dimensional vector embeddings
                to understand the underlying <span className="text-primary">intent</span> of your inquiry.
              </p>
              <div className="pt-8 flex items-center justify-center gap-8 opacity-40">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-foreground" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">Latent Semantic Analysis</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-foreground" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">Vector Proximity Mapping</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-foreground" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">Cross-Context Ingestion</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
