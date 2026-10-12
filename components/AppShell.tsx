import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export default function AppShell({
  children,
  title,
  description,
  actions,
  className = "",
}: AppShellProps) {
  return (
    <main className={`mx-auto w-full min-w-0 max-w-[1600px] ${className}`}>
      {(title || description || actions) && (
        <header className="mb-7 flex flex-col gap-4 border-b border-white/[0.07] pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title && (
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {title}
              </h1>
            )}

            {description && (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                {description}
              </p>
            )}
          </div>

          {actions && (
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              {actions}
            </div>
          )}
        </header>
      )}

      {children}
    </main>
  );
}
