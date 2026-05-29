"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Database,
  FolderOpen,
  FileText,
  Activity,
  ArrowRight,
  TrendingUp,
  Image as ImageIcon,
  Video as VideoIcon,
  Music as MusicIcon,
  FileSpreadsheet as DocIcon,
  HardDrive,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { folderService } from "@/services/folder";
import { fileService } from "@/services/file";
import { statsService } from "@/services/stats";
import { customToast } from "@/lib/toast";

interface Folder {
  id: string;
  name: string;
  created_at: string;
}

interface FileItem {
  id: string;
  folder_id: string;
  original_name: string;
  mime_type: string;
  size: number;
  created_at: string;
  discord_attachment_url: string;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
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

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [latency, setLatency] = useState<number>(0);
  const [tier, setTier] = useState<{ name: string; label: string; limit: number }>({ name: "standard", label: "Standard Plan", limit: 1 * 1024 * 1024 * 1024 });

  // Stats
  const [totalSize, setTotalSize] = useState(0);
  const [recentUploads, setRecentUploads] = useState<FileItem[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState({
    image: { size: 0, count: 0 },
    video: { size: 0, count: 0 },
    audio: { size: 0, count: 0 },
    document: { size: 0, count: 0 },
    other: { size: 0, count: 0 },
  });

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    const start = performance.now();

    try {
      const [folderRes, statsRes] = await Promise.all([
        folderService.list(),
        statsService.getDashboard(),
      ]);
      const end = performance.now();
      setLatency(Math.round(end - start));

      if (!folderRes.success) {
        customToast.error("Error", folderRes.error || "Failed to load storage structure.");
        setLoading(false);
        return;
      }

      const fetchedFolders = folderRes.data || [];
      setFolders(fetchedFolders);

      if (statsRes.success && statsRes.data) {
        setTotalSize(statsRes.data.total_size);
        setTier(statsRes.data.tier);
        setCategoryBreakdown({
          image: statsRes.data.category_breakdown.image || { size: 0, count: 0 },
          video: statsRes.data.category_breakdown.video || { size: 0, count: 0 },
          audio: statsRes.data.category_breakdown.audio || { size: 0, count: 0 },
          document: statsRes.data.category_breakdown.document || { size: 0, count: 0 },
          other: statsRes.data.category_breakdown.other || { size: 0, count: 0 },
        });
      }

      if (fetchedFolders.length === 0) {
        setFiles([]);
        setRecentUploads([]);
        setLoading(false);
        return;
      }

      // Fetch files for all folders for recent uploads
      const fileFetchPromises = fetchedFolders.map((f) =>
        fileService.listByFolder(f.id, 1, 100)
      );

      const fileFetchResults = await Promise.all(fileFetchPromises);

      const allFiles: FileItem[] = [];
      fileFetchResults.forEach((res) => {
        if (res.success && res.data) {
          allFiles.push(...res.data);
        }
      });

      setFiles(allFiles);

      // Sort files by date for recent uploads
      const sortedFiles = [...allFiles].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setRecentUploads(sortedFiles.slice(0, 5));

    } catch (error) {
      customToast.error("System Error", "Could not complete analytics calculation.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Use tier limit for storage bar (0 = unlimited)
  const capacityCap = tier.limit;
  const storagePercentage = capacityCap === 0 ? 0 : Math.min((totalSize / capacityCap) * 100, 100);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground bg-linear-to-r from-primary to-primary/80 bg-clip-text">
            Console Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time analytics and storage status aggregated from your Discord guild
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboardData}
            disabled={loading}
            className="rounded-xl h-9 hover:bg-muted/50 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh Data
          </Button>
          <Button
            size="sm"
            onClick={() => router.push("/storage")}
            className="rounded-xl h-9 bg-linear-to-r from-primary to-primary/95 shadow-md shadow-primary/10 hover:shadow-primary/25 cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            Manage Storage
          </Button>
        </div>
      </div>

      {loading ? (
        // Loading State Shimmers
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-card animate-pulse border border-border/40" />
          ))}
          <div className="md:col-span-2 h-[340px] rounded-2xl bg-card animate-pulse border border-border/40" />
          <div className="md:col-span-2 h-[340px] rounded-2xl bg-card animate-pulse border border-border/40" />
        </div>
      ) : (
        <>
          {/* Stats Widgets */}
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Storage Widget */}
            <div className="relative rounded-2xl border border-border/40 bg-card p-6 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Storage Volume</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <HardDrive className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-bold tracking-tight text-foreground">{formatSize(totalSize)}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  used of {tier.limit === 0 ? "Unlimited" : formatSize(tier.limit)} ({tier.label})
                </p>
              </div>
              {/* Visual meter */}
              <div className="mt-4 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                {capacityCap === 0 ? (
                  <div className="h-full bg-linear-to-r from-emerald-500 to-teal-500 rounded-full w-full" />
                ) : (
                  <div
                    className="h-full bg-linear-to-r from-primary to-secondary rounded-full transition-all duration-500"
                    style={{ width: `${storagePercentage}%` }}
                  />
                )}
              </div>
            </div>

            {/* Total Folders */}
            <div className="relative rounded-2xl border border-border/40 bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Folders</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                  <FolderOpen className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-bold tracking-tight text-foreground">{folders.length}</h3>
                <p className="text-xs text-muted-foreground mt-1">active Discord channels</p>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-secondary font-medium">
                <TrendingUp className="h-3 w-3" />
                <span>Isolated cloud directories</span>
              </div>
            </div>

            {/* Total Files */}
            <div className="relative rounded-2xl border border-border/40 bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Files</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                  <FileText className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-bold tracking-tight text-foreground">{files.length}</h3>
                <p className="text-xs text-muted-foreground mt-1">discord attachment objects</p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{(files.length / Math.max(folders.length, 1)).toFixed(1)}</span>
                <span>files avg. per folder</span>
              </div>
            </div>

            {/* Connection Latency */}
            <div className="relative rounded-2xl border border-border/40 bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Connection API</span>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${latency < 200 ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                  <Activity className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-bold tracking-tight text-foreground">{latency} ms</h3>
                <p className="text-xs text-muted-foreground mt-1">active backend ping response</p>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Operational (v1 Engine)</span>
              </div>
            </div>
          </div>

          {/* Detailed Statistics Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Storage Distribution Breakdown */}
            <div className="rounded-2xl border border-border/40 bg-card p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">Storage Breakdown</h2>
                <p className="text-xs text-muted-foreground">Distribution of files by type categories</p>
              </div>

              {files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                  <HardDrive className="h-12 w-12 text-muted-foreground/30 mb-2" />
                  <p className="text-sm font-medium">No storage distribution data</p>
                  <p className="text-xs mt-0.5">Upload files inside a folder to see live distribution.</p>
                </div>
              ) : (
                <div className="space-y-4 mt-6">
                  {/* Category Image */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-3.5 w-3.5 text-primary" />
                        <span>Images</span>
                      </div>
                      <span className="text-muted-foreground">
                        {categoryBreakdown.image.count} files ({formatSize(categoryBreakdown.image.size)})
                      </span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full" 
                        style={{ width: `${totalSize ? (categoryBreakdown.image.size / totalSize) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Category Video */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <VideoIcon className="h-3.5 w-3.5 text-secondary" />
                        <span>Videos</span>
                      </div>
                      <span className="text-muted-foreground">
                        {categoryBreakdown.video.count} files ({formatSize(categoryBreakdown.video.size)})
                      </span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-secondary rounded-full" 
                        style={{ width: `${totalSize ? (categoryBreakdown.video.size / totalSize) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Category Audio */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <MusicIcon className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Audios</span>
                      </div>
                      <span className="text-muted-foreground">
                        {categoryBreakdown.audio.count} files ({formatSize(categoryBreakdown.audio.size)})
                      </span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-505 bg-indigo-500 rounded-full" 
                        style={{ width: `${totalSize ? (categoryBreakdown.audio.size / totalSize) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Category Document */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <DocIcon className="h-3.5 w-3.5 text-amber-500" />
                        <span>Documents</span>
                      </div>
                      <span className="text-muted-foreground">
                        {categoryBreakdown.document.count} files ({formatSize(categoryBreakdown.document.size)})
                      </span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 rounded-full" 
                        style={{ width: `${totalSize ? (categoryBreakdown.document.size / totalSize) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Category Others */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Others</span>
                      </div>
                      <span className="text-muted-foreground">
                        {categoryBreakdown.other.count} files ({formatSize(categoryBreakdown.other.size)})
                      </span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-muted-foreground/50 rounded-full" 
                        style={{ width: `${totalSize ? (categoryBreakdown.other.size / totalSize) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Uploads Widget */}
            <div className="rounded-2xl border border-border/40 bg-card p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-foreground">Recent Uploads</h2>
                  <Link href="/storage" className="text-xs text-primary font-semibold hover:underline flex items-center gap-0.5">
                    View All <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Latest uploads registered on the network</p>
              </div>

              {recentUploads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                  <FileText className="h-12 w-12 text-muted-foreground/30 mb-2" />
                  <p className="text-sm font-medium">No recent uploads</p>
                  <p className="text-xs mt-0.5">Create folders and upload files to populate this feed.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/30 mt-4 max-h-[220px] overflow-auto pr-1">
                  {recentUploads.map((file) => {
                    const cat = getCategory(file.mime_type);
                    return (
                      <div key={file.id} className="flex items-center justify-between py-2.5 hover:bg-muted/10 rounded-lg px-2 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                            cat === "image" ? "bg-primary/10 text-primary" : 
                            cat === "video" ? "bg-secondary/10 text-secondary" :
                            cat === "audio" ? "bg-indigo-500/10 text-indigo-500" :
                            cat === "document" ? "bg-amber-500/10 text-amber-500" :
                            "bg-muted text-muted-foreground"
                          } shrink-0`}>
                            {cat === "image" && <ImageIcon className="h-4 w-4" />}
                            {cat === "video" && <VideoIcon className="h-4 w-4" />}
                            {cat === "audio" && <MusicIcon className="h-4 w-4" />}
                            {cat === "document" && <DocIcon className="h-4 w-4" />}
                            {cat === "other" && <FileText className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate text-foreground">{file.original_name}</p>
                            <span className="text-[10px] text-muted-foreground">
                              {formatSize(file.size)} • {new Date(file.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 px-2 rounded-lg cursor-pointer"
                          onClick={() => window.open(file.discord_attachment_url, "_blank")}
                        >
                          Download
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
