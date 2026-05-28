"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  labelText?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  onSubmit: (value: string) => void;
}

export function PromptModal({
  open,
  onOpenChange,
  title,
  description,
  labelText = "Value",
  defaultValue = "",
  placeholder = "",
  confirmText = "Submit",
  cancelText = "Cancel",
  onSubmit,
}: PromptModalProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
    }
  }, [open, defaultValue]);

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value.trim());
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl border border-border/40 bg-card/95 backdrop-blur-md shadow-2xl animate-in zoom-in-95 duration-200">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base font-bold text-foreground">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground mt-1">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-2 py-4">
          <Label htmlFor="prompt-input" className="text-xs font-semibold text-foreground/80">
            {labelText}
          </Label>
          <Input
            id="prompt-input"
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-10 rounded-xl bg-background/50 border-border/60 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSubmit();
              }
            }}
            autoFocus
          />
        </div>

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel 
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs font-semibold h-9 cursor-pointer"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="rounded-xl text-xs font-bold h-9 cursor-pointer bg-primary hover:bg-primary/95 text-primary-foreground shadow-md shadow-primary/10 hover:shadow-primary/25"
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
