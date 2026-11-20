import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Lock, CheckCircle2, AlertTriangle, Star, Clock, Upload } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useMarketplaceData } from '../hooks/useMarketplaceData';
import { uploadWorkspaceFile } from '../lib/firestoreService';
import { formatCurrency } from '../lib/rules';
import { StatusText } from '../components/StatusText';

export function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { userPrivate, firebaseUser } = useAuth();
  const {
    contracts,
    reviews,
    fundContract,
    submitMilestone,
    approveMilestone,
    requestRevision,
    runSevenDayAutoApproveCheck,
    openDispute,
    submitReview,
  } = useMarketplaceData();

  const contract = contracts.find((c) => c.id === id);

  const [deliverableUrl, setDeliverableUrl] = useState('');
  const [deliverableNote, setDeliverableNote] = useState('');
  const [activeSubmitId, setActiveSubmitId] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [revisionId, setRevisionId] = useState<string | null>(null);
  const [revisionFeedback, setRevisionFeedback] = useState('');

  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDesc, setDisputeDesc] = useState('');
  const [disputeEvidence, setDisputeEvidence] = useState('');

  const [rating, setRating] = useState(5);
  const [commRating, setCommRating] = useState(5);
  const [qualityRating, setQualityRating] = useState(5);
  const [timeRating, setTimeRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  const [actionError, setActionError] = useState<string | null>(null);

  if (!contract || !userPrivate) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
          Контракт не найден
        </h1>
        <Link
          to="/contracts"
          className="mt-5 inline-flex px-4 py-2 rounded-lg bg-brand text-brand-ink text-xs font-semibold hover:bg-brand-hover"
        >
          К списку контрактов
        </Link>
      </div>
    );
  }

  const isClient = userPrivate.uid === contract.clientId;
  const isFreelancer = userPrivate.uid === contract.freelancerId;
  const approvedCount = contract.milestones.filter((m) => m.status === 'approved').length;
  const progressPct = Math.round((approvedCount / contract.milestones.length) * 100);

  const myExistingReview = reviews.find(
    (r) => r.contractId === contract.id && r.authorId === userPrivate.uid
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      if (firebaseUser) {
        const url = await uploadWorkspaceFile(`deliverables/${contract.id}`, file);
        setDeliverableUrl(url);
      } else {
        setDeliverableUrl(`https://files.vibeworking.ru/preview/${encodeURIComponent(file.name)}`);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Не удалось загрузить файл.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFund = async () => {
    setActionError(null);
    try {
      await fundContract(contract);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Не удалось пополнить эскроу.');
    }
  };

  const handleSubmitMilestone = async (e: React.FormEvent, milestoneId: string) => {
    e.preventDefault();
    setActionError(null);
    try {
      await submitMilestone(contract, milestoneId, deliverableUrl, deliverableNote);
      setActiveSubmitId(null);
      setDeliverableUrl('');
      setDeliverableNote('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Не удалось отправить результат.');
    }
  };

  const handleApprove = async (milestoneId: string) => {
    setActionError(null);
    try {
      await approveMilestone(contract, milestoneId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Не удалось принять этап.');
    }
  };

  const handleRevision = async (e: React.FormEvent, milestoneId: string) => {
    e.preventDefault();
    setActionError(null);
    try {
      await requestRevision(contract, milestoneId, revisionFeedback);
      setRevisionId(null);
      setRevisionFeedback('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Не удалось запросить доработку.');
    }
  };

  const handleOpenDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      await openDispute(contract, disputeReason, disputeDesc, disputeEvidence);
      setDisputeOpen(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Не удалось открыть спор.');
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      await submitReview({
        contract,
        rating,
        communication: commRating,
        qualityOrClarity: qualityRating,
        timeliness: timeRating,
        comment: reviewComment,
      });
      setReviewComment('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Не удалось отправить отзыв.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      <Link
        to="/contracts"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Назад к контрактам</span>
      </Link>

      {actionError && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-xs text-rose-800 dark:text-rose-200"
        >
          {actionError}
        </div>
      )}

      {/* Header & Escrow Summary */}
      <section className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <StatusText status={contract.status} />
              <span aria-hidden="true">·</span>
              <span>Заказчик: {contract.clientName}</span>
              <span aria-hidden="true">·</span>
              <span>Исполнитель: {contract.freelancerName}</span>
            </div>
            <h1 className="mt-2 font-display text-2xl font-bold text-neutral-900 dark:text-white">
              {contract.jobTitle}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {contract.status === 'active' && (
              <>
                <button
                  type="button"
                  onClick={() => runSevenDayAutoApproveCheck(contract)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-300 dark:border-dark-border text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-dark-elevated"
                >
                  <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Проверить 7-дневное автоподтверждение</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDisputeOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Открыть спор</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Escrow Figures */}
        <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-dark-border grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
          <div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Сумма контракта</p>
            <p className="font-mono text-xl font-bold text-neutral-900 dark:text-white tabular-nums">
              {formatCurrency(contract.totalAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">На эскроу-счёте</p>
            <p className="font-mono text-xl font-bold text-neutral-900 dark:text-white tabular-nums">
              {formatCurrency(contract.escrowBalance)}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Выплачено исполнителю</p>
            <p className="font-mono text-xl font-bold text-brand-text dark:text-brand tabular-nums">
              {formatCurrency(contract.releasedAmount)}
            </p>
          </div>
          <div className="sm:text-right">
            {!contract.escrowFunded && isClient && contract.status === 'active' ? (
              <button
                type="button"
                onClick={handleFund}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-brand text-brand-ink text-xs font-semibold hover:bg-brand-hover"
              >
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Пополнить эскроу ({formatCurrency(contract.totalAmount)})</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-text dark:text-brand">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                {contract.escrowFunded ? 'Эскроу пополнен' : 'Ожидает пополнения заказчиком'}
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 space-y-1.5">
          <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 font-mono tabular-nums">
            <span>Прогресс по этапам</span>
            <span>Принято {approvedCount} из {contract.milestones.length} ({progressPct}%)</span>
          </div>
          <div className="h-2.5 rounded-full bg-neutral-100 dark:bg-dark-elevated overflow-hidden">
            <div
              className="h-full w-full bg-brand origin-left transition-transform duration-150"
              style={{ transform: `scaleX(${progressPct / 100})` }}
            />
          </div>
        </div>
      </section>

      {/* Milestones */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-neutral-900 dark:text-white">
          Этапы работ
        </h2>

        {contract.milestones.map((m, idx) => (
          <div
            key={m.id}
            className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-xl p-5 sm:p-6 space-y-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="font-mono font-semibold text-neutral-700 dark:text-neutral-300">
                    0{idx + 1}.
                  </span>
                  <StatusText status={m.status} />
                  <span aria-hidden="true">·</span>
                  <span>Срок: {m.dueDate}</span>
                </div>
                <h3 className="mt-1 text-base font-semibold text-neutral-900 dark:text-white">
                  {m.title}
                </h3>
              </div>
              <p className="font-mono text-lg font-bold text-neutral-900 dark:text-white tabular-nums">
                {formatCurrency(m.amount)}
              </p>
            </div>

            {m.deliverableNote && (
              <div className="rounded-lg bg-neutral-50 dark:bg-dark-input border border-neutral-200 dark:border-dark-border p-3.5 text-xs space-y-1">
                <p className="font-semibold text-neutral-800 dark:text-neutral-200">Сданный результат</p>
                <p className="text-neutral-600 dark:text-neutral-300">{m.deliverableNote}</p>
                {m.deliverableUrl && (
                  <a
                    href={m.deliverableUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-brand-text dark:text-brand underline break-all"
                  >
                    {m.deliverableUrl}
                  </a>
                )}
              </div>
            )}

            {m.feedback && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-xs text-amber-900 dark:text-amber-200">
                <strong>Комментарий:</strong> {m.feedback}
              </div>
            )}

            {/* Freelancer Action: Submit Deliverable */}
            {isFreelancer &&
              contract.status === 'active' &&
              (m.status === 'pending' || m.status === 'revision_requested') && (
                <div>
                  {activeSubmitId === m.id ? (
                    <form onSubmit={(e) => handleSubmitMilestone(e, m.id)} className="space-y-3 pt-2">
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Ссылка на файлы или загрузка результата
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="url"
                            value={deliverableUrl}
                            onChange={(e) => setDeliverableUrl(e.target.value)}
                            placeholder="https://disk.yandex.ru/... или загрузите файл"
                            className="flex-1 px-3 py-2 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
                          />
                          <label className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-300 dark:border-dark-border text-xs font-medium cursor-pointer hover:bg-neutral-50 dark:hover:bg-dark-elevated">
                            <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{uploadingFile ? 'Загрузка...' : 'Прикрепить файл'}</span>
                            <input type="file" onChange={handleFileUpload} className="sr-only" />
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Описание выполненной работы</label>
                        <textarea
                          rows={2}
                          required
                          value={deliverableNote}
                          onChange={(e) => setDeliverableNote(e.target.value)}
                          placeholder="Кратко опишите, что готово на этом этапе..."
                          className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-lg bg-brand text-brand-ink text-xs font-semibold hover:bg-brand-hover"
                        >
                          Отправить на проверку
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveSubmitId(null)}
                          className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-dark-border text-xs"
                        >
                          Отмена
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveSubmitId(m.id)}
                      className="px-4 py-2 rounded-lg bg-brand text-brand-ink text-xs font-semibold hover:bg-brand-hover"
                    >
                      Сдать работу по этапу
                    </button>
                  )}
                </div>
              )}

            {/* Client Action: Approve or Request Revision */}
            {isClient && contract.status === 'active' && m.status === 'submitted' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleApprove(m.id)}
                    className="px-4 py-2 rounded-lg bg-brand text-brand-ink text-xs font-semibold hover:bg-brand-hover"
                  >
                    Принять и выплатить {formatCurrency(m.amount)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRevisionId(m.id)}
                    className="px-4 py-2 rounded-lg border border-neutral-300 dark:border-dark-border text-xs font-semibold hover:bg-neutral-50 dark:hover:bg-dark-elevated"
                  >
                    Запросить доработку
                  </button>
                </div>

                {revisionId === m.id && (
                  <form onSubmit={(e) => handleRevision(e, m.id)} className="space-y-2 pt-2">
                    <textarea
                      rows={2}
                      required
                      value={revisionFeedback}
                      onChange={(e) => setRevisionFeedback(e.target.value)}
                      placeholder="Опишите, какие правки нужно внести..."
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-xs text-neutral-900 dark:text-white"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold"
                      >
                        Отправить на доработку
                      </button>
                      <button
                        type="button"
                        onClick={() => setRevisionId(null)}
                        className="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-dark-border text-xs"
                      >
                        Отмена
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Two-Sided Review Form when completed */}
      {(contract.status === 'completed' || contract.status === 'resolved') && (
        <section className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-2xl p-6 sm:p-8">
          <h2 className="font-display text-xl font-bold text-neutral-900 dark:text-white">
            Отзыв по контракту
          </h2>

          {myExistingReview ? (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-1 text-amber-500">
                <Star className="w-4 h-4 fill-current" aria-hidden="true" />
                <span className="font-mono text-sm font-semibold">{myExistingReview.rating}/5</span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-2">Отзыв опубликован (редактирование закрыто)</span>
              </div>
              <p className="text-sm text-neutral-700 dark:text-neutral-300">{myExistingReview.comment}</p>
            </div>
          ) : (
            <form onSubmit={handleReviewSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Общая оценка (1–5)</label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-xs text-neutral-900 dark:text-white"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>{n} / 5</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Коммуникация</label>
                  <select
                    value={commRating}
                    onChange={(e) => setCommRating(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-xs text-neutral-900 dark:text-white"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>{n}/5</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    {isClient ? 'Качество работы' : 'Понятность ТЗ и оплата'}
                  </label>
                  <select
                    value={qualityRating}
                    onChange={(e) => setQualityRating(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-xs text-neutral-900 dark:text-white"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>{n}/5</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Соблюдение сроков</label>
                  <select
                    value={timeRating}
                    onChange={(e) => setTimeRating(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-xs text-neutral-900 dark:text-white"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>{n}/5</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="review-comment" className="block text-xs font-medium mb-1">
                  Комментарий о сотрудничестве
                </label>
                <textarea
                  id="review-comment"
                  rows={3}
                  required
                  maxLength={1000}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Поделитесь впечатлениями о совместной работе..."
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-brand text-brand-ink text-xs font-semibold hover:bg-brand-hover"
              >
                Опубликовать отзыв
              </button>
            </form>
          )}
        </section>
      )}

      {/* Open Dispute Modal */}
      {disputeOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dispute-title"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-2xl max-w-md w-full p-6 space-y-4">
            <h2 id="dispute-title" className="font-display text-xl font-bold text-neutral-900 dark:text-white">
              Открыть спор по контракту
            </h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-300">
              Остаток на эскроу ({formatCurrency(contract.escrowBalance)}) будет заморожен, пока служба безопасности изучает материалы обеих сторон.
            </p>
            <form onSubmit={handleOpenDispute} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Причина спора</label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Например: срыв сроков / несоответствие ТЗ"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-xs text-neutral-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Подробное описание</label>
                <textarea
                  rows={3}
                  required
                  maxLength={2000}
                  value={disputeDesc}
                  onChange={(e) => setDisputeDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-xs text-neutral-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Ссылка на доказательства (необязательно)</label>
                <input
                  type="url"
                  value={disputeEvidence}
                  onChange={(e) => setDisputeEvidence(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-xs text-neutral-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDisputeOpen(false)}
                  className="px-4 py-2 rounded-lg border border-neutral-300 dark:border-dark-border text-xs font-semibold"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700"
                >
                  Отправить спор
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
