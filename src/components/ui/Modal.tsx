"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

/**
 * Accessible modal dialog — ESC to close, backdrop click to close,
 * body scroll lock, and initial focus on the dialog.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // ESC to close + body scroll lock
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus into the dialog
    requestAnimationFrame(() => dialogRef.current?.focus());

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={cn(
          "relative w-full bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-xl",
          "border border-gray-200 dark:border-gray-800 shadow-2xl",
          "outline-none animate-fade-in-up",
          sizeClasses[size],
          "max-h-[90vh] overflow-y-auto"
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
            <div>
              {title && (
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
