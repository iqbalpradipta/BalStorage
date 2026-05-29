"use client";

import { useRouter, usePathname } from "next/navigation";
import { LogOut, User, Settings, FolderClosed, LayoutDashboard, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserFromCookie } from "@/hooks/useUserFromCookie";
import { authService } from "@/services/auth";
import { customToast } from "@/lib/toast";

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUserFromCookie();

  const handleLogout = async () => {
    authService.logout();
    customToast.success("Logged out successfully");
    router.push("/login");
  };

  // Generate dynamic page title based on path
  const getPageTitle = () => {
    if (pathname.startsWith("/dashboard")) {
      return (
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground animate-in fade-in duration-200">
          <LayoutDashboard className="h-4 w-4 text-primary md:block hidden" />
          <span className="md:inline hidden">Console</span>
          <span className="text-border md:inline hidden">/</span>
          <span className="text-foreground font-semibold">Dashboard</span>
        </div>
      );
    }
    if (pathname.startsWith("/storage")) {
      const parts = pathname.split("/");
      const isSub = parts.length > 2;
      return (
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground animate-in fade-in duration-200">
          <FolderClosed className="h-4 w-4 text-primary md:block hidden" />
          <span className="hover:text-foreground cursor-pointer md:inline hidden" onClick={() => router.push("/storage")}>Storage</span>
          {isSub ? (
            <>
              <span className="text-border md:inline hidden">/</span>
              <span className="text-foreground font-semibold">Details</span>
            </>
          ) : (
            <span className="text-foreground font-semibold md:hidden">Storage</span>
          )}
        </div>
      );
    }
    if (pathname.startsWith("/settings")) {
      return (
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground animate-in fade-in duration-200">
          <Settings className="h-4 w-4 text-primary md:block hidden" />
          <span className="md:inline hidden">Console</span>
          <span className="text-border md:inline hidden">/</span>
          <span className="text-foreground font-semibold">Settings</span>
        </div>
      );
    }
    if (pathname.startsWith("/profile")) {
      return (
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground animate-in fade-in duration-200">
          <User className="h-4 w-4 text-primary md:block hidden" />
          <span className="md:inline hidden">Console</span>
          <span className="text-border md:inline hidden">/</span>
          <span className="text-foreground font-semibold">Profile</span>
        </div>
      );
    }
    return <span className="text-sm font-semibold capitalize">{pathname.replace("/", "")}</span>;
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-border/40 bg-background/60 backdrop-blur-md px-4 sm:px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="h-9 w-9 rounded-xl hover:bg-muted/50 md:hidden cursor-pointer shrink-0"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        {getPageTitle()}
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2.5 px-2 py-1.5 h-auto rounded-xl hover:bg-muted/50 cursor-pointer">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-md shadow-primary/10">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="hidden sm:flex flex-col items-start text-left">
              <span className="text-xs font-semibold text-foreground leading-none">{user?.name || "User"}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5 leading-none capitalize">{user?.role || "Member"}</span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5 shadow-xl border border-border/40 bg-card/95 backdrop-blur-md">
          <DropdownMenuLabel className="px-2.5 py-2 text-xs font-semibold text-muted-foreground">
            Account Options
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-border/40" />
          <DropdownMenuItem 
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-foreground hover:bg-muted/50 cursor-pointer"
            onClick={() => router.push("/profile")}
          >
            <User className="h-4 w-4 text-muted-foreground" />
            My Profile
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-foreground hover:bg-muted/50 cursor-pointer"
            onClick={() => router.push("/settings")}
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            System Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-border/40" />
          <DropdownMenuItem 
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer font-medium"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout Session
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
