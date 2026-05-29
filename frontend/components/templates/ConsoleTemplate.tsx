"use client";

import { Sidebar } from "@/components/molecules/Sidebar";
import { Header } from "@/components/molecules/Header";
import { useState } from "react";

interface ConsoleTemplateProps {
  children: React.ReactNode;
}

export function ConsoleTemplate({ children }: ConsoleTemplateProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-full relative overflow-hidden">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      
      {/* Backdrop overlay for mobile drawer */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 backdrop-blur-xs transition-opacity duration-300 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="flex flex-1 flex-col overflow-hidden w-full">
        <Header onToggleSidebar={() => setMobileOpen(!mobileOpen)} />
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

