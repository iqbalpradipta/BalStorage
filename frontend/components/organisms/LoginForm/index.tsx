"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/auth";
import { customToast } from "@/lib/toast";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      customToast.warning(
        "Missing Credentials",
        "Please enter both your email and password.",
      );
      return;
    }

    setLoading(true);
    try {
      const result = await authService.login(email, password);
      if (result.success) {
        customToast.success("Welcome back!", "Authentication successful.");
        router.push("/dashboard");
      } else {
        customToast.error(
          "Login Failed",
          result.error || "Please verify your credentials.",
        );
      }
    } catch (err: any) {
      customToast.error(
        "Error",
        err.message || "An unexpected error occurred.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl border border-border/40 bg-card/65 backdrop-blur-md shadow-xl shadow-primary/5">
      <div className="mb-8 text-center">
        {/* Unified primary-tinted icon */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
          <img
            src="/Logo-bg-removebg-preview.png"
            alt="BalStorage Logo"
            className="h-16 w-16 object-contain"
          />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome !
        </h1>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Sign in to access your cloud developer console
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-1.5">
          <Label
            htmlFor="email"
            className="text-xs font-semibold text-foreground/80"
          >
            Email Address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/80" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="pl-10 h-10 rounded-xl bg-background/50 border-border/60 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-xs"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <Label
            htmlFor="password"
            className="text-xs font-semibold text-foreground/80"
          >
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/80" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="pl-10 pr-10 h-10 rounded-xl bg-background/50 border-border/60 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-xs"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Cohesive Solid Button */}
        <Button
          type="submit"
          className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-md shadow-primary/10 active:scale-[0.98] transition-all mt-2 cursor-pointer text-xs"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign In"}
        </Button>
      </form>

      {/* Footer Registration Link */}
      <div className="mt-6 text-center text-xs text-muted-foreground border-t border-border/30 pt-4">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-semibold text-primary hover:underline transition-all"
        >
          Create account
        </Link>
      </div>
    </div>
  );
}
