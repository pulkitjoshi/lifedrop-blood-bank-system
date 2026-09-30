import { Injectable, signal } from '@angular/core';

export type ToastType = '' | 'success' | 'error';

@Injectable({ providedIn: 'root' })
export class ToastService {
  message = signal('');
  type = signal<ToastType>('');
  visible = signal(false);
  private timer: ReturnType<typeof setTimeout> | null = null;

  show(message: string, type: ToastType = '') {
    this.message.set(message);
    this.type.set(type);
    this.visible.set(true);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.visible.set(false), 3000);
  }
}
