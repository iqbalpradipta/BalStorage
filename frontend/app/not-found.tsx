"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">Page not found</p>
      <div className="flex gap-4">
        <button
          onClick={() => router.back()}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          Go Back
        </button>
        <Link
          href="/dashboard"
          className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
