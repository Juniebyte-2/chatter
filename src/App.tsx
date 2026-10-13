import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TwitterNavSidebar } from './components/TwitterNavSidebar';
import { ChatArea } from './components/ChatArea';
import { TwitterProfile } from './components/TwitterProfile';
import { TwitterHomeFeed } from './components/TwitterHomeFeed';
import { DirectMessages } from './components/DirectMessages';
import { TwitterPostDetailPage } from './components/TwitterPostDetailPage';
import { SettingsModal } from './components/SettingsModal';
import { AdminNotificationsPanel } from './components/AdminNotificationsPanel';
import { AuthScreen } from './components/AuthScreen';
import { HelpAndAppeals } from './components/HelpAndAppeals';
import { SafetyHelpForums } from './components/SafetyHelpForums';
import { BannedNoticeModal } from './components/BannedNoticeModal';
import { RedditCommunities } from './components/RedditCommunities';
import { Chatroom } from './types';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { Menu, ShieldAlert, ArrowLeft, Home, Ban } from 'lucide-react';

function MainApp() {
  const { currentUser, userProfile, loading, logout } = useAuth();

  // Navigation states: ALWAYS OPENS UP TO HOMEPAGE
  const [activeView, setActiveView] = useState<'feed' | 'chat' | 'messages' | 'profile' | 'post' | 'communities'>('feed');
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [activeCommunityId, setActiveCommunityId] = useState<string | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Chatroom | null>(null);
  const [viewingProfileUsername, setViewingProfileUsername] = useState<string | null>(null);
  const [directMessageTargetUserId, setDirectMessageTargetUserId] = useState<string | null>(null);
  const [helpPath, setHelpPath] = useState<string | null>(null);
  const [chatrooms, setChatrooms] = useState<Chatroom[]>([]);

  // Modals
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'customization' | 'account' | 'security' | 'profile-css'>('customization');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showSuspensionModal, setShowSuspensionModal] = useState(false);
  const [showBannedModal, setShowBannedModal] = useState(false);

  // Guarantee it always opens up to homepage
  useEffect(() => {
    setActiveView('feed');
    setActivePostId(null);
    setViewingProfileUsername(null);
    setHelpPath(null);
  }, [currentUser?.uid]);

  const handleOpenPost = (postId: string) => {
    setActivePostId(postId);
    setActiveView('post');
    setViewingProfileUsername(null);
  };

  // Show ban notice modal if account is banned
  useEffect(() => {
    if (userProfile?.isBanned) {
      setShowBannedModal(true);
    }
  }, [userProfile?.isBanned]);

  // Show suspension notice modal on load if account is suspended
  useEffect(() => {
    if (userProfile?.isSuspended && !userProfile?.isBanned) {
      setShowSuspensionModal(true);
    }
  }, [userProfile?.isSuspended, userProfile?.isBanned]);

  // Real-time listener for chatrooms
  useEffect(() => {
    const q = query(collection(db, 'chatrooms'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const rooms: Chatroom[] = [];
      snapshot.forEach((d) => {
        rooms.push({ roomId: d.id, ...d.data() } as Chatroom);
      });
      setChatrooms(rooms);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Loading Chatter...</p>
        </div>
      </div>
    );
  }

  // Safety & Help Forums / Appeals view (can be accessed while logged out or in)
  if (helpPath === '/forums' || helpPath === '/help/forums') {
    return (
      <SafetyHelpForums
        onBackToApp={() => setHelpPath(null)}
        onNavigateAppeal={(type) =>
          setHelpPath(type === 'ban' ? '/forms/appealforms/banappeal' : '/forms/appealforms/suspensionappeal')
        }
      />
    );
  }

  if (helpPath) {
    return (
      <HelpAndAppeals
        currentPath={helpPath}
        onNavigate={(path) => setHelpPath(path)}
        onBackToApp={() => setHelpPath(null)}
        defaultUsername={userProfile?.username || ''}
      />
    );
  }

  // If user is not logged in: show Auth Screen
  if (!currentUser) {
    return <AuthScreen onNavigateHelp={(path) => setHelpPath(path)} />;
  }

  return (
    <div
      className="h-screen w-screen flex flex-col md:flex-row overflow-hidden select-none"
      style={{
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Mobile Top Header */}
      <div
        className="md:hidden flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{
          borderColor: 'var(--border-app)',
          backgroundColor: 'var(--bg-sidebar)',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white"
          >
            <Menu size={20} />
          </button>
          <button
            onClick={() => {
              setActiveView('feed');
              setViewingProfileUsername(null);
            }}
            className="font-black text-xl tracking-tight text-white hover:text-sky-400 transition-colors font-sans"
            title="Chatter - Return Home"
          >
            Chatter
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeView !== 'feed' && (
            <button
              onClick={() => {
                setActiveView('feed');
                setViewingProfileUsername(null);
              }}
              className="text-xs font-semibold text-sky-400 flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/5"
            >
              <Home size={14} />
              <span>Feed</span>
            </button>
          )}

          {viewingProfileUsername && (
            <button
              onClick={() => setViewingProfileUsername(null)}
              className="text-xs font-semibold text-slate-300 flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
          )}
        </div>
      </div>

      {/* Twitter/X Clean Navigation Sidebar (Side chatroom bar removed) */}
      <TwitterNavSidebar
        activeView={activeView === 'post' ? 'feed' : viewingProfileUsername ? 'profile' : activeView}
        onSelectFeed={() => {
          setActiveView('feed');
          setActivePostId(null);
          setViewingProfileUsername(null);
          setDirectMessageTargetUserId(null);
        }}
        onSelectMessages={() => {
          setActiveView('messages');
          setActivePostId(null);
          setViewingProfileUsername(null);
          setDirectMessageTargetUserId(null);
        }}
        onSelectChatrooms={() => {
          setActiveView('chat');
          setActivePostId(null);
          setViewingProfileUsername(null);
          setDirectMessageTargetUserId(null);
        }}
        onSelectCommunities={() => {
          setActiveView('communities');
          setActiveCommunityId(null);
          setActivePostId(null);
          setViewingProfileUsername(null);
          setDirectMessageTargetUserId(null);
        }}
        onOpenSettings={(tab) => {
          setSettingsTab(tab || 'customization');
          setShowSettings(true);
        }}
        onOpenProfile={(username) => {
          setActivePostId(null);
          setViewingProfileUsername(username);
        }}
        onOpenAdminPanel={() => setShowAdminPanel(true)}
        onNavigateHelp={(path) => setHelpPath(path)}
        onOpenSuspensionNotice={() => setShowSuspensionModal(true)}
        isOpenMobile={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area: Expands to full screen width & height */}
      <main className="flex-1 flex flex-col min-w-0 w-full h-full overflow-hidden">
        {/* Read-only reminder banner when account is suspended */}
        {userProfile?.isSuspended && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between text-xs text-amber-300 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldAlert size={16} className="shrink-0 text-amber-400" />
              <span className="truncate">
                <strong>Account Suspended:</strong> You are in read-only mode. You cannot chat, like, comment, or post.
              </span>
            </div>
            <button
              onClick={() => setShowSuspensionModal(true)}
              className="font-bold underline hover:text-amber-200 text-xs shrink-0 ml-3 cursor-pointer"
            >
              View Notice
            </button>
          </div>
        )}

        {activeView === 'post' && activePostId ? (
          <TwitterPostDetailPage
            postId={activePostId}
            onBack={() => {
              setActivePostId(null);
              setActiveView('feed');
            }}
            onOpenProfile={(username) => {
              setActivePostId(null);
              setViewingProfileUsername(username);
            }}
          />
        ) : viewingProfileUsername ? (
          <TwitterProfile
            targetUsername={viewingProfileUsername}
            onBack={() => setViewingProfileUsername(null)}
            onNavigateHelp={(path) => setHelpPath(path)}
            onOpenSettings={(tab) => {
              setSettingsTab(tab || 'customization');
              setShowSettings(true);
            }}
            onDirectMessage={(targetUserId) => {
              setDirectMessageTargetUserId(targetUserId);
              setActiveView('messages');
              setViewingProfileUsername(null);
            }}
            onOpenPost={handleOpenPost}
          />
        ) : activeView === 'messages' ? (
          <DirectMessages
            initialTargetUserId={directMessageTargetUserId}
            onOpenProfile={(username) => setViewingProfileUsername(username)}
            onBackToFeed={() => {
              setActiveView('feed');
              setViewingProfileUsername(null);
              setDirectMessageTargetUserId(null);
            }}
          />
        ) : activeView === 'chat' ? (
          <ChatArea
            currentRoom={currentRoom}
            chatrooms={chatrooms}
            onSelectRoom={(room) => setCurrentRoom(room)}
            onOpenProfile={(username) => setViewingProfileUsername(username)}
            onBackToRoomList={() => setCurrentRoom(null)}
            onBackToFeed={() => {
              setActiveView('feed');
              setCurrentRoom(null);
              setViewingProfileUsername(null);
            }}
          />
        ) : activeView === 'communities' ? (
          <RedditCommunities
            onOpenProfile={(username) => setViewingProfileUsername(username)}
            onOpenPost={handleOpenPost}
            initialCommunityId={activeCommunityId}
          />
        ) : (
          <TwitterHomeFeed
            onOpenProfile={(username) => setViewingProfileUsername(username)}
            onOpenPost={handleOpenPost}
            onSelectRoom={(room) => {
              setCurrentRoom(room);
              setActiveView('chat');
            }}
            chatrooms={chatrooms}
          />
        )}
      </main>

      {/* Suspension Notice Modal with Return to Feed */}
      {showSuspensionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div
            className="max-w-md w-full p-6 sm:p-8 rounded-3xl border text-center space-y-5 shadow-2xl"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-app)' }}
          >
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
              <ShieldAlert size={32} />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-white">Your Account is Suspended</h2>
              <p className="text-xs text-slate-300">
                {userProfile?.suspendedUntil === 'indefinite'
                  ? 'Your account has been suspended indefinitely for violation of community guidelines.'
                  : `Your account is temporarily suspended until ${userProfile?.suspendedUntil ? new Date(userProfile.suspendedUntil).toLocaleString() : 'further notice'}.`}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left space-y-1.5">
              <p className="text-xs font-bold text-amber-300">Read-Only Mode Enabled</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                While your account is suspended, you can still view the feed and browse chatrooms, but you cannot chat, like, comment, or post.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => {
                  setShowSuspensionModal(false);
                  setActiveView('feed');
                  setViewingProfileUsername(null);
                }}
                className="w-full py-3 rounded-full text-xs font-bold shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: '#090e17',
                }}
              >
                Return to Feed
              </button>

              <button
                onClick={() => {
                  setShowSuspensionModal(false);
                  setHelpPath('/help/punishments/suspension');
                }}
                className="w-full py-2.5 rounded-full text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                Learn More & File an Appeal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal (Customization with 20 themes, Account with Deactivate/Delete, Security) */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        initialTab={settingsTab}
      />

      {/* Admin / Moderation Notifications Panel */}
      <AdminNotificationsPanel
        isOpen={showAdminPanel}
        onClose={() => setShowAdminPanel(false)}
        onOpenProfile={(username) => {
          setShowAdminPanel(false);
          setViewingProfileUsername(username);
        }}
      />

      {/* Banned User Notice Modal (covers whole screen) */}
      <BannedNoticeModal
        isOpen={showBannedModal}
        onNavigateHelp={(path) => {
          setShowBannedModal(false);
          setHelpPath(path);
        }}
        onLogout={logout}
        username={userProfile?.username}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
