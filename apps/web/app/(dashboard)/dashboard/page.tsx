"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, formatBytes } from "@/lib/utils";
import {
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Trash2,
  Download,
  Upload,
  Search,
  Database,
  TrendingUp,
  Eye,
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
    } catch (error) {
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
      gradient: "gradient-primary",
      change: "+12%",
    },
    {
      title: "Processed",
      value: completedDocuments,
      icon: CheckCircle,
      gradient: "gradient-success",
      change: "+8%",
    },
    {
      title: "Processing",
      value: processingDocuments,
      icon: Clock,
      gradient: "gradient-warning",
      change: "0",
    },
    {
      title: "Total Storage",
      value: formatBytes(totalSize),
      icon: Database,
      gradient: "gradient-danger",
      change: "+5%",
    },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Stats Grid - Minimalist */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="card-hover border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-semibold text-foreground">
                    {stat.value}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{stat.change}</span>
                  </div>
                </div>
                <div className={`w-10 h-10 rounded-lg ${stat.gradient} flex items-center justify-center`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions - Minimalist */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/upload">
          <Card className="card-hover border cursor-pointer group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <Upload className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <h3 className="font-medium text-foreground text-sm">
                  Upload Documents
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add new files
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/search">
          <Card className="card-hover border cursor-pointer group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <Search className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <h3 className="font-medium text-foreground text-sm">
                  Search & Chat
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ask questions
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/files">
          <Card className="card-hover border cursor-pointer group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <Eye className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <h3 className="font-medium text-foreground text-sm">
                  Find Files
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Semantic search
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Documents Table - Minimalist */}
      <Card className="border">
        <CardHeader className="border-b" style={{ borderColor: "hsl(var(--border))" }}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Recent Documents</CardTitle>
              <CardDescription>
                Manage and view all your uploaded documents
              </CardDescription>
            </div>
            <Link href="/dashboard/upload">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Upload className="h-4 w-4 mr-2" />
                Upload New
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : !documents || documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <FileText className="h-10 w-10 text-slate-400" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-center">
                No documents uploaded yet.
                <br />
                Start by uploading your first document!
              </p>
              <Link href="/dashboard/upload" className="mt-4">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Document
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc, idx) => (
                    <tr
                      key={doc.id}
                      className="hover:bg-accent/50 transition-colors"
                      style={{ 
                        borderBottom: idx < documents.length - 1 ? "1px solid hsl(var(--border))" : "none" 
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center">
                            <FileText className="h-4 w-4 text-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm truncate max-w-xs">
                              {doc.filename}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {doc.mimeType}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {formatBytes(doc.size)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
                            doc.processingStatus === "completed"
                              ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                              : doc.processingStatus === "failed"
                              ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
                              : "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400"
                          }`}
                        >
                          {doc.processingStatus === "completed" && (
                            <CheckCircle className="h-3 w-3" />
                          )}
                          {doc.processingStatus === "processing" && (
                            <Clock className="h-3 w-3 animate-spin" />
                          )}
                          {doc.processingStatus === "failed" && (
                            <AlertCircle className="h-3 w-3" />
                          )}
                          {doc.processingStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDate(doc.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            disabled={doc.processingStatus !== "completed"}
                            onClick={() => handleDownload(doc)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                disabled={deleteMutation.isLoading}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Document?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete "{doc.filename}" and all its
                                  associated data. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(doc.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
      </Card>
    </div>
  );
}
