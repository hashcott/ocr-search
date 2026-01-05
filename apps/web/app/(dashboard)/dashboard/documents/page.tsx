"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    FileText,
    Search,
    Download,
    Trash2,
    MoreVertical,
    Eye,
    Filter,
    Grid,
    List,
    CheckCircle,
    Clock,
    AlertCircle,
    FileType,
    Calendar,
    HardDrive,
    RefreshCw,
    Upload,
    ChevronLeft,
    ChevronRight,
    Building2,
    Lock,
    Globe,
    Users,
    Share2,
    UserPlus,
    UserMinus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatBytes } from "@/lib/utils";
import Link from "next/link";

type ViewMode = "table" | "grid";
type FilterStatus = "all" | "completed" | "processing" | "failed";
type FilterType = "all" | "pdf" | "word" | "xml" | "text";
type SortField = "filename" | "size" | "createdAt" | "status";
type SortOrder = "asc" | "desc";

const ITEMS_PER_PAGE = 10;

export default function DocumentsPage() {
    const { toast } = useToast();

    // State
    const [viewMode, setViewMode] = useState<ViewMode>("table");
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
    const [filterType, setFilterType] = useState<FilterType>("all");
    const [filterOrganization, setFilterOrganization] = useState<string>("all");
    const [sortField, setSortField] = useState<SortField>("createdAt");
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const [shareTarget, setShareTarget] = useState<string | null>(null);
    const [shareType, setShareType] = useState<
        "user" | "organization" | "public"
    >("user");
    const [shareUserQuery, setShareUserQuery] = useState("");
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
        new Set()
    );
    const [selectedOrganizationIds, setSelectedOrganizationIds] = useState<
        Set<string>
    >(new Set());
    const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
        new Set(["read"])
    );

    // Queries
    const {
        data: documents,
        isLoading,
        refetch,
    } = trpc.document.list.useQuery();
    const { data: organizations } = trpc.organization.list.useQuery();
    const { data: users } = trpc.document.listUsers.useQuery(
        { query: shareUserQuery },
        { enabled: shareDialogOpen }
    );
    const { data: shareInfo, refetch: refetchShareInfo } =
        trpc.document.getShareInfo.useQuery(
            { documentId: shareTarget! },
            { enabled: !!shareTarget && shareDialogOpen }
        );

    const deleteMutation = trpc.document.delete.useMutation({
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Document deleted successfully",
            });
            refetch();
            setSelectedIds(new Set());
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const shareMutation = trpc.document.share.useMutation({
        onSuccess: (data) => {
            toast({ title: "Success", description: data.message });
            refetch();
            refetchShareInfo();
            setSelectedUserIds(new Set());
            setSelectedOrganizationIds(new Set());
            setShareUserQuery("");
            setSelectedPermissions(new Set(["read"]));
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const unshareMutation = trpc.document.unshare.useMutation({
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Share removed successfully",
            });
            refetch();
            refetchShareInfo();
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    // Filter and sort documents
    const filteredDocuments = useMemo(() => {
        if (!documents) return [];

        let result = [...documents];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter((doc) =>
                doc.filename.toLowerCase().includes(query)
            );
        }

        // Status filter
        if (filterStatus !== "all") {
            result = result.filter(
                (doc) => doc.processingStatus === filterStatus
            );
        }

        // Type filter
        if (filterType !== "all") {
            const typeMap: Record<string, string[]> = {
                pdf: ["application/pdf"],
                word: [
                    "application/msword",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ],
                xml: ["application/xml", "text/xml"],
                text: ["text/plain"],
            };
            result = result.filter((doc) =>
                typeMap[filterType]?.includes(doc.mimeType)
            );
        }

        // Organization filter
        if (filterOrganization !== "all") {
            if (filterOrganization === "personal") {
                result = result.filter((doc) => !doc.organizationId);
            } else {
                result = result.filter(
                    (doc) => doc.organizationId === filterOrganization
                );
            }
        }

        // Sort
        result.sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case "filename":
                    comparison = a.filename.localeCompare(b.filename);
                    break;
                case "size":
                    comparison = a.size - b.size;
                    break;
                case "createdAt":
                    comparison =
                        new Date(a.createdAt).getTime() -
                        new Date(b.createdAt).getTime();
                    break;
                case "status":
                    comparison = a.processingStatus.localeCompare(
                        b.processingStatus
                    );
                    break;
            }
            return sortOrder === "asc" ? comparison : -comparison;
        });

        return result;
    }, [
        documents,
        searchQuery,
        filterStatus,
        filterType,
        filterOrganization,
        sortField,
        sortOrder,
    ]);

    // Pagination
    const totalPages = Math.ceil(filteredDocuments.length / ITEMS_PER_PAGE);
    const paginatedDocuments = filteredDocuments.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Handlers
    const handleSelectAll = () => {
        if (selectedIds.size === paginatedDocuments.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(paginatedDocuments.map((d) => d.id)));
        }
    };

    const handleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleDelete = (id: string) => {
        setDeleteTarget(id);
        setDeleteDialogOpen(true);
    };

    const handleShare = (id: string) => {
        setShareTarget(id);
        setShareDialogOpen(true);
        setShareType("user");
        setSelectedUserIds(new Set());
        setSelectedOrganizationIds(new Set());
        setShareUserQuery("");
        setSelectedPermissions(new Set(["read"]));
    };

    const handleShareConfirm = () => {
        if (!shareTarget) return;

        if (shareType === "user" && selectedUserIds.size === 0) return;
        if (shareType === "organization" && selectedOrganizationIds.size === 0)
            return;
        if (shareType === "public" && selectedPermissions.size === 0) return;
        if (selectedPermissions.size === 0) return;

        shareMutation.mutate({
            documentId: shareTarget,
            shareType,
            userIds:
                shareType === "user" ? Array.from(selectedUserIds) : undefined,
            organizationIds:
                shareType === "organization"
                    ? Array.from(selectedOrganizationIds)
                    : undefined,
            permissions: Array.from(selectedPermissions) as Array<
                | "manage"
                | "create"
                | "read"
                | "update"
                | "delete"
                | "share"
                | "export"
            >,
        });
    };

    const handleUnshare = (
        shareType: "user" | "organization" | "public",
        id?: string
    ) => {
        if (!shareTarget) return;
        unshareMutation.mutate({
            documentId: shareTarget,
            shareType,
            userIds: shareType === "user" && id ? [id] : undefined,
            organizationIds:
                shareType === "organization" && id ? [id] : undefined,
        });
    };

    const toggleUserSelection = (userId: string) => {
        const newSelected = new Set(selectedUserIds);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedUserIds(newSelected);
    };

    const toggleOrganizationSelection = (orgId: string) => {
        const newSelected = new Set(selectedOrganizationIds);
        if (newSelected.has(orgId)) {
            newSelected.delete(orgId);
        } else {
            newSelected.add(orgId);
        }
        setSelectedOrganizationIds(newSelected);
    };

    const togglePermission = (permission: string) => {
        const newSelected = new Set(selectedPermissions);
        if (permission === "manage") {
            // Manage includes all permissions
            if (newSelected.has("manage")) {
                newSelected.clear();
                newSelected.add("read");
            } else {
                newSelected.clear();
                newSelected.add("manage");
            }
        } else {
            if (newSelected.has(permission)) {
                newSelected.delete(permission);
                // If removing read and no other permissions, add read back
                if (newSelected.size === 0) {
                    newSelected.add("read");
                }
            } else {
                // Remove manage if selecting specific permission
                newSelected.delete("manage");
                newSelected.add(permission);
            }
        }
        setSelectedPermissions(newSelected);
    };

    const permissionLabels: Record<string, string> = {
        manage: "Manage (All permissions)",
        read: "Read",
        update: "Update",
        delete: "Delete",
        share: "Share",
        export: "Export",
    };

    const handleBulkDelete = () => {
        setDeleteTarget(null);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (deleteTarget) {
            await deleteMutation.mutateAsync({ id: deleteTarget });
        } else {
            // Bulk delete
            for (const id of selectedIds) {
                await deleteMutation.mutateAsync({ id });
            }
        }
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
    };

    const handleDownload = async (doc: any) => {
        try {
            // Get auth token from localStorage
            const token = localStorage.getItem("auth_token");
            console.log("Download - Token present:", !!token);

            if (!token) {
                toast({
                    title: "Error",
                    description: "Please login again",
                    variant: "destructive",
                });
                return;
            }

            const serverUrl =
                process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001";
            console.log("Download - Server URL:", serverUrl);
            console.log("Download - Doc ID:", doc.id);

            const response = await fetch(`${serverUrl}/api/files/${doc.id}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            console.log("Download - Response status:", response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("Download error:", errorData);
                throw new Error(errorData.error || "Download failed");
            }

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
            console.error("Download error:", error);
            toast({
                title: "Error",
                description: "Failed to download file",
                variant: "destructive",
            });
        }
    };

    const getFileTypeIcon = (mimeType: string) => {
        if (mimeType.includes("pdf")) return "PDF";
        if (mimeType.includes("word") || mimeType.includes("document"))
            return "DOC";
        if (mimeType.includes("xml")) return "XML";
        if (mimeType.includes("text")) return "TXT";
        return "FILE";
    };

    const getFileTypeColor = (mimeType: string) => {
        if (mimeType.includes("pdf"))
            return "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400";
        if (mimeType.includes("word") || mimeType.includes("document"))
            return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
        if (mimeType.includes("xml"))
            return "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400";
        if (mimeType.includes("text"))
            return "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400";
        return "bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400";
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "completed":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle className="h-3 w-3" />
                        Completed
                    </span>
                );
            case "processing":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                        <Clock className="h-3 w-3 animate-spin" />
                        Processing
                    </span>
                );
            case "failed":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <AlertCircle className="h-3 w-3" />
                        Failed
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
                        {status}
                    </span>
                );
        }
    };

    const getVisibilityIcon = (
        visibility?: string,
        organizationId?: string
    ) => {
        if (!organizationId) {
            return (
                <div title="Personal document">
                    <Lock className="h-3 w-3 text-slate-500" />
                </div>
            );
        }
        switch (visibility) {
            case "private":
                return (
                    <div title="Private">
                        <Lock className="h-3 w-3 text-slate-500" />
                    </div>
                );
            case "organization":
                return (
                    <div title="Organization members">
                        <Users className="h-3 w-3 text-blue-500" />
                    </div>
                );
            case "public":
                return (
                    <div title="Public">
                        <Globe className="h-3 w-3 text-green-500" />
                    </div>
                );
            default:
                return null;
        }
    };

    const getOrganizationName = (organizationId?: string) => {
        if (!organizationId) return null;
        return organizations?.find((org) => org.id === organizationId)?.name;
    };

    return (
        <div className="p-6 space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                        Document Management
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {filteredDocuments.length} document(s) total
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => refetch()}
                        disabled={isLoading}
                    >
                        <RefreshCw
                            className={`h-4 w-4 mr-2 ${
                                isLoading ? "animate-spin" : ""
                            }`}
                        />
                        Refresh
                    </Button>
                    <Link href="/dashboard/upload">
                        <Button className="gradient-primary border-0">
                            <Upload className="h-4 w-4 mr-2" />
                            Upload New
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Filters & Search */}
            <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by filename..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="pl-9"
                            />
                        </div>

                        {/* Filters */}
                        <div className="flex flex-wrap gap-3">
                            <Select
                                value={filterStatus}
                                onValueChange={(value: FilterStatus) => {
                                    setFilterStatus(value);
                                    setCurrentPage(1);
                                }}
                            >
                                <SelectTrigger className="w-36">
                                    <Filter className="h-4 w-4 mr-2" />
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Status
                                    </SelectItem>
                                    <SelectItem value="completed">
                                        Completed
                                    </SelectItem>
                                    <SelectItem value="processing">
                                        Processing
                                    </SelectItem>
                                    <SelectItem value="failed">
                                        Failed
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={filterType}
                                onValueChange={(value: FilterType) => {
                                    setFilterType(value);
                                    setCurrentPage(1);
                                }}
                            >
                                <SelectTrigger className="w-36">
                                    <FileType className="h-4 w-4 mr-2" />
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Types
                                    </SelectItem>
                                    <SelectItem value="pdf">PDF</SelectItem>
                                    <SelectItem value="word">Word</SelectItem>
                                    <SelectItem value="xml">XML</SelectItem>
                                    <SelectItem value="text">Text</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={filterOrganization}
                                onValueChange={(value: string) => {
                                    setFilterOrganization(value);
                                    setCurrentPage(1);
                                }}
                            >
                                <SelectTrigger className="w-48">
                                    <Building2 className="h-4 w-4 mr-2" />
                                    <SelectValue placeholder="Organization" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Documents
                                    </SelectItem>
                                    <SelectItem value="personal">
                                        Personal Only
                                    </SelectItem>
                                    {organizations?.map((org) => (
                                        <SelectItem key={org.id} value={org.id}>
                                            {org.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={`${sortField}-${sortOrder}`}
                                onValueChange={(value) => {
                                    const [field, order] = value.split("-") as [
                                        SortField,
                                        SortOrder
                                    ];
                                    setSortField(field);
                                    setSortOrder(order);
                                }}
                            >
                                <SelectTrigger className="w-44">
                                    <Calendar className="h-4 w-4 mr-2" />
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="createdAt-desc">
                                        Newest First
                                    </SelectItem>
                                    <SelectItem value="createdAt-asc">
                                        Oldest First
                                    </SelectItem>
                                    <SelectItem value="filename-asc">
                                        Name A-Z
                                    </SelectItem>
                                    <SelectItem value="filename-desc">
                                        Name Z-A
                                    </SelectItem>
                                    <SelectItem value="size-desc">
                                        Largest First
                                    </SelectItem>
                                    <SelectItem value="size-asc">
                                        Smallest First
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            {/* View toggle */}
                            <div className="flex items-center border rounded-lg p-1">
                                <button
                                    onClick={() => setViewMode("table")}
                                    className={`p-2 rounded ${
                                        viewMode === "table"
                                            ? "bg-slate-100 dark:bg-slate-700"
                                            : ""
                                    }`}
                                >
                                    <List className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode("grid")}
                                    className={`p-2 rounded ${
                                        viewMode === "grid"
                                            ? "bg-slate-100 dark:bg-slate-700"
                                            : ""
                                    }`}
                                >
                                    <Grid className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Bulk actions */}
                    {selectedIds.size > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center gap-4">
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                                {selectedIds.size} selected
                            </span>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleBulkDelete}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Selected
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedIds(new Set())}
                            >
                                Clear Selection
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Documents List */}
            {isLoading ? (
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-slate-500">
                            Loading documents...
                        </p>
                    </CardContent>
                </Card>
            ) : paginatedDocuments.length === 0 ? (
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                            <FileText className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
                            No documents found
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-4">
                            {searchQuery ||
                            filterStatus !== "all" ||
                            filterType !== "all"
                                ? "Try adjusting your filters"
                                : "Upload your first document to get started"}
                        </p>
                        {!searchQuery &&
                            filterStatus === "all" &&
                            filterType === "all" && (
                                <Link href="/dashboard/upload">
                                    <Button className="gradient-primary border-0">
                                        <Upload className="h-4 w-4 mr-2" />
                                        Upload Document
                                    </Button>
                                </Link>
                            )}
                    </CardContent>
                </Card>
            ) : viewMode === "table" ? (
                /* Table View */
                <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-800">
                                <tr>
                                    <th className="px-4 py-3 text-left">
                                        <Checkbox
                                            checked={
                                                selectedIds.size ===
                                                    paginatedDocuments.length &&
                                                paginatedDocuments.length > 0
                                            }
                                            onCheckedChange={handleSelectAll}
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Document
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Type
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Size
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {paginatedDocuments.map((doc) => (
                                    <tr
                                        key={doc.id}
                                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                                            selectedIds.has(doc.id)
                                                ? "bg-blue-50 dark:bg-blue-900/10"
                                                : ""
                                        }`}
                                    >
                                        <td className="px-4 py-3">
                                            <Checkbox
                                                checked={selectedIds.has(
                                                    doc.id
                                                )}
                                                onCheckedChange={() =>
                                                    handleSelect(doc.id)
                                                }
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold ${getFileTypeColor(
                                                        doc.mimeType
                                                    )}`}
                                                >
                                                    {getFileTypeIcon(
                                                        doc.mimeType
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-slate-800 dark:text-white truncate max-w-xs">
                                                            {doc.filename}
                                                        </p>
                                                        {getVisibilityIcon(
                                                            (doc as any)
                                                                .visibility,
                                                            (doc as any)
                                                                .organizationId
                                                        )}
                                                        {(doc as any)
                                                            .isShared && (
                                                            <div title="Shared with you">
                                                                <Share2 className="h-3 w-3 text-blue-500" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    {(doc as any)
                                                        .organizationId && (
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                                                            <Building2 className="h-3 w-3" />
                                                            {getOrganizationName(
                                                                (doc as any)
                                                                    .organizationId
                                                            )}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`px-2 py-1 rounded text-xs font-medium ${getFileTypeColor(
                                                    doc.mimeType
                                                )}`}
                                            >
                                                {getFileTypeIcon(doc.mimeType)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                                            {formatBytes(doc.size)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {getStatusBadge(
                                                doc.processingStatus
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                                            {formatDate(doc.createdAt)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        asChild
                                                    >
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                handleDownload(
                                                                    doc
                                                                )
                                                            }
                                                        >
                                                            <Download className="h-4 w-4 mr-2" />
                                                            Download
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                handleShare(
                                                                    doc.id
                                                                )
                                                            }
                                                        >
                                                            <Share2 className="h-4 w-4 mr-2" />
                                                            Share
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem>
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                handleDelete(
                                                                    doc.id
                                                                )
                                                            }
                                                            className="text-red-600"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : (
                /* Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {paginatedDocuments.map((doc) => (
                        <Card
                            key={doc.id}
                            className={`border-0 shadow-sm card-hover cursor-pointer ${
                                selectedIds.has(doc.id)
                                    ? "ring-2 ring-blue-500"
                                    : ""
                            }`}
                            onClick={() => handleSelect(doc.id)}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold ${getFileTypeColor(
                                                doc.mimeType
                                            )}`}
                                        >
                                            {getFileTypeIcon(doc.mimeType)}
                                        </div>
                                        {getVisibilityIcon(
                                            (doc as any).visibility,
                                            (doc as any).organizationId
                                        )}
                                        {(doc as any).isShared && (
                                            <div title="Shared with you">
                                                <Share2 className="h-3 w-3 text-blue-500" />
                                            </div>
                                        )}
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger
                                            asChild
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDownload(doc);
                                                }}
                                            >
                                                <Download className="h-4 w-4 mr-2" />
                                                Download
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleShare(doc.id);
                                                }}
                                            >
                                                <Share2 className="h-4 w-4 mr-2" />
                                                Share
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                <Eye className="h-4 w-4 mr-2" />
                                                View Details
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(doc.id);
                                                }}
                                                className="text-red-600"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <h3 className="font-medium text-slate-800 dark:text-white truncate mb-1">
                                    {doc.filename}
                                </h3>

                                {(doc as any).organizationId && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                                        <Building2 className="h-3 w-3" />
                                        {getOrganizationName(
                                            (doc as any).organizationId
                                        )}
                                    </p>
                                )}

                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">
                                        {formatBytes(doc.size)}
                                    </span>
                                    {getStatusBadge(doc.processingStatus)}
                                </div>

                                <p className="text-xs text-slate-400 mt-2">
                                    {formatDate(doc.createdAt)}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                        {Math.min(
                            currentPage * ITEMS_PER_PAGE,
                            filteredDocuments.length
                        )}{" "}
                        of {filteredDocuments.length} documents
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                setCurrentPage((p) => Math.max(1, p - 1))
                            }
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        {Array.from(
                            { length: totalPages },
                            (_, i) => i + 1
                        ).map((page) => (
                            <Button
                                key={page}
                                variant={
                                    currentPage === page ? "default" : "outline"
                                }
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                                className={
                                    currentPage === page
                                        ? "gradient-primary border-0"
                                        : ""
                                }
                            >
                                {page}
                            </Button>
                        ))}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                setCurrentPage((p) =>
                                    Math.min(totalPages, p + 1)
                                )
                            }
                            disabled={currentPage === totalPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteTarget
                                ? "Are you sure you want to delete this document? This action cannot be undone."
                                : `Are you sure you want to delete ${selectedIds.size} document(s)? This action cannot be undone.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Share Dialog */}
            <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Share Document</DialogTitle>
                        <DialogDescription>
                            Share this document with users, organizations, or
                            make it public
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        {/* Share Type Selection */}
                        <div className="space-y-2">
                            <Label>Share Type</Label>
                            <Select
                                value={shareType}
                                onValueChange={(
                                    value: "user" | "organization" | "public"
                                ) => {
                                    setShareType(value);
                                    setSelectedUserIds(new Set());
                                    setSelectedOrganizationIds(new Set());
                                    setShareUserQuery("");
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user">
                                        Specific Users
                                    </SelectItem>
                                    <SelectItem value="organization">
                                        Organizations
                                    </SelectItem>
                                    <SelectItem value="public">
                                        Public
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Permissions Selection */}
                        <div className="space-y-2">
                            <Label>Permissions</Label>
                            <div className="grid grid-cols-2 gap-2 p-3 rounded-lg border bg-slate-50 dark:bg-slate-800">
                                {Object.entries(permissionLabels).map(
                                    ([perm, label]) => (
                                        <div
                                            key={perm}
                                            className="flex items-center space-x-2"
                                        >
                                            <Checkbox
                                                id={`perm-${perm}`}
                                                checked={selectedPermissions.has(
                                                    perm
                                                )}
                                                onCheckedChange={() =>
                                                    togglePermission(perm)
                                                }
                                            />
                                            <Label
                                                htmlFor={`perm-${perm}`}
                                                className="text-sm font-normal cursor-pointer"
                                            >
                                                {label}
                                            </Label>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>

                        {/* Current Shares */}
                        {shareInfo && (
                            <div className="space-y-3">
                                {/* Shared Users */}
                                {shareInfo.sharedUsers &&
                                    shareInfo.sharedUsers.length > 0 && (
                                        <div className="space-y-2">
                                            <Label>Shared with Users</Label>
                                            <div className="space-y-2 max-h-32 overflow-y-auto">
                                                {shareInfo.sharedUsers.map(
                                                    (user) => (
                                                        <div
                                                            key={user.id}
                                                            className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800"
                                                        >
                                                            <div className="flex-1">
                                                                <p className="text-sm font-medium">
                                                                    {user.name}
                                                                </p>
                                                                <p className="text-xs text-slate-500">
                                                                    {user.email}
                                                                </p>
                                                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                                                    Permissions:{" "}
                                                                    {user.permissions.join(
                                                                        ", "
                                                                    )}
                                                                </p>
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() =>
                                                                    handleUnshare(
                                                                        "user",
                                                                        user.id
                                                                    )
                                                                }
                                                                className="text-red-600 hover:text-red-700"
                                                            >
                                                                <UserMinus className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    )}

                                {/* Shared Organizations */}
                                {shareInfo.sharedOrganizations &&
                                    shareInfo.sharedOrganizations.length >
                                        0 && (
                                        <div className="space-y-2">
                                            <Label>
                                                Shared with Organizations
                                            </Label>
                                            <div className="space-y-2 max-h-32 overflow-y-auto">
                                                {shareInfo.sharedOrganizations.map(
                                                    (org) => (
                                                        <div
                                                            key={org.id}
                                                            className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800"
                                                        >
                                                            <div className="flex-1">
                                                                <p className="text-sm font-medium">
                                                                    {org.name}
                                                                </p>
                                                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                                                    Permissions:{" "}
                                                                    {org.permissions.join(
                                                                        ", "
                                                                    )}
                                                                </p>
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() =>
                                                                    handleUnshare(
                                                                        "organization",
                                                                        org.id
                                                                    )
                                                                }
                                                                className="text-red-600 hover:text-red-700"
                                                            >
                                                                <UserMinus className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    )}

                                {/* Public Share */}
                                {shareInfo.publicShare &&
                                    shareInfo.publicShare.enabled && (
                                        <div className="space-y-2">
                                            <Label>Public Share</Label>
                                            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium">
                                                        Publicly accessible
                                                    </p>
                                                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                                        Permissions:{" "}
                                                        {shareInfo.publicShare.permissions.join(
                                                            ", "
                                                        )}
                                                    </p>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() =>
                                                        handleUnshare("public")
                                                    }
                                                    className="text-red-600 hover:text-red-700"
                                                >
                                                    <UserMinus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                            </div>
                        )}

                        {/* User Selection (when shareType === "user") */}
                        {shareType === "user" && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="user-search">
                                        Search users to share with
                                    </Label>
                                    <Input
                                        id="user-search"
                                        placeholder="Search by email or name..."
                                        value={shareUserQuery}
                                        onChange={(e) =>
                                            setShareUserQuery(e.target.value)
                                        }
                                    />
                                </div>

                                {users && users.length > 0 && (
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {users
                                            .filter(
                                                (user) =>
                                                    !shareInfo?.sharedUsers?.some(
                                                        (su) =>
                                                            su.id === user.id
                                                    )
                                            )
                                            .map((user) => (
                                                <div
                                                    key={user.id}
                                                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                                                        selectedUserIds.has(
                                                            user.id
                                                        )
                                                            ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                                                            : "bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
                                                    }`}
                                                    onClick={() =>
                                                        toggleUserSelection(
                                                            user.id
                                                        )
                                                    }
                                                >
                                                    <div>
                                                        <p className="text-sm font-medium">
                                                            {user.name}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            {user.email}
                                                        </p>
                                                    </div>
                                                    {selectedUserIds.has(
                                                        user.id
                                                    ) && (
                                                        <CheckCircle className="h-5 w-5 text-blue-600" />
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                )}

                                {users &&
                                    users.length === 0 &&
                                    shareUserQuery && (
                                        <p className="text-sm text-slate-500 text-center py-4">
                                            No users found
                                        </p>
                                    )}

                                {!shareUserQuery &&
                                    (!users || users.length === 0) && (
                                        <p className="text-sm text-slate-500 text-center py-4">
                                            Type to search for users
                                        </p>
                                    )}
                            </>
                        )}

                        {/* Organization Selection (when shareType === "organization") */}
                        {shareType === "organization" && (
                            <div className="space-y-2">
                                <Label>Select Organizations</Label>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {organizations
                                        ?.filter(
                                            (org) =>
                                                !shareInfo?.sharedOrganizations?.some(
                                                    (so) => so.id === org.id
                                                )
                                        )
                                        .map((org) => (
                                            <div
                                                key={org.id}
                                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                                                    selectedOrganizationIds.has(
                                                        org.id
                                                    )
                                                        ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                                                        : "bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
                                                }`}
                                                onClick={() =>
                                                    toggleOrganizationSelection(
                                                        org.id
                                                    )
                                                }
                                            >
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {org.name}
                                                    </p>
                                                </div>
                                                {selectedOrganizationIds.has(
                                                    org.id
                                                ) && (
                                                    <CheckCircle className="h-5 w-5 text-blue-600" />
                                                )}
                                            </div>
                                        ))}
                                </div>
                                {(!organizations ||
                                    organizations.length === 0) && (
                                    <p className="text-sm text-slate-500 text-center py-4">
                                        No organizations available
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Public Share Info */}
                        {shareType === "public" && (
                            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                    <strong>Warning:</strong> Making this
                                    document public will allow anyone with the
                                    link to access it with the selected
                                    permissions.
                                </p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShareDialogOpen(false);
                                setSelectedUserIds(new Set());
                                setSelectedOrganizationIds(new Set());
                                setShareUserQuery("");
                                setSelectedPermissions(new Set(["read"]));
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleShareConfirm}
                            disabled={
                                (shareType === "user" &&
                                    selectedUserIds.size === 0) ||
                                (shareType === "organization" &&
                                    selectedOrganizationIds.size === 0) ||
                                selectedPermissions.size === 0 ||
                                shareMutation.isPending
                            }
                            className="gradient-primary border-0"
                        >
                            {shareMutation.isPending
                                ? "Sharing..."
                                : shareType === "user"
                                ? `Share with ${selectedUserIds.size} user(s)`
                                : shareType === "organization"
                                ? `Share with ${selectedOrganizationIds.size} organization(s)`
                                : "Make Public"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
