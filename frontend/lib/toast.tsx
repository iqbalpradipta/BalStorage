import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastOptions {
  description?: string;
  duration?: number;
}

export const showToast = (
  message: string,
  type: ToastType = "info",
  options?: ToastOptions
) => {
  const duration = options?.duration || 4000;
  
  toast.custom(
    (t) => {
      // Setup styling based on type
      let borderColor = "border-l-blue-500";
      let iconColor = "text-blue-500";
      let Icon = Info;
      let title = "Information";

      if (type === "success") {
        borderColor = "border-l-emerald-500";
        iconColor = "text-emerald-500";
        Icon = CheckCircle2;
        title = "Success";
      } else if (type === "error") {
        borderColor = "border-l-rose-500";
        iconColor = "text-rose-500";
        Icon = XCircle;
        title = "Error";
      } else if (type === "warning") {
        borderColor = "border-l-amber-500";
        iconColor = "text-amber-500";
        Icon = AlertTriangle;
        title = "Warning";
      }

      return (
        <div
          className={`flex w-full max-w-sm gap-3 rounded-xl border border-border/40 bg-card/95 p-4 shadow-xl backdrop-blur-md border-l-4 ${borderColor} animate-in slide-in-from-bottom-4 duration-300`}
        >
          <div className={`${iconColor} shrink-0 mt-0.5`}>
            <Icon className="h-5 w-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-none text-foreground">{message}</p>
            {options?.description && (
              <p className="mt-1 text-xs text-muted-foreground leading-normal">{options.description}</p>
            )}
          </div>

          <button
            onClick={() => toast.dismiss(t)}
            className="shrink-0 rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors h-fit"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      );
    },
    { duration }
  );
};

// Convenient wrappers matching common toast signatures
export const customToast = {
  success: (msg: string, desc?: string) => showToast(msg, "success", { description: desc }),
  error: (msg: string, desc?: string) => showToast(msg, "error", { description: desc }),
  warning: (msg: string, desc?: string) => showToast(msg, "warning", { description: desc }),
  info: (msg: string, desc?: string) => showToast(msg, "info", { description: desc }),
};
