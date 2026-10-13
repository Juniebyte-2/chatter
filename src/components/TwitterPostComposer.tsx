import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { PostPoll, PollOption } from '../types';
import {
  Image as ImageIcon,
  Clapperboard,
  BarChart2,
  Smile,
  MapPin,
  X,
  Plus
} from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';

interface TwitterPostComposerProps {
  placeholder?: string;
  buttonLabel?: string;
  onPostCreated: (data: {
    content: string;
    imageUrl?: string | null;
    gifUrl?: string | null;
    poll?: PostPoll | null;
    location?: string | null;
  }) => Promise<void>;
  compact?: boolean;
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

export const TwitterPostComposer: React.FC<TwitterPostComposerProps> = ({
  placeholder = "What is happening?!",
  buttonLabel = "Post",
  onPostCreated,
  compact = false,
}) => {
  const { currentUser, userProfile } = useAuth();
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);

  // Poll state
  const [showPollBuilder, setShowPollBuilder] = useState(false);
  const [pollChoices, setPollChoices] = useState<string[]>(['', '']);
  const [pollDays, setPollDays] = useState(1);

  // Drawers
  const [showGifDrawer, setShowGifDrawer] = useState(false);
  const [showEmojiDrawer, setShowEmojiDrawer] = useState(false);
  const [showLocationDrawer, setShowLocationDrawer] = useState(false);
  const [locationInput, setLocationInput] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image select
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    try {
      const comp = await compressImage(e.target.files[0], 1000, 1000, 0.75);
      setImageUrl(comp);
      setGifUrl(null);
    } catch {
      alert('Failed to process image');
    }
  };

  const handleAddChoice = () => {
    if (pollChoices.length < 4) {
      setPollChoices([...pollChoices, '']);
    }
  };

  const handleChoiceChange = (idx: number, val: string) => {
    const updated = [...pollChoices];
    updated[idx] = val;
    setPollChoices(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile) return;

    if (userProfile.isSuspended) {
      alert('Your account is currently suspended and cannot post.');
      return;
    }

    const trimmedContent = content.trim();

    // Check validity
    let constructedPoll: PostPoll | null = null;
    if (showPollBuilder) {
      const validChoices = pollChoices.map((c) => c.trim()).filter(Boolean);
      if (validChoices.length < 2) {
        alert('Please provide at least 2 choices for your poll.');
        return;
      }
      constructedPoll = {
        options: validChoices.map((c, i) => ({
          id: `opt_${i + 1}`,
          text: c,
          votes: [],
          votesCount: 0,
        })),
        totalVotes: 0,
        expiresAt: new Date(Date.now() + pollDays * 24 * 60 * 60 * 1000).toISOString(),
      };
    }

    if (!trimmedContent && !imageUrl && !gifUrl && !constructedPoll) {
      return;
    }

    setSubmitting(true);
    try {
      await onPostCreated({
        content: trimmedContent,
        imageUrl: imageUrl || null,
        gifUrl: gifUrl || null,
        poll: constructedPoll,
        location: location || null,
      });

      // Reset
      setContent('');
      setImageUrl(null);
      setGifUrl(null);
      setLocation(null);
      setShowPollBuilder(false);
      setPollChoices(['', '']);
      setShowGifDrawer(false);
      setShowEmojiDrawer(false);
      setShowLocationDrawer(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Error posting:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const isPostEmpty = !content.trim() && !imageUrl && !gifUrl && (!showPollBuilder || pollChoices.filter(c => c.trim()).length < 2);

  return (
    <form onSubmit={handleSubmit} className="p-4 border-b border-white/10 select-none">
      <div className="flex gap-3">
        <img
          src={userProfile?.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
          alt={userProfile?.username || 'user'}
          className="w-10 h-10 rounded-full object-cover shrink-0"
        />

        <div className="flex-1 min-w-0">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={Boolean(userProfile?.isSuspended)}
            placeholder={
              userProfile?.isSuspended
                ? 'Your account is suspended. Posting is disabled.'
                : placeholder
            }
            rows={compact ? 2 : 3}
            className="w-full bg-transparent resize-none border-none outline-none text-white text-sm sm:text-base placeholder-slate-500 leading-relaxed disabled:opacity-50"
          />

          {/* Location tag badge if present */}
          {location && (
            <div className="flex items-center gap-1.5 text-xs text-sky-400 bg-sky-500/10 px-3 py-1 rounded-full w-fit mb-3">
              <MapPin size={12} />
              <span>{location}</span>
              <button
                type="button"
                onClick={() => setLocation(null)}
                className="ml-1 hover:text-white cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Image preview */}
          {imageUrl && (
            <div className="relative mb-3 rounded-2xl overflow-hidden border border-white/10 max-h-72 w-fit">
              <img src={imageUrl} alt="Attached" className="max-h-72 object-cover rounded-2xl" />
              <button
                type="button"
                onClick={() => setImageUrl(null)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* GIF preview */}
          {gifUrl && (
            <div className="relative mb-3 rounded-2xl overflow-hidden border border-white/10 max-h-72 w-fit">
              <img src={gifUrl} alt="Attached GIF" className="max-h-72 object-cover rounded-2xl" />
              <button
                type="button"
                onClick={() => setGifUrl(null)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Interactive Poll Builder */}
          {showPollBuilder && (
            <div className="mb-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-sky-400 font-bold">
                <span className="flex items-center gap-1.5">
                  <BarChart2 size={15} />
                  Poll Options
                </span>
                <button
                  type="button"
                  onClick={() => setShowPollBuilder(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-2">
                {pollChoices.map((choice, i) => (
                  <input
                    key={i}
                    type="text"
                    value={choice}
                    onChange={(e) => handleChoiceChange(i, e.target.value)}
                    placeholder={`Choice ${i + 1}${i >= 2 ? ' (optional)' : ''}`}
                    maxLength={35}
                    className="w-full text-xs px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                  />
                ))}
              </div>

              {pollChoices.length < 4 && (
                <button
                  type="button"
                  onClick={handleAddChoice}
                  className="text-xs text-sky-400 font-bold hover:underline flex items-center gap-1 cursor-pointer pt-1"
                >
                  <Plus size={13} />
                  Add option
                </button>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-slate-400">
                <span>Poll length</span>
                <select
                  value={pollDays}
                  onChange={(e) => setPollDays(Number(e.target.value))}
                  className="bg-slate-900 border border-white/10 text-white rounded-lg px-2 py-1 text-xs focus:outline-none"
                >
                  <option value={1}>1 Day</option>
                  <option value={3}>3 Days</option>
                  <option value={7}>7 Days</option>
                </select>
              </div>
            </div>
          )}

          {/* GIF Picker drawer */}
          {showGifDrawer && (
            <div className="p-3 mb-3 rounded-2xl bg-slate-900 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-bold flex items-center gap-1.5">
                  <Clapperboard size={14} className="text-sky-400" />
                  Choose a GIF
                </span>
                <button
                  type="button"
                  onClick={() => setShowGifDrawer(false)}
                  className="text-slate-500 hover:text-white cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {SAMPLE_GIFS.map((g, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setGifUrl(g.url);
                      setImageUrl(null);
                      setShowGifDrawer(false);
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

          {/* Emoji Picker drawer */}
          {showEmojiDrawer && (
            <div className="p-2.5 mb-3 rounded-2xl bg-slate-900 border border-white/10 flex flex-wrap gap-2">
              {POPULAR_EMOJIS.map((emoji, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setContent((prev) => prev + emoji);
                    setShowEmojiDrawer(false);
                  }}
                  className="text-lg p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Location Drawer */}
          {showLocationDrawer && (
            <div className="flex items-center gap-2 mb-3 bg-slate-900 p-2 rounded-2xl border border-white/10">
              <MapPin size={14} className="text-sky-400 shrink-0 ml-1" />
              <input
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="Enter location tag (e.g. Neo's Matrix, San Francisco)..."
                className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (locationInput.trim()) setLocation(locationInput.trim());
                    setShowLocationDrawer(false);
                    setLocationInput('');
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (locationInput.trim()) setLocation(locationInput.trim());
                  setShowLocationDrawer(false);
                  setLocationInput('');
                }}
                className="px-3 py-1 bg-sky-500/20 text-sky-400 rounded-full text-xs font-bold hover:bg-sky-500/30 cursor-pointer"
              >
                Add
              </button>
            </div>
          )}

          {/* Bottom Toolbar: Identical Twitter Postable Options */}
          <div className="flex items-center justify-between pt-2.5 border-t border-white/10">
            <div className="flex items-center gap-1 text-sky-400">
              {/* Photo button */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageSelect}
                disabled={Boolean(userProfile?.isSuspended)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={Boolean(userProfile?.isSuspended)}
                className="p-2 rounded-full hover:bg-sky-500/10 transition-colors disabled:opacity-40 cursor-pointer"
                title="Media / Photo"
              >
                <ImageIcon size={19} />
              </button>

              {/* GIF button */}
              <button
                type="button"
                onClick={() => setShowGifDrawer((prev) => !prev)}
                disabled={Boolean(userProfile?.isSuspended)}
                className="p-2 rounded-full hover:bg-sky-500/10 transition-colors disabled:opacity-40 cursor-pointer"
                title="GIF"
              >
                <Clapperboard size={19} />
              </button>

              {/* Poll button */}
              <button
                type="button"
                onClick={() => setShowPollBuilder((prev) => !prev)}
                disabled={Boolean(userProfile?.isSuspended)}
                className="p-2 rounded-full hover:bg-sky-500/10 transition-colors disabled:opacity-40 cursor-pointer"
                title="Poll"
              >
                <BarChart2 size={19} />
              </button>

              {/* Emoji button */}
              <button
                type="button"
                onClick={() => setShowEmojiDrawer((prev) => !prev)}
                disabled={Boolean(userProfile?.isSuspended)}
                className="p-2 rounded-full hover:bg-sky-500/10 transition-colors disabled:opacity-40 cursor-pointer"
                title="Emoji"
              >
                <Smile size={19} />
              </button>

              {/* Location button */}
              <button
                type="button"
                onClick={() => setShowLocationDrawer((prev) => !prev)}
                disabled={Boolean(userProfile?.isSuspended)}
                className="p-2 rounded-full hover:bg-sky-500/10 transition-colors disabled:opacity-40 cursor-pointer"
                title="Location"
              >
                <MapPin size={19} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              {content.length > 0 && (
                <span className="text-[11px] text-slate-500">{content.length}/280</span>
              )}
              <button
                type="submit"
                disabled={Boolean(userProfile?.isSuspended) || submitting || isPostEmpty}
                className="px-5 py-2 rounded-full text-xs font-bold transition-all disabled:opacity-40 shadow-sm cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: '#090e17',
                }}
              >
                {submitting ? 'Posting...' : buttonLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
