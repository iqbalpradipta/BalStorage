import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Developer Profile - BalStorage",
  description: "Manage your BalStorage user account, profile details, and security configuration.",
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
