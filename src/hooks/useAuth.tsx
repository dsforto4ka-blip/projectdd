import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import {
  createParentConsentDoc,
  createUserAccountDocs,
  generateId,
  handleFirestoreError,
  OperationType,
  updateUserPrivateDoc,
  updatePublicProfileDoc,
} from '../lib/firestoreService';
import { ADMIN_BOOTSTRAP_EMAIL, evaluateAgeFromDob } from '../lib/rules';
import { useAppStore } from '../lib/store';
import type { PublicProfile, UserPrivate, UserRole } from '../types';

export type DemoPreset = 'teen' | 'pending_teen' | 'client' | 'admin';

interface AuthContextValue {
  authReady: boolean;
  firebaseUser: FirebaseUser | null;
  isDemoSession: boolean;
  isAdmin: boolean;
  userPrivate: UserPrivate | null;
  publicProfile: PublicProfile | null;
  signInWithGoogle: () => Promise<void>;
  sendPasswordlessEmailLink: (email: string) => Promise<{ mode: 'firebase_link' | 'otp_preview'; previewOtp?: string }>;
  verifyEmailOtpPreview: (email: string, otp: string) => Promise<void>;
  completeEmailLinkIfPresent: (fallbackEmail?: string) => Promise<boolean>;
  completeOnboarding: (payload: {
    displayName: string;
    role: UserRole;
    dob: string;
    parentEmail?: string;
  }) => Promise<{ status: UserPrivate['accountStatus']; consentId?: string }>;
  switchRole: (nextRole: UserRole) => Promise<void>;
  enterDemoSession: (preset: DemoPreset) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const EMAIL_STORAGE_KEY = 'vibeworking_email_for_signin';
const OTP_STORAGE_KEY = 'vibeworking_pending_otp';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [liveUserPrivate, setLiveUserPrivate] = useState<UserPrivate | null>(null);
  const [livePublicProfile, setLivePublicProfile] = useState<PublicProfile | null>(null);
  const [liveAdminClaim, setLiveAdminClaim] = useState(false);
  const [demoUid, setDemoUid] = useState<string | null>(null);

  const demoUsers = useAppStore((s) => s.demoUsers);
  const demoProfiles = useAppStore((s) => s.demoProfiles);
  const setDemoUsers = useAppStore((s) => s.setDemoUsers);
  const setDemoProfiles = useAppStore((s) => s.setDemoProfiles);
  const setDemoConsents = useAppStore((s) => s.setDemoConsents);
  const pushToast = useAppStore((s) => s.pushToast);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        setLiveUserPrivate(null);
        setLivePublicProfile(null);
        setLiveAdminClaim(false);
        setAuthReady(true);
      } else {
        setDemoUid(null);
      }
    });
    return () => unsub();
  }, []);

  // Attach Firestore listeners only when authenticated
  useEffect(() => {
    if (!firebaseUser) return;
    let active = true;

    const ensureUserDocs = async () => {
      try {
        const userSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (!userSnap.exists() && active) {
          const defaultName = (
            firebaseUser.displayName ||
            firebaseUser.email?.split('@')[0] ||
            'Новый участник'
          ).slice(0, 80);
          const initialPrivate: UserPrivate = {
            uid: firebaseUser.uid,
            email: (firebaseUser.email || '').slice(0, 200),
            displayName: defaultName,
            role: 'freelancer',
            ageGroup: 'unverified',
            parentalConsentStatus: 'not_required',
            accountStatus: 'onboarding',
            walletBalance: 25000,
            escrowHeld: 0,
            earnedBalance: 0,
            emailVerified: firebaseUser.emailVerified,
            idVerified: false,
            isBanned: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          const initialPublic: PublicProfile = {
            uid: firebaseUser.uid,
            displayName: defaultName,
            photoURL: (firebaseUser.photoURL || '').slice(0, 500),
            role: 'freelancer',
            ageGroupLabel: 'Unverified',
            bio: '',
            skills: [],
            portfolio: [],
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Moscow',
            availability: 'weekends',
            rating: 0,
            reviewCount: 0,
            completedJobs: 0,
            idVerified: false,
            emailVerified: firebaseUser.emailVerified,
            accountStatus: 'onboarding',
            updatedAt: new Date().toISOString(),
          };
          await createUserAccountDocs(initialPrivate, initialPublic);
        }

        const adminSnap = await getDoc(doc(db, 'admins', firebaseUser.uid));
        if (active) {
          setLiveAdminClaim(
            adminSnap.exists() ||
              (firebaseUser.email === ADMIN_BOOTSTRAP_EMAIL && firebaseUser.emailVerified)
          );
        }
      } catch (err) {
        console.error('Auth bootstrap check:', err);
      } finally {
        if (active) setAuthReady(true);
      }
    };

    ensureUserDocs();

    const unsubUser = onSnapshot(
      doc(db, 'users', firebaseUser.uid),
      (snap) => {
        if (snap.exists()) setLiveUserPrivate(snap.data() as UserPrivate);
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`)
    );

    const unsubProfile = onSnapshot(
      doc(db, 'profiles', firebaseUser.uid),
      (snap) => {
        if (snap.exists()) setLivePublicProfile(snap.data() as PublicProfile);
      },
      (err) => handleFirestoreError(err, OperationType.GET, `profiles/${firebaseUser.uid}`)
    );

    return () => {
      active = false;
      unsubUser();
      unsubProfile();
    };
  }, [firebaseUser]);

  // Sync public profile accountStatus if private account became active (e.g. after parent approval)
  useEffect(() => {
    if (!firebaseUser || !liveUserPrivate || !livePublicProfile) return;
    if (liveUserPrivate.accountStatus !== livePublicProfile.accountStatus) {
      updatePublicProfileDoc(firebaseUser.uid, {
        accountStatus: liveUserPrivate.accountStatus,
      }).catch(() => {});
    }
  }, [firebaseUser, liveUserPrivate, livePublicProfile]);

  const userPrivate = useMemo(() => {
    if (firebaseUser) return liveUserPrivate;
    if (demoUid) return demoUsers.find((u) => u.uid === demoUid) || null;
    return null;
  }, [firebaseUser, liveUserPrivate, demoUid, demoUsers]);

  const publicProfile = useMemo(() => {
    if (firebaseUser) return livePublicProfile;
    if (demoUid) return demoProfiles.find((p) => p.uid === demoUid) || null;
    return null;
  }, [firebaseUser, livePublicProfile, demoUid, demoProfiles]);

  const isDemoSession = Boolean(!firebaseUser && demoUid);
  const isAdmin = firebaseUser ? liveAdminClaim : demoUid === 'demo_admin_1';

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const sendPasswordlessEmailLink = async (
    email: string
  ): Promise<{ mode: 'firebase_link' | 'otp_preview'; previewOtp?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const basePrefix = import.meta.env.BASE_URL.replace(/\/$/, '');
    const hashPrefix = window.location.hostname.endsWith('.github.io') ? '/#' : '';
    const actionCodeSettings = {
      url: `${window.location.origin}${basePrefix}${hashPrefix}/auth?finishEmailSignIn=1`,
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, cleanEmail, actionCodeSettings);
      window.localStorage.setItem(EMAIL_STORAGE_KEY, cleanEmail);
      return { mode: 'firebase_link' };
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code || '';
      if (code === 'auth/too-many-requests') {
        throw new Error('Слишком много попыток, попробуйте позже.');
      }
      // If Email Link provider is not enabled yet in Firebase Console, offer clear 6-digit OTP sandbox flow
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      window.localStorage.setItem(
        OTP_STORAGE_KEY,
        JSON.stringify({ email: cleanEmail, otp, expiresAt: Date.now() + 10 * 60 * 1000, attempts: 0 })
      );
      return { mode: 'otp_preview', previewOtp: otp };
    }
  };

  const verifyEmailOtpPreview = async (email: string, otp: string) => {
    const raw = window.localStorage.getItem(OTP_STORAGE_KEY);
    if (!raw) {
      throw new Error('Код не найден или истёк. Запросите новый код.');
    }
    const parsed = JSON.parse(raw) as { email: string; otp: string; expiresAt: number; attempts: number };
    if (Date.now() > parsed.expiresAt) {
      window.localStorage.removeItem(OTP_STORAGE_KEY);
      throw new Error('Срок действия кода или ссылки истёк. Запросите новый.');
    }
    if (parsed.attempts >= 5) {
      throw new Error('Слишком много попыток, попробуйте позже.');
    }
    if (parsed.email !== email.trim().toLowerCase() || parsed.otp !== otp.trim()) {
      parsed.attempts += 1;
      window.localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(parsed));
      throw new Error('Неверный 6-значный код подтверждения.');
    }

    window.localStorage.removeItem(OTP_STORAGE_KEY);
    const cleanEmail = email.trim().toLowerCase();
    const newUid = `otp_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const existingUser = demoUsers.find((u) => u.uid === newUid);
    if (!existingUser) {
      const now = new Date().toISOString();
      const name = cleanEmail.split('@')[0];
      const userObj: UserPrivate = {
        uid: newUid,
        email: cleanEmail,
        displayName: name,
        role: 'freelancer',
        ageGroup: 'unverified',
        parentalConsentStatus: 'not_required',
        accountStatus: 'onboarding',
        walletBalance: 25000,
        escrowHeld: 0,
        earnedBalance: 0,
        emailVerified: true,
        idVerified: false,
        isBanned: false,
        createdAt: now,
        updatedAt: now,
      };
      const profileObj: PublicProfile = {
        uid: newUid,
        displayName: name,
        photoURL: '',
        role: 'freelancer',
        ageGroupLabel: 'Unverified',
        bio: '',
        skills: [],
        portfolio: [],
        timezone: 'Europe/Moscow',
        availability: 'weekends',
        rating: 0,
        reviewCount: 0,
        completedJobs: 0,
        idVerified: false,
        emailVerified: true,
        accountStatus: 'onboarding',
        updatedAt: now,
      };
      setDemoUsers((prev) => [...prev, userObj]);
      setDemoProfiles((prev) => [...prev, profileObj]);
    }
    setDemoUid(newUid);
  };

  const completeEmailLinkIfPresent = async (fallbackEmail?: string): Promise<boolean> => {
    if (!isSignInWithEmailLink(auth, window.location.href)) return false;
    const savedEmail = window.localStorage.getItem(EMAIL_STORAGE_KEY) || fallbackEmail;
    if (!savedEmail) {
      throw new Error('Введите свой email для подтверждения ссылки входа.');
    }
    await signInWithEmailLink(auth, savedEmail, window.location.href);
    window.localStorage.removeItem(EMAIL_STORAGE_KEY);
    return true;
  };

  const completeOnboarding = async (payload: {
    displayName: string;
    role: UserRole;
    dob: string;
    parentEmail?: string;
  }): Promise<{ status: UserPrivate['accountStatus']; consentId?: string }> => {
    if (!userPrivate) throw new Error('Требуется вход в аккаунт.');
    const evalResult = evaluateAgeFromDob(payload.dob);

    let consentId = userPrivate.parentConsentId || '';
    if (evalResult.ageGroup === '13_17') {
      if (!payload.parentEmail || !payload.parentEmail.includes('@')) {
        throw new Error('Для участников 13–17 лет нужен корректный email родителя или опекуна.');
      }
      if (payload.parentEmail.trim().toLowerCase() === userPrivate.email.toLowerCase()) {
        throw new Error('Email родителя должен отличаться от вашего собственного email.');
      }
      consentId = generateId('consent');
      const consentRecord = {
        id: consentId,
        teenUid: userPrivate.uid,
        teenName: payload.displayName.trim(),
        parentEmail: payload.parentEmail.trim().toLowerCase(),
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (firebaseUser) {
        await createParentConsentDoc(consentRecord);
      } else {
        setDemoConsents((prev) => [...prev, consentRecord]);
      }
    }

    const safeName = payload.displayName.trim().slice(0, 80);
    const safeParentEmail = (payload.parentEmail?.trim().toLowerCase() || '').slice(0, 200);

    if (firebaseUser) {
      await updateUserPrivateDoc(userPrivate.uid, {
        displayName: safeName,
        role: payload.role,
        dob: payload.dob.slice(0, 20),
        ageGroup: evalResult.ageGroup,
        parentEmail: safeParentEmail,
        parentalConsentStatus: evalResult.parentalConsentStatus,
        parentConsentId: consentId,
        accountStatus: evalResult.accountStatus,
      });
      await updatePublicProfileDoc(userPrivate.uid, {
        displayName: safeName,
        role: payload.role,
        ageGroupLabel: evalResult.ageGroupLabel,
        accountStatus: evalResult.accountStatus,
      });
    } else {
      const now = new Date().toISOString();
      setDemoUsers((prev) =>
        prev.map((u) =>
          u.uid === userPrivate.uid
            ? {
                ...u,
                displayName: payload.displayName.trim(),
                role: payload.role,
                dob: payload.dob,
                ageGroup: evalResult.ageGroup,
                parentEmail: payload.parentEmail?.trim().toLowerCase() || '',
                parentalConsentStatus: evalResult.parentalConsentStatus,
                parentConsentId: consentId,
                accountStatus: evalResult.accountStatus,
                updatedAt: now,
              }
            : u
        )
      );
      setDemoProfiles((prev) =>
        prev.map((p) =>
          p.uid === userPrivate.uid
            ? {
                ...p,
                displayName: payload.displayName.trim(),
                role: payload.role,
                ageGroupLabel: evalResult.ageGroupLabel,
                accountStatus: evalResult.accountStatus,
                updatedAt: now,
              }
            : p
        )
      );
    }

    return { status: evalResult.accountStatus, consentId };
  };

  const switchRole = async (nextRole: UserRole) => {
    if (!userPrivate) return;
    if (firebaseUser) {
      await updateUserPrivateDoc(userPrivate.uid, { role: nextRole });
      await updatePublicProfileDoc(userPrivate.uid, { role: nextRole });
    } else {
      setDemoUsers((prev) =>
        prev.map((u) => (u.uid === userPrivate.uid ? { ...u, role: nextRole } : u))
      );
      setDemoProfiles((prev) =>
        prev.map((p) => (p.uid === userPrivate.uid ? { ...p, role: nextRole } : p))
      );
    }
    pushToast('info', `Режим переключён: ${nextRole === 'client' ? 'Заказчик (нанимаю)' : 'Исполнитель (работаю)'}.`);
  };

  const enterDemoSession = (preset: DemoPreset) => {
    if (preset === 'teen') {
      setDemoUid('demo_teen_1');
      return;
    }
    if (preset === 'client') {
      setDemoUid('demo_client_1');
      return;
    }
    if (preset === 'admin') {
      setDemoUid('demo_admin_1');
      return;
    }
    // Create or select pending teen onboarding state
    const pendingId = 'demo_teen_pending';
    if (!demoUsers.some((u) => u.uid === pendingId)) {
      const now = new Date().toISOString();
      setDemoUsers((prev) => [
        ...prev,
        {
          uid: pendingId,
          email: 'egor.smirnov@teen.example.ru',
          displayName: 'Егор Смирнов',
          role: 'freelancer',
          ageGroup: 'unverified',
          parentalConsentStatus: 'not_required',
          accountStatus: 'onboarding',
          walletBalance: 10000,
          escrowHeld: 0,
          earnedBalance: 0,
          emailVerified: true,
          idVerified: false,
          isBanned: false,
          createdAt: now,
          updatedAt: now,
        },
      ]);
      setDemoProfiles((prev) => [
        ...prev,
        {
          uid: pendingId,
          displayName: 'Егор Смирнов',
          photoURL: '',
          role: 'freelancer',
          ageGroupLabel: 'Unverified',
          bio: '',
          skills: [],
          portfolio: [],
          timezone: 'Europe/Moscow',
          availability: 'weekends',
          rating: 0,
          reviewCount: 0,
          completedJobs: 0,
          idVerified: false,
          emailVerified: true,
          accountStatus: 'onboarding',
          updatedAt: now,
        },
      ]);
    }
    setDemoUid(pendingId);
  };

  const logout = async () => {
    setDemoUid(null);
    if (firebaseUser) {
      await signOut(auth);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        authReady,
        firebaseUser,
        isDemoSession,
        isAdmin,
        userPrivate,
        publicProfile,
        signInWithGoogle,
        sendPasswordlessEmailLink,
        verifyEmailOtpPreview,
        completeEmailLinkIfPresent,
        completeOnboarding,
        switchRole,
        enterDemoSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
