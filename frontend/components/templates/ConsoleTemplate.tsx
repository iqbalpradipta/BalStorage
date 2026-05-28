"use client";

import { Sidebar } from "@/components/molecules/Sidebar";
import { Header } from "@/components/molecules/Header";

interface ConsoleTemplateProps {
  children: React.ReactNode;
}

export function ConsoleTemplate({ children }: ConsoleTemplateProps) {
  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
