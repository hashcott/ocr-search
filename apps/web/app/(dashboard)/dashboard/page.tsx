"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatDate, formatBytes } from "@/lib/utils";
import { FileText, AlertCircle, CheckCircle, Clock } from "lucide-react";

export default function DashboardPage() {
  const { data: documents, isLoading } = trpc.document.list.useQuery();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
        <p className="text-gray-600 mt-2">
          Manage and view all your uploaded documents
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : !documents || documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <FileText className="h-16 w-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-center">
              No documents uploaded yet.
              <br />
              Start by uploading your first document!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <FileText className="h-8 w-8 text-primary" />
                  {doc.processingStatus === "completed" && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  {doc.processingStatus === "processing" && (
                    <Clock className="h-5 w-5 text-yellow-500 animate-spin" />
                  )}
                  {doc.processingStatus === "failed" && (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <CardTitle className="text-lg truncate mt-2">
                  {doc.filename}
                </CardTitle>
                <CardDescription>
                  {formatBytes(doc.size)} • {formatDate(doc.createdAt)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status:</span>
                    <span
                      className={`font-medium ${
                        doc.processingStatus === "completed"
                          ? "text-green-600"
                          : doc.processingStatus === "failed"
                          ? "text-red-600"
                          : "text-yellow-600"
                      }`}
                    >
                      {doc.processingStatus}
                    </span>
                  </div>
                  {doc.processingError && (
                    <p className="text-xs text-red-500 mt-2">
                      {doc.processingError}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

