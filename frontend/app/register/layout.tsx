import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account - BalStorage",
  description: "Sign up for a BalStorage account to build secure cloud storage directories using your Discord server.",
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
