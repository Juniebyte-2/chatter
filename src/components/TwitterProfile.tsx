import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth, ADMIN_UID, ADMIN_USERNAME } from '../context/AuthContext';
import { UserProfile, Post } from '../types';
import { UserBadge, GoldenVerifiedCheckmark, BlueVerifiedCheckmark } from './UserBadge';
import { ReportModal, SuspendModal, BanModal } from './ModerationModals';
import { TwitterPostComposer } from './TwitterPostComposer';
import { PollWidget } from './PollWidget';
import { compressImage } from '../utils/imageCompressor';
import { CREATOR_STARRY_THEME_CSS } from '../themePresets';
import {
  Calendar,
  MoreHorizontal,
  Heart,
  MessageCircle,
  Trash2,
  Image as ImageIcon,
  Send,
  UserPlus,
  UserCheck,
  Shield,
  Ban,
  Clock,
  Flag,
  ArrowLeft,
  Palette,
  Camera,
  X,
  Mail,
  Repeat,
  Bookmark,
  Share2,
  MapPin,
  Code,
  Sparkles,
  User,
  Check,
  RotateCcw,
  Copy,
  Grid,
  LayoutList,
  ChevronLeft,
  ChevronRight,
  Film,
  ExternalLink,
  Download,
  Maximize2
} from 'lucide-react';

export const PROFILE_CSS_SNIPPETS = [
  {
    name: '🌌 Starry Cosmic (Creator Theme)',
    code: CREATOR_STARRY_THEME_CSS,
  },
  {
    name: '✨ Neon Glow',
    code: `/* Neon Glow Profile Style */
#chatter-profile-view .profile-banner {
  box-shadow: 0 0 35px rgba(56, 189, 248, 0.45);
  border-bottom: 2px solid #38bdf8;
}

#chatter-profile-view .profile-avatar {
  box-shadow: 0 0 25px rgba(236, 72, 153, 0.6);
  border-color: #ec4899 !important;
}

#chatter-profile-view .profile-display-name {
  text-shadow: 0 0 10px rgba(56, 189, 248, 0.7);
  color: #38bdf8 !important;
}

#chatter-profile-view .profile-bio {
  color: #bae6fd !important;
  text-shadow: 0 0 6px rgba(56, 189, 248, 0.4);
}

#chatter-profile-view .profile-post-card {
  border-color: rgba(56, 189, 248, 0.25) !important;
  box-shadow: inset 0 0 15px rgba(56, 189, 248, 0.05);
}`,
  },
  {
    name: '🌈 Rainbow Gradient',
    code: `/* Rainbow Gradient Profile Style */
#chatter-profile-view .profile-banner {
  background: linear-gradient(135deg, #ff0080, #7928ca, #4338ca, #00dfd8) !important;
}

#chatter-profile-view .profile-display-name {
  background: linear-gradient(90deg, #ff007a, #7928ca, #00dfd8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

#chatter-profile-view .profile-avatar {
  border-color: #ff0080 !important;
  box-shadow: 0 0 20px rgba(255, 0, 128, 0.5);
}`,
  },
  {
    name: '🌌 Deep Cosmos',
    code: `/* Deep Cosmos Profile Style */
#chatter-profile-view {
  background: radial-gradient(circle at 50% 10%, #1e1b4b, #090e17) !important;
}

#chatter-profile-view .profile-banner {
  background: linear-gradient(180deg, #312e81, #1e1b4b) !important;
  border-bottom: 1px solid rgba(129, 140, 248, 0.4);
}

#chatter-profile-view .profile-post-card {
  background: rgba(30, 27, 75, 0.3) !important;
  border-color: rgba(99, 102, 241, 0.3) !important;
}`,
  },
  {
    name: '🪟 Frosted Glass',
    code: `/* Frosted Glass Profile Style */
#chatter-profile-view .profile-post-card {
  backdrop-filter: blur(14px);
  background: rgba(255, 255, 255, 0.035) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 20px;
}

#chatter-profile-view .profile-avatar {
  backdrop-filter: blur(10px);
  border-color: rgba(255, 255, 255, 0.4) !important;
}`,
  },
  {
    name: '👾 Cyberpunk Pink',
    code: `/* Cyberpunk Pink Profile Style */
#chatter-profile-view {
  background: #090214 !important;
}

#chatter-profile-view .profile-banner {
  background: linear-gradient(135deg, #f43f5e, #ec4899, #8b5cf6) !important;
  box-shadow: 0 4px 25px rgba(244, 63, 94, 0.4);
}

#chatter-profile-view .profile-avatar {
  border-color: #f43f5e !important;
  box-shadow: 0 0 25px rgba(244, 63, 94, 0.7);
}

#chatter-profile-view .profile-display-name {
  color: #fb7185 !important;
  text-shadow: 0 0 8px rgba(251, 113, 133, 0.6);
}

#chatter-profile-view .profile-post-card {
  border-color: rgba(244, 63, 94, 0.2) !important;
  background: rgba(244, 63, 94, 0.02) !important;
}`,
  },
  {
    name: '🟢 Terminal Matrix',
    code: `/* Matrix Hacker Terminal Style */
#chatter-profile-view {
  background: #020c05 !important;
  font-family: monospace;
}

#chatter-profile-view .profile-banner {
  background: linear-gradient(180deg, #052e16, #022c22) !important;
  border-bottom: 2px solid #22c55e;
}

#chatter-profile-view .profile-avatar {
  border-color: #22c55e !important;
  box-shadow: 0 0 20px rgba(34, 197, 94, 0.5);
}

#chatter-profile-view .profile-display-name {
  color: #4ade80 !important;
  text-shadow: 0 0 10px rgba(74, 222, 128, 0.7);
}

#chatter-profile-view .profile-bio {
  color: #86efac !important;
}

#chatter-profile-view .profile-post-card {
  border-color: rgba(34, 197, 94, 0.3) !important;
  background: rgba(34, 197, 94, 0.03) !important;
}`,
  },
  {
    name: '👑 Imperial Gold',
    code: `/* Imperial Gold Profile Style */
#chatter-profile-view .profile-banner {
  background: linear-gradient(135deg, #b45309, #d97706, #f59e0b) !important;
  box-shadow: 0 4px 20px rgba(217, 119, 6, 0.3);
}

#chatter-profile-view .profile-avatar {
  border-color: #fbbf24 !important;
  box-shadow: 0 0 20px rgba(251, 191, 36, 0.5);
}

#chatter-profile-view .profile-display-name {
  color: #fde68a !important;
  text-shadow: 0 0 8px rgba(245, 158, 11, 0.5);
}

#chatter-profile-view .profile-post-card {
  border-color: rgba(245, 158, 11, 0.2) !important;
}`,
  },
];

export function scopeCssToProfile(rawCss: string): string {
  if (!rawCss || !rawCss.trim()) return '';
  const sanitized = rawCss.replace(/<\/?(script|style)[^>]*>/gi, '');

  // Extract keyframes blocks so their percentage stops (0%, 50%, 100%, from, to) are untouched
  const keyframesMatches: string[] = [];
  const withoutKeyframes = sanitized.replace(/@keyframes\s+[\w-]+\s*\{[\s\S]*?\n\}/g, (match) => {
    keyframesMatches.push(match);
    return `/*__KEYFRAME_${keyframesMatches.length - 1}__*/`;
  });

  const scopedRules = withoutKeyframes.replace(/(^|,\s*)([^{}]+)({)/g, (match, prefix, selectors, suffix) => {
    const trimmed = selectors.trim();
    if (
      trimmed.startsWith('@') ||
      trimmed.startsWith('/*__KEYFRAME_') ||
      trimmed.includes('#chatter-profile-view') ||
      /^(from|to|\d+%)$/.test(trimmed)
    ) {
      return match;
    }
    const scopedList = selectors
      .split(',')
      .map((sel: string) => {
        const s = sel.trim();
        if (!s || s.startsWith('@') || s.includes('#chatter-profile-view') || /^(from|to|\d+%)$/.test(s)) return s;
        return `#chatter-profile-view ${s}`;
      })
      .join(', ');
    return `${prefix}${scopedList} ${suffix}`;
  });

  let finalRules = scopedRules;
  keyframesMatches.forEach((kf, idx) => {
    finalRules = finalRules.replace(`/*__KEYFRAME_${idx}__*/`, kf);
  });

  return `${finalRules}\n@scope (#chatter-profile-view) {\n${sanitized}\n}`;
}

interface TwitterProfileProps {
  targetUsername: string;
  onBack: () => void;
  onNavigateHelp: (path: string) => void;
  onOpenSettings?: (tab?: 'customization' | 'account' | 'security' | 'profile-css') => void;
  onDirectMessage?: (targetUserId: string, targetProfile: UserProfile) => void;
  onOpenPost?: (postId: string) => void;
}

export const TwitterProfile: React.FC<TwitterProfileProps> = ({
  targetUsername,
  onBack,
  onNavigateHelp,
  onOpenSettings,
  onDirectMessage,
  onOpenPost,
}) => {
  const { currentUser, userProfile, isAdmin, isModOrAdmin, updateProfileData } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'media' | 'likes'>('posts');
  const [mediaLayout, setMediaLayout] = useState<'grid' | 'feed'>('grid');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'photos' | 'gifs'>('all');
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Moderation state
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);

  // New post state
  const [postContent, setPostContent] = useState('');
  const [postImage, setPostImage] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  // Comments modal state
  const [selectedPostForComments, setSelectedPostForComments] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentsList, setCommentsList] = useState<any[]>([]);

  // Customize profile state
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editPhotoURL, setEditPhotoURL] = useState('');
  const [editCustomCss, setEditCustomCss] = useState('');
  const [profileModalTab, setProfileModalTab] = useState<'info' | 'css'>('info');
  const [savingProfile, setSavingProfile] = useState(false);
  const [customizeError, setCustomizeError] = useState('');
  const [customizeSuccess, setCustomizeSuccess] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const isSelf = userProfile?.username.toLowerCase() === targetUsername.toLowerCase();

  // Load target profile
  const fetchProfile = async () => {
    setLoading(true);
    try {
      const cleanUser = targetUsername.replace(/^@/, '').toLowerCase();
      if (cleanUser === 'neo' || cleanUser === ADMIN_USERNAME.toLowerCase()) {
        const adminSnap = await getDoc(doc(db, 'users', ADMIN_UID));
        if (adminSnap.exists()) {
          setProfile({ userId: ADMIN_UID, ...adminSnap.data() } as UserProfile);
          setLoading(false);
          return;
        }
      }

      const userDocRef = doc(db, 'usernames', cleanUser);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const uid = userSnap.data().userId;
        const profileSnap = await getDoc(doc(db, 'users', uid));
        if (profileSnap.exists()) {
          setProfile({ userId: uid, ...profileSnap.data() } as UserProfile);
        }
      } else {
        // Query users by username directly as fallback
        const q = query(collection(db, 'users'), where('username', '==', targetUsername.replace(/^@/, '')));
        const snap = await getDocs(q as any);
        if (!snap.empty) {
          const docItem = snap.docs[0];
          const data = docItem.data() as UserProfile;
          setProfile({ ...data, userId: docItem.id });
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [targetUsername]);

  // Load posts for this profile
  useEffect(() => {
    if (!profile) return;
    const postsQuery = query(
      collection(db, 'posts'),
      where('authorId', '==', profile.userId)
    );

    const unsub = onSnapshot(
      postsQuery,
      (snap) => {
        const pList: Post[] = [];
        snap.forEach((d) => {
          pList.push({ postId: d.id, ...d.data() } as Post);
        });
        pList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setPosts(pList);
      },
      (error) => {
        console.warn('Profile posts query fallback:', error);
      }
    );

    return () => unsub();
  }, [profile]);

  // Comments listener
  useEffect(() => {
    if (!selectedPostForComments) return;
    const commentsRef = collection(db, 'posts', selectedPostForComments.postId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const cList: any[] = [];
      snap.forEach((d) => cList.push({ commentId: d.id, ...d.data() }));
      setCommentsList(cList);
    });
    return () => unsub();
  }, [selectedPostForComments]);

  // Real-time listener for posts liked by this profile
  useEffect(() => {
    if (!profile || activeTab !== 'likes') return;
    setLoadingLikes(true);
    const qLikes = query(
      collection(db, 'posts'),
      where('likes', 'array-contains', profile.userId)
    );
    const unsub = onSnapshot(
      qLikes,
      (snap) => {
        const lList: Post[] = [];
        snap.forEach((d) => lList.push({ postId: d.id, ...d.data() } as Post));
        lList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setLikedPosts(lList);
        setLoadingLikes(false);
      },
      () => {
        // Fallback filter
        const fallback = posts.filter((p) => p.likes?.includes(profile.userId));
        fallback.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setLikedPosts(fallback);
        setLoadingLikes(false);
      }
    );
    return () => unsub();
  }, [profile, activeTab, posts]);

  // Media posts from author
  const mediaPosts = useMemo(() => {
    return posts.filter((p) => Boolean(p.imageUrl || p.gifUrl));
  }, [posts]);

  // Filtered media by photos / gifs
  const filteredMediaPosts = useMemo(() => {
    if (mediaFilter === 'photos') return mediaPosts.filter((p) => Boolean(p.imageUrl));
    if (mediaFilter === 'gifs') return mediaPosts.filter((p) => Boolean(p.gifUrl));
    return mediaPosts;
  }, [mediaPosts, mediaFilter]);

  // Media items list for the Lightbox Media Switcher
  const allMediaItems = useMemo(() => {
    const source = activeTab === 'media' && mediaFilter !== 'all' ? filteredMediaPosts : mediaPosts;
    return source.map((p) => ({
      url: (p.imageUrl || p.gifUrl || '') as string,
      type: p.gifUrl ? ('gif' as const) : ('photo' as const),
      post: p,
    }));
  }, [activeTab, mediaFilter, filteredMediaPosts, mediaPosts]);

  // Keyboard navigation for Media Switcher Lightbox
  useEffect(() => {
    if (lightboxIndex === null || allMediaItems.length === 0) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIndex(null);
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : allMediaItems.length - 1));
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev !== null && prev < allMediaItems.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, allMediaItems.length]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-400">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex-1 p-8 text-center space-y-4">
        <h2 className="text-xl font-bold">User Not Found</h2>
        <p className="text-xs text-slate-400">The requested profile @{targetUsername} does not exist or has been deleted.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Blocking logic
  const viewerBlockedTarget = userProfile?.blockedUserIds?.includes(profile.userId);
  const targetBlockedViewer = profile.blockedUserIds?.includes(userProfile?.userId || '');

  const handleToggleBlock = async () => {
    if (!userProfile) return;
    const userRef = doc(db, 'users', userProfile.userId);

    try {
      if (viewerBlockedTarget) {
        // Unblock
        await updateDoc(userRef, {
          blockedUserIds: arrayRemove(profile.userId),
        });
        await updateProfileData({
          blockedUserIds: (userProfile.blockedUserIds || []).filter((id) => id !== profile.userId),
        });
      } else {
        // Block
        await updateDoc(userRef, {
          blockedUserIds: arrayUnion(profile.userId),
        });
        await updateProfileData({
          blockedUserIds: [...(userProfile.blockedUserIds || []), profile.userId],
        });
      }
      setShowMenu(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userProfile.userId}`);
    }
  };

  const isFollowing = profile && userProfile?.followingUserIds?.includes(profile.userId);

  const handleToggleFollow = async () => {
    if (!currentUser || !userProfile || !profile) return;
    if (userProfile.userId === profile.userId) return;

    const myUserRef = doc(db, 'users', userProfile.userId);
    const targetUserRef = doc(db, 'users', profile.userId);

    try {
      if (isFollowing) {
        // Unfollow
        await updateDoc(myUserRef, {
          followingUserIds: arrayRemove(profile.userId),
          followingCount: increment(-1),
        });
        await updateDoc(targetUserRef, {
          followerUserIds: arrayRemove(userProfile.userId),
          followersCount: increment(-1),
        });
        await updateProfileData({
          followingUserIds: (userProfile.followingUserIds || []).filter((id) => id !== profile.userId),
          followingCount: Math.max(0, (userProfile.followingCount || 1) - 1),
        });
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                followersCount: Math.max(0, (prev.followersCount || 1) - 1),
                followerUserIds: (prev.followerUserIds || []).filter((id) => id !== userProfile.userId),
              }
            : null
        );
      } else {
        // Follow
        await updateDoc(myUserRef, {
          followingUserIds: arrayUnion(profile.userId),
          followingCount: increment(1),
        });
        await updateDoc(targetUserRef, {
          followerUserIds: arrayUnion(userProfile.userId),
          followersCount: increment(1),
        });
        await updateProfileData({
          followingUserIds: [...(userProfile.followingUserIds || []), profile.userId],
          followingCount: (userProfile.followingCount || 0) + 1,
        });
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                followersCount: (prev.followersCount || 0) + 1,
                followerUserIds: [...(prev.followerUserIds || []), userProfile.userId],
              }
            : null
        );
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${profile.userId}`);
    }
  };

  const isNeoViewer =
    isAdmin ||
    currentUser?.uid === ADMIN_UID ||
    userProfile?.username.toLowerCase() === 'a321-251n' ||
    userProfile?.displayName.toLowerCase() === 'neo';

  const handleToggleModRole = async () => {
    if (!profile || !isNeoViewer) return;
    const nextRole = profile.role === 'mod' ? 'user' : 'mod';
    try {
      await updateDoc(doc(db, 'users', profile.userId), {
        role: nextRole,
      });
      setProfile((prev) => (prev ? { ...prev, role: nextRole } : null));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${profile.userId}`);
    }
  };

  const handleToggleBlueCheck = async () => {
    if (!profile || !isNeoViewer) return;
    const nextVerified = !profile.isVerified;
    try {
      await updateDoc(doc(db, 'users', profile.userId), {
        isVerified: nextVerified,
      });
      setProfile((prev) => (prev ? { ...prev, isVerified: nextVerified } : null));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${profile.userId}`);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !currentUser) return;
    if (userProfile.isSuspended) {
      alert('Your account is currently suspended and cannot post.');
      return;
    }
    if (!postContent.trim() && !postImage) return;

    setPosting(true);
    try {
      await addDoc(collection(db, 'posts'), {
        authorId: currentUser.uid,
        authorUsername: userProfile.username,
        authorDisplayName: userProfile.displayName,
        authorPhotoURL: userProfile.photoURL,
        authorRole: userProfile.role,
        content: postContent.trim(),
        imageUrl: postImage || null,
        likes: [],
        likesCount: 0,
        commentsCount: 0,
        createdAt: new Date().toISOString(),
      });
      setPostContent('');
      setPostImage(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'posts');
    } finally {
      setPosting(false);
    }
  };

  const handleToggleLike = async (post: Post) => {
    if (!userProfile || !currentUser) return;
    if (userProfile.isSuspended) {
      alert('Your account is currently suspended and cannot like posts.');
      return;
    }

    const postRef = doc(db, 'posts', post.postId);
    const hasLiked = post.likes?.includes(currentUser.uid);

    try {
      if (hasLiked) {
        await updateDoc(postRef, {
          likes: arrayRemove(currentUser.uid),
          likesCount: increment(-1),
        });
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(currentUser.uid),
          likesCount: increment(1),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${post.postId}`);
    }
  };

  const handleDeletePost = async (postId: string, authorId: string) => {
    if (!isAdmin && currentUser?.uid !== authorId) return;
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `posts/${postId}`);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPostForComments || !commentText.trim() || !userProfile || !currentUser) return;
    if (userProfile.isSuspended) {
      alert('Your account is currently suspended and cannot comment.');
      return;
    }

    try {
      await addDoc(collection(db, 'posts', selectedPostForComments.postId, 'comments'), {
        authorId: currentUser.uid,
        authorUsername: userProfile.username,
        authorDisplayName: userProfile.displayName,
        authorPhotoURL: userProfile.photoURL,
        authorRole: userProfile.role,
        content: commentText.trim(),
        createdAt: new Date().toISOString(),
      });
      await updateDoc(doc(db, 'posts', selectedPostForComments.postId), {
        commentsCount: increment(1),
      });
      setCommentText('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `posts/${selectedPostForComments.postId}/comments`);
    }
  };

  // Case 1: Suspended Account viewed by someone else
  if (profile.isSuspended && !isSelf && !isAdmin) {
    return (
      <div className="flex-1 overflow-y-auto">
        {/* Header bar */}
        <div className="p-4 border-b flex items-center gap-4" style={{ borderColor: 'var(--border-app)' }}>
          <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white">
            <ArrowLeft size={18} />
          </button>
          <h2 className="font-bold text-lg">Profile</h2>
        </div>

        {/* Blank banner */}
        <div className="h-44 bg-slate-800/40 w-full" />

        <div className="p-6 text-center space-y-3 max-w-md mx-auto pt-10">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-2">
            <Clock size={32} />
          </div>
          <h3 className="text-2xl font-bold">This Account Is Suspended</h3>
          <p className="text-xs text-slate-400">
            To learn more about suspended accounts,{' '}
            <button
              onClick={() => onNavigateHelp('/help/punishments/suspension')}
              className="text-sky-400 font-semibold hover:underline"
            >
              click here
            </button>
            .
          </p>
        </div>
      </div>
    );
  }

  // Case 2: Blocked States
  if (viewerBlockedTarget || targetBlockedViewer) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-app)' }}>
          <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white">
            <ArrowLeft size={18} />
          </button>
          <h2 className="font-bold text-lg">Profile</h2>
          <div className="w-8" />
        </div>

        <div className="h-36 sm:h-48 bg-slate-800/50 w-full relative">
          <div className="absolute -bottom-12 left-6">
            <img
              src={profile.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
              alt={profile.username}
              className="w-24 h-24 rounded-full border-4 object-cover"
              style={{ borderColor: 'var(--bg-app)' }}
            />
          </div>
        </div>

        <div className="px-6 pt-16 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <UserBadge
                username={profile.username}
                displayName={profile.displayName}
                role={profile.role}
                size="lg"
              />
              <p className="text-xs text-slate-400">@{profile.username}</p>
            </div>

            {viewerBlockedTarget && (
              <button
                onClick={handleToggleBlock}
                className="px-5 py-2 rounded-full text-xs font-bold border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Unblock
              </button>
            )}
          </div>

          {/* Social Counts */}
          <div className="flex items-center gap-5 text-xs text-slate-400 pt-2 border-t border-white/10">
            <div>
              <span className="font-bold text-white">{profile.followersCount || 0}</span> Following
            </div>
            <div>
              <span className="font-bold text-white">{profile.friendsCount || 0}</span> Friends
            </div>
            <div>
              <span className="font-bold text-white">{profile.likesCount || 0}</span> Total Likes
            </div>
          </div>

          {/* Block Notice Area */}
          <div className="py-16 text-center border-t border-white/10 mt-6 space-y-2">
            <h4 className="text-lg font-bold text-slate-300">
              {viewerBlockedTarget
                ? `You Blocked @${profile.username}`
                : `@${profile.username} Blocked You`}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {viewerBlockedTarget
                ? `You cannot view posts or interact with @${profile.username} while they are blocked.`
                : `You are blocked from following, messaging, or viewing posts from @${profile.username}.`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleOpenCustomizeModal = (tab: 'info' | 'css' = 'info') => {
    setShowMenu(false);
    setEditDisplayName(profile.displayName || profile.username);
    setEditBio(profile.bio || '');
    setEditPhotoURL(profile.photoURL || '');
    setEditCustomCss(profile.customCss || '');
    setProfileModalTab(tab);
    setCustomizeError('');
    setCustomizeSuccess('');
    setShowCustomizeModal(true);
  };

  const handleOpenMedia = (mediaUrl: string, targetPost: Post) => {
    let foundIdx = allMediaItems.findIndex((m) => m.url === mediaUrl || m.post.postId === targetPost.postId);
    if (foundIdx === -1) {
      foundIdx = mediaPosts.findIndex((p) => p.postId === targetPost.postId || p.imageUrl === mediaUrl || p.gifUrl === mediaUrl);
    }
    if (foundIdx !== -1) {
      setLightboxIndex(foundIdx);
    } else if (allMediaItems.length > 0) {
      setLightboxIndex(0);
    }
  };

  const renderPostCard = (post: Post) => {
    const hasLiked = post.likes?.includes(currentUser?.uid || '');
    const canDelete = isAdmin || currentUser?.uid === post.authorId;

    return (
      <article key={post.postId} className="profile-post-card p-4 hover:bg-white/[0.02] transition-colors flex gap-3">
        <img
          src={post.authorPhotoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
          alt={post.authorUsername}
          className="w-10 h-10 rounded-full object-cover shrink-0 cursor-pointer"
          onClick={() => onOpenPost ? onOpenPost(post.postId) : setSelectedPostForComments(post)}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate">
              <UserBadge
                username={post.authorUsername}
                displayName={post.authorDisplayName}
                role={post.authorRole}
                size="md"
              />
              <span className="text-xs text-slate-500">•</span>
              <span className="text-[11px] text-slate-400">
                {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {canDelete && (
              <button
                onClick={() => handleDeletePost(post.postId, post.authorId)}
                className="p-1 rounded-full text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                title={isAdmin ? 'Delete post (Admin)' : 'Delete your post'}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {post.content && (
            <p
              onClick={() => onOpenPost ? onOpenPost(post.postId) : setSelectedPostForComments(post)}
              className="text-xs sm:text-sm text-slate-200 mt-1 whitespace-pre-wrap break-words cursor-pointer hover:text-white"
            >
              {post.content}
            </p>
          )}

          {/* Poll if present */}
          {post.poll && <PollWidget post={post} />}

          {/* Image attachment */}
          {post.imageUrl && (
            <div className="relative mt-2.5 rounded-2xl overflow-hidden max-h-80 w-fit group/img cursor-pointer">
              <img
                onClick={() => handleOpenMedia(post.imageUrl!, post)}
                src={post.imageUrl}
                alt="Post content"
                className="rounded-2xl max-h-80 w-auto object-cover border border-white/10 group-hover/img:scale-[1.01] transition-transform"
              />
              <div
                onClick={() => handleOpenMedia(post.imageUrl!, post)}
                className="absolute inset-0 bg-black/0 group-hover/img:bg-black/25 transition-colors flex items-center justify-center opacity-0 group-hover/img:opacity-100"
              >
                <span className="p-2 rounded-full bg-black/70 text-white backdrop-blur-sm">
                  <Maximize2 size={16} />
                </span>
              </div>
            </div>
          )}

          {/* GIF attachment */}
          {post.gifUrl && (
            <div className="relative mt-2.5 rounded-2xl overflow-hidden max-h-80 w-fit group/img cursor-pointer">
              <img
                onClick={() => handleOpenMedia(post.gifUrl!, post)}
                src={post.gifUrl}
                alt="GIF"
                className="rounded-2xl max-h-80 w-auto object-cover border border-white/10 group-hover/img:scale-[1.01] transition-transform"
              />
              <div
                onClick={() => handleOpenMedia(post.gifUrl!, post)}
                className="absolute inset-0 bg-black/0 group-hover/img:bg-black/25 transition-colors flex items-center justify-center opacity-0 group-hover/img:opacity-100"
              >
                <span className="p-2 rounded-full bg-black/70 text-white backdrop-blur-sm">
                  <Maximize2 size={16} />
                </span>
              </div>
            </div>
          )}

          {/* Location Tag */}
          {post.location && (
            <div className="flex items-center gap-1.5 text-xs text-sky-400 mt-2">
              <MapPin size={12} />
              <span>{post.location}</span>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between text-slate-400 max-w-sm mt-3 pt-1">
            <button
              onClick={() => onOpenPost ? onOpenPost(post.postId) : setSelectedPostForComments(post)}
              className="flex items-center gap-1.5 text-xs hover:text-sky-400 transition-colors group cursor-pointer"
              title="Reply"
            >
              <div className="p-1.5 rounded-full group-hover:bg-sky-400/10">
                <MessageCircle size={15} />
              </div>
              <span>{post.commentsCount || 0}</span>
            </button>

            <button
              onClick={() => alert('Reposted to your profile feed!')}
              className="flex items-center gap-1.5 text-xs hover:text-emerald-400 transition-colors group cursor-pointer"
              title="Repost"
            >
              <div className="p-1.5 rounded-full group-hover:bg-emerald-500/10">
                <Repeat size={15} />
              </div>
            </button>

            <button
              onClick={() => handleToggleLike(post)}
              className={`flex items-center gap-1.5 text-xs transition-colors group cursor-pointer ${
                hasLiked ? 'text-pink-500 font-semibold' : 'hover:text-pink-400'
              }`}
              title="Like"
            >
              <div className="p-1.5 rounded-full group-hover:bg-pink-500/10">
                <Heart size={15} className={hasLiked ? 'fill-pink-500' : ''} />
              </div>
              <span>{post.likesCount || 0}</span>
            </button>

            <button
              onClick={() => alert('Post bookmarked!')}
              className="flex items-center gap-1.5 text-xs hover:text-sky-400 transition-colors group cursor-pointer"
              title="Bookmark"
            >
              <div className="p-1.5 rounded-full group-hover:bg-sky-400/10">
                <Bookmark size={15} />
              </div>
            </button>

            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                alert('Link copied to clipboard!');
              }}
              className="flex items-center gap-1.5 text-xs hover:text-sky-400 transition-colors group cursor-pointer"
              title="Share"
            >
              <div className="p-1.5 rounded-full group-hover:bg-sky-400/10">
                <Share2 size={15} />
              </div>
            </button>
          </div>
        </div>
      </article>
    );
  };

  const isCreatorAccount =
    profile.userId === ADMIN_UID ||
    profile.username?.toLowerCase() === ADMIN_USERNAME.toLowerCase() ||
    profile.username?.toLowerCase() === 'neo' ||
    profile.displayName?.toLowerCase() === 'neo';

  const effectiveCss =
    showCustomizeModal && profileModalTab === 'css'
      ? editCustomCss
      : (isCreatorAccount ? CREATOR_STARRY_THEME_CSS : (profile.customCss || ''));

  // Case 3: Full Standard Twitter/X Profile
  return (
    <div id="chatter-profile-view" className="flex-1 overflow-y-auto chatter-profile-view relative">
      {/* 32 Star Elements for Starry / Cosmic Twinkle Themes */}
      <div className="profile-stars-container pointer-events-none absolute inset-0 min-h-full overflow-hidden z-0">
        <div className="star"></div><div className="star"></div><div className="star"></div><div className="star"></div>
        <div className="star"></div><div className="star"></div><div className="star"></div><div className="star"></div>
        <div className="star"></div><div className="star"></div><div className="star"></div><div className="star"></div>
        <div className="star"></div><div className="star"></div><div className="star"></div><div className="star"></div>
        <div className="star"></div><div className="star"></div><div className="star"></div><div className="star"></div>
        <div className="star"></div><div className="star"></div><div className="star"></div><div className="star"></div>
        <div className="star"></div><div className="star"></div><div className="star"></div><div className="star"></div>
        <div className="star"></div><div className="star"></div><div className="star"></div><div className="star"></div>
      </div>

      {/* Injected Scoped Profile Custom CSS */}
      {effectiveCss && (
        <style
          id="profile-custom-css"
          dangerouslySetInnerHTML={{
            __html: scopeCssToProfile(effectiveCss),
          }}
        />
      )}

      {/* Header bar */}
      <div
        className="profile-nav-header sticky top-0 z-20 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between"
        style={{
          borderColor: 'var(--border-app)',
          backgroundColor: 'rgba(9, 14, 23, 0.75)',
        }}
      >
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-base">{profile.displayName || profile.username}</span>
              {profile.role === 'admin' && <GoldenVerifiedCheckmark size={15} />}
            </div>
            <p className="text-[11px] text-slate-400">{posts.length} Posts</p>
          </div>
        </div>

        {/* Three dots moderation menu on top right/left */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <MoreHorizontal size={20} />
          </button>

          {showMenu && (
            <div
              className="absolute right-0 mt-1 w-48 rounded-2xl shadow-2xl border p-1.5 z-30 space-y-0.5"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-app)',
              }}
            >
              {isSelf && (
                <>
                  <button
                    onClick={() => handleOpenCustomizeModal('info')}
                    className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl hover:bg-white/10 text-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Palette size={14} className="text-sky-400" />
                    <span>Customize Profile</span>
                  </button>

                  <button
                    onClick={() => handleOpenCustomizeModal('css')}
                    className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl hover:bg-white/10 text-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Code size={14} className="text-pink-400" />
                    <span>Custom CSS</span>
                  </button>
                </>
              )}

              {!isSelf && (
                <>
                  <button
                    onClick={handleToggleBlock}
                    className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl hover:bg-white/10 text-slate-200 flex items-center gap-2"
                  >
                    <Ban size={14} className="text-red-400" />
                    <span>Block @{profile.username}</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowReportModal(true);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl hover:bg-white/10 text-slate-200 flex items-center gap-2"
                  >
                    <Flag size={14} className="text-amber-400" />
                    <span>Report @{profile.username}</span>
                  </button>
                </>
              )}

              {/* Admin & Mod Options in RED */}
              {isModOrAdmin && !isSelf && (
                <>
                  <div className="border-t my-1 border-white/10" />
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowSuspendModal(true);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl hover:bg-red-500/20 text-red-400 flex items-center gap-2"
                  >
                    <Clock size={14} />
                    <span>Suspend Account</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowBanModal(true);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl hover:bg-red-500/20 text-red-400 flex items-center gap-2"
                  >
                    <Shield size={14} />
                    <span>Ban Account (Indefinite)</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Banner */}
      <div
        className="profile-banner h-44 sm:h-56 w-full relative transition-all"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0369a1 100%)',
        }}
      >
        <div className="absolute -bottom-14 left-6">
          <img
            src={profile.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
            alt={profile.username}
            className="profile-avatar w-28 h-28 rounded-full border-4 object-cover shadow-xl transition-all"
            style={{ borderColor: 'var(--bg-app)' }}
          />
        </div>
      </div>

      {/* Profile Details Container */}
      <div className="px-6 pt-16 pb-4 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="profile-display-name">
              <UserBadge
                username={profile.username}
                displayName={profile.displayName}
                role={profile.role}
                size="lg"
              />
            </div>
            <p className="profile-username text-xs text-slate-400">@{profile.username}</p>
          </div>

          {isSelf ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenCustomizeModal('info')}
                className="px-4 py-2 rounded-full text-xs font-bold border border-white/20 hover:bg-white/10 text-white transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Palette size={13} className="text-sky-400" />
                <span>Customize Profile</span>
              </button>
              <button
                onClick={() => handleOpenCustomizeModal('css')}
                className="px-3.5 py-2 rounded-full text-xs font-bold border border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Style profile with custom CSS"
              >
                <Code size={13} className="text-pink-400" />
                <span className="hidden sm:inline">Custom CSS</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Direct Message Button */}
              <button
                onClick={() => onDirectMessage && onDirectMessage(profile.userId, profile)}
                className="px-4 py-2 rounded-full text-xs font-bold border border-white/20 hover:bg-white/10 text-white transition-all flex items-center gap-1.5 cursor-pointer"
                title={`Direct Message @${profile.username}`}
              >
                <Mail size={14} className="text-sky-400" />
                <span>Message</span>
              </button>

              {/* Follow / Unfollow Button */}
              <button
                onClick={handleToggleFollow}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                  isFollowing
                    ? 'border border-white/30 text-white hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 group cursor-pointer'
                    : 'text-slate-950 hover:opacity-90 cursor-pointer'
                }`}
                style={
                  isFollowing
                    ? undefined
                    : {
                        backgroundColor: 'var(--color-accent)',
                        color: '#090e17',
                      }
                }
              >
                {isFollowing ? (
                  <>
                    <span className="group-hover:hidden">Following</span>
                    <span className="hidden group-hover:inline">Unfollow</span>
                  </>
                ) : (
                  'Follow'
                )}
              </button>

              {/* Neo Admin Promotion / Verification Options: Neo account only */}
              {isNeoViewer && (
                <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-full border border-sky-400/20">
                  <button
                    onClick={handleToggleModRole}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      profile.role === 'mod'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 hover:bg-red-500/20 hover:text-red-300 hover:border-red-400/40'
                        : 'bg-white/10 text-slate-200 hover:text-white hover:bg-white/20'
                    }`}
                    title="Toggle Moderator status (Neo Admin only)"
                  >
                    <Shield size={13} className={profile.role === 'mod' ? 'text-amber-400' : 'text-slate-400'} />
                    <span>{profile.role === 'mod' ? 'Remove Mod' : 'Make Mod'}</span>
                  </button>

                  <button
                    onClick={handleToggleBlueCheck}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      profile.isVerified
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40 hover:bg-red-500/20 hover:text-red-300 hover:border-red-400/40'
                        : 'bg-white/10 text-slate-200 hover:text-white hover:bg-white/20'
                    }`}
                    title="Toggle Blue Checkmark (Neo Admin only)"
                  >
                    <BlueVerifiedCheckmark size={14} />
                    <span>{profile.isVerified ? 'Remove Blue Check' : 'Give Blue Check'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="profile-bio text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
            {profile.bio}
          </p>
        )}

        {/* Social Meta */}
        <div className="profile-stats flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
          <div className="flex items-center gap-1.5">
            <Calendar size={14} />
            <span>
              Joined {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'September 2026'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-bold text-white">{profile.followingCount || 0}</span>
            <span>Following</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-bold text-white">{profile.followersCount || 0}</span>
            <span>Followers</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-bold text-white">{profile.friendsCount || 0}</span>
            <span>Friends</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-bold text-white">{profile.likesCount || 0}</span>
            <span>Likes</span>
          </div>
        </div>
      </div>

      {/* Profile Navigation Tabs (Posts, Media, Likes) */}
      <div className="profile-tabs flex border-b text-xs font-semibold mt-2" style={{ borderColor: 'var(--border-app)' }}>
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'posts' ? 'border-sky-400 text-sky-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <span>Posts</span>
          <span className="text-[11px] opacity-75">({posts.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('media')}
          className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'media' ? 'border-sky-400 text-sky-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <ImageIcon size={14} />
          <span>Media</span>
          <span className="text-[11px] opacity-75">({mediaPosts.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('likes')}
          className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'likes' ? 'border-sky-400 text-sky-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Heart size={14} />
          <span>Likes</span>
          {likedPosts.length > 0 && <span className="text-[11px] opacity-75">({likedPosts.length})</span>}
        </button>
      </div>

      {/* Create Post Area (if self and on 'posts' tab) */}
      {isSelf && activeTab === 'posts' && (
        <div className="profile-composer">
          <TwitterPostComposer
            onPostCreated={async (data) => {
              if (!userProfile || !currentUser) return;
              await addDoc(collection(db, 'posts'), {
                authorId: currentUser.uid,
                authorUsername: userProfile.username,
                authorDisplayName: userProfile.displayName,
                authorPhotoURL: userProfile.photoURL,
                authorRole: userProfile.role,
                authorIsVerified: Boolean(userProfile.isVerified),
                content: data.content,
                imageUrl: data.imageUrl || null,
                gifUrl: data.gifUrl || null,
                poll: data.poll || null,
                location: data.location || null,
                likes: [],
                likesCount: 0,
                commentsCount: 0,
                createdAt: new Date().toISOString(),
              });
            }}
          />
        </div>
      )}

      {/* TAB 1: POSTS LIST */}
      {activeTab === 'posts' && (
        <div className="profile-posts-list divide-y divide-white/5">
          {posts.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs space-y-2">
              <p>No posts yet from @{profile.username}.</p>
            </div>
          ) : (
            posts.map((post) => renderPostCard(post))
          )}
        </div>
      )}

      {/* TAB 2: MEDIA SWITCHER */}
      {activeTab === 'media' && (
        <div className="profile-media-section">
          {/* Media Switcher Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-white/[0.02] border-b border-white/5">
            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setMediaFilter('all')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  mediaFilter === 'all'
                    ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({mediaPosts.length})
              </button>
              <button
                type="button"
                onClick={() => setMediaFilter('photos')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  mediaFilter === 'photos'
                    ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ImageIcon size={13} />
                <span>Photos ({mediaPosts.filter((p) => Boolean(p.imageUrl)).length})</span>
              </button>
              <button
                type="button"
                onClick={() => setMediaFilter('gifs')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  mediaFilter === 'gifs'
                    ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Film size={13} />
                <span>GIFs ({mediaPosts.filter((p) => Boolean(p.gifUrl)).length})</span>
              </button>
            </div>

            {/* Layout Switcher: Grid vs Feed */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setMediaLayout('grid')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 font-semibold ${
                  mediaLayout === 'grid'
                    ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Grid Gallery"
              >
                <Grid size={14} />
                <span>Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setMediaLayout('feed')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 font-semibold ${
                  mediaLayout === 'feed'
                    ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Feed View"
              >
                <LayoutList size={14} />
                <span>Feed</span>
              </button>
            </div>
          </div>

          {/* Media Content */}
          {filteredMediaPosts.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                <ImageIcon size={30} />
              </div>
              <h3 className="text-sm font-bold text-white">No media found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {mediaFilter === 'photos'
                  ? `No photos have been uploaded by @${profile.username} yet.`
                  : mediaFilter === 'gifs'
                  ? `No GIFs have been posted by @${profile.username} yet.`
                  : `When @${profile.username} posts photos or GIFs, they will appear here.`}
              </p>
            </div>
          ) : mediaLayout === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2.5 p-2 sm:p-4">
              {filteredMediaPosts.map((post, idx) => {
                const mediaUrl = post.imageUrl || post.gifUrl || '';
                const isGif = Boolean(post.gifUrl);
                return (
                  <div
                    key={post.postId}
                    onClick={() => setLightboxIndex(idx)}
                    className="group relative aspect-square rounded-2xl overflow-hidden bg-black/40 border border-white/10 cursor-pointer hover:border-sky-400/50 transition-all duration-200"
                  >
                    <img
                      src={mediaUrl}
                      alt={post.content || 'Media preview'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />

                    {isGif && (
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-sm border border-white/20 text-[10px] font-black text-sky-400 tracking-wider">
                        GIF
                      </div>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2.5 sm:p-3">
                      {post.content && (
                        <p className="text-[11px] text-white line-clamp-2 mb-1.5 font-medium leading-snug">
                          {post.content}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-slate-200 font-semibold">
                        <span className="flex items-center gap-1">
                          <Heart size={13} className="fill-pink-500 text-pink-500" />
                          {post.likesCount || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle size={13} className="text-sky-400" />
                          {post.commentsCount || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredMediaPosts.map((post) => renderPostCard(post))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LIKES */}
      {activeTab === 'likes' && (
        <div className="profile-likes-section">
          {loadingLikes ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Loading likes...</span>
            </div>
          ) : likedPosts.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                <Heart size={30} className="text-pink-400/50" />
              </div>
              <h3 className="text-sm font-bold text-white">No liked posts yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                When @{profile.username} likes posts, they will show up here.
              </p>
            </div>
          ) : (
            <div className="profile-posts-list divide-y divide-white/5">
              {likedPosts.map((post) => renderPostCard(post))}
            </div>
          )}
        </div>
      )}

      {/* Fullscreen Media Lightbox with Switcher */}
      {lightboxIndex !== null && allMediaItems[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col select-none"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 bg-black/60 border-b border-white/10 shrink-0 z-20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-bold text-white border border-white/10">
                Media {lightboxIndex + 1} of {allMediaItems.length}
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline">
                Use ← / → keys to switch media
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const url = allMediaItems[lightboxIndex].url;
                  const a = document.createElement('a');
                  a.href = url;
                  a.target = '_blank';
                  a.download = `media-${lightboxIndex + 1}`;
                  a.click();
                }}
                className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Open original"
              >
                <ExternalLink size={18} />
              </button>
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Main Stage with Switcher Arrows */}
          <div
            className="flex-1 relative flex items-center justify-center p-4 min-h-0 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {allMediaItems.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex((prev) =>
                    prev !== null && prev > 0 ? prev - 1 : allMediaItems.length - 1
                  )
                }
                className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/70 hover:bg-black/90 text-white border border-white/20 transition-all hover:scale-110 cursor-pointer shadow-2xl"
                title="Previous Media (←)"
              >
                <ChevronLeft size={26} />
              </button>
            )}

            <div className="max-w-4xl max-h-full flex items-center justify-center">
              <img
                src={allMediaItems[lightboxIndex].url}
                alt={allMediaItems[lightboxIndex].post.content || 'Media preview'}
                className="max-w-full max-h-[70vh] rounded-2xl object-contain shadow-2xl border border-white/10"
              />
            </div>

            {allMediaItems.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex((prev) =>
                    prev !== null && prev < allMediaItems.length - 1 ? prev + 1 : 0
                  )
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/70 hover:bg-black/90 text-white border border-white/20 transition-all hover:scale-110 cursor-pointer shadow-2xl"
                title="Next Media (→)"
              >
                <ChevronRight size={26} />
              </button>
            )}
          </div>

          {/* Footer Details & Thumbnail Strip Switcher */}
          <div
            className="bg-black/80 border-t border-white/10 p-3 sm:p-4 shrink-0 z-20 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={allMediaItems[lightboxIndex].post.authorPhotoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-bold text-xs text-white">
                      {allMediaItems[lightboxIndex].post.authorDisplayName || allMediaItems[lightboxIndex].post.authorUsername}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      @{allMediaItems[lightboxIndex].post.authorUsername}
                    </span>
                  </div>
                  {allMediaItems[lightboxIndex].post.content && (
                    <p className="text-xs text-slate-200 truncate mt-0.5 max-w-xl">
                      {allMediaItems[lightboxIndex].post.content}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleLike(allMediaItems[lightboxIndex].post)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs text-white transition-colors cursor-pointer"
                >
                  <Heart
                    size={14}
                    className={
                      allMediaItems[lightboxIndex].post.likes?.includes(currentUser?.uid || '')
                        ? 'fill-pink-500 text-pink-500'
                        : ''
                    }
                  />
                  <span>{allMediaItems[lightboxIndex].post.likesCount || 0}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const post = allMediaItems[lightboxIndex].post;
                    setLightboxIndex(null);
                    if (onOpenPost) {
                      onOpenPost(post.postId);
                    } else {
                      setSelectedPostForComments(post);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  <MessageCircle size={14} />
                  <span>View Post</span>
                </button>
              </div>
            </div>

            {/* Thumbnail Carousel Switcher */}
            {allMediaItems.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                {allMediaItems.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setLightboxIndex(idx)}
                    className={`w-12 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                      idx === lightboxIndex
                        ? 'border-sky-400 scale-105 shadow-md shadow-sky-500/40 ring-2 ring-sky-400/30'
                        : 'border-transparent opacity-50 hover:opacity-100'
                    }`}
                  >
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <ReportModal
        reportedUserId={profile.userId}
        reportedUsername={profile.username}
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onBlockUser={async () => handleToggleBlock()}
      />

      <SuspendModal
        targetUserId={profile.userId}
        targetUsername={profile.username}
        isOpen={showSuspendModal}
        onClose={() => setShowSuspendModal(false)}
        onSuccess={() => fetchProfile()}
      />

      <BanModal
        targetUserId={profile.userId}
        targetUsername={profile.username}
        isOpen={showBanModal}
        onClose={() => setShowBanModal(false)}
        onSuccess={() => fetchProfile()}
      />

      {/* Customize Profile Modal (Owner Only) */}
      {showCustomizeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="w-full max-w-lg rounded-3xl p-6 shadow-2xl border space-y-4 max-h-[90vh] overflow-y-auto"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-app)',
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-app)' }}>
              <div className="flex items-center gap-2">
                <Palette className="text-sky-400" size={18} />
                <h3 className="font-extrabold text-sm text-white">Customize Profile</h3>
              </div>
              <button
                onClick={() => setShowCustomizeModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Tabs: Profile Info vs Custom CSS */}
            <div className="flex border-b text-xs font-bold" style={{ borderColor: 'var(--border-app)' }}>
              <button
                type="button"
                onClick={() => setProfileModalTab('info')}
                className={`flex-1 py-2 text-center border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  profileModalTab === 'info'
                    ? 'border-sky-400 text-sky-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <User size={14} />
                <span>Profile Info</span>
              </button>
              <button
                type="button"
                onClick={() => setProfileModalTab('css')}
                className={`flex-1 py-2 text-center border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  profileModalTab === 'css'
                    ? 'border-pink-400 text-pink-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Code size={14} />
                <span>Custom CSS</span>
                {editCustomCss.trim() && (
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />
                )}
              </button>
            </div>

            {customizeError && (
              <p className="text-xs text-red-400 font-semibold">{customizeError}</p>
            )}
            {customizeSuccess && (
              <p className="text-xs text-emerald-400 font-semibold">{customizeSuccess}</p>
            )}

            {/* TAB 1: Profile Info */}
            {profileModalTab === 'info' && (
              <div className="space-y-4 animate-fade-in">
                {/* Profile Avatar customizer */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Profile Picture</label>
                  <div className="flex items-center gap-4">
                    <div className="relative group">
                      <img
                        src={editPhotoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                        alt="Preview"
                        className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
                      />
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Camera size={18} />
                      </button>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <input
                        type="file"
                        ref={avatarInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          if (e.target.files && e.target.files[0]) {
                            try {
                              const compressed = await compressImage(e.target.files[0], 400, 400, 0.8);
                              setEditPhotoURL(compressed);
                            } catch {
                              setCustomizeError('Failed to process avatar image');
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors cursor-pointer"
                      >
                        Upload New Photo
                      </button>
                      <p className="text-[11px] text-slate-500">Square JPG, PNG, or WebP recommended</p>
                    </div>
                  </div>
                </div>

                {/* Display Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Display Name (can include spaces)
                  </label>
                  <input
                    type="text"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    maxLength={50}
                    placeholder="Your Display Name"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-sky-400"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Bio
                  </label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    maxLength={200}
                    rows={3}
                    placeholder="Tell the community about yourself..."
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-sky-400 resize-none"
                  />
                  <span className="text-[10px] text-slate-500 text-right block mt-0.5">{editBio.length}/200</span>
                </div>

                {/* Theme & Colors shortcut */}
                {onOpenSettings && (
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">Color Themes & Presets</p>
                      <p className="text-[11px] text-slate-400">Choose from 20 themes or customize colors individually</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomizeModal(false);
                        onOpenSettings('customization');
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 border border-sky-500/30 transition-colors cursor-pointer"
                    >
                      Change Colors
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Custom CSS */}
            {profileModalTab === 'css' && (
              <div className="space-y-4 animate-fade-in">
                {/* Information Callout */}
                <div className="p-3 rounded-2xl bg-pink-500/10 border border-pink-500/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-pink-300 font-bold text-xs">
                    <Sparkles size={14} />
                    <span>Personal Profile Custom CSS</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Input your custom CSS to style your profile page! Your styles are saved to your account and shown whenever users visit your profile. Real-time preview updates live in the background.
                  </p>
                </div>

                {/* Preset Snippets */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">Quick Style Presets</label>
                    <span className="text-[10px] text-slate-500">Click to apply template</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-black/20 rounded-xl border border-white/5">
                    {PROFILE_CSS_SNIPPETS.map((snippet) => (
                      <button
                        key={snippet.name}
                        type="button"
                        onClick={() => setEditCustomCss(snippet.code)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/5 hover:bg-pink-500/20 hover:text-pink-300 text-slate-300 border border-white/10 hover:border-pink-500/30 transition-all cursor-pointer whitespace-nowrap"
                      >
                        {snippet.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selector Tag Cheatsheet */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">Available Target Selectors</label>
                    <span className="text-[10px] text-slate-500">Click to insert snippet</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '.profile-banner', desc: 'Banner background & shadow' },
                      { label: '.profile-avatar', desc: 'Avatar border & glow' },
                      { label: '.profile-display-name', desc: 'Name font & gradient' },
                      { label: '.profile-bio', desc: 'Bio styling' },
                      { label: '.profile-stats', desc: 'Follower stats bar' },
                      { label: '.profile-post-card', desc: 'Post card border & card background' },
                      { label: '.profile-tabs', desc: 'Posts/Media/Likes bar' },
                      { label: '#chatter-profile-view', desc: 'Entire page background' },
                      { label: '.star', desc: 'Twinkling stars for cosmic themes' },
                    ].map(({ label }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => {
                          const insert = `\n${label} {\n  \n}\n`;
                          setEditCustomCss((prev) => (prev ? prev + insert : insert.trim()));
                        }}
                        className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/5 hover:bg-sky-500/20 text-slate-400 hover:text-sky-300 border border-white/10 transition-colors cursor-pointer"
                        title={`Click to insert ${label}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* CSS Code Editor */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Code size={13} className="text-pink-400" />
                      <span>CSS Code Editor</span>
                    </label>
                    <div className="flex items-center gap-2">
                      {editCustomCss && (
                        <button
                          type="button"
                          onClick={() => setEditCustomCss('')}
                          className="text-[11px] text-slate-400 hover:text-red-400 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <RotateCcw size={11} />
                          <span>Clear</span>
                        </button>
                      )}
                      <span className="text-[10px] font-mono text-slate-500">
                        {editCustomCss.length} chars
                      </span>
                    </div>
                  </div>
                  <textarea
                    value={editCustomCss}
                    onChange={(e) => setEditCustomCss(e.target.value)}
                    spellCheck={false}
                    rows={8}
                    placeholder={`/* Example custom CSS */\n.profile-banner {\n  background: linear-gradient(135deg, #ec4899, #8b5cf6) !important;\n}\n.profile-display-name {\n  color: #38bdf8 !important;\n  text-shadow: 0 0 10px rgba(56, 189, 248, 0.5);\n}`}
                    className="w-full text-xs font-mono p-3.5 rounded-xl bg-slate-950 text-emerald-400 border border-white/10 focus:outline-none focus:border-pink-400 resize-y leading-relaxed selection:bg-pink-500/30"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>✨ Scoped safely to your profile</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live background preview active
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 border-t flex items-center justify-between gap-2.5" style={{ borderColor: 'var(--border-app)' }}>
              <div>
                {profileModalTab === 'css' && (
                  <button
                    type="button"
                    onClick={() => setEditCustomCss(PROFILE_CSS_SNIPPETS[0].code)}
                    className="text-xs text-slate-400 hover:text-pink-300 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={13} />
                    <span>Load Neon Preset</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomizeModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingProfile || !editDisplayName.trim()}
                  onClick={async () => {
                    setSavingProfile(true);
                    setCustomizeError('');
                    try {
                      await updateProfileData({
                        displayName: editDisplayName.trim(),
                        bio: editBio.trim(),
                        photoURL: editPhotoURL || profile.photoURL,
                        customCss: editCustomCss,
                      });
                      setProfile((prev) =>
                        prev
                          ? {
                              ...prev,
                              displayName: editDisplayName.trim(),
                              bio: editBio.trim(),
                              photoURL: editPhotoURL || prev.photoURL,
                              customCss: editCustomCss,
                            }
                          : null
                      );
                      setCustomizeSuccess('Profile updated successfully!');
                      setTimeout(() => {
                        setShowCustomizeModal(false);
                        setCustomizeSuccess('');
                      }, 1000);
                    } catch (err: any) {
                      setCustomizeError(err.message || 'Failed to update profile');
                    } finally {
                      setSavingProfile(false);
                    }
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-40 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: '#090e17',
                  }}
                >
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
