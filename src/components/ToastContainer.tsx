import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useAppStore } from '../lib/store';

export function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);
  const dismissToast = useAppStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => {
        const Icon =
          toast.tone === 'success'
            ? CheckCircle2
            : toast.tone === 'error'
              ? AlertCircle
              : Info;
        const borderClass =
          toast.tone === 'success'
            ? 'border-brand/40 dark:border-brand/35 text-neutral-900 dark:text-neutral-100'
            : toast.tone === 'error'
              ? 'border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100'
              : 'border-neutral-200 dark:border-dark-border text-neutral-900 dark:text-neutral-100';

        const iconClass =
          toast.tone === 'error'
            ? 'text-rose-600 dark:text-rose-400'
            : 'text-brand-text dark:text-brand';

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 bg-white dark:bg-dark-surface border ${borderClass} rounded-xl px-4 py-3 shadow-sm`}
          >
            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconClass}`} aria-hidden="true" />
            <p className="text-sm flex-1 leading-snug">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Скрыть уведомление"
              className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
