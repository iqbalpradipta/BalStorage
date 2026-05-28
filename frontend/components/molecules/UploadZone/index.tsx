"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, Loader2, FileIcon, ImageIcon, CheckCircle, HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { customToast } from "@/lib/toast";

interface UploadZoneProps {
  onUpload: (files: File[]) => Promise<void>;
  disabled?: boolean;
}

export function UploadZone({ onUpload, disabled = false }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: File[]) => {
    // Filter out files that exceed 25MB (Discord attachment standard limit)
    const validFiles = files.filter((file) => {
      const sizeInMB = file.size / (1024 * 1024);
      if (sizeInMB > 25) {
        customToast.warning("File Too Large", `File "${file.name}" exceeds the 25MB Discord cloud limit and was skipped.`);
        return false;
      }
      return true;
    });
    setSelectedFiles((prev) => [...prev, ...validFiles]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedFiles([]);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles, disabled],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      addFiles(Array.from(e.target.files || []));
      if (inputRef.current) inputRef.current.value = "";
    },
    [addFiles],
  );

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    try {
      await onUpload(selectedFiles);
      setSelectedFiles([]);
    } finally {
      setUploading(false);
    }
  };

  const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="space-y-4">
      {/* Drag & Drop Pad */}
      <div
        className={cn(
          "relative rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 bg-card/40 backdrop-blur-sm shadow-inner cursor-pointer",
          isDragging && "border-primary bg-primary/5 scale-[0.99] shadow-lg shadow-primary/5",
          !isDragging && "border-border/80 hover:border-primary/45 hover:bg-card/60",
          disabled && "pointer-events-none opacity-50",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">
                Uploading {selectedFiles.length} file(s)
              </p>
              <p className="text-xs text-muted-foreground">
                Routing attachments through Discord gateway...
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-primary/10 to-primary/5 text-primary mb-3 shadow-sm group-hover:scale-105 transition-transform duration-300">
              <Upload className="h-6 w-6 text-primary animate-pulse" />
            </div>
            <p className="text-sm font-bold text-foreground">
              Drag & drop your files here, or{" "}
              <span className="text-primary hover:underline font-semibold cursor-pointer">
                browse files
              </span>
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1">
              <HardDrive className="h-3 w-3" /> Max 25MB per file (Discord Attachment Limit)
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={disabled}
            />
          </div>
        )}
      </div>

      {/* Selected Files Card Drawer */}
      {selectedFiles.length > 0 && !uploading && (
        <div className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-xl animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between border-b border-border/30 bg-muted/20 px-5 py-3">
            <span className="text-xs font-bold text-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span>{selectedFiles.length} file(s) ready</span>
              <span className="text-muted-foreground font-medium">•</span>
              <span className="text-muted-foreground font-semibold">{(totalSize / (1024 * 1024)).toFixed(1)} MB total</span>
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  clearSelection();
                }}
                className="h-8 rounded-lg text-xs hover:bg-muted font-medium cursor-pointer"
              >
                Clear Selection
              </Button>
              <Button 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpload();
                }}
                className="h-8 rounded-lg text-xs bg-linear-to-r from-primary to-primary/95 shadow-md shadow-primary/10 hover:shadow-primary/25 cursor-pointer font-bold"
              >
                Upload All Files
              </Button>
            </div>
          </div>
          
          <div className="max-h-48 overflow-y-auto divide-y divide-border/25">
            {selectedFiles.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/15 transition-colors"
                onClick={(e) => e.stopPropagation()} // Prevent trigger dropzone click
              >
                {file.type.startsWith("image/") ? (
                  <ImageIcon className="h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                  {file.name}
                </span>
                <span className="shrink-0 text-[10px] font-bold text-muted-foreground bg-muted/65 px-2 py-0.5 rounded-full">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="shrink-0 text-muted-foreground hover:text-rose-500 rounded-md p-1 hover:bg-muted transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
