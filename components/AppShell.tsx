import type { ReactNode } from "react";
import styles from "@/styles/components/AppShell.module.css";

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
    <main className={`${styles.shell} ${className}`}>
      {(title || description || actions) && (
        <header className={styles.header}>
          <div className={styles.titleBlock}>
            {title && <h1 className={styles.title}>{title}</h1>}
            {description && (
              <p className={styles.description}>{description}</p>
            )}
          </div>

          {actions && <div className={styles.actions}>{actions}</div>}
        </header>
      )}

      {children}
    </main>
  );
}
