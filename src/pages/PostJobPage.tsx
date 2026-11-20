import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useMarketplaceData } from '../hooks/useMarketplaceData';
import { CATEGORY_LABELS, JOB_CATEGORIES, LEVEL_LABELS, type JobCategory } from '../types';

export function PostJobPage() {
  const { userPrivate, switchRole } = useAuth();
  const { postJob } = useMarketplaceData();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<JobCategory>('Graphic Design');
  const [budgetType, setBudgetType] = useState<'fixed' | 'hourly'>('fixed');
  const [budgetMin, setBudgetMin] = useState('3000');
  const [budgetMax, setBudgetMax] = useState('7000');
  const [level, setLevel] = useState<'beginner' | 'intermediate'>('beginner');
  const [deadline, setDeadline] = useState('2026-12-15');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!userPrivate) return null;

  if (userPrivate.role !== 'client') {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-2xl p-8">
          <h1 className="font-display text-xl font-bold text-neutral-900 dark:text-white">
            Переключитесь в режим заказчика, чтобы разместить заказ
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
            Сейчас включён режим исполнителя. Переключите роль на «Заказчик», чтобы публиковать задачи и принимать отклики.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => switchRole('client')}
              className="px-4 py-2.5 rounded-lg bg-brand text-brand-ink text-xs font-semibold hover:bg-brand-hover"
            >
              Включить режим заказчика
            </button>
            <Link
              to="/jobs"
              className="px-4 py-2.5 rounded-lg border border-neutral-300 dark:border-dark-border text-xs font-medium text-neutral-700 dark:text-neutral-200"
            >
              К ленте заказов
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const created = await postJob({
        title,
        description,
        category,
        budgetType,
        budgetMin: Number(budgetMin),
        budgetMax: Number(budgetMax),
        level,
        deadline,
      });
      navigate(`/jobs/${created.id}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Не удалось создать заказ.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-10">
      <Link
        to="/jobs"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Назад к ленте заказов</span>
      </Link>

      <div className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-2xl p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
          Разместить безопасный заказ
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Понятное ТЗ, реальные сроки и бюджет в рублях помогут быстро найти сильного молодого исполнителя.
        </p>

        {errorMsg && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-3.5 py-2.5 text-xs text-rose-800 dark:text-rose-200"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label htmlFor="job-title" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Название заказа
            </label>
            <input
              id="job-title"
              type="text"
              required
              maxLength={140}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Сделать 4 обложки для подкаста в минимализме"
              className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="job-category" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Категория
              </label>
              <select
                id="job-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as JobCategory)}
                className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
              >
                {JOB_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="job-level" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Уровень исполнителя
              </label>
              <select
                id="job-level"
                value={level}
                onChange={(e) => setLevel(e.target.value as 'beginner' | 'intermediate')}
                className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="beginner">{LEVEL_LABELS.beginner} (подойдёт новичкам)</option>
                <option value="intermediate">{LEVEL_LABELS.intermediate}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="job-budget-type" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Формат оплаты
              </label>
              <select
                id="job-budget-type"
                value={budgetType}
                onChange={(e) => setBudgetType(e.target.value as 'fixed' | 'hourly')}
                className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="fixed">Фиксированная цена</option>
                <option value="hourly">Почасовая ставка</option>
              </select>
            </div>

            <div>
              <label htmlFor="job-min" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Мин. бюджет (₽)
              </label>
              <input
                id="job-min"
                type="number"
                min={100}
                max={500000}
                required
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-neutral-900 dark:text-white font-mono text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div>
              <label htmlFor="job-max" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Макс. бюджет (₽)
              </label>
              <input
                id="job-max"
                type="number"
                min={100}
                max={500000}
                required
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-neutral-900 dark:text-white font-mono text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>

          <div>
            <label htmlFor="job-deadline" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Желаемый срок сдачи
            </label>
            <input
              id="job-deadline"
              type="date"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label htmlFor="job-desc" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Описание задачи и ожидаемый результат
            </label>
            <textarea
              id="job-desc"
              rows={5}
              required
              maxLength={4000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опишите точный результат, форматы файлов и пожелания по стилю..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-5 py-3 rounded-lg bg-brand text-brand-ink text-sm font-semibold hover:bg-brand-hover transition-colors disabled:opacity-50"
          >
            {submitting ? 'Публикация...' : 'Опубликовать заказ'}
          </button>
        </form>
      </div>
    </div>
  );
}
