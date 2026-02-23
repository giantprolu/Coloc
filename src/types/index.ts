// ============ TYPES PRINCIPAUX ============

export type UserRole = "admin" | "member";
export type PresenceStatus = "home" | "away_tonight" | "traveling";
export type NoiseLevel = "quiet" | "moderate" | "festive";
export type EventStatus = "confirmed" | "contested" | "cancelled" | "vote_approved";
export type ReactionType = "thumbs_up" | "party" | "neutral" | "thumbs_down" | "oppose";
export type VoteStatus = "open" | "approved" | "rejected" | "expired";
export type VoteChoice = "approve" | "reject" | "abstain";
export type ChannelType = "general" | "event";
export type ChoreFrequency = "daily" | "weekly" | "biweekly" | "monthly";

// ============ ENTITÉS ============

export interface Colocation {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
}

export interface Member {
  id: string;
  user_id: string;
  colocation_id: string;
  display_name: string;
  avatar_url: string | null;
  room: string | null;
  role: UserRole;
  presence_status: PresenceStatus;
  presence_return_date: string | null;
  created_at: string;
}

export interface Space {
  id: string;
  colocation_id: string;
  name: string;
  icon: string | null;
}

export interface Event {
  id: string;
  colocation_id: string;
  created_by: string | null;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  guest_count: number;
  noise_level: NoiseLevel;
  status: EventStatus;
  created_at: string;
  // Relations jointes
  creator?: Member;
  spaces?: Space[];
  reactions?: EventReaction[];
  votes?: Vote[];
}

export interface EventSpace {
  event_id: string;
  space_id: string;
}

export interface EventReaction {
  id: string;
  event_id: string;
  member_id: string;
  reaction: ReactionType;
  created_at: string;
  // Relation jointe
  member?: Member;
}

export interface Vote {
  id: string;
  event_id: string;
  initiated_by: string | null;
  reason: string | null;
  status: VoteStatus;
  closes_at: string;
  created_at: string;
  // Relations jointes
  ballots?: VoteBallot[];
  initiator?: Member;
  event?: Event;
}

export interface VoteBallot {
  id: string;
  vote_id: string;
  member_id: string;
  choice: VoteChoice;
  created_at: string;
  // Relation jointe
  member?: Member;
}

export interface ChatChannel {
  id: string;
  colocation_id: string;
  event_id: string | null;
  name: string;
  type: ChannelType;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  member_id: string | null;
  content: string;
  reply_to: string | null;
  is_system: boolean;
  created_at: string;
  // Relations jointes
  member?: Member;
  reply?: ChatMessage;
  read_receipts?: MessageReadReceipt[];
}

export interface MessageReadReceipt {
  message_id: string;
  member_id: string;
  read_at: string;
}

export interface ColocRule {
  id: string;
  colocation_id: string;
  rule_key: string;
  rule_value: Record<string, unknown>;
  updated_at: string;
}

export interface Expense {
  id: string;
  colocation_id: string;
  event_id: string | null;
  paid_by: string | null;
  title: string;
  amount: number;
  created_at: string;
  // Relations jointes
  payer?: Member;
  splits?: ExpenseSplit[];
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  member_id: string;
  amount: number;
  settled: boolean;
  settled_at: string | null;
  member?: Member;
}

export interface Chore {
  id: string;
  colocation_id: string;
  name: string;
  icon: string | null;
  frequency: ChoreFrequency;
  created_at: string;
}

export interface ChoreAssignment {
  id: string;
  chore_id: string;
  member_id: string;
  week_start: string;
  completed: boolean;
  completed_at: string | null;
  swapped_with: string | null;
  swap_accepted: boolean | null;
  // Relations jointes
  chore?: Chore;
  member?: Member;
}

export interface Announcement {
  id: string;
  colocation_id: string;
  member_id: string | null;
  content: string;
  pinned: boolean;
  expires_at: string;
  created_at: string;
  // Relation jointe
  member?: Member;
}

export interface PushSubscription {
  id: string;
  member_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

export interface NotificationPreferences {
  member_id: string;
  events_new: boolean;
  events_modified: boolean;
  events_reminder: boolean;
  votes_new: boolean;
  votes_result: boolean;
  chat_all: boolean;
  chat_mentions: boolean;
  chores_reminder: boolean;
  announcements: boolean;
}

// ============ TYPES UTILITAIRES ============

export interface VoteResults {
  approve: number;
  reject: number;
  abstain: number;
  total: number;
  result: "approved" | "rejected" | "tie";
}

export interface MemberBalance {
  member: Member;
  balance: number; // positif = on lui doit, négatif = il doit
}

export interface ConflictInfo {
  hasConflict: boolean;
  conflictingEvents: Event[];
}

export type ReactionLabel = {
  [K in ReactionType]: string;
};

export const REACTION_LABELS: ReactionLabel = {
  thumbs_up: "👍 Je suis pour",
  party: "🎉 J'ai hâte !",
  neutral: "😐 Neutre",
  thumbs_down: "👎 Pas idéal pour moi",
  oppose: "❌ Je m'oppose",
};

export const REACTION_EMOJIS: Record<ReactionType, string> = {
  thumbs_up: "👍",
  party: "🎉",
  neutral: "😐",
  thumbs_down: "👎",
  oppose: "❌",
};

export const NOISE_LEVEL_LABELS: Record<NoiseLevel, string> = {
  quiet: "🤫 Calme",
  moderate: "🔊 Modéré",
  festive: "🎊 Festif",
};

export const PRESENCE_LABELS: Record<PresenceStatus, string> = {
  home: "🏠 À l'appart",
  away_tonight: "🌙 Absent ce soir",
  traveling: "🧳 En déplacement",
};
