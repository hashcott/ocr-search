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

    // Request notification permission on mount
    useEffect(() => {
        if (typeof window !== "undefined" && "Notification" in window) {
            if (Notification.permission === "default") {
                Notification.requestPermission();
            }
        }
    }, []);

    // WebSocket integration for real-time notifications
    const setDocumentHandler = useWebSocketStore((state) => state.setDocumentHandler);

    useEffect(() => {
        setDocumentHandler((data) => {
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
        <div className="p-8 sm:p-10 space-y-10 max-w-5xl mx-auto animate-fadeIn">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Upload Center</h1>
                    <p className="text-muted-foreground mt-2 text-lg">
                        Feed your AI brain with new knowledge assets.
                    </p>
                </div>
                {successCount > 0 && (
                    <Button
                        variant="ghost"
                        onClick={clearCompleted}
                        className="rounded-xl text-primary font-bold hover:bg-primary/5 h-11 px-6"
                    >
                        Clear Completed ({successCount})
                    </Button>
                )}
            </div>

            {/* Context & Organization - Premium Glass */}
            <Card className="glass border-none shadow-xl overflow-hidden rounded-3xl group">
                <CardContent className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div className="space-y-4">
                            <Label htmlFor="organization" className="text-sm font-bold uppercase tracking-widest opacity-70">
                                Destination Context
                            </Label>
                            <Select
                                value={selectedOrganizationId}
                                onValueChange={setSelectedOrganizationId}
                            >
                                <SelectTrigger id="organization" className="bg-black/5 dark:bg-background/50 border-black/5 dark:border-white/5 h-12 rounded-xl focus:ring-primary shadow-inner">
                                    <div className="flex items-center">
                                        <Building2 className="h-4 w-4 mr-3 text-primary" />
                                        <SelectValue placeholder="Personal Space" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="glass border-black/5 dark:border-white/10 rounded-xl shadow-2xl">
                                    <SelectItem value="personal" className="rounded-lg focus:bg-primary/10">
                                        Personal Workspace
                                    </SelectItem>
                                    {organizations?.map((org) => (
                                        <SelectItem key={org.id} value={org.id} className="rounded-lg focus:bg-primary/10">
                                            {org.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10 transition-colors group-hover:bg-primary/10">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                                    <AlertCircle className="h-5 w-5 text-primary" />
                                </div>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    {selectedOrganizationId && selectedOrganizationId !== "personal"
                                        ? `Assets uploaded here will be collaboratively accessible to all members of ${organizations?.find(o => o.id === selectedOrganizationId)?.name || 'this organization'}.`
                                        : `Assets will be encrypted and stored in your private vault, accessible only to you.`}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Dropzone - Interactive AI Interaction */}
            <div className="relative group/drop">
                <div className="absolute -inset-1 bg-ai-gradient rounded-[2rem] blur opacity-10 group-hover/drop:opacity-30 transition-opacity duration-500" />
                <Card className="glass border-none shadow-2xl overflow-hidden rounded-[2rem] relative z-10">
                    <div
                        {...getRootProps()}
                        className={`relative p-16 text-center cursor-pointer transition-all duration-500 ${isDragActive
                            ? "bg-black/10 dark:bg-white/10 scale-[0.99]"
                            : "hover:bg-black/5 dark:hover:bg-white/5"
                            }`}
                    >
                        <input {...getInputProps()} />

                        <div className="flex flex-col items-center">
                            <div
                                className={`w-32 h-32 rounded-[2.5rem] flex items-center justify-center mb-8 transition-all duration-500 shadow-2xl relative ${isDragActive
                                    ? "bg-ai-gradient scale-110 rotate-12"
                                    : "bg-accent/50 scale-100 group-hover/drop:scale-105"
                                    }`}
                            >
                                <UploadCloud
                                    className={`h-16 w-16 transition-all duration-500 ${isDragActive ? "text-white" : "text-primary/70"
                                        }`}
                                />
                                {isDragActive && (
                                    <div className="absolute inset-0 rounded-[2.5rem] bg-white animate-ping opacity-20" />
                                )}
                            </div>

                            {isDragActive ? (
                                <div className="space-y-2">
                                    <p className="text-3xl font-bold tracking-tight text-primary">
                                        Release to index files
                                    </p>
                                    <p className="text-muted-foreground text-lg">
                                        AI processing will begin immediately.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-3xl font-bold tracking-tight">
                                            Ingest your documents
                                        </p>
                                        <p className="text-muted-foreground text-lg mt-2">
                                            Drop files here or click to browse intelligence assets
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap justify-center gap-3">
                                        {["PDF", "DOCX", "XML", "TXT"].map((type) => (
                                            <span
                                                key={type}
                                                className="px-6 py-2 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl text-xs font-bold tracking-widest text-foreground shadow-sm transition-all hover:bg-black/10 dark:hover:bg-white/10 hover:border-primary/30"
                                            >
                                                {type}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="pt-4 flex items-center justify-center gap-2 opacity-40">
                                        <div className="w-1 h-1 rounded-full bg-foreground" />
                                        <p className="text-[10px] uppercase font-bold tracking-tighter">Enterprise Grade Encryption Included</p>
                                        <div className="w-1 h-1 rounded-full bg-foreground" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            </div>

            {/* Queue Area - Modern Streamlined List */}
            {files.length > 0 && (
                <div className="space-y-6 animate-slideUp">
                    <div className="flex items-center justify-between px-4">
                        <div>
                            <h2 className="text-2xl font-bold">Upload Queue</h2>
                            <p className="text-muted-foreground text-sm font-medium">
                                {pendingCount} files remaining to be indexed
                            </p>
                        </div>
                        <Button
                            onClick={handleUploadAll}
                            disabled={pendingCount === 0}
                            className="bg-ai-gradient shadow-ai border-none rounded-2xl h-12 px-8 font-bold hover:opacity-90 transition-opacity"
                        >
                            <Upload className="h-5 w-5 mr-3" />
                            Ingest All ({pendingCount})
                        </Button>
                    </div>

                    <Card className="glass border-none shadow-2xl overflow-hidden rounded-[2rem]">
                        <div className="divide-y divide-black/5 dark:divide-white/5">
                            {files.map((fileWithProgress, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-6 p-6 group hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                                >
                                    {/* Iconic Status indicator */}
                                    <div
                                        className={`w-14 h-14 rounded-2xl shadow-inner flex items-center justify-center relative flex-shrink-0 transition-transform group-hover:scale-110 ${fileWithProgress.status === "success"
                                            ? "bg-emerald-500/10"
                                            : fileWithProgress.status === "error"
                                                ? "bg-rose-500/10"
                                                : "bg-accent/50"
                                            }`}
                                    >
                                        {fileWithProgress.status === "success" ? (
                                            <CheckCircle className="h-7 w-7 text-emerald-500" />
                                        ) : fileWithProgress.status === "error" ? (
                                            <AlertCircle className="h-7 w-7 text-rose-500" />
                                        ) : (
                                            <FileText className="h-7 w-7 text-primary/70" />
                                        )}
                                        {fileWithProgress.status === "uploading" && (
                                            <div className="absolute inset-0 rounded-2xl border-2 border-primary border-t-transparent animate-spin" />
                                        )}
                                    </div>

                                    {/* Intelligence Identity */}
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <p className="font-bold text-lg truncate pr-4 group-hover:text-primary transition-colors">
                                                {fileWithProgress.file.name}
                                            </p>
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                                                {formatBytes(fileWithProgress.file.size)}
                                            </span>
                                        </div>

                                        <div className="relative pt-2">
                                            {fileWithProgress.status === "uploading" ? (
                                                <div className="space-y-3">
                                                    <Progress
                                                        value={fileWithProgress.progress}
                                                        className="h-1.5 bg-black/5 dark:bg-white/5"
                                                    />
                                                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-primary animate-pulse">
                                                        <span>Processing Neural Map...</span>
                                                        <span>{fileWithProgress.progress}% Complete</span>
                                                    </div>
                                                </div>
                                            ) : fileWithProgress.status === "success" ? (
                                                <div className="flex items-center gap-2 text-emerald-500">
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Asset Secured & Indexed</span>
                                                    <div className="h-0.5 flex-1 bg-emerald-500/20" />
                                                </div>
                                            ) : fileWithProgress.status === "error" ? (
                                                <div className="flex items-center gap-2 text-rose-500">
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{fileWithProgress.error || 'Connection Timeout'}</span>
                                                    <div className="h-0.5 flex-1 bg-rose-500/20" />
                                                </div>
                                            ) : (
                                                <div className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest flex items-center gap-2">
                                                    <span>Waiting in queue</span>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                                                    <span>Ready for AI Analysis</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Hub */}
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        {fileWithProgress.status === "pending" && (
                                            <Button
                                                size="sm"
                                                onClick={() => uploadFile(fileWithProgress, index)}
                                                className="bg-primary/10 text-primary border-none rounded-xl font-bold px-6 hover:bg-primary hover:text-white transition-all shadow-sm"
                                            >
                                                Start
                                            </Button>
                                        )}
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => removeFile(index)}
                                            className="h-10 w-10 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/5 transition-all rounded-xl"
                                        >
                                            <X className="h-5 w-5" />
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
