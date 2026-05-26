import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastMessageItem {
  id: string;
  message: string;
  type: ToastType;
  closing: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<ToastMessageItem[]>([]);

  private readonly closeAnimationMs = 380;
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  show(message: string, type: ToastType = 'info', durationMs = 4500): string {
    const id = this.createId();

    this.toasts.update((current) => [
      ...current,
      { id, message, type, closing: false },
    ]);

    if (durationMs > 0) {
      const timer = setTimeout(() => this.dismiss(id), durationMs);
      this.timers.set(id, timer);
    }

    return id;
  }

  success(message: string, durationMs = 4500): string {
    return this.show(message, 'success', durationMs);
  }

  info(message: string, durationMs = 4500): string {
    return this.show(message, 'info', durationMs);
  }

  warning(message: string, durationMs = 4500): string {
    return this.show(message, 'warning', durationMs);
  }

  error(message: string, durationMs = 4500): string {
    return this.show(message, 'error', durationMs);
  }

  dismiss(id: string): void {
    const existing = this.toasts().find((toast) => toast.id === id);

    if (!existing || existing.closing) {
      return;
    }

    this.clearTimer(id);

    this.toasts.update((current) =>
      current.map((toast) =>
        toast.id === id ? { ...toast, closing: true } : toast,
      ),
    );

    const removalTimer = setTimeout(() => {
      this.toasts.update((current) => current.filter((toast) => toast.id !== id));
      this.timers.delete(id);
    }, this.closeAnimationMs);

    this.timers.set(id, removalTimer);
  }

  clear(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }

    this.timers.clear();
    this.toasts.set([]);
  }

  private clearTimer(id: string): void {
    const timer = this.timers.get(id);

    if (!timer) {
      return;
    }

    clearTimeout(timer);
    this.timers.delete(id);
  }

  private createId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}