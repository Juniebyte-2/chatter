import React, { useState, useEffect, useRef } from 'react';
import { Post, Comment, UserProfile, PostPoll } from '../types';
import { useAuth, ADMIN_UID, ADMIN_EMAIL } from '../context/AuthContext';
import { UserBadge } from './UserBadge';
import { PollWidget } from './PollWidget';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  increment,
  arrayUnion,
  arrayRemove,
  getDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  ArrowLeft,
  MessageCircle,
  Heart,
  Repeat,
  Share2,
  Bookmark,
  Image as ImageIcon,
  Trash2,
  Smile,
  BarChart2,
  MapPin,
  X,
  Sparkles,
  Clapperboard,
  Send,
  Maximize2,
  ExternalLink
} from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';

interface TwitterPostDetailPageProps {
  postId: string;
  onBack: () => void;
  onOpenProfile: (username: string) => void;
}

const SAMPLE_GIFS = [
  { title: 'Neo Matrix', url: 'https://media.giphy.com/media/A06UFEx8jxEwU/giphy.gif' },
  { title: 'Mind Blown', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
  { title: 'Applause', url: 'https://media.giphy.com/media/7rj2ZgttvgomY/giphy.gif' },
  { title: 'Dance Party', url: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif' },
  { title: 'Celebration', url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif' },
  { title: 'Popcorn', url: 'https://media.giphy.com/media/t3dLl0TGHCxTG/giphy.gif' },
];

const POPULAR_EMOJIS = ['🔥', '🚀', '❤️', '😂', '👏', '✨', '💯', '👍', '💀', '😎', '🎉', '💎', '⚡', '🤯', '🙌', '👀'];

export const TwitterPostDetailPage: React.FC<TwitterPostDetailPageProps> = ({
  postId,
  onBack,
  onOpenProfile,
}) => {
  const { currentUser, userProfile, isAdmin, isModOrAdmin } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loadingPost, setLoadingPost] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);

  // Reply Composer State
  const [replyText, setReplyText] = useState('');
  const [replyImage, setReplyImage] = useState<string | null>(null);
  const [replyGif, setReplyGif] = useState<string | null>(null);
  const [replyLocation, setReplyLocation] = useState<string | null>(null);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [customLocationText, setCustomLocationText] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [commentPendingDelete, setCommentPendingDelete] = useState<string | null>(null);
  const [postPendingDelete, setPostPendingDelete] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showMediaLightbox, setShowMediaLightbox] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const isNeo =
    Boolean(isAdmin) ||
    Boolean(isModOrAdmin) ||
    currentUser?.uid === ADMIN_UID ||
    userProfile?.username?.toLowerCase() === 'a321-251n' ||
    userProfile?.displayName?.toLowerCase() === 'neo' ||
    userProfile?.username?.toLowerCase() === 'neo' ||
    userProfile?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const isMod =
    Boolean(isModOrAdmin) ||
    userProfile?.role === 'mod' ||
    userProfile?.role === 'admin';

  const canDeleteAnyComment = isNeo || isMod;

  // Real-time listener for the Post document
  useEffect(() => {
    const postRef = doc(db, 'posts', postId);
    const unsub = onSnapshot(
      postRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setPost({ postId: snapshot.id, ...snapshot.data() } as Post);
        } else {
          setPost(null);
        }
        setLoadingPost(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `posts/${postId}`);
        setLoadingPost(false);
      }
    );

    return () => unsub();
  }, [postId]);

  // Real-time listener for comments on this post
  useEffect(() => {
    const commentsRef = collection(db, 'posts', postId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: Comment[] = [];
        snapshot.forEach((d) => {
          list.push({ commentId: d.id, ...d.data() } as Comment);
        });
        setComments(list);
        setLoadingComments(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `posts/${postId}/comments`);
        setLoadingComments(false);
      }
    );

    return () => unsub();
  }, [postId]);

  // Toggle Like on the main post
  const handleToggleLikePost = async () => {
    if (!currentUser || !post) return;
    if (userProfile?.isSuspended) {
      alert('Your account is currently suspended.');
      return;
    }

    const hasLiked = post.likes?.includes(currentUser.uid);
    const postRef = doc(db, 'posts', post.postId);

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

  // Delete main post (author, mod, or Neo)
  const handleDeletePost = async () => {
    if (!post || !currentUser) return;
    const canDelete = isNeo || isMod || post.authorId === currentUser.uid;
    if (!canDelete) return;

    try {
      await deleteDoc(doc(db, 'posts', post.postId));
      onBack();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `posts/${post.postId}`);
    }
  };

  // Delete a comment (author, ANY mod, or Neo account)
  const handleDeleteComment = async (commentId: string) => {
    if (!currentUser) return;

    // Immediately remove optimistically from local state for ultra-responsive UI
    setComments((prev) => prev.filter((c) => c.commentId !== commentId));
    setPost((prev) =>
      prev ? { ...prev, commentsCount: Math.max(0, (prev.commentsCount || 1) - 1) } : null
    );
    setCommentPendingDelete(null);

    try {
      await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
      await updateDoc(doc(db, 'posts', postId), {
        commentsCount: increment(-1),
      });
      showToast('Comment deleted');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `posts/${postId}/comments/${commentId}`);
    }
  };

  // Toggle like on a comment
  const handleToggleLikeComment = async (comment: Comment) => {
    if (!currentUser) return;
    if (userProfile?.isSuspended) {
      alert('Your account is currently suspended.');
      return;
    }

    const hasLiked = comment.likes?.includes(currentUser.uid);
    const commentRef = doc(db, 'posts', postId, 'comments', comment.commentId);

    try {
      if (hasLiked) {
        await updateDoc(commentRef, {
          likes: arrayRemove(currentUser.uid),
          likesCount: increment(-1),
        });
      } else {
        await updateDoc(commentRef, {
          likes: arrayUnion(currentUser.uid),
          likesCount: increment(1),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${postId}/comments/${comment.commentId}`);
    }
  };

  // Submit reply
  const handleSubmitReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser || !userProfile || !post) return;
    if (userProfile.isSuspended) {
      alert('Your account is currently suspended and cannot comment.');
      return;
    }
    if (!replyText.trim() && !replyImage && !replyGif) return;

    setSubmittingReply(true);
    const content = replyText.trim();
    const image = replyImage;
    const gif = replyGif;

    setReplyText('');
    setReplyImage(null);
    setReplyGif(null);
    setReplyLocation(null);
    setShowGifPicker(false);
    setShowEmojiPicker(false);
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      await addDoc(collection(db, 'posts', post.postId, 'comments'), {
        authorId: currentUser.uid,
        authorUsername: userProfile.username,
        authorDisplayName: userProfile.displayName || userProfile.username,
        authorPhotoURL: userProfile.photoURL || '',
        authorRole: userProfile.role || 'user',
        authorIsVerified: Boolean(userProfile.isVerified),
        content,
        imageUrl: image || gif || null,
        likes: [],
        likesCount: 0,
        createdAt: new Date().toISOString(),
      });

      await updateDoc(doc(db, 'posts', post.postId), {
        commentsCount: increment(1),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `posts/${post.postId}/comments`);
    } finally {
      setSubmittingReply(false);
    }
  };

  // Image select handler
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    try {
      const comp = await compressImage(e.target.files[0], 900, 900, 0.75);
      setReplyImage(comp);
      setReplyGif(null);
    } catch {
      alert('Failed to process image');
    }
  };

  // Format relative timestamp for replies (e.g. 2m, 1h, Sep 30)
  const formatReplyTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const diffMs = Date.now() - d.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return `${Math.max(1, diffSecs)}s`;
      if (diffMins < 60) return `${diffMins}m`;
      if (diffHours < 24) return `${diffHours}h`;
      if (diffDays < 7) return `${diffDays}d`;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  if (loadingPost) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-400">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex-1 p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Post Not Found</h2>
        <p className="text-xs text-slate-400">This post may have been deleted or does not exist.</p>
        <button
          onClick={onBack}
          className="px-5 py-2 rounded-full text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
        >
          Go Back
        </button>
      </div>
    );
  }

  const isPostLiked = currentUser ? post.likes?.includes(currentUser.uid) : false;
  const canDeletePost = isNeo || isMod || (currentUser && post.authorId === currentUser.uid);

  return (
    <div className="flex-1 flex flex-col h-full w-full overflow-y-auto select-none" style={{ backgroundColor: 'var(--bg-app)' }}>
      {/* Top Header Bar */}
      <div
        className="sticky top-0 z-30 px-4 py-3 border-b flex items-center justify-between backdrop-blur-md shrink-0"
        style={{
          borderColor: 'var(--border-app)',
          backgroundColor: 'rgba(9, 14, 23, 0.85)',
        }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Back"
          >
            <ArrowLeft size={19} />
          </button>
          <div>
            <h1 className="text-lg font-black text-white">Post</h1>
          </div>
        </div>

        {canDeletePost && (
          postPendingDelete ? (
            <div className="flex items-center gap-2 animate-fade-in">
              <span className="text-xs text-red-400 font-bold">Delete?</span>
              <button
                onClick={handleDeletePost}
                className="px-3 py-1 rounded-full text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
              >
                Yes
              </button>
              <button
                onClick={() => setPostPendingDelete(false)}
                className="px-3 py-1 rounded-full text-xs font-semibold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setPostPendingDelete(true)}
              className="p-2 rounded-full text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              title="Delete post"
            >
              <Trash2 size={18} />
            </button>
          )
        )}
      </div>

      {/* Main Content Column */}
      <div className="max-w-2xl w-full mx-auto divide-y divide-white/5 pb-20">
        {/* Full Post Item */}
        <article className="p-4 sm:p-5 space-y-4">
          {/* Author row */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => onOpenProfile(post.authorUsername)}
              className="flex items-center gap-3 text-left group cursor-pointer"
            >
              <img
                src={post.authorPhotoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                alt={post.authorUsername}
                className="w-12 h-12 rounded-full object-cover group-hover:opacity-90 transition-opacity shrink-0"
              />
              <div>
                <div className="flex items-center gap-1 group-hover:underline">
                  <UserBadge
                    username={post.authorUsername}
                    displayName={post.authorDisplayName || post.authorUsername}
                    role={post.authorRole}
                    isVerified={post.authorIsVerified}
                    size="md"
                  />
                </div>
                <p className="text-xs text-slate-400">@{post.authorUsername}</p>
              </div>
            </button>

            {post.communityName && (
              <span className="text-xs font-bold text-orange-400 bg-orange-500/15 border border-orange-500/30 px-3 py-1 rounded-full">
                {post.communityName}
              </span>
            )}
          </div>

          {/* Community Title & Flair if present */}
          {post.title && (
            <div className="space-y-1.5 pt-1">
              {post.flair && (
                <span className="inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-white/10 text-orange-300 border border-white/10">
                  {post.flair}
                </span>
              )}
              <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">
                {post.title}
              </h2>
            </div>
          )}

          {/* Post Text */}
          <p className="text-base sm:text-lg text-slate-100 whitespace-pre-wrap leading-relaxed break-words font-normal">
            {post.content}
          </p>

          {/* Poll Component if exists */}
          {post.poll && <PollWidget post={post} />}

          {/* Image Attachment */}
          {post.imageUrl && (
            <div
              onClick={() => setShowMediaLightbox(true)}
              className="rounded-2xl overflow-hidden border max-h-[500px] bg-black/20 cursor-pointer relative group/img"
              style={{ borderColor: 'var(--border-app)' }}
            >
              <img
                src={post.imageUrl}
                alt="Attachment"
                className="w-full h-auto max-h-[500px] object-cover group-hover/img:scale-[1.01] transition-transform duration-200"
              />
              <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/25 transition-colors flex items-center justify-center opacity-0 group-hover/img:opacity-100">
                <span className="p-2.5 rounded-full bg-black/75 text-white backdrop-blur-sm">
                  <Maximize2 size={18} />
                </span>
              </div>
            </div>
          )}

          {/* GIF Attachment */}
          {post.gifUrl && (
            <div
              onClick={() => setShowMediaLightbox(true)}
              className="rounded-2xl overflow-hidden border max-h-[500px] bg-black/20 cursor-pointer relative group/img"
              style={{ borderColor: 'var(--border-app)' }}
            >
              <img
                src={post.gifUrl}
                alt="GIF"
                className="w-full h-auto max-h-[500px] object-cover group-hover/img:scale-[1.01] transition-transform duration-200"
              />
              <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/25 transition-colors flex items-center justify-center opacity-0 group-hover/img:opacity-100">
                <span className="p-2.5 rounded-full bg-black/75 text-white backdrop-blur-sm">
                  <Maximize2 size={18} />
                </span>
              </div>
            </div>
          )}

          {/* Location Tag */}
          {post.location && (
            <div className="flex items-center gap-1.5 text-xs text-sky-400">
              <MapPin size={13} />
              <span>{post.location}</span>
            </div>
          )}

          {/* Full Timestamp */}
          <div className="text-xs text-slate-400 pt-2 pb-1 border-t border-white/5 flex items-center gap-2">
            <span>
              {new Date(post.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </span>
            <span>·</span>
            <span>
              {new Date(post.createdAt).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>

          {/* Engagement Statistics Bar */}
          <div
            className="py-3 border-y flex items-center gap-6 text-xs text-slate-400"
            style={{ borderColor: 'var(--border-app)' }}
          >
            <div>
              <span className="font-bold text-white">{post.commentsCount || comments.length || 0}</span>{' '}
              <span>Replies</span>
            </div>
            <div>
              <span className="font-bold text-white">{post.likesCount || 0}</span> <span>Likes</span>
            </div>
            {reposted && (
              <div>
                <span className="font-bold text-white">1</span> <span>Repost</span>
              </div>
            )}
            {bookmarked && (
              <div>
                <span className="font-bold text-white">1</span> <span>Bookmark</span>
              </div>
            )}
          </div>

          {/* Interactive Action Bar (Reply, Repost, Like, Bookmark, Share) */}
          <div className="flex items-center justify-around py-1 text-slate-400 border-b border-white/5">
            <button
              onClick={() => textareaRef.current?.focus()}
              className="p-2.5 rounded-full hover:bg-sky-400/10 hover:text-sky-400 transition-colors cursor-pointer"
              title="Reply"
            >
              <MessageCircle size={19} />
            </button>

            <button
              onClick={() => setReposted((prev) => !prev)}
              className={`p-2.5 rounded-full transition-colors cursor-pointer ${
                reposted ? 'text-emerald-400 bg-emerald-500/10' : 'hover:bg-emerald-500/10 hover:text-emerald-400'
              }`}
              title={reposted ? 'Undo Repost' : 'Repost'}
            >
              <Repeat size={19} />
            </button>

            <button
              onClick={handleToggleLikePost}
              className={`p-2.5 rounded-full transition-colors cursor-pointer ${
                isPostLiked ? 'text-pink-500 bg-pink-500/10' : 'hover:bg-pink-500/10 hover:text-pink-500'
              }`}
              title={isPostLiked ? 'Unlike' : 'Like'}
            >
              <Heart size={19} className={isPostLiked ? 'fill-pink-500' : ''} />
            </button>

            <button
              onClick={() => setBookmarked((prev) => !prev)}
              className={`p-2.5 rounded-full transition-colors cursor-pointer ${
                bookmarked ? 'text-sky-400 bg-sky-400/10' : 'hover:bg-sky-400/10 hover:text-sky-400'
              }`}
              title={bookmarked ? 'Remove Bookmark' : 'Bookmark'}
            >
              <Bookmark size={19} className={bookmarked ? 'fill-sky-400' : ''} />
            </button>

            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                alert('Post link copied to clipboard!');
              }}
              className="p-2.5 rounded-full hover:bg-sky-400/10 hover:text-sky-400 transition-colors cursor-pointer"
              title="Share"
            >
              <Share2 size={19} />
            </button>
          </div>
        </article>

        {/* Twitter In-line Reply Composer with Postable Options */}
        <div className="p-4 sm:p-5" style={{ backgroundColor: 'rgba(255, 255, 255, 0.015)' }}>
          <div className="flex gap-3">
            <img
              src={userProfile?.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
              alt={userProfile?.username || 'user'}
              className="w-10 h-10 rounded-full object-cover shrink-0"
            />

            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 mb-2">
                Replying to{' '}
                <button
                  onClick={() => onOpenProfile(post.authorUsername)}
                  className="text-sky-400 font-medium hover:underline cursor-pointer"
                >
                  @{post.authorUsername}
                </button>
              </p>

              <textarea
                ref={textareaRef}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                disabled={Boolean(userProfile?.isSuspended)}
                placeholder={
                  userProfile?.isSuspended
                    ? 'Your account is suspended. You cannot reply.'
                    : 'Post your reply'
                }
                rows={2}
                className="w-full bg-transparent resize-none border-none outline-none text-white text-sm placeholder-slate-500 leading-relaxed disabled:opacity-50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleSubmitReply();
                  }
                }}
              />

              {/* Attachments preview */}
              {replyImage && (
                <div className="relative mb-3 rounded-2xl overflow-hidden border max-h-56 w-fit" style={{ borderColor: 'var(--border-app)' }}>
                  <img src={replyImage} alt="Attachment" className="max-h-56 object-cover rounded-2xl" />
                  <button
                    type="button"
                    onClick={() => setReplyImage(null)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {replyGif && (
                <div className="relative mb-3 rounded-2xl overflow-hidden border max-h-56 w-fit" style={{ borderColor: 'var(--border-app)' }}>
                  <img src={replyGif} alt="GIF Attachment" className="max-h-56 object-cover rounded-2xl" />
                  <button
                    type="button"
                    onClick={() => setReplyGif(null)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {replyLocation && (
                <div className="mb-2 flex items-center gap-1.5 text-xs text-sky-400 bg-sky-500/10 px-3 py-1 rounded-full w-fit">
                  <MapPin size={12} />
                  <span>{replyLocation}</span>
                  <button onClick={() => setReplyLocation(null)} className="ml-1 hover:text-white cursor-pointer">
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* GIF Selector popover */}
              {showGifPicker && (
                <div className="p-3 mb-3 rounded-2xl bg-slate-900 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="font-bold flex items-center gap-1.5">
                      <Clapperboard size={14} className="text-sky-400" />
                      Choose a GIF
                    </span>
                    <button onClick={() => setShowGifPicker(false)} className="text-slate-500 hover:text-white cursor-pointer">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {SAMPLE_GIFS.map((g, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setReplyGif(g.url);
                          setReplyImage(null);
                          setShowGifPicker(false);
                        }}
                        className="rounded-xl overflow-hidden border border-white/5 hover:border-sky-400 transition-all cursor-pointer group"
                      >
                        <img src={g.url} alt={g.title} className="w-full h-20 object-cover group-hover:scale-105 transition-transform" />
                        <span className="block text-[10px] text-slate-400 py-1 bg-black/40 truncate px-1">
                          {g.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Emoji Selector drawer */}
              {showEmojiPicker && (
                <div className="p-2.5 mb-3 rounded-2xl bg-slate-900 border border-white/10 flex flex-wrap gap-2">
                  {POPULAR_EMOJIS.map((emoji, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setReplyText((prev) => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="text-lg p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Location Input Drawer */}
              {showLocationInput && (
                <div className="flex items-center gap-2 mb-3 bg-slate-900 p-2 rounded-2xl border border-white/10">
                  <MapPin size={14} className="text-sky-400 shrink-0 ml-1" />
                  <input
                    type="text"
                    value={customLocationText}
                    onChange={(e) => setCustomLocationText(e.target.value)}
                    placeholder="Enter location tag (e.g. San Francisco, CA)..."
                    className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (customLocationText.trim()) setReplyLocation(customLocationText.trim());
                        setShowLocationInput(false);
                        setCustomLocationText('');
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (customLocationText.trim()) setReplyLocation(customLocationText.trim());
                      setShowLocationInput(false);
                      setCustomLocationText('');
                    }}
                    className="px-3 py-1 bg-sky-500/20 text-sky-400 rounded-full text-xs font-bold hover:bg-sky-500/30 cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              )}

              {/* Postable Options Toolbar (Photos, GIF, Emoji, Location) */}
              <div
                className="pt-2 border-t flex items-center justify-between"
                style={{ borderColor: 'var(--border-app)' }}
              >
                <div className="flex items-center gap-1">
                  {/* Photo attachment */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    disabled={Boolean(userProfile?.isSuspended)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={Boolean(userProfile?.isSuspended)}
                    className="p-2 rounded-full text-sky-400 hover:bg-sky-500/10 transition-colors disabled:opacity-40 cursor-pointer"
                    title="Media / Photo"
                  >
                    <ImageIcon size={18} />
                  </button>

                  {/* GIF picker */}
                  <button
                    type="button"
                    onClick={() => setShowGifPicker((prev) => !prev)}
                    disabled={Boolean(userProfile?.isSuspended)}
                    className="p-2 rounded-full text-sky-400 hover:bg-sky-500/10 transition-colors disabled:opacity-40 cursor-pointer"
                    title="GIF"
                  >
                    <Clapperboard size={18} />
                  </button>

                  {/* Emoji picker */}
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker((prev) => !prev)}
                    disabled={Boolean(userProfile?.isSuspended)}
                    className="p-2 rounded-full text-sky-400 hover:bg-sky-500/10 transition-colors disabled:opacity-40 cursor-pointer"
                    title="Emoji"
                  >
                    <Smile size={18} />
                  </button>

                  {/* Location tagger */}
                  <button
                    type="button"
                    onClick={() => setShowLocationInput((prev) => !prev)}
                    disabled={Boolean(userProfile?.isSuspended)}
                    className="p-2 rounded-full text-sky-400 hover:bg-sky-500/10 transition-colors disabled:opacity-40 cursor-pointer"
                    title="Tag location"
                  >
                    <MapPin size={18} />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {replyText.length > 0 && (
                    <span className="text-[11px] text-slate-500">{replyText.length}/280</span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSubmitReply()}
                    disabled={
                      Boolean(userProfile?.isSuspended) ||
                      submittingReply ||
                      (!replyText.trim() && !replyImage && !replyGif)
                    }
                    className="px-5 py-2 rounded-full text-xs font-bold transition-all disabled:opacity-40 shadow-sm cursor-pointer"
                    style={{
                      backgroundColor: 'var(--color-accent)',
                      color: '#090e17',
                    }}
                  >
                    {submittingReply ? 'Replying...' : 'Reply'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Twitter Replies Stream */}
        <div className="divide-y divide-white/5">
          {loadingComments ? (
            <div className="p-8 flex items-center justify-center text-slate-400">
              <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              No replies yet. Be the first to start the conversation!
            </div>
          ) : (
            comments.map((comment) => {
              const hasLikedComment = currentUser
                ? comment.likes?.includes(currentUser.uid)
                : false;

              // Deletion permission: Comment author, ANY mod, or Neo account
              const canDeleteComment =
                canDeleteAnyComment ||
                (currentUser && comment.authorId === currentUser.uid);

              return (
                <article
                  key={comment.commentId}
                  className="p-4 sm:p-5 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex gap-3">
                    {/* Commenter Avatar */}
                    <button
                      onClick={() => onOpenProfile(comment.authorUsername)}
                      className="shrink-0 cursor-pointer"
                    >
                      <img
                        src={comment.authorPhotoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                        alt={comment.authorUsername}
                        className="w-10 h-10 rounded-full object-cover hover:opacity-90 transition-opacity"
                      />
                    </button>

                    {/* Comment Content Area */}
                    <div className="flex-1 min-w-0">
                      {/* Top Header: Name, Handle, Timestamp, and Delete Option */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => onOpenProfile(comment.authorUsername)}
                            className="hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <UserBadge
                              username={comment.authorUsername}
                              displayName={comment.authorDisplayName || comment.authorUsername}
                              role={comment.authorRole}
                              isVerified={comment.authorIsVerified}
                              size="sm"
                            />
                          </button>
                          <span className="text-slate-400 text-xs">@{comment.authorUsername}</span>
                          <span className="text-slate-500 text-xs">·</span>
                          <span className="text-slate-500 text-xs">
                            {formatReplyTime(comment.createdAt)}
                          </span>
                        </div>

                        {/* Delete comment option for Mod account, Neo account, or Author */}
                        {commentPendingDelete === comment.commentId ? (
                          <div className="flex items-center gap-1.5 animate-fade-in">
                            <span className="text-[11px] text-red-400 font-bold">Delete?</span>
                            <button
                              onClick={() => handleDeleteComment(comment.commentId)}
                              className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setCommentPendingDelete(null)}
                              className="px-2 py-0.5 rounded-full text-[11px] font-semibold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          canDeleteComment && (
                            <button
                              onClick={() => setCommentPendingDelete(comment.commentId)}
                              className="p-1.5 rounded-full text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                              title={
                                isNeo
                                  ? 'Delete comment (Neo Admin)'
                                  : isMod
                                  ? 'Delete comment (Moderator)'
                                  : 'Delete your comment'
                              }
                            >
                              <Trash2 size={14} />
                            </button>
                          )
                        )}
                      </div>

                      {/* Replying to indicator */}
                      <p className="text-[11px] text-slate-500 mb-1.5">
                        Replying to{' '}
                        <span className="text-sky-400 font-medium">@{post.authorUsername}</span>
                      </p>

                      {/* Comment text */}
                      <p className="text-xs sm:text-sm text-slate-100 whitespace-pre-wrap leading-relaxed mb-2.5 break-words">
                        {comment.content}
                      </p>

                      {/* Image / GIF attachment if present */}
                      {comment.imageUrl && (
                        <div
                          className="rounded-2xl overflow-hidden border mb-3 max-h-72 bg-black/20"
                          style={{ borderColor: 'var(--border-app)' }}
                        >
                          <img
                            src={comment.imageUrl}
                            alt="Attachment"
                            className="w-full h-auto max-h-72 object-cover"
                          />
                        </div>
                      )}

                      {/* Twitter Action Bar under each comment */}
                      <div className="flex items-center justify-between text-slate-400 max-w-xs pt-1">
                        <button
                          onClick={() => {
                            setReplyText(`@${comment.authorUsername} `);
                            textareaRef.current?.focus();
                          }}
                          className="flex items-center gap-1.5 text-xs hover:text-sky-400 transition-colors group cursor-pointer"
                          title="Reply"
                        >
                          <div className="p-1.5 rounded-full group-hover:bg-sky-400/10">
                            <MessageCircle size={14} />
                          </div>
                        </button>

                        <button
                          className="flex items-center gap-1.5 text-xs hover:text-emerald-400 transition-colors group cursor-pointer"
                          title="Repost"
                        >
                          <div className="p-1.5 rounded-full group-hover:bg-emerald-500/10">
                            <Repeat size={14} />
                          </div>
                        </button>

                        <button
                          onClick={() => handleToggleLikeComment(comment)}
                          className={`flex items-center gap-1.5 text-xs transition-colors group cursor-pointer ${
                            hasLikedComment ? 'text-pink-500' : 'hover:text-pink-400'
                          }`}
                          title="Like"
                        >
                          <div className="p-1.5 rounded-full group-hover:bg-pink-500/10">
                            <Heart
                              size={14}
                              className={hasLikedComment ? 'fill-pink-500' : ''}
                            />
                          </div>
                          {(comment.likesCount || 0) > 0 && (
                            <span>{comment.likesCount}</span>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            navigator.clipboard?.writeText(window.location.href);
                            showToast('Link copied to clipboard!');
                          }}
                          className="flex items-center gap-1.5 text-xs hover:text-sky-400 transition-colors group cursor-pointer"
                          title="Share"
                        >
                          <div className="p-1.5 rounded-full group-hover:bg-sky-400/10">
                            <Share2 size={14} />
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

      {/* Fullscreen Media Lightbox */}
      {showMediaLightbox && (post?.imageUrl || post?.gifUrl) && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col select-none"
          onClick={() => setShowMediaLightbox(false)}
        >
          <div
            className="flex items-center justify-between px-4 py-3 bg-black/60 border-b border-white/10 shrink-0 z-20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-bold text-white border border-white/10">
                Media Preview
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const url = post.imageUrl || post.gifUrl || '';
                  const a = document.createElement('a');
                  a.href = url;
                  a.target = '_blank';
                  a.click();
                }}
                className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Open original"
              >
                <ExternalLink size={18} />
              </button>
              <button
                type="button"
                onClick={() => setShowMediaLightbox(false)}
                className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          <div
            className="flex-1 relative flex items-center justify-center p-4 min-h-0 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={post.imageUrl || post.gifUrl || ''}
              alt={post.content}
              className="max-w-full max-h-[82vh] rounded-2xl object-contain shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl border border-sky-400/40 text-xs shadow-2xl animate-fade-in">
          {toastMessage}
        </div>
      )}
    </div>
  );
};
