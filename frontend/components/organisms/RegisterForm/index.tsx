"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail, User, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/auth";
import { customToast } from "@/lib/toast";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      customToast.warning("Missing Fields", "Please fill in all requested fields.");
      return;
    }

    if (password.length < 6) {
      customToast.warning("Weak Password", "Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      const result = await authService.register(name, email, password);
      if (result.success) {
        customToast.success("Registration Successful", "Please log in with your credentials.");
        router.push("/login");
      } else {
        customToast.error("Registration Failed", result.error || "An error occurred during registration.");
      }
    } catch (err: any) {
      customToast.error("Error", err.message || "An unexpected error occurred.");
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
          Create Account
        </h1>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Register to access your BalStorage developer console
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name Field */}
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs font-semibold text-foreground/80">
            Full Name
          </Label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/80" />
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="pl-10 h-10 rounded-xl bg-background/50 border-border/60 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-sm"
            />
          </div>
        </div>

        {/* Email Address Field */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-semibold text-foreground/80">
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
              className="pl-10 h-10 rounded-xl bg-background/50 border-border/60 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-sm"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-semibold text-foreground/80">
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/80" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="pl-10 pr-10 h-10 rounded-xl bg-background/50 border-border/60 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-sm"
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
          {loading ? "Creating account..." : "Register"}
        </Button>
      </form>

      {/* Footer Login Link */}
      <div className="mt-6 text-center text-xs text-muted-foreground border-t border-border/30 pt-4">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline transition-all">
          Sign in
        </Link>
      </div>
    </div>
  );
}
