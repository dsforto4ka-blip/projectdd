import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowUpRight } from 'lucide-react';
import { CATEGORY_LABELS, LEVEL_LABELS, type Job } from '../types';
import { formatTimestamp } from '../lib/firestoreService';
import { formatCurrency } from '../lib/rules';

interface JobCardProps {
  job: Job;
}

export function JobCard({ job }: JobCardProps) {
  const budgetLabel =
    job.budgetType === 'fixed'
      ? `${job.budgetMin.toLocaleString('ru-RU')}–${formatCurrency(job.budgetMax)} · Фикс`
      : `${job.budgetMin.toLocaleString('ru-RU')}–${formatCurrency(job.budgetMax)}/час`;

  return (
    <article className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-xl p-5 hover:border-brand dark:hover:border-brand transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="font-medium text-brand-text dark:text-brand">
              {CATEGORY_LABELS[job.category] || job.category}
            </span>
            <span aria-hidden="true">·</span>
            <span>{LEVEL_LABELS[job.level] || job.level}</span>
            <span aria-hidden="true">·</span>
            <span>Опубликован {formatTimestamp(job.createdAt)}</span>
            {job.clientVerified && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-brand-text dark:text-brand font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Заказчик проверен</span>
                </span>
              </>
            )}
          </div>

          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white leading-snug">
            <Link to={`/jobs/${job.id}`} className="hover:text-brand-text dark:hover:text-brand transition-colors">
              {job.title}
            </Link>
          </h2>

          <p className="text-sm text-neutral-600 dark:text-neutral-300 line-clamp-2 leading-relaxed max-w-3xl">
            {job.description}
          </p>

          <div className="pt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
            <span>Заказчик: {job.clientName}</span>
            <span aria-hidden="true">·</span>
            <span>Срок: {job.deadline}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">Откликов: {job.bidCount}</span>
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0 pt-1 sm:pt-0">
          <p className="font-mono text-base font-semibold text-neutral-900 dark:text-white tabular-nums whitespace-nowrap">
            {budgetLabel}
          </p>
          <Link
            to={`/jobs/${job.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-neutral-900 dark:bg-brand text-white dark:text-brand-ink hover:bg-brand hover:text-brand-ink dark:hover:bg-brand-hover transition-colors whitespace-nowrap shrink-0"
          >
            <span>Подробнее</span>
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
