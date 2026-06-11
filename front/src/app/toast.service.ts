import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// Para el mensaje de que ha finalizado una ejecución

export interface Toast {
  id: number;
  message: string;
  executionId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toasts: Toast[] = [];
  private toastIdCounter = 0;

  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  public toasts$ = this.toastsSubject.asObservable();

  constructor() { }

  addToast(message: string, executionId?: string): void {
    const toast: Toast = { id: this.toastIdCounter++, message, executionId };
    this.toasts = [...this.toasts, toast];
    this.toastsSubject.next(this.toasts);
  }

  removeToast(toastId: number): void {
    this.toasts = this.toasts.filter(t => t.id !== toastId);
    this.toastsSubject.next(this.toasts);
  }
}
