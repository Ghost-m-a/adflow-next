"use client";

import { cn } from "@/lib/utils/cn";
import { forwardRef, type InputHTMLAttributes, useId } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helper, id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id || autoId;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined}
          className={cn(
            "w-full rounded-xl border bg-surface-2 px-3.5 py-2.5 text-sm transition-colors",
            "placeholder:text-text-subtle",
            "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20",
            error ? "border-red-500/60" : "border-border hover:border-border-strong",
            className,
          )}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} role="alert" className="mt-1.5 text-xs text-red-400">
            {error}
          </p>
        )}
        {!error && helper && (
          <p id={`${inputId}-helper`} className="mt-1.5 text-xs text-text-subtle">
            {helper}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
