"use client";

import { usePathname } from "next/navigation";
import { ConsoleTemplate } from "./ConsoleTemplate";

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();

  if (pathname === "/login" || pathname === "/register") {
    return <>{children}</>;
  }

  return <ConsoleTemplate>{children}</ConsoleTemplate>;
}
