"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
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
    AlertCircle,
    Building2,
} from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { useWebSocketStore } from "@/lib/stores";

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

    useEffect(() => {
        if (typeof window !== "undefined" && "Notification" in window) {
            if (Notification.permission === "default") {
                Notification.requestPermission();
            }
        }
    }, []);

    const setDocumentHandler = useWebSocketStore((state) => state.setDocumentHandler);

    useEffect(() => {
        setDocumentHandler((data) => {
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
                    title: "Upload Complete",
                    description: `${data.filename} has been processed and indexed`,
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
        });
    }, [setDocumentHandler, toast]);

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
        maxSize: 50 * 1024 * 1024,
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

            toast({
                title: "Upload Started",
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
                    // Error handled in uploadFile
                }
            }
        }

        if (pendingFiles.length > 1) {
            toast({
                title: "Batch Upload Complete",
                description: `${successCount}/${pendingFiles.length} files processed`,
            });
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
        <div className="h-full overflow-y-auto p-6 lg:p-8 space-y-6 max-w-4xl mx-auto custom-scrollbar">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Upload Documents</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Add files to your knowledge base for AI analysis.
                    </p>
                </div>
                {successCount > 0 && (
                    <Button
                        variant="ghost"
                        onClick={clearCompleted}
                        className="rounded-lg text-primary font-medium"
                    >
                        Clear Completed ({successCount})
                    </Button>
                )}
            </div>

            {/* Organization Selection */}
            <Card className="bg-card border-border">
                <CardContent className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        <div className="space-y-2">
                            <Label htmlFor="organization" className="text-sm font-medium">
                                Upload to
                            </Label>
                            <Select
                                value={selectedOrganizationId}
                                onValueChange={setSelectedOrganizationId}
                            >
                                <SelectTrigger id="organization" className="bg-accent border-border h-10 rounded-lg">
                                    <div className="flex items-center">
                                        <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                                        <SelectValue placeholder="Personal" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border rounded-lg">
                                    <SelectItem value="personal" className="rounded">
                                        Personal Workspace
                                    </SelectItem>
                                    {organizations?.map((org) => (
                                        <SelectItem key={org.id} value={org.id} className="rounded">
                                            {org.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="p-3 bg-accent rounded-lg border border-border">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-muted-foreground">
                                    {selectedOrganizationId && selectedOrganizationId !== "personal"
                                        ? `Files will be accessible to all members of ${organizations?.find(o => o.id === selectedOrganizationId)?.name || 'this organization'}.`
                                        : `Files will be private and only accessible to you.`}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Dropzone */}
            <Card className="bg-card border-border overflow-hidden">
                <div
                    {...getRootProps()}
                    className={`p-12 text-center cursor-pointer transition-colors ${isDragActive
                        ? "bg-primary/5"
                        : "hover:bg-accent"
                        }`}
                >
                    <input {...getInputProps()} />

                    <div className="flex flex-col items-center">
                        <div
                            className={`w-16 h-16 rounded-xl flex items-center justify-center mb-4 transition-colors ${isDragActive
                                ? "bg-primary text-primary-foreground"
                                : "bg-accent"
                                }`}
                        >
                            <UploadCloud className={`h-8 w-8 ${isDragActive ? "" : "text-muted-foreground"}`} />
                        </div>

                        {isDragActive ? (
                            <div className="space-y-1">
                                <p className="text-lg font-medium text-primary">
                                    Drop files here
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Files will be processed automatically
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div>
                                    <p className="text-lg font-medium">
                                        Drop files here or click to browse
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Supports PDF, DOCX, XML, TXT (max 50MB)
                                    </p>
                                </div>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {["PDF", "DOCX", "XML", "TXT"].map((type) => (
                                        <span
                                            key={type}
                                            className="px-3 py-1 bg-accent border border-border rounded-md text-xs font-medium"
                                        >
                                            {type}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* File Queue */}
            {files.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-medium">Upload Queue</h2>
                            <p className="text-sm text-muted-foreground">
                                {pendingCount} files pending
                            </p>
                        </div>
                        <Button
                            onClick={handleUploadAll}
                            disabled={pendingCount === 0}
                            className="bg-primary rounded-lg h-9 px-4 font-medium"
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload All ({pendingCount})
                        </Button>
                    </div>

                    <Card className="bg-card border-border overflow-hidden">
                        <div className="divide-y divide-border">
                            {files.map((fileWithProgress, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-4 p-4 hover:bg-accent transition-colors"
                                >
                                    <div
                                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${fileWithProgress.status === "success"
                                            ? "bg-chart-2/10"
                                            : fileWithProgress.status === "error"
                                                ? "bg-destructive/10"
                                                : "bg-accent"
                                            }`}
                                    >
                                        {fileWithProgress.status === "success" ? (
                                            <CheckCircle className="h-5 w-5 text-chart-2" />
                                        ) : fileWithProgress.status === "error" ? (
                                            <AlertCircle className="h-5 w-5 text-destructive" />
                                        ) : (
                                            <FileText className="h-5 w-5 text-muted-foreground" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="font-medium text-sm truncate">
                                                {fileWithProgress.file.name}
                                            </p>
                                            <span className="text-xs text-muted-foreground flex-shrink-0">
                                                {formatBytes(fileWithProgress.file.size)}
                                            </span>
                                        </div>

                                        <div className="mt-2">
                                            {fileWithProgress.status === "uploading" ? (
                                                <div className="space-y-1">
                                                    <Progress
                                                        value={fileWithProgress.progress}
                                                        className="h-1"
                                                    />
                                                    <p className="text-xs text-muted-foreground">
                                                        {fileWithProgress.progress}% complete
                                                    </p>
                                                </div>
                                            ) : fileWithProgress.status === "success" ? (
                                                <p className="text-xs text-chart-2">Uploaded successfully</p>
                                            ) : fileWithProgress.status === "error" ? (
                                                <p className="text-xs text-destructive">{fileWithProgress.error || 'Upload failed'}</p>
                                            ) : (
                                                <p className="text-xs text-muted-foreground">Waiting in queue</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {fileWithProgress.status === "pending" && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => uploadFile(fileWithProgress, index)}
                                                className="h-8 rounded-lg"
                                            >
                                                Start
                                            </Button>
                                        )}
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => removeFile(index)}
                                            className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
