"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

type PendingButtonProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  pendingLabel?: string;
  pendingText?: string;
  title?: string;
  type?: "submit" | "button";
};

export function PendingButton({
  children,
  className,
  disabled,
  pendingLabel = "Processando...",
  pendingText,
  title,
  type = "submit",
}: PendingButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      className={className}
      disabled={disabled || pending}
      title={title}
      type={type}
    >
      {pending ? (
        <>
          <Loader2 className="spin-icon" size={17} />
          {pendingText ?? pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
