import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message || 'Произошла непредвиденная ошибка.' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Uncaught UI error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-dark-canvas px-6">
          <div className="max-w-lg w-full bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-xl p-8">
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              Что-то пошло не так
            </h1>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
              При загрузке этого раздела произошла ошибка. Вы можете перезагрузить страницу и вернуться на главную.
            </p>
            <pre className="mt-4 p-3 rounded-lg bg-neutral-50 dark:bg-dark-input border border-neutral-200 dark:border-dark-border text-xs font-mono text-rose-700 dark:text-rose-400 overflow-x-auto">
              {this.state.errorMessage}
            </pre>
            <button
              type="button"
              onClick={() => window.location.assign(import.meta.env.BASE_URL)}
              className="mt-6 px-4 py-2 text-sm font-semibold rounded-lg bg-brand text-brand-ink hover:bg-brand-hover transition-colors"
            >
              На главную
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
