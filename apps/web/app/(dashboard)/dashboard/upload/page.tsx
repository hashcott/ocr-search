"use client";

import { useState, useCallback, useEffect } from "react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
    Upload,
    FileText,
    X,
    CheckCircle,
    UploadCloud,
    File,
    AlertCircle,
    Building2,
} from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { useWebSocket } from "@/lib/use-websocket";

interface FileWithProgress {
    file: File;
    progress: number;
    status: "pending" | "uploading" | "success" | "error";
    error?: string;
}

export default function UploadPage() {
    const { toast } = useToast();
    const [files, setFiles] = useState<FileWithProgress[]>([]);
    const [selectedOrganizationId, setSelectedOrganizationId] =
        useState<string>("personal");

    const uploadMutation = trpc.document.upload.useMutation();
    const { data: organizations } = trpc.organization.list.useQuery();

    // Request notification permission on mount
    useEffect(() => {
        if (typeof window !== "undefined" && "Notification" in window) {
            if (Notification.permission === "default") {
                Notification.requestPermission();
            }
        }
    }, []);

    // WebSocket integration for real-time notifications
    useWebSocket(
        (data) => {
            // Handle document processed notification
            if (data.status === "completed") {
                setFiles((prev) =>
                    prev.map((f) =>
                        f.file.name === data.filename
                            ? {
                                  ...f,
                                  status: "success" as const,
                                  progress: 100,
                              }
                            : f
                    )
                );
                toast({
                    title: "✅ Upload Complete",
                    description: `${data.filename} has been processed and indexed!`,
                });
            } else {
                setFiles((prev) =>
                    prev.map((f) =>
                        f.file.name === data.filename
                            ? {
                                  ...f,
                                  status: "error" as const,
                                  error: data.error || "Processing failed",
                              }
                            : f
                    )
                );
                toast({
                    title: "Processing Failed",
                    description: `Failed to process ${data.filename}`,
                    variant: "destructive",
                });
            }
        },
        undefined // No chat handler needed here
    );

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
                ...(selectedOrganizationId &&
                    selectedOrganizationId !== "personal" && {
                        organizationId: selectedOrganizationId,
                    }),
            });

            clearInterval(progressInterval);

            setFiles((prev) =>
                prev.map((f, i) =>
                    i === index
                        ? { ...f, status: "success" as const, progress: 100 }
                        : f
                )
            );

            // Note: WebSocket will handle the notification and sound
            // This toast is just for immediate feedback
            toast({
                title: "✅ Upload Started",
                description: `${file.name} is being processed...`,
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
        const pendingFiles = files.filter((f) => f.status === "pending");
        let successCount = 0;

        for (let i = 0; i < files.length; i++) {
            if (files[i].status === "pending") {
                try {
                    await uploadFile(files[i], i);
                    successCount++;
                } catch {
                    // Error already handled in uploadFile
                }
            }
        }

        // Show batch completion notification
        if (pendingFiles.length > 1) {
            toast({
                title: "🎉 Batch Upload Complete",
                description: `${successCount}/${pendingFiles.length} files processed successfully!`,
            });

            if (
                typeof window !== "undefined" &&
                Notification.permission === "granted"
            ) {
                new Notification("Batch Upload Complete", {
                    body: `${successCount}/${pendingFiles.length} documents have been processed!`,
                    icon: "/favicon.ico",
                });
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

            {/* Organization Selector */}
            <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                    <div className="space-y-2">
                        <Label htmlFor="organization">
                            Upload to Organization (Optional)
                        </Label>
                        <Select
                            value={selectedOrganizationId}
                            onValueChange={setSelectedOrganizationId}
                        >
                            <SelectTrigger id="organization">
                                <Building2 className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="Personal documents (default)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="personal">
                                    Personal documents
                                </SelectItem>
                                {organizations?.map((org) => (
                                    <SelectItem key={org.id} value={org.id}>
                                        {org.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {selectedOrganizationId &&
                            selectedOrganizationId !== "personal"
                                ? `Documents will be shared with organization members`
                                : `Documents will be private to you`}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Dropzone */}
            <Card className="border-0 shadow-modern-lg overflow-hidden hover-lift">
                <div
                    {...getRootProps()}
                    className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-modern ${
                        isDragActive
                            ? "border-purple-500 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 scale-[1.02]"
                            : "border-slate-200 dark:border-slate-700 hover:border-purple-400 hover:bg-gradient-to-br hover:from-slate-50 hover:to-purple-50/30 dark:hover:bg-slate-800/50"
                    }`}
                >
                    <input {...getInputProps()} />

                    <div className="flex flex-col items-center">
                        <div
                            className={`w-24 h-24 rounded-2xl flex items-center justify-center mb-6 transition-modern shadow-modern-lg ${
                                isDragActive
                                    ? "bg-gradient-to-br from-purple-500 to-blue-500 scale-110 shadow-purple-500/50"
                                    : "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700"
                            }`}
                        >
                            <UploadCloud
                                className={`h-12 w-12 transition-colors ${
                                    isDragActive
                                        ? "text-white"
                                        : "text-slate-500 dark:text-slate-400"
                                }`}
                            />
                        </div>

                        {isDragActive ? (
                            <div className="animate-pulse-slow">
                                <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                                    Drop files here
                                </p>
                                <p className="text-slate-600 dark:text-slate-300">
                                    Release to upload your files
                                </p>
                            </div>
                        ) : (
                            <div>
                                <p className="text-2xl font-bold bg-gradient-to-r from-slate-700 to-slate-500 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent mb-2">
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
                                                className="px-4 py-1.5 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-full text-xs font-semibold text-purple-700 dark:text-purple-300 shadow-modern"
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
                <Card className="border-0 shadow-modern-lg">
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
