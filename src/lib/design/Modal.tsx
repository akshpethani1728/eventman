"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className = "" }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div ref={overlayRef} className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={`relative w-full sm:max-w-lg bg-white rounded-[26px] sm:rounded-[26px] shadow-[0_16px_40px_rgba(0,0,0,0.12),0_4px_8px_rgba(0,0,0,0.04)] animate-scale-in max-h-[90vh] overflow-y-auto ${className}`}>
        {title && (
          <div className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-gray-100 z-10 px-6 h-14 flex items-center justify-between rounded-[26px]">
            <h2 className="font-semibold text-base text-gray-900">{title}</h2>
            <button onClick={onClose} className="w-9 h-9 rounded-[14px] flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "warning" | "primary";
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = "Confirm", variant = "danger" }: ConfirmDialogProps) {
  const variantStyles = {
    danger: "bg-gradient-to-br from-red-600 to-red-700 text-white shadow-[0_2px_8px_rgba(220,38,38,0.2)] hover:shadow-[0_4px_12px_rgba(220,38,38,0.3)] active:scale-[0.97] transition-all",
    warning: "bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-[0_2px_8px_rgba(217,119,6,0.2)] hover:shadow-[0_4px_12px_rgba(217,119,6,0.3)] active:scale-[0.97] transition-all",
    primary: "btn-primary active:scale-[0.97] transition-all",
  };
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-gray-600 leading-relaxed mb-6">{message}</p>
      <div className="flex gap-3">
        <button onClick={onClose}
          className="btn-base flex-1 h-12 rounded-[14px] btn-secondary text-sm font-semibold">
          Cancel
        </button>
        <button onClick={() => { onConfirm(); onClose(); }}
          className={`btn-base flex-1 h-12 rounded-[14px] text-sm font-semibold ${variantStyles[variant]}`}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
