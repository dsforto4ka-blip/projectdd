import { create } from 'zustand';
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
import {
  SEED_BIDS,
  SEED_CHATS,
  SEED_CONTRACTS,
  SEED_DISPUTES,
  SEED_JOBS,
  SEED_MESSAGES,
  SEED_NOTIFICATIONS,
  SEED_PARENT_CONSENTS,
  SEED_PUBLIC_PROFILES,
  SEED_REVIEWS,
  SEED_USERS_PRIVATE,
} from './seedData';

export interface ToastNotice {
  id: string;
  tone: 'success' | 'error' | 'info';
  message: string;
}

interface AppStoreState {
  darkMode: boolean;
  toggleDarkMode: () => void;
  toasts: ToastNotice[];
  pushToast: (tone: ToastNotice['tone'], message: string) => void;
  dismissToast: (id: string) => void;

  // Rate limit timestamps in memory
  bidTimestamps: number[];
  messageTimestamps: number[];
  jobTimestamps: number[];
  recordActionTimestamp: (bucket: 'bid' | 'message' | 'job', next: number[]) => void;

  // Sandbox / seeded workspace state (mirrors real structure for public browsing & interactive preview)
  demoUsers: UserPrivate[];
  demoProfiles: PublicProfile[];
  demoConsents: ParentConsentRecord[];
  demoJobs: Job[];
  demoBids: Bid[];
  demoContracts: Contract[];
  demoDisputes: Dispute[];
  demoChats: ChatRoom[];
  demoMessages: Record<string, ChatMessage[]>;
  demoReviews: Review[];
  demoNotifications: NotificationItem[];

  setDemoUsers: (updater: (prev: UserPrivate[]) => UserPrivate[]) => void;
  setDemoProfiles: (updater: (prev: PublicProfile[]) => PublicProfile[]) => void;
  setDemoConsents: (updater: (prev: ParentConsentRecord[]) => ParentConsentRecord[]) => void;
  setDemoJobs: (updater: (prev: Job[]) => Job[]) => void;
  setDemoBids: (updater: (prev: Bid[]) => Bid[]) => void;
  setDemoContracts: (updater: (prev: Contract[]) => Contract[]) => void;
  setDemoDisputes: (updater: (prev: Dispute[]) => Dispute[]) => void;
  setDemoChats: (updater: (prev: ChatRoom[]) => ChatRoom[]) => void;
  setDemoMessages: (chatId: string, updater: (prev: ChatMessage[]) => ChatMessage[]) => void;
  setDemoReviews: (updater: (prev: Review[]) => Review[]) => void;
  setDemoNotifications: (updater: (prev: NotificationItem[]) => NotificationItem[]) => void;
}

function getInitialDarkMode(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem('vibeworking_theme') === 'dark';
  } catch {
    return false;
  }
}

const initialDark = getInitialDarkMode();

if (typeof document !== 'undefined') {
  document.documentElement.classList.toggle('dark', initialDark);
}

export const useAppStore = create<AppStoreState>((set) => ({
  darkMode: initialDark,
  toggleDarkMode: () =>
    set((state) => {
      const next = !state.darkMode;
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', next);
      }
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('vibeworking_theme', next ? 'dark' : 'light');
        }
      } catch {
        // Ignore storage restrictions
      }
      return { darkMode: next };
    }),

  toasts: [],
  pushToast: (tone, message) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({ toasts: [...s.toasts.slice(-1), { id, tone, message }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  bidTimestamps: [],
  messageTimestamps: [],
  jobTimestamps: [],
  recordActionTimestamp: (bucket, next) =>
    set(() => {
      if (bucket === 'bid') return { bidTimestamps: next };
      if (bucket === 'message') return { messageTimestamps: next };
      return { jobTimestamps: next };
    }),

  demoUsers: SEED_USERS_PRIVATE,
  demoProfiles: SEED_PUBLIC_PROFILES,
  demoConsents: SEED_PARENT_CONSENTS,
  demoJobs: SEED_JOBS,
  demoBids: SEED_BIDS,
  demoContracts: SEED_CONTRACTS,
  demoDisputes: SEED_DISPUTES,
  demoChats: SEED_CHATS,
  demoMessages: SEED_MESSAGES,
  demoReviews: SEED_REVIEWS,
  demoNotifications: SEED_NOTIFICATIONS,

  setDemoUsers: (updater) => set((s) => ({ demoUsers: updater(s.demoUsers) })),
  setDemoProfiles: (updater) => set((s) => ({ demoProfiles: updater(s.demoProfiles) })),
  setDemoConsents: (updater) => set((s) => ({ demoConsents: updater(s.demoConsents) })),
  setDemoJobs: (updater) => set((s) => ({ demoJobs: updater(s.demoJobs) })),
  setDemoBids: (updater) => set((s) => ({ demoBids: updater(s.demoBids) })),
  setDemoContracts: (updater) => set((s) => ({ demoContracts: updater(s.demoContracts) })),
  setDemoDisputes: (updater) => set((s) => ({ demoDisputes: updater(s.demoDisputes) })),
  setDemoChats: (updater) => set((s) => ({ demoChats: updater(s.demoChats) })),
  setDemoMessages: (chatId, updater) =>
    set((s) => ({
      demoMessages: {
        ...s.demoMessages,
        [chatId]: updater(s.demoMessages[chatId] || []),
      },
    })),
  setDemoReviews: (updater) => set((s) => ({ demoReviews: updater(s.demoReviews) })),
  setDemoNotifications: (updater) => set((s) => ({ demoNotifications: updater(s.demoNotifications) })),
}));
