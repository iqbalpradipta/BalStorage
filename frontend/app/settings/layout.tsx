import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "System Settings - BalStorage",
  description: "Configure your BalStorage developer credentials, system integrations, themes, and console preferences.",
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
