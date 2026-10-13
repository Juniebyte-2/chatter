import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Flame,
  Clock,
  Trophy,
  ArrowBigUp,
  ArrowBigDown,
  MessageSquare,
  Share2,
  Trash2,
  Shield,
  Check,
  ChevronRight,
  ChevronDown,
  Sparkles,
  ExternalLink,
  ArrowLeft,
  X,
  Image as ImageIcon,
  Tag,
  Info
} from 'lucide-react';
import { Community, Post } from '../types';
import { useAuth } from '../context/AuthContext';
import { UserBadge } from './UserBadge';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  increment
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { compressImage } from '../utils/imageCompressor';

export interface CommunitiesProps {
  onOpenProfile: (username: string) => void;
  onOpenPost: (postId: string) => void;
  initialCommunityId?: string | null;
}

export type RedditCommunitiesProps = CommunitiesProps;

const COMMUNITY_CATEGORIES = [
  'All',
  'Technology',
  'Gaming',
  'Discussion',
  'Entertainment',
  'Science',
  'Creative',
];

const POPULAR_FLAIRS = [
  { name: 'Discussion', color: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  { name: 'News', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  { name: 'Meme', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  { name: 'Question', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  { name: 'OC / Project', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  { name: 'Announcement', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
];

export const RedditCommunities: React.FC<RedditCommunitiesProps> = ({
  onOpenProfile,
  onOpenPost,
  initialCommunityId = null,
}) => {
  const { currentUser, userProfile, isAdmin, isModOrAdmin } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortOption, setSortOption] = useState<'hot' | 'new' | 'top'>('hot');
  const [selectedFlair, setSelectedFlair] = useState<string | null>(null);

  // Community Posts
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Joined communities IDs (localStorage + profile)
  const [joinedCommunityIds, setJoinedCommunityIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('chatter_joined_communities');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modals
  const [showCreateCommunityModal, setShowCreateCommunityModal] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);

  // Create Community Form
  const [newCommName, setNewCommName] = useState('');
  const [newCommTitle, setNewCommTitle] = useState('');
  const [newCommDesc, setNewCommDesc] = useState('');
  const [newCommCategory, setNewCommCategory] = useState('Technology');
  const [newCommEmoji, setNewCommEmoji] = useState('💻');
  const [newCommRules, setNewCommRules] = useState([
    '1. Be respectful and constructive to all community members.',
    '2. Submissions must adhere to the community topic.',
    '3. No spam, advertising, or toxic harassment.'
  ]);
  const [ruleInput, setRuleInput] = useState('');
  const [creatingCommunity, setCreatingCommunity] = useState(false);

  // Create Post Form
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostFlair, setNewPostFlair] = useState('Discussion');
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [submittingPost, setSubmittingPost] = useState(false);

  // UI state
  const [expandedRule, setExpandedRule] = useState<number | null>(null);
  const [commentPendingDelete, setCommentPendingDelete] = useState<string | null>(null);
  const [communityPendingDelete, setCommunityPendingDelete] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const isNeo =
    Boolean(isAdmin) ||
    Boolean(isModOrAdmin) ||
    userProfile?.username?.toLowerCase() === 'a321-251n' ||
    userProfile?.displayName?.toLowerCase() === 'neo' ||
    userProfile?.username?.toLowerCase() === 'neo';

  // 1. Fetch & sync communities from Firestore (no auto-seeding)
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'communities'),
      (snapshot) => {
        const list: Community[] = [];
        snapshot.forEach((d) => {
          list.push({ communityId: d.id, ...d.data() } as Community);
        });
        setCommunities(list);

        // If currently viewing a community that was removed, reset to directory
        if (selectedCommunity) {
          const stillThere = list.find((c) => c.communityId === selectedCommunity.communityId);
          if (!stillThere) setSelectedCommunity(null);
        } else if (initialCommunityId) {
          const found = list.find(
            (c) =>
              c.communityId === initialCommunityId ||
              c.name.toLowerCase() === initialCommunityId.toLowerCase()
          );
          if (found) setSelectedCommunity(found);
        }
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'communities');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [initialCommunityId, selectedCommunity]);

  // Delete an entire community (Admin, Mod, Neo, or creator)
  const handleDeleteCommunity = async (comm: Community, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUser) return;
    const canDelete = isNeo || isModOrAdmin || comm.creatorId === currentUser.uid;
    if (!canDelete) return;

    setCommunities((prev) => prev.filter((c) => c.communityId !== comm.communityId));
    setJoinedCommunityIds((prev) => prev.filter((id) => id !== comm.communityId));
    if (selectedCommunity?.communityId === comm.communityId) {
      setSelectedCommunity(null);
    }
    setCommunityPendingDelete(null);

    try {
      await deleteDoc(doc(db, 'communities', comm.communityId));
      showToast(`Community ${comm.name} deleted`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `communities/${comm.communityId}`);
    }
  };

  // Save joined communities in localStorage
  useEffect(() => {
    try {
      localStorage.setItem('chatter_joined_communities', JSON.stringify(joinedCommunityIds));
    } catch {}
  }, [joinedCommunityIds]);

  // 2. Fetch posts when selectedCommunity changes
  useEffect(() => {
    if (!selectedCommunity) {
      setPosts([]);
      return;
    }

    setLoadingPosts(true);
    const postsRef = collection(db, 'posts');
    const q = query(
      postsRef,
      where('communityId', '==', selectedCommunity.communityId)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: Post[] = [];
        snapshot.forEach((d) => {
          list.push({ postId: d.id, ...d.data() } as Post);
        });
        setPosts(list);
        setLoadingPosts(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `posts?communityId=${selectedCommunity.communityId}`);
        setLoadingPosts(false);
      }
    );

    return () => unsub();
  }, [selectedCommunity]);

  // Join / Leave community
  const handleToggleJoin = async (comm: Community, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isJoined = joinedCommunityIds.includes(comm.communityId);
    const nextJoined = isJoined
      ? joinedCommunityIds.filter((id) => id !== comm.communityId)
      : [...joinedCommunityIds, comm.communityId];

    setJoinedCommunityIds(nextJoined);

    // Optimistically update member count
    const delta = isJoined ? -1 : 1;
    setCommunities((prev) =>
      prev.map((c) => (c.communityId === comm.communityId ? { ...c, membersCount: Math.max(1, (c.membersCount || 0) + delta) } : c))
    );
    if (selectedCommunity?.communityId === comm.communityId) {
      setSelectedCommunity((prev) =>
        prev ? { ...prev, membersCount: Math.max(1, (prev.membersCount || 0) + delta) } : null
      );
    }

    try {
      await updateDoc(doc(db, 'communities', comm.communityId), {
        membersCount: increment(delta),
      });
      showToast(isJoined ? `Left ${comm.name}` : `Joined ${comm.name}!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `communities/${comm.communityId}`);
    }
  };

  // Upvote / Downvote community posts
  const handleVote = async (post: Post, voteType: 'up' | 'down') => {
    if (!currentUser) {
      showToast('Please log in to vote');
      return;
    }
    if (userProfile?.isSuspended) {
      showToast('Account suspended: Voting is disabled');
      return;
    }

    const uid = currentUser.uid;
    const currentUpvotes = post.upvotes || [];
    const currentDownvotes = post.downvotes || [];
    const hasUpvoted = currentUpvotes.includes(uid);
    const hasDownvoted = currentDownvotes.includes(uid);

    let newUpvotes = [...currentUpvotes];
    let newDownvotes = [...currentDownvotes];

    if (voteType === 'up') {
      if (hasUpvoted) {
        // Toggle off
        newUpvotes = newUpvotes.filter((id) => id !== uid);
      } else {
        newUpvotes.push(uid);
        newDownvotes = newDownvotes.filter((id) => id !== uid);
      }
    } else {
      if (hasDownvoted) {
        // Toggle off
        newDownvotes = newDownvotes.filter((id) => id !== uid);
      } else {
        newDownvotes.push(uid);
        newUpvotes = newUpvotes.filter((id) => id !== uid);
      }
    }

    const newScore = newUpvotes.length - newDownvotes.length;

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.postId === post.postId
          ? {
              ...p,
              upvotes: newUpvotes,
              downvotes: newDownvotes,
              score: newScore,
              likesCount: Math.max(0, newScore),
            }
          : p
      )
    );

    try {
      const postRef = doc(db, 'posts', post.postId);
      if (voteType === 'up') {
        if (hasUpvoted) {
          await updateDoc(postRef, {
            upvotes: arrayRemove(uid),
            score: newScore,
            likesCount: Math.max(0, newScore),
          });
        } else {
          await updateDoc(postRef, {
            upvotes: arrayUnion(uid),
            downvotes: arrayRemove(uid),
            score: newScore,
            likesCount: Math.max(0, newScore),
          });
        }
      } else {
        if (hasDownvoted) {
          await updateDoc(postRef, {
            downvotes: arrayRemove(uid),
            score: newScore,
            likesCount: Math.max(0, newScore),
          });
        } else {
          await updateDoc(postRef, {
            downvotes: arrayUnion(uid),
            upvotes: arrayRemove(uid),
            score: newScore,
            likesCount: Math.max(0, newScore),
          });
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${post.postId}`);
    }
  };

  // Delete post (mod, neo, or author)
  const handleDeletePost = async (postId: string) => {
    if (!currentUser) return;
    setPosts((prev) => prev.filter((p) => p.postId !== postId));
    setCommentPendingDelete(null);

    try {
      await deleteDoc(doc(db, 'posts', postId));
      showToast('Post removed');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `posts/${postId}`);
    }
  };

  // Create new Community
  const handleCreateCommunitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile) return;

    const rawSlug = newCommName.toLowerCase().replace(/^c\//, '').replace(/[^a-z0-9_]/g, '').trim();
    if (rawSlug.length < 3) {
      showToast('Community handle must be at least 3 characters');
      return;
    }
    if (!newCommTitle.trim()) {
      showToast('Please enter a display title');
      return;
    }

    setCreatingCommunity(true);
    const commId = rawSlug;
    const formattedName = `c/${rawSlug}`;

    const newCommunity: Community = {
      communityId: commId,
      name: formattedName,
      displayName: newCommTitle.trim(),
      description: newCommDesc.trim() || `Welcome to ${formattedName}!`,
      category: newCommCategory,
      iconEmoji: newCommEmoji || '🌟',
      bannerColor: 'from-sky-600 via-indigo-700 to-slate-900',
      creatorId: currentUser.uid,
      creatorUsername: userProfile.username,
      createdAt: new Date().toISOString(),
      membersCount: 1,
      rules: newCommRules,
      moderators: [userProfile.username],
      isVerified: false,
    };

    try {
      await setDoc(doc(db, 'communities', commId), newCommunity);
      setCommunities((prev) => [newCommunity, ...prev.filter((c) => c.communityId !== commId)]);
      setJoinedCommunityIds((prev) => [...prev, commId]);
      setSelectedCommunity(newCommunity);
      setShowCreateCommunityModal(false);
      setNewCommName('');
      setNewCommTitle('');
      setNewCommDesc('');
      showToast(`Created ${formattedName}!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `communities/${commId}`);
    } finally {
      setCreatingCommunity(false);
    }
  };

  // Create Post inside community
  const handleCreatePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile || !selectedCommunity) return;
    if (userProfile.isSuspended) {
      showToast('Account suspended: Posting is disabled');
      return;
    }
    if (!newPostTitle.trim()) {
      showToast('Please enter a post title');
      return;
    }

    setSubmittingPost(true);
    const title = newPostTitle.trim();
    const content = newPostContent.trim();
    const flair = newPostFlair;
    const imageUrl = newPostImage;

    const newPostData = {
      authorId: currentUser.uid,
      authorUsername: userProfile.username,
      authorDisplayName: userProfile.displayName,
      authorPhotoURL: userProfile.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=user',
      authorRole: userProfile.role || 'user',
      authorIsVerified: Boolean(userProfile.isVerified),
      title,
      content,
      flair,
      imageUrl,
      communityId: selectedCommunity.communityId,
      communityName: selectedCommunity.name,
      communityIcon: selectedCommunity.iconEmoji,
      upvotes: [currentUser.uid],
      downvotes: [],
      score: 1,
      likes: [currentUser.uid],
      likesCount: 1,
      commentsCount: 0,
      createdAt: new Date().toISOString(),
    };

    try {
      const docRef = await addDoc(collection(db, 'posts'), newPostData);
      const createdPost: Post = {
        postId: docRef.id,
        ...newPostData,
      };
      setPosts((prev) => [createdPost, ...prev]);
      setShowCreatePostModal(false);
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostImage(null);
      showToast('Post published to ' + selectedCommunity.name);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'posts');
    } finally {
      setSubmittingPost(false);
    }
  };

  // Filter & sort posts
  const filteredPosts = posts
    .filter((p) => {
      if (selectedFlair && p.flair !== selectedFlair) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortOption === 'top') {
        return (b.score ?? b.likesCount ?? 0) - (a.score ?? a.likesCount ?? 0);
      }
      if (sortOption === 'new') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      // Hot: Score weighted by recency
      const scoreA = a.score ?? a.likesCount ?? 0;
      const scoreB = b.score ?? b.likesCount ?? 0;
      const ageHoursA = (Date.now() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60);
      const ageHoursB = (Date.now() - new Date(b.createdAt).getTime()) / (1000 * 60 * 60);
      const hotA = scoreA / Math.pow(ageHoursA + 2, 1.2);
      const hotB = scoreB / Math.pow(ageHoursB + 2, 1.2);
      return hotB - hotA;
    });

  // Filter communities in directory
  const filteredCommunities = communities.filter((comm) => {
    const matchesSearch =
      comm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comm.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comm.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      activeCategory === 'All' || comm.category.toLowerCase() === activeCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <div
      className="flex-1 flex flex-col h-full overflow-y-auto select-none"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}
    >
      {/* Top Header Bar */}
      <header
        className="sticky top-0 z-20 px-4 sm:px-6 py-3 border-b flex items-center justify-between backdrop-blur-md"
        style={{
          borderColor: 'var(--border-app)',
          backgroundColor: 'rgba(9, 14, 23, 0.88)',
        }}
      >
        <div className="flex items-center gap-3">
          {selectedCommunity && (
            <button
              onClick={() => setSelectedCommunity(null)}
              className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer mr-1"
              title="Back to all communities"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <div className="w-8 h-8 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold text-base">
            {selectedCommunity ? selectedCommunity.iconEmoji : '🪐'}
          </div>

          <div>
            <h1 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>{selectedCommunity ? selectedCommunity.name : 'Communities'}</span>
              {selectedCommunity?.isVerified && (
                <Check size={14} className="text-sky-400 bg-sky-500/20 rounded-full p-0.5" />
              )}
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {selectedCommunity
                ? selectedCommunity.displayName
                : 'Explore, join communities, and share discussions'}
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {selectedCommunity ? (
            <>
              <button
                onClick={(e) => handleToggleJoin(selectedCommunity, e)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  joinedCommunityIds.includes(selectedCommunity.communityId)
                    ? 'bg-white/10 text-slate-200 hover:bg-red-500/20 hover:text-red-300'
                    : 'bg-white text-slate-950 hover:bg-slate-200 shadow-sm'
                }`}
              >
                {joinedCommunityIds.includes(selectedCommunity.communityId) ? (
                  <>
                    <Check size={13} />
                    <span>Joined</span>
                  </>
                ) : (
                  <>
                    <Plus size={13} />
                    <span>Join</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setShowCreatePostModal(true)}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span className="hidden sm:inline">Create Post</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowCreateCommunityModal(true)}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} />
              <span>Create Community</span>
            </button>
          )}
        </div>
      </header>

      {/* Main View Area */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-6">
        {!selectedCommunity ? (
          /* ============================================================== */
          /* 1. COMMUNITY DIRECTORY & EXPLORER                              */
          /* ============================================================== */
          <div className="space-y-6">
            {/* Hero Banner */}
            <div
              className="p-6 sm:p-8 rounded-3xl border shadow-xl relative overflow-hidden space-y-4"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-app)',
              }}
            >
              <div className="max-w-xl space-y-2">
                <span className="text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  Communities
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Discover Your Favorite Topics
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Join specialized communities for technology, gaming, art, memes, and daily Q&As. Upvote high-effort posts, join in-depth discussions, or start your own community.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative max-w-md pt-2">
                <Search size={16} className="absolute left-3.5 top-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search communities (e.g. technology, gaming, memes)..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-full text-xs bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
                {COMMUNITY_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      activeCategory === cat
                        ? 'bg-orange-600 text-white shadow-sm'
                        : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Communities Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1 text-xs text-slate-400 font-semibold">
                <span>All Communities ({filteredCommunities.length})</span>
                {filteredCommunities.length > 0 && <span>Click to visit & explore</span>}
              </div>

              {filteredCommunities.length === 0 ? (
                <div
                  className="py-16 px-6 text-center rounded-3xl border space-y-4"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-app)',
                  }}
                >
                  <div className="w-14 h-14 rounded-3xl bg-orange-500/10 text-orange-400 flex items-center justify-center mx-auto text-2xl">
                    🪐
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-white">No Communities Yet</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      There are no communities created yet. Be the first to start a community!
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateCommunityModal(true)}
                    className="px-5 py-2.5 rounded-full text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Create a Community</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCommunities.map((comm) => {
                    const isJoined = joinedCommunityIds.includes(comm.communityId);
                    const canDeleteComm =
                      isNeo || isModOrAdmin || (currentUser && comm.creatorId === currentUser.uid);

                    return (
                      <div
                        key={comm.communityId}
                        onClick={() => setSelectedCommunity(comm)}
                        className="p-5 rounded-2xl border transition-all hover:bg-white/[0.04] cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          borderColor: 'var(--border-app)',
                        }}
                      >
                        {/* Top colored accent line */}
                        <div
                          className={`h-1.5 w-full absolute top-0 left-0 bg-gradient-to-r ${
                            comm.bannerColor || 'from-sky-500 to-indigo-600'
                          }`}
                        />

                        <div className="space-y-3 pt-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-3xl p-2 rounded-2xl bg-white/5 border border-white/10">
                                {comm.iconEmoji}
                              </span>
                              <div className="min-w-0">
                                <h3 className="text-sm font-black text-white group-hover:text-orange-400 transition-colors truncate flex items-center gap-1.5">
                                  <span>{comm.name}</span>
                                  {comm.isVerified && (
                                    <Check size={12} className="text-sky-400 bg-sky-500/20 rounded-full p-0.5" />
                                  )}
                                </h3>
                                <p className="text-[11px] text-slate-400 truncate">
                                  {comm.displayName}
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={(e) => handleToggleJoin(comm, e)}
                              className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                isJoined
                                  ? 'bg-white/10 text-slate-300 hover:bg-red-500/20 hover:text-red-300'
                                  : 'bg-white text-slate-950 hover:bg-slate-200'
                              }`}
                            >
                              {isJoined ? 'Joined' : 'Join'}
                            </button>
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                            {comm.description}
                          </p>
                        </div>

                        <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 mt-3">
                          <span className="flex items-center gap-1">
                            <Users size={12} className="text-slate-500" />
                            <strong className="text-slate-200">{comm.membersCount.toLocaleString()}</strong> members
                          </span>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-white/5 text-slate-400">
                              {comm.category}
                            </span>
                            {canDeleteComm && (
                              communityPendingDelete === comm.communityId ? (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 animate-fade-in"
                                >
                                  <button
                                    onClick={(e) => handleDeleteCommunity(comm, e)}
                                    className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 hover:bg-red-700 text-white"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCommunityPendingDelete(null);
                                    }}
                                    className="px-2 py-0.5 rounded-full text-[10px] bg-white/10 text-slate-300"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCommunityPendingDelete(comm.communityId);
                                  }}
                                  className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors"
                                  title="Delete community"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* 2. SPECIFIC COMMUNITY VIEW (c/name)                            */
          /* ============================================================== */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Community Post Feed (Left 2 Columns) */}
            <div className="lg:col-span-2 space-y-4">
              {/* Community Banner Card */}
              <div
                className="rounded-3xl border overflow-hidden shadow-lg"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-app)',
                }}
              >
                {/* Visual Banner */}
                <div
                  className={`h-28 sm:h-36 w-full bg-gradient-to-r ${selectedCommunity.bannerColor || 'from-sky-600 via-indigo-700 to-slate-900'} relative p-4 flex items-end`}
                >
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10">
                      {selectedCommunity.category}
                    </span>
                  </div>
                </div>

                {/* Community Profile Bar */}
                <div className="p-4 sm:p-6 -mt-10 sm:-mt-12 relative flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                  <div className="flex items-end gap-3.5">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-slate-900 border-4 border-slate-950 flex items-center justify-center text-3xl sm:text-4xl shadow-2xl">
                      {selectedCommunity.iconEmoji}
                    </div>
                    <div className="space-y-0.5 pb-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h2 className="text-lg sm:text-xl font-black text-white">
                          {selectedCommunity.name}
                        </h2>
                        {selectedCommunity.isVerified && (
                          <Check size={14} className="text-sky-400 bg-sky-500/20 rounded-full p-0.5" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        {selectedCommunity.displayName} · {selectedCommunity.membersCount.toLocaleString()} members
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-stretch sm:self-auto">
                    <button
                      onClick={(e) => handleToggleJoin(selectedCommunity, e)}
                      className={`flex-1 sm:flex-initial px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        joinedCommunityIds.includes(selectedCommunity.communityId)
                          ? 'bg-white/10 text-slate-200 hover:bg-red-500/20 hover:text-red-300'
                          : 'bg-white text-slate-950 hover:bg-slate-200 shadow-sm'
                      }`}
                    >
                      {joinedCommunityIds.includes(selectedCommunity.communityId) ? (
                        <>
                          <Check size={14} />
                          <span>Joined</span>
                        </>
                      ) : (
                        <>
                          <Plus size={14} />
                          <span>Join Community</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setShowCreatePostModal(true)}
                      className="flex-1 sm:flex-initial px-4 py-2 rounded-full text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Post</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Filter / Sort Control Bar */}
              <div
                className="p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-3"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-app)',
                }}
              >
                {/* Sort Option: Hot / New / Top */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSortOption('hot')}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      sortOption === 'hot'
                        ? 'bg-orange-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Flame size={13} />
                    <span>Hot</span>
                  </button>

                  <button
                    onClick={() => setSortOption('new')}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      sortOption === 'new'
                        ? 'bg-orange-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Clock size={13} />
                    <span>New</span>
                  </button>

                  <button
                    onClick={() => setSortOption('top')}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      sortOption === 'top'
                        ? 'bg-orange-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Trophy size={13} />
                    <span>Top</span>
                  </button>
                </div>

                {/* Flair filters */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  <button
                    onClick={() => setSelectedFlair(null)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                      selectedFlair === null
                        ? 'bg-white/20 text-white'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    All Flairs
                  </button>
                  {POPULAR_FLAIRS.slice(0, 4).map((f) => (
                    <button
                      key={f.name}
                      onClick={() => setSelectedFlair(selectedFlair === f.name ? null : f.name)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                        selectedFlair === f.name ? f.color + ' ring-1 ring-white/20' : 'bg-white/5 border-transparent text-slate-400 hover:text-white'
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Feed of Community Posts */}
              {loadingPosts ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading discussions...
                </div>
              ) : filteredPosts.length === 0 ? (
                <div
                  className="py-16 px-6 text-center rounded-3xl border space-y-4"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-app)',
                  }}
                >
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center mx-auto text-xl">
                    {selectedCommunity.iconEmoji}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white">No posts in {selectedCommunity.name} yet!</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Be the very first member to kick off a discussion or ask a question in this community.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreatePostModal(true)}
                    className="px-5 py-2 rounded-full text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Create the First Post</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPosts.map((post) => {
                    const hasUpvoted = currentUser ? (post.upvotes || []).includes(currentUser.uid) : false;
                    const hasDownvoted = currentUser ? (post.downvotes || []).includes(currentUser.uid) : false;
                    const canDelete =
                      isNeo ||
                      (currentUser && post.authorId === currentUser.uid) ||
                      selectedCommunity.moderators.includes(userProfile?.username || '');

                    const score = post.score ?? (post.upvotes?.length || 0) - (post.downvotes?.length || 0);

                    return (
                      <article
                        key={post.postId}
                        onClick={() => onOpenPost(post.postId)}
                        className="rounded-2xl border transition-all hover:bg-white/[0.02] cursor-pointer flex overflow-hidden group"
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          borderColor: 'var(--border-app)',
                        }}
                      >
                        {/* Left Upvote/Downvote Column */}
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="w-11 sm:w-12 py-3 px-1 flex flex-col items-center justify-start gap-1 bg-white/[0.02] border-r shrink-0"
                          style={{ borderColor: 'var(--border-app)' }}
                        >
                          <button
                            onClick={() => handleVote(post, 'up')}
                            className={`p-1 rounded-md transition-colors cursor-pointer ${
                              hasUpvoted
                                ? 'text-orange-500 bg-orange-500/10'
                                : 'text-slate-500 hover:text-orange-500 hover:bg-white/5'
                            }`}
                            title="Upvote"
                          >
                            <ArrowBigUp size={22} className={hasUpvoted ? 'fill-orange-500' : ''} />
                          </button>

                          <span
                            className={`text-xs font-black ${
                              hasUpvoted
                                ? 'text-orange-500'
                                : hasDownvoted
                                ? 'text-indigo-400'
                                : 'text-slate-300'
                            }`}
                          >
                            {score}
                          </span>

                          <button
                            onClick={() => handleVote(post, 'down')}
                            className={`p-1 rounded-md transition-colors cursor-pointer ${
                              hasDownvoted
                                ? 'text-indigo-400 bg-indigo-500/10'
                                : 'text-slate-500 hover:text-indigo-400 hover:bg-white/5'
                            }`}
                            title="Downvote"
                          >
                            <ArrowBigDown size={22} className={hasDownvoted ? 'fill-indigo-400' : ''} />
                          </button>
                        </div>

                        {/* Main Post Content */}
                        <div className="flex-1 p-3.5 sm:p-4 min-w-0 space-y-2">
                          {/* Post Meta: Community • Author • Time • Flair */}
                          <div className="flex items-center justify-between text-xs text-slate-400 flex-wrap gap-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-200">{selectedCommunity.name}</span>
                              <span>•</span>
                              <span>Posted by</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenProfile(post.authorUsername);
                                }}
                                className="hover:underline text-slate-300 cursor-pointer flex items-center gap-1 font-semibold"
                              >
                                <span>u/{post.authorUsername}</span>
                                {post.authorRole && (
                                  <UserBadge
                                    username={post.authorUsername}
                                    displayName={post.authorDisplayName}
                                    role={post.authorRole}
                                    size="sm"
                                  />
                                )}
                              </button>
                              <span>•</span>
                              <span className="text-[11px] text-slate-500">
                                {new Date(post.createdAt).toLocaleDateString([], {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>

                            {post.flair && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-white/10 text-orange-300 border border-white/10">
                                {post.flair}
                              </span>
                            )}
                          </div>

                          {/* Post Title */}
                          <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-orange-400 transition-colors leading-snug break-words">
                            {post.title || post.content.slice(0, 80)}
                          </h3>

                          {/* Post Body (if title exists and content has additional body) */}
                          {post.title && post.content && (
                            <p className="text-xs sm:text-sm text-slate-300 whitespace-pre-wrap leading-relaxed line-clamp-3 break-words">
                              {post.content}
                            </p>
                          )}

                          {/* Image Attachment */}
                          {post.imageUrl && (
                            <div
                              className="rounded-2xl overflow-hidden border max-h-96 bg-black/30 my-2"
                              style={{ borderColor: 'var(--border-app)' }}
                            >
                              <img
                                src={post.imageUrl}
                                alt="Post attachment"
                                className="w-full h-auto max-h-96 object-cover"
                              />
                            </div>
                          )}

                          {/* Footer Action Bar */}
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-white/5"
                          >
                            <div className="flex items-center gap-4">
                              <button
                                onClick={() => onOpenPost(post.postId)}
                                className="flex items-center gap-1.5 text-xs hover:text-white transition-colors cursor-pointer py-1"
                              >
                                <MessageSquare size={14} />
                                <span>{post.commentsCount || 0} Comments</span>
                              </button>

                              <button
                                onClick={() => {
                                  navigator.clipboard?.writeText(window.location.href);
                                  showToast('Link copied to clipboard!');
                                }}
                                className="flex items-center gap-1.5 text-xs hover:text-white transition-colors cursor-pointer py-1"
                              >
                                <Share2 size={14} />
                                <span>Share</span>
                              </button>
                            </div>

                            {/* Author / Mod Deletion */}
                            {canDelete && (
                              commentPendingDelete === post.postId ? (
                                <div className="flex items-center gap-1.5 animate-fade-in">
                                  <span className="text-[11px] text-red-400 font-bold">Delete?</span>
                                  <button
                                    onClick={() => handleDeletePost(post.postId)}
                                    className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setCommentPendingDelete(null)}
                                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-slate-400 hover:text-white bg-white/5 transition-colors cursor-pointer"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setCommentPendingDelete(post.postId)}
                                  className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                                  title="Delete post"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Sidebar: About Community & Rules */}
            <div className="space-y-4">
              {/* About Community Box */}
              <div
                className="p-5 rounded-3xl border shadow-lg space-y-4"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-app)',
                }}
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    About Community
                  </h3>
                  <span className="text-base">{selectedCommunity.iconEmoji}</span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedCommunity.description}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 py-2 border-y border-white/5 text-center">
                  <div>
                    <div className="text-base font-black text-white">
                      {selectedCommunity.membersCount.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Members</div>
                  </div>
                  <div>
                    <div className="text-base font-black text-emerald-400 flex items-center justify-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{Math.max(4, Math.floor(selectedCommunity.membersCount * 0.04))}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Active Now</div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="space-y-2 pt-1">
                  <button
                    onClick={() => setShowCreatePostModal(true)}
                    className="w-full py-2.5 rounded-full text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white transition-all shadow-md cursor-pointer"
                  >
                    Create Post in {selectedCommunity.name}
                  </button>

                  <button
                    onClick={(e) => handleToggleJoin(selectedCommunity, e)}
                    className={`w-full py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                      joinedCommunityIds.includes(selectedCommunity.communityId)
                        ? 'bg-white/5 text-slate-300 hover:bg-white/10'
                        : 'bg-white text-slate-950 font-bold hover:bg-slate-200'
                    }`}
                  >
                    {joinedCommunityIds.includes(selectedCommunity.communityId) ? 'Joined Community' : 'Join Community'}
                  </button>

                  {(isNeo || isModOrAdmin || (currentUser && selectedCommunity.creatorId === currentUser.uid)) && (
                    <div className="pt-2 border-t border-white/5">
                      {communityPendingDelete === selectedCommunity.communityId ? (
                        <div className="space-y-1.5 p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-center animate-fade-in">
                          <p className="text-[11px] text-red-300 font-bold">Permanently delete this community?</p>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => handleDeleteCommunity(selectedCommunity, e)}
                              className="px-3 py-1 rounded-full text-xs font-bold bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                            >
                              Yes, Delete
                            </button>
                            <button
                              onClick={() => setCommunityPendingDelete(null)}
                              className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-300 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setCommunityPendingDelete(selectedCommunity.communityId)}
                          className="w-full py-2 rounded-full text-xs font-semibold text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 size={13} />
                          <span>Delete Community</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Community Rules Box */}
              <div
                className="p-5 rounded-3xl border shadow-lg space-y-3"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-app)',
                }}
              >
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Shield size={14} className="text-orange-400" />
                  <span>{selectedCommunity.name} Rules</span>
                </h3>

                <div className="space-y-1.5">
                  {selectedCommunity.rules.map((rule, idx) => (
                    <div
                      key={idx}
                      onClick={() => setExpandedRule(expandedRule === idx ? null : idx)}
                      className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors cursor-pointer space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between font-semibold text-slate-200">
                        <span className="truncate">{rule}</span>
                        <ChevronDown
                          size={13}
                          className={`text-slate-400 transition-transform ${
                            expandedRule === idx ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                      {expandedRule === idx && (
                        <p className="text-[11px] text-slate-400 pt-1 leading-relaxed border-t border-white/5">
                          Violations of this rule can lead to post removal or restrictions within {selectedCommunity.name}.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Moderators Box */}
              <div
                className="p-5 rounded-3xl border shadow-lg space-y-3 text-xs"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-app)',
                }}
              >
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Users size={14} className="text-sky-400" />
                  <span>Moderators</span>
                </h3>

                <div className="space-y-2">
                  {selectedCommunity.moderators.map((modUsername) => (
                    <div
                      key={modUsername}
                      onClick={() => onOpenProfile(modUsername)}
                      className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <span className="font-semibold text-slate-200">u/{modUsername}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300">
                        Mod
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 3. CREATE COMMUNITY MODAL                                      */}
      {/* ============================================================== */}
      {showCreateCommunityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div
            className="w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden p-6 space-y-5 animate-fade-in"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-app)',
            }}
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🪐</span>
                <h2 className="text-lg font-black text-white">Create a Community</h2>
              </div>
              <button
                onClick={() => setShowCreateCommunityModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCommunitySubmit} className="space-y-4">
              {/* Name (c/slug) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  Community Handle <span className="text-orange-400">*</span>
                </label>
                <div className="flex items-center rounded-xl bg-white/5 border border-white/10 px-3 py-2 focus-within:border-orange-500">
                  <span className="text-xs font-bold text-orange-400 mr-1">c/</span>
                  <input
                    type="text"
                    required
                    value={newCommName}
                    onChange={(e) => setNewCommName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="e.g. artificial_intelligence, retro_gaming"
                    className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                    maxLength={30}
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  Community handles cannot be changed later. Letters, numbers, and underscores only.
                </p>
              </div>

              {/* Display Title */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  Display Title <span className="text-orange-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCommTitle}
                  onChange={(e) => setNewCommTitle(e.target.value)}
                  placeholder="e.g. Artificial Intelligence & Machine Learning"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  maxLength={60}
                />
              </div>

              {/* Category & Emoji */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Category</label>
                  <select
                    value={newCommCategory}
                    onChange={(e) => setNewCommCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white focus:outline-none focus:border-orange-500"
                  >
                    {COMMUNITY_CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                      <option key={cat} value={cat} className="bg-slate-900 text-white">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Community Icon Emoji</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newCommEmoji}
                      onChange={(e) => setNewCommEmoji(e.target.value.slice(-2))}
                      className="w-12 text-center py-1.5 rounded-xl text-lg bg-white/5 border border-white/10 text-white focus:outline-none"
                      maxLength={2}
                    />
                    <div className="flex items-center gap-1 text-sm overflow-x-auto">
                      {['💻', '🎮', '🚀', '🤖', '🎨', '🔥', '💡', '🎵'].map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setNewCommEmoji(em)}
                          className="p-1 hover:scale-110 transition-transform cursor-pointer"
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Description</label>
                <textarea
                  rows={3}
                  value={newCommDesc}
                  onChange={(e) => setNewCommDesc(e.target.value)}
                  placeholder="Tell people what this community is all about..."
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none"
                  maxLength={500}
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowCreateCommunityModal(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingCommunity}
                  className="px-5 py-2 rounded-full text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-md disabled:opacity-40 cursor-pointer"
                >
                  {creatingCommunity ? 'Creating...' : 'Create Community'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. CREATE COMMUNITY POST MODAL                                 */}
      {/* ============================================================== */}
      {showCreatePostModal && selectedCommunity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div
            className="w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden p-6 space-y-4 animate-fade-in"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-app)',
            }}
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{selectedCommunity.iconEmoji}</span>
                <div>
                  <h2 className="text-base font-black text-white">Create a Post in {selectedCommunity.name}</h2>
                  <p className="text-[11px] text-slate-400">{selectedCommunity.displayName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreatePostModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePostSubmit} className="space-y-4">
              {/* Flair selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Select Post Flair</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {POPULAR_FLAIRS.map((f) => (
                    <button
                      key={f.name}
                      type="button"
                      onClick={() => setNewPostFlair(f.name)}
                      className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                        newPostFlair === f.name
                          ? f.color + ' ring-2 ring-white/20'
                          : 'bg-white/5 border-transparent text-slate-400 hover:text-white'
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  Post Title <span className="text-orange-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  placeholder="An interesting, descriptive title..."
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  maxLength={150}
                />
              </div>

              {/* Content / Body */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Post Text (Optional)</label>
                <textarea
                  rows={4}
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Share details, context, link explanations, or questions..."
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none leading-relaxed"
                  maxLength={4000}
                />
              </div>

              {/* Image attachment */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-sky-400" />
                  <span>Attach Image</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    if (e.target.files?.[0]) {
                      try {
                        const compressed = await compressImage(e.target.files[0], 1200, 1200, 0.75);
                        setNewPostImage(compressed);
                      } catch {
                        showToast('Failed to load image');
                      }
                    }
                  }}
                  className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20"
                />
                {newPostImage && (
                  <div className="relative rounded-xl overflow-hidden border border-white/10 max-h-40 bg-black/40">
                    <img src={newPostImage} alt="Preview" className="w-full h-40 object-cover" />
                    <button
                      type="button"
                      onClick={() => setNewPostImage(null)}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowCreatePostModal(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPost || !newPostTitle.trim()}
                  className="px-5 py-2 rounded-full text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-md disabled:opacity-40 cursor-pointer"
                >
                  {submittingPost ? 'Posting...' : 'Post to Community'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Universal In-app Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl border border-orange-500/40 text-xs shadow-2xl animate-fade-in flex items-center gap-2">
          <Info size={14} className="text-orange-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
