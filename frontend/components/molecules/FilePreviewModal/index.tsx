"use client";

import { X, Download, FileText, Image as ImageIcon, Video, Music, Code, FileSpreadsheet, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilePreviewModalProps {
  open: boolean;
  onClose: () => void;
  name: string;
  mimeType: string;
  attachmentUrl: string;
  size: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  const mime = mimeType.toLowerCase();
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime.startsWith("video/")) return Video;
  if (mime.startsWith("audio/")) return Music;
  if (mime.includes("pdf") || mime.includes("document") || mime.includes("word")) return FileText;
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv")) return FileSpreadsheet;
  if (mime.includes("json") || mime.includes("javascript") || mime.includes("typescript") || mime.includes("html") || mime.includes("css")) return Code;
  return FileText;
}

export function FilePreviewModal({
  open,
  onClose,
  name,
  mimeType,
  attachmentUrl,
  size,
}: FilePreviewModalProps) {
  if (!open) return null;

  const mime = mimeType.toLowerCase();
  const isImage = mime.startsWith("image/");
  const isVideo = mime.startsWith("video/");
  const isAudio = mime.startsWith("audio/");
  const FileIconComponent = getFileIcon(mimeType);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-300" 
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl bg-card border border-border/40 p-5 shadow-2xl overflow-hidden flex flex-col justify-between animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Options */}
        <div className="mb-4 flex items-center justify-between border-b border-border/30 pb-3">
          <div className="min-w-0 flex-1 pr-4">
            <h3 className="text-sm font-bold truncate text-foreground flex items-center gap-2">
              <FileIconComponent className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">{name}</span>
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">
              {formatSize(size)} • {mimeType}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(attachmentUrl, "_blank")}
              className="h-8 rounded-lg text-xs font-semibold hover:bg-muted cursor-pointer"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Download
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="h-8 w-8 rounded-lg hover:bg-muted cursor-pointer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Media Content Preview Dashboard */}
        <div className="flex-1 flex max-h-[70vh] items-center justify-center overflow-hidden rounded-xl bg-muted/20 border border-border/30 p-2">
          {isImage ? (
            <img
              src={attachmentUrl}
              alt={name}
              className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-md"
            />
          ) : isVideo ? (
            <video 
              src={attachmentUrl} 
              controls 
              className="max-h-[65vh] max-w-full rounded-lg shadow-md"
              autoPlay
            />
          ) : isAudio ? (
            <div className="flex flex-col items-center gap-4 p-8 w-full max-w-md text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-inner">
                <Music className="h-10 w-10 text-primary animate-pulse" />
              </div>
              <div className="space-y-1 w-full">
                <p className="text-sm font-bold text-foreground truncate px-4">{name}</p>
                <p className="text-xs text-muted-foreground">Audio Stream Player</p>
              </div>
              
              <audio 
                src={attachmentUrl} 
                controls 
                className="w-full mt-2" 
                autoPlay
              />
            </div>
          ) : (
            // Non-previewable Document dashboard
            <div className="flex flex-col items-center gap-5 p-12 text-center max-w-md">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground border border-border/35 shadow-inner">
                <FileIconComponent className="h-8 w-8 text-muted-foreground/80" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-bold text-foreground truncate max-w-xs">{name}</p>
                <p className="text-xs text-muted-foreground">
                  This file format is not supported for inline browser previews. Please download the file to inspect its content.
                </p>
              </div>
              <Button 
                onClick={() => window.open(attachmentUrl, "_blank")}
                className="rounded-xl h-10 bg-linear-to-r from-primary to-primary/90 shadow-md shadow-primary/10 hover:shadow-primary/25 cursor-pointer font-semibold text-xs px-6"
              >
                <Download className="mr-2 h-4 w-4" /> Download File
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
