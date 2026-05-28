"use client";

import { useUserFromCookie } from "@/hooks/useUserFromCookie";
import { User, Mail, Shield, Calendar, Clock, LogOut, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth";
import { customToast } from "@/lib/toast";

export default function ProfilePage() {
  const { user } = useUserFromCookie();
  const router = useRouter();

  const handleLogout = () => {
    authService.logout();
    customToast.success("Logged out successfully", "Your session has been terminated.");
    router.push("/login");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-linear-to-r from-primary to-primary/80 bg-clip-text">
          User Account Profile
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review your account credentials, security role, and cloud storage specifications
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card Summary */}
        <div className="md:col-span-1 flex flex-col items-center justify-between rounded-2xl border border-border/40 bg-card p-6 shadow-sm text-center">
          <div className="flex flex-col items-center">
            {/* Avatar block */}
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-linear-to-br from-primary/10 to-primary/5 text-primary text-3xl font-extrabold shadow-md mb-4 border border-primary/20">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            
            <h2 className="text-lg font-bold text-foreground truncate max-w-xs">{user?.name || "User Account"}</h2>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary mt-2 border border-primary/10">
              <Shield className="h-3 w-3" /> {user?.role || "Member"}
            </span>
          </div>

          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full mt-8 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive border border-destructive/10 cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out Session
          </Button>
        </div>

        {/* Profile Details Listing */}
        <div className="md:col-span-2 rounded-2xl border border-border/40 bg-card p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-foreground border-b border-border/30 pb-2">Credentials Details</h3>
            
            <div className="divide-y divide-border/25 mt-2">
              {/* Full Name */}
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
                  <User className="h-4.5 w-4.5 text-primary shrink-0" />
                  <span>Full Name</span>
                </div>
                <span className="text-xs font-bold text-foreground">{user?.name || "Not Configured"}</span>
              </div>

              {/* Email Address */}
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
                  <Mail className="h-4.5 w-4.5 text-primary shrink-0" />
                  <span>Email Address</span>
                </div>
                <span className="text-xs font-bold text-foreground truncate max-w-xs">{user?.email || "Not Configured"}</span>
              </div>

              {/* User ID */}
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
                  <Shield className="h-4.5 w-4.5 text-primary shrink-0" />
                  <span>Account Node ID</span>
                </div>
                <span className="text-[10px] font-bold text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded-full">
                  {user?.id || "Unavailable"}
                </span>
              </div>
            </div>
          </div>

          {/* Security & Sessions */}
          <div>
            <h3 className="text-base font-bold text-foreground border-b border-border/30 pb-2">Active Session Details</h3>
            
            <div className="divide-y divide-border/25 mt-2">
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
                  <Calendar className="h-4.5 w-4.5 text-secondary shrink-0" />
                  <span>Session Established</span>
                </div>
                <span className="text-xs font-bold text-foreground">{new Date().toLocaleDateString()}</span>
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
                  <Clock className="h-4.5 w-4.5 text-secondary shrink-0" />
                  <span>Authentication Method</span>
                </div>
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> JWT Bearer Token
                </span>
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
                  <HardDrive className="h-4.5 w-4.5 text-secondary shrink-0" />
                  <span>Authorized Storage Tier</span>
                </div>
                <span className="text-xs font-bold text-primary">Standard Tier (Discord API Unlimited)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
