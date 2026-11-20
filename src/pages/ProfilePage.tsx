import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, MailCheck, Star, Plus, Trash2, ExternalLink } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useMarketplaceData } from '../hooks/useMarketplaceData';
import {
  AGE_GROUP_LABELS,
  AVAILABILITY_LABELS,
  SKILL_TAGS,
  type PortfolioItem,
} from '../types';
import { generateId, uploadWorkspaceFile } from '../lib/firestoreService';
import { Avatar } from '../components/Avatar';
import { StatusText } from '../components/StatusText';

const PORTFOLIO_TYPE_LABELS: Record<'link' | 'image' | 'pdf', string> = {
  link: 'Ссылка',
  image: 'Изображение',
  pdf: 'PDF-файл',
};

export function ProfilePage() {
  const { uid } = useParams<{ uid: string }>();
  const { userPrivate, publicProfile, firebaseUser, switchRole } = useAuth();
  const { profiles, reviews, contracts, saveProfileEdits, replyToReview } = useMarketplaceData();

  const targetUid = uid || userPrivate?.uid || '';
  const profile =
    (targetUid === publicProfile?.uid ? publicProfile : profiles.find((p) => p.uid === targetUid)) ||
    null;

  const isOwnProfile = Boolean(userPrivate && profile && userPrivate.uid === profile.uid);

  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(profile?.bio || '');
  const [skills, setSkills] = useState<string[]>(profile?.skills || []);
  const [timezone, setTimezone] = useState(profile?.timezone || 'Europe/Moscow');
  const [availability, setAvailability] = useState<'part-time' | 'weekends' | 'flexible'>(
    profile?.availability || 'weekends'
  );
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(profile?.portfolio || []);

  const [newPortTitle, setNewPortTitle] = useState('');
  const [newPortUrl, setNewPortUrl] = useState('');
  const [newPortType, setNewPortType] = useState<'link' | 'image' | 'pdf'>('link');
  const [newPortDesc, setNewPortDesc] = useState('');

  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
          Профиль не найден
        </h1>
      </div>
    );
  }

  const userReviews = reviews.filter((r) => r.targetUserId === profile.uid && !r.isHidden);
  const avgRating =
    userReviews.length > 0
      ? Number((userReviews.reduce((s, r) => s + r.rating, 0) / userReviews.length).toFixed(2))
      : profile.rating;
  const completedCount = Math.max(
    profile.completedJobs,
    contracts.filter(
      (c) => (c.freelancerId === profile.uid || c.clientId === profile.uid) && c.status === 'completed'
    ).length
  );

  const startEdit = () => {
    setBio(profile.bio);
    setSkills(profile.skills);
    setTimezone(profile.timezone);
    setAvailability(profile.availability);
    setPortfolio(profile.portfolio);
    setEditing(true);
  };

  const toggleSkill = (tag: string) => {
    setSkills((prev) =>
      prev.includes(tag) ? prev.filter((s) => s !== tag) : prev.length < 15 ? [...prev, tag] : prev
    );
  };

  const handleAddPortfolio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPortTitle.trim() || !newPortUrl.trim()) return;
    setPortfolio((prev) => [
      ...prev,
      {
        id: generateId('port'),
        title: newPortTitle.trim(),
        url: newPortUrl.trim(),
        type: newPortType,
        description: newPortDesc.trim(),
      },
    ]);
    setNewPortTitle('');
    setNewPortUrl('');
    setNewPortDesc('');
  };

  const handlePortfolioFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (firebaseUser) {
      const url = await uploadWorkspaceFile(`portfolio/${profile.uid}`, file);
      setNewPortUrl(url);
    } else {
      setNewPortUrl(`https://files.vibeworking.ru/portfolio/${encodeURIComponent(file.name)}`);
    }
    if (!newPortTitle) setNewPortTitle(file.name);
    setNewPortType(file.type.includes('pdf') ? 'pdf' : 'image');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveProfileEdits({
      bio: bio.slice(0, 500),
      skills,
      timezone,
      availability,
      portfolio,
    });
    setEditing(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      {/* Profile Header */}
      <section className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <Avatar name={profile.displayName} src={profile.photoURL} size="lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
                  {profile.displayName}
                </h1>
                <StatusText status={profile.accountStatus} />
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                <span>{AGE_GROUP_LABELS[profile.ageGroupLabel] || profile.ageGroupLabel}</span>
                <span aria-hidden="true">·</span>
                <span>{profile.role === 'client' ? 'Заказчик' : 'Исполнитель'}</span>
                <span aria-hidden="true">·</span>
                <span>{AVAILABILITY_LABELS[profile.availability] || profile.availability}</span>
                <span aria-hidden="true">·</span>
                <span>{profile.timezone}</span>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs">
                {profile.idVerified && (
                  <span className="inline-flex items-center gap-1 font-semibold text-brand-text dark:text-brand">
                    <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                    <span>Личность подтверждена</span>
                  </span>
                )}
                {profile.emailVerified && (
                  <span className="inline-flex items-center gap-1 font-medium text-neutral-700 dark:text-neutral-300">
                    <MailCheck className="w-4 h-4 text-brand-text dark:text-brand" aria-hidden="true" />
                    <span>Email подтверждён</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1 font-mono font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                  <Star className="w-4 h-4 fill-current" aria-hidden="true" />
                  {avgRating.toFixed(1)} (отзывов: {userReviews.length || profile.reviewCount})
                </span>
                <span className="font-mono text-neutral-600 dark:text-neutral-300 tabular-nums">
                  Выполнено заказов: {completedCount}
                </span>
              </div>
            </div>
          </div>

          {isOwnProfile && userPrivate && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="inline-flex p-1 bg-neutral-100 dark:bg-dark-input rounded-lg">
                <button
                  type="button"
                  onClick={() => switchRole('freelancer')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    userPrivate.role === 'freelancer'
                      ? 'bg-white dark:bg-dark-elevated text-neutral-900 dark:text-white shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  Исполнитель
                </button>
                <button
                  type="button"
                  onClick={() => switchRole('client')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    userPrivate.role === 'client'
                      ? 'bg-white dark:bg-dark-elevated text-neutral-900 dark:text-white shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  Заказчик
                </button>
              </div>
              {!editing && (
                <button
                  type="button"
                  onClick={startEdit}
                  className="px-4 py-2 rounded-lg border border-neutral-300 dark:border-dark-border text-xs font-semibold hover:bg-neutral-50 dark:hover:bg-dark-elevated"
                >
                  Редактировать профиль
                </button>
              )}
            </div>
          )}
        </div>

        {!editing ? (
          <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-dark-border space-y-4">
            <div>
              <h2 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">О себе</h2>
              <p className="mt-1.5 text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                {profile.bio || 'Описание пока не добавлено.'}
              </p>
            </div>
            {profile.skills.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Навыки</h2>
                <p className="mt-1.5 text-sm font-medium text-brand-text dark:text-brand">
                  {profile.skills.join(' · ')}
                </p>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSave} className="mt-6 pt-6 border-t border-neutral-200 dark:border-dark-border space-y-5">
            <div>
              <label htmlFor="profile-bio" className="block text-xs font-medium mb-1">
                О себе (до 500 символов)
              </label>
              <textarea
                id="profile-bio"
                rows={3}
                maxLength={500}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="profile-tz" className="block text-xs font-medium mb-1">Часовой пояс</label>
                <input
                  id="profile-tz"
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div>
                <label htmlFor="profile-avail" className="block text-xs font-medium mb-1">Занятость</label>
                <select
                  id="profile-avail"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value as 'part-time' | 'weekends' | 'flexible')}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="weekends">{AVAILABILITY_LABELS.weekends}</option>
                  <option value="part-time">{AVAILABILITY_LABELS['part-time']}</option>
                  <option value="flexible">{AVAILABILITY_LABELS.flexible}</option>
                </select>
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium mb-2">Выберите навыки</span>
              <div className="flex flex-wrap gap-2">
                {SKILL_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleSkill(tag)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      skills.includes(tag)
                        ? 'border-brand bg-brand-soft dark:bg-brand/15 text-brand-text dark:text-brand'
                        : 'border-neutral-200 dark:border-dark-border text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-brand text-brand-ink text-xs font-semibold hover:bg-brand-hover"
              >
                Сохранить изменения
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2.5 rounded-lg border border-neutral-300 dark:border-dark-border text-xs font-semibold"
              >
                Отмена
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Portfolio Showcase */}
      <section className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-2xl p-6 sm:p-8 space-y-5">
        <h2 className="font-display text-xl font-bold text-neutral-900 dark:text-white">
          Портфолио
        </h2>

        {(editing ? portfolio : profile.portfolio).length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Примеры работ пока не добавлены.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(editing ? portfolio : profile.portfolio).map((item) => (
              <div
                key={item.id}
                className="border border-neutral-200 dark:border-dark-border rounded-xl p-4 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-brand-text dark:text-brand uppercase">
                    {PORTFOLIO_TYPE_LABELS[item.type] || item.type}
                  </p>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mt-0.5 truncate">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                      {item.description}
                    </p>
                  )}
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-brand-text dark:hover:text-brand"
                  >
                    <span>Открыть пример</span>
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </a>
                </div>
                {editing && (
                  <button
                    type="button"
                    aria-label={`Удалить ${item.title}`}
                    onClick={() => setPortfolio((prev) => prev.filter((p) => p.id !== item.id))}
                    className="text-neutral-400 hover:text-rose-600 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {editing && (
          <div className="pt-4 border-t border-neutral-200 dark:border-dark-border space-y-3">
            <h3 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              Добавить работу в портфолио
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={newPortTitle}
                onChange={(e) => setNewPortTitle(e.target.value)}
                placeholder="Название проекта"
                className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-xs text-neutral-900 dark:text-white"
              />
              <input
                type="url"
                value={newPortUrl}
                onChange={(e) => setNewPortUrl(e.target.value)}
                placeholder="https://behance.net/... или загрузка"
                className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-xs text-neutral-900 dark:text-white"
              />
              <label className="flex items-center justify-center px-3 py-2 rounded-lg border border-neutral-300 dark:border-dark-border text-xs font-medium cursor-pointer hover:bg-neutral-50 dark:hover:bg-dark-elevated">
                <span>Загрузить фото / PDF</span>
                <input type="file" accept="image/*,.pdf" onChange={handlePortfolioFile} className="sr-only" />
              </label>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPortDesc}
                onChange={(e) => setNewPortDesc(e.target.value)}
                placeholder="Коротко о вашей задаче в проекте"
                className="flex-1 px-3 py-2 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-xs text-neutral-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddPortfolio}
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg bg-neutral-900 dark:bg-brand text-white dark:text-brand-ink text-xs font-semibold hover:bg-brand hover:text-brand-ink dark:hover:bg-brand-hover transition-colors"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Добавить</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Reviews & Reputation */}
      <section className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-2xl p-6 sm:p-8 space-y-5">
        <h2 className="font-display text-xl font-bold text-neutral-900 dark:text-white">
          Отзывы и репутация ({userReviews.length})
        </h2>

        {userReviews.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Отзывов пока нет.</p>
        ) : (
          <div className="divide-y divide-neutral-200 dark:divide-dark-border">
            {userReviews.map((rev) => (
              <div key={rev.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-neutral-900 dark:text-white">{rev.authorName}</span>
                    <span className="text-neutral-400">·</span>
                    <span className="text-neutral-500 dark:text-neutral-400">
                      {rev.authorRole === 'client' ? 'Заказчик' : 'Исполнитель'}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                    <Star className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                    {rev.rating.toFixed(1)}
                  </span>
                </div>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">{rev.comment}</p>
                {rev.replyText ? (
                  <div className="mt-2 pl-4 border-l border-neutral-200 dark:border-dark-border text-xs text-neutral-600 dark:text-neutral-400">
                    <strong>Ответ:</strong> {rev.replyText}
                  </div>
                ) : (
                  isOwnProfile && (
                    <div>
                      {replyingReviewId === rev.id ? (
                        <div className="mt-2 flex gap-2">
                          <input
                            type="text"
                            maxLength={600}
                            value={replyDraft}
                            onChange={(e) => setReplyDraft(e.target.value)}
                            placeholder="Напишите публичный ответ..."
                            className="flex-1 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-xs text-neutral-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              await replyToReview(rev, replyDraft);
                              setReplyingReviewId(null);
                              setReplyDraft('');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-brand text-brand-ink text-xs font-semibold hover:bg-brand-hover"
                          >
                            Ответить
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setReplyingReviewId(rev.id)}
                          className="text-xs font-medium text-brand-text dark:text-brand hover:underline"
                        >
                          Ответить на отзыв (один раз)
                        </button>
                      )}
                    </div>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
