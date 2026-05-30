"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Search, Grid, List, FolderOpen, FileText, RefreshCw, Trash2, Download, Eye, Folder, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileCard } from "@/components/molecules/FileCard";
import { FilePreviewModal } from "@/components/molecules/FilePreviewModal";
import { UploadZone } from "@/components/molecules/UploadZone";
import { ConfirmModal } from "@/components/molecules/ConfirmModal";
import { CreateFolderModal } from "@/components/molecules/CreateFolderModal";
import { PromptModal } from "@/components/molecules/PromptModal";
import { FolderCard } from "@/components/molecules/FolderCard";
import { folderService } from "@/services/folder";
import { fileService } from "@/services/file";
import { customToast } from "@/lib/toast";

interface Folder {
  id: string;
  name: string;
  parent_id?: string | null;
}

interface SubFolder {
  id: string;
  name: string;
  file_count?: number;
}

interface FileItem {
  id: string;
  original_name: string;
  mime_type: string;
  size: number;
  discord_attachment_url: string;
  created_at: string;
}

interface PreviewFile {
  id: string;
  original_name: string;
  mime_type: string;
  size: number;
  discord_attachment_url: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getCategory(mimeType: string): "image" | "video" | "audio" | "document" | "other" {
  const mime = mimeType.toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (
    mime.includes("pdf") ||
    mime.includes("text") ||
    mime.includes("word") ||
    mime.includes("excel") ||
    mime.includes("powerpoint") ||
    mime.includes("document") ||
    mime.includes("sheet") ||
    mime.includes("zip") ||
    mime.includes("rar") ||
    mime.includes("json")
  ) {
    return "document";
  }
  return "other";
}

export default function FolderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const folderId = params.folderId as string;

  const [folder, setFolder] = useState<Folder | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
  
  // Custom modal states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);
  const [fileToRename, setFileToRename] = useState<FileItem | null>(null);
  const [fileRenameOpen, setFileRenameOpen] = useState(false);

  // Sub-folder states
  const [subFolders, setSubFolders] = useState<SubFolder[]>([]);
  const [createSubModalOpen, setCreateSubModalOpen] = useState(false);
  const [subToDelete, setSubToDelete] = useState<SubFolder | null>(null);
  const [subDeleteOpen, setSubDeleteOpen] = useState(false);
  const [subToRename, setSubToRename] = useState<SubFolder | null>(null);
  const [subRenameOpen, setSubRenameOpen] = useState(false);

  // Custom Revamp States
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "image" | "video" | "audio" | "document" | "other">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fileService.listByFolder(folderId, page, 100); // load more to filter cleanly
      if (result.success) {
        setFiles(result.data || []);
        setTotal(result.pagination?.total || 0);
      } else {
        customToast.error("Failed to Load Files", result.error || "Could not retrieve attachment list.");
      }
    } catch (err: any) {
      customToast.error("Error", err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [folderId, page]);

  const fetchSubFolders = useCallback(async () => {
    const res = await folderService.list(folderId);
    if (res.success) {
      setSubFolders(res.data || []);
    }
  }, [folderId]);

  useEffect(() => {
    folderService.getById(folderId).then((res) => {
      if (res.success && res.data) {
        setFolder(res.data);
      } else {
        customToast.error("Not Found", "The requested folder could not be retrieved.");
        router.push("/storage");
      }
    });
    fetchSubFolders();
  }, [folderId, router, fetchSubFolders]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = async (uploadFiles: File[]) => {
    const result = await fileService.uploadMultiple(folderId, uploadFiles);
    if (result.success && result.data) {
      const { success: ok, failed, data } = result.data;
      if (ok > 0) {
        customToast.success(
          "Upload Completed", 
          `${ok} file(s) successfully routed to Discord channel.`
        );
      }
      data.forEach((item) => {
        if (item.error) {
          customToast.error(`Upload Failed: ${item.original_name}`, item.error);
        }
      });
      fetchFiles();
    } else {
      customToast.error("Upload Error", result.error || "Failed to process files upload.");
    }
  };

  const triggerDelete = (file: FileItem) => {
    setFileToDelete(file);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;
    const result = await fileService.remove(fileToDelete.id);
    if (result.success) {
      customToast.success("File Deleted", `"${fileToDelete.original_name}" was successfully removed.`);
      fetchFiles();
    } else {
      customToast.error("Failed to Delete", result.error || "Failed to delete file from node.");
    }
  };

  const triggerRename = (file: FileItem) => {
    setFileToRename(file);
    setFileRenameOpen(true);
  };

  const handleFileRename = async (newName: string) => {
    if (!fileToRename || !newName.trim() || newName.trim() === fileToRename.original_name) return;

    const result = await fileService.rename(fileToRename.id, newName.trim());
    if (result.success) {
      customToast.success("File Renamed", `Renamed to "${newName.trim()}".`);
      fetchFiles();
    } else {
      customToast.error("Failed to Rename", result.error || "Could not rename file.");
    }
  };

  const handleDownload = async (file: Pick<FileItem, "id" | "original_name">) => {
    const result = await fileService.download(file.id, file.original_name);
    if (!result.success) {
      customToast.error("Download Failed", result.error || "Could not download file.");
    }
  };

  // Memoized client-side filtered files list based on search query and category tabs
  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      const matchesSearch = file.original_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === "all" ? true : getCategory(file.mime_type) === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [files, searchQuery, activeTab]);

  const handleCreateSubFolder = async (name: string) => {
    const result = await folderService.create(name, folderId);
    if (result.success) {
      customToast.success("Sub-folder Created", `"${name}" created inside "${folder?.name}".`);
      fetchSubFolders();
    } else {
      customToast.error("Failed to Create", result.error || "Could not create sub-folder.");
    }
  };

  const handleSubDelete = async () => {
    if (!subToDelete) return;
    const result = await folderService.remove(subToDelete.id);
    if (result.success) {
      customToast.success("Sub-folder Deleted", `"${subToDelete.name}" was removed.`);
      fetchSubFolders();
    } else {
      customToast.error("Failed to Delete", result.error || "Could not delete sub-folder.");
    }
  };

  const handleSubRename = async (newName: string) => {
    if (!subToRename || !newName.trim()) return;
    const result = await folderService.update(subToRename.id, newName.trim());
    if (result.success) {
      customToast.success("Sub-folder Renamed", `Renamed to "${newName.trim()}".`);
      fetchSubFolders();
    } else {
      customToast.error("Failed to Rename", result.error || "Could not rename sub-folder.");
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Dynamic Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/storage")}
            aria-label="Back to Storage"
            className="h-10 w-10 rounded-xl hover:bg-muted/50 border-border/60 shrink-0 cursor-pointer"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Directories</span>
              <span>/</span>
              <span className="text-primary truncate">{folder?.name || "Loading..."}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground truncate mt-1">
              {folder?.name || "Loading Directory Details..."}
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFiles}
            disabled={loading}
            className="rounded-xl h-9 hover:bg-muted/50 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Sync
          </Button>

          {/* Grid/List Toggle buttons */}
          <div className="flex border border-border/40 p-0.5 rounded-xl bg-card">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
              className={`h-8 w-8 rounded-lg cursor-pointer ${viewMode === "grid" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"}`}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("list")}
              aria-label="List view"
              className={`h-8 w-8 rounded-lg cursor-pointer ${viewMode === "list" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"}`}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Upload Zone Card */}
      <UploadZone onUpload={handleUpload} />

      {/* Sub-Folders Section */}
      {subFolders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Folder className="h-4 w-4" />
              Sub-folders
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 3xl:grid-cols-10">
            {subFolders.map((sf) => (
              <FolderCard
                key={sf.id}
                name={sf.name}
                fileCount={sf.file_count || 0}
                onClick={() => router.push(`/storage/${sf.id}`)}
                onRename={() => { setSubToRename(sf); setSubRenameOpen(true); }}
                onDelete={() => { setSubToDelete(sf); setSubDeleteOpen(true); }}
              />
            ))}
          </div>
        </div>
      )}

      {/* New Sub-folder button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCreateSubModalOpen(true)}
        className="rounded-xl h-9 hover:bg-muted/50 cursor-pointer w-fit"
      >
        <Plus className="h-4 w-4 mr-2" />
        New Sub-folder
      </Button>

      {/* Search and Filters Hub */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border/40 shadow-sm">
          {/* Real-time search */}
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files inside this folder..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-xl bg-background/50 border-border/60 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-sm w-full"
            />
          </div>

          {/* Tabs Filter Category */}
          <div className="flex flex-wrap border border-border/40 p-0.5 rounded-xl bg-background/40 max-w-full overflow-x-auto gap-0.5 shrink-0">
            {[
              { id: "all", label: "All Files" },
              { id: "image", label: "Images" },
              { id: "video", label: "Videos" },
              { id: "audio", label: "Audios" },
              { id: "document", label: "Docs" },
              { id: "other", label: "Others" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Files Browser Contents */}
        {loading ? (
          // Spinner/Loading Indicators
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 3xl:grid-cols-10">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square animate-pulse rounded-2xl bg-card border border-border/20"
              />
            ))}
          </div>
        ) : filteredFiles.length === 0 ? (
          // Clean Empty State
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 p-16 text-center bg-card/10 backdrop-blur-sm max-w-xl mx-auto">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
              <FolderOpen className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-foreground">No files in this folder</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchQuery || activeTab !== "all"
                ? "No items match your active search text or category filter."
                : "Drag & drop files inside the zone above to populate this cloud space."}
            </p>
            {(searchQuery || activeTab !== "all") && (
              <Button
                variant="outline"
                className="mt-5 rounded-xl border-border/80 hover:bg-muted cursor-pointer"
                onClick={() => {
                  setSearchQuery("");
                  setActiveTab("all");
                }}
              >
                Clear Search & Tab Filters
              </Button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          // GRID VIEW LAYOUT
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 3xl:grid-cols-10">
            {filteredFiles.map((file) => (
              <FileCard
                key={file.id}
                id={file.id}
                name={file.original_name}
                mimeType={file.mime_type}
                size={file.size}
                onClick={() => setPreviewFile(file)}
                onDownload={() => handleDownload(file)}
                onRename={() => triggerRename(file)}
                onDelete={() => triggerDelete(file)}
              />
            ))}
          </div>
        ) : (
          // LIST VIEW LAYOUT (Beautiful Glassmorphic Table)
          <div className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm shadow-sm overflow-hidden animate-in fade-in duration-300">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-semibold">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/30 text-muted-foreground font-bold text-[10px] uppercase tracking-wider">
                    <th className="p-4 pl-6">File Name</th>
                    <th className="p-4">Size</th>
                    <th className="p-4">Mime Type</th>
                    <th className="p-4">Upload Date</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/25">
                  {filteredFiles.map((file) => (
                    <tr 
                      key={file.id} 
                      className="hover:bg-muted/15 transition-colors cursor-pointer group"
                      onClick={() => setPreviewFile(file)}
                    >
                      <td className="p-4 pl-6 font-bold text-foreground max-w-xs truncate flex items-center gap-3">
                        <FileText className="h-4 w-4 text-primary shrink-0 group-hover:scale-105 transition-transform" />
                        <span className="truncate" title={file.original_name}>{file.original_name}</span>
                      </td>
                      <td className="p-4 text-muted-foreground">{formatSize(file.size)}</td>
                      <td className="p-4 text-muted-foreground capitalize">{file.mime_type.split("/")[1] || file.mime_type}</td>
                      <td className="p-4 text-muted-foreground">{new Date(file.created_at).toLocaleDateString()}</td>
                      <td className="p-4 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg hover:bg-background cursor-pointer"
                            onClick={() => setPreviewFile(file)}
                            title="Preview"
                            aria-label="Preview file"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg hover:bg-background text-primary cursor-pointer"
                            onClick={() => handleDownload(file)}
                            title="Download"
                            aria-label="Download file"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg hover:bg-background cursor-pointer"
                            onClick={() => triggerRename(file)}
                            title="Rename"
                            aria-label="Rename file"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg hover:bg-rose-500/10 text-rose-500 hover:text-rose-500 cursor-pointer"
                            onClick={() => triggerDelete(file)}
                            title="Delete"
                            aria-label="Delete file"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination Details */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-card text-xs font-semibold">
            <p className="text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="h-8 rounded-lg cursor-pointer text-xs"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="h-8 rounded-lg cursor-pointer text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal Popup Drawer */}
      {previewFile && (
        <FilePreviewModal
          open={!!previewFile}
          onClose={() => setPreviewFile(null)}
          id={previewFile.id}
          name={previewFile.original_name}
          mimeType={previewFile.mime_type}
          size={previewFile.size}
          onDownload={() => handleDownload(previewFile)}
        />
      )}

      {/* Create Sub-folder Modal */}
      <CreateFolderModal
        open={createSubModalOpen}
        onOpenChange={setCreateSubModalOpen}
        onSubmit={handleCreateSubFolder}
      />

      {/* Sub-folder Delete Modal */}
      <ConfirmModal
        open={subDeleteOpen}
        onOpenChange={setSubDeleteOpen}
        title="Delete Sub-folder?"
        description={`Delete "${subToDelete?.name}" and all its Discord channel contents?`}
        confirmText="Delete Sub-folder"
        onConfirm={handleSubDelete}
        isDestructive
      />

      {/* Sub-folder Rename Modal */}
      {subToRename && (
        <PromptModal
          open={subRenameOpen}
          onOpenChange={setSubRenameOpen}
          title="Rename Sub-folder"
          description={`Enter a new name for "${subToRename.name}".`}
          labelText="Folder Name"
          defaultValue={subToRename.name}
          placeholder="New folder name"
          onSubmit={handleSubRename}
        />
      )}

      {fileToRename && (
        <PromptModal
          open={fileRenameOpen}
          onOpenChange={setFileRenameOpen}
          title="Rename File"
          description={`Enter a new name for "${fileToRename.original_name}".`}
          labelText="File Name"
          defaultValue={fileToRename.original_name}
          placeholder="New file name"
          confirmText="Rename File"
          onSubmit={handleFileRename}
        />
      )}

      {/* Custom Reusable Modals */}
      <ConfirmModal
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete File Permanently?"
        description={`Are you sure you want to delete "${fileToDelete?.original_name}"? This action will permanently remove the attachment from your Discord cloud repository.`}
        confirmText="Delete File"
        onConfirm={handleDeleteConfirm}
        isDestructive
      />
    </div>
  );
}
