"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export function useStableForm<T extends Record<string, any>>(initial: T) {
  const [form, setForm] = useState<T>(initial);
  const formRef = useRef(form);
  formRef.current = form;

  const update = useCallback((key: keyof T, value: any) => {
    setForm(prev => {
      if (prev[key] === value) return prev;
      return { ...prev, [key]: value };
    });
  }, []);

  const reset = useCallback((vals?: Partial<T>) => {
    setForm(vals ? { ...initial, ...vals } as T : { ...initial });
  }, [initial]);

  return { form, update, reset, setForm, formRef };
}

export function useBodyScrollLock(active: boolean) {
  const prevRef = useRef("");

  useEffect(() => {
    if (!active) return;
    prevRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevRef.current;
    };
  }, [active]);
}
