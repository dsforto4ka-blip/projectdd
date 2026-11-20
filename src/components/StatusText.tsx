import { CheckCircle2, Clock, AlertTriangle, XCircle, ShieldCheck } from 'lucide-react';

interface StatusTextProps {
  status: string;
}

const STATUS_MAP: Record<string, { label: string; colorClass: string; Icon: typeof CheckCircle2 }> = {
  active: { label: 'Активен', colorClass: 'text-brand-text dark:text-brand', Icon: CheckCircle2 },
  open: { label: 'Открыт', colorClass: 'text-brand-text dark:text-brand', Icon: CheckCircle2 },
  approved: { label: 'Одобрен', colorClass: 'text-brand-text dark:text-brand', Icon: CheckCircle2 },
  completed: { label: 'Завершён', colorClass: 'text-brand-text dark:text-brand', Icon: CheckCircle2 },
  hired: { label: 'Нанят', colorClass: 'text-brand-text dark:text-brand', Icon: ShieldCheck },
  in_progress: { label: 'В работе', colorClass: 'text-brand-text dark:text-brand', Icon: Clock },
  submitted: { label: 'На проверке', colorClass: 'text-sky-700 dark:text-sky-400', Icon: Clock },
  interviewing: { label: 'Собеседование', colorClass: 'text-sky-700 dark:text-sky-400', Icon: Clock },
  pending: { label: 'Ожидает', colorClass: 'text-amber-700 dark:text-amber-400', Icon: Clock },
  pending_parental_consent: { label: 'Ждёт согласия родителя', colorClass: 'text-amber-700 dark:text-amber-400', Icon: Clock },
  revision_requested: { label: 'Нужна доработка', colorClass: 'text-amber-700 dark:text-amber-400', Icon: AlertTriangle },
  disputed: { label: 'Спор', colorClass: 'text-rose-700 dark:text-rose-400', Icon: AlertTriangle },
  resolved: { label: 'Урегулирован', colorClass: 'text-neutral-700 dark:text-neutral-300', Icon: ShieldCheck },
  suspended: { label: 'Приостановлен', colorClass: 'text-rose-700 dark:text-rose-400', Icon: XCircle },
  banned: { label: 'Заблокирован', colorClass: 'text-rose-700 dark:text-rose-400', Icon: XCircle },
  rejected: { label: 'Отклонён', colorClass: 'text-rose-700 dark:text-rose-400', Icon: XCircle },
  declined: { label: 'Отклонён', colorClass: 'text-neutral-500 dark:text-neutral-400', Icon: XCircle },
  revoked: { label: 'Отозвано', colorClass: 'text-rose-700 dark:text-rose-400', Icon: XCircle },
  not_required: { label: 'Не требуется', colorClass: 'text-neutral-500 dark:text-neutral-400', Icon: CheckCircle2 },
  blocked_coppa: { label: 'Доступ закрыт (<13)', colorClass: 'text-rose-700 dark:text-rose-400', Icon: XCircle },
  under_review: { label: 'На рассмотрении', colorClass: 'text-amber-700 dark:text-amber-400', Icon: Clock },
};

export function StatusText({ status }: StatusTextProps) {
  const entry = STATUS_MAP[status] || {
    label: status.replace(/_/g, ' '),
    colorClass: 'text-neutral-600 dark:text-neutral-400',
    Icon: Clock,
  };
  const { label, colorClass, Icon } = entry;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${colorClass}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
