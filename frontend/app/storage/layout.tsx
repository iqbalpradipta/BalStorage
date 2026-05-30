import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cloud Storage Directories - BalStorage",
  description: "Organize and manage your virtual developer files, Discord channels, and cloud storage folders with BalStorage.",
};

export default function StorageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
