import React, { useState } from 'react';
import { Post, PostPoll } from '../types';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { CheckCircle2 } from 'lucide-react';

interface PollWidgetProps {
  post: Post;
}

export const PollWidget: React.FC<PollWidgetProps> = ({ post }) => {
  const { currentUser, userProfile } = useAuth();
  const [voting, setVoting] = useState(false);

  if (!post.poll || !post.poll.options) return null;

  const poll = post.poll;
  const totalVotes = poll.totalVotes || 0;
  const userVotedOptionId = currentUser
    ? poll.options.find((opt) => opt.votes?.includes(currentUser.uid))?.id
    : null;
  const hasVoted = Boolean(userVotedOptionId);

  const handleVote = async (optionId: string) => {
    if (!currentUser || !userProfile) return;
    if (userProfile.isSuspended) {
      alert('Your account is currently suspended and cannot vote.');
      return;
    }
    if (hasVoted) return;

    setVoting(true);
    try {
      const updatedOptions = poll.options.map((opt) => {
        if (opt.id === optionId) {
          return {
            ...opt,
            votes: [...(opt.votes || []), currentUser.uid],
            votesCount: (opt.votesCount || 0) + 1,
          };
        }
        return opt;
      });

      const updatedPoll: PostPoll = {
        ...poll,
        options: updatedOptions,
        totalVotes: totalVotes + 1,
      };

      await updateDoc(doc(db, 'posts', post.postId), {
        poll: updatedPoll,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${post.postId}`);
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="my-3 p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 select-none">
      {poll.question && (
        <p className="text-xs sm:text-sm font-semibold text-white mb-2">{poll.question}</p>
      )}

      <div className="space-y-2">
        {poll.options.map((option) => {
          const votes = option.votesCount || 0;
          const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const isSelected = userVotedOptionId === option.id;

          if (hasVoted) {
            // Results display
            return (
              <div
                key={option.id}
                className="relative overflow-hidden rounded-xl border border-white/10 py-2.5 px-3.5 flex items-center justify-between text-xs"
              >
                {/* Progress bar fill */}
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                    isSelected ? 'bg-sky-500/25' : 'bg-white/10'
                  }`}
                  style={{ width: `${percentage}%` }}
                />

                <div className="relative flex items-center gap-2 z-10 font-medium">
                  {isSelected && <CheckCircle2 size={14} className="text-sky-400 shrink-0" />}
                  <span className={isSelected ? 'text-sky-300 font-bold' : 'text-slate-200'}>
                    {option.text}
                  </span>
                </div>

                <span className="relative z-10 font-bold text-slate-300">{percentage}%</span>
              </div>
            );
          }

          // Clickable option before voting
          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={voting || Boolean(userProfile?.isSuspended)}
              className="w-full text-left py-2.5 px-4 rounded-xl border border-sky-400/30 hover:border-sky-400 hover:bg-sky-500/10 text-xs sm:text-sm font-semibold text-sky-400 transition-all flex items-center justify-between group cursor-pointer disabled:opacity-50"
            >
              <span className="truncate">{option.text}</span>
              <span className="w-3.5 h-3.5 rounded-full border border-sky-400/50 group-hover:border-sky-400 shrink-0" />
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
        <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
        {hasVoted ? (
          <span className="text-sky-400 font-medium">Final result recorded</span>
        ) : (
          <span>Poll active</span>
        )}
      </div>
    </div>
  );
};
