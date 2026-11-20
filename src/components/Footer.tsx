import { Link } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { useAppStore } from '../lib/store';

export function Footer() {
  const darkMode = useAppStore((s) => s.darkMode);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);

  return (
    <footer className="border-t border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-surface mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
          <span className="font-display font-semibold text-neutral-900 dark:text-neutral-100">
            VibeWorking
          </span>
          <span aria-hidden="true">·</span>
          <span>Российская фриланс-биржа для подростков (13–17 лет)</span>
          <span aria-hidden="true">·</span>
          <span>Эскроу в ₽ и согласие родителей (ст. 26 ГК РФ)</span>
        </div>

        <div className="flex flex-wrap items-center gap-5 text-xs text-neutral-600 dark:text-neutral-400">
          <Link to="/jobs" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
            Биржа заказов
          </Link>
          <Link to="/parent-consent" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
            Кабинет родителя
          </Link>
          <Link to="/auth" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
            Войти
          </Link>
          <button
            type="button"
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
            className="inline-flex items-center gap-1.5 text-neutral-700 dark:text-neutral-200 hover:text-brand-text dark:hover:text-brand transition-colors"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 text-brand" /> : <Moon className="w-3.5 h-3.5" />}
            <span>{darkMode ? 'Светлая' : 'Тёмная'}</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
