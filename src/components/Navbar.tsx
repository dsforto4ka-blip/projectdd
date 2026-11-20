import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu, Moon, Sun, X, LogOut, Shield, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useMarketplaceData } from '../hooks/useMarketplaceData';
import { useAppStore } from '../lib/store';
import { Avatar } from './Avatar';

export function Navbar() {
  const { userPrivate, publicProfile, isAdmin, logout } = useAuth();
  const { notifications, markNotificationRead } = useMarketplaceData();
  const darkMode = useAppStore((s) => s.darkMode);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);

  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const navLinks = [
    { to: '/jobs', label: 'Заказы' },
    { to: '/contracts', label: 'Контракты' },
    { to: '/messages', label: 'Сообщения' },
    { to: '/profile', label: 'Профиль' },
    ...(isAdmin ? [{ to: '/admin', label: 'Админка' }] : []),
  ];

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <header className="sticky top-0 z-40 h-16 bg-white/95 dark:bg-dark-canvas/95 backdrop-blur-sm border-b border-neutral-200 dark:border-dark-border">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">
        <Link
          to="/"
          className="font-display text-lg font-bold tracking-tight text-neutral-900 dark:text-white whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <span className="w-2.5 h-2.5 rounded-sm bg-brand inline-block shrink-0" aria-hidden="true" />
          <span>VibeWorking</span>
        </Link>

        <nav aria-label="Основная навигация" className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 ${
                isActive(item.to)
                  ? 'border-brand text-neutral-900 dark:text-white'
                  : 'border-transparent text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
            title={darkMode ? 'Светлая тема' : 'Тёмная тема'}
            className="p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-dark-elevated transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4 text-brand" /> : <Moon className="w-4 h-4" />}
          </button>

          {userPrivate ? (
            <>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setNotifOpen((v) => !v);
                    setMenuOpen(false);
                  }}
                  aria-label={`Уведомления (непрочитано: ${unreadCount})`}
                  className="relative p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-dark-elevated transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-brand text-brand-ink text-[10px] font-mono font-bold flex items-center justify-center tabular-nums">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-xl shadow-lg p-3 z-50">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100 dark:border-dark-border">
                      <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                        Уведомления
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono tabular-nums">
                        {unreadCount} новых
                      </span>
                    </div>
                    {notifications.length === 0 ? (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 py-4 text-center">Пока нет уведомлений.</p>
                    ) : (
                      <ul className="divide-y divide-neutral-100 dark:divide-dark-border max-h-64 overflow-y-auto">
                        {notifications.slice(0, 6).map((n) => (
                          <li key={n.id}>
                            <button
                              type="button"
                              onClick={async () => {
                                await markNotificationRead(n.id);
                                setNotifOpen(false);
                                navigate(n.link);
                              }}
                              className={`w-full text-left py-2.5 px-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-dark-elevated transition-colors ${
                                n.read ? 'opacity-65' : ''
                              }`}
                            >
                              <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                                {n.title}
                              </p>
                              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 line-clamp-2">
                                {n.body}
                              </p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen((v) => !v);
                    setNotifOpen(false);
                  }}
                  aria-label="Открыть меню аккаунта"
                  className="flex items-center gap-2 py-1 pl-1 pr-2.5 rounded-lg border border-neutral-200 dark:border-dark-border hover:bg-neutral-50 dark:hover:bg-dark-surface transition-colors whitespace-nowrap shrink-0"
                >
                  <Avatar name={userPrivate.displayName} src={publicProfile?.photoURL} size="sm" />
                  <span className="hidden sm:inline text-xs font-medium text-neutral-800 dark:text-neutral-200 max-w-[120px] truncate">
                    {userPrivate.displayName}
                  </span>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-xl shadow-lg py-1.5 z-50">
                    <div className="px-3 py-2 border-b border-neutral-100 dark:border-dark-border">
                      <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                        {userPrivate.displayName}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {userPrivate.role === 'client' ? 'Режим заказчика' : 'Режим исполнителя'}
                      </p>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-dark-elevated"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Профиль и портфолио</span>
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-dark-elevated"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Панель модерации</span>
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={toggleDarkMode}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-dark-elevated"
                    >
                      {darkMode ? <Sun className="w-3.5 h-3.5 text-brand" /> : <Moon className="w-3.5 h-3.5" />}
                      <span>{darkMode ? 'Светлая тема' : 'Тёмная тема'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setMenuOpen(false);
                        await logout();
                        navigate('/');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-neutral-50 dark:hover:bg-dark-elevated"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Выйти</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link
              to="/auth"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-brand text-brand-ink hover:bg-brand-hover transition-colors whitespace-nowrap shrink-0"
            >
              Войти
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Закрыть меню' : 'Открыть меню'}
            className="md:hidden p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-dark-elevated"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white dark:bg-dark-canvas border-b border-neutral-200 dark:border-dark-border px-4 py-3 space-y-1">
          {navLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2.5 rounded-lg text-sm font-medium ${
                isActive(item.to)
                  ? 'bg-brand-soft dark:bg-brand/15 text-brand-text dark:text-brand'
                  : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-dark-surface'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
