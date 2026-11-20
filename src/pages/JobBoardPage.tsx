import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useMarketplaceData } from '../hooks/useMarketplaceData';
import { CATEGORY_LABELS, JOB_CATEGORIES, LEVEL_LABELS, type JobCategory } from '../types';
import { JobCard } from '../components/JobCard';

const PAGE_SIZE = 6;

const PAYMENT_TYPE_LABELS: Record<'all' | 'fixed' | 'hourly', string> = {
  all: 'Все',
  fixed: 'Фикс',
  hourly: 'Час',
};

const LEVEL_FILTER_LABELS: Record<'all' | 'beginner' | 'intermediate', string> = {
  all: 'Любой',
  beginner: LEVEL_LABELS.beginner,
  intermediate: LEVEL_LABELS.intermediate,
};

export function JobBoardPage() {
  const { userPrivate, firebaseUser, isAdmin, switchRole } = useAuth();
  const { jobs, loadingJobs, seedStarterCatalog } = useMarketplaceData();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | JobCategory>('all');
  const [budgetType, setBudgetType] = useState<'all' | 'fixed' | 'hourly'>('all');
  const [level, setLevel] = useState<'all' | 'beginner' | 'intermediate'>('all');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    const minVal = minBudget ? Number(minBudget) : null;
    const maxVal = maxBudget ? Number(maxBudget) : null;

    return jobs.filter((job) => {
      if (job.moderationStatus === 'rejected' || job.status === 'rejected') return false;
      if (category !== 'all' && job.category !== category) return false;
      if (budgetType !== 'all' && job.budgetType !== budgetType) return false;
      if (level !== 'all' && job.level !== level) return false;
      if (verifiedOnly && !job.clientVerified) return false;
      if (minVal !== null && job.budgetMax < minVal) return false;
      if (maxVal !== null && job.budgetMin > maxVal) return false;
      if (q) {
        const localizedCat = CATEGORY_LABELS[job.category] || job.category;
        const hay = `${job.title} ${job.description} ${job.category} ${localizedCat} ${job.clientName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [jobs, search, category, budgetType, level, minBudget, maxBudget, verifiedOnly]);

  const visibleJobs = filteredJobs.slice(0, visibleCount);

  const resetFilters = () => {
    setSearch('');
    setCategory('all');
    setBudgetType('all');
    setLevel('all');
    setMinBudget('');
    setMaxBudget('');
    setVerifiedOnly(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-dark-border">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">
            Лента заказов для подростков
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Найдено заказов: <span className="font-mono tabular-nums">{filteredJobs.length}</span> · дизайн, монтаж, вёрстка, учёба и тексты.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {userPrivate && userPrivate.role === 'freelancer' && (
            <button
              type="button"
              onClick={() => switchRole('client')}
              className="px-3.5 py-2 rounded-lg border border-neutral-300 dark:border-dark-border text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-dark-surface whitespace-nowrap"
            >
              Переключиться на заказчика
            </button>
          )}
          <Link
            to="/jobs/new"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-brand text-brand-ink text-xs font-semibold hover:bg-brand-hover transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Разместить заказ</span>
          </Link>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <aside className="lg:col-span-3 bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-900 dark:text-white">
              <SlidersHorizontal className="w-3.5 h-3.5 text-brand-text dark:text-brand" aria-hidden="true" />
              <span>Фильтры</span>
            </span>
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-brand-text dark:text-brand hover:underline"
            >
              Сбросить
            </button>
          </div>

          <div>
            <label htmlFor="filter-category" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Категория
            </label>
            <select
              id="filter-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as 'all' | JobCategory)}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="all">Все категории</option>
              {JOB_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Формат оплаты
            </span>
            <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-100 dark:bg-dark-input rounded-lg">
              {(['all', 'fixed', 'hourly'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setBudgetType(type)}
                  className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    budgetType === type
                      ? 'bg-white dark:bg-dark-elevated text-neutral-900 dark:text-white shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {PAYMENT_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Уровень опыта
            </span>
            <div className="flex flex-wrap gap-1 p-1 bg-neutral-100 dark:bg-dark-input rounded-lg">
              {(['all', 'beginner', 'intermediate'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevel(lvl)}
                  className={`flex-1 py-1.5 px-2.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    level === lvl
                      ? 'bg-white dark:bg-dark-elevated text-neutral-900 dark:text-white shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {LEVEL_FILTER_LABELS[lvl]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="filter-min" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Мин (₽)
              </label>
              <input
                id="filter-min"
                type="number"
                min={0}
                value={minBudget}
                onChange={(e) => setMinBudget(e.target.value)}
                placeholder="1000"
                className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-neutral-900 dark:text-white font-mono text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div>
              <label htmlFor="filter-max" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Макс (₽)
              </label>
              <input
                id="filter-max"
                type="number"
                min={0}
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                placeholder="20000"
                className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-neutral-900 dark:text-white font-mono text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="rounded border-neutral-300 accent-brand focus:ring-brand"
            />
            <span>Только проверенные заказчики</span>
          </label>
        </aside>

        {/* Job List */}
        <div className="lg:col-span-9 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Поиск заказов по ключевым словам"
              placeholder="Поиск: обложки, CapCut, лендинг, математика..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-surface text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          {loadingJobs && jobs.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-xl bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border animate-pulse" />
              ))}
            </div>
          ) : visibleJobs.length === 0 ? (
            <div className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-xl p-10 text-center">
              <p className="text-base font-semibold text-neutral-900 dark:text-white">
                {jobs.length === 0
                  ? 'Опубликованных заказов пока нет'
                  : 'Подходящих заказов по выбранным фильтрам пока нет'}
              </p>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                {jobs.length === 0
                  ? 'Разместите первый заказ для подростков или загрузите стартовый каталог.'
                  : 'Попробуйте сбросить часть фильтров или выбрать другую категорию.'}
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                {jobs.length > 0 && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="px-4 py-2 rounded-lg border border-neutral-300 dark:border-dark-border text-xs font-semibold text-neutral-700 dark:text-neutral-200"
                  >
                    Сбросить фильтры
                  </button>
                )}
                {firebaseUser && isAdmin && jobs.length === 0 && (
                  <button
                    type="button"
                    onClick={seedStarterCatalog}
                    className="px-4 py-2 rounded-lg border border-brand-border dark:border-brand/40 text-xs font-semibold text-brand-text dark:text-brand hover:bg-brand-soft dark:hover:bg-brand/10"
                  >
                    Загрузить стартовые заказы
                  </button>
                )}
                <Link
                  to="/jobs/new"
                  className="px-4 py-2 rounded-lg bg-brand text-brand-ink text-xs font-semibold hover:bg-brand-hover"
                >
                  Разместить заказ
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {visibleJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
              {visibleCount < filteredJobs.length && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className="px-5 py-2.5 rounded-lg border border-neutral-300 dark:border-dark-border text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-dark-surface"
                  >
                    Показать ещё (осталось {filteredJobs.length - visibleCount})
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
