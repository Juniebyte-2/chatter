import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserBadge } from './UserBadge';
import {
  Home,
  MessageSquare,
  User,
  Settings,
  Shield,
  HelpCircle,
  LogOut,
  PenSquare,
  Mail,
  ChevronLeft,
  ChevronRight,
  Users
} from 'lucide-react';

interface TwitterNavSidebarProps {
  activeView: 'feed' | 'chat' | 'messages' | 'profile' | 'communities';
  onSelectFeed: () => void;
  onSelectMessages: () => void;
  onSelectChatrooms: () => void;
  onSelectCommunities: () => void;
  onOpenSettings: (tab?: 'customization' | 'account' | 'security') => void;
  onOpenProfile: (username: string) => void;
  onOpenAdminPanel: () => void;
  onNavigateHelp: (path: string) => void;
  onOpenSuspensionNotice?: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const TwitterNavSidebar: React.FC<TwitterNavSidebarProps> = ({
  activeView,
  onSelectFeed,
  onSelectMessages,
  onSelectChatrooms,
  onSelectCommunities,
  onOpenSettings,
  onOpenProfile,
  onOpenAdminPanel,
  onNavigateHelp,
  onOpenSuspensionNotice,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { userProfile, logout, isModOrAdmin } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Expandable / Minimized state (persisted in localStorage)
  const [isMinimized, setIsMinimized] = useState(() => {
    try {
      return localStorage.getItem('chatter_sidebar_minimized') === 'true';
    } catch {
      return false;
    }
  });

  const toggleMinimize = () => {
    setIsMinimized((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('chatter_sidebar_minimized', String(next));
      } catch {}
      return next;
    });
  };

  const navItems = [
    {
      id: 'feed',
      label: 'Home',
      icon: Home,
      action: onSelectFeed,
      active: activeView === 'feed',
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: Mail,
      action: onSelectMessages,
      active: activeView === 'messages',
    },
    {
      id: 'chat',
      label: 'Chatrooms',
      icon: MessageSquare,
      action: onSelectChatrooms,
      active: activeView === 'chat',
    },
    {
      id: 'communities',
      label: 'Communities',
      icon: Users,
      action: onSelectCommunities,
      active: activeView === 'communities',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      action: () => userProfile && onOpenProfile(userProfile.username),
      active: activeView === 'profile',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      action: () => onOpenSettings('customization'),
      active: false,
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between p-3 sm:p-4 select-none">
      {/* Top Section: Real Logo & Navigation Links */}
      <div className="space-y-5">
        {/* Brand Name / Logo: "Chatter" when expanded, just "C" when minimized */}
        {isMinimized ? (
          <div className="flex flex-col items-center gap-2 pt-1">
            <button
              onClick={() => {
                onSelectFeed();
                onCloseMobile();
              }}
              className="w-11 h-11 rounded-2xl hover:bg-white/10 flex items-center justify-center transition-colors group cursor-pointer"
              title="Chatter - Return Home"
            >
              <span className="font-black text-2xl tracking-tight text-white group-hover:text-sky-400 transition-colors font-sans">
                C
              </span>
            </button>

            <button
              onClick={toggleMinimize}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors hidden md:flex items-center justify-center cursor-pointer"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-2 pt-1">
            <button
              onClick={() => {
                onSelectFeed();
                onCloseMobile();
              }}
              className="text-left py-2 px-3 -mx-2 rounded-2xl hover:bg-white/5 transition-colors group cursor-pointer"
              title="Chatter - Return Home"
            >
              <span className="font-black text-2xl tracking-tight text-white group-hover:text-sky-400 transition-colors font-sans">
                Chatter
              </span>
            </button>

            <button
              onClick={toggleMinimize}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors hidden md:flex items-center justify-center cursor-pointer"
              title="Minimize sidebar"
              aria-label="Minimize sidebar"
            >
              <ChevronLeft size={18} />
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  item.action();
                  onCloseMobile();
                }}
                title={item.label}
                className={`w-full flex items-center transition-all text-left group cursor-pointer ${
                  isMinimized
                    ? 'justify-center p-3 rounded-2xl'
                    : 'gap-4 px-4 py-3 rounded-full text-base font-bold'
                } ${
                  item.active
                    ? 'text-white bg-white/10 font-black'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="relative shrink-0">
                  <Icon
                    size={22}
                    className={`transition-transform group-hover:scale-110 duration-200 ${
                      item.active ? 'text-sky-400' : 'text-slate-400 group-hover:text-white'
                    }`}
                  />
                  {item.active && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                      style={{ backgroundColor: 'var(--color-accent)' }}
                    />
                  )}
                </div>
                {!isMinimized && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}

          {/* Admin & Moderation Panel link */}
          {isModOrAdmin && (
            <button
              onClick={() => {
                onOpenAdminPanel();
                onCloseMobile();
              }}
              title="Moderation"
              className={`w-full flex items-center transition-all text-left group cursor-pointer text-amber-300 hover:bg-amber-500/10 ${
                isMinimized
                  ? 'justify-center p-3 rounded-2xl'
                  : 'gap-4 px-4 py-3 rounded-full text-base font-bold'
              }`}
            >
              <Shield size={22} className="text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
              {!isMinimized && <span>Moderation</span>}
            </button>
          )}

          {/* Safety & Help Center link: leads to forums page */}
          <button
            onClick={() => {
              onNavigateHelp('/forums');
              onCloseMobile();
            }}
            title="Safety & Help Forums"
            className={`w-full flex items-center transition-all text-left group cursor-pointer text-slate-400 hover:text-white hover:bg-white/5 ${
              isMinimized
                ? 'justify-center p-3 rounded-2xl'
                : 'gap-4 px-4 py-3 rounded-full text-base font-bold'
            }`}
          >
            <HelpCircle size={22} className="text-slate-400 group-hover:scale-110 transition-transform shrink-0" />
            {!isMinimized && <span>Safety & Help</span>}
          </button>
        </nav>

        {/* Quick Post / Tweet Button */}
        <div className="pt-2">
          {isMinimized ? (
            <button
              onClick={() => {
                if (userProfile?.isSuspended) {
                  if (onOpenSuspensionNotice) {
                    onOpenSuspensionNotice();
                  } else {
                    alert('Your account is currently suspended and cannot create posts.');
                  }
                  onCloseMobile();
                  return;
                }
                onSelectFeed();
                onCloseMobile();
              }}
              className="w-12 h-12 mx-auto rounded-2xl font-black flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: '#090e17',
              }}
              title="Post"
            >
              <PenSquare size={20} className="shrink-0" />
            </button>
          ) : (
            <button
              onClick={() => {
                if (userProfile?.isSuspended) {
                  if (onOpenSuspensionNotice) {
                    onOpenSuspensionNotice();
                  } else {
                    alert('Your account is currently suspended and cannot create posts.');
                  }
                  onCloseMobile();
                  return;
                }
                onSelectFeed();
                onCloseMobile();
              }}
              className="w-full py-3.5 px-4 rounded-full font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: '#090e17',
              }}
            >
              <PenSquare size={18} className="shrink-0" />
              <span>Post</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Section: User Profile Card & Logout */}
      <div className="pt-4 border-t border-white/10 space-y-2">
        {isMinimized ? (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => {
                if (userProfile) onOpenProfile(userProfile.username);
                onCloseMobile();
              }}
              className="w-10 h-10 rounded-full overflow-hidden hover:ring-2 hover:ring-sky-400 transition-all shrink-0 cursor-pointer"
              title={userProfile ? `@${userProfile.username}` : 'Profile'}
            >
              <img
                src={userProfile?.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                alt={userProfile?.username || 'user'}
                className="w-full h-full object-cover"
              />
            </button>

            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              title="Log out"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-2 rounded-2xl hover:bg-white/5 transition-colors">
            <button
              onClick={() => {
                if (userProfile) onOpenProfile(userProfile.username);
                onCloseMobile();
              }}
              className="flex items-center gap-3 min-w-0 text-left flex-1 cursor-pointer"
            >
              <img
                src={userProfile?.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                alt={userProfile?.username || 'user'}
                className="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0"
              />
              <div className="min-w-0">
                <UserBadge
                  username={userProfile?.username || ''}
                  displayName={userProfile?.displayName || ''}
                  role={userProfile?.role}
                  isSelf={true}
                  size="sm"
                />
                <p className="text-xs text-slate-400 truncate">@{userProfile?.username}</p>
              </div>
            </button>

            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              title="Log out"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Sidebar aside element: smoothly transitions between expanded (w-64) and minimized (w-20) */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out border-r shrink-0 ${
          isOpenMobile
            ? 'translate-x-0 w-72'
            : `-translate-x-full md:translate-x-0 ${isMinimized ? 'md:w-20' : 'md:w-64'}`
        }`}
        style={{
          backgroundColor: 'var(--bg-sidebar)',
          borderColor: 'var(--border-app)',
        }}
      >
        {sidebarContent}
      </aside>

      {/* Full-Screen Logout Confirmation Popup Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[200] w-screen h-screen bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in">
          <div
            className="w-full max-w-sm rounded-3xl p-6 sm:p-8 border space-y-5 shadow-2xl text-center relative overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-app)',
              color: 'var(--text-primary)',
            }}
          >
            {/* Chatter Brand Icon */}
            <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 font-black text-xl flex items-center justify-center mx-auto border border-sky-400/30">
              C
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-white">Log out of Chatter?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                You can always log back in at any time. If you just want to switch accounts, you can do that by adding an existing account.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
                className="w-full py-3 rounded-full text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                Log Out
              </button>

              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full py-3 rounded-full text-xs font-bold text-slate-300 border border-white/20 hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
