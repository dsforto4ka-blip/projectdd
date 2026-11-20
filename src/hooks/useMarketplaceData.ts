import { useEffect, useRef, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  createBidDoc,
  createContractDoc,
  createDisputeDoc,
  createJobDoc,
  createNotificationDoc,
  createReviewDoc,
  doesJobExistInFirestore,
  generateId,
  handleFirestoreError,
  hasAnyJobsInFirestore,
  markNotificationReadDoc,
  OperationType,
  seedStarterFirestoreData,
  sendChatMessageDoc,
  subscribeApprovedJobs,
  updateBidDoc,
  updateContractDoc,
  updateDisputeDoc,
  updateJobDoc,
  updateParentConsentStatus,
  updatePublicProfileDoc,
  updateReviewDoc,
  updateUserPrivateDoc,
  upsertChatRoomDoc,
} from '../lib/firestoreService';
import {
  applySevenDayAutoApprove,
  approveMilestoneAndRelease,
  canPerformMarketplaceActions,
  canSubmitTeenBid,
  checkClientRateLimit,
  containsBannedContent,
  formatCurrency,
  fundEscrowBalance,
  requestMilestoneRevision,
  resolveDisputeAmounts,
  sanitizePreHireMessage,
  submitMilestoneDeliverable,
} from '../lib/rules';
import { SEED_JOBS, SEED_PUBLIC_PROFILES } from '../lib/seedData';
import { useAppStore } from '../lib/store';
import { useAuth } from './useAuth';
import type {
  Bid,
  ChatMessage,
  ChatRoom,
  Contract,
  Dispute,
  Job,
  Milestone,
  NotificationItem,
  ParentConsentRecord,
  PublicProfile,
  Review,
  UserPrivate,
} from '../types';

export function useMarketplaceData() {
  const { firebaseUser, isAdmin, userPrivate, publicProfile } = useAuth();
  const store = useAppStore();

  const [liveJobs, setLiveJobs] = useState<Job[]>([]);
  const [liveBids, setLiveBids] = useState<Bid[]>([]);
  const [liveContracts, setLiveContracts] = useState<Contract[]>([]);
  const [liveDisputes, setLiveDisputes] = useState<Dispute[]>([]);
  const [liveChats, setLiveChats] = useState<ChatRoom[]>([]);
  const [liveReviews, setLiveReviews] = useState<Review[]>([]);
  const [liveNotifications, setLiveNotifications] = useState<NotificationItem[]>([]);
  const [liveProfiles, setLiveProfiles] = useState<PublicProfile[]>([]);
  const [liveUsers, setLiveUsers] = useState<UserPrivate[]>([]);
  const [liveConsents, setLiveConsents] = useState<ParentConsentRecord[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const seedAttemptedRef = useRef(false);

  useEffect(() => {
    // Publicly approved jobs stream when Firestore is reachable
    const unsub = subscribeApprovedJobs(
      (items) => {
        setLiveJobs(items);
        setLoadingJobs(false);
      },
      () => setLoadingJobs(false)
    );
    return () => unsub();
  }, []);

  // Automatically seed starter Russian jobs & public profiles to Firestore when an admin connects to an empty DB
  useEffect(() => {
    if (!firebaseUser || !isAdmin || loadingJobs || seedAttemptedRef.current) return;
    if (liveJobs.length > 0) return;

    seedAttemptedRef.current = true;
    hasAnyJobsInFirestore()
      .then((hasJobs) => {
        if (!hasJobs) {
          return seedStarterFirestoreData(SEED_JOBS, SEED_PUBLIC_PROFILES);
        }
        return undefined;
      })
      .catch((err) => {
        console.error('Starter seed skipped or failed:', err);
      });
  }, [firebaseUser, isAdmin, loadingJobs, liveJobs.length]);

  useEffect(() => {
    if (!firebaseUser) {
      setLiveBids([]);
      setLiveContracts([]);
      setLiveDisputes([]);
      setLiveChats([]);
      setLiveReviews([]);
      setLiveNotifications([]);
      setLiveProfiles([]);
      setLiveUsers([]);
      setLiveConsents([]);
      return;
    }
    const unsubs: Array<() => void> = [];

    // Profiles (active or own)
    const profilesQ = isAdmin
      ? collection(db, 'profiles')
      : query(collection(db, 'profiles'), where('accountStatus', '==', 'active'));
    unsubs.push(
      onSnapshot(
        profilesQ,
        (s) => setLiveProfiles(s.docs.map((d) => d.data() as PublicProfile)),
        (e) => handleFirestoreError(e, OperationType.LIST, 'profiles')
      )
    );

    // Reviews
    const reviewsQ = isAdmin
      ? collection(db, 'reviews')
      : query(collection(db, 'reviews'), where('isHidden', '==', false));
    unsubs.push(
      onSnapshot(
        reviewsQ,
        (s) => setLiveReviews(s.docs.map((d) => d.data() as Review)),
        (e) => handleFirestoreError(e, OperationType.LIST, 'reviews')
      )
    );

    // Notifications for user
    unsubs.push(
      onSnapshot(
        query(collection(db, 'notifications'), where('userId', '==', firebaseUser.uid)),
        (s) => setLiveNotifications(s.docs.map((d) => d.data() as NotificationItem)),
        (e) => handleFirestoreError(e, OperationType.LIST, 'notifications')
      )
    );

    if (isAdmin) {
      unsubs.push(
        onSnapshot(
          collection(db, 'users'),
          (s) => setLiveUsers(s.docs.map((d) => d.data() as UserPrivate)),
          (e) => handleFirestoreError(e, OperationType.LIST, 'users')
        ),
        onSnapshot(
          collection(db, 'bids'),
          (s) => setLiveBids(s.docs.map((d) => d.data() as Bid)),
          (e) => handleFirestoreError(e, OperationType.LIST, 'bids')
        ),
        onSnapshot(
          collection(db, 'contracts'),
          (s) => setLiveContracts(s.docs.map((d) => d.data() as Contract)),
          (e) => handleFirestoreError(e, OperationType.LIST, 'contracts')
        ),
        onSnapshot(
          collection(db, 'disputes'),
          (s) => setLiveDisputes(s.docs.map((d) => d.data() as Dispute)),
          (e) => handleFirestoreError(e, OperationType.LIST, 'disputes')
        ),
        onSnapshot(
          collection(db, 'parentConsents'),
          (s) => setLiveConsents(s.docs.map((d) => d.data() as ParentConsentRecord)),
          (e) => handleFirestoreError(e, OperationType.LIST, 'parentConsents')
        )
      );
    } else {
      // Scoped queries for current user (client or freelancer)
      const uid = firebaseUser.uid;
      unsubs.push(
        onSnapshot(
          query(collection(db, 'bids'), where('freelancerId', '==', uid)),
          (s) => {
            const mine = s.docs.map((d) => d.data() as Bid);
            setLiveBids((prev) => {
              const others = prev.filter((b) => b.freelancerId !== uid);
              return [...others, ...mine];
            });
          },
          (e) => handleFirestoreError(e, OperationType.LIST, 'bids')
        ),
        onSnapshot(
          query(collection(db, 'bids'), where('clientId', '==', uid)),
          (s) => {
            const mine = s.docs.map((d) => d.data() as Bid);
            setLiveBids((prev) => {
              const others = prev.filter((b) => b.clientId !== uid);
              return [...others, ...mine];
            });
          },
          (e) => handleFirestoreError(e, OperationType.LIST, 'bids')
        ),
        onSnapshot(
          query(collection(db, 'contracts'), where('clientId', '==', uid)),
          (s) => {
            const mine = s.docs.map((d) => d.data() as Contract);
            setLiveContracts((prev) => {
              const others = prev.filter((c) => c.clientId !== uid);
              return [...others, ...mine];
            });
          },
          (e) => handleFirestoreError(e, OperationType.LIST, 'contracts')
        ),
        onSnapshot(
          query(collection(db, 'contracts'), where('freelancerId', '==', uid)),
          (s) => {
            const mine = s.docs.map((d) => d.data() as Contract);
            setLiveContracts((prev) => {
              const others = prev.filter((c) => c.freelancerId !== uid);
              return [...others, ...mine];
            });
          },
          (e) => handleFirestoreError(e, OperationType.LIST, 'contracts')
        ),
        onSnapshot(
          query(collection(db, 'disputes'), where('clientId', '==', uid)),
          (s) => {
            const mine = s.docs.map((d) => d.data() as Dispute);
            setLiveDisputes((prev) => {
              const others = prev.filter((d) => d.clientId !== uid);
              return [...others, ...mine];
            });
          },
          (e) => handleFirestoreError(e, OperationType.LIST, 'disputes')
        ),
        onSnapshot(
          query(collection(db, 'disputes'), where('freelancerId', '==', uid)),
          (s) => {
            const mine = s.docs.map((d) => d.data() as Dispute);
            setLiveDisputes((prev) => {
              const others = prev.filter((d) => d.freelancerId !== uid);
              return [...others, ...mine];
            });
          },
          (e) => handleFirestoreError(e, OperationType.LIST, 'disputes')
        ),
        onSnapshot(
          query(collection(db, 'chats'), where('clientId', '==', uid)),
          (s) => {
            const mine = s.docs.map((d) => d.data() as ChatRoom);
            setLiveChats((prev) => {
              const others = prev.filter((c) => c.clientId !== uid);
              return [...others, ...mine];
            });
          },
          (e) => handleFirestoreError(e, OperationType.LIST, 'chats')
        ),
        onSnapshot(
          query(collection(db, 'chats'), where('freelancerId', '==', uid)),
          (s) => {
            const mine = s.docs.map((d) => d.data() as ChatRoom);
            setLiveChats((prev) => {
              const others = prev.filter((c) => c.freelancerId !== uid);
              return [...others, ...mine];
            });
          },
          (e) => handleFirestoreError(e, OperationType.LIST, 'chats')
        ),
        onSnapshot(
          query(collection(db, 'parentConsents'), where('teenUid', '==', uid)),
          (s) => {
            const mine = s.docs.map((d) => d.data() as ParentConsentRecord);
            setLiveConsents((prev) => {
              const others = prev.filter((c) => c.teenUid !== uid);
              return [...others, ...mine];
            });
          },
          (e) => handleFirestoreError(e, OperationType.LIST, 'parentConsents')
        )
      );

      if (firebaseUser.email) {
        const cleanEmail = firebaseUser.email.toLowerCase();
        unsubs.push(
          onSnapshot(
            query(collection(db, 'parentConsents'), where('parentEmail', '==', cleanEmail)),
            (s) => {
              const mine = s.docs.map((d) => d.data() as ParentConsentRecord);
              setLiveConsents((prev) => {
                const others = prev.filter((c) => c.parentEmail !== cleanEmail);
                return [...others, ...mine];
              });
            },
            (e) => handleFirestoreError(e, OperationType.LIST, 'parentConsents')
          )
        );
      }
    }

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [firebaseUser, isAdmin]);

  // Unified views: never expose unpersisted local demoJobs/demoProfiles to Firebase-authenticated users
  const jobs = firebaseUser ? liveJobs : store.demoJobs;
  const bids = firebaseUser ? liveBids : store.demoBids;
  const contracts = firebaseUser ? liveContracts : store.demoContracts;
  const disputes = firebaseUser ? liveDisputes : store.demoDisputes;
  const chats = firebaseUser ? liveChats : store.demoChats;
  const reviews = firebaseUser ? liveReviews : store.demoReviews;
  const profiles = firebaseUser ? liveProfiles : store.demoProfiles;
  const users = firebaseUser ? liveUsers : store.demoUsers;
  const consents = firebaseUser ? liveConsents : store.demoConsents;
  const notifications = firebaseUser
    ? liveNotifications
    : store.demoNotifications.filter((n) => (userPrivate ? n.userId === userPrivate.uid : false));

  // ---------------- Actions ----------------

  const assertActive = () => {
    if (!userPrivate) throw new Error('Сначала войдите в аккаунт.');
    const check = canPerformMarketplaceActions(userPrivate.accountStatus, userPrivate.isBanned);
    if (!check.allowed) throw new Error(check.reason || 'Действие недоступно.');
  };

  const postJob = async (input: {
    title: string;
    description: string;
    category: Job['category'];
    budgetType: Job['budgetType'];
    budgetMin: number;
    budgetMax: number;
    level: Job['level'];
    deadline: string;
  }): Promise<Job> => {
    assertActive();
    if (!userPrivate || userPrivate.role !== 'client') {
      throw new Error('Переключитесь в режим «Заказчик», чтобы опубликовать заказ.');
    }

    const rate = checkClientRateLimit(store.jobTimestamps, 5, 60 * 60 * 1000);
    if (!rate.allowed) {
      throw new Error(`Слишком много публикаций подряд. Повторите через ${rate.retryAfterSeconds} сек.`);
    }
    store.recordActionTimestamp('job', rate.nextTimestamps);

    const safetyCheck = containsBannedContent(`${input.title} ${input.description}`);
    if (safetyCheck.flagged) {
      throw new Error(`Заказ отклонён фильтром безопасности (запрещённое слово: «${safetyCheck.matchedWord}»).`);
    }

    if (!Number.isFinite(input.budgetMin) || input.budgetMin < 100 || input.budgetMin > 500000) {
      throw new Error('Минимальный бюджет должен быть от 100 до 500 000 ₽.');
    }
    if (!Number.isFinite(input.budgetMax) || input.budgetMax < input.budgetMin || input.budgetMax > 500000) {
      throw new Error('Максимальный бюджет должен быть не меньше минимального и до 500 000 ₽.');
    }

    const job: Job = {
      id: generateId('job'),
      clientId: userPrivate.uid,
      clientName: userPrivate.displayName.slice(0, 80),
      clientVerified: userPrivate.idVerified || userPrivate.emailVerified,
      title: input.title.trim().slice(0, 140),
      description: input.description.trim().slice(0, 4000),
      category: input.category,
      budgetType: input.budgetType,
      budgetMin: input.budgetMin,
      budgetMax: Math.max(input.budgetMin, input.budgetMax),
      level: input.level,
      deadline: input.deadline.slice(0, 40),
      attachments: [],
      status: 'open',
      moderationStatus: 'approved',
      bidCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (firebaseUser) {
      await createJobDoc(job);
    } else {
      store.setDemoJobs((prev) => [job, ...prev]);
    }
    store.pushToast('success', 'Заказ опубликован на бирже VibeWorking.');
    return job;
  };

  const submitBid = async (input: {
    job: Job;
    amount: number;
    deliveryDays: number;
    coverLetter: string;
    portfolioLinks: string[];
  }): Promise<Bid> => {
    assertActive();
    if (!userPrivate || userPrivate.role !== 'freelancer') {
      throw new Error('Переключитесь в режим «Исполнитель» в профиле, чтобы откликнуться.');
    }
    if (input.job.clientId === userPrivate.uid) {
      throw new Error('Нельзя откликнуться на собственный заказ.');
    }
    if (!Number.isFinite(input.amount) || input.amount < 100 || input.amount > 500000) {
      throw new Error('Ставка должна быть от 100 до 500 000 ₽.');
    }
    if (!Number.isFinite(input.deliveryDays) || input.deliveryDays < 1 || input.deliveryDays > 180) {
      throw new Error('Срок выполнения должен быть от 1 до 180 дней.');
    }

    const rate = checkClientRateLimit(store.bidTimestamps, 5, 10 * 60 * 1000);
    if (!rate.allowed) {
      throw new Error(`Слишком много откликов за короткое время. Подождите ${rate.retryAfterSeconds} сек.`);
    }
    store.recordActionTimestamp('bid', rate.nextTimestamps);

    const activeBidsCount = bids.filter(
      (b) => b.freelancerId === userPrivate.uid && (b.status === 'pending' || b.status === 'interviewing')
    ).length;
    const bidCap = canSubmitTeenBid(activeBidsCount);
    if (!bidCap.allowed) {
      throw new Error(bidCap.reason);
    }

    const safety = containsBannedContent(input.coverLetter);
    if (safety.flagged) {
      throw new Error(`Отклик заблокирован фильтром безопасности («${safety.matchedWord}»).`);
    }

    const sanitizedLetter = sanitizePreHireMessage(input.coverLetter, false);
    const finalCoverLetter = sanitizedLetter.sanitizedText.trim().slice(0, 2000);
    if (!finalCoverLetter) {
      throw new Error('Напишите сопроводительное письмо перед отправкой.');
    }

    const bid: Bid = {
      id: generateId('bid'),
      jobId: input.job.id,
      jobTitle: input.job.title.slice(0, 140),
      clientId: input.job.clientId,
      freelancerId: userPrivate.uid,
      freelancerName: userPrivate.displayName.slice(0, 80),
      freelancerRating: Math.min(5, Math.max(0, publicProfile?.rating || 0)),
      amount: input.amount,
      deliveryDays: input.deliveryDays,
      coverLetter: finalCoverLetter,
      portfolioLinks: input.portfolioLinks.filter((l) => l.trim().length > 0).slice(0, 5),
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const notif: NotificationItem = {
      id: generateId('notif'),
      userId: input.job.clientId,
      title: 'Новый отклик на заказ',
      body: `${userPrivate.displayName} предложил(а) ${formatCurrency(input.amount)} за «${input.job.title}».`.slice(0, 295),
      link: `/jobs/${input.job.id}`.slice(0, 200),
      read: false,
      createdAt: new Date().toISOString(),
    };

    if (firebaseUser) {
      const jobExists = await doesJobExistInFirestore(input.job.id);
      if (!jobExists) {
        if (isAdmin) {
          await createJobDoc(input.job);
        } else {
          throw new Error('Заказ ещё не синхронизирован с базой данных или уже удалён.');
        }
      }
      await createBidDoc(bid);
      await createNotificationDoc(notif);
    } else {
      store.setDemoBids((prev) => [bid, ...prev]);
      store.setDemoJobs((prev) =>
        prev.map((j) => (j.id === input.job.id ? { ...j, bidCount: j.bidCount + 1 } : j))
      );
      store.setDemoNotifications((prev) => [notif, ...prev]);
    }

    store.pushToast(
      sanitizedLetter.wasFiltered ? 'info' : 'success',
      sanitizedLetter.wasFiltered
        ? 'Отклик отправлен! Контакты скрыты до найма для защиты несовершеннолетних.'
        : 'Отклик успешно отправлен.'
    );
    return bid;
  };

  const inviteToInterview = async (bid: Bid): Promise<ChatRoom> => {
    assertActive();
    const roomId = `chat_${bid.jobId}_${bid.freelancerId}`;
    const existingRoom = chats.find((c) => c.id === roomId);
    const room: ChatRoom = existingRoom || {
      id: roomId,
      jobId: bid.jobId,
      jobTitle: bid.jobTitle,
      contractId: '',
      clientId: bid.clientId,
      clientName: userPrivate?.displayName || 'Заказчик',
      freelancerId: bid.freelancerId,
      freelancerName: bid.freelancerName,
      isHired: false,
      lastMessage: 'Начато обсуждение отклика',
      updatedAt: new Date().toISOString(),
    };

    if (firebaseUser) {
      await updateBidDoc(bid.id, { status: 'interviewing' });
      await upsertChatRoomDoc(room);
    } else {
      store.setDemoBids((prev) =>
        prev.map((b) => (b.id === bid.id ? { ...b, status: 'interviewing' } : b))
      );
      if (!existingRoom) {
        store.setDemoChats((prev) => [room, ...prev]);
      }
    }
    store.pushToast('success', `Чат для обсуждения с ${bid.freelancerName} открыт.`);
    return room;
  };

  const hireFreelancer = async (job: Job, bid: Bid, milestonesInput: Milestone[]): Promise<Contract> => {
    assertActive();
    if (!userPrivate || userPrivate.uid !== job.clientId) {
      throw new Error('Нанять исполнителя может только автор заказа.');
    }
    const totalAmount = milestonesInput.reduce((sum, m) => sum + m.amount, 0);
    const contract: Contract = {
      id: generateId('contract'),
      jobId: job.id,
      jobTitle: job.title,
      clientId: job.clientId,
      clientName: job.clientName,
      freelancerId: bid.freelancerId,
      freelancerName: bid.freelancerName,
      totalAmount,
      escrowFunded: false,
      escrowBalance: 0,
      releasedAmount: 0,
      milestones: milestonesInput,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const roomId = `chat_${job.id}_${bid.freelancerId}`;
    const existingRoom = chats.find((c) => c.id === roomId);
    const room: ChatRoom = {
      id: roomId,
      jobId: job.id,
      jobTitle: existingRoom ? existingRoom.jobTitle : job.title.slice(0, 140),
      contractId: contract.id,
      clientId: job.clientId,
      clientName: existingRoom ? existingRoom.clientName : job.clientName.slice(0, 80),
      freelancerId: bid.freelancerId,
      freelancerName: existingRoom ? existingRoom.freelancerName : bid.freelancerName.slice(0, 80),
      isHired: true,
      lastMessage: 'Контракт создан! Пополните эскроу для старта работ.',
      updatedAt: new Date().toISOString(),
    };

    const notif: NotificationItem = {
      id: generateId('notif'),
      userId: bid.freelancerId,
      title: 'Вас выбрали исполнителем!',
      body: `${job.clientName} нанял(а) вас на заказ «${job.title}».`,
      link: `/contracts/${contract.id}`,
      read: false,
      createdAt: new Date().toISOString(),
    };

    if (firebaseUser) {
      await createContractDoc(contract);
      await updateBidDoc(bid.id, { status: 'hired' });
      await updateJobDoc(job.id, { status: 'in_progress' });
      await upsertChatRoomDoc(room);
      await createNotificationDoc(notif);
    } else {
      store.setDemoContracts((prev) => [contract, ...prev]);
      store.setDemoBids((prev) =>
        prev.map((b) =>
          b.id === bid.id ? { ...b, status: 'hired' } : b.jobId === job.id ? { ...b, status: 'declined' } : b
        )
      );
      store.setDemoJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: 'in_progress' } : j))
      );
      store.setDemoChats((prev) => {
        const exists = prev.some((c) => c.id === roomId);
        return exists ? prev.map((c) => (c.id === roomId ? room : c)) : [room, ...prev];
      });
      store.setDemoNotifications((prev) => [notif, ...prev]);
    }

    store.pushToast('success', `Контракт с ${bid.freelancerName} создан. Пополните эскроу для начала работы.`);
    return contract;
  };

  const fundContract = async (contract: Contract) => {
    assertActive();
    if (!userPrivate || userPrivate.uid !== contract.clientId) {
      throw new Error('Пополнить эскроу может только заказчик.');
    }
    const { nextWalletBalance, nextEscrowBalance } = fundEscrowBalance(
      userPrivate.walletBalance,
      contract.totalAmount,
      contract.escrowFunded
    );

    if (firebaseUser) {
      await updateUserPrivateDoc(userPrivate.uid, {
        walletBalance: nextWalletBalance,
        escrowHeld: Number((userPrivate.escrowHeld + nextEscrowBalance).toFixed(2)),
      });
      await updateContractDoc(contract.id, {
        escrowFunded: true,
        escrowBalance: nextEscrowBalance,
      });
    } else {
      store.setDemoUsers((prev) =>
        prev.map((u) =>
          u.uid === userPrivate.uid
            ? {
                ...u,
                walletBalance: nextWalletBalance,
                escrowHeld: Number((u.escrowHeld + nextEscrowBalance).toFixed(2)),
              }
            : u
        )
      );
      store.setDemoContracts((prev) =>
        prev.map((c) =>
          c.id === contract.id ? { ...c, escrowFunded: true, escrowBalance: nextEscrowBalance } : c
        )
      );
    }
    store.pushToast('success', `${formatCurrency(nextEscrowBalance)} надёжно зарезервированы на эскроу.`);
  };

  const submitMilestone = async (
    contract: Contract,
    milestoneId: string,
    deliverableUrl: string,
    deliverableNote: string
  ) => {
    assertActive();
    if (!userPrivate || userPrivate.uid !== contract.freelancerId) {
      throw new Error('Сдать работу по этапу может только назначенный исполнитель.');
    }
    const nextMilestones = submitMilestoneDeliverable(
      contract.milestones,
      milestoneId,
      deliverableUrl,
      deliverableNote
    );

    const notif: NotificationItem = {
      id: generateId('notif'),
      userId: contract.clientId,
      title: 'Сдана работа по этапу',
      body: `${contract.freelancerName} отправил(а) результат по заказу «${contract.jobTitle}».`,
      link: `/contracts/${contract.id}`,
      read: false,
      createdAt: new Date().toISOString(),
    };

    if (firebaseUser) {
      await updateContractDoc(contract.id, { milestones: nextMilestones });
      await createNotificationDoc(notif);
    } else {
      store.setDemoContracts((prev) =>
        prev.map((c) => (c.id === contract.id ? { ...c, milestones: nextMilestones } : c))
      );
      store.setDemoNotifications((prev) => [notif, ...prev]);
    }
    store.pushToast('success', 'Результат отправлен заказчику на проверку.');
  };

  const approveMilestone = async (contract: Contract, milestoneId: string) => {
    assertActive();
    if (!userPrivate || userPrivate.uid !== contract.clientId) {
      throw new Error('Принять этап может только заказчик.');
    }
    const result = approveMilestoneAndRelease(
      contract.milestones,
      milestoneId,
      contract.escrowFunded,
      contract.escrowBalance,
      contract.releasedAmount
    );

    const nextStatus = result.contractCompleted ? 'completed' : contract.status;

    const notif: NotificationItem = {
      id: generateId('notif'),
      userId: contract.freelancerId,
      title: 'Этап принят и оплачен',
      body: `${contract.clientName} принял(а) этап по заказу «${contract.jobTitle}».`,
      link: `/contracts/${contract.id}`,
      read: false,
      createdAt: new Date().toISOString(),
    };

    if (firebaseUser) {
      await updateContractDoc(contract.id, {
        milestones: result.milestones,
        escrowBalance: result.nextEscrowBalance,
        releasedAmount: result.nextReleasedAmount,
        status: nextStatus,
      });
      await createNotificationDoc(notif);
    } else {
      store.setDemoContracts((prev) =>
        prev.map((c) =>
          c.id === contract.id
            ? {
                ...c,
                milestones: result.milestones,
                escrowBalance: result.nextEscrowBalance,
                releasedAmount: result.nextReleasedAmount,
                status: nextStatus,
              }
            : c
        )
      );
      store.setDemoUsers((prev) =>
        prev.map((u) =>
          u.uid === contract.freelancerId
            ? { ...u, earnedBalance: Number((u.earnedBalance + (result.nextReleasedAmount - contract.releasedAmount)).toFixed(2)) }
            : u
        )
      );
      store.setDemoNotifications((prev) => [notif, ...prev]);
    }

    store.pushToast('success', 'Этап принят! Средства с эскроу переведены исполнителю.');
  };

  const requestRevision = async (contract: Contract, milestoneId: string, feedback: string) => {
    assertActive();
    if (!userPrivate || userPrivate.uid !== contract.clientId) {
      throw new Error('Запросить доработку может только заказчик.');
    }
    const nextMilestones = requestMilestoneRevision(contract.milestones, milestoneId, feedback);
    if (firebaseUser) {
      await updateContractDoc(contract.id, { milestones: nextMilestones });
    } else {
      store.setDemoContracts((prev) =>
        prev.map((c) => (c.id === contract.id ? { ...c, milestones: nextMilestones } : c))
      );
    }
    store.pushToast('info', 'Комментарий на доработку отправлен исполнителю.');
  };

  const runSevenDayAutoApproveCheck = async (contract: Contract) => {
    const res = applySevenDayAutoApprove(
      contract.milestones,
      contract.escrowFunded,
      contract.escrowBalance,
      contract.releasedAmount
    );
    if (res.autoApprovedCount === 0) {
      store.pushToast('info', 'Пока нет этапов, ожидающих проверки более 7 дней.');
      return;
    }
    const nextStatus = res.contractCompleted ? 'completed' : contract.status;
    if (firebaseUser) {
      await updateContractDoc(contract.id, {
        milestones: res.milestones,
        escrowBalance: res.nextEscrowBalance,
        releasedAmount: res.nextReleasedAmount,
        status: nextStatus,
      });
    } else {
      store.setDemoContracts((prev) =>
        prev.map((c) =>
          c.id === contract.id
            ? {
                ...c,
                milestones: res.milestones,
                escrowBalance: res.nextEscrowBalance,
                releasedAmount: res.nextReleasedAmount,
                status: nextStatus,
              }
            : c
        )
      );
    }
    store.pushToast('success', `Автоподтверждено этапов по 7-дневной защите исполнителя: ${res.autoApprovedCount}.`);
  };

  const openDispute = async (contract: Contract, reason: string, description: string, evidenceUrl: string) => {
    assertActive();
    if (!userPrivate) throw new Error('Требуется вход в аккаунт.');
    const dispute: Dispute = {
      id: generateId('dispute'),
      contractId: contract.id,
      jobTitle: contract.jobTitle,
      clientId: contract.clientId,
      freelancerId: contract.freelancerId,
      openedBy: userPrivate.uid,
      reason: reason.trim(),
      description: description.trim(),
      evidenceUrls: evidenceUrl.trim() ? [evidenceUrl.trim()] : [],
      status: 'open',
      resolution: 'none',
      adminNote: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (firebaseUser) {
      await createDisputeDoc(dispute);
      await updateContractDoc(contract.id, { status: 'disputed' });
    } else {
      store.setDemoDisputes((prev) => [dispute, ...prev]);
      store.setDemoContracts((prev) =>
        prev.map((c) => (c.id === contract.id ? { ...c, status: 'disputed' } : c))
      );
    }
    store.pushToast('info', 'Спор открыт и передан в службу безопасности VibeWorking.');
  };

  const resolveDispute = async (
    dispute: Dispute,
    resolution: 'release_freelancer' | 'refund_client' | 'split_50_50',
    adminNote: string
  ) => {
    if (!isAdmin) throw new Error('Требуются права администратора.');
    const targetContract = contracts.find((c) => c.id === dispute.contractId);
    if (targetContract) {
      const amounts = resolveDisputeAmounts(
        targetContract.escrowBalance,
        targetContract.releasedAmount,
        resolution
      );
      if (firebaseUser) {
        await updateContractDoc(targetContract.id, {
          escrowBalance: amounts.nextEscrowBalance,
          releasedAmount: amounts.nextReleasedAmount,
          status: 'resolved',
        });
      } else {
        store.setDemoContracts((prev) =>
          prev.map((c) =>
            c.id === targetContract.id
              ? {
                  ...c,
                  escrowBalance: amounts.nextEscrowBalance,
                  releasedAmount: amounts.nextReleasedAmount,
                  status: 'resolved',
                }
              : c
          )
        );
      }
    }

    if (firebaseUser) {
      await updateDisputeDoc(dispute.id, {
        status: 'resolved',
        resolution,
        adminNote: adminNote.trim(),
      });
    } else {
      store.setDemoDisputes((prev) =>
        prev.map((d) =>
          d.id === dispute.id
            ? { ...d, status: 'resolved', resolution, adminNote: adminNote.trim() }
            : d
        )
      );
    }
    store.pushToast('success', 'Спор урегулирован, средства на эскроу распределены.');
  };

  const sendMessage = async (
    room: ChatRoom,
    rawText: string,
    attachment?: { name: string; url: string }
  ) => {
    assertActive();
    if (!userPrivate) throw new Error('Требуется вход в аккаунт.');
    const rate = checkClientRateLimit(store.messageTimestamps, 20, 60 * 1000);
    if (!rate.allowed) {
      throw new Error(`Слишком частая отправка сообщений. Подождите ${rate.retryAfterSeconds} сек.`);
    }
    store.recordActionTimestamp('message', rate.nextTimestamps);

    const safety = containsBannedContent(rawText);
    if (safety.flagged) {
      throw new Error(`Сообщение заблокировано фильтром безопасности («${safety.matchedWord}»).`);
    }

    const filtered = sanitizePreHireMessage(rawText, room.isHired);
    const msg: ChatMessage = {
      id: generateId('msg'),
      chatId: room.id,
      senderId: userPrivate.uid,
      senderName: userPrivate.displayName,
      text: filtered.sanitizedText,
      attachmentName: attachment?.name || '',
      attachmentUrl: attachment?.url || '',
      wasFiltered: filtered.wasFiltered,
      createdAt: new Date().toISOString(),
    };

    const recipientId = userPrivate.uid === room.clientId ? room.freelancerId : room.clientId;
    const notif: NotificationItem = {
      id: generateId('notif'),
      userId: recipientId,
      title: `Сообщение от ${userPrivate.displayName}`,
      body: filtered.sanitizedText.slice(0, 120),
      link: `/messages?chat=${room.id}`,
      read: false,
      createdAt: new Date().toISOString(),
    };

    if (firebaseUser) {
      await sendChatMessageDoc(msg);
      await createNotificationDoc(notif);
    } else {
      store.setDemoMessages(room.id, (prev) => [...prev, msg]);
      store.setDemoChats((prev) =>
        prev.map((c) =>
          c.id === room.id
            ? { ...c, lastMessage: msg.text.slice(0, 160), updatedAt: new Date().toISOString() }
            : c
        )
      );
      store.setDemoNotifications((prev) => [notif, ...prev]);
    }

    if (filtered.wasFiltered && filtered.reason) {
      store.pushToast('info', filtered.reason);
    }
  };

  const submitReview = async (input: {
    contract: Contract;
    rating: number;
    communication: number;
    qualityOrClarity: number;
    timeliness: number;
    comment: string;
  }) => {
    assertActive();
    if (!userPrivate) throw new Error('Требуется вход в аккаунт.');
    const targetUserId =
      userPrivate.uid === input.contract.clientId
        ? input.contract.freelancerId
        : input.contract.clientId;

    const review: Review = {
      id: generateId('rev'),
      contractId: input.contract.id,
      authorId: userPrivate.uid,
      authorName: userPrivate.displayName,
      targetUserId,
      authorRole: userPrivate.uid === input.contract.clientId ? 'client' : 'freelancer',
      rating: input.rating,
      subRatings: {
        communication: input.communication,
        qualityOrClarity: input.qualityOrClarity,
        timeliness: input.timeliness,
      },
      comment: input.comment.trim(),
      replyText: '',
      isHidden: false,
      createdAt: new Date().toISOString(),
    };

    if (firebaseUser) {
      await createReviewDoc(review);
    } else {
      store.setDemoReviews((prev) => [review, ...prev]);
    }
    store.pushToast('success', 'Отзыв опубликован! Спасибо за вклад в доверие сообщества.');
  };

  const replyToReview = async (review: Review, replyText: string) => {
    assertActive();
    if (!userPrivate || userPrivate.uid !== review.targetUserId) {
      throw new Error('Ответить на отзыв может только его получатель.');
    }
    if (review.replyText) {
      throw new Error('На отзыв можно ответить только один раз.');
    }
    if (firebaseUser) {
      await updateReviewDoc(review.id, { replyText: replyText.trim() });
    } else {
      store.setDemoReviews((prev) =>
        prev.map((r) => (r.id === review.id ? { ...r, replyText: replyText.trim() } : r))
      );
    }
    store.pushToast('success', 'Ответ опубликован.');
  };

  const markNotificationRead = async (id: string) => {
    if (firebaseUser) {
      await markNotificationReadDoc(id);
    } else {
      store.setDemoNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    }
  };

  const saveProfileEdits = async (patch: Partial<PublicProfile>) => {
    if (!userPrivate) throw new Error('Требуется вход в аккаунт.');
    const safePatch: Partial<PublicProfile> = {
      ...patch,
      ...(patch.bio !== undefined ? { bio: patch.bio.slice(0, 500) } : {}),
      ...(patch.skills !== undefined ? { skills: patch.skills.slice(0, 15) } : {}),
      ...(patch.portfolio !== undefined ? { portfolio: patch.portfolio.slice(0, 12) } : {}),
      ...(patch.timezone !== undefined ? { timezone: patch.timezone.slice(0, 64) } : {}),
    };
    if (firebaseUser) {
      await updatePublicProfileDoc(userPrivate.uid, safePatch);
    } else {
      store.setDemoProfiles((prev) =>
        prev.map((p) => (p.uid === userPrivate.uid ? { ...p, ...safePatch, updatedAt: new Date().toISOString() } : p))
      );
    }
    store.pushToast('success', 'Профиль обновлён.');
  };

  const seedStarterCatalog = async () => {
    if (!firebaseUser || !isAdmin) return;
    await seedStarterFirestoreData(SEED_JOBS, SEED_PUBLIC_PROFILES);
    store.pushToast('success', 'Стартовые заказы и профили добавлены в базу.');
  };

  const setConsentDecision = async (consent: ParentConsentRecord, decision: 'approved' | 'revoked') => {
    if (firebaseUser) {
      await updateParentConsentStatus(consent.id, consent.teenUid, decision);
    } else {
      const now = new Date().toISOString();
      store.setDemoConsents((prev) =>
        prev.map((c) => (c.id === consent.id ? { ...c, status: decision, updatedAt: now } : c))
      );
      store.setDemoUsers((prev) =>
        prev.map((u) =>
          u.uid === consent.teenUid
            ? {
                ...u,
                parentalConsentStatus: decision,
                accountStatus: decision === 'approved' ? 'active' : 'suspended',
                idVerified: decision === 'approved',
                updatedAt: now,
              }
            : u
        )
      );
      store.setDemoProfiles((prev) =>
        prev.map((p) =>
          p.uid === consent.teenUid
            ? {
                ...p,
                accountStatus: decision === 'approved' ? 'active' : 'suspended',
                idVerified: decision === 'approved',
                updatedAt: now,
              }
            : p
        )
      );
    }
    store.pushToast(
      decision === 'approved' ? 'success' : 'info',
      decision === 'approved'
        ? `Согласие родителя для ${consent.teenName} подтверждено. Аккаунт активирован!`
        : `Согласие родителя для ${consent.teenName} отозвано. Аккаунт приостановлен.`
    );
  };

  // Admin moderation helpers
  const adminToggleUserBan = async (targetUser: UserPrivate) => {
    if (!isAdmin) return;
    const nextBanned = !targetUser.isBanned;
    const nextStatus = nextBanned ? 'banned' : 'active';
    if (firebaseUser) {
      await updateUserPrivateDoc(targetUser.uid, { isBanned: nextBanned, accountStatus: nextStatus });
      await updatePublicProfileDoc(targetUser.uid, { accountStatus: nextStatus });
    } else {
      store.setDemoUsers((prev) =>
        prev.map((u) => (u.uid === targetUser.uid ? { ...u, isBanned: nextBanned, accountStatus: nextStatus } : u))
      );
      store.setDemoProfiles((prev) =>
        prev.map((p) => (p.uid === targetUser.uid ? { ...p, accountStatus: nextStatus } : p))
      );
    }
    store.pushToast('info', `${targetUser.displayName}: ${nextBanned ? 'заблокирован' : 'разблокирован'}.`);
  };

  const adminManualVerifyUser = async (targetUser: UserPrivate) => {
    if (!isAdmin) return;
    if (firebaseUser) {
      await updateUserPrivateDoc(targetUser.uid, { idVerified: true, accountStatus: 'active' });
      await updatePublicProfileDoc(targetUser.uid, { idVerified: true, accountStatus: 'active' });
    } else {
      store.setDemoUsers((prev) =>
        prev.map((u) => (u.uid === targetUser.uid ? { ...u, idVerified: true, accountStatus: 'active' } : u))
      );
      store.setDemoProfiles((prev) =>
        prev.map((p) => (p.uid === targetUser.uid ? { ...p, idVerified: true, accountStatus: 'active' } : p))
      );
    }
    store.pushToast('success', `${targetUser.displayName} прошёл(ла) ручную верификацию.`);
  };

  const adminModerateJob = async (job: Job, decision: 'approved' | 'rejected') => {
    if (!isAdmin) return;
    const nextStatus = decision === 'rejected' ? 'rejected' : 'open';
    if (firebaseUser) {
      await updateJobDoc(job.id, { moderationStatus: decision, status: nextStatus });
    } else {
      store.setDemoJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, moderationStatus: decision, status: nextStatus } : j))
      );
    }
    store.pushToast('info', `Заказ «${job.title}»: ${decision === 'approved' ? 'одобрен' : 'отклонён'}.`);
  };

  const adminToggleReviewVisibility = async (review: Review) => {
    if (!isAdmin) return;
    if (firebaseUser) {
      await updateReviewDoc(review.id, { isHidden: !review.isHidden });
    } else {
      store.setDemoReviews((prev) =>
        prev.map((r) => (r.id === review.id ? { ...r, isHidden: !r.isHidden } : r))
      );
    }
    store.pushToast('info', review.isHidden ? 'Отзыв восстановлен.' : 'Отзыв скрыт модератором.');
  };

  return {
    loadingJobs,
    jobs,
    bids,
    contracts,
    disputes,
    chats,
    reviews,
    profiles,
    users,
    consents,
    notifications,
    postJob,
    submitBid,
    inviteToInterview,
    hireFreelancer,
    fundContract,
    submitMilestone,
    approveMilestone,
    requestRevision,
    runSevenDayAutoApproveCheck,
    openDispute,
    resolveDispute,
    sendMessage,
    submitReview,
    replyToReview,
    markNotificationRead,
    saveProfileEdits,
    seedStarterCatalog,
    setConsentDecision,
    adminToggleUserBan,
    adminManualVerifyUser,
    adminModerateJob,
    adminToggleReviewVisibility,
  };
}
