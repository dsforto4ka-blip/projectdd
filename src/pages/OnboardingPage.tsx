import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, MailCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { evaluateAgeFromDob } from '../lib/rules';
import { useAppStore } from '../lib/store';
import type { UserRole } from '../types';

export function OnboardingPage() {
  const { userPrivate, completeOnboarding } = useAuth();
  const pushToast = useAppStore((s) => s.pushToast);
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(userPrivate?.displayName || '');
  const [role, setRole] = useState<UserRole>(userPrivate?.role || 'freelancer');
  const [dob, setDob] = useState(userPrivate?.dob || '');
  const [parentEmail, setParentEmail] = useState(userPrivate?.parentEmail || '');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!userPrivate) return null;

  let previewAgeGroup: 'under_13' | '13_17' | '18_plus' | null = null;
  if (dob) {
    try {
      previewAgeGroup = evaluateAgeFromDob(dob).ageGroup as 'under_13' | '13_17' | '18_plus';
    } catch {
      previewAgeGroup = null;
    }
  }

  // Under-13 blocked view
  if (userPrivate.accountStatus === 'blocked_coppa') {
    return (
      <div className="max-w-lg mx-auto px-4 py-14">
        <div className="bg-white dark:bg-dark-surface border border-rose-200 dark:border-rose-900 rounded-2xl p-8">
          <ShieldAlert className="w-8 h-8 text-rose-600 dark:text-rose-400" aria-hidden="true" />
          <h1 className="mt-4 font-display text-2xl font-bold text-neutral-900 dark:text-white">
            Регистрация недоступна (младше 13 лет)
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
            В соответствии с правилами защиты несовершеннолетних платформа VibeWorking предназначена для участников от 13 лет и старше. Этот аккаунт не может быть активирован.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center px-4 py-2.5 rounded-lg bg-neutral-900 dark:bg-brand text-white dark:text-brand-ink text-sm font-semibold"
          >
            На главную
          </Link>
        </div>
      </div>
    );
  }

  // Pending Parental Consent view
  if (userPrivate.accountStatus === 'pending_parental_consent') {
    const consentUrl = `/parent-consent?id=${userPrivate.parentConsentId || ''}`;
    return (
      <div className="max-w-xl mx-auto px-4 py-14">
        <div className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-2xl p-8">
          <MailCheck className="w-8 h-8 text-brand-text dark:text-brand" aria-hidden="true" />
          <h1 className="mt-4 font-display text-2xl font-bold text-neutral-900 dark:text-white">
            Попросите родителя или опекуна подтвердить аккаунт
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
            Мы подготовили запрос на согласие родителя для <strong className="text-neutral-900 dark:text-white">{userPrivate.parentEmail}</strong>. Пока согласие не получено, можно просматривать ленту заказов, а отклики, сообщения и сделки в рублях временно закрыты.
          </p>

          <div className="mt-6 rounded-xl border border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-dark-input p-4 space-y-2">
            <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Ссылка для подтверждения родителем
            </p>
            <p className="font-mono text-xs text-neutral-600 dark:text-neutral-400 break-all">
              {window.location.origin}{consentUrl}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to={consentUrl}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand text-brand-ink text-sm font-semibold hover:bg-brand-hover transition-colors"
            >
              <span>Открыть портал согласия родителя</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <Link
              to="/jobs"
              className="inline-flex items-center px-4 py-2.5 rounded-lg border border-neutral-300 dark:border-dark-border text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-dark-elevated"
            >
              Смотреть заказы
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Already active
  if (userPrivate.accountStatus === 'active') {
    return (
      <div className="max-w-lg mx-auto px-4 py-14">
        <div className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-2xl p-8">
          <CheckCircle2 className="w-8 h-8 text-brand-text dark:text-brand" aria-hidden="true" />
          <h1 className="mt-4 font-display text-2xl font-bold text-neutral-900 dark:text-white">
            Ваш аккаунт активен
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
            Открыт полный доступ: просмотр заказов, отклики, безопасные чаты и контракты с эскроу в рублях.
          </p>
          <Link
            to="/jobs"
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand text-brand-ink text-sm font-semibold hover:bg-brand-hover"
          >
            <span>Перейти к заказам</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await completeOnboarding({
        displayName,
        role,
        dob,
        parentEmail: previewAgeGroup === '13_17' ? parentEmail : undefined,
      });
      if (res.status === 'active') {
        pushToast('success', 'Добро пожаловать в VibeWorking! Аккаунт активирован.');
        navigate('/jobs');
      } else if (res.status === 'pending_parental_consent') {
        pushToast('info', 'Запрос на согласие родителя создан.');
      } else if (res.status === 'blocked_coppa') {
        pushToast('error', 'Регистрация доступна с 13 лет.');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Не удалось сохранить данные профиля.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-2xl p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
          Настройка профиля VibeWorking
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Точная дата рождения скрыта от других участников и нужна только для проверки возрастных правил.
        </p>

        {errorMsg && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-3.5 py-2.5 text-xs text-rose-800 dark:text-rose-200"
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label htmlFor="onboard-name" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Имя или псевдоним
            </label>
            <input
              id="onboard-name"
              type="text"
              required
              maxLength={80}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <span className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Как вы планируете начать? (Роль можно сменить позже)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('freelancer')}
                className={`p-3.5 rounded-xl border text-left transition-colors ${
                  role === 'freelancer'
                    ? 'border-brand bg-brand-soft dark:bg-brand/15'
                    : 'border-neutral-200 dark:border-dark-border hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}
              >
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">Я исполнитель</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Выполнять заказы, собирать портфолио и зарабатывать ₽
                </p>
              </button>
              <button
                type="button"
                onClick={() => setRole('client')}
                className={`p-3.5 rounded-xl border text-left transition-colors ${
                  role === 'client'
                    ? 'border-brand bg-brand-soft dark:bg-brand/15'
                    : 'border-neutral-200 dark:border-dark-border hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}
              >
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">Я заказчик</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Размещать задачи, выбирать отклики и оплачивать этапы через эскроу
                </p>
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="onboard-dob" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Дата рождения
            </label>
            <input
              id="onboard-dob"
              type="date"
              required
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          {previewAgeGroup === 'under_13' && (
            <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs text-rose-800 dark:text-rose-200">
              Пользователи младше 13 лет не могут зарегистрироваться на VibeWorking по требованиям безопасности несовершеннолетних.
            </div>
          )}

          {previewAgeGroup === '13_17' && (
            <div className="rounded-xl border border-brand-border dark:border-brand/30 bg-brand-soft dark:bg-brand/10 p-4 space-y-3">
              <p className="text-xs font-semibold text-brand-ink dark:text-brand">
                Аккаунт подростка (13–17 лет): требуется email родителя или опекуна
              </p>
              <div>
                <label htmlFor="parent-email" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Email родителя или законного представителя
                </label>
                <input
                  id="parent-email"
                  type="email"
                  required
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  placeholder="mama@yandex.ru"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-5 py-3 rounded-lg bg-brand text-brand-ink text-sm font-semibold hover:bg-brand-hover transition-colors disabled:opacity-50"
          >
            {submitting ? 'Сохранение...' : 'Продолжить'}
          </button>
        </form>
      </div>
    </div>
  );
}
