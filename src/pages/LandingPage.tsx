import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Lock, MessageSquareWarning, Star } from 'lucide-react';
import { useMarketplaceData } from '../hooks/useMarketplaceData';
import { HERO_STUDIO_IMAGE } from '../lib/seedData';
import { AGE_GROUP_LABELS } from '../types';
import { JobCard } from '../components/JobCard';
import { Avatar } from '../components/Avatar';

export function LandingPage() {
  const { jobs, profiles } = useMarketplaceData();
  const featuredJobs = jobs.filter((j) => j.status === 'open').slice(0, 3);
  const featuredCreators = profiles.filter((p) => p.role === 'freelancer').slice(0, 2);

  return (
    <div>
      {/* Hero Split */}
      <section className="bg-white dark:bg-dark-canvas border-b border-neutral-200 dark:border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-center">
              <p className="text-xs font-semibold text-brand-text dark:text-brand tracking-wide">
                Для авторов и разработчиков 13–17 лет · Согласие родителей и эскроу в ₽
              </p>
              <h1
                className="mt-3 font-display font-bold tracking-tight text-neutral-900 dark:text-white leading-[1.08]"
                style={{ fontSize: 'clamp(2.15rem, 3.8vw, 3.35rem)', textWrap: 'balance' }}
              >
                Реальные фриланс-проекты для подростков: дизайн, монтаж, веб и тексты.
              </h1>
              <p className="mt-5 text-base sm:text-lg text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-2xl">
                VibeWorking соединяет проверенных заказчиков из России с молодыми специалистами от 13 до 17 лет. Все сделки проходят через поэтапный эскроу в рублях, родительское подтверждение и безопасные чаты.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to="/jobs"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-brand text-brand-ink text-sm font-semibold hover:bg-brand-hover transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Смотреть заказы</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-neutral-300 dark:border-dark-border text-sm font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-dark-surface transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Создать аккаунт</span>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="h-full min-h-[280px] rounded-xl overflow-hidden border border-neutral-200 dark:border-dark-border bg-neutral-100 dark:bg-dark-surface">
                <img
                  src={HERO_STUDIO_IMAGE}
                  alt="Юный дизайнер работает над графическими проектами за рабочим столом"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* 4-column Proof / Safety Strip */}
          <div className="mt-12 pt-8 border-t border-neutral-200 dark:border-dark-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="font-mono text-2xl font-semibold text-neutral-900 dark:text-white tabular-nums">
                13–17 лет
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                Обязательное согласие родителей
              </p>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                Регистрация с 13 лет (с учётом ст. 26 ГК РФ); родители могут отозвать доступ в любой момент.
              </p>
            </div>
            <div>
              <p className="font-mono text-2xl font-semibold text-neutral-900 dark:text-white tabular-nums">
                100% ₽
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                Поэтапный эскроу в рублях
              </p>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                Заказчик резервирует бюджет заранее; выплата переводится после приёмки этапа.
              </p>
            </div>
            <div>
              <p className="font-mono text-2xl font-semibold text-neutral-900 dark:text-white tabular-nums">
                7 дней
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                Автоподтверждение оплаты
              </p>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                Если заказчик не отвечает 7 дней после сдачи работы, средства переходят исполнителю.
              </p>
            </div>
            <div>
              <p className="font-mono text-2xl font-semibold text-neutral-900 dark:text-white tabular-nums">
                до 10
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                Лимит активных откликов
              </p>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                Защищает от спама и помогает сосредоточиться на качественных откликах.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Open Gigs Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-neutral-900 dark:text-white">
              Открытые заказы сейчас
            </h2>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Проверенные задачи по дизайну, монтажу коротких роликов, вёрстке, учёбе и текстам.
            </p>
          </div>
          <Link
            to="/jobs"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-text dark:text-brand hover:underline whitespace-nowrap"
          >
            <span>Смотреть все заказы ({jobs.length})</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="space-y-4">
          {featuredJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </section>

      {/* Safety Architecture + Featured Teen Talent */}
      <section className="bg-neutral-50/70 dark:bg-dark-surface/50 border-t border-neutral-200 dark:border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-7 space-y-6">
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-neutral-900 dark:text-white">
                Как устроен безопасный фриланс
              </h2>
              <div className="divide-y divide-neutral-200 dark:divide-dark-border border-t border-b border-neutral-200 dark:border-dark-border">
                <div className="py-5 flex items-start gap-4">
                  <ShieldCheck className="w-5 h-5 text-brand-text dark:text-brand mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                      01. Проверка возраста и согласие родителей
                    </h3>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                      При регистрации указывается дата рождения. Участники 13–17 лет отправляют ссылку на подтверждение родителю или законному представителю по ст. 26 ГК РФ.
                    </p>
                  </div>
                </div>
                <div className="py-5 flex items-start gap-4">
                  <Lock className="w-5 h-5 text-brand-text dark:text-brand mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                      02. Поэтапный эскроу и арбитраж
                    </h3>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                      Заказчик пополняет защищённый эскроу-счёт до старта работ. При возникновении спора команда безопасности изучает переписку и файлы, распределяя выплату по факту выполненной работы.
                    </p>
                  </div>
                </div>
                <div className="py-5 flex items-start gap-4">
                  <MessageSquareWarning className="w-5 h-5 text-brand-text dark:text-brand mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                      03. Защита контактов до найма
                    </h3>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                      Телефоны (+7 / 8...), email и ссылки на Telegram, VK или WhatsApp автоматически скрываются в чатах собеседования до оформления официального контракта.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <h2 className="text-xl font-display font-bold text-neutral-900 dark:text-white">
                Проверенные молодые специалисты
              </h2>
              {featuredCreators.map((creator) => (
                <Link
                  key={creator.uid}
                  to={`/profile/${creator.uid}`}
                  className="block bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-xl p-5 hover:border-brand dark:hover:border-brand transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <Avatar name={creator.displayName} src={creator.photoURL} size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-base font-semibold text-neutral-900 dark:text-white truncate">
                          {creator.displayName}
                        </h3>
                        <span className="inline-flex items-center gap-1 text-xs font-mono font-medium text-amber-600 dark:text-amber-400 tabular-nums">
                          <Star className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                          {creator.rating.toFixed(1)}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        {AGE_GROUP_LABELS[creator.ageGroupLabel]} · Выполнено заказов: {creator.completedJobs}
                      </p>
                      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300 line-clamp-2">
                        {creator.bio}
                      </p>
                      <p className="mt-2 text-xs text-brand-text dark:text-brand font-medium">
                        {creator.skills.slice(0, 4).join(' · ')}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
