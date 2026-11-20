export type UserRole = 'freelancer' | 'client';
export type AgeGroup = 'under_13' | '13_17' | '18_plus' | 'unverified';
export type AgeGroupLabel = '13–17 Teen Creator' | '18+ Verified Member' | 'Unverified';
export type ParentalConsentStatus = 'not_required' | 'pending' | 'approved' | 'revoked';
export type AccountStatus =
  | 'onboarding'
  | 'blocked_coppa'
  | 'pending_parental_consent'
  | 'active'
  | 'suspended'
  | 'banned';

export type JobCategory =
  | 'Graphic Design'
  | 'Video Editing'
  | 'Social Media'
  | 'Tutoring'
  | 'Writing'
  | 'Web Basics'
  | 'Audio & Music';

export const JOB_CATEGORIES: JobCategory[] = [
  'Graphic Design',
  'Video Editing',
  'Social Media',
  'Tutoring',
  'Writing',
  'Web Basics',
  'Audio & Music',
];

export const CATEGORY_LABELS: Record<JobCategory, string> = {
  'Graphic Design': 'Графический дизайн',
  'Video Editing': 'Видеомонтаж',
  'Social Media': 'Соцсети и контент',
  Tutoring: 'Помощь в учёбе',
  Writing: 'Тексты и редактура',
  'Web Basics': 'Веб-разработка',
  'Audio & Music': 'Аудио и музыка',
};

export const AGE_GROUP_LABELS: Record<AgeGroupLabel, string> = {
  '13–17 Teen Creator': 'Исполнитель 13–17 лет',
  '18+ Verified Member': 'Участник 18+ (подтверждён)',
  Unverified: 'Не подтверждён',
};

export const AVAILABILITY_LABELS: Record<'part-time' | 'weekends' | 'flexible', string> = {
  weekends: 'По выходным',
  'part-time': 'После школы / учёбы',
  flexible: 'Гибкий график',
};

export const LEVEL_LABELS: Record<'beginner' | 'intermediate', string> = {
  beginner: 'Начальный',
  intermediate: 'Уверенный',
};

export const SKILL_TAGS: string[] = [
  'Графический дизайн',
  'Видеомонтаж',
  'Соцсети и контент',
  'Помощь в учёбе',
  'Тексты и редактура',
  'Веб-разработка',
  'Аудио и музыка',
  'Figma',
  'Canva',
  'CapCut',
  'Premiere Pro',
  'HTML и CSS',
  'Основы React',
  'Иллюстрация',
];

export interface PortfolioItem {
  id: string;
  title: string;
  url: string;
  type: 'image' | 'pdf' | 'link';
  description?: string;
}

export interface UserPrivate {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  dob?: string;
  ageGroup: AgeGroup;
  parentEmail?: string;
  parentalConsentStatus: ParentalConsentStatus;
  parentConsentId?: string;
  accountStatus: AccountStatus;
  walletBalance: number;
  escrowHeld: number;
  earnedBalance: number;
  emailVerified: boolean;
  idVerified: boolean;
  isBanned: boolean;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface PublicProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  ageGroupLabel: AgeGroupLabel;
  bio: string;
  skills: string[];
  portfolio: PortfolioItem[];
  timezone: string;
  availability: 'part-time' | 'weekends' | 'flexible';
  rating: number;
  reviewCount: number;
  completedJobs: number;
  idVerified: boolean;
  emailVerified: boolean;
  accountStatus: AccountStatus;
  updatedAt: unknown;
}

export interface ParentConsentRecord {
  id: string;
  teenUid: string;
  teenName: string;
  parentEmail: string;
  status: 'pending' | 'approved' | 'revoked';
  createdAt: unknown;
  updatedAt: unknown;
}

export interface JobAttachment {
  name: string;
  url: string;
}

export interface Job {
  id: string;
  clientId: string;
  clientName: string;
  clientVerified: boolean;
  title: string;
  description: string;
  category: JobCategory;
  budgetType: 'fixed' | 'hourly';
  budgetMin: number;
  budgetMax: number;
  level: 'beginner' | 'intermediate';
  deadline: string;
  attachments: JobAttachment[];
  status: 'open' | 'in_progress' | 'completed' | 'closed' | 'rejected';
  moderationStatus: 'approved' | 'flagged' | 'rejected';
  bidCount: number;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface Bid {
  id: string;
  jobId: string;
  jobTitle: string;
  clientId: string;
  freelancerId: string;
  freelancerName: string;
  freelancerRating: number;
  amount: number;
  deliveryDays: number;
  coverLetter: string;
  portfolioLinks: string[];
  status: 'pending' | 'interviewing' | 'hired' | 'declined' | 'withdrawn';
  createdAt: unknown;
  updatedAt: unknown;
}

export type MilestoneStatus = 'pending' | 'submitted' | 'approved' | 'revision_requested';

export interface Milestone {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  status: MilestoneStatus;
  deliverableUrl?: string;
  deliverableNote?: string;
  feedback?: string;
  submittedAtMs?: number;
}

export interface Contract {
  id: string;
  jobId: string;
  jobTitle: string;
  clientId: string;
  clientName: string;
  freelancerId: string;
  freelancerName: string;
  totalAmount: number;
  escrowFunded: boolean;
  escrowBalance: number;
  releasedAmount: number;
  milestones: Milestone[];
  status: 'active' | 'disputed' | 'completed' | 'resolved' | 'cancelled';
  createdAt: unknown;
  updatedAt: unknown;
}

export interface Dispute {
  id: string;
  contractId: string;
  jobTitle: string;
  clientId: string;
  freelancerId: string;
  openedBy: string;
  reason: string;
  description: string;
  evidenceUrls: string[];
  status: 'open' | 'under_review' | 'resolved';
  resolution: 'none' | 'release_freelancer' | 'refund_client' | 'split_50_50';
  adminNote: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface ChatRoom {
  id: string;
  jobId: string;
  jobTitle: string;
  contractId: string;
  clientId: string;
  clientName: string;
  freelancerId: string;
  freelancerName: string;
  isHired: boolean;
  lastMessage: string;
  updatedAt: unknown;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  attachmentName?: string;
  attachmentUrl?: string;
  wasFiltered: boolean;
  createdAt: unknown;
}

export interface Review {
  id: string;
  contractId: string;
  authorId: string;
  authorName: string;
  targetUserId: string;
  authorRole: UserRole;
  rating: number;
  subRatings: {
    communication: number;
    qualityOrClarity: number;
    timeliness: number;
  };
  comment: string;
  replyText: string;
  isHidden: boolean;
  createdAt: unknown;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: unknown;
}
