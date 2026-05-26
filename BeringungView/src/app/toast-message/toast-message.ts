import { Component, inject } from '@angular/core';

import { ToastService } from '../services/toast-message.service';

@Component({
  selector: 'app-toast-message',
  imports: [],
  templateUrl: './toast-message.html',
  styleUrl: './toast-message.css',
})
export class ToastMessage {
  protected readonly toastService = inject(ToastService);

  protected readonly typeClasses = {
    success: 'border-[color:var(--accent-500)]/30 bg-[color:var(--accent-100)]/95 text-[color:var(--accent-700)] shadow-[0_18px_35px_rgba(25,162,123,0.16)]',
    info: 'border-[color:var(--brand-300)]/40 bg-[color:var(--surface)]/95 text-[color:var(--ink-700)] shadow-[0_18px_35px_rgba(42,110,216,0.14)]',
    warning: 'border-[color:var(--warning-500)]/30 bg-[color:var(--warning-100)]/95 text-[color:var(--ink-700)] shadow-[0_18px_35px_rgba(217,119,6,0.14)]',
    error: 'border-[color:var(--danger-500)]/30 bg-[color:var(--danger-100)]/95 text-[color:var(--ink-700)] shadow-[0_18px_35px_rgba(220,38,38,0.15)]',
  } as const;

  protected readonly iconClasses = {
    success: 'bg-[color:var(--accent-500)]/15 text-[color:var(--accent-700)]',
    info: 'bg-[color:var(--brand-500)]/15 text-[color:var(--brand-700)]',
    warning: 'bg-[color:var(--warning-500)]/15 text-[color:var(--warning-500)]',
    error: 'bg-[color:var(--danger-500)]/15 text-[color:var(--danger-500)]',
  } as const;
}
