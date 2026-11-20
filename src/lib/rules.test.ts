import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateAgeFromDob,
  canPerformMarketplaceActions,
  canSubmitTeenBid,
  containsBannedContent,
  sanitizePreHireMessage,
  fundEscrowBalance,
  submitMilestoneDeliverable,
  approveMilestoneAndRelease,
  requestMilestoneRevision,
  applySevenDayAutoApprove,
  resolveDisputeAmounts,
  checkClientRateLimit,
  formatCurrency,
  SEVEN_DAYS_MS,
} from './rules';
import type { Milestone } from '../types';

test('formatCurrency formats Russian Rubles cleanly', () => {
  assert.match(formatCurrency(4500), /4\s?500\s₽/);
  assert.match(formatCurrency(7000.5), /7\s?000,5\s₽/);
});

test('age gate blocks <13, requires parental consent for 13-17, activates 18+', () => {
  const ref = new Date('2026-11-18T12:00:00Z');

  const child = evaluateAgeFromDob('2015-05-01', ref);
  assert.equal(child.ageGroup, 'under_13');
  assert.equal(child.accountStatus, 'blocked_coppa');

  const teen = evaluateAgeFromDob('2010-03-10', ref);
  assert.equal(teen.ageGroup, '13_17');
  assert.equal(teen.accountStatus, 'pending_parental_consent');
  assert.equal(teen.parentalConsentStatus, 'pending');

  const adult = evaluateAgeFromDob('2004-01-15', ref);
  assert.equal(adult.ageGroup, '18_plus');
  assert.equal(adult.accountStatus, 'active');
  assert.equal(adult.parentalConsentStatus, 'not_required');
});

test('marketplace actions are blocked until parental consent is active and not banned', () => {
  assert.equal(canPerformMarketplaceActions('pending_parental_consent', false).allowed, false);
  assert.equal(canPerformMarketplaceActions('blocked_coppa', false).allowed, false);
  assert.equal(canPerformMarketplaceActions('suspended', false).allowed, false);
  assert.equal(canPerformMarketplaceActions('active', true).allowed, false);
  assert.equal(canPerformMarketplaceActions('active', false).allowed, true);
});

test('teen bid cap enforces max 10 active bids', () => {
  assert.equal(canSubmitTeenBid(9).allowed, true);
  assert.equal(canSubmitTeenBid(9).remaining, 1);
  assert.equal(canSubmitTeenBid(10).allowed, false);
  assert.equal(canSubmitTeenBid(10).remaining, 0);
});

test('pre-hire chat filter hides email, Russian phone, and handles until hired', () => {
  const preHire = sanitizePreHireMessage(
    'Пишите на alina@teen.ru или +7 (999) 123-45-67 или @alina_design в t.me/test',
    false
  );
  assert.equal(preHire.wasFiltered, true);
  assert.doesNotMatch(preHire.sanitizedText, /alina@teen\.ru/);
  assert.doesNotMatch(preHire.sanitizedText, /999/);
  assert.doesNotMatch(preHire.sanitizedText, /@alina_design/);
  assert.doesNotMatch(preHire.sanitizedText, /t\.me/);

  const postHire = sanitizePreHireMessage('Вот моя почта alina@teen.ru для доступа в Figma', true);
  assert.equal(postHire.wasFiltered, false);
  assert.match(postHire.sanitizedText, /alina@teen\.ru/);
});

test('banned content filter catches prohibited EN & RU keywords', () => {
  assert.equal(containsBannedContent('Нужна красивая обложка для YouTube').flagged, false);
  assert.equal(containsBannedContent('Реклама онлайн казино').flagged, true);
  assert.equal(containsBannedContent('Promo for online casino site').flagged, true);
});

test('escrow funding in RUB, milestone submission, revision, approval, and 7-day auto-approve', () => {
  const { nextWalletBalance, nextEscrowBalance } = fundEscrowBalance(50000, 10000, false);
  assert.equal(nextWalletBalance, 40000);
  assert.equal(nextEscrowBalance, 10000);

  let milestones: Milestone[] = [
    { id: 'm1', title: 'Черновые концепты', amount: 5000, dueDate: '2026-12-01', status: 'pending' },
    { id: 'm2', title: 'Финальный пакет', amount: 5000, dueDate: '2026-12-05', status: 'pending' },
  ];

  assert.throws(() => approveMilestoneAndRelease(milestones, 'm1', true, 10000, 0));

  const now = 1_700_000_000_000;
  milestones = submitMilestoneDeliverable(milestones, 'm1', 'https://figma.com/file/demo', '3 концепта готовы', now);
  assert.equal(milestones[0].status, 'submitted');

  milestones = requestMilestoneRevision(milestones, 'm1', 'Сделайте шрифт крупнее');
  assert.equal(milestones[0].status, 'revision_requested');

  milestones = submitMilestoneDeliverable(milestones, 'm1', 'https://figma.com/file/demo-v2', 'Обновила шрифт', now);
  const firstApprove = approveMilestoneAndRelease(milestones, 'm1', true, 10000, 0);
  assert.equal(firstApprove.nextEscrowBalance, 5000);
  assert.equal(firstApprove.nextReleasedAmount, 5000);
  assert.equal(firstApprove.contractCompleted, false);

  const submittedM2 = submitMilestoneDeliverable(firstApprove.milestones, 'm2', 'https://figma.com/final', 'Финал', now);
  const autoCheck = applySevenDayAutoApprove(
    submittedM2,
    true,
    firstApprove.nextEscrowBalance,
    firstApprove.nextReleasedAmount,
    now + SEVEN_DAYS_MS + 1000
  );
  assert.equal(autoCheck.autoApprovedCount, 1);
  assert.equal(autoCheck.nextEscrowBalance, 0);
  assert.equal(autoCheck.nextReleasedAmount, 10000);
  assert.equal(autoCheck.contractCompleted, true);
});

test('dispute resolution splits, releases, or refunds escrow accurately', () => {
  const split = resolveDisputeAmounts(5001, 2000, 'split_50_50');
  assert.equal(split.freelancerPayout, 2500.5);
  assert.equal(split.clientRefund, 2500.5);
  assert.equal(split.nextEscrowBalance, 0);
  assert.equal(split.nextReleasedAmount, 4500.5);

  const refund = resolveDisputeAmounts(5000, 0, 'refund_client');
  assert.equal(refund.clientRefund, 5000);
  assert.equal(refund.freelancerPayout, 0);
});

test('rate limiter blocks exceeding threshold within window', () => {
  const now = 100_000;
  const timestamps = [now - 5000, now - 3000, now - 1000];
  const blocked = checkClientRateLimit(timestamps, 3, 60_000, now);
  assert.equal(blocked.allowed, false);

  const allowed = checkClientRateLimit(timestamps, 4, 60_000, now);
  assert.equal(allowed.allowed, true);
  assert.equal(allowed.nextTimestamps.length, 4);
});
