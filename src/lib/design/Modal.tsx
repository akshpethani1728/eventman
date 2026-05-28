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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div ref={overlayRef} className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={`relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-xl animate-scale-in max-h-[85vh] overflow-y-auto ${className}`}>
        {title && (
          <div className="sticky top-0 bg-white border-b border-gray-100 z-10 px-4 h-14 flex items-center justify-between rounded-t-2xl">
            <h2 className="font-semibold text-sm text-gray-900">{title}</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="p-4">
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
    danger: "bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-sm shadow-red-600/20 hover:shadow-md",
    warning: "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
    primary: "bg-gradient-to-r from-blue-600 to-blue-500 text-white",
  };
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-gray-600 mb-5">{message}</p>
      <div className="flex gap-3">
        <button onClick={onClose}
          className="flex-1 h-11 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 active:scale-[0.98] transition-all">
          Cancel
        </button>
        <button onClick={() => { onConfirm(); onClose(); }}
          className={`flex-1 h-11 rounded-xl text-sm font-semibold active:scale-[0.98] transition-all ${variantStyles[variant]}`}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
