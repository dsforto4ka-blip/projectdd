import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Star, MessageSquare, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useMarketplaceData } from '../hooks/useMarketplaceData';
import { formatTimestamp } from '../lib/firestoreService';
import { formatCurrency, MAX_ACTIVE_TEEN_BIDS } from '../lib/rules';
import { StatusText } from '../components/StatusText';
import { CATEGORY_LABELS, LEVEL_LABELS, type Bid, type Milestone } from '../types';

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userPrivate } = useAuth();
  const { jobs, bids, submitBid, inviteToInterview, hireFreelancer } = useMarketplaceData();

  const job = jobs.find((j) => j.id === id);
  const jobBids = useMemo(() => bids.filter((b) => b.jobId === id), [bids, id]);

  const [bidAmount, setBidAmount] = useState(job ? String(job.budgetMin) : '3500');
  const [deliveryDays, setDeliveryDays] = useState('4');
  const [coverLetter, setCoverLetter] = useState('');
  const [portfolioLink, setPortfolioLink] = useState('');
  const [bidError, setBidError] = useState<string | null>(null);
  const [submittingBid, setSubmittingBid] = useState(false);

  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'days'>('price');
  const [hiringBid, setHiringBid] = useState<Bid | null>(null);
  const [milestoneSplit, setMilestoneSplit] = useState<'single' | 'two'>('two');
  const [hiringBusy, setHiringBusy] = useState(false);

  if (!job) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
          Заказ не найден
        </h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Возможно, заказ уже закрыт или удалён.
        </p>
        <Link
          to="/jobs"
          className="mt-6 inline-flex px-4 py-2 rounded-lg bg-brand text-brand-ink text-xs font-semibold hover:bg-brand-hover"
        >
          К ленте заказов
        </Link>
      </div>
    );
  }

  const isClientOwner = userPrivate?.uid === job.clientId;
  const alreadyBid = userPrivate
    ? jobBids.some((b) => b.freelancerId === userPrivate.uid && b.status !== 'withdrawn')
    : false;
  const activeTeenBidsCount = userPrivate
    ? bids.filter(
        (b) => b.freelancerId === userPrivate.uid && (b.status === 'pending' || b.status === 'interviewing')
      ).length
    : 0;

  const sortedBids = [...jobBids].sort((a, b) => {
    if (sortBy === 'price') return a.amount - b.amount;
    if (sortBy === 'rating') return b.freelancerRating - a.freelancerRating;
    return a.deliveryDays - b.deliveryDays;
  });

  const handleBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBidError(null);
    setSubmittingBid(true);
    try {
      await submitBid({
        job,
        amount: Number(bidAmount),
        deliveryDays: Number(deliveryDays),
        coverLetter,
        portfolioLinks: portfolioLink ? [portfolioLink] : [],
      });
      setCoverLetter('');
      setPortfolioLink('');
    } catch (err) {
      setBidError(err instanceof Error ? err.message : 'Не удалось отправить отклик.');
    } finally {
      setSubmittingBid(false);
    }
  };

  const handleInterview = async (bid: Bid) => {
    try {
      const room = await inviteToInterview(bid);
      navigate(`/messages?chat=${room.id}`);
    } catch (err) {
      setBidError(err instanceof Error ? err.message : 'Не удалось открыть чат собеседования.');
    }
  };

  const confirmHire = async () => {
    if (!hiringBid) return;
    setHiringBusy(true);
    try {
      const total = hiringBid.amount;
      const milestones: Milestone[] =
        milestoneSplit === 'two'
          ? [
              {
                id: 'm_1',
                title: 'Этап 1: Черновик и концепция',
                amount: Number((total / 2).toFixed(2)),
                dueDate: job.deadline,
                status: 'pending',
              },
              {
                id: 'm_2',
                title: 'Этап 2: Финальная версия и исходники',
                amount: Number((total - Number((total / 2).toFixed(2))).toFixed(2)),
                dueDate: job.deadline,
                status: 'pending',
              },
            ]
          : [
              {
                id: 'm_1',
                title: 'Полная сдача проекта',
                amount: total,
                dueDate: job.deadline,
                status: 'pending',
              },
            ];

      const contract = await hireFreelancer(job, hiringBid, milestones);
      setHiringBid(null);
      navigate(`/contracts/${contract.id}`);
    } catch (err) {
      setBidError(err instanceof Error ? err.message : 'Не удалось создать контракт.');
    } finally {
      setHiringBusy(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <Link
        to="/jobs"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Назад к ленте заказов</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Brief + Bids */}
        <div className="lg:col-span-8 space-y-6">
          <section className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-2xl p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <span className="font-semibold text-brand-text dark:text-brand">
                {CATEGORY_LABELS[job.category] || job.category}
              </span>
              <span aria-hidden="true">·</span>
              <span>Уровень: {LEVEL_LABELS[job.level] || job.level}</span>
              <span aria-hidden="true">·</span>
              <span>Опубликовано {formatTimestamp(job.createdAt)}</span>
              <span aria-hidden="true">·</span>
              <StatusText status={job.status} />
            </div>

            <h1 className="mt-3 font-display text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white leading-tight">
              {job.title}
            </h1>

            <p className="mt-4 text-sm sm:text-base text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
              {job.description}
            </p>

            {job.attachments.length > 0 && (
              <div className="mt-6 pt-5 border-t border-neutral-200 dark:border-dark-border">
                <h2 className="text-xs font-semibold text-neutral-900 dark:text-white mb-2">
                  Вложения к ТЗ
                </h2>
                <ul className="space-y-1.5">
                  {job.attachments.map((att) => (
                    <li key={att.name}>
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-brand-text dark:text-brand hover:underline"
                      >
                        {att.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Freelancer Proposal Form */}
          {!isClientOwner && job.status === 'open' && (
            <section className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-2xl p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-xl font-bold text-neutral-900 dark:text-white">
                  Откликнуться на заказ
                </h2>
                {userPrivate && (
                  <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
                    Активные отклики: {activeTeenBidsCount}/{MAX_ACTIVE_TEEN_BIDS}
                  </span>
                )}
              </div>

              {!userPrivate ? (
                <div className="mt-4">
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">
                    Войдите в подтверждённый аккаунт, чтобы отправить отклик на этот заказ.
                  </p>
                  <Link
                    to="/auth"
                    className="mt-4 inline-flex px-4 py-2.5 rounded-lg bg-brand text-brand-ink text-xs font-semibold hover:bg-brand-hover"
                  >
                    Войти и откликнуться
                  </Link>
                </div>
              ) : userPrivate.accountStatus !== 'active' ? (
                <div className="mt-4 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4 text-xs text-amber-900 dark:text-amber-200">
                  Отправка откликов откроется после активации аккаунта и получения согласия родителя.
                </div>
              ) : userPrivate.role !== 'freelancer' ? (
                <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                  Сейчас вы в режиме заказчика. Переключитесь в режим исполнителя в профиле, чтобы отправлять отклики.
                </p>
              ) : alreadyBid ? (
                <div className="mt-4 flex items-center gap-2 text-sm font-medium text-brand-text dark:text-brand">
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  <span>Вы уже отправили отклик на этот заказ.</span>
                </div>
              ) : (
                <form onSubmit={handleBidSubmit} className="mt-5 space-y-4">
                  {bidError && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-3.5 py-2.5 text-xs text-rose-800 dark:text-rose-200"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{bidError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="bid-amount" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Ваша ставка (₽)
                      </label>
                      <input
                        id="bid-amount"
                        type="number"
                        min={100}
                        max={500000}
                        required
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-neutral-900 dark:text-white font-mono text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>
                    <div>
                      <label htmlFor="bid-days" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Срок выполнения (дней)
                      </label>
                      <input
                        id="bid-days"
                        type="number"
                        min={1}
                        max={180}
                        required
                        value={deliveryDays}
                        onChange={(e) => setDeliveryDays(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-neutral-900 dark:text-white font-mono text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="bid-cover" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Сопроводительное письмо (контакты скрываются до найма)
                    </label>
                    <textarea
                      id="bid-cover"
                      rows={4}
                      required
                      maxLength={2000}
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      placeholder="Опишите ваш опыт, этапы работы и сроки..."
                      className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>

                  <div>
                    <label htmlFor="bid-link" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Ссылка на пример работы (необязательно)
                    </label>
                    <input
                      id="bid-link"
                      type="url"
                      value={portfolioLink}
                      onChange={(e) => setPortfolioLink(e.target.value)}
                      placeholder="https://behance.net/..."
                      className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingBid}
                    className="px-5 py-2.5 rounded-lg bg-brand text-brand-ink text-sm font-semibold hover:bg-brand-hover transition-colors disabled:opacity-50"
                  >
                    {submittingBid ? 'Отправка...' : 'Отправить отклик'}
                  </button>
                </form>
              )}
            </section>
          )}

          {/* Client Bids Review */}
          {isClientOwner && (
            <section className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-2xl p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <h2 className="font-display text-xl font-bold text-neutral-900 dark:text-white">
                  Отклики ({sortedBids.length})
                </h2>
                <div className="flex items-center gap-2 text-xs">
                  <label htmlFor="bid-sort" className="text-neutral-500 dark:text-neutral-400">
                    Сортировка
                  </label>
                  <select
                    id="bid-sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'price' | 'rating' | 'days')}
                    className="px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-xs text-neutral-900 dark:text-white"
                  >
                    <option value="price">Сначала дешевле</option>
                    <option value="rating">По рейтингу</option>
                    <option value="days">Быстрее по срокам</option>
                  </select>
                </div>
              </div>

              {bidError && (
                <div className="mb-4 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-3.5 py-2.5 text-xs text-rose-800 dark:text-rose-200">
                  {bidError}
                </div>
              )}

              {sortedBids.length === 0 ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400 py-6 text-center">
                  Откликов пока нет. Как только исполнители откликнутся, они появятся здесь.
                </p>
              ) : (
                <div className="divide-y divide-neutral-200 dark:divide-dark-border">
                  {sortedBids.map((bid) => (
                    <div key={bid.id} className="py-5 first:pt-0 last:pb-0 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/profile/${bid.freelancerId}`}
                              className="text-base font-semibold text-neutral-900 dark:text-white hover:text-brand-text dark:hover:text-brand"
                            >
                              {bid.freelancerName}
                            </Link>
                            <span className="inline-flex items-center gap-1 text-xs font-mono text-amber-600 dark:text-amber-400 tabular-nums">
                              <Star className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                              {bid.freelancerRating.toFixed(1)}
                            </span>
                            <StatusText status={bid.status} />
                          </div>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-mono tabular-nums">
                            {formatCurrency(bid.amount)} · срок {bid.deliveryDays} дн.
                          </p>
                        </div>

                        {job.status === 'open' && bid.status !== 'hired' && bid.status !== 'declined' && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleInterview(bid)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-dark-border text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-dark-elevated"
                            >
                              <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Написать в чат</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setHiringBid(bid)}
                              className="px-3.5 py-1.5 rounded-lg bg-brand text-brand-ink text-xs font-semibold hover:bg-brand-hover"
                            >
                              Выбрать
                            </button>
                          </div>
                        )}
                      </div>

                      <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                        {bid.coverLetter}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Sidebar Summary */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-2xl p-6 space-y-4">
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Бюджет проекта</p>
              <p className="mt-1 font-mono text-2xl font-bold text-neutral-900 dark:text-white tabular-nums">
                {job.budgetMin.toLocaleString('ru-RU')}–{formatCurrency(job.budgetMax)}
                <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400 ml-1">
                  {job.budgetType === 'fixed' ? 'фикс' : '/час'}
                </span>
              </p>
            </div>

            <div className="pt-4 border-t border-neutral-200 dark:border-dark-border space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Заказчик</span>
                <Link to={`/profile/${job.clientId}`} className="font-semibold text-neutral-900 dark:text-white hover:underline">
                  {job.clientName}
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Проверка</span>
                <span className="inline-flex items-center gap-1 font-medium text-brand-text dark:text-brand">
                  <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  {job.clientVerified ? 'Паспорт / ID проверен' : 'Email подтверждён'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Срок сдачи</span>
                <span className="font-mono tabular-nums text-neutral-900 dark:text-white">{job.deadline}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Откликов</span>
                <span className="font-mono tabular-nums text-neutral-900 dark:text-white">{job.bidCount}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Hire & Milestone Setup Modal */}
      {hiringBid && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="hire-modal-title"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-2xl max-w-md w-full p-6 space-y-4">
            <h2 id="hire-modal-title" className="font-display text-xl font-bold text-neutral-900 dark:text-white">
              Нанять {hiringBid.freelancerName}
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Сумма контракта: <strong className="font-mono tabular-nums">{formatCurrency(hiringBid.amount)}</strong>. Выберите схему эскроу-этапов:
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setMilestoneSplit('two')}
                className={`w-full p-3 rounded-xl border text-left text-xs transition-colors ${
                  milestoneSplit === 'two'
                    ? 'border-brand bg-brand-soft dark:bg-brand/15'
                    : 'border-neutral-200 dark:border-dark-border'
                }`}
              >
                <p className="font-semibold text-neutral-900 dark:text-white">2 этапа (50% / 50%)</p>
                <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">Черновик и финальная сдача</p>
              </button>
              <button
                type="button"
                onClick={() => setMilestoneSplit('single')}
                className={`w-full p-3 rounded-xl border text-left text-xs transition-colors ${
                  milestoneSplit === 'single'
                    ? 'border-brand bg-brand-soft dark:bg-brand/15'
                    : 'border-neutral-200 dark:border-dark-border'
                }`}
              >
                <p className="font-semibold text-neutral-900 dark:text-white">1 этап (100% по готовности)</p>
                <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">Единая выплата после завершения проекта</p>
              </button>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setHiringBid(null)}
                className="px-4 py-2 rounded-lg border border-neutral-300 dark:border-dark-border text-xs font-semibold text-neutral-700 dark:text-neutral-200"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={hiringBusy}
                onClick={confirmHire}
                className="px-4 py-2 rounded-lg bg-brand text-brand-ink text-xs font-semibold hover:bg-brand-hover disabled:opacity-50"
              >
                {hiringBusy ? 'Создание контракта...' : 'Подтвердить найм'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
