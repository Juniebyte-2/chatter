import React, { useState } from 'react';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { compressImage } from '../utils/imageCompressor';
import { AlertCircle, Calendar, CheckCircle2, ShieldAlert, Upload, X } from 'lucide-react';

interface ReportModalProps {
  reportedUserId: string;
  reportedUsername: string;
  isOpen: boolean;
  onClose: () => void;
  onBlockUser?: (userId: string) => Promise<void>;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  reportedUserId,
  reportedUsername,
  isOpen,
  onClose,
  onBlockUser,
}) => {
  const { currentUser, userProfile } = useAuth();
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [otherReason, setOtherReason] = useState('');
  const [details, setDetails] = useState('');
  const [evidenceImage, setEvidenceImage] = useState<string | null>(null);
  const [blockAfterReport, setBlockAfterReport] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const REPORT_OPTIONS = [
    'Spam or Scam',
    'Harassment or Bullying',
    'Hate Speech or Discrimination',
    'Impersonation',
    'Threats or Violence',
    'Other',
  ];

  const toggleReason = (reason: string) => {
    if (selectedReasons.includes(reason)) {
      setSelectedReasons(selectedReasons.filter((r) => r !== reason));
    } else {
      setSelectedReasons([...selectedReasons, reason]);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    try {
      const compressed = await compressImage(e.target.files[0], 800, 800, 0.7);
      setEvidenceImage(compressed);
    } catch {
      setError('Failed to process image');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile) return;
    if (selectedReasons.length === 0) {
      setError('Please select at least one reason for the report.');
      return;
    }
    if (selectedReasons.includes('Other') && !otherReason.trim()) {
      setError('Please specify the reason under "Other".');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await addDoc(collection(db, 'reports'), {
        reporterId: currentUser.uid,
        reporterUsername: userProfile.username,
        reportedUserId,
        reportedUsername,
        reasons: selectedReasons,
        otherReason: otherReason.trim(),
        details: details.trim(),
        evidenceImageUrl: evidenceImage || null,
        status: 'pending',
        claimedBy: null,
        createdAt: new Date().toISOString(),
      });

      if (blockAfterReport && onBlockUser) {
        await onBlockUser(reportedUserId);
      }

      setIsSuccess(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'reports');
      setError('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="w-full max-w-lg rounded-2xl p-6 shadow-2xl relative border overflow-y-auto max-h-[90vh]"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-app)',
          color: 'var(--text-primary)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
        >
          <X size={18} />
        </button>

        {isSuccess ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-xl font-bold">Report Submitted Successfully</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Your report has been submitted succesfully, we will investigate this account and get back to you as soon as possible.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2 rounded-xl text-sm font-semibold transition-opacity"
              style={{ backgroundColor: 'var(--color-accent)', color: '#090e17' }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400">
                <ShieldAlert size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold">Report @{reportedUsername}</h3>
                <p className="text-xs text-slate-400">Help keep our community safe and compliant</p>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Select Reason(s) (You may select multiple):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {REPORT_OPTIONS.map((reason) => {
                  const checked = selectedReasons.includes(reason);
                  return (
                    <button
                      type="button"
                      key={reason}
                      onClick={() => toggleReason(reason)}
                      className={`text-left text-xs px-3 py-2 rounded-xl border transition-all flex items-center justify-between ${
                        checked
                          ? 'border-red-500 bg-red-500/20 text-red-200'
                          : 'border-white/10 hover:border-white/20 bg-white/5'
                      }`}
                    >
                      <span>{reason}</span>
                      <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${checked ? 'border-red-500 bg-red-500' : 'border-slate-500'}`}>
                        {checked && <span className="w-1.5 h-1.5 bg-white rounded-sm" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedReasons.includes('Other') && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Specify other reason:
                </label>
                <input
                  type="text"
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  placeholder="Explain reason..."
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-red-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                More in-depth details of what they did (Optional):
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                placeholder="Provide additional context or message quotes..."
                className="w-full text-xs px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-red-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Attach proof/screenshot of ToS violation (Optional):
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer text-xs transition-colors">
                  <Upload size={14} />
                  <span>{evidenceImage ? 'Change Image' : 'Upload Image'}</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                {evidenceImage && (
                  <div className="relative">
                    <img src={evidenceImage} alt="Evidence" className="w-10 h-10 object-cover rounded-lg border border-white/20" />
                    <button
                      type="button"
                      onClick={() => setEvidenceImage(null)}
                      className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={blockAfterReport}
                  onChange={(e) => setBlockAfterReport(e.target.checked)}
                  className="rounded border-slate-600 text-red-500 focus:ring-0"
                />
                <span>Block this person after reporting them</span>
              </label>
            </div>

            <div className="pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-opacity disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

interface SuspendModalProps {
  targetUserId: string;
  targetUsername: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SuspendModal: React.FC<SuspendModalProps> = ({
  targetUserId,
  targetUsername,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [suspendType, setSuspendType] = useState<'hours' | 'calendar' | 'indefinite'>('hours');
  const [hours, setHours] = useState('6');
  const [calendarDate, setCalendarDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    let untilIso: string | null = null;
    const now = new Date();

    if (suspendType === 'hours') {
      const h = parseInt(hours, 10);
      if (isNaN(h) || h <= 0) {
        setError('Please select valid hours');
        setSubmitting(false);
        return;
      }
      const untilDate = new Date(now.getTime() + h * 60 * 60 * 1000);
      untilIso = untilDate.toISOString();
    } else if (suspendType === 'calendar') {
      if (!calendarDate) {
        setError('Please select a suspension end date');
        setSubmitting(false);
        return;
      }
      const selected = new Date(calendarDate);
      if (selected.getTime() <= now.getTime()) {
        setError('Suspension end date must be in the future');
        setSubmitting(false);
        return;
      }
      untilIso = selected.toISOString();
    } else {
      untilIso = 'indefinite';
    }

    try {
      await updateDoc(doc(db, 'users', targetUserId), {
        isSuspended: true,
        suspendedUntil: untilIso,
      });
      onSuccess();
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUserId}`);
      setError('Failed to suspend user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl relative border"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-app)',
          color: 'var(--text-primary)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
        >
          <X size={18} />
        </button>

        <form onSubmit={handleSuspend} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600/20 text-red-400">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-400">Suspend @{targetUsername}</h3>
              <p className="text-xs text-slate-400">Account will be restricted from posting, chatting, or liking</p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">Suspension Duration:</label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 cursor-pointer text-xs">
              <input
                type="radio"
                name="suspendType"
                checked={suspendType === 'hours'}
                onChange={() => setSuspendType('hours')}
                className="text-red-500"
              />
              <span>Custom time in the same day:</span>
              <select
                disabled={suspendType !== 'hours'}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="ml-auto bg-black/40 border border-white/20 rounded px-2 py-1 text-xs"
              >
                <option value="1">1 Hour</option>
                <option value="2">2 Hours</option>
                <option value="6">6 Hours</option>
                <option value="12">12 Hours</option>
                <option value="24">24 Hours</option>
              </select>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 cursor-pointer text-xs">
              <input
                type="radio"
                name="suspendType"
                checked={suspendType === 'calendar'}
                onChange={() => setSuspendType('calendar')}
                className="text-red-500"
              />
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                <span>Until a specific day:</span>
              </span>
              <input
                type="date"
                disabled={suspendType !== 'calendar'}
                value={calendarDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setCalendarDate(e.target.value)}
                className="ml-auto bg-black/40 border border-white/20 rounded px-2 py-1 text-xs"
              />
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 cursor-pointer text-xs">
              <input
                type="radio"
                name="suspendType"
                checked={suspendType === 'indefinite'}
                onChange={() => setSuspendType('indefinite')}
                className="text-red-500"
              />
              <span className="text-red-300 font-semibold">Indefinite Suspension</span>
            </label>
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-opacity disabled:opacity-50"
            >
              {submitting ? 'Applying...' : 'Confirm Suspension'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface BanModalProps {
  targetUserId: string;
  targetUsername: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BanModal: React.FC<BanModalProps> = ({
  targetUserId,
  targetUsername,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleBan = async () => {
    setSubmitting(true);
    setError('');

    try {
      await updateDoc(doc(db, 'users', targetUserId), {
        isBanned: true,
      });
      onSuccess();
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUserId}`);
      setError('Failed to ban account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl relative border border-red-500/40"
        style={{
          backgroundColor: 'var(--bg-card)',
          color: 'var(--text-primary)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="space-y-4">
          <div className="w-12 h-12 bg-red-600/20 text-red-500 rounded-full flex items-center justify-center">
            <ShieldAlert size={28} />
          </div>

          <div>
            <h3 className="text-xl font-bold text-red-500">Ban @{targetUsername}?</h3>
            <p className="text-xs text-slate-300 mt-1">
              This will permanently ban the account. When the user logs in, they will see that their account has been banned with a link to read reasons and appeal.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-red-400">
              {error}
            </div>
          )}

          <div className="pt-3 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={handleBan}
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-opacity disabled:opacity-50"
            >
              {submitting ? 'Banning...' : 'Confirm Indefinite Ban'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
