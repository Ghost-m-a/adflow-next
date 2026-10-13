"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
  helper?: string;
}

/**
 * Password field with a show/hide toggle.
 * The input keeps its own `type` state (password ↔ text) and mirrors
 * the standard `Input` primitive's styling.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, label, error, helper, id, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const inputId = id ?? props.name ?? "password";

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium"
          >
            {label}
          </label>
        )}

        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={visible ? "text" : "password"}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined
            }
            className={cn(
              "w-full rounded-xl border bg-surface-2 px-3.5 py-2.5 pr-11 text-sm transition-colors",
              "placeholder:text-text-subtle",
              "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20",
              error
                ? "border-red-500/60"
                : "border-border hover:border-border-strong",
              className,
            )}
            {...props}
          />

          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex items-center px-3.5 text-text-subtle transition hover:text-text"
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {error && (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="mt-1.5 text-xs text-red-400"
          >
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

PasswordInput.displayName = "PasswordInput";
