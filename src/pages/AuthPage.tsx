import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth, type DemoPreset } from '../hooks/useAuth';
import { useAppStore } from '../lib/store';

export function AuthPage() {
  const {
    firebaseUser,
    isDemoSession,
    userPrivate,
    signInWithGoogle,
    sendPasswordlessEmailLink,
    verifyEmailOtpPreview,
    completeEmailLinkIfPresent,
    enterDemoSession,
    logout,
  } = useAuth();
  const pushToast = useAppStore((s) => s.pushToast);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'idle' | 'link_sent' | 'otp_verify'>('idle');
  const [previewOtpHint, setPreviewOtpHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (firebaseUser && userPrivate) {
      if (userPrivate.accountStatus === 'onboarding') {
        navigate('/onboarding', { replace: true });
      } else {
        navigate('/jobs', { replace: true });
      }
    }
  }, [firebaseUser, userPrivate, navigate]);

  useEffect(() => {
    completeEmailLinkIfPresent().catch((err) => {
      if (err instanceof Error) setErrorMsg(err.message);
    });
  }, [completeEmailLinkIfPresent]);

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      pushToast('success', 'Вход через Google выполнен.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Не удалось войти через Google.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Введите корректный адрес электронной почты.');
      return;
    }
    setLoading(true);
    try {
      const res = await sendPasswordlessEmailLink(email);
      if (res.mode === 'firebase_link') {
        setStep('link_sent');
        pushToast('success', `Ссылка для входа отправлена на ${email}.`);
      } else {
        setStep('otp_verify');
        setPreviewOtpHint(res.previewOtp || null);
        pushToast('info', 'Сформирован 6-значный код для входа без пароля.');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Не удалось отправить письмо для входа.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      await verifyEmailOtpPreview(email, otpCode);
      pushToast('success', 'Почта подтверждена! Укажите возраст и роль.');
      navigate('/onboarding');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Неверный код подтверждения.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = (preset: DemoPreset) => {
    enterDemoSession(preset);
    pushToast('info', 'Включён интерактивный демо-режим.');
    navigate(preset === 'pending_teen' ? '/onboarding' : preset === 'admin' ? '/admin' : '/jobs');
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12 sm:py-16">
      <div className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-2xl p-6 sm:p-8">
        <div className="flex items-center gap-2 text-xs font-medium text-brand-text dark:text-brand">
          <ShieldCheck className="w-4 h-4" aria-hidden="true" />
          <span>Безопасный вход для подростков</span>
        </div>
        <h1 className="mt-2 font-display text-2xl font-bold text-neutral-900 dark:text-white">
          Вход в VibeWorking
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Войдите через Google или по одноразовому коду на почту. Участникам 13–17 лет требуется согласие родителя.
        </p>

        {isDemoSession && userPrivate && (
          <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-brand-border dark:border-brand/30 bg-brand-soft dark:bg-brand/10 px-3.5 py-2.5 text-xs text-brand-ink dark:text-neutral-100">
            <span>Вы вошли как <strong>{userPrivate.displayName}</strong></span>
            <button
              type="button"
              onClick={logout}
              className="font-semibold text-brand-text dark:text-brand underline hover:opacity-80"
            >
              Выйти
            </button>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2.5 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-3.5 py-2.5 text-xs text-rose-800 dark:text-rose-200"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="mt-6">
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-elevated text-sm font-semibold text-neutral-900 dark:text-white hover:bg-neutral-50 dark:hover:bg-dark-border/60 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            <span>Продолжить через Google</span>
          </button>
        </div>

        <div className="my-6 flex items-center gap-3 text-xs text-neutral-400">
          <div className="h-px flex-1 bg-neutral-200 dark:bg-dark-border" />
          <span>или по email без пароля</span>
          <div className="h-px flex-1 bg-neutral-200 dark:bg-dark-border" />
        </div>

        {step === 'idle' && (
          <form onSubmit={handleSendEmailCode} className="space-y-4">
            <div>
              <label htmlFor="auth-email" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Электронная почта
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ivan@yandex.ru"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand text-brand-ink text-sm font-semibold hover:bg-brand-hover transition-colors disabled:opacity-50"
            >
              <span>Отправить код</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>
        )}

        {step === 'link_sent' && (
          <div className="rounded-xl border border-brand-border dark:border-brand/30 bg-brand-soft dark:bg-brand/10 p-4 text-sm text-brand-ink dark:text-neutral-100">
            <p className="font-semibold">Ссылка для входа отправлена на {email}</p>
            <p className="mt-1 text-xs leading-relaxed">
              Откройте письмо в этом же браузере и перейдите по ссылке, чтобы завершить вход.
            </p>
            <button
              type="button"
              onClick={() => setStep('idle')}
              className="mt-3 text-xs font-semibold text-brand-text dark:text-brand underline"
            >
              Указать другой email
            </button>
          </div>
        )}

        {step === 'otp_verify' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="rounded-lg border border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-dark-input p-3 text-xs text-neutral-600 dark:text-neutral-300">
              <p>
                Введите 6-значный код для <strong className="text-neutral-900 dark:text-white">{email}</strong>.
              </p>
              {previewOtpHint && (
                <p className="mt-1 font-mono text-brand-text dark:text-brand">
                  Тестовый код подтверждения: <strong>{previewOtpHint}</strong>
                </p>
              )}
            </div>
            <div>
              <label htmlFor="otp-input" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                6-значный код из письма
              </label>
              <input
                id="otp-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input font-mono text-base tracking-widest text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-lg bg-brand text-brand-ink text-sm font-semibold hover:bg-brand-hover transition-colors"
              >
                Подтвердить и продолжить
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('idle');
                  setOtpCode('');
                }}
                className="px-3 py-2.5 rounded-lg border border-neutral-300 dark:border-dark-border text-xs font-medium text-neutral-700 dark:text-neutral-300"
              >
                Назад
              </button>
            </div>
          </form>
        )}

        {/* Interactive Preview Switcher */}
        <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-dark-border">
          <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            Быстрый вход в демо-сценарии
          </p>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Проверьте любую роль, родительское согласие и сделки в рублях без настройки почты:
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemo('teen')}
              className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-dark-border text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:border-brand dark:hover:border-brand text-left transition-colors"
            >
              Активный подросток (Алина, 16)
            </button>
            <button
              type="button"
              onClick={() => handleDemo('client')}
              className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-dark-border text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:border-brand dark:hover:border-brand text-left transition-colors"
            >
              Проверенный заказчик (Дмитрий)
            </button>
            <button
              type="button"
              onClick={() => handleDemo('pending_teen')}
              className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-dark-border text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:border-brand dark:hover:border-brand text-left transition-colors"
            >
              Проверка возраста и согласие
            </button>
            <button
              type="button"
              onClick={() => handleDemo('admin')}
              className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-dark-border text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:border-brand dark:hover:border-brand text-left transition-colors"
            >
              Модератор и безопасность
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
