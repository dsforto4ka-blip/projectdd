import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, Ban } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useMarketplaceData } from '../hooks/useMarketplaceData';
import { getParentConsentDoc } from '../lib/firestoreService';
import { StatusText } from '../components/StatusText';
import type { ParentConsentRecord } from '../types';

export function ParentConsentPage() {
  const [searchParams] = useSearchParams();
  const consentId = searchParams.get('id') || '';
  const { firebaseUser } = useAuth();
  const { consents, setConsentDecision } = useMarketplaceData();

  const [fetchedConsent, setFetchedConsent] = useState<ParentConsentRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const localMatch = consents.find((c) => c.id === consentId) || null;
  const activeConsent = localMatch || fetchedConsent;

  useEffect(() => {
    if (!consentId || !firebaseUser || localMatch) return;
    setLoading(true);
    getParentConsentDoc(consentId)
      .then((res) => setFetchedConsent(res))
      .catch((err) => setErrorMsg(err instanceof Error ? err.message : 'Не удалось загрузить запись согласия.'))
      .finally(() => setLoading(false));
  }, [consentId, firebaseUser, localMatch]);

  const handleAction = async (record: ParentConsentRecord, decision: 'approved' | 'revoked') => {
    setErrorMsg(null);
    try {
      await setConsentDecision(record, decision);
      setFetchedConsent((prev) => (prev ? { ...prev, status: decision } : prev));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Не удалось обновить статус согласия.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-2xl p-6 sm:p-8">
        <div className="flex items-center gap-2 text-xs font-semibold text-brand-text dark:text-brand">
          <ShieldCheck className="w-4 h-4" aria-hidden="true" />
          <span>Портал родительского контроля</span>
        </div>
        <h1 className="mt-2 font-display text-2xl font-bold text-neutral-900 dark:text-white">
          Согласие родителей на работу на бирже
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Проверьте заявку подростка в VibeWorking (с учётом ст. 26 ГК РФ). Вы можете подтвердить доступ или отозвать согласие в любое время.
        </p>

        {errorMsg && (
          <div className="mt-4 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-xs text-rose-800 dark:text-rose-200">
            {errorMsg}
          </div>
        )}

        {loading && (
          <div className="mt-6 h-24 rounded-xl bg-neutral-100 dark:bg-dark-elevated animate-pulse" />
        )}

        {activeConsent ? (
          <div className="mt-6 border border-neutral-200 dark:border-dark-border rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-neutral-900 dark:text-white">
                  Аккаунт подростка: {activeConsent.teenName}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Email родителя / опекуна: {activeConsent.parentEmail}
                </p>
              </div>
              <StatusText status={activeConsent.status} />
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              После одобрения аккаунт получает отметку проверки и {activeConsent.teenName} сможет отправлять отклики (не более 10 активных одновременно), работать по контрактам с защищённым эскроу в ₽ и общаться в фильтруемых чатах. При отзыве согласия доступ приостанавливается мгновенно.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleAction(activeConsent, 'approved')}
                disabled={activeConsent.status === 'approved'}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-brand-ink text-xs font-semibold hover:bg-brand-hover disabled:opacity-50 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                <span>Одобрить аккаунт подростка</span>
              </button>
              <button
                type="button"
                onClick={() => handleAction(activeConsent, 'revoked')}
                disabled={activeConsent.status === 'revoked'}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50"
              >
                <Ban className="w-4 h-4" aria-hidden="true" />
                <span>Отозвать согласие</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
              Отслеживаемые заявки на согласие
            </h2>
            {consents.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Заявка не выбрана. Откройте персональную ссылку со страницы регистрации подростка.
              </p>
            ) : (
              consents.map((item) => (
                <div
                  key={item.id}
                  className="border border-neutral-200 dark:border-dark-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                      {item.teenName}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Родитель: {item.parentEmail}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusText status={item.status} />
                    <Link
                      to={`/parent-consent?id=${item.id}`}
                      className="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-dark-border text-xs font-semibold hover:bg-neutral-50 dark:hover:bg-dark-elevated"
                    >
                      Управлять
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
