import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { ToastContainer } from './ToastContainer';

export function Layout({ children }: { children: React.ReactNode }) {
  const { userPrivate, isDemoSession } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-dark-canvas text-neutral-900 dark:text-neutral-100">
      <Navbar />

      {userPrivate && userPrivate.accountStatus === 'pending_parental_consent' && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                Аккаунт подростка ожидает подтверждения родителя или опекуна ({userPrivate.parentEmail}). Вы можете смотреть заказы, но отклики и чат пока ограничены.
              </span>
            </div>
            <Link
              to={userPrivate.parentConsentId ? `/parent-consent?id=${userPrivate.parentConsentId}` : '/onboarding'}
              className="font-semibold underline underline-offset-2 hover:text-amber-700 dark:hover:text-amber-100 whitespace-nowrap"
            >
              Открыть ссылку для родителя
            </Link>
          </div>
        </div>
      )}

      {userPrivate && (userPrivate.accountStatus === 'suspended' || userPrivate.accountStatus === 'blocked_coppa' || userPrivate.isBanned) && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-2 text-xs text-rose-900 dark:text-rose-200">
            <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              {userPrivate.accountStatus === 'blocked_coppa'
                ? 'Ограничение по возрасту (<13 лет): действия в аккаунте отключены.'
                : userPrivate.isBanned
                  ? 'Аккаунт заблокирован службой модерации VibeWorking.'
                  : 'Согласие родителя отозвано. Работа аккаунта приостановлена до повторного подтверждения.'}
            </span>
          </div>
        </div>
      )}

      {isDemoSession && (
        <div className="bg-brand-soft dark:bg-brand/10 border-b border-brand-border dark:border-brand/25">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-brand-ink dark:text-neutral-100">
            <span>
              Демо-режим ({userPrivate?.displayName} · {userPrivate?.role === 'client' ? 'Заказчик' : 'Исполнитель'})
            </span>
            <Link to="/auth" className="font-semibold text-brand-text dark:text-brand underline underline-offset-2 whitespace-nowrap">
              Сменить роль или войти через Google
            </Link>
          </div>
        </div>
      )}

      <main className="flex-1">{children}</main>
      <Footer />
      <ToastContainer />
    </div>
  );
}
