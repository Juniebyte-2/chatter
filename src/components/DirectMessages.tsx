import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { DirectConversation, DirectMessage, UserProfile } from '../types';
import { UserBadge } from './UserBadge';
import {
  collection,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  getDoc,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  Mail,
  SquarePen,
  Search,
  ArrowLeft,
  Send,
  Image as ImageIcon,
  X,
  User as UserIcon,
  ShieldAlert,
  Sparkles,
  Trash2,
  AlertTriangle,
  Check
} from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';

interface DirectMessagesProps {
  initialTargetUserId?: string | null;
  onOpenProfile: (username: string) => void;
  onBackToFeed: () => void;
}

export const DirectMessages: React.FC<DirectMessagesProps> = ({
  initialTargetUserId,
  onOpenProfile,
  onBackToFeed,
}) => {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const [conversations, setConversations] = useState<DirectConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<DirectConversation | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Deletion state
  const [messageToDelete, setMessageToDelete] = useState<DirectMessage | null>(null);
  const [conversationToDelete, setConversationToDelete] = useState<DirectConversation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Input states
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [searchConvQuery, setSearchConvQuery] = useState('');

  // New Message Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real-time listener for current user's conversations
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUser.uid)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: DirectConversation[] = [];
        snapshot.forEach((d) => {
          list.push({ conversationId: d.id, ...d.data() } as DirectConversation);
        });

        // Sort by updatedAt descending
        list.sort((a, b) => {
          const tA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const tB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return tB - tA;
        });

        setConversations(list);
        setLoadingConversations(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'conversations');
        setLoadingConversations(false);
      }
    );

    return () => unsub();
  }, [currentUser?.uid]);

  // Handle initial target user if opened from profile
  useEffect(() => {
    if (!initialTargetUserId || !currentUser || !userProfile) return;

    async function openConversationWithUser() {
      if (!currentUser || initialTargetUserId === currentUser.uid) return;
      const targetUserDoc = await getDoc(doc(db, 'users', initialTargetUserId!));
      if (!targetUserDoc.exists()) return;
      const targetData = targetUserDoc.data() as UserProfile;

      await startOrOpenConversation(targetData);
    }

    openConversationWithUser();
  }, [initialTargetUserId, currentUser?.uid]);

  // Listener for active conversation's messages
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    const messagesRef = collection(db, 'conversations', selectedConversation.conversationId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const msgs: DirectMessage[] = [];
        snapshot.forEach((d) => {
          msgs.push({ messageId: d.id, ...d.data() } as DirectMessage);
        });
        setMessages(msgs);
        setLoadingMessages(false);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `conversations/${selectedConversation.conversationId}/messages`);
        setLoadingMessages(false);
      }
    );

    return () => unsub();
  }, [selectedConversation?.conversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Start or open existing conversation with a user
  const startOrOpenConversation = async (targetUser: UserProfile) => {
    if (!currentUser || !userProfile) return;
    if (targetUser.userId === currentUser.uid) {
      alert("You cannot direct message yourself.");
      return;
    }

    // Deterministic conversation ID between two UIDs
    const convId =
      currentUser.uid < targetUser.userId
        ? `${currentUser.uid}_${targetUser.userId}`
        : `${targetUser.userId}_${currentUser.uid}`;

    const convRef = doc(db, 'conversations', convId);
    const existingSnap = await getDoc(convRef);

    let convData: DirectConversation;

    if (existingSnap.exists()) {
      convData = { conversationId: existingSnap.id, ...existingSnap.data() } as DirectConversation;
    } else {
      convData = {
        conversationId: convId,
        participants: [currentUser.uid, targetUser.userId],
        participantDetails: {
          [currentUser.uid]: {
            userId: currentUser.uid,
            username: userProfile.username,
            displayName: userProfile.displayName || userProfile.username,
            photoURL: userProfile.photoURL || '',
            role: userProfile.role || 'user',
          },
          [targetUser.userId]: {
            userId: targetUser.userId,
            username: targetUser.username,
            displayName: targetUser.displayName || targetUser.username,
            photoURL: targetUser.photoURL || '',
            role: targetUser.role || 'user',
          },
        },
        lastMessageText: '',
        lastMessageAt: new Date().toISOString(),
        lastSenderId: '',
        unreadBy: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(convRef, convData);
    }

    setSelectedConversation(convData);
    setShowNewModal(false);
    setSearchUserQuery('');
    setSearchResults([]);
  };

  // Search users for new DM
  useEffect(() => {
    if (!searchUserQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const snap = await getDocs(collection(db, 'users'));
        const cleanQuery = searchUserQuery.toLowerCase().replace(/^@/, '').trim();
        const results: UserProfile[] = [];

        snap.forEach((d) => {
          const u = d.data() as UserProfile;
          if (
            u.userId !== currentUser?.uid &&
            (u.username.toLowerCase().includes(cleanQuery) ||
              (u.displayName && u.displayName.toLowerCase().includes(cleanQuery)))
          ) {
            results.push(u);
          }
        });

        setSearchResults(results.slice(0, 10));
      } catch (err) {
        console.error('Error searching users for DM:', err);
      } finally {
        setSearchingUsers(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchUserQuery, currentUser?.uid]);

  // Image attach handler
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    try {
      const compressed = await compressImage(e.target.files[0], 900, 900, 0.75);
      setAttachedImage(compressed);
    } catch {
      alert('Failed to process image');
    }
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConversation || !currentUser || !userProfile) return;

    if (userProfile.isSuspended) {
      alert('Your account is currently suspended and cannot send direct messages.');
      return;
    }

    if (!inputText.trim() && !attachedImage) return;

    const textToSend = inputText.trim();
    const imageToSend = attachedImage;

    setInputText('');
    setAttachedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSending(true);

    try {
      const nowIso = new Date().toISOString();
      const messagesRef = collection(db, 'conversations', selectedConversation.conversationId, 'messages');

      await addDoc(messagesRef, {
        conversationId: selectedConversation.conversationId,
        senderId: currentUser.uid,
        senderUsername: userProfile.username,
        senderDisplayName: userProfile.displayName || userProfile.username,
        senderPhotoURL: userProfile.photoURL || '',
        senderRole: userProfile.role || 'user',
        text: textToSend,
        imageUrl: imageToSend || null,
        createdAt: nowIso,
      });

      // Update parent conversation
      const otherUserId = selectedConversation.participants.find((id) => id !== currentUser.uid) || '';
      await updateDoc(doc(db, 'conversations', selectedConversation.conversationId), {
        lastMessageText: textToSend || (imageToSend ? '📷 Photo' : ''),
        lastMessageAt: nowIso,
        lastSenderId: currentUser.uid,
        updatedAt: nowIso,
        unreadBy: otherUserId ? [otherUserId] : [],
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `conversations/${selectedConversation.conversationId}/messages`);
    } finally {
      setSending(false);
    }
  };

  // Delete individual direct message
  const handleDeleteMessage = async (msg: DirectMessage) => {
    if (!selectedConversation || !currentUser) return;
    setDeleting(true);
    try {
      const msgRef = doc(db, 'conversations', selectedConversation.conversationId, 'messages', msg.messageId);
      await deleteDoc(msgRef);

      // Recalculate last message for conversation preview
      const remaining = messages.filter((m) => m.messageId !== msg.messageId);
      const lastMsg = remaining.length > 0 ? remaining[remaining.length - 1] : null;

      await updateDoc(doc(db, 'conversations', selectedConversation.conversationId), {
        lastMessageText: lastMsg ? (lastMsg.text || (lastMsg.imageUrl ? '📷 Photo' : '')) : '',
        lastMessageAt: lastMsg ? lastMsg.createdAt : selectedConversation.createdAt || new Date().toISOString(),
        lastSenderId: lastMsg ? lastMsg.senderId : '',
        updatedAt: new Date().toISOString(),
      });

      setMessageToDelete(null);
      showToast('Message deleted');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `conversations/${selectedConversation.conversationId}/messages/${msg.messageId}`);
    } finally {
      setDeleting(false);
    }
  };

  // Delete entire direct message conversation
  const handleDeleteConversation = async (conv: DirectConversation) => {
    if (!currentUser) return;
    setDeleting(true);
    try {
      // 1. Delete all message documents in subcollection
      const messagesRef = collection(db, 'conversations', conv.conversationId, 'messages');
      const messagesSnap = await getDocs(messagesRef);

      const batch = writeBatch(db);
      messagesSnap.forEach((d) => {
        batch.delete(d.ref);
      });
      // 2. Delete parent conversation document
      batch.delete(doc(db, 'conversations', conv.conversationId));

      await batch.commit();

      if (selectedConversation?.conversationId === conv.conversationId) {
        setSelectedConversation(null);
      }
      setConversationToDelete(null);
      showToast('Chat conversation deleted');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `conversations/${conv.conversationId}`);
    } finally {
      setDeleting(false);
    }
  };

  // Find the other participant's details in a conversation
  const getOtherParticipant = (conv: DirectConversation) => {
    if (!currentUser) return null;
    const otherId = conv.participants.find((id) => id !== currentUser.uid);
    if (!otherId || !conv.participantDetails) return null;
    return conv.participantDetails[otherId];
  };

  const activeOtherParticipant = selectedConversation ? getOtherParticipant(selectedConversation) : null;

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (!searchConvQuery.trim()) return true;
    const other = getOtherParticipant(c);
    if (!other) return false;
    const q = searchConvQuery.toLowerCase();
    return (
      other.username.toLowerCase().includes(q) ||
      other.displayName.toLowerCase().includes(q) ||
      (c.lastMessageText && c.lastMessageText.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 flex w-full h-full overflow-hidden select-none" style={{ backgroundColor: 'var(--bg-app)' }}>
      {/* Left Pane: Conversations List */}
      <div
        className={`${
          selectedConversation ? 'hidden md:flex' : 'flex'
        } flex-col w-full md:w-80 lg:w-96 border-r shrink-0 h-full overflow-hidden`}
        style={{
          borderColor: 'var(--border-app)',
          backgroundColor: 'var(--bg-sidebar)',
        }}
      >
        {/* Header */}
        <div className="p-4 border-b shrink-0 flex items-center justify-between" style={{ borderColor: 'var(--border-app)' }}>
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToFeed}
              className="md:hidden p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
              title="Return to feed"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-lg font-black text-white flex items-center gap-2">
              <Mail size={20} className="text-sky-400" />
              <span>Messages</span>
            </h1>
          </div>

          <button
            onClick={() => setShowNewModal(true)}
            className="p-2 rounded-full hover:bg-white/10 text-sky-400 hover:text-white transition-colors"
            title="New message"
          >
            <SquarePen size={19} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b shrink-0" style={{ borderColor: 'var(--border-app)' }}>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchConvQuery}
              onChange={(e) => setSearchConvQuery(e.target.value)}
              placeholder="Search Direct Messages"
              className="w-full text-xs pl-9 pr-3 py-2 rounded-full bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: 'var(--border-app)' }}>
          {loadingConversations ? (
            <div className="p-8 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-slate-400">
                <Mail size={20} />
              </div>
              <h3 className="text-sm font-bold text-white">No messages yet</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Direct message anyone on Chatter to start a private conversation.
              </p>
              <button
                onClick={() => setShowNewModal(true)}
                className="mt-2 px-4 py-2 rounded-full text-xs font-bold shadow-md transition-transform hover:scale-105"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: '#090e17',
                }}
              >
                Write a message
              </button>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const other = getOtherParticipant(conv);
              const isSelected = selectedConversation?.conversationId === conv.conversationId;
              const hasUnread = conv.unreadBy?.includes(currentUser?.uid || '');

              return (
                <div
                  key={conv.conversationId}
                  onClick={() => setSelectedConversation(conv)}
                  className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors group relative ${
                    isSelected ? 'bg-white/10' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <img
                    src={other?.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                    alt={other?.username || 'user'}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="truncate">
                        <UserBadge
                          username={other?.username || ''}
                          displayName={other?.displayName || other?.username || ''}
                          role={other?.role}
                          size="sm"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-1">
                        {conv.lastMessageAt && (
                          <span className="text-[10px] text-slate-500">
                            {new Date(conv.lastMessageAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConversationToDelete(conv);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all cursor-pointer"
                          title="Delete entire chat"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <p className={`text-xs truncate mt-0.5 ${hasUnread ? 'text-white font-bold' : 'text-slate-400'}`}>
                      {conv.lastMessageText || 'Draft conversation'}
                    </p>
                  </div>

                  {hasUnread && <div className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane: Active Message Thread */}
      <div className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-1 flex-col h-full overflow-hidden bg-black/10`}>
        {selectedConversation && activeOtherParticipant ? (
          <>
            {/* Thread Header */}
            <div
              className="p-3 sm:p-4 border-b flex items-center justify-between shrink-0"
              style={{
                borderColor: 'var(--border-app)',
                backgroundColor: 'var(--bg-card)',
              }}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  <ArrowLeft size={18} />
                </button>

                <button
                  onClick={() => onOpenProfile(activeOtherParticipant.username)}
                  className="flex items-center gap-2.5 hover:opacity-90 transition-opacity text-left"
                >
                  <img
                    src={activeOtherParticipant.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                    alt={activeOtherParticipant.username}
                    className="w-9 h-9 rounded-full object-cover shrink-0"
                  />
                  <div>
                    <UserBadge
                      username={activeOtherParticipant.username}
                      displayName={activeOtherParticipant.displayName}
                      role={activeOtherParticipant.role}
                      size="sm"
                    />
                    <p className="text-[10px] text-slate-400">@{activeOtherParticipant.username}</p>
                  </div>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenProfile(activeOtherParticipant.username)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors"
                >
                  View Profile
                </button>
                <button
                  type="button"
                  onClick={() => setConversationToDelete(selectedConversation)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Delete entire chat"
                >
                  <Trash2 size={14} />
                  <span className="hidden sm:inline">Delete Chat</span>
                </button>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {loadingMessages ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-7 h-7 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                  <p className="text-sm font-bold text-white">Say hello to {activeOtherParticipant.displayName}!</p>
                  <p className="text-xs text-slate-400 max-w-xs">
                    This is the start of your direct message conversation with @{activeOtherParticipant.username}.
                  </p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.senderId === currentUser?.uid;

                  return (
                    <div key={m.messageId} className={`flex flex-col group/msg ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`flex gap-2 max-w-[85%] sm:max-w-[70%] items-end ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        {!isMe && (
                          <img
                            src={m.senderPhotoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                            alt={m.senderUsername}
                            className="w-7 h-7 rounded-full object-cover shrink-0 mb-1"
                          />
                        )}

                        <div
                          className="rounded-2xl px-4 py-2.5 shadow-sm space-y-2 relative"
                          style={{
                            backgroundColor: isMe ? 'var(--bubble-self)' : 'var(--bubble-other)',
                            color: '#ffffff',
                          }}
                        >
                          {m.imageUrl && (
                            <div className="rounded-xl overflow-hidden max-h-60">
                              <img src={m.imageUrl} alt="attachment" className="max-h-60 object-cover w-full" />
                            </div>
                          )}
                          {m.text && <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">{m.text}</p>}
                        </div>

                        {/* Delete message button */}
                        {(isMe || isAdmin) && (
                          <button
                            type="button"
                            onClick={() => setMessageToDelete(m)}
                            className="opacity-0 group-hover/msg:opacity-100 p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all cursor-pointer mb-1 shrink-0"
                            title="Delete message"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mt-1 px-1">
                        <span className="text-[10px] text-slate-500">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Composer */}
            <div className="p-3 sm:p-4 border-t shrink-0" style={{ borderColor: 'var(--border-app)', backgroundColor: 'var(--bg-card)' }}>
              {attachedImage && (
                <div className="relative mb-2 w-fit rounded-xl overflow-hidden border border-white/20">
                  <img src={attachedImage} alt="attachment" className="max-h-24 object-cover" />
                  <button
                    onClick={() => setAttachedImage(null)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-black"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
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
                  className="p-2.5 rounded-full text-slate-400 hover:text-sky-400 hover:bg-white/5 transition-colors disabled:opacity-40"
                  title="Attach image"
                >
                  <ImageIcon size={19} />
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={Boolean(userProfile?.isSuspended)}
                  placeholder={
                    userProfile?.isSuspended
                      ? 'Your account is suspended. Direct messaging is disabled.'
                      : `Message @${activeOtherParticipant.username}...`
                  }
                  className="flex-1 text-xs px-4 py-3 rounded-full bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition-colors disabled:opacity-50"
                />

                <button
                  type="submit"
                  disabled={Boolean(userProfile?.isSuspended) || sending || (!inputText.trim() && !attachedImage)}
                  className="p-3 rounded-full transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: '#090e17',
                  }}
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </>
        ) : (
          /* Empty placeholder when no convo is selected */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-sky-400 shadow-inner">
              <Mail size={32} />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black text-white">Select a message</h2>
              <p className="text-xs text-slate-400 max-w-sm">
                Choose from your existing conversations, or start a new one to connect with anyone on Chatter.
              </p>
            </div>
            <button
              onClick={() => setShowNewModal(true)}
              className="px-6 py-2.5 rounded-full text-xs font-bold shadow-lg transition-transform hover:scale-105"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: '#090e17',
              }}
            >
              New Message
            </button>
          </div>
        )}
      </div>

      {/* New Message Search Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-3xl p-5 border space-y-4 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-app)',
            }}
          >
            <div className="flex items-center justify-between border-b pb-3 shrink-0" style={{ borderColor: 'var(--border-app)' }}>
              <div className="flex items-center gap-2">
                <SquarePen size={18} className="text-sky-400" />
                <h3 className="font-bold text-base text-white">New Message</h3>
              </div>
              <button
                onClick={() => {
                  setShowNewModal(false);
                  setSearchUserQuery('');
                  setSearchResults([]);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative shrink-0">
              <Search size={14} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchUserQuery}
                onChange={(e) => setSearchUserQuery(e.target.value)}
                placeholder="Search by username or name..."
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded-full bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto divide-y space-y-1" style={{ borderColor: 'var(--border-app)' }}>
              {searchingUsers ? (
                <div className="p-6 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  {searchUserQuery.trim() ? 'No users found matching that name.' : 'Type a username to find people.'}
                </div>
              ) : (
                searchResults.map((user) => (
                  <button
                    key={user.userId}
                    onClick={() => startOrOpenConversation(user)}
                    className="w-full text-left p-3 rounded-2xl hover:bg-white/5 flex items-center gap-3 transition-colors group"
                  >
                    <img
                      src={user.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                      alt={user.username}
                      className="w-9 h-9 rounded-full object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <UserBadge
                        username={user.username}
                        displayName={user.displayName || user.username}
                        role={user.role}
                        size="sm"
                      />
                      <p className="text-[10px] text-slate-400">@{user.username}</p>
                    </div>
                    <span className="text-xs text-sky-400 font-semibold group-hover:underline">Message →</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Message Confirmation Modal */}
      {messageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-sm rounded-3xl p-5 border space-y-4 shadow-2xl"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-app)',
            }}
          >
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 rounded-2xl bg-red-500/10 border border-red-500/20">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Delete Message?</h3>
                <p className="text-[11px] text-slate-400">This will remove the message for all participants.</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-200 space-y-2">
              {messageToDelete.imageUrl && (
                <div className="rounded-xl overflow-hidden max-h-32">
                  <img src={messageToDelete.imageUrl} alt="attachment" className="max-h-32 object-cover w-full" />
                </div>
              )}
              {messageToDelete.text && (
                <p className="italic line-clamp-3">"{messageToDelete.text}"</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMessageToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-full text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteMessage(messageToDelete)}
                disabled={deleting}
                className="px-4 py-2 rounded-full text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-all shadow-md shadow-red-600/30 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {deleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Delete Message</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Entire Chat Confirmation Modal */}
      {conversationToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-sm rounded-3xl p-5 border space-y-4 shadow-2xl"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-app)',
            }}
          >
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 rounded-2xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Delete Entire Chat?</h3>
                <p className="text-[11px] text-slate-400">
                  {getOtherParticipant(conversationToDelete)
                    ? `Conversation with @${getOtherParticipant(conversationToDelete)?.username}`
                    : 'Direct message conversation'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete this entire direct message conversation? All chat messages, media attachments, and history will be permanently deleted for both participants.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConversationToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-full text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteConversation(conversationToDelete)}
                disabled={deleting}
                className="px-4 py-2 rounded-full text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-all shadow-md shadow-red-600/30 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {deleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting Chat...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Delete Chat</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl border border-sky-400/40 text-xs shadow-2xl animate-fade-in flex items-center gap-2">
          <Check size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
