import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Console Dashboard - BalStorage",
  description: "View real-time analytics, folder structures, and Discord guild cloud storage metrics in the BalStorage Developer Console.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
