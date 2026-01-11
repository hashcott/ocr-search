'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Download,
  FileText,
  Image as ImageIcon,
  File,
  Loader2,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/lib/stores';

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: {
    id: string;
    filename: string;
    mimeType: string;
  } | null;
}

export function FilePreviewDialog({ open, onOpenChange, file }: FilePreviewDialogProps) {
  const { toast } = useToast();
  const token = useAuthStore((state) => state.token);
  const [isLoading, setIsLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (open && file && token) {
      setIsLoading(true);
      setPreviewUrl(null);
      setTextContent(null);
      setZoom(100);
      setRotation(0);
      loadPreview();
    }

    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, file?.id, token]);

  const loadPreview = async () => {
    if (!file) return;

    try {
      if (!token) {
        toast({ title: 'Error', description: 'Please login again', variant: 'destructive' });
        return;
      }

      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';
      const response = await fetch(`${serverUrl}/api/files/${file.id}/preview`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load preview');

      const blob = await response.blob();

      // Handle text files specially
      if (file.mimeType.startsWith('text/') || file.mimeType === 'application/xml') {
        const text = await blob.text();
        setTextContent(text);
      } else {
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      }
    } catch (error) {
      console.error('Preview error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load file preview',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!file) return;

    try {
      if (!token) {
        toast({ title: 'Error', description: 'Please login again', variant: 'destructive' });
        return;
      }

      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';
      const response = await fetch(`${serverUrl}/api/files/${file.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: 'Success', description: 'Download started' });
    } catch {
      toast({ title: 'Error', description: 'Failed to download file', variant: 'destructive' });
    }
  };

  const openInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  const getFileIcon = () => {
    if (!file) return <File className="h-12 w-12" />;

    if (file.mimeType.startsWith('image/')) {
      return <ImageIcon className="h-12 w-12 text-chart-1" />;
    }
    if (file.mimeType === 'application/pdf') {
      return <FileText className="h-12 w-12 text-destructive" />;
    }
    return <FileText className="h-12 w-12 text-primary" />;
  };

  const isPdf = file?.mimeType === 'application/pdf';
  const isImage = file?.mimeType.startsWith('image/');
  const isText =
    file?.mimeType.startsWith('text/') ||
    file?.mimeType === 'application/xml' ||
    file?.mimeType === 'application/json';

  const canPreview = isPdf || isImage || isText;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border flex h-[90vh] max-h-[900px] w-[95vw] max-w-6xl flex-col gap-0 overflow-hidden rounded-xl p-0">
        {/* Header */}
        <DialogHeader className="border-border flex-shrink-0 border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-accent flex h-10 w-10 items-center justify-center rounded-lg">
                {getFileIcon()}
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">
                  {file?.filename || 'File Preview'}
                </DialogTitle>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {file?.mimeType || 'Unknown type'}
                </p>
              </div>
            </div>

            <div className="mr-8 flex items-center gap-2">
              {/* Zoom controls for images */}
              {isImage && previewUrl && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => setZoom((z) => Math.max(25, z - 25))}
                    title="Zoom out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-muted-foreground min-w-[3rem] text-center text-xs">
                    {zoom}%
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => setZoom((z) => Math.min(200, z + 25))}
                    title="Zoom in"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    title="Rotate"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <div className="bg-border mx-2 h-6 w-px" />
                </>
              )}

              {(isPdf || isImage) && previewUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg"
                  onClick={openInNewTab}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in New Tab
                </Button>
              )}
              <Button variant="outline" size="sm" className="h-8 rounded-lg" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Preview Content */}
        <div className="bg-accent/30 relative flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <Loader2 className="text-primary h-8 w-8 animate-spin" />
              <p className="text-muted-foreground text-sm">Loading preview...</p>
            </div>
          ) : !canPreview ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
              <div className="bg-accent flex h-20 w-20 items-center justify-center rounded-xl">
                {getFileIcon()}
              </div>
              <div>
                <h3 className="mb-1 text-lg font-medium">Preview not available</h3>
                <p className="text-muted-foreground max-w-sm text-sm">
                  This file type cannot be previewed in the browser. Click download to view it
                  locally.
                </p>
              </div>
              <Button onClick={handleDownload} className="bg-primary mt-2 rounded-lg">
                <Download className="mr-2 h-4 w-4" />
                Download File
              </Button>
            </div>
          ) : isPdf && previewUrl ? (
            <iframe
              src={previewUrl}
              className="h-full w-full border-0"
              title={file?.filename || 'PDF Preview'}
            />
          ) : isImage && previewUrl ? (
            <div className="flex h-full items-center justify-center overflow-auto p-4">
              <img
                src={previewUrl}
                alt={file?.filename || 'Image Preview'}
                className="max-h-full max-w-full object-contain transition-transform duration-200"
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                }}
              />
            </div>
          ) : isText && textContent !== null ? (
            <div className="custom-scrollbar h-full overflow-auto p-6">
              <pre className="bg-card border-border whitespace-pre-wrap rounded-lg border p-4 font-mono text-sm">
                {textContent}
              </pre>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
              <div className="bg-accent flex h-20 w-20 items-center justify-center rounded-xl">
                {getFileIcon()}
              </div>
              <div>
                <h3 className="mb-1 text-lg font-medium">Failed to load preview</h3>
                <p className="text-muted-foreground max-w-sm text-sm">
                  Unable to display the file. Try downloading it instead.
                </p>
              </div>
              <Button onClick={handleDownload} className="bg-primary mt-2 rounded-lg">
                <Download className="mr-2 h-4 w-4" />
                Download File
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
