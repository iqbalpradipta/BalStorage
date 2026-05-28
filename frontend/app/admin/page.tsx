"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Shield,
  Users,
  ChevronDown,
  HardDrive,
  RefreshCw,
  Crown,
  Zap,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmModal } from "@/components/molecules/ConfirmModal";
import { adminService } from "@/services/admin";
import { customToast } from "@/lib/toast";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  tier: string;
  storage_used: number;
  created_at: string;
}

const TIERS: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  standard: { label: "Standard Plan", icon: Star, color: "text-muted-foreground" },
  premium: { label: "Premium Plan", icon: Zap, color: "text-amber-500" },
  pro: { label: "Pro Plan", icon: Crown, color: "text-primary" },
};

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Tier change confirmation
  const [tierConfirmOpen, setTierConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [pendingTier, setPendingTier] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.listUsers(page, limit, searchQuery);
      if (res.success) {
        setUsers(res.data);
        setTotal(res.pagination?.total || 0);
      } else {
        customToast.error("Error", res.error || "Failed to load users");
      }
    } catch {
      customToast.error("Error", "Could not fetch user list");
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleTierSelect = (user: UserItem, tier: string) => {
    if (tier === user.tier) return;
    setSelectedUser(user);
    setPendingTier(tier);
    setTierConfirmOpen(true);
  };

  const confirmTierChange = async () => {
    if (!selectedUser || !pendingTier) return;
    const res = await adminService.updateTier(selectedUser.id, pendingTier);
    if (res.success) {
      customToast.success("Tier Updated", `${selectedUser.name} moved to ${TIERS[pendingTier]?.label || pendingTier}`);
      loadUsers();
    } else {
      customToast.error("Error", res.error || "Failed to update tier");
    }
    setTierConfirmOpen(false);
    setSelectedUser(null);
    setPendingTier("");
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-linear-to-r from-primary to-primary/80 bg-clip-text">
            Admin Console
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage users, storage tiers, and system access
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadUsers}
            disabled={loading}
            className="rounded-xl h-9 hover:bg-muted/50 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search & Stats Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="pl-10 h-10 rounded-xl bg-background/50 border-border/60 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-sm"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card/60 rounded-xl border border-border/40 px-4 py-2">
          <Users className="h-3.5 w-3.5" />
          <span className="font-semibold text-foreground">{total}</span> total users
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 rounded-2xl bg-card animate-pulse border border-border/40" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 p-16 text-center bg-card/10 backdrop-blur-sm max-w-xl mx-auto">
          <Shield className="h-12 w-12 text-muted-foreground/30 mb-2" />
          <p className="text-sm font-medium text-muted-foreground">No users found</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {searchQuery ? "Try adjusting your search query." : "Users will appear here after registration."}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/40 bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5">User</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tier</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Storage Used</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Joined</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const tierInfo = TIERS[user.tier] || TIERS.standard;
                const TierIcon = tierInfo.icon;
                return (
                  <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground shadow-md shadow-secondary/15 font-semibold text-sm">
                          {user.name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate text-foreground">{user.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-lg px-2 py-0.5 ${
                        user.role === "admin"
                          ? "bg-secondary/10 text-secondary"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {user.role === "admin" && <Shield className="h-3 w-3" />}
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg h-8 text-xs font-medium hover:bg-muted/50 cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <TierIcon className={`h-3.5 w-3.5 ${tierInfo.color}`} />
                            {tierInfo.label}
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="rounded-xl border border-border/40 bg-card/95 backdrop-blur-md shadow-xl min-w-[180px]">
                          {Object.entries(TIERS).map(([key, info]) => {
                            const Icon = info.icon;
                            const isActive = user.tier === key;
                            return (
                              <DropdownMenuItem
                                key={key}
                                onClick={() => handleTierSelect(user, key)}
                                className={`rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                                  isActive
                                    ? "bg-primary/10 text-primary"
                                    : "hover:bg-muted/50"
                                }`}
                              >
                                <Icon className={`h-3.5 w-3.5 mr-2 ${info.color}`} />
                                {info.label}
                                {isActive && (
                                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                                )}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm text-foreground">{formatSize(user.storage_used)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-xs text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell className="py-3" />
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-border/40">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg h-8 text-xs cursor-pointer"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg h-8 text-xs cursor-pointer"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tier Change Confirmation Modal */}
      <ConfirmModal
        open={tierConfirmOpen}
        onOpenChange={setTierConfirmOpen}
        title="Change User Tier"
        description={
          selectedUser && pendingTier
            ? `Move ${selectedUser.name} to ${TIERS[pendingTier]?.label || pendingTier}? Their storage limit will be updated immediately.`
            : ""
        }
        confirmText="Change Tier"
        onConfirm={confirmTierChange}
      />
    </div>
  );
}
