"use client";

import { FileText, Image as ImageIcon, Video, Music, Code, FileSpreadsheet, Download, Trash2, Eye, ExternalLink, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FileCardProps {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  attachmentUrl: string;
  onClick: () => void;
  onDelete: () => void;
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

export function FileCard({
  name,
  mimeType,
  size,
  attachmentUrl,
  onClick,
  onDelete,
}: FileCardProps) {
  const isImage = mimeType.toLowerCase().startsWith("image/");
  const FileIconComponent = getFileIcon(mimeType);

  return (
    <div
      className="group relative flex cursor-pointer flex-col rounded-2xl border border-border/40 bg-card/60 shadow-sm overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary/20"
      onClick={onClick}
    >
      {/* Dynamic Action Buttons Overlay (Appear on Hover - Desktop Only) */}
      <div className="absolute inset-0 z-10 hidden md:flex items-center justify-center gap-2.5 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[1px]">
        <Button
          size="icon"
          className="h-9 w-9 rounded-xl bg-background/95 hover:bg-background text-foreground shadow-md hover:scale-105 transition-transform cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onClick(); // Opens preview modal
          }}
          title="Preview File"
        >
          <Eye className="h-4.5 w-4.5" />
        </Button>
        
        <Button
          size="icon"
          className="h-9 w-9 rounded-xl bg-background/95 hover:bg-background text-primary shadow-md hover:scale-105 transition-transform cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            window.open(attachmentUrl, "_blank");
          }}
          title="Download File"
        >
          <Download className="h-4.5 w-4.5" />
        </Button>

        <Button
          size="icon"
          className="h-9 w-9 rounded-xl bg-rose-500 hover:bg-rose-600 text-rose-50 shadow-md hover:scale-105 transition-transform cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete File"
        >
          <Trash2 className="h-4.5 w-4.5" />
        </Button>
      </div>

      {/* Visual Thumbnail Area */}
      <div className="flex aspect-square items-center justify-center overflow-hidden bg-muted/30 border-b border-border/30 relative">
        {isImage ? (
          <img
            src={attachmentUrl}
            alt={name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:scale-105 transition-transform duration-300">
            <div className="p-4 rounded-2xl bg-muted/60 text-muted-foreground">
              <FileIconComponent className="h-10 w-10 text-muted-foreground/80" />
            </div>
          </div>
        )}
        
        {/* Attachment badge */}
        <div className="absolute left-2.5 top-2.5 bg-background/70 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] font-bold text-muted-foreground uppercase border border-border/10 tracking-wider">
          {mimeType.split("/")[0]}
        </div>

        {/* Dropdown Options for Mobile/Tablet/TV (And secondary Desktop access) */}
        <div className="absolute right-2.5 top-2.5 z-20">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 bg-background/70 backdrop-blur-xs hover:bg-background border border-border/10 transition-opacity cursor-pointer flex items-center justify-center animate-in fade-in duration-200"
              >
                <MoreVertical className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl shadow-xl p-1 border border-border/40 bg-card/95 backdrop-blur-md">
              <DropdownMenuItem
                className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground hover:bg-muted cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick(); // Opens preview modal
                }}
              >
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                Preview File
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground hover:bg-muted cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(attachmentUrl, "_blank");
                }}
              >
                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                Download File
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete File
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Info Details Area */}
      <div className="p-3.5 space-y-1">
        <p className="text-xs font-semibold truncate text-foreground leading-snug" title={name}>
          {name}
        </p>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
          <span>{formatSize(size)}</span>
          <span className="capitalize">{mimeType.split("/")[1]?.split("-")[0] || "Unknown"}</span>
        </div>
      </div>
    </div>
  );
}
