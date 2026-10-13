import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  getDocs
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth, ADMIN_EMAIL } from '../context/AuthContext';
import { Post, Chatroom, UserProfile, PostComment } from '../types';
import { UserBadge, GoldenVerifiedCheckmark } from './UserBadge';
import { compressImage } from '../utils/imageCompressor';
import {
  Image as ImageIcon,
  Heart,
  MessageCircle,
  Trash2,
  X,
  Send,
  Sparkles,
  TrendingUp,
  Search,
  Lock,
  Hash,
  Share2,
  Users,
  Repeat,
  Bookmark,
  MapPin,
  Grid,
  LayoutList,
  Film,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Maximize2
} from 'lucide-react';
import { TwitterPostComposer } from './TwitterPostComposer';
import { PollWidget } from './PollWidget';

interface TwitterHomeFeedProps {
  onOpenProfile: (username: string) => void;
  onOpenPost: (postId: string) => void;
  onSelectRoom: (room: Chatroom) => void;
  chatrooms: Chatroom[];
}

export const TwitterHomeFeed: React.FC<TwitterHomeFeedProps> = ({
  onOpenProfile,
  onOpenPost,
  onSelectRoom,
  chatrooms,
}) => {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'forYou' | 'following' | 'media'>('forYou');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [mediaLayout, setMediaLayout] = useState<'grid' | 'feed'>('grid');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'photos' | 'gifs'>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // New post state
  const [postText, setPostText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [submittingPost, setSubmittingPost] = useState(false);
  const [postError, setPostError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Comments state
  const [activeCommentPost, setActiveCommentPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Recommended users to follow
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [searchFilter, setSearchFilter] = useState('');

  // Toast
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Real-time listener for posts
  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const pList: Post[] = [];
        snapshot.forEach((d) => {
          pList.push({ postId: d.id, ...d.data() } as Post);
        });
        setPosts(pList);
        setLoadingPosts(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'posts');
        setLoadingPosts(false);
      }
    );
    return () => unsub();
  }, []);

  // Comments listener
  useEffect(() => {
    if (!activeCommentPost) {
      setComments([]);
      return;
    }
    const commentsRef = collection(db, 'posts', activeCommentPost.postId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const cList: PostComment[] = [];
      snapshot.forEach((d) => {
        cList.push({ commentId: d.id, ...d.data() } as PostComment);
      });
      setComments(cList);
    });
    return () => unsub();
  }, [activeCommentPost?.postId]);

  // Load suggested users for Who to follow
  useEffect(() => {
    async function loadSuggested() {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const list: UserProfile[] = [];
        snap.forEach((d) => {
          const u = d.data() as UserProfile;
          if (u.userId !== currentUser?.uid && !u.isDeactivated && !u.isBanned) {
            list.push({ ...u, userId: d.id });
          }
        });
        setSuggestedUsers(list.slice(0, 4));
      } catch (err) {
        console.error('Error fetching suggested users:', err);
      }
    }
    loadSuggested();
  }, [currentUser?.uid]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    try {
      const compressed = await compressImage(e.target.files[0], 900, 900, 0.75);
      setAttachedImage(compressed);
    } catch {
      alert('Failed to process image');
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile) return;
    if (!postText.trim() && !attachedImage) return;

    if (userProfile.isSuspended) {
      setPostError('Your account is currently suspended and cannot create posts.');
      return;
    }

    setSubmittingPost(true);
    setPostError('');

    try {
      await addDoc(collection(db, 'posts'), {
        authorId: currentUser.uid,
        authorUsername: userProfile.username,
        authorDisplayName: userProfile.displayName,
        authorPhotoURL: userProfile.photoURL || '',
        authorRole: userProfile.role || 'user',
        content: postText.trim(),
        imageUrl: attachedImage || null,
        likes: [],
        likesCount: 0,
        commentsCount: 0,
        createdAt: new Date().toISOString(),
      });

      setPostText('');
      setAttachedImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'posts');
      setPostError('Failed to share post. Please try again.');
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleToggleLike = async (post: Post) => {
    if (!currentUser) return;
    if (userProfile?.isSuspended) {
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
        // Decrement author's total likes
        if (post.authorId) {
          await updateDoc(doc(db, 'users', post.authorId), {
            likesCount: increment(-1),
          });
        }
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(currentUser.uid),
          likesCount: increment(1),
        });
        // Increment author's total likes
        if (post.authorId) {
          await updateDoc(doc(db, 'users', post.authorId), {
            likesCount: increment(1),
          });
        }
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
      if (activeCommentPost?.postId === postId) {
        setActiveCommentPost(null);
      }
      showToast('Post deleted');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `posts/${postId}`);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCommentPost || !newCommentText.trim() || !userProfile || !currentUser) return;

    if (userProfile.isSuspended) {
      alert('Your account is currently suspended and cannot comment.');
      return;
    }

    setSubmittingComment(true);
    try {
      await addDoc(collection(db, 'posts', activeCommentPost.postId, 'comments'), {
        authorId: currentUser.uid,
        authorUsername: userProfile.username,
        authorDisplayName: userProfile.displayName,
        authorPhotoURL: userProfile.photoURL || '',
        authorRole: userProfile.role || 'user',
        content: newCommentText.trim(),
        createdAt: new Date().toISOString(),
      });

      await updateDoc(doc(db, 'posts', activeCommentPost.postId), {
        commentsCount: increment(1),
      });

      setNewCommentText('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `posts/${activeCommentPost.postId}/comments`);
    } finally {
      setSubmittingComment(false);
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
      if (diffSec < 60) return 'just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  // Media posts calculations for media switcher
  const mediaPosts = useMemo(() => {
    return posts.filter((p) => Boolean(p.imageUrl || p.gifUrl));
  }, [posts]);

  const filteredMediaPosts = useMemo(() => {
    let list = mediaPosts;
    if (mediaFilter === 'photos') list = list.filter((p) => Boolean(p.imageUrl));
    if (mediaFilter === 'gifs') list = list.filter((p) => Boolean(p.gifUrl));
    if (searchFilter.trim()) {
      const term = searchFilter.toLowerCase();
      list = list.filter(
        (p) =>
          p.content.toLowerCase().includes(term) ||
          p.authorUsername.toLowerCase().includes(term) ||
          p.authorDisplayName.toLowerCase().includes(term)
      );
    }
    return list;
  }, [mediaPosts, mediaFilter, searchFilter]);

  const allMediaItems = useMemo(() => {
    const source = activeTab === 'media' && mediaFilter !== 'all' ? filteredMediaPosts : mediaPosts;
    return source.map((p) => ({
      url: (p.imageUrl || p.gifUrl || '') as string,
      type: p.gifUrl ? ('gif' as const) : ('photo' as const),
      post: p,
    }));
  }, [activeTab, mediaFilter, filteredMediaPosts, mediaPosts]);

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

  // Keyboard navigation for Lightbox Media Switcher
  useEffect(() => {
    if (lightboxIndex === null || allMediaItems.length === 0) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : allMediaItems.length - 1));
      }
      if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev !== null && prev < allMediaItems.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, allMediaItems.length]);

  // Filter posts
  const filteredPosts = posts.filter((p) => {
    // If Media tab is selected, only show posts containing an image or GIF
    if (activeTab === 'media') {
      if (!p.imageUrl && !p.gifUrl) return false;
      if (mediaFilter === 'photos' && !p.imageUrl) return false;
      if (mediaFilter === 'gifs' && !p.gifUrl) return false;
    }

    // If Following tab is selected, only show posts from followed users or self
    if (activeTab === 'following') {
      const isFollowed = userProfile?.followingUserIds?.includes(p.authorId) || p.authorId === currentUser?.uid;
      if (!isFollowed) return false;
    }

    if (searchFilter.trim()) {
      const term = searchFilter.toLowerCase();
      return (
        p.content.toLowerCase().includes(term) ||
        p.authorUsername.toLowerCase().includes(term) ||
        p.authorDisplayName.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="flex-1 flex overflow-hidden h-full w-full">
      {/* Center Feed Column (Expands to fill screen width & height) */}
      <div
        className="flex-1 w-full border-r overflow-y-auto flex flex-col h-full"
        style={{ borderColor: 'var(--border-app)' }}
      >
        {/* Sticky Top Header with Tabs */}
        <div
          className="sticky top-0 z-20 backdrop-blur-md border-b flex flex-col shrink-0"
          style={{
            borderColor: 'var(--border-app)',
            backgroundColor: 'rgba(9, 14, 23, 0.85)',
          }}
        >
          <div className="px-4 py-3 flex items-center justify-between">
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              <span>Home</span>
              <Sparkles size={16} className="text-sky-400" />
            </h1>
          </div>

          <div className="flex border-t" style={{ borderColor: 'var(--border-app)' }}>
            <button
              onClick={() => setActiveTab('forYou')}
              className={`flex-1 py-3 text-xs font-bold text-center transition-all relative ${
                activeTab === 'forYou' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              For you
              {activeTab === 'forYou' && (
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 rounded-full"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab('following')}
              className={`flex-1 py-3 text-xs font-bold text-center transition-all relative ${
                activeTab === 'following' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Following
              {activeTab === 'following' && (
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 rounded-full"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab('media')}
              className={`flex-1 py-3 text-xs font-bold text-center transition-all relative ${
                activeTab === 'media' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Media
              {activeTab === 'media' && (
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 rounded-full"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                />
              )}
            </button>
          </div>

          {/* Media Switcher Toolbar when Media tab is active */}
          {activeTab === 'media' && (
            <div
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-black/40 border-t backdrop-blur-md shrink-0"
              style={{ borderColor: 'var(--border-app)' }}
            >
              {/* Filter buttons */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
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
              <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
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
          )}
        </div>

        {/* Compose Tweet / Post Box with full Twitter Options */}
        {activeTab !== 'media' && (
          <TwitterPostComposer
            onPostCreated={async (data) => {
              if (!currentUser || !userProfile) return;
              await addDoc(collection(db, 'posts'), {
                authorId: currentUser.uid,
                authorUsername: userProfile.username,
                authorDisplayName: userProfile.displayName || userProfile.username,
                authorPhotoURL: userProfile.photoURL || '',
                authorRole: userProfile.role || 'user',
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
              showToast('Your post was sent!');
            }}
          />
        )}

        {/* Posts Feed */}
        <div className="flex-1 divide-y" style={{ borderColor: 'var(--border-app)' }}>
          {loadingPosts ? (
            <div className="p-8 flex items-center justify-center text-slate-400">
              <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeTab === 'media' && mediaLayout === 'grid' ? (
            filteredMediaPosts.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto text-slate-400">
                  <ImageIcon size={24} />
                </div>
                <h3 className="text-base font-bold text-white">No media found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {mediaFilter === 'photos'
                    ? 'No photos have been uploaded yet.'
                    : mediaFilter === 'gifs'
                    ? 'No GIFs have been posted yet.'
                    : 'When users post photos or GIFs, they will show up here in the media switcher.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 sm:p-4">
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
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2.5 sm:p-3">
                        {post.content && (
                          <p className="text-[11px] text-white line-clamp-2 mb-1.5 font-medium leading-snug">
                            {post.content}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-slate-200 font-semibold">
                          <span className="flex items-center gap-1">
                            <Heart
                              size={13}
                              className={
                                post.likes?.includes(currentUser?.uid || '')
                                  ? 'fill-pink-500 text-pink-500'
                                  : 'text-slate-300'
                              }
                            />
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
            )
          ) : filteredPosts.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto text-slate-400">
                <Sparkles size={24} />
              </div>
              <h3 className="text-base font-bold text-white">No posts yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Be the first to post something to Chatter! You can share your thoughts or upload photos.
              </p>
            </div>
          ) : (
            filteredPosts.map((post) => {
              const isLiked = currentUser ? post.likes?.includes(currentUser.uid) : false;
              const canDelete = isAdmin || currentUser?.uid === post.authorId;

              return (
                <article
                  key={post.postId}
                  className="p-4 transition-colors hover:bg-white/[0.02]"
                >
                  <div className="flex gap-3">
                    <button
                      onClick={() => onOpenProfile(post.authorUsername)}
                      className="shrink-0"
                    >
                      <img
                        src={post.authorPhotoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                        alt={post.authorUsername}
                        className="w-10 h-10 rounded-full object-cover hover:opacity-90 transition-opacity"
                      />
                    </button>

                    <div className="flex-1 min-w-0">
                      {/* Author Header */}
                      {/* Top Row: Community Badge, Author Name, Handle, Timestamp */}
                      {post.communityName && (
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-[11px] font-bold text-orange-400 bg-orange-500/15 border border-orange-500/30 px-2.5 py-0.5 rounded-full">
                            {post.communityName}
                          </span>
                          {post.flair && (
                            <span className="text-[10px] font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md">
                              {post.flair}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => onOpenProfile(post.authorUsername)}
                            className="hover:underline flex items-center gap-1"
                          >
                            <UserBadge
                              username={post.authorUsername}
                              displayName={post.authorDisplayName || post.authorUsername}
                              role={post.authorRole}
                              size="sm"
                            />
                          </button>
                          <span className="text-slate-400 text-xs">@{post.authorUsername}</span>
                          <span className="text-slate-500 text-xs">·</span>
                          <span className="text-slate-500 text-xs">{formatTimestamp(post.createdAt)}</span>
                        </div>

                        {canDelete && (
                          <button
                            onClick={() => handleDeletePost(post.postId, post.authorId)}
                            className="p-1 rounded-full text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Delete post"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      {/* Post Title if Community Post */}
                      {post.title && (
                        <h3
                          onClick={() => onOpenPost(post.postId)}
                          className="text-sm sm:text-base font-bold text-white mb-1.5 cursor-pointer hover:text-orange-400 transition-colors"
                        >
                          {post.title}
                        </h3>
                      )}

                      {/* Post Content: Clicking opens separate post page */}
                      <p
                        onClick={() => onOpenPost(post.postId)}
                        className="text-xs sm:text-sm text-slate-100 whitespace-pre-wrap leading-relaxed mb-2.5 cursor-pointer hover:text-white"
                      >
                        {post.content}
                      </p>

                      {/* Poll Component if exists */}
                      {post.poll && <PollWidget post={post} />}

                      {/* Image Attachment */}
                      {post.imageUrl && (
                        <div
                          onClick={() => handleOpenMedia(post.imageUrl!, post)}
                          className="rounded-2xl overflow-hidden border mb-3 max-h-96 bg-black/20 cursor-pointer relative group/mediaImg"
                          style={{ borderColor: 'var(--border-app)' }}
                        >
                          <img
                            src={post.imageUrl}
                            alt="Post attachment"
                            className="w-full h-auto max-h-96 object-cover hover:scale-[1.01] transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover/mediaImg:bg-black/25 transition-colors flex items-center justify-center opacity-0 group-hover/mediaImg:opacity-100">
                            <span className="p-2 rounded-full bg-black/70 text-white backdrop-blur-sm">
                              <Maximize2 size={16} />
                            </span>
                          </div>
                        </div>
                      )}

                      {/* GIF Attachment */}
                      {post.gifUrl && (
                        <div
                          onClick={() => handleOpenMedia(post.gifUrl!, post)}
                          className="rounded-2xl overflow-hidden border mb-3 max-h-96 bg-black/20 cursor-pointer relative group/mediaImg"
                          style={{ borderColor: 'var(--border-app)' }}
                        >
                          <img
                            src={post.gifUrl}
                            alt="GIF"
                            className="w-full h-auto max-h-96 object-cover hover:scale-[1.01] transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover/mediaImg:bg-black/25 transition-colors flex items-center justify-center opacity-0 group-hover/mediaImg:opacity-100">
                            <span className="p-2 rounded-full bg-black/70 text-white backdrop-blur-sm">
                              <Maximize2 size={16} />
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Location Tag */}
                      {post.location && (
                        <div className="flex items-center gap-1.5 text-xs text-sky-400 mb-2">
                          <MapPin size={12} />
                          <span>{post.location}</span>
                        </div>
                      )}

                      {/* Action Bar (Authentic Twitter Action Row) */}
                      <div className="flex items-center justify-between text-slate-400 max-w-md pt-1">
                        {/* Reply / Comment: opens separate post page */}
                        <button
                          onClick={() => onOpenPost(post.postId)}
                          className="flex items-center gap-1.5 text-xs hover:text-sky-400 transition-colors group cursor-pointer"
                          title="Reply"
                        >
                          <div className="p-2 rounded-full group-hover:bg-sky-400/10">
                            <MessageCircle size={15} />
                          </div>
                          <span>{post.commentsCount || 0}</span>
                        </button>

                        {/* Repost / Retweet */}
                        <button
                          onClick={() => {
                            showToast('Reposted to your feed!');
                          }}
                          className="flex items-center gap-1.5 text-xs hover:text-emerald-400 transition-colors group cursor-pointer"
                          title="Repost"
                        >
                          <div className="p-2 rounded-full group-hover:bg-emerald-500/10">
                            <Repeat size={15} />
                          </div>
                        </button>

                        {/* Like */}
                        <button
                          onClick={() => handleToggleLike(post)}
                          className={`flex items-center gap-1.5 text-xs transition-colors group cursor-pointer ${
                            isLiked ? 'text-pink-500 font-semibold' : 'hover:text-pink-400'
                          }`}
                          title="Like"
                        >
                          <div className="p-2 rounded-full group-hover:bg-pink-500/10">
                            <Heart size={15} className={isLiked ? 'fill-pink-500' : ''} />
                          </div>
                          <span>{post.likesCount || 0}</span>
                        </button>

                        {/* Bookmark */}
                        <button
                          onClick={() => {
                            showToast('Post bookmarked!');
                          }}
                          className="flex items-center gap-1.5 text-xs hover:text-sky-400 transition-colors group cursor-pointer"
                          title="Bookmark"
                        >
                          <div className="p-2 rounded-full group-hover:bg-sky-400/10">
                            <Bookmark size={15} />
                          </div>
                        </button>

                        {/* Share */}
                        <button
                          onClick={() => {
                            navigator.clipboard?.writeText(window.location.href);
                            showToast('Link copied to clipboard!');
                          }}
                          className="flex items-center gap-1.5 text-xs hover:text-sky-400 transition-colors group cursor-pointer"
                          title="Share"
                        >
                          <div className="p-2 rounded-full group-hover:bg-sky-400/10">
                            <Share2 size={15} />
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Search, Trending & Who to follow */}
      <div className="hidden lg:flex flex-col w-80 p-4 space-y-4 overflow-y-auto shrink-0">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search Chatter..."
            className="w-full text-xs pl-9 pr-3 py-2.5 rounded-full bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition-colors"
          />
        </div>

        {/* Live Chatrooms Widget */}
        <div
          className="rounded-3xl p-4 border space-y-3"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-app)',
          }}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
              <Users size={15} className="text-sky-400" />
              <span>Chatrooms</span>
            </h3>
            <span className="text-[10px] text-slate-400">{chatrooms.length} active</span>
          </div>

          <div className="space-y-1.5">
            {chatrooms.slice(0, 4).map((room) => (
              <button
                key={room.roomId}
                onClick={() => onSelectRoom(room)}
                className="w-full text-left p-2.5 rounded-2xl hover:bg-white/5 flex items-center justify-between transition-colors border border-transparent hover:border-white/5"
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold text-slate-300">
                    {room.icon || '#'}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-white truncate">#{room.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{room.description || 'Open chat'}</p>
                  </div>
                </div>

                {room.isLocked && (
                  <Lock size={12} className="text-amber-400 shrink-0 ml-2" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Who to follow */}
        {suggestedUsers.length > 0 && (
          <div
            className="rounded-3xl p-4 border space-y-3"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-app)',
            }}
          >
            <h3 className="font-extrabold text-sm text-white">Who to follow</h3>

            <div className="space-y-2">
              {suggestedUsers.map((user) => (
                <div key={user.userId} className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => onOpenProfile(user.username)}
                    className="flex items-center gap-2 truncate text-left"
                  >
                    <img
                      src={user.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                      alt={user.username}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="truncate">
                      <UserBadge
                        username={user.username}
                        displayName={user.displayName || user.username}
                        role={user.role}
                        size="sm"
                      />
                      <p className="text-[10px] text-slate-400 truncate">@{user.username}</p>
                    </div>
                  </button>

                  <button
                    onClick={() => onOpenProfile(user.username)}
                    className="px-3 py-1 rounded-full text-[11px] font-bold bg-white text-slate-950 hover:bg-slate-200 transition-colors shrink-0"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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
                    onOpenPost(post.postId);
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
                    className={`relative shrink-0 w-12 h-12 rounded-lg overflow-hidden border transition-all cursor-pointer ${
                      lightboxIndex === idx
                        ? 'border-sky-400 ring-2 ring-sky-400/50 scale-105'
                        : 'border-white/20 opacity-60 hover:opacity-100'
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

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl border border-sky-400/40 text-xs shadow-2xl animate-fade-in">
          {toastMessage}
        </div>
      )}
    </div>
  );
};
