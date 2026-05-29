"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Database,
  Settings,
  ChevronLeft,
  User,
  Shield,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useUserFromCookie } from "@/hooks/useUserFromCookie";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Storage", href: "/storage", icon: Database },
  { title: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

export function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useUserFromCookie();

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar-background text-sidebar-foreground transition-all duration-300 ease-in-out glass-sidebar",
        // Desktop layout
        "relative z-30",
        collapsed ? "md:w-16" : "md:w-64",
        // Mobile drawer layout
        "fixed md:static inset-y-0 left-0 z-40 w-64 transform md:transform-none shadow-2xl md:shadow-none",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border/30 h-14 shrink-0">
        {!collapsed ? (
          <Link href="/dashboard" onClick={() => setMobileOpen?.(false)} className="flex items-center gap-2 group">
            <img 
              src="/Logo-bg-removebg-preview.png" 
              alt="BalStorage Logo" 
              className="h-8 w-8 object-contain group-hover:scale-105 transition-transform duration-200"
            />
            <span className="font-bold text-base tracking-wide bg-linear-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              BalStorage
            </span>
          </Link>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center mx-auto">
            <img 
              src="/Logo-bg-removebg-preview.png" 
              alt="BalStorage Logo" 
              className="h-8 w-8 object-contain"
            />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "h-7 w-7 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border border-sidebar-border/20 absolute -right-3 top-3.5 bg-background shadow-md hidden md:flex cursor-pointer",
            collapsed && "rotate-180"
          )}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1.5 p-3 mt-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen?.(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all group relative cursor-pointer",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/15 scale-[0.98]"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:scale-[0.98]"
              )}
            >
              <item.icon className={cn(
                "h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
              )} />
              <span className={cn("truncate", collapsed && "md:hidden")}>{item.title}</span>
              {!collapsed && isActive && (
                <span className="absolute right-3 h-1.5 w-1.5 rounded-full bg-primary-foreground md:flex hidden" />
              )}
            </Link>
          );
        })}
        {user?.role === "admin" && (
          <Link
            href="/admin"
            onClick={() => setMobileOpen?.(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all group relative cursor-pointer",
              pathname === "/admin" || pathname.startsWith("/admin/")
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/15 scale-[0.98]"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:scale-[0.98]"
            )}
          >
            <Shield className={cn(
              "h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
              (pathname === "/admin" || pathname.startsWith("/admin/")) ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
            )} />
            <span className={cn("truncate", collapsed && "md:hidden")}>Admin</span>
            {!collapsed && (pathname === "/admin" || pathname.startsWith("/admin/")) && (
              <span className="absolute right-3 h-1.5 w-1.5 rounded-full bg-primary-foreground md:flex hidden" />
            )}
          </Link>
        )}
      </nav>

      {/* User Widget Bottom */}
      <div className="p-3 border-t border-sidebar-border/30 shrink-0">
        <Link
          href="/profile"
          onClick={() => setMobileOpen?.(false)}
          className={cn(
            "flex items-center gap-3 rounded-xl p-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 cursor-pointer",
            collapsed ? "md:justify-center" : ""
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground shadow-md shadow-secondary/15 font-semibold text-sm">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className={cn("min-w-0 flex-1", collapsed && "md:hidden")}>
            <p className="text-xs font-semibold truncate leading-tight text-foreground">{user?.name || "User"}</p>
            <span className="text-[10px] text-muted-foreground truncate block leading-tight mt-0.5">
              {user?.role === "admin" ? (
                <span className="inline-flex items-center gap-0.5 text-secondary font-medium">
                  <Shield className="h-2.5 w-2.5" /> Admin
                </span>
              ) : (
                user?.email || "Account Profile"
              )}
            </span>
          </div>
        </Link>
      </div>
    </aside>
  );
}

