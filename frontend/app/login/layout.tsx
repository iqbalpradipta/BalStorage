import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In - BalStorage",
  description: "Log in to your developer console to access your Discord-backed secure cloud storage.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
