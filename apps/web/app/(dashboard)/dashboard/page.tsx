"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, formatBytes } from "@/lib/utils";
import {
  FileText,
  CheckCircle,
  Clock,
  Trash2,
  Download,
  Upload,
  Search,
  Database,
  ArrowUpRight,
  MessageSquare,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Link from "next/link";

export default function DashboardPage() {
  const { toast } = useToast();
  const { data: documents, isLoading, refetch } = trpc.document.list.useQuery();
  const deleteMutation = trpc.document.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  const handleDownload = async (doc: { id: string; filename: string }) => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        toast({ title: "Error", description: "Please login again", variant: "destructive" });
        return;
      }

      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001";
      const response = await fetch(`${serverUrl}/api/files/${doc.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: "Success", description: "Download started" });
    } catch {
      toast({ title: "Error", description: "Failed to download file", variant: "destructive" });
    }
  };

  // Stats
  const totalDocuments = documents?.length || 0;
  const completedDocuments = documents?.filter((d) => d.processingStatus === "completed").length || 0;
  const processingDocuments = documents?.filter((d) => d.processingStatus === "processing").length || 0;
  const totalSize = documents?.reduce((acc, d) => acc + d.size, 0) || 0;

  const stats = [
    {
      title: "Total Documents",
      value: totalDocuments,
      icon: FileText,
      color: "text-chart-1",
      bgColor: "bg-chart-1/10",
    },
    {
      title: "Processed",
      value: completedDocuments,
      icon: CheckCircle,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
    {
      title: "Processing",
      value: processingDocuments,
      icon: Clock,
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
    },
    {
      title: "Storage Used",
      value: formatBytes(totalSize),
      icon: Database,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
  ];

  return (
    <div className="h-full overflow-y-auto p-6 lg:p-8 pb-20 space-y-8 max-w-[1400px] mx-auto custom-scrollbar">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-muted-foreground/70 mt-1 text-sm">
            Welcome back. Here&apos;s your document intelligence summary.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="rounded-lg border-border/50 h-9 px-3 font-medium hover:bg-accent" 
            onClick={() => refetch()}
          >
            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
            Refresh
          </Button>
          <Link href="/dashboard/upload">
            <Button size="sm" className="rounded-lg bg-primary hover:bg-primary/90 shadow-ai h-9 px-4 font-medium">
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid - Clean & Minimal */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card 
            key={index} 
            className="bg-card border-border hover:border-primary/30 transition-colors duration-150"
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
                    {stat.title}
                  </p>
                  <h3 className="text-2xl font-semibold tracking-tight">
                    {stat.value}
                  </h3>
                </div>
                <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { 
            title: "Upload Documents", 
            desc: "Add files for AI analysis", 
            icon: Upload, 
            href: "/dashboard/upload",
            color: "bg-chart-1/10",
            iconColor: "text-chart-1"
          },
          { 
            title: "Chat with AI", 
            desc: "Query your documents", 
            icon: MessageSquare, 
            href: "/dashboard/search",
            color: "bg-primary/10",
            iconColor: "text-primary"
          },
          { 
            title: "Semantic Search", 
            desc: "Find files by meaning", 
            icon: Search, 
            href: "/dashboard/files",
            color: "bg-chart-2/10",
            iconColor: "text-chart-2"
          }
        ].map((action, i) => (
          <Link key={i} href={action.href}>
            <Card className="bg-card border-border hover:border-primary/40 transition-colors duration-150 cursor-pointer group h-full">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center flex-shrink-0`}>
                  <action.icon className={`h-5 w-5 ${action.iconColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-sm group-hover:text-primary transition-colors">
                    {action.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {action.desc}
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Documents Table */}
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="p-5 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Recent Documents</CardTitle>
              <CardDescription className="text-sm mt-0.5">
                Your recently uploaded files and their status.
              </CardDescription>
            </div>
            <Link href="/dashboard/documents">
              <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/5 rounded-lg font-medium">
                View All
                <ArrowUpRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-border border-t-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Loading documents...</p>
            </div>
          ) : !documents || documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-6">
              <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-muted-foreground" />
              </div>
              <h4 className="text-base font-medium">No documents yet</h4>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Upload your first document to start building your knowledge base.
              </p>
              <Link href="/dashboard/upload" className="mt-5">
                <Button className="rounded-lg bg-primary hover:bg-primary/90 h-10 px-5 font-medium">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-accent">
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Document</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Size</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Date</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {documents.slice(0, 8).map((doc) => (
                    <tr key={doc.id} className="group hover:bg-accent transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                            <FileText className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate max-w-[180px] lg:max-w-[280px] group-hover:text-primary transition-colors">
                              {doc.filename}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                              {doc.id.slice(0, 12)}...
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <span className="text-sm text-muted-foreground">{formatBytes(doc.size)}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
                          doc.processingStatus === "completed"
                            ? "bg-chart-2/10 text-chart-2"
                            : doc.processingStatus === "failed"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-chart-4/10 text-chart-4"
                        }`}>
                          {doc.processingStatus === "processing" ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : doc.processingStatus === "completed" ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          <span className="capitalize">{doc.processingStatus}</span>
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {formatDate(doc.createdAt)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors"
                            disabled={doc.processingStatus !== "completed"}
                            onClick={() => handleDownload(doc)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-card border-border rounded-xl shadow-lg max-w-md">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-lg font-semibold">Delete Document</AlertDialogTitle>
                                <AlertDialogDescription className="text-sm text-muted-foreground mt-1">
                                  This will permanently delete <span className="text-foreground font-medium">&quot;{doc.filename}&quot;</span> and all associated data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="mt-5 gap-2">
                                <AlertDialogCancel className="rounded-lg border-border font-medium h-9">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(doc.id)}
                                  className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium h-9 px-4"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
        {documents && documents.length > 0 && (
          <CardFooter className="p-4 bg-accent border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing {Math.min(documents.length, 8)} of {documents.length} documents
            </p>
            <Link href="/dashboard/documents">
              <Button variant="ghost" size="sm" className="text-xs text-primary hover:bg-primary/10 rounded-lg h-8">
                View all documents
              </Button>
            </Link>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
