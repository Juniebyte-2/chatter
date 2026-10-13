import React, { useState } from 'react';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { ShieldAlert, ArrowLeft, Send, CheckCircle2, AlertCircle } from 'lucide-react';

interface HelpAndAppealsProps {
  currentPath: string; // e.g. '/help/punishments/suspension', '/forms/appealforms/suspensionappeal', '/help/punishments/bans', '/forms/appealforms/banappeal'
  onNavigate: (path: string) => void;
  onBackToApp: () => void;
  defaultUsername?: string;
}

export const HelpAndAppeals: React.FC<HelpAndAppealsProps> = ({
  currentPath,
  onNavigate,
  onBackToApp,
  defaultUsername = '',
}) => {
  const [appealUsername, setAppealUsername] = useState(defaultUsername);
  const [appealReason, setAppealReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const isSuspensionArticle = currentPath === '/help/punishments/suspension';
  const isBanArticle = currentPath === '/help/punishments/bans';
  const isSuspensionAppeal = currentPath === '/forms/appealforms/suspensionappeal';
  const isBanAppeal = currentPath === '/forms/appealforms/banappeal';

  const handleAppealSubmit = async (type: 'suspension' | 'ban') => {
    if (!appealUsername.trim()) {
      setError('Please enter your username');
      return;
    }
    if (!appealReason.trim() || appealReason.trim().length < 10) {
      setError('Please provide a detailed explanation (at least 10 characters)');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Find userId for this username if exists
      let targetUid: string | undefined = undefined;
      const cleanUser = appealUsername.replace(/^@/, '').toLowerCase().trim();
      const userQuery = query(collection(db, 'users'), where('username', '==', appealUsername.replace(/^@/, '').trim()));
      const snap = await getDocs(userQuery);
      if (!snap.empty) {
        targetUid = snap.docs[0].id;
      }

      await addDoc(collection(db, 'appeals'), {
        type,
        username: appealUsername.replace(/^@/, '').trim(),
        userId: targetUid || null,
        reason: appealReason.trim(),
        status: 'pending',
        reviewedBy: null,
        createdAt: new Date().toISOString(),
      });

      setSubmitted(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'appeals');
      setError('Failed to submit appeal. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen p-4 sm:p-8 flex flex-col items-center justify-center"
      style={{
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-primary)',
      }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl p-6 sm:p-8 shadow-2xl border relative space-y-6"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-app)',
        }}
      >
        <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border-app)' }}>
          <button
            onClick={onBackToApp}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Return to App</span>
          </button>
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
            <ShieldAlert size={16} />
            <span>Chatter Safety & Moderation</span>
          </div>
        </div>

        {/* 1. Suspension Help Article */}
        {isSuspensionArticle && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-amber-400">Account Suspensions Explained</h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              When an account on Chatter is suspended, it means a moderator or administrator has restricted its privileges due to violations of our Community Guidelines or Terms of Service.
            </p>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 text-xs text-slate-300">
              <h4 className="font-bold text-white text-sm">What happens during a suspension:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>You can still log into your account, but your posting abilities are locked.</li>
                <li>You cannot post, comment, message in chatrooms, or like posts.</li>
                <li>Your profile is hidden from other users, displaying "This Account Is Suspended".</li>
                <li>Suspensions may be temporary (for a custom duration or until a specified date) or indefinite.</li>
              </ul>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Common reasons for suspension include harassment, toxic speech, repetitive spam, or attempting to evade chatroom rules.
            </p>
            <div className="pt-4 border-t border-white/10 text-xs text-slate-300">
              If you believe your account was falsely suspended, please fill out an appeal form{' '}
              <button
                onClick={() => onNavigate('/forms/appealforms/suspensionappeal')}
                className="text-sky-400 font-bold hover:underline"
              >
                here
              </button>
              .
            </div>
          </div>
        )}

        {/* 2. Ban Help Article */}
        {isBanArticle && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-red-400">Account Bans Explained</h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              An account ban is the most severe penalty on Chatter. It is reserved for egregious violations, repeated misconduct, dangerous behavior, hate speech, or harassment that undermines the safety of the platform.
            </p>
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 space-y-2 text-xs text-slate-300">
              <h4 className="font-bold text-red-300 text-sm">Key Details Regarding Account Bans:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Bans are indefinite and terminate access to the main platform.</li>
                <li>Attempting to log in will display the ban notice.</li>
                <li>Any chatrooms or public posts created by the account may be removed or locked.</li>
                <li>Creating alternate accounts to circumvent a ban will result in immediate termination of the alternate accounts.</li>
              </ul>
            </div>
            <div className="pt-4 border-t border-white/10 text-xs text-slate-300">
              If you believe your account has been falsely banned, please fill out an appeal form{' '}
              <button
                onClick={() => onNavigate('/forms/appealforms/banappeal')}
                className="text-sky-400 font-bold hover:underline"
              >
                here
              </button>
              .
            </div>
          </div>
        )}

        {/* 3. Suspension Appeal Form */}
        {isSuspensionAppeal && (
          <div>
            {submitted ? (
              <div className="text-center py-8 space-y-3">
                <CheckCircle2 size={44} className="text-emerald-400 mx-auto" />
                <h2 className="text-xl font-bold text-white">Suspension Appeal Submitted</h2>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  A suspension appeal form has been submitted to the moderation team and @Neo. If approved, your account will be promptly unsuspended.
                </p>
                <button
                  onClick={onBackToApp}
                  className="mt-4 px-6 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 transition-colors"
                >
                  Return to Home
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-amber-400">Suspension Appeal Form</h2>
                  <p className="text-xs text-slate-400">
                    Please provide your account details and why you believe this suspension was made in error.
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
                    <AlertCircle size={15} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Account Username:
                    </label>
                    <input
                      type="text"
                      value={appealUsername}
                      onChange={(e) => setAppealUsername(e.target.value)}
                      placeholder="e.g. your_username"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Why do you believe you were falsely suspended?
                    </label>
                    <textarea
                      rows={5}
                      value={appealReason}
                      onChange={(e) => setAppealReason(e.target.value)}
                      placeholder="Explain what happened and why your suspension should be lifted..."
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-amber-400 resize-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => handleAppealSubmit('suspension')}
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    <Send size={14} />
                    <span>{submitting ? 'Submitting Appeal...' : 'Submit Appeal Form'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. Ban Appeal Form */}
        {isBanAppeal && (
          <div>
            {submitted ? (
              <div className="text-center py-8 space-y-3">
                <CheckCircle2 size={44} className="text-emerald-400 mx-auto" />
                <h2 className="text-xl font-bold text-white">Ban Appeal Submitted</h2>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  A ban appeal form has been submitted to the moderation team and @Neo. If approved, your account ban will be lifted.
                </p>
                <button
                  onClick={onBackToApp}
                  className="mt-4 px-6 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 transition-colors"
                >
                  Return to Home
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-red-400">Ban Appeal Form</h2>
                  <p className="text-xs text-slate-400">
                    If you believe your account has been falsely banned, please fill out the appeal form below.
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
                    <AlertCircle size={15} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Account Username:
                    </label>
                    <input
                      type="text"
                      value={appealUsername}
                      onChange={(e) => setAppealUsername(e.target.value)}
                      placeholder="e.g. your_username"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-red-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Why do you believe you were falsely banned?
                    </label>
                    <textarea
                      rows={5}
                      value={appealReason}
                      onChange={(e) => setAppealReason(e.target.value)}
                      placeholder="Detail your explanation..."
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-red-400 resize-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => handleAppealSubmit('ban')}
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    <Send size={14} />
                    <span>{submitting ? 'Submitting Appeal...' : 'Submit Ban Appeal Form'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
