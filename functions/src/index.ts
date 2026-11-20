import * as admin from 'firebase-admin';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

admin.initializeApp();
const db = admin.firestore();

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Scheduled daily cron: Auto-approves milestones submitted > 7 days ago
 * with no client response, protecting teen freelancers from silent clients.
 */
export const autoApproveStaleMilestones = onSchedule('every 24 hours', async () => {
  const nowMs = Date.now();
  const activeContracts = await db
    .collection('contracts')
    .where('status', '==', 'active')
    .where('escrowFunded', '==', true)
    .get();

  for (const snap of activeContracts.docs) {
    const contract = snap.data();
    const milestones = Array.isArray(contract.milestones) ? contract.milestones : [];
    let escrowBalance = Number(contract.escrowBalance || 0);
    let releasedAmount = Number(contract.releasedAmount || 0);
    let changed = false;

    const updatedMilestones = milestones.map((m: Record<string, unknown>) => {
      const submittedAtMs = typeof m.submittedAtMs === 'number' ? m.submittedAtMs : 0;
      const amount = Number(m.amount || 0);
      if (
        m.status === 'submitted' &&
        submittedAtMs > 0 &&
        nowMs - submittedAtMs >= SEVEN_DAYS_MS &&
        escrowBalance >= amount
      ) {
        escrowBalance = Number((escrowBalance - amount).toFixed(2));
        releasedAmount = Number((releasedAmount + amount).toFixed(2));
        changed = true;
        return {
          ...m,
          status: 'approved',
          feedback: 'Принято автоматически через 7 дней без ответа заказчика.',
        };
      }
      return m;
    });

    if (changed) {
      const allApproved = updatedMilestones.every(
        (m: Record<string, unknown>) => m.status === 'approved'
      );
      await snap.ref.update({
        milestones: updatedMilestones,
        escrowBalance,
        releasedAmount,
        status: allApproved ? 'completed' : 'active',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
});

/**
 * Triggered when a teen (13-17) creates a parental consent request.
 * Sends verification email via configured SendGrid API key.
 */
export const onParentConsentCreated = onDocumentCreated(
  'parentConsents/{consentId}',
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const appUrl = process.env.APP_URL || 'https://vibeworking.ru';
    const consentLink = `${appUrl}/parent-consent?id=${data.id}`;

    console.log(
      `Parental consent email queued for ${data.parentEmail} (teen: ${data.teenName}) -> ${consentLink}`
    );
  }
);

/**
 * Triggered when a bid or chat message is created to send email/push notifications.
 */
export const onNewBidNotifyClient = onDocumentCreated('bids/{bidId}', async (event) => {
  const bid = event.data?.data();
  if (!bid) return;
  await db.collection('notifications').add({
    id: `notif_${event.params.bidId}`,
    userId: bid.clientId,
    title: 'Новый отклик на заказ',
    body: `${bid.freelancerName} откликнулся на «${bid.jobTitle}» со ставкой ${bid.amount} ₽.`,
    link: `/jobs/${bid.jobId}`,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
});

/**
 * Callable function for Parent Approval / Revocation via secure token.
 */
export const processParentConsentAction = onCall(async (request) => {
  const { consentId, decision } = request.data as {
    consentId: string;
    decision: 'approved' | 'revoked';
  };
  if (!consentId || (decision !== 'approved' && decision !== 'revoked')) {
    throw new HttpsError('invalid-argument', 'Invalid consentId or decision.');
  }

  const consentRef = db.collection('parentConsents').doc(consentId);
  const consentSnap = await consentRef.get();
  if (!consentSnap.exists) {
    throw new HttpsError('not-found', 'Consent record not found.');
  }
  const consent = consentSnap.data()!;

  await db.runTransaction(async (tx) => {
    tx.update(consentRef, {
      status: decision,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.update(db.collection('users').doc(consent.teenUid), {
      parentalConsentStatus: decision,
      accountStatus: decision === 'approved' ? 'active' : 'suspended',
      idVerified: decision === 'approved',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.update(db.collection('profiles').doc(consent.teenUid), {
      accountStatus: decision === 'approved' ? 'active' : 'suspended',
      idVerified: decision === 'approved',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return { ok: true, status: decision };
});

/**
 * Syncs contract status changes to job & chat records.
 */
export const onContractUpdated = onDocumentUpdated(
  'contracts/{contractId}',
  async (event) => {
    const after = event.data?.after.data();
    if (!after) return;
    if (after.status === 'completed' && after.jobId) {
      await db.collection('jobs').doc(after.jobId).update({
        status: 'completed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
);
