import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserBadge } from './UserBadge';
import {
  ArrowLeft,
  Search,
  ShieldAlert,
  HelpCircle,
  MessageSquare,
  Pin,
  Lock,
  ExternalLink,
  Plus,
  Send,
  CheckCircle2,
  Ban,
  Clock,
  Sparkles,
  X
} from 'lucide-react';

interface SafetyHelpForumsProps {
  onBackToApp: () => void;
  onNavigateAppeal?: (type: 'suspension' | 'ban') => void;
}

interface ForumTopic {
  id: string;
  category: 'guidelines' | 'suspensions' | 'bans' | 'security' | 'general';
  title: string;
  author: string;
  authorRole: 'admin' | 'mod' | 'user';
  isPinned?: boolean;
  repliesCount: number;
  viewsCount: number;
  lastActivity: string;
  content: string;
  appealType?: 'suspension' | 'ban';
}

const DEFAULT_FORUM_TOPICS: ForumTopic[] = [
  {
    id: 'topic-1',
    category: 'guidelines',
    title: 'Chatter Community Guidelines & Safety Rules (Official)',
    author: 'Neo',
    authorRole: 'admin',
    isPinned: true,
    repliesCount: 42,
    viewsCount: 1850,
    lastActivity: '1 hour ago',
    content: `Welcome to Chatter! Our mission is to maintain a safe, welcoming, and expressive community for everyone. 

Core Rules:
1. No Harassment or Bullying: Targeted abuse, threats, and toxic conduct are strictly prohibited.
2. No Hate Speech: Attacks based on race, ethnicity, origin, religion, disability, gender, or orientation result in immediate suspension or permanent ban.
3. Respect Chatroom Privacy: Respect moderators and obey rules set by locked chatroom creators.
4. No Malicious Spam or Flooding: Excessive botting, repetitive text spam, or scam links will lead to automated restriction.
5. Community Protection: Use the in-app reporting button on user profiles to alert @Neo and moderators about scams or abusive behavior.`,
  },
  {
    id: 'topic-2',
    category: 'suspensions',
    title: 'Account Suspensions: How They Work & Filing an Appeal',
    author: 'Neo',
    authorRole: 'admin',
    isPinned: true,
    appealType: 'suspension',
    repliesCount: 28,
    viewsCount: 1420,
    lastActivity: '3 hours ago',
    content: `When an account on Chatter is suspended:
- You are placed in Read-Only Mode: You can view posts and rooms, but you cannot chat, like, comment, or publish posts.
- Suspensions can be temporary (1 to 24 hours, or until a specific calendar date) or indefinite.
- Your profile displays "This Account Is Suspended" to other users.

How to Appeal:
If you believe your account was suspended due to a misunderstanding, you can submit a Suspension Appeal directly through our appeals form. Our moderation team reviews all appeals promptly.`,
  },
  {
    id: 'topic-3',
    category: 'bans',
    title: 'Permanent Account Bans: Policies, Enforcements & Appeals',
    author: 'Neo',
    authorRole: 'admin',
    isPinned: true,
    appealType: 'ban',
    repliesCount: 19,
    viewsCount: 980,
    lastActivity: 'Yesterday',
    content: `Account bans are the highest level of punishment on Chatter.
- Triggered by: Severe harassment, repeated guideline infractions, dangerous content, or ban evasion.
- An account ban terminates login access.
- When an account is banned, a full-screen notice is displayed stating the ban status with a link to submit a formal appeal.

To submit a Ban Appeal, click the Appeal button below or visit the Ban Appeal form.`,
  },
  {
    id: 'topic-4',
    category: 'security',
    title: 'Account Security: Passwords, 2FA & Protecting Your Handle',
    author: 'Neo',
    authorRole: 'admin',
    isPinned: true,
    repliesCount: 15,
    viewsCount: 760,
    lastActivity: '2 days ago',
    content: `Protecting your Chatter account is critical:
- Use unique, high-strength passwords with uppercase, lowercase, numbers, and special symbols.
- Never share your password with anyone; staff and @Neo will never ask for your password.
- Manage active sessions and update credentials in Settings -> Security.`,
  },
  {
    id: 'topic-5',
    category: 'general',
    title: 'How do locked chatrooms with passcodes work?',
    author: 'cyber_voyager',
    authorRole: 'user',
    repliesCount: 9,
    viewsCount: 340,
    lastActivity: '4 hours ago',
    content: `I wanted to know how creators set up locked rooms. Is the passcode stored safely and how do invited members bypass the passcode prompt?

Staff response: Creators can set locked rooms to passcode-protected or invite-only. If invite-only, the creator adds user IDs directly so invited users enter automatically without needing a passcode.`,
  },
  {
    id: 'topic-6',
    category: 'general',
    title: 'Tips for using custom themes & color palettes in Chatter',
    author: 'neon_rider',
    authorRole: 'mod',
    repliesCount: 14,
    viewsCount: 512,
    lastActivity: '5 hours ago',
    content: `Here are tips for getting the best look out of Chatter's customization engine:
- Try 'Cyberpunk' or 'Sunset Orange' for bold contrast.
- Custom hex color changes apply across the feed, sidebar, and direct messages in real time!`,
  },
];

export const SafetyHelpForums: React.FC<SafetyHelpForumsProps> = ({
  onBackToApp,
  onNavigateAppeal,
}) => {
  const { userProfile, currentUser } = useAuth();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<ForumTopic | null>(null);

  // New topic modal
  const [showNewTopicModal, setShowNewTopicModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'guidelines' | 'suspensions' | 'bans' | 'security' | 'general'>('general');
  const [newContent, setNewContent] = useState('');
  const [topics, setTopics] = useState<ForumTopic[]>(DEFAULT_FORUM_TOPICS);

  // Quick reply inside topic
  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState<{ id: string; author: string; authorRole: string; content: string; time: string }[]>([
    {
      id: 'rep-1',
      author: 'moderator_alex',
      authorRole: 'mod',
      content: 'Thank you for following these guidelines! Our goal is to make Chatter safe and enjoyable for all.',
      time: '2 hours ago',
    },
  ]);

  const filteredTopics = topics.filter((t) => {
    const matchesCategory = activeCategory === 'all' || t.category === activeCategory;
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const created: ForumTopic = {
      id: `topic-${Date.now()}`,
      category: newCategory,
      title: newTitle.trim(),
      author: userProfile?.username || 'anonymous',
      authorRole: userProfile?.role || 'user',
      repliesCount: 0,
      viewsCount: 1,
      lastActivity: 'Just now',
      content: newContent.trim(),
    };

    setTopics([created, ...topics]);
    setNewTitle('');
    setNewContent('');
    setShowNewTopicModal(false);
  };

  const handleAddReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setReplies([
      ...replies,
      {
        id: `rep-${Date.now()}`,
        author: userProfile?.username || 'user',
        authorRole: userProfile?.role || 'user',
        content: replyText.trim(),
        time: 'Just now',
      },
    ]);
    setReplyText('');
  };

  return (
    <div
      className="min-h-screen flex flex-col select-none"
      style={{
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Top Header Bar */}
      <header
        className="sticky top-0 z-40 px-4 sm:px-8 py-3.5 border-b backdrop-blur-md flex items-center justify-between"
        style={{
          borderColor: 'var(--border-app)',
          backgroundColor: 'rgba(9, 14, 23, 0.85)',
        }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToApp}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Return to Chatter</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-black text-sm">
              C
            </span>
            <h1 className="text-base sm:text-lg font-black text-white">Safety & Help Forums</h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowNewTopicModal(true)}
            className="px-4 py-2 rounded-full text-xs font-bold shadow-md transition-transform hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: '#090e17',
            }}
          >
            <Plus size={15} />
            <span className="hidden sm:inline">New Topic</span>
          </button>
        </div>
      </header>

      {/* Main Forum Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {selectedTopic ? (
          /* Single Topic Discussion View */
          <div className="space-y-5">
            <button
              onClick={() => setSelectedTopic(null)}
              className="flex items-center gap-2 text-xs font-bold text-sky-400 hover:underline cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to all forum topics</span>
            </button>

            <article
              className="p-6 rounded-3xl border shadow-xl space-y-4"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-app)',
              }}
            >
              <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  {selectedTopic.isPinned && (
                    <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                      <Pin size={11} /> Pinned
                    </span>
                  )}
                  <span className="text-xs uppercase font-extrabold text-sky-400 tracking-wider">
                    {selectedTopic.category}
                  </span>
                </div>
                <div className="text-xs text-slate-400">{selectedTopic.lastActivity}</div>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-white">{selectedTopic.title}</h1>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Posted by</span>
                <UserBadge
                  username={selectedTopic.author}
                  displayName={selectedTopic.author}
                  role={selectedTopic.authorRole}
                  size="sm"
                />
              </div>

              <div className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap pt-2">
                {selectedTopic.content}
              </div>

              {/* Appeal Action inside topic if relevant */}
              {selectedTopic.appealType && onNavigateAppeal && (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mt-4 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-white">Need to submit a formal appeal?</h4>
                    <p className="text-[11px] text-slate-400">
                      Our moderation team and @Neo review every appeal thoroughly.
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigateAppeal(selectedTopic.appealType!)}
                    className="px-5 py-2 rounded-full text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Open {selectedTopic.appealType === 'ban' ? 'Ban' : 'Suspension'} Appeal Form</span>
                    <ExternalLink size={13} />
                  </button>
                </div>
              )}
            </article>

            {/* Replies section */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageSquare size={16} className="text-sky-400" />
                <span>Discussion ({replies.length})</span>
              </h3>

              <div className="space-y-3">
                {replies.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-4 rounded-2xl border space-y-2"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      borderColor: 'var(--border-app)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <UserBadge username={rep.author} displayName={rep.author} role={rep.authorRole} size="sm" />
                      <span className="text-[10px] text-slate-500">{rep.time}</span>
                    </div>
                    <p className="text-xs text-slate-200 whitespace-pre-wrap">{rep.content}</p>
                  </div>
                ))}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleAddReply} className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Post a reply in this forum topic..."
                  className="flex-1 text-xs px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="px-5 py-2 rounded-full text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 transition-all disabled:opacity-40 cursor-pointer"
                >
                  Reply
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Forum Topics List & Search View */
          <div className="space-y-6">
            {/* Search and Category Banner */}
            <div
              className="p-6 sm:p-8 rounded-3xl border shadow-xl relative overflow-hidden space-y-4"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-app)',
              }}
            >
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Welcome to Chatter Community Forums
                </h2>
                <p className="text-xs text-slate-400">
                  Read official safety standards, learn how enforcement works, discuss questions, or appeal penalties.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative max-w-lg">
                <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search forum topics, guidelines, appeals, questions..."
                  className="w-full text-xs pl-10 pr-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition-colors"
                />
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  { id: 'all', label: 'All Topics' },
                  { id: 'guidelines', label: 'Rules & Guidelines' },
                  { id: 'suspensions', label: 'Suspensions & FAQ' },
                  { id: 'bans', label: 'Account Bans' },
                  { id: 'security', label: 'Security & 2FA' },
                  { id: 'general', label: 'Community Q&A' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      activeCategory === cat.id
                        ? 'bg-sky-500 text-slate-950 shadow-sm'
                        : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Topics Stream */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1 text-xs text-slate-400 font-semibold">
                <span>Discussion Topics ({filteredTopics.length})</span>
              </div>

              {filteredTopics.map((topic) => (
                <div
                  key={topic.id}
                  onClick={() => setSelectedTopic(topic)}
                  className="p-4 sm:p-5 rounded-2xl border transition-all hover:bg-white/[0.03] cursor-pointer flex items-center justify-between gap-4 group"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: topic.isPinned ? 'rgba(234, 179, 8, 0.3)' : 'var(--border-app)',
                  }}
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {topic.isPinned && (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                          <Pin size={10} /> Pinned
                        </span>
                      )}
                      <span className="text-[10px] uppercase font-black text-sky-400">
                        {topic.category}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-sky-400 transition-colors truncate">
                      {topic.title}
                    </h3>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 truncate">
                      <span>By</span>
                      <UserBadge
                        username={topic.author}
                        displayName={topic.author}
                        role={topic.authorRole}
                        size="sm"
                      />
                      <span>·</span>
                      <span>{topic.lastActivity}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* New Topic Modal */}
      {showNewTopicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div
            className="w-full max-w-lg rounded-3xl p-6 shadow-2xl border space-y-4"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-app)',
              color: 'var(--text-primary)',
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-app)' }}>
              <h3 className="font-bold text-sm text-white">Create a New Forum Topic</h3>
              <button
                onClick={() => setShowNewTopicModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTopic} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Topic Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="What is your topic or question?"
                  required
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none"
                >
                  <option value="general">Community Q&A</option>
                  <option value="guidelines">Rules & Guidelines</option>
                  <option value="suspensions">Suspensions & Enforcement</option>
                  <option value="security">Account Security</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Details & Message</label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={4}
                  required
                  placeholder="Explain your question or topic in detail..."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTopicModal(false)}
                  className="px-4 py-2 rounded-full text-xs font-bold text-slate-300 bg-white/10 hover:bg-white/15"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim() || !newContent.trim()}
                  className="px-5 py-2 rounded-full text-xs font-bold transition-all disabled:opacity-40"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: '#090e17',
                  }}
                >
                  Publish Topic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
