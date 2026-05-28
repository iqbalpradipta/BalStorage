"use client";

import { Folder, MoreVertical, Trash2, Pencil, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FolderCardProps {
  name: string;
  fileCount?: number;
  onClick: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export function FolderCard({
  name,
  fileCount = 0,
  onClick,
  onRename,
  onDelete,
}: FolderCardProps) {
  return (
    <div
      className="group relative flex cursor-pointer flex-col rounded-2xl border border-border/40 bg-card/60 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg hover:border-primary/20 hover:bg-card/90"
      onClick={onClick}
    >
      {/* Context Menu Dropdown */}
      <div className="absolute right-3 top-3 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 bg-background/50 hover:bg-background border border-border/10 transition-opacity"
            >
              <MoreVertical className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl shadow-xl p-1 border border-border/40 bg-card/95 backdrop-blur-md">
            <DropdownMenuItem
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-foreground hover:bg-muted cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onRename();
              }}
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              Rename Folder
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer font-medium"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Card Content */}
      <div className="flex flex-col items-center gap-4 text-center">
        {/* Folder Icon Wrapper */}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-primary/10 to-primary/5 text-primary group-hover:scale-110 transition-transform duration-300 shadow-inner">
          <Folder className="h-8 w-8 text-primary group-hover:fill-primary/5 transition-colors" />
        </div>

        {/* Text Info */}
        <div className="space-y-1 w-full">
          <p className="text-sm font-semibold truncate text-foreground px-1" title={name}>
            {name}
          </p>
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary/45" />
            <span>
              {fileCount} {fileCount === 1 ? "file" : "files"}
            </span>
          </div>
        </div>
      </div>
      
      {/* Floating Go Indicator */}
      <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full shadow-md shadow-primary/20">
          EXPLORE <ExternalLink className="h-2 w-2" />
        </div>
      </div>
    </div>
  );
}
