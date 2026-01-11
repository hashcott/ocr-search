'use client';

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  Search,
  Download,
  Trash2,
  MoreVertical,
  Filter,
  Grid,
  List,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Upload,
  ChevronLeft,
  ChevronRight,
  Building2,
  Lock,
  Globe,
  Users,
  Loader2,
  Eye,
} from 'lucide-react';
import { FilePreviewDialog } from '@/components/ui/file-preview-dialog';
import { useToast } from '@/hooks/use-toast';
import { formatDate, formatBytes } from '@/lib/utils';
import Link from 'next/link';

type ViewMode = 'table' | 'grid';
type FilterStatus = 'all' | 'completed' | 'processing' | 'failed';
type FilterType = 'all' | 'pdf' | 'word' | 'xml' | 'text';

const ITEMS_PER_PAGE = 10;

export default function DocumentsPage() {
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterOrganization, setFilterOrganization] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    id: string;
    filename: string;
    mimeType: string;
  } | null>(null);

  const handlePreview = (doc: { id: string; filename: string; mimeType: string }) => {
    setPreviewFile(doc);
    setPreviewOpen(true);
  };

  const { data: documents, isLoading, refetch } = trpc.document.list.useQuery();
  const { data: organizations } = trpc.organization.list.useQuery();

  const deleteMutation = trpc.document.delete.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Document deleted successfully',
      });
      refetch();
      setSelectedIds(new Set());
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const filteredDocuments = useMemo(() => {
    if (!documents) return [];

    let result = [...documents];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((doc) => doc.filename.toLowerCase().includes(query));
    }

    if (filterStatus !== 'all') {
      result = result.filter((doc) => doc.processingStatus === filterStatus);
    }

    if (filterType !== 'all') {
      const typeMap: Record<string, string[]> = {
        pdf: ['application/pdf'],
        word: [
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        xml: ['application/xml', 'text/xml'],
        text: ['text/plain'],
      };
      result = result.filter((doc) => typeMap[filterType]?.includes(doc.mimeType));
    }

    if (filterOrganization !== 'all') {
      if (filterOrganization === 'personal') {
        result = result.filter((doc) => !doc.organizationId);
      } else {
        result = result.filter((doc) => doc.organizationId === filterOrganization);
      }
    }

    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return result;
  }, [documents, searchQuery, filterStatus, filterType, filterOrganization]);

  const totalPages = Math.ceil(filteredDocuments.length / ITEMS_PER_PAGE);
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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

  const handleBulkDelete = () => {
    setDeleteTarget(null);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteTarget) {
      await deleteMutation.mutateAsync({ id: deleteTarget });
    } else {
      for (const id of selectedIds) {
        await deleteMutation.mutateAsync({ id });
      }
    }
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  const handleDownload = async (doc: { id: string; filename: string }) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({
          title: 'Error',
          description: 'Please login again',
          variant: 'destructive',
        });
        return;
      }

      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';

      const response = await fetch(`${serverUrl}/api/files/${doc.id}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: 'Success', description: 'Download started' });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to download file',
        variant: 'destructive',
      });
    }
  };

  const getFileType = (mimeType: string) => {
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'DOC';
    if (mimeType.includes('xml')) return 'XML';
    if (mimeType.includes('text')) return 'TXT';
    return 'FILE';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="bg-chart-2/10 text-chart-2 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium">
            <CheckCircle className="h-3 w-3" />
            Completed
          </span>
        );
      case 'processing':
        return (
          <span className="bg-chart-4/10 text-chart-4 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing
          </span>
        );
      case 'failed':
        return (
          <span className="bg-destructive/10 text-destructive inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium">
            <AlertCircle className="h-3 w-3" />
            Failed
          </span>
        );
      default:
        return (
          <span className="bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium">
            {status}
          </span>
        );
    }
  };

  const getVisibilityIcon = (visibility?: string, organizationId?: string) => {
    if (!organizationId) {
      return (
        <span title="Personal">
          <Lock className="text-muted-foreground h-3 w-3" />
        </span>
      );
    }
    switch (visibility) {
      case 'private':
        return (
          <span title="Private">
            <Lock className="text-destructive h-3 w-3" />
          </span>
        );
      case 'organization':
        return (
          <span title="Organization">
            <Users className="text-primary h-3 w-3" />
          </span>
        );
      case 'public':
        return (
          <span title="Public">
            <Globe className="text-chart-2 h-3 w-3" />
          </span>
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
    <div className="custom-scrollbar mx-auto h-full max-w-[1400px] space-y-6 overflow-y-auto p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your uploaded files and their processing status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="h-9 rounded-lg"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/dashboard/upload">
            <Button size="sm" className="bg-primary h-9 rounded-lg">
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-accent border-border h-10 rounded-lg pl-10"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={filterStatus}
                onValueChange={(value: FilterStatus) => {
                  setFilterStatus(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="bg-accent border-border h-10 w-36 rounded-lg">
                  <Filter className="text-muted-foreground mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border rounded-lg">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filterType}
                onValueChange={(value: FilterType) => {
                  setFilterType(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="bg-accent border-border h-10 w-32 rounded-lg">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border rounded-lg">
                  <SelectItem value="all">All Types</SelectItem>
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
                <SelectTrigger className="bg-accent border-border h-10 w-40 rounded-lg">
                  <Building2 className="text-muted-foreground mr-2 h-4 w-4" />
                  <SelectValue placeholder="Organization" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border rounded-lg">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  {organizations?.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="bg-accent border-border flex items-center rounded-lg border p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`rounded p-2 ${viewMode === 'table' ? 'bg-background shadow-sm' : ''}`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`rounded p-2 ${viewMode === 'grid' ? 'bg-background shadow-sm' : ''}`}
                >
                  <Grid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {selectedIds.size > 0 && (
            <div className="border-border mt-4 flex items-center justify-between border-t pt-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{selectedIds.size} selected</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                  className="h-8"
                >
                  Clear
                </Button>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                className="h-8 rounded-lg"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      {isLoading ? (
        <Card className="bg-card border-border">
          <CardContent className="p-12 text-center">
            <Loader2 className="text-primary mx-auto mb-3 h-8 w-8 animate-spin" />
            <p className="text-muted-foreground text-sm">Loading documents...</p>
          </CardContent>
        </Card>
      ) : paginatedDocuments.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-12 text-center">
            <div className="bg-accent mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg">
              <FileText className="text-muted-foreground h-6 w-6" />
            </div>
            <h3 className="mb-1 font-medium">No documents found</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              {searchQuery || filterStatus !== 'all' || filterType !== 'all'
                ? 'Try adjusting your filters.'
                : 'Upload your first document to get started.'}
            </p>
            {!searchQuery && filterStatus === 'all' && filterType === 'all' && (
              <Link href="/dashboard/upload">
                <Button className="rounded-lg">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        <Card className="bg-card border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-border bg-accent border-b">
                  <th className="w-10 px-4 py-3 text-left">
                    <Checkbox
                      checked={
                        selectedIds.size === paginatedDocuments.length &&
                        paginatedDocuments.length > 0
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium uppercase">
                    Name
                  </th>
                  <th className="text-muted-foreground hidden px-4 py-3 text-left text-xs font-medium uppercase sm:table-cell">
                    Type
                  </th>
                  <th className="text-muted-foreground hidden px-4 py-3 text-left text-xs font-medium uppercase md:table-cell">
                    Size
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium uppercase">
                    Status
                  </th>
                  <th className="text-muted-foreground hidden px-4 py-3 text-left text-xs font-medium uppercase lg:table-cell">
                    Date
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-right text-xs font-medium uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {paginatedDocuments.map((doc) => (
                  <tr
                    key={doc.id}
                    className={`hover:bg-accent group transition-colors ${
                      selectedIds.has(doc.id) ? 'bg-primary/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedIds.has(doc.id)}
                        onCheckedChange={() => handleSelect(doc.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-accent flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg">
                          <FileText className="text-muted-foreground h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="max-w-[200px] truncate text-sm font-medium">
                              {doc.filename}
                            </p>
                            {getVisibilityIcon(
                              (doc as { visibility?: string }).visibility,
                              (doc as { organizationId?: string }).organizationId
                            )}
                          </div>
                          {(doc as { organizationId?: string }).organizationId && (
                            <p className="text-muted-foreground mt-0.5 text-xs">
                              {getOrganizationName(
                                (doc as { organizationId?: string }).organizationId
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span className="bg-accent rounded px-2 py-0.5 text-xs font-medium">
                        {getFileType(doc.mimeType)}
                      </span>
                    </td>
                    <td className="text-muted-foreground hidden px-4 py-3 text-sm md:table-cell">
                      {formatBytes(doc.size)}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(doc.processingStatus)}</td>
                    <td className="text-muted-foreground hidden px-4 py-3 text-sm lg:table-cell">
                      {formatDate(doc.createdAt)}
                    </td>
<td className="px-4 py-3">
                                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handlePreview(doc)}
                                          className="h-8 w-8 rounded-lg"
                                          title="Preview"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleDownload(doc)}
                                          className="h-8 w-8 rounded-lg"
                                          title="Download"
                                        >
                                          <Download className="h-4 w-4" />
                                        </Button>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                              <MoreVertical className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent
                                            align="end"
                                            className="bg-card border-border rounded-lg"
                                          >
                                            <DropdownMenuItem
                                              onClick={() => handlePreview(doc)}
                                              className="rounded"
                                            >
                                              <Eye className="mr-2 h-4 w-4" />
                                              Preview
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={() => handleDownload(doc)}
                                              className="rounded"
                                            >
                                              <Download className="mr-2 h-4 w-4" />
                                              Download
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator className="bg-border" />
                                            <DropdownMenuItem
                                              onClick={() => handleDelete(doc.id)}
                                              className="text-destructive focus:text-destructive rounded"
                                            >
                                              <Trash2 className="mr-2 h-4 w-4" />
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paginatedDocuments.map((doc) => (
            <Card
              key={doc.id}
              className={`bg-card border-border hover:border-primary/30 cursor-pointer transition-colors ${
                selectedIds.has(doc.id) ? 'ring-primary ring-1' : ''
              }`}
              onClick={() => handleSelect(doc.id)}
            >
              <CardContent className="p-4">
                <div className="mb-3 flex items-start justify-between">
                  <div className="bg-accent flex h-10 w-10 items-center justify-center rounded-lg">
                    <FileText className="text-muted-foreground h-5 w-5" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
<DropdownMenuContent align="end" className="bg-card border-border rounded-lg">
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handlePreview(doc);
                                        }}
                                        className="rounded"
                                      >
                                        <Eye className="mr-2 h-4 w-4" />
                                        Preview
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDownload(doc);
                                        }}
                                        className="rounded"
                                      >
                                        <Download className="mr-2 h-4 w-4" />
                                        Download
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator className="bg-border" />
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDelete(doc.id);
                                        }}
                                        className="text-destructive focus:text-destructive rounded"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <h3 className="mb-1 truncate text-sm font-medium">{doc.filename}</h3>
                <p className="text-muted-foreground mb-3 text-xs">{formatBytes(doc.size)}</p>

                <div className="flex items-center justify-between">
                  {getStatusBadge(doc.processingStatus)}
                  <span className="text-muted-foreground text-xs">{formatDate(doc.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredDocuments.length)} of{' '}
            {filteredDocuments.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 rounded-lg"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className="h-8 w-8 rounded-lg"
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 rounded-lg"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? 'This document will be permanently deleted. This action cannot be undone.'
                : `Are you sure you want to delete ${selectedIds.size} document(s)?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* File Preview Dialog */}
      <FilePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        file={previewFile}
      />
    </div>
  );
}
