import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from './firebase';
import type {
  Bid,
  ChatMessage,
  ChatRoom,
  Contract,
  Dispute,
  Job,
  NotificationItem,
  ParentConsentRecord,
  PublicProfile,
  Review,
  UserPrivate,
} from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function generateId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

export function formatTimestamp(value: unknown): string {
  if (!value) return 'Только что';
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime())
      ? value
      : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date })
      .toDate()
      .toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return 'Недавно';
}

export async function uploadWorkspaceFile(folder: string, file: File): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storageRef = ref(storage, `${folder}/${Date.now()}_${safeName}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

// ---------------- Users & Profiles ----------------

export async function getUserPrivate(uid: string): Promise<UserPrivate | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data() as UserPrivate) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function getPublicProfile(uid: string): Promise<PublicProfile | null> {
  const path = `profiles/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'profiles', uid));
    return snap.exists() ? (snap.data() as PublicProfile) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createUserAccountDocs(userPrivate: UserPrivate, publicProfile: PublicProfile): Promise<void> {
  const userPath = `users/${userPrivate.uid}`;
  const profilePath = `profiles/${publicProfile.uid}`;
  try {
    await setDoc(doc(db, 'users', userPrivate.uid), {
      ...userPrivate,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, userPath);
  }

  try {
    await setDoc(doc(db, 'profiles', publicProfile.uid), {
      ...publicProfile,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, profilePath);
  }
}

export async function updateUserPrivateDoc(uid: string, patch: Partial<UserPrivate>): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      ...patch,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updatePublicProfileDoc(uid: string, patch: Partial<PublicProfile>): Promise<void> {
  const path = `profiles/${uid}`;
  try {
    await updateDoc(doc(db, 'profiles', uid), {
      ...patch,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ---------------- Parental Consent ----------------

export async function createParentConsentDoc(record: ParentConsentRecord): Promise<void> {
  const path = `parentConsents/${record.id}`;
  try {
    await setDoc(doc(db, 'parentConsents', record.id), {
      ...record,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getParentConsentDoc(consentId: string): Promise<ParentConsentRecord | null> {
  const path = `parentConsents/${consentId}`;
  try {
    const snap = await getDoc(doc(db, 'parentConsents', consentId));
    return snap.exists() ? (snap.data() as ParentConsentRecord) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function updateParentConsentStatus(
  consentId: string,
  teenUid: string,
  status: 'approved' | 'revoked'
): Promise<void> {
  const consentPath = `parentConsents/${consentId}`;
  try {
    await updateDoc(doc(db, 'parentConsents', consentId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, consentPath);
  }

  const userPath = `users/${teenUid}`;
  try {
    await updateDoc(doc(db, 'users', teenUid), {
      parentalConsentStatus: status,
      accountStatus: status === 'approved' ? 'active' : 'suspended',
      idVerified: status === 'approved',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }

  try {
    await updateDoc(doc(db, 'profiles', teenUid), {
      accountStatus: status === 'approved' ? 'active' : 'suspended',
      idVerified: status === 'approved',
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Non-admin parents cannot update idVerified on public profiles directly; owner syncs accountStatus on next load.
  }
}

// ---------------- Jobs ----------------

export function subscribeApprovedJobs(
  onData: (jobs: Job[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'jobs';
  const q = query(collection(db, 'jobs'), where('moderationStatus', '==', 'approved'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as Job);
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function createJobDoc(job: Job): Promise<void> {
  const path = `jobs/${job.id}`;
  try {
    await setDoc(doc(db, 'jobs', job.id), {
      ...job,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateJobDoc(jobId: string, patch: Partial<Job>): Promise<void> {
  const path = `jobs/${jobId}`;
  try {
    await updateDoc(doc(db, 'jobs', jobId), {
      ...patch,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function hasAnyJobsInFirestore(): Promise<boolean> {
  try {
    const snap = await getDocs(query(collection(db, 'jobs'), limit(1)));
    return !snap.empty;
  } catch {
    return true;
  }
}

export async function doesJobExistInFirestore(jobId: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'jobs', jobId));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function seedStarterFirestoreData(
  jobs: Job[],
  profiles: PublicProfile[]
): Promise<void> {
  for (const job of jobs) {
    try {
      await setDoc(doc(db, 'jobs', job.id), {
        ...job,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `jobs/${job.id}`);
    }
  }
  for (const profile of profiles) {
    try {
      const existing = await getDoc(doc(db, 'profiles', profile.uid));
      if (!existing.exists()) {
        await setDoc(doc(db, 'profiles', profile.uid), {
          ...profile,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `profiles/${profile.uid}`);
    }
  }
}

// ---------------- Bids ----------------

export async function createBidDoc(bid: Bid): Promise<void> {
  const bidPath = `bids/${bid.id}`;
  try {
    await setDoc(doc(db, 'bids', bid.id), {
      ...bid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, bidPath);
  }

  const jobPath = `jobs/${bid.jobId}`;
  try {
    await updateDoc(doc(db, 'jobs', bid.jobId), {
      bidCount: increment(1),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, jobPath);
  }
}

export async function updateBidDoc(bidId: string, patch: Partial<Bid>): Promise<void> {
  const path = `bids/${bidId}`;
  try {
    await updateDoc(doc(db, 'bids', bidId), {
      ...patch,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function listUserBids(uid: string, role: 'freelancer' | 'client'): Promise<Bid[]> {
  const path = 'bids';
  const field = role === 'freelancer' ? 'freelancerId' : 'clientId';
  try {
    const snap = await getDocs(query(collection(db, 'bids'), where(field, '==', uid)));
    return snap.docs.map((d) => d.data() as Bid);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// ---------------- Contracts ----------------

export async function createContractDoc(contract: Contract): Promise<void> {
  const path = `contracts/${contract.id}`;
  try {
    await setDoc(doc(db, 'contracts', contract.id), {
      ...contract,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateContractDoc(contractId: string, patch: Partial<Contract>): Promise<void> {
  const path = `contracts/${contractId}`;
  try {
    await updateDoc(doc(db, 'contracts', contractId), {
      ...patch,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeUserContracts(
  uid: string,
  roleField: 'clientId' | 'freelancerId',
  onData: (contracts: Contract[]) => void
): Unsubscribe {
  const path = 'contracts';
  const q = query(collection(db, 'contracts'), where(roleField, '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as Contract));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

// ---------------- Disputes ----------------

export async function createDisputeDoc(dispute: Dispute): Promise<void> {
  const path = `disputes/${dispute.id}`;
  try {
    await setDoc(doc(db, 'disputes', dispute.id), {
      ...dispute,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateDisputeDoc(disputeId: string, patch: Partial<Dispute>): Promise<void> {
  const path = `disputes/${disputeId}`;
  try {
    await updateDoc(doc(db, 'disputes', disputeId), {
      ...patch,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ---------------- Chat Rooms & Messages ----------------

export async function upsertChatRoomDoc(room: ChatRoom): Promise<void> {
  const path = `chats/${room.id}`;
  try {
    await setDoc(
      doc(db, 'chats', room.id),
      {
        ...room,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeChatMessages(
  chatId: string,
  onData: (messages: ChatMessage[]) => void
): Unsubscribe {
  const path = `chats/${chatId}/messages`;
  const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as ChatMessage));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export async function sendChatMessageDoc(message: ChatMessage): Promise<void> {
  const msgPath = `chats/${message.chatId}/messages/${message.id}`;
  try {
    await setDoc(doc(db, 'chats', message.chatId, 'messages', message.id), {
      ...message,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, msgPath);
  }

  const roomPath = `chats/${message.chatId}`;
  try {
    await updateDoc(doc(db, 'chats', message.chatId), {
      lastMessage: message.text.slice(0, 280),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, roomPath);
  }
}

// ---------------- Reviews ----------------

export async function createReviewDoc(review: Review): Promise<void> {
  const path = `reviews/${review.id}`;
  try {
    await setDoc(doc(db, 'reviews', review.id), {
      ...review,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateReviewDoc(reviewId: string, patch: Partial<Review>): Promise<void> {
  const path = `reviews/${reviewId}`;
  try {
    await updateDoc(doc(db, 'reviews', reviewId), patch);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ---------------- Notifications ----------------

export async function createNotificationDoc(item: NotificationItem): Promise<void> {
  const path = `notifications/${item.id}`;
  try {
    await setDoc(doc(db, 'notifications', item.id), {
      ...item,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function markNotificationReadDoc(notificationId: string): Promise<void> {
  const path = `notifications/${notificationId}`;
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeUserNotifications(
  uid: string,
  onData: (items: NotificationItem[]) => void
): Unsubscribe {
  const path = 'notifications';
  const q = query(collection(db, 'notifications'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as NotificationItem));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}
