"use client";

import { useTheme } from "next-themes";
import { useState } from "react";
import { Sun, Moon, Laptop, Activity, CheckCircle2, ShieldAlert, Cpu, Heart, HardDrive, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/services/api";
import { customToast } from "@/lib/toast";

interface DiagnosticResult {
  running: boolean;
  success: boolean;
  dbOk: boolean;
  latency: number;
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult>({
    running: false,
    success: false,
    dbOk: false,
    latency: 0,
  });
  const [hasRun, setHasRun] = useState(false);

  const runDiagnostics = async () => {
    setDiagnostic((prev) => ({ ...prev, running: true }));
    setHasRun(true);
    const start = performance.now();
    
    try {
      // Call the health check endpoint
      const response = await fetch("http://localhost:8080/api/v1/health");
      const end = performance.now();
      const latencyMs = Math.round(end - start);

      if (response.ok) {
        const data = await response.json();
        setDiagnostic({
          running: false,
          success: true,
          dbOk: data.success || false,
          latency: latencyMs,
        });
        customToast.success("Diagnostics Complete", "All systems are operational.");
      } else {
        throw new Error("API responded with an error code.");
      }
    } catch (error) {
      const end = performance.now();
      const latencyMs = Math.round(end - start);
      setDiagnostic({
        running: false,
        success: false,
        dbOk: false,
        latency: latencyMs,
      });
      customToast.error("Diagnostics Failed", "Backend API could not be reached.");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-linear-to-r from-primary to-primary/80 bg-clip-text">
          System Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customize your workspace appearance and run real-time hardware diagnostics
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Theme Settings Card */}
        <div className="rounded-2xl border border-border/40 bg-card p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-foreground">Workspace Theme</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Toggle light, dark, or system default palettes</p>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            {/* Light Option */}
            <button
              onClick={() => {
                setTheme("light");
                customToast.info("Theme Switched", "Light palette enabled.");
              }}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all cursor-pointer ${
                theme === "light"
                  ? "border-primary bg-primary/5 text-primary shadow"
                  : "border-border/60 hover:bg-muted hover:border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sun className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Light</span>
            </button>

            {/* Dark Option */}
            <button
              onClick={() => {
                setTheme("dark");
                customToast.info("Theme Switched", "Dark palette enabled.");
              }}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all cursor-pointer ${
                theme === "dark"
                  ? "border-primary bg-primary/5 text-primary shadow"
                  : "border-border/60 hover:bg-muted hover:border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Moon className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Dark</span>
            </button>

            {/* System Option */}
            <button
              onClick={() => {
                setTheme("system");
                customToast.info("Theme Switched", "Syncing with OS settings.");
              }}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all cursor-pointer ${
                theme === "system"
                  ? "border-primary bg-primary/5 text-primary shadow"
                  : "border-border/60 hover:bg-muted hover:border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Laptop className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">System</span>
            </button>
          </div>
        </div>

        {/* Diagnostics & API Diagnostics */}
        <div className="rounded-2xl border border-border/40 bg-card p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-base font-bold text-foreground">API Connection Diagnostics</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Test response latencies and database gateways</p>
          </div>

          {hasRun ? (
            // Results Dashboard
            <div className="space-y-3 bg-muted/20 border border-border/20 p-4 rounded-xl">
              {/* Latency Meter */}
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground flex items-center gap-1.5"><Activity className="h-4 w-4 text-primary" /> Gateway Latency</span>
                <span className={`font-bold ${diagnostic.latency < 200 ? "text-emerald-500" : "text-amber-500"}`}>
                  {diagnostic.latency} ms
                </span>
              </div>

              {/* API status */}
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground flex items-center gap-1.5"><Cpu className="h-4 w-4 text-primary" /> API Server Gateway</span>
                {diagnostic.success ? (
                  <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Operational</span>
                ) : (
                  <span className="text-rose-500 flex items-center gap-1"><ShieldAlert className="h-3.5 w-3.5" /> Offline</span>
                )}
              </div>

              {/* DB status */}
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground flex items-center gap-1.5"><Heart className="h-4 w-4 text-primary" /> Database Connection</span>
                {diagnostic.dbOk ? (
                  <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Healthy</span>
                ) : (
                  <span className="text-rose-500 flex items-center gap-1"><ShieldAlert className="h-3.5 w-3.5" /> Unhealthy</span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground bg-muted/20 border border-border/20 rounded-xl">
              <Cpu className="h-10 w-10 text-muted-foreground/30 mb-1" />
              <p className="text-xs font-medium">Diagnostics have not been executed yet</p>
            </div>
          )}

          <Button
            onClick={runDiagnostics}
            disabled={diagnostic.running}
            className="w-full rounded-xl h-10 bg-linear-to-r from-primary to-primary/90 text-primary-foreground font-semibold shadow-md shadow-primary/10 hover:shadow-primary/20 transition-all cursor-pointer text-xs"
          >
            {diagnostic.running ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Pinging Gateway Nodes...
              </>
            ) : (
              "Run System Diagnostics Test"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
