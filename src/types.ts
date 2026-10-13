export interface CustomColors {
  background: string;
  sidebar: string;
  card: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  bubbleSelf: string;
  bubbleOther: string;
  nameSelf: string;
  nameOther: string;
}

export interface ColorSchemePreset {
  id: string;
  name: string;
  mode: 'dark' | 'light';
  colors: CustomColors;
}

export interface UserProfile {
  userId: string;
  email: string;
  username: string;
  displayName: string;
  bio: string;
  photoURL: string;
  friendCode: string;
  role: 'admin' | 'mod' | 'user';
  customTheme: {
    activePresetId: string;
    colors: CustomColors;
  };
  customCss?: string;
  isDeactivated?: boolean;
  isSuspended?: boolean;
  suspendedUntil?: string | null; // ISO string or 'indefinite'
  isBanned?: boolean;
  deletionRequestedAt?: string | null;
  deletionGracePeriod?: boolean;
  blockedUserIds?: string[];
  followingUserIds?: string[];
  followerUserIds?: string[];
  isVerified?: boolean;
  friendsCount?: number;
  followersCount?: number;
  followingCount?: number;
  likesCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[];
  votesCount: number;
}

export interface PostPoll {
  question?: string;
  options: PollOption[];
  totalVotes: number;
  expiresAt?: string;
}

export interface DirectConversation {
  conversationId: string;
  participants: string[];
  participantDetails: Record<
    string,
    {
      userId: string;
      username: string;
      displayName: string;
      photoURL: string;
      role?: 'admin' | 'mod' | 'user';
    }
  >;
  lastMessageText?: string;
  lastMessageAt?: string;
  lastSenderId?: string;
  unreadBy?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DirectMessage {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  senderPhotoURL?: string;
  senderRole?: 'admin' | 'mod' | 'user';
  text: string;
  imageUrl?: string | null;
  createdAt: string;
}

export interface Chatroom {
  roomId: string;
  name: string;
  description: string;
  creatorId: string;
  creatorUsername: string;
  isLocked: boolean;
  lockType: 'none' | 'passcode' | 'invite_only';
  passcode?: string;
  invitedUserIds?: string[];
  memberIds?: string[];
  createdAt: string;
  icon?: string;
}

export interface ChatMessage {
  messageId: string;
  roomId: string;
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  senderPhotoURL: string;
  senderRole?: 'admin' | 'mod' | 'user';
  text: string;
  imageUrl?: string;
  createdAt: string;
}

export interface Community {
  communityId: string;
  name: string; // e.g. "c/technology" or "technology"
  displayName: string;
  description: string;
  category: string; // "Tech", "Gaming", "Science", "Entertainment", "Creative", "Discussion", "General"
  iconEmoji: string;
  bannerColor?: string;
  bannerUrl?: string | null;
  creatorId: string;
  creatorUsername: string;
  createdAt: string;
  membersCount: number;
  memberIds?: string[];
  rules: string[];
  moderators: string[];
  isVerified?: boolean;
}

export interface Post {
  postId: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorPhotoURL: string;
  authorRole?: 'admin' | 'mod' | 'user';
  authorIsVerified?: boolean;
  content: string;
  imageUrl?: string | null;
  gifUrl?: string | null;
  poll?: PostPoll | null;
  location?: string | null;
  likes: string[];
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  // Community Fields
  communityId?: string | null;
  communityName?: string | null; // e.g. "c/technology"
  communityIcon?: string | null;
  title?: string | null; // Community post title
  flair?: string | null; // e.g. "Discussion", "News", "Meme", "Question", "OC"
  upvotes?: string[]; // user UIDs
  downvotes?: string[]; // user UIDs
  score?: number; // upvotes minus downvotes
  isPinned?: boolean;
}

export interface PostComment {
  commentId: string;
  postId?: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorPhotoURL: string;
  authorRole?: 'admin' | 'mod' | 'user';
  authorIsVerified?: boolean;
  content: string;
  imageUrl?: string | null;
  likes?: string[];
  likesCount?: number;
  createdAt: string;
}

export type Comment = PostComment;

export interface ReportItem {
  reportId: string;
  reporterId: string;
  reporterUsername: string;
  reportedUserId: string;
  reportedUsername: string;
  reasons: string[];
  otherReason?: string;
  details?: string;
  evidenceImageUrl?: string;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  claimedBy?: string | null;
  createdAt: string;
}

export interface AppealItem {
  appealId: string;
  type: 'suspension' | 'ban';
  username: string;
  userId?: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  reviewedBy?: string | null;
  createdAt: string;
}
