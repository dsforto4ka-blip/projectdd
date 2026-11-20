import type {
  AccountStatus,
  AgeGroup,
  AgeGroupLabel,
  Milestone,
  ParentalConsentStatus,
} from '../types';

export const MAX_ACTIVE_TEEN_BIDS = 10;
export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
export const ADMIN_BOOTSTRAP_EMAIL = 'bigsans.yt@gmail.com';

const BANNED_WORDS = [
  'nsfw',
  'gambling',
  'casino',
  'crypto pump',
  'homework cheating',
  'buy followers',
  'fake reviews',
  'wire transfer outside',
  'cashapp outside',
  'казино',
  'ставки на спорт',
  'букмекер',
  'криптопамп',
  'накрутка подписчиков',
  'фейковые отзывы',
  'перевод мимо биржи',
  'оплата на карту напрямую',
  'взлом аккаунта',
];

export interface AgeEvaluation {
  age: number;
  ageGroup: AgeGroup;
  ageGroupLabel: AgeGroupLabel;
  accountStatus: AccountStatus;
  parentalConsentStatus: ParentalConsentStatus;
}

export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ₽`;
}

export function evaluateAgeFromDob(dobString: string, now: Date = new Date()): AgeEvaluation {
  const dob = new Date(dobString);
  if (Number.isNaN(dob.getTime())) {
    throw new Error('Пожалуйста, укажите корректную дату рождения.');
  }
  if (dob > now) {
    throw new Error('Дата рождения не может быть в будущем.');
  }

  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }

  if (age < 13) {
    return {
      age,
      ageGroup: 'under_13',
      ageGroupLabel: 'Unverified',
      accountStatus: 'blocked_coppa',
      parentalConsentStatus: 'not_required',
    };
  }

  if (age <= 17) {
    return {
      age,
      ageGroup: '13_17',
      ageGroupLabel: '13–17 Teen Creator',
      accountStatus: 'pending_parental_consent',
      parentalConsentStatus: 'pending',
    };
  }

  return {
    age,
    ageGroup: '18_plus',
    ageGroupLabel: '18+ Verified Member',
    accountStatus: 'active',
    parentalConsentStatus: 'not_required',
  };
}

export function canPerformMarketplaceActions(
  accountStatus: AccountStatus,
  isBanned: boolean
): { allowed: boolean; reason?: string } {
  if (isBanned || accountStatus === 'banned') {
    return { allowed: false, reason: 'Аккаунт заблокирован модерацией.' };
  }
  if (accountStatus === 'blocked_coppa') {
    return {
      allowed: false,
      reason: 'Регистрация и заказы доступны пользователям от 13 лет согласно правилам защиты несовершеннолетних.',
    };
  }
  if (accountStatus === 'pending_parental_consent') {
    return {
      allowed: false,
      reason: 'Для отправки откликов, публикации заказов и сообщений нужно согласие родителя или законного представителя.',
    };
  }
  if (accountStatus === 'suspended') {
    return { allowed: false, reason: 'Согласие родителя отозвано. Действия в аккаунте приостановлены.' };
  }
  if (accountStatus !== 'active') {
    return { allowed: false, reason: 'Завершите настройку профиля, чтобы активировать аккаунт.' };
  }
  return { allowed: true };
}

export function canSubmitTeenBid(activeBidsCount: number): { allowed: boolean; remaining: number; reason?: string } {
  const remaining = Math.max(0, MAX_ACTIVE_TEEN_BIDS - activeBidsCount);
  if (activeBidsCount >= MAX_ACTIVE_TEEN_BIDS) {
    return {
      allowed: false,
      remaining: 0,
      reason: `Достигнут лимит безопасности: не более ${MAX_ACTIVE_TEEN_BIDS} активных откликов одновременно.`,
    };
  }
  return { allowed: true, remaining };
}

export function containsBannedContent(text: string): { flagged: boolean; matchedWord?: string } {
  const lower = text.toLowerCase();
  for (const word of BANNED_WORDS) {
    if (lower.includes(word)) {
      return { flagged: true, matchedWord: word };
    }
  }
  return { flagged: false };
}

export function sanitizePreHireMessage(
  text: string,
  isHired: boolean
): { sanitizedText: string; wasFiltered: boolean; reason?: string } {
  if (isHired) {
    return { sanitizedText: text.trim(), wasFiltered: false };
  }

  let result = text.trim();
  let wasFiltered = false;

  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const phoneRegex = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/g;
  const socialHandleRegex = /(?:^|\s)@[a-zA-Z0-9_.]{2,30}/g;
  const externalPlatformRegex =
    /\b(?:discord\.gg|t\.me|wa\.me|vk\.com|whatsapp|telegram|телеграм|тг|ватсап|snapchat|instagram\.com)\S*/gi;

  if (emailRegex.test(result)) {
    result = result.replace(emailRegex, '[контакт скрыт до найма]');
    wasFiltered = true;
  }
  if (phoneRegex.test(result)) {
    result = result.replace(phoneRegex, '[телефон скрыт до найма]');
    wasFiltered = true;
  }
  if (socialHandleRegex.test(result)) {
    result = result.replace(socialHandleRegex, ' [ник скрыт до найма]');
    wasFiltered = true;
  }
  if (externalPlatformRegex.test(result)) {
    result = result.replace(externalPlatformRegex, '[внешняя ссылка скрыта до найма]');
    wasFiltered = true;
  }

  return {
    sanitizedText: result,
    wasFiltered,
    reason: wasFiltered
      ? 'Для безопасности подростков контакты и ссылки на мессенджеры скрываются до заключения контракта.'
      : undefined,
  };
}

export function fundEscrowBalance(
  walletBalance: number,
  contractAmount: number,
  alreadyFunded: boolean
): { nextWalletBalance: number; nextEscrowBalance: number } {
  if (alreadyFunded) {
    throw new Error('Эскроу по этому контракту уже пополнено.');
  }
  if (contractAmount <= 0) {
    throw new Error('Сумма контракта должна быть больше нуля.');
  }
  if (walletBalance < contractAmount) {
    throw new Error(
      `Недостаточно средств на балансе (доступно ${formatCurrency(walletBalance)}, требуется ${formatCurrency(contractAmount)}).`
    );
  }
  return {
    nextWalletBalance: Number((walletBalance - contractAmount).toFixed(2)),
    nextEscrowBalance: Number(contractAmount.toFixed(2)),
  };
}

export function submitMilestoneDeliverable(
  milestones: Milestone[],
  milestoneId: string,
  deliverableUrl: string,
  deliverableNote: string,
  nowMs: number = Date.now()
): Milestone[] {
  const index = milestones.findIndex((m) => m.id === milestoneId);
  if (index === -1) {
    throw new Error('Этап контракта не найден.');
  }
  const current = milestones[index];
  if (current.status === 'approved') {
    throw new Error('Принятый этап нельзя отправить повторно.');
  }
  if (!deliverableUrl.trim() && !deliverableNote.trim()) {
    throw new Error('Добавьте ссылку на результат или комментарий перед отправкой.');
  }

  return milestones.map((m) =>
    m.id === milestoneId
      ? {
          ...m,
          status: 'submitted',
          deliverableUrl: deliverableUrl.trim(),
          deliverableNote: deliverableNote.trim(),
          submittedAtMs: nowMs,
        }
      : m
  );
}

export function approveMilestoneAndRelease(
  milestones: Milestone[],
  milestoneId: string,
  escrowFunded: boolean,
  escrowBalance: number,
  releasedAmount: number
): {
  milestones: Milestone[];
  nextEscrowBalance: number;
  nextReleasedAmount: number;
  contractCompleted: boolean;
} {
  if (!escrowFunded) {
    throw new Error('Заказчик должен пополнить эскроу перед приёмкой этапа.');
  }
  const target = milestones.find((m) => m.id === milestoneId);
  if (!target) {
    throw new Error('Этап контракта не найден.');
  }
  if (target.status === 'approved') {
    throw new Error('Этот этап уже принят.');
  }
  if (target.status !== 'submitted') {
    throw new Error('Исполнитель ещё не сдал работу по этому этапу.');
  }
  if (escrowBalance < target.amount) {
    throw new Error('Недостаточно средств на эскроу-счёте.');
  }

  const nextMilestones: Milestone[] = milestones.map((m) =>
    m.id === milestoneId ? { ...m, status: 'approved' } : m
  );
  const nextEscrowBalance = Number((escrowBalance - target.amount).toFixed(2));
  const nextReleasedAmount = Number((releasedAmount + target.amount).toFixed(2));
  const contractCompleted = nextMilestones.every((m) => m.status === 'approved');

  return {
    milestones: nextMilestones,
    nextEscrowBalance,
    nextReleasedAmount,
    contractCompleted,
  };
}

export function requestMilestoneRevision(
  milestones: Milestone[],
  milestoneId: string,
  feedback: string
): Milestone[] {
  const target = milestones.find((m) => m.id === milestoneId);
  if (!target) {
    throw new Error('Этап контракта не найден.');
  }
  if (target.status === 'approved') {
    throw new Error('Нельзя запросить доработку по уже принятому этапу.');
  }
  if (!feedback.trim()) {
    throw new Error('Опишите, что именно нужно доработать.');
  }
  return milestones.map((m) =>
    m.id === milestoneId
      ? { ...m, status: 'revision_requested', feedback: feedback.trim() }
      : m
  );
}

export function applySevenDayAutoApprove(
  milestones: Milestone[],
  escrowFunded: boolean,
  escrowBalance: number,
  releasedAmount: number,
  nowMs: number = Date.now()
): {
  milestones: Milestone[];
  nextEscrowBalance: number;
  nextReleasedAmount: number;
  autoApprovedCount: number;
  contractCompleted: boolean;
} {
  if (!escrowFunded) {
    return {
      milestones,
      nextEscrowBalance: escrowBalance,
      nextReleasedAmount: releasedAmount,
      autoApprovedCount: 0,
      contractCompleted: false,
    };
  }

  let runningEscrow = escrowBalance;
  let runningReleased = releasedAmount;
  let autoApprovedCount = 0;

  const nextMilestones = milestones.map((m) => {
    if (
      m.status === 'submitted' &&
      typeof m.submittedAtMs === 'number' &&
      nowMs - m.submittedAtMs >= SEVEN_DAYS_MS &&
      runningEscrow >= m.amount
    ) {
      runningEscrow = Number((runningEscrow - m.amount).toFixed(2));
      runningReleased = Number((runningReleased + m.amount).toFixed(2));
      autoApprovedCount++;
      return {
        ...m,
        status: 'approved' as const,
        feedback: 'Принято автоматически через 7 дней без ответа заказчика.',
      };
    }
    return m;
  });

  return {
    milestones: nextMilestones,
    nextEscrowBalance: runningEscrow,
    nextReleasedAmount: runningReleased,
    autoApprovedCount,
    contractCompleted: nextMilestones.length > 0 && nextMilestones.every((m) => m.status === 'approved'),
  };
}

export function resolveDisputeAmounts(
  escrowBalance: number,
  releasedAmount: number,
  resolution: 'release_freelancer' | 'refund_client' | 'split_50_50'
): {
  freelancerPayout: number;
  clientRefund: number;
  nextEscrowBalance: number;
  nextReleasedAmount: number;
} {
  if (escrowBalance <= 0) {
    return {
      freelancerPayout: 0,
      clientRefund: 0,
      nextEscrowBalance: 0,
      nextReleasedAmount: releasedAmount,
    };
  }

  if (resolution === 'release_freelancer') {
    return {
      freelancerPayout: escrowBalance,
      clientRefund: 0,
      nextEscrowBalance: 0,
      nextReleasedAmount: Number((releasedAmount + escrowBalance).toFixed(2)),
    };
  }

  if (resolution === 'refund_client') {
    return {
      freelancerPayout: 0,
      clientRefund: escrowBalance,
      nextEscrowBalance: 0,
      nextReleasedAmount: releasedAmount,
    };
  }

  const halfToFreelancer = Number((escrowBalance / 2).toFixed(2));
  const halfToClient = Number((escrowBalance - halfToFreelancer).toFixed(2));
  return {
    freelancerPayout: halfToFreelancer,
    clientRefund: halfToClient,
    nextEscrowBalance: 0,
    nextReleasedAmount: Number((releasedAmount + halfToFreelancer).toFixed(2)),
  };
}

export function checkClientRateLimit(
  recentTimestampsMs: number[],
  maxRequests: number,
  windowMs: number,
  nowMs: number = Date.now()
): { allowed: boolean; nextTimestamps: number[]; retryAfterSeconds: number } {
  const valid = recentTimestampsMs.filter((ts) => nowMs - ts < windowMs);
  if (valid.length >= maxRequests) {
    const oldest = valid[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (nowMs - oldest)) / 1000));
    return { allowed: false, nextTimestamps: valid, retryAfterSeconds };
  }
  return { allowed: true, nextTimestamps: [...valid, nowMs], retryAfterSeconds: 0 };
}
