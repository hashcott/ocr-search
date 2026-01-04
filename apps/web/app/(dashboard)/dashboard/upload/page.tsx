"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
    Upload,
    FileText,
    X,
    CheckCircle,
    UploadCloud,
    File,
    AlertCircle,
} from "lucide-react";
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

    const uploadMutation = trpc.document.upload.useMutation();

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

    const uploadFile = async (
        fileWithProgress: FileWithProgress,
        index: number
    ) => {
        const { file } = fileWithProgress;

        setFiles((prev) =>
            prev.map((f, i) =>
                i === index
                    ? { ...f, status: "uploading" as const, progress: 0 }
                    : f
            )
        );

        try {
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

            const progressInterval = setInterval(() => {
                setFiles((prev) =>
                    prev.map((f, i) =>
                        i === index && f.progress < 90
                            ? { ...f, progress: f.progress + 10 }
                            : f
                    )
                );
            }, 200);

            await uploadMutation.mutateAsync({
                filename: file.name,
                mimeType: file.type,
                size: file.size,
                data: base64Data,
            });

            clearInterval(progressInterval);

            setFiles((prev) =>
                prev.map((f, i) =>
                    i === index
                        ? { ...f, status: "success" as const, progress: 100 }
                        : f
                )
            );

            toast({
                title: "Success",
                description: `${file.name} uploaded successfully`,
            });
        } catch (error) {
            setFiles((prev) =>
                prev.map((f, i) =>
                    i === index
                        ? {
                              ...f,
                              status: "error" as const,
                              error:
                                  error instanceof Error
                                      ? error.message
                                      : "Upload failed",
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
        for (let i = 0; i < files.length; i++) {
            if (files[i].status === "pending") {
                await uploadFile(files[i], i);
            }
        }
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const clearCompleted = () => {
        setFiles((prev) => prev.filter((f) => f.status !== "success"));
    };

    const pendingCount = files.filter((f) => f.status === "pending").length;
    const successCount = files.filter((f) => f.status === "success").length;

    return (
        <div className="p-6 space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                        Upload Documents
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Upload PDF, Word, XML, or text files for AI processing
                    </p>
                </div>
                {successCount > 0 && (
                    <Button variant="outline" onClick={clearCompleted}>
                        Clear Completed ({successCount})
                    </Button>
                )}
            </div>

            {/* Dropzone */}
            <Card className="border-0 shadow-sm overflow-hidden">
                <div
                    {...getRootProps()}
                    className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 ${
                        isDragActive
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                >
                    <input {...getInputProps()} />

                    <div className="flex flex-col items-center">
                        <div
                            className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all duration-300 ${
                                isDragActive
                                    ? "bg-blue-100 dark:bg-blue-900/40 scale-110"
                                    : "bg-slate-100 dark:bg-slate-800"
                            }`}
                        >
                            <UploadCloud
                                className={`h-10 w-10 transition-colors ${
                                    isDragActive
                                        ? "text-blue-600"
                                        : "text-slate-400"
                                }`}
                            />
                        </div>

                        {isDragActive ? (
                            <div>
                                <p className="text-xl font-semibold text-blue-600 mb-2">
                                    Drop files here
                                </p>
                                <p className="text-slate-500">
                                    Release to upload your files
                                </p>
                            </div>
                        ) : (
                            <div>
                                <p className="text-xl font-semibold text-slate-700 dark:text-white mb-2">
                                    Drag & drop files here
                                </p>
                                <p className="text-slate-500 dark:text-slate-400 mb-4">
                                    or click to browse from your computer
                                </p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {["PDF", "DOCX", "DOC", "XML", "TXT"].map(
                                        (type) => (
                                            <span
                                                key={type}
                                                className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300"
                                            >
                                                {type}
                                            </span>
                                        )
                                    )}
                                </div>
                                <p className="text-xs text-slate-400 mt-4">
                                    Maximum file size: 50MB
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* File list */}
            {files.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader className="border-b border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Upload Queue</CardTitle>
                                <CardDescription>
                                    {files.length} file(s) • {pendingCount}{" "}
                                    pending
                                </CardDescription>
                            </div>
                            <Button
                                onClick={handleUploadAll}
                                disabled={pendingCount === 0}
                                className="gradient-primary border-0"
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                Upload All ({pendingCount})
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {files.map((fileWithProgress, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                >
                                    {/* File icon */}
                                    <div
                                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                            fileWithProgress.status ===
                                            "success"
                                                ? "bg-green-100 dark:bg-green-900/30"
                                                : fileWithProgress.status ===
                                                  "error"
                                                ? "bg-red-100 dark:bg-red-900/30"
                                                : "bg-blue-100 dark:bg-blue-900/30"
                                        }`}
                                    >
                                        {fileWithProgress.status ===
                                        "success" ? (
                                            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                                        ) : fileWithProgress.status ===
                                          "error" ? (
                                            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                                        ) : (
                                            <File className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                        )}
                                    </div>

                                    {/* File info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="font-medium text-slate-800 dark:text-white truncate">
                                                {fileWithProgress.file.name}
                                            </p>
                                            <span className="text-sm text-slate-500 dark:text-slate-400 ml-2 flex-shrink-0">
                                                {formatBytes(
                                                    fileWithProgress.file.size
                                                )}
                                            </span>
                                        </div>

                                        {fileWithProgress.status ===
                                            "uploading" && (
                                            <div className="mt-2">
                                                <Progress
                                                    value={
                                                        fileWithProgress.progress
                                                    }
                                                    className="h-2"
                                                />
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Uploading...{" "}
                                                    {fileWithProgress.progress}%
                                                </p>
                                            </div>
                                        )}

                                        {fileWithProgress.status ===
                                            "success" && (
                                            <p className="text-sm text-green-600 dark:text-green-400">
                                                Uploaded successfully
                                            </p>
                                        )}

                                        {fileWithProgress.status ===
                                            "error" && (
                                            <p className="text-sm text-red-600 dark:text-red-400">
                                                {fileWithProgress.error}
                                            </p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {fileWithProgress.status ===
                                            "pending" && (
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    uploadFile(
                                                        fileWithProgress,
                                                        index
                                                    )
                                                }
                                                className="gradient-primary border-0"
                                            >
                                                Upload
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => removeFile(index)}
                                            className="text-slate-400 hover:text-red-600"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
