import React, { useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  arrayUnion
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Chatroom, ChatMessage } from '../types';
import { UserBadge } from './UserBadge';
import { compressImage } from '../utils/imageCompressor';
import {
  Lock,
  KeyRound,
  Send,
  Image as ImageIcon,
  Trash2,
  X,
  AlertCircle,
  Users,
  Plus,
  ArrowLeft,
  ChevronDown,
  Hash,
  ShieldCheck,
  UserPlus
} from 'lucide-react';

interface ChatAreaProps {
  currentRoom: Chatroom | null;
  chatrooms: Chatroom[];
  onSelectRoom: (room: Chatroom) => void;
  onOpenProfile: (username: string) => void;
  onBackToRoomList: () => void;
  onBackToFeed: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  currentRoom,
  chatrooms,
  onSelectRoom,
  onOpenProfile,
  onBackToRoomList,
  onBackToFeed,
}) => {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [unlockedRooms, setUnlockedRooms] = useState<Record<string, boolean>>({});

  // Passcode modal
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

  // Invite member modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteInput, setInviteInput] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteError, setInviteError] = useState('');

  // Create room modal
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomIsLocked, setNewRoomIsLocked] = useState(false);
  const [newRoomLockType, setNewRoomLockType] = useState<'passcode' | 'invite_only'>('passcode');
  const [newRoomPasscode, setNewRoomPasscode] = useState('');
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [createRoomError, setCreateRoomError] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen to messages for currentRoom
  useEffect(() => {
    if (!currentRoom) return;

    const messagesQuery = query(
      collection(db, 'chatrooms', currentRoom.roomId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const msgs: ChatMessage[] = [];
        snapshot.forEach((d) => {
          msgs.push({ messageId: d.id, ...d.data() } as ChatMessage);
        });
        setMessages(msgs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `chatrooms/${currentRoom.roomId}/messages`);
      }
    );

    return () => unsub();
  }, [currentRoom?.roomId]);

  const handleUnlockWithPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRoom) return;
    setPasscodeError('');
    if (passcodeInput.trim() === currentRoom.passcode) {
      setUnlockedRooms((prev) => ({ ...prev, [currentRoom.roomId]: true }));
      setPasscodeInput('');
    } else {
      setPasscodeError('Incorrect room passcode. Please try again.');
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRoom) return;
    setInviteError('');
    setInviteSuccess('');
    const target = inviteInput.trim().replace(/^@/, '');
    if (!target) return;

    try {
      await updateDoc(doc(db, 'chatrooms', currentRoom.roomId), {
        invitedUserIds: arrayUnion(target),
      });
      setInviteSuccess(`Invited @${target} to this room!`);
      setInviteInput('');
      setTimeout(() => setInviteSuccess(''), 2500);
    } catch {
      setInviteError('Failed to invite user');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRoom || !currentUser || !userProfile) return;
    if (userProfile.isSuspended) {
      alert('Your account is currently suspended and cannot send messages.');
      return;
    }
    if (!inputText.trim() && !attachedImage) return;

    setSending(true);
    try {
      await addDoc(collection(db, 'chatrooms', currentRoom.roomId, 'messages'), {
        roomId: currentRoom.roomId,
        senderId: currentUser.uid,
        senderUsername: userProfile.username,
        senderDisplayName: userProfile.displayName,
        senderPhotoURL: userProfile.photoURL || '',
        senderRole: userProfile.role,
        text: inputText.trim(),
        imageUrl: attachedImage || null,
        createdAt: new Date().toISOString(),
      });

      setInputText('');
      setAttachedImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `chatrooms/${currentRoom.roomId}/messages`);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (msgId: string, senderId: string) => {
    if (!currentRoom) return;
    if (!isAdmin && currentUser?.uid !== senderId) return;
    try {
      await deleteDoc(doc(db, 'chatrooms', currentRoom.roomId, 'messages', msgId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `chatrooms/${currentRoom.roomId}/messages/${msgId}`);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    try {
      const compressed = await compressImage(e.target.files[0], 900, 900, 0.75);
      setAttachedImage(compressed);
    } catch {
      alert('Failed to process image');
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile) return;
    if (!newRoomName.trim()) {
      setCreateRoomError('Please provide a room name');
      return;
    }
    if (newRoomIsLocked && newRoomLockType === 'passcode' && !newRoomPasscode.trim()) {
      setCreateRoomError('Please specify a passcode for this locked room');
      return;
    }

    setCreatingRoom(true);
    setCreateRoomError('');

    try {
      const cleanName = newRoomName.trim().replace(/\s+/g, '-').toLowerCase();
      const docRef = await addDoc(collection(db, 'chatrooms'), {
        name: cleanName,
        description: newRoomDesc.trim(),
        creatorId: currentUser.uid,
        creatorUsername: userProfile.username,
        isLocked: newRoomIsLocked,
        lockType: newRoomIsLocked ? newRoomLockType : 'none',
        passcode: newRoomIsLocked && newRoomLockType === 'passcode' ? newRoomPasscode.trim() : null,
        invitedUserIds: [currentUser.uid],
        createdAt: new Date().toISOString(),
        icon: '#',
      });

      const created: Chatroom = {
        roomId: docRef.id,
        name: cleanName,
        description: newRoomDesc.trim(),
        creatorId: currentUser.uid,
        creatorUsername: userProfile.username,
        isLocked: newRoomIsLocked,
        lockType: newRoomIsLocked ? newRoomLockType : 'none',
        passcode: newRoomIsLocked && newRoomLockType === 'passcode' ? newRoomPasscode.trim() : undefined,
        invitedUserIds: [currentUser.uid],
        createdAt: new Date().toISOString(),
        icon: '#',
      };

      setShowCreateRoomModal(false);
      setNewRoomName('');
      setNewRoomDesc('');
      setNewRoomIsLocked(false);
      setNewRoomPasscode('');
      onSelectRoom(created);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'chatrooms');
      setCreateRoomError('Failed to create chatroom');
    } finally {
      setCreatingRoom(false);
    }
  };

  // If no room is selected, display the Chatrooms Directory
  if (!currentRoom) {
    return (
      <div className="flex-1 flex flex-col h-full w-full overflow-y-auto p-4 sm:p-8">
        <div className="max-w-7xl mx-auto w-full space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border-app)' }}>
            <div className="flex items-center gap-3">
              <button
                onClick={onBackToFeed}
                className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title="Back to Home Feed"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-xl font-black text-white flex items-center gap-2">
                  <Users className="text-sky-400" size={22} />
                  <span>Chatrooms</span>
                </h1>
                <p className="text-xs text-slate-400">Join a real-time discussion or create a locked room</p>
              </div>
            </div>

            <button
              onClick={() => {
                if (userProfile?.isSuspended) {
                  alert('Your account is currently suspended and cannot create chatrooms.');
                  return;
                }
                setShowCreateRoomModal(true);
              }}
              className="px-4 py-2 rounded-full text-xs font-bold transition-transform hover:scale-105 shadow-md flex items-center gap-1.5"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: '#090e17',
              }}
            >
              <Plus size={15} />
              <span>New Room</span>
            </button>
          </div>

          {/* Chatrooms Grid (Expands to 3-4 columns on wider screens) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {chatrooms.map((room) => (
              <div
                key={room.roomId}
                onClick={() => onSelectRoom(room)}
                className="p-5 rounded-3xl border cursor-pointer hover:border-sky-400/50 hover:bg-white/[0.03] transition-all space-y-3 group"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-app)',
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center font-bold text-base text-white group-hover:bg-sky-500/20 group-hover:text-sky-300 transition-colors">
                      {room.icon || '#'}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white group-hover:text-sky-400 transition-colors">
                        #{room.name}
                      </h3>
                      <p className="text-[11px] text-slate-400">Created by @{room.creatorUsername}</p>
                    </div>
                  </div>

                  {room.isLocked && (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      <Lock size={11} />
                      <span>{room.lockType === 'passcode' ? 'Passcode' : 'Invite Only'}</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 line-clamp-2">
                  {room.description || 'Open community chatroom.'}
                </p>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Click to enter</span>
                  <span className="text-sky-400 font-semibold group-hover:underline">Join Chat →</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Create Room Modal */}
        {showCreateRoomModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div
              className="w-full max-w-md rounded-3xl p-6 border space-y-4 shadow-2xl"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-app)',
              }}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-app)' }}>
                <div className="flex items-center gap-2">
                  <Hash size={18} className="text-sky-400" />
                  <h3 className="font-bold text-base text-white">Create a Chatroom</h3>
                </div>
                <button onClick={() => setShowCreateRoomModal(false)} className="p-1 text-slate-400 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              {createRoomError && <p className="text-xs text-red-400 font-semibold">{createRoomError}</p>}

              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Room Name</label>
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="e.g. music-club"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-sky-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Description (Optional)</label>
                  <input
                    type="text"
                    value={newRoomDesc}
                    onChange={(e) => setNewRoomDesc(e.target.value)}
                    placeholder="What is this room about?"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-sky-400"
                  />
                </div>

                <div className="pt-2 border-t border-white/10">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRoomIsLocked}
                      onChange={(e) => setNewRoomIsLocked(e.target.checked)}
                      className="rounded text-sky-500 focus:ring-0"
                    />
                    <span className="text-xs font-semibold text-white">Make this room Locked</span>
                  </label>
                </div>

                {newRoomIsLocked && (
                  <div className="space-y-3 p-3.5 rounded-2xl bg-white/5 border border-white/10">
                    <label className="block text-xs font-semibold text-slate-300">Lock Requirement</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          name="lockType"
                          checked={newRoomLockType === 'passcode'}
                          onChange={() => setNewRoomLockType('passcode')}
                        />
                        <span>Require Passcode</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          name="lockType"
                          checked={newRoomLockType === 'invite_only'}
                          onChange={() => setNewRoomLockType('invite_only')}
                        />
                        <span>Invite Only</span>
                      </label>
                    </div>

                    {newRoomLockType === 'passcode' && (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Passcode</label>
                        <input
                          type="text"
                          value={newRoomPasscode}
                          onChange={(e) => setNewRoomPasscode(e.target.value)}
                          placeholder="e.g. 1234 or secret"
                          className="w-full text-xs px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-sky-400"
                          required
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateRoomModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingRoom}
                    className="px-5 py-2 rounded-xl text-xs font-bold shadow-md"
                    style={{
                      backgroundColor: 'var(--color-accent)',
                      color: '#090e17',
                    }}
                  >
                    {creatingRoom ? 'Creating...' : 'Create Room'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Check room lock access
  const isCreator = currentRoom.creatorId === currentUser?.uid;
  const isInvited = currentRoom.invitedUserIds?.includes(currentUser?.uid || '');
  const isUnlockedByPasscode = unlockedRooms[currentRoom.roomId];

  const hasAccess =
    !currentRoom.isLocked ||
    isCreator ||
    isAdmin ||
    (currentRoom.lockType === 'passcode' && isUnlockedByPasscode) ||
    (currentRoom.lockType === 'invite_only' && isInvited);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Top Header with Back to Chatroom Page and Room Info (No Dropdown) */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between shrink-0"
        style={{
          borderColor: 'var(--border-app)',
          backgroundColor: 'var(--bg-card)',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToRoomList}
            className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-bold"
            title="Back to Chatrooms"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Chatrooms</span>
          </button>

          <div className="h-5 w-px bg-white/10" />

          {/* Current Room Info (Clean, No Dropdown) */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs bg-white/10 text-white">
              {currentRoom.icon || '#'}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-bold text-sm text-white">#{currentRoom.name}</h2>
                {currentRoom.isLocked && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Lock size={10} />
                    <span>{currentRoom.lockType === 'passcode' ? 'Passcode Locked' : 'Invite Only'}</span>
                  </span>
                )}
              </div>
              {currentRoom.description && (
                <p className="text-[11px] text-slate-400 truncate max-w-xs">{currentRoom.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Room Header Actions */}
        <div className="flex items-center gap-2">
          {hasAccess && isCreator && currentRoom.lockType === 'invite_only' && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/15 text-white flex items-center gap-1.5 transition-colors"
            >
              <UserPlus size={14} className="text-sky-400" />
              <span className="hidden sm:inline">Invite Member</span>
            </button>
          )}

          <button
            onClick={() => setShowCreateRoomModal(true)}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Create another room"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Main Area: Locked Screen vs Active Chat */}
      {!hasAccess ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full p-8 rounded-3xl border space-y-4 shadow-2xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-app)' }}>
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <Lock size={32} />
            </div>

            <h3 className="text-xl font-bold text-white">This Room is Locked</h3>
            <p className="text-xs text-slate-400">
              {currentRoom.lockType === 'passcode'
                ? 'This chatroom requires a passcode to enter. Enter the passcode below to join the chat.'
                : 'This chatroom is invite-only. You must be invited by the room creator to participate.'}
            </p>

            {currentRoom.lockType === 'passcode' ? (
              <form onSubmit={handleUnlockWithPasscode} className="space-y-3 pt-2">
                <div className="relative">
                  <KeyRound size={15} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    value={passcodeInput}
                    onChange={(e) => setPasscodeInput(e.target.value)}
                    placeholder="Enter room passcode..."
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-sky-400"
                    autoFocus
                  />
                </div>
                {passcodeError && (
                  <p className="text-xs text-red-400 font-semibold">{passcodeError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onBackToRoomList}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-400 bg-white/5 hover:bg-white/10"
                  >
                    Back to Chatrooms
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                    style={{
                      backgroundColor: 'var(--color-accent)',
                      color: '#090e17',
                    }}
                  >
                    Unlock Room
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={onBackToRoomList}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-white/10 hover:bg-white/15"
              >
                Back to Chatrooms
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Messages Thread */
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <Hash size={36} className="mx-auto text-slate-600" />
                <h4 className="text-base font-bold text-slate-400">Welcome to #{currentRoom.name}!</h4>
                <p className="text-xs max-w-sm mx-auto">This is the start of the #{currentRoom.name} chatroom.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isSelf = msg.senderId === currentUser?.uid;
                const canDelete = isAdmin || isSelf;

                return (
                  <div
                    key={msg.messageId}
                    className={`flex gap-3 group ${isSelf ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isSelf && (
                      <button
                        onClick={() => onOpenProfile(msg.senderUsername)}
                        className="shrink-0 self-end mb-1"
                      >
                        <img
                          src={msg.senderPhotoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                          alt={msg.senderUsername}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      </button>
                    )}

                    <div
                      className={`max-w-[80%] sm:max-w-[70%] rounded-2xl p-3 shadow-md relative ${
                        isSelf ? 'rounded-br-sm' : 'rounded-bl-sm'
                      }`}
                      style={{
                        backgroundColor: isSelf ? 'var(--bubble-self)' : 'var(--bubble-other)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <button
                          onClick={() => onOpenProfile(msg.senderUsername)}
                          className="font-bold text-xs hover:underline flex items-center gap-1"
                          style={{ color: isSelf ? 'var(--name-self)' : 'var(--name-other)' }}
                        >
                          <span>{msg.senderDisplayName || msg.senderUsername}</span>
                          <UserBadge
                            username={msg.senderUsername}
                            displayName={msg.senderDisplayName}
                            role={msg.senderRole}
                            size="sm"
                          />
                        </button>
                        <span className="text-[10px] text-slate-400">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {msg.text && <p className="text-xs whitespace-pre-wrap leading-relaxed">{msg.text}</p>}

                      {msg.imageUrl && (
                        <div className="mt-2 rounded-xl overflow-hidden max-h-72 border border-white/10">
                          <img src={msg.imageUrl} alt="attachment" className="max-h-72 object-cover w-full" />
                        </div>
                      )}

                      {canDelete && (
                        <button
                          onClick={() => handleDeleteMessage(msg.messageId, msg.senderId)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-black/30 text-slate-400 hover:text-red-400 transition-opacity"
                          title="Delete message"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    {isSelf && (
                      <button
                        onClick={() => onOpenProfile(msg.senderUsername)}
                        className="shrink-0 self-end mb-1"
                      >
                        <img
                          src={msg.senderPhotoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                          alt={msg.senderUsername}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      </button>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Composer Input */}
          <div className="p-3 sm:p-4 border-t shrink-0" style={{ borderColor: 'var(--border-app)', backgroundColor: 'var(--bg-card)' }}>
            {attachedImage && (
              <div className="relative mb-2 w-fit rounded-xl overflow-hidden border border-white/20">
                <img src={attachedImage} alt="attachment preview" className="max-h-24 object-cover" />
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
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={Boolean(userProfile?.isSuspended)}
                className="p-2.5 rounded-full text-slate-400 hover:text-sky-400 hover:bg-white/5 transition-colors disabled:opacity-40"
                title="Attach photo"
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
                    ? 'Your account is suspended. Chatting is disabled.'
                    : `Message #${currentRoom.name}`
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
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl p-6 border space-y-4 shadow-2xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-app)' }}>
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-sm text-white">Invite to #{currentRoom.name}</h3>
              <button onClick={() => setShowInviteModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            {inviteSuccess && <p className="text-xs text-emerald-400 font-semibold">{inviteSuccess}</p>}
            {inviteError && <p className="text-xs text-red-400 font-semibold">{inviteError}</p>}

            <form onSubmit={handleInviteUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Username</label>
                <input
                  type="text"
                  value={inviteInput}
                  onChange={(e) => setInviteInput(e.target.value)}
                  placeholder="e.g. A321-251N"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-sky-400"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: '#090e17',
                  }}
                >
                  Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
