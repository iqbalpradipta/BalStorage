"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, FolderOpen, HardDrive, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderCard } from "@/components/molecules/FolderCard";
import { CreateFolderModal } from "@/components/molecules/CreateFolderModal";
import { ConfirmModal } from "@/components/molecules/ConfirmModal";
import { PromptModal } from "@/components/molecules/PromptModal";
import { folderService } from "@/services/folder";
import { fileService } from "@/services/file";
import { customToast } from "@/lib/toast";

interface Folder {
  id: string;
  name: string;
  file_count?: number;
}

export default function StoragePage() {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Custom modal states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [renamePromptOpen, setRenamePromptOpen] = useState(false);
  const [folderToRename, setFolderToRename] = useState<Folder | null>(null);

  const fetchFolders = useCallback(async () => {
    setLoading(true);
    try {
      const result = await folderService.list();
      if (result.success) {
        setFolders(result.data || []);
      } else {
        customToast.error("Failed to Load", result.error || "Could not retrieve folder listing.");
      }
    } catch (err: any) {
      customToast.error("Error", err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const handleCreate = async (name: string) => {
    const result = await folderService.create(name);
    if (result.success) {
      customToast.success("Folder Created", `"${name}" was created on the Discord cloud repository.`);
      fetchFolders();
    } else {
      customToast.error("Failed to Create", result.error || "Could not complete folder registration.");
    }
  };

  const triggerDelete = (folder: Folder) => {
    setFolderToDelete(folder);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!folderToDelete) return;
    const result = await folderService.remove(folderToDelete.id);
    if (result.success) {
      customToast.success("Folder Deleted", `"${folderToDelete.name}" and all its contents were removed.`);
      fetchFolders();
    } else {
      customToast.error("Failed to Delete", result.error || "Failed to remove the folder from cloud.");
    }
  };

  const triggerRename = (folder: Folder) => {
    setFolderToRename(folder);
    setRenamePromptOpen(true);
  };

  const handleRenameSubmit = async (newName: string) => {
    if (!folderToRename) return;
    if (newName.trim() === "" || newName.trim() === folderToRename.name) return;
    const result = await folderService.update(folderToRename.id, newName.trim());
    if (result.success) {
      customToast.success("Folder Renamed", `Renamed to "${newName.trim()}" successfully.`);
      fetchFolders();
    } else {
      customToast.error("Failed to Rename", result.error || "Failed to save renaming changes.");
    }
  };

  // Filter folders by search query
  const filteredFolders = folders.filter((folder) =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-linear-to-r from-primary to-primary/80 bg-clip-text">
            Cloud Directories
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Isolate and organize your discord storage spaces in virtual folder channels
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFolders}
            disabled={loading}
            className="rounded-xl h-9 hover:bg-muted/50 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button 
            onClick={() => setCreateModalOpen(true)}
            className="rounded-xl h-9 bg-linear-to-r from-primary to-primary/95 shadow-md shadow-primary/10 hover:shadow-primary/25 cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Folder
          </Button>
        </div>
      </div>

      {/* Search & Statistics Summary */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border/40">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search folders by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-background/50 border-border/60 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-sm w-full"
          />
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground shrink-0">
          <div className="flex items-center gap-1.5">
            <FolderOpen className="h-4 w-4 text-primary" />
            <span>{folders.length} Folders</span>
          </div>
          <span className="h-3 w-px bg-border/40" />
          <div className="flex items-center gap-1.5">
            <HardDrive className="h-4 w-4 text-secondary" />
            <span>
              {folders.reduce((acc, curr) => acc + (curr.file_count || 0), 0)} Aggregated Files
            </span>
          </div>
        </div>
      </div>

      {/* Directory Content */}
      {loading ? (
        // Grid Loading States
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-[160px] animate-pulse rounded-2xl bg-card border border-border/20"
            />
          ))}
        </div>
      ) : filteredFolders.length === 0 ? (
        // Empty State Layout
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 p-16 text-center bg-card/10 backdrop-blur-sm max-w-xl mx-auto mt-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 animate-bounce">
            <FolderOpen className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-foreground">No folders found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchQuery 
              ? "We couldn't find any folders matching your search query." 
              : "Start upload by creating a virtual folder to store your attachments."}
          </p>
          <Button
            variant="outline"
            className="mt-5 rounded-xl border-border/80 hover:bg-muted cursor-pointer"
            onClick={() => {
              if (searchQuery) setSearchQuery("");
              else setCreateModalOpen(true);
            }}
          >
            {searchQuery ? "Clear Search Filter" : "Create First Folder"}
          </Button>
        </div>
      ) : (
        // Folders Grid View
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredFolders.map((folder) => (
            <FolderCard
              key={folder.id}
              name={folder.name}
              fileCount={folder.file_count}
              onClick={() => router.push(`/storage/${folder.id}`)}
              onRename={() => triggerRename(folder)}
              onDelete={() => triggerDelete(folder)}
            />
          ))}
        </div>
      )}

      {/* Create Modal Component */}
      <CreateFolderModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSubmit={handleCreate}
      />

      {/* Custom Reusable Modals */}
      <ConfirmModal
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Folder Permanently?"
        description={`Are you absolutely sure you want to delete "${folderToDelete?.name}"? This action will destroy the Discord channel and delete all stored attachments permanently.`}
        confirmText="Delete Folder"
        onConfirm={handleDeleteConfirm}
        isDestructive
      />

      {folderToRename && (
        <PromptModal
          open={renamePromptOpen}
          onOpenChange={setRenamePromptOpen}
          title="Rename Folder"
          description={`Enter a new name for "${folderToRename.name}".`}
          labelText="Folder Name"
          defaultValue={folderToRename.name}
          placeholder="New folder name"
          onSubmit={handleRenameSubmit}
        />
      )}
    </div>
  );
}
