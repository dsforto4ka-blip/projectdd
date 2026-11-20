import { useState } from 'react';
import { Shield, Users, Briefcase, AlertTriangle, MessageSquareOff, BarChart3 } from 'lucide-react';
import { useMarketplaceData } from '../hooks/useMarketplaceData';
import { formatCurrency } from '../lib/rules';
import { StatusText } from '../components/StatusText';

type AdminTab = 'analytics' | 'disputes' | 'users' | 'jobs' | 'contracts' | 'reviews';

const RESOLUTION_LABELS: Record<'none' | 'release_freelancer' | 'refund_client' | 'split_50_50', string> = {
  none: 'Без решения',
  release_freelancer: 'Выплачено исполнителю',
  refund_client: 'Возврат заказчику',
  split_50_50: 'Разделено 50 / 50',
};

const AGE_GROUP_TEXT: Record<string, string> = {
  '13_17': '13–17 лет',
  '18_plus': '18+',
  under_13: 'до 13 лет',
  unverified: 'не подтверждён',
};

export function AdminPage() {
  const {
    users,
    jobs,
    bids,
    contracts,
    disputes,
    reviews,
    adminToggleUserBan,
    adminManualVerifyUser,
    adminModerateJob,
    resolveDispute,
    adminToggleReviewVisibility,
  } = useMarketplaceData();

  const [tab, setTab] = useState<AdminTab>('disputes');
  const [userSearch, setUserSearch] = useState('');
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const filteredUsers = users.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return `${u.displayName} ${u.email} ${u.uid}`.toLowerCase().includes(q);
  });

  const avgTicket =
    contracts.length > 0
      ? contracts.reduce((sum, c) => sum + c.totalAmount, 0) / contracts.length
      : 0;
  const bidToHirePct =
    bids.length > 0 ? Math.round((contracts.length / bids.length) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      <div className="pb-6 border-b border-neutral-200 dark:border-dark-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-text dark:text-brand">
            <Shield className="w-4 h-4" aria-hidden="true" />
            <span>Панель безопасности и модерации</span>
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">
            Управление VibeWorking
          </h1>
        </div>

        {/* Navigation Segmented Tabs */}
        <div className="flex flex-wrap gap-1 p-1 bg-neutral-100 dark:bg-dark-input rounded-xl">
          {(
            [
              { id: 'disputes', label: `Споры (${disputes.filter((d) => d.status !== 'resolved').length})` },
              { id: 'users', label: 'Пользователи' },
              { id: 'jobs', label: 'Заказы' },
              { id: 'contracts', label: 'Эскроу' },
              { id: 'reviews', label: 'Отзывы' },
              { id: 'analytics', label: 'Аналитика' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                tab === item.id
                  ? 'bg-white dark:bg-dark-elevated text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Analytics View */}
      {tab === 'analytics' && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-xl p-5">
            <BarChart3 className="w-4 h-4 text-brand-text dark:text-brand mb-2" aria-hidden="true" />
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Активных аккаунтов</p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums">
              {users.filter((u) => u.accountStatus === 'active').length}
            </p>
          </div>
          <div className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-xl p-5">
            <Briefcase className="w-4 h-4 text-brand-text dark:text-brand mb-2" aria-hidden="true" />
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Всего заказов</p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums">{jobs.length}</p>
          </div>
          <div className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-xl p-5">
            <Users className="w-4 h-4 text-brand-text dark:text-brand mb-2" aria-hidden="true" />
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Средний чек контракта</p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums">{formatCurrency(Math.round(avgTicket))}</p>
          </div>
          <div className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-xl p-5">
            <AlertTriangle className="w-4 h-4 text-brand-text dark:text-brand mb-2" aria-hidden="true" />
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Конверсия отклика в наём</p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums">{bidToHirePct}%</p>
          </div>
        </section>
      )}

      {/* Disputes Arbitration Queue */}
      {tab === 'disputes' && (
        <section className="space-y-4">
          {disputes.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 py-8 text-center">Споров в очереди нет.</p>
          ) : (
            disputes.map((d) => (
              <div
                key={d.id}
                className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-xl p-6 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                      <StatusText status={d.status} />
                      <span>·</span>
                      <span className="font-mono">Контракт: {d.contractId}</span>
                    </div>
                    <h2 className="mt-1 text-lg font-semibold text-neutral-900 dark:text-white">
                      {d.jobTitle} — {d.reason}
                    </h2>
                  </div>
                  {d.resolution !== 'none' && (
                    <span className="text-xs font-semibold text-brand-text dark:text-brand">
                      Решение: {RESOLUTION_LABELS[d.resolution]}
                    </span>
                  )}
                </div>

                <p className="text-sm text-neutral-600 dark:text-neutral-300">{d.description}</p>

                {d.evidenceUrls.length > 0 && (
                  <div className="text-xs">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">Материалы: </span>
                    {d.evidenceUrls.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" className="text-brand-text dark:text-brand underline mr-3">
                        {url}
                      </a>
                    ))}
                  </div>
                )}

                {d.status !== 'resolved' && (
                  <div className="pt-3 border-t border-neutral-200 dark:border-dark-border space-y-3">
                    <input
                      type="text"
                      value={adminNotes[d.id] || ''}
                      onChange={(e) => setAdminNotes((prev) => ({ ...prev, [d.id]: e.target.value }))}
                      placeholder="Комментарий арбитража с обоснованием решения..."
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-xs text-neutral-900 dark:text-white"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => resolveDispute(d, 'release_freelancer', adminNotes[d.id] || 'Выплачено исполнителю')}
                        className="px-3.5 py-2 rounded-lg bg-brand text-brand-ink text-xs font-semibold hover:bg-brand-hover"
                      >
                        Выплатить исполнителю
                      </button>
                      <button
                        type="button"
                        onClick={() => resolveDispute(d, 'split_50_50', adminNotes[d.id] || 'Разделено 50/50')}
                        className="px-3.5 py-2 rounded-lg border border-neutral-300 dark:border-dark-border bg-neutral-900 dark:bg-dark-elevated text-white text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-dark-border"
                      >
                        Разделить 50 / 50
                      </button>
                      <button
                        type="button"
                        onClick={() => resolveDispute(d, 'refund_client', adminNotes[d.id] || 'Возвращено заказчику')}
                        className="px-3.5 py-2 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        Вернуть заказчику
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      )}

      {/* Users Management */}
      {tab === 'users' && (
        <section className="space-y-4">
          <input
            type="search"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Поиск по имени или email..."
            className="w-full max-w-md px-3.5 py-2 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-surface text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
          />

          <div className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-200 dark:border-dark-border text-neutral-500 dark:text-neutral-400">
                <tr>
                  <th className="py-3 px-4 font-semibold">Пользователь</th>
                  <th className="py-3 px-4 font-semibold">Роль и возраст</th>
                  <th className="py-3 px-4 font-semibold">Согласие родителя</th>
                  <th className="py-3 px-4 font-semibold">Статус</th>
                  <th className="py-3 px-4 font-semibold text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-dark-border">
                {filteredUsers.map((u) => (
                  <tr key={u.uid}>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-neutral-900 dark:text-white">{u.displayName}</p>
                      <p className="text-neutral-500 dark:text-neutral-400">{u.email}</p>
                    </td>
                    <td className="py-3 px-4">
                      {u.role === 'client' ? 'Заказчик' : 'Исполнитель'} · {AGE_GROUP_TEXT[u.ageGroup] || u.ageGroup}
                    </td>
                    <td className="py-3 px-4">
                      <StatusText status={u.parentalConsentStatus} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusText status={u.accountStatus} />
                    </td>
                    <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                      {!u.idVerified && (
                        <button
                          type="button"
                          onClick={() => adminManualVerifyUser(u)}
                          className="px-2.5 py-1 rounded border border-brand-border dark:border-brand/40 text-brand-text dark:text-brand font-semibold"
                        >
                          Подтвердить
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => adminToggleUserBan(u)}
                        className={`px-2.5 py-1 rounded font-semibold ${
                          u.isBanned
                            ? 'border border-neutral-300 dark:border-dark-border text-neutral-700 dark:text-neutral-200'
                            : 'border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {u.isBanned ? 'Разблокировать' : 'Заблокировать'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Jobs Moderation */}
      {tab === 'jobs' && (
        <section className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 dark:border-dark-border text-neutral-500 dark:text-neutral-400">
              <tr>
                <th className="py-3 px-4 font-semibold">Заказ</th>
                <th className="py-3 px-4 font-semibold">Заказчик</th>
                <th className="py-3 px-4 font-semibold">Бюджет</th>
                <th className="py-3 px-4 font-semibold">Модерация</th>
                <th className="py-3 px-4 font-semibold text-right">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-dark-border">
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td className="py-3 px-4 font-semibold text-neutral-900 dark:text-white">{j.title}</td>
                  <td className="py-3 px-4">{j.clientName}</td>
                  <td className="py-3 px-4 font-mono tabular-nums">
                    {j.budgetMin.toLocaleString('ru-RU')}–{formatCurrency(j.budgetMax)}
                  </td>
                  <td className="py-3 px-4">
                    <StatusText status={j.moderationStatus} />
                  </td>
                  <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => adminModerateJob(j, 'approved')}
                      className="px-2.5 py-1 rounded border border-brand-border dark:border-brand/40 text-brand-text dark:text-brand font-semibold"
                    >
                      Одобрить
                    </button>
                    <button
                      type="button"
                      onClick={() => adminModerateJob(j, 'rejected')}
                      className="px-2.5 py-1 rounded border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 font-semibold"
                    >
                      Отклонить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Contracts & Escrow */}
      {tab === 'contracts' && (
        <section className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 dark:border-dark-border text-neutral-500 dark:text-neutral-400">
              <tr>
                <th className="py-3 px-4 font-semibold">Проект</th>
                <th className="py-3 px-4 font-semibold">Стороны</th>
                <th className="py-3 px-4 font-semibold">На эскроу</th>
                <th className="py-3 px-4 font-semibold">Выплачено</th>
                <th className="py-3 px-4 font-semibold">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-dark-border">
              {contracts.map((c) => (
                <tr key={c.id}>
                  <td className="py-3 px-4 font-semibold text-neutral-900 dark:text-white">{c.jobTitle}</td>
                  <td className="py-3 px-4">{c.clientName} &rarr; {c.freelancerName}</td>
                  <td className="py-3 px-4 font-mono tabular-nums">{formatCurrency(c.escrowBalance)}</td>
                  <td className="py-3 px-4 font-mono tabular-nums">{formatCurrency(c.releasedAmount)}</td>
                  <td className="py-3 px-4"><StatusText status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Reviews Moderation */}
      {tab === 'reviews' && (
        <section className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-xl p-5 flex items-start justify-between gap-4"
            >
              <div>
                <p className="text-xs font-semibold text-neutral-900 dark:text-white">
                  {r.authorName} · {r.rating}/5 {r.isHidden ? '(Скрыт)' : ''}
                </p>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{r.comment}</p>
              </div>
              <button
                type="button"
                onClick={() => adminToggleReviewVisibility(r)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-dark-border text-xs font-semibold shrink-0 hover:bg-neutral-50 dark:hover:bg-dark-elevated"
              >
                <MessageSquareOff className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{r.isHidden ? 'Показать' : 'Скрыть отзыв'}</span>
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
