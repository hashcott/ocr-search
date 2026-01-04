"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, X, CheckCircle } from "lucide-react";
import { formatBytes } from "@/lib/utils";

interface FileWithProgress {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

export default function UploadPage() {
  const { toast } = useToast();
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const utils = trpc.useContext();

  const uploadMutation = trpc.document.upload.useMutation({
    onSuccess: () => {
      utils.document.list.invalidate();
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      progress: 0,
      status: "pending" as const,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "application/msword": [".doc"],
      "application/xml": [".xml"],
      "text/plain": [".txt"],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const uploadFile = async (fileWithProgress: FileWithProgress, index: number) => {
    const { file } = fileWithProgress;

    // Update status to uploading
    setFiles((prev) =>
      prev.map((f, i) =>
        i === index ? { ...f, status: "uploading" as const, progress: 0 } : f
      )
    );

    try {
      // Read file as base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base64Data = await base64Promise;

      // Simulate progress
      const progressInterval = setInterval(() => {
        setFiles((prev) =>
          prev.map((f, i) =>
            i === index && f.progress < 90
              ? { ...f, progress: f.progress + 10 }
              : f
          )
        );
      }, 200);

      // Upload
      await uploadMutation.mutateAsync({
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        data: base64Data,
      });

      clearInterval(progressInterval);

      // Update status to success
      setFiles((prev) =>
        prev.map((f, i) =>
          i === index ? { ...f, status: "success" as const, progress: 100 } : f
        )
      );

      toast({
        title: "Success",
        description: `${file.name} uploaded successfully`,
      });
    } catch (error) {
      // Update status to error
      setFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? {
                ...f,
                status: "error" as const,
                error: error instanceof Error ? error.message : "Upload failed",
              }
            : f
        )
      );

      toast({
        title: "Error",
        description: `Failed to upload ${file.name}`,
        variant: "destructive",
      });
    }
  };

  const handleUploadAll = async () => {
    const pendingFiles = files.filter((f) => f.status === "pending");
    for (let i = 0; i < files.length; i++) {
      if (files[i].status === "pending") {
        await uploadFile(files[i], i);
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Upload Documents</h1>
        <p className="text-gray-600 mt-2">
          Upload PDF, Word, XML, or text files for processing
        </p>
      </div>

      {/* Dropzone */}
      <Card className="mb-6">
        <CardContent className="p-0">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-gray-300 hover:border-primary hover:bg-gray-50"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            {isDragActive ? (
              <p className="text-lg text-primary">Drop files here...</p>
            ) : (
              <>
                <p className="text-lg text-gray-700 mb-2">
                  Drag & drop files here, or click to select
                </p>
                <p className="text-sm text-gray-500">
                  Supports PDF, DOCX, DOC, XML, TXT (max 50MB)
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* File list */}
      {files.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Files ({files.length})</CardTitle>
            <Button
              onClick={handleUploadAll}
              disabled={!files.some((f) => f.status === "pending")}
            >
              Upload All
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {files.map((fileWithProgress, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-4 border rounded-lg"
              >
                <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium truncate">
                      {fileWithProgress.file.name}
                    </p>
                    <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                      {formatBytes(fileWithProgress.file.size)}
                    </span>
                  </div>
                  {fileWithProgress.status === "uploading" && (
                    <Progress value={fileWithProgress.progress} className="h-2" />
                  )}
                  {fileWithProgress.status === "error" && (
                    <p className="text-xs text-red-500">
                      {fileWithProgress.error}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {fileWithProgress.status === "success" && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  {fileWithProgress.status === "pending" && (
                    <Button
                      size="sm"
                      onClick={() => uploadFile(fileWithProgress, index)}
                    >
                      Upload
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

