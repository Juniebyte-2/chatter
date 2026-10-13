import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { ReportItem, AppealItem } from '../types';
import { Shield, Bell, Check, X, Eye, AlertCircle } from 'lucide-react';

interface AdminNotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile: (username: string) => void;
}

export const AdminNotificationsPanel: React.FC<AdminNotificationsPanelProps> = ({
  isOpen,
  onClose,
  onOpenProfile,
}) => {
  const { userProfile, isModOrAdmin } = useAuth();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [appeals, setAppeals] = useState<AppealItem[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [selectedAppeal, setSelectedAppeal] = useState<AppealItem | null>(null);
  const [activeTab, setActiveTab] = useState<'reports' | 'appeals'>('reports');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen || !isModOrAdmin) return;

    // Listen to pending reports
    const reportsQuery = query(
      collection(db, 'reports'),
      where('status', '==', 'pending')
    );
    const unsubReports = onSnapshot(reportsQuery, (snapshot) => {
      const list: ReportItem[] = [];
      snapshot.forEach((d) => {
        list.push({ reportId: d.id, ...d.data() } as ReportItem);
      });
      setReports(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'reports');
    });

    // Listen to pending appeals
    const appealsQuery = query(
      collection(db, 'appeals'),
      where('status', '==', 'pending')
    );
    const unsubAppeals = onSnapshot(appealsQuery, (snapshot) => {
      const list: AppealItem[] = [];
      snapshot.forEach((d) => {
        list.push({ appealId: d.id, ...d.data() } as AppealItem);
      });
      setAppeals(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'appeals');
    });

    return () => {
      unsubReports();
      unsubAppeals();
    };
  }, [isOpen, isModOrAdmin]);

  if (!isOpen || !isModOrAdmin) return null;

  const totalNotifications = reports.length + appeals.length;

  const handleClaimReport = async (report: ReportItem) => {
    setSelectedReport(report);
    try {
      await updateDoc(doc(db, 'reports', report.reportId), {
        status: 'investigating',
        claimedBy: userProfile?.username || 'Mod',
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reports/${report.reportId}`);
    }
  };

  const handleResolveReport = async (action: 'dismiss' | 'resolved') => {
    if (!selectedReport) return;
    setProcessing(true);
    try {
      await updateDoc(doc(db, 'reports', selectedReport.reportId), {
        status: action === 'dismiss' ? 'dismissed' : 'resolved',
      });
      setSelectedReport(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reports/${selectedReport.reportId}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleReviewAppeal = async (appeal: AppealItem, action: 'accept' | 'reject') => {
    setProcessing(true);
    try {
      // If accept, unsuspend or unban the target user!
      if (action === 'accept' && appeal.userId) {
        if (appeal.type === 'suspension') {
          await updateDoc(doc(db, 'users', appeal.userId), {
            isSuspended: false,
            suspendedUntil: null,
          });
        } else if (appeal.type === 'ban') {
          await updateDoc(doc(db, 'users', appeal.userId), {
            isBanned: false,
          });
        }
      }

      await updateDoc(doc(db, 'appeals', appeal.appealId), {
        status: action === 'accept' ? 'accepted' : 'rejected',
        reviewedBy: userProfile?.username || 'Admin',
      });

      setSelectedAppeal(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `appeals/${appeal.appealId}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div
        className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border flex flex-col max-h-[85vh]"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-app)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-app)' }}>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Shield size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <span>Admin & Moderator Dashboard</span>
                {totalNotifications > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500 text-white font-bold">
                    {totalNotifications} New
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">Moderation requests, reports, and appeals</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b text-xs font-semibold px-4 pt-2 gap-2" style={{ borderColor: 'var(--border-app)' }}>
          <button
            onClick={() => { setActiveTab('reports'); setSelectedReport(null); setSelectedAppeal(null); }}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'reports' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span>User Reports</span>
            <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px]">{reports.length}</span>
          </button>
          <button
            onClick={() => { setActiveTab('appeals'); setSelectedReport(null); setSelectedAppeal(null); }}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'appeals' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span>Ban & Suspension Appeals</span>
            <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px]">{appeals.length}</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {activeTab === 'reports' && (
            <>
              {selectedReport ? (
                <div className="space-y-4 p-4 rounded-xl border border-white/10 bg-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400">Investigating Report</span>
                    <button onClick={() => setSelectedReport(null)} className="text-xs text-slate-400 hover:text-white underline">
                      Back to list
                    </button>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Reported User:</p>
                    <button
                      onClick={() => { onClose(); onOpenProfile(selectedReport.reportedUsername); }}
                      className="font-bold text-sm text-sky-400 hover:underline flex items-center gap-1 mt-0.5"
                    >
                      @{selectedReport.reportedUsername}
                      <Eye size={13} />
                    </button>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Reporter: <span className="text-white">@{selectedReport.reporterUsername}</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Violations:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedReport.reasons.map((r) => (
                        <span key={r} className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-xs border border-red-500/30">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                  {selectedReport.otherReason && (
                    <div className="text-xs">
                      <span className="text-slate-400">Other Reason: </span>
                      <span>{selectedReport.otherReason}</span>
                    </div>
                  )}
                  {selectedReport.details && (
                    <div className="text-xs bg-black/40 p-3 rounded-lg border border-white/10">
                      <span className="text-slate-400 block mb-1 font-semibold">Details:</span>
                      <p className="whitespace-pre-wrap">{selectedReport.details}</p>
                    </div>
                  )}
                  {selectedReport.evidenceImageUrl && (
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Attached Evidence:</p>
                      <img
                        src={selectedReport.evidenceImageUrl}
                        alt="Evidence"
                        className="max-h-60 rounded-lg border border-white/20 object-contain bg-black/50"
                      />
                    </div>
                  )}
                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      onClick={() => handleResolveReport('dismiss')}
                      disabled={processing}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-300"
                    >
                      Dismiss Report
                    </button>
                    <button
                      onClick={() => handleResolveReport('resolved')}
                      disabled={processing}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      Mark Resolved
                    </button>
                  </div>
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Shield size={36} className="mx-auto mb-2 opacity-40 text-emerald-400" />
                  <p className="text-sm">No pending reports! All clear.</p>
                </div>
              ) : (
                reports.map((report) => (
                  <div
                    key={report.reportId}
                    className="p-3.5 rounded-xl border border-white/10 bg-white/5 hover:border-white/20 transition-all flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-red-400">Report on @{report.reportedUsername}</span>
                        <span className="text-[10px] text-slate-400">by @{report.reporterUsername}</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-1">
                        Reasons: {report.reasons.join(', ')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleClaimReport(report)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors shrink-0"
                    >
                      Investigate
                    </button>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === 'appeals' && (
            <>
              {selectedAppeal ? (
                <div className="space-y-4 p-4 rounded-xl border border-white/10 bg-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 capitalize">
                      {selectedAppeal.type} Appeal Details
                    </span>
                    <button onClick={() => setSelectedAppeal(null)} className="text-xs text-slate-400 hover:text-white underline">
                      Back to list
                    </button>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Appealing User:</p>
                    <p className="font-bold text-base text-white">@{selectedAppeal.username}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold mb-1">Reason for Appeal:</p>
                    <div className="text-xs bg-black/40 p-3 rounded-lg border border-white/10 whitespace-pre-wrap">
                      {selectedAppeal.reason}
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      onClick={() => handleReviewAppeal(selectedAppeal, 'reject')}
                      disabled={processing}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600/30 text-red-300 hover:bg-red-600/50 border border-red-500/40"
                    >
                      Reject Appeal
                    </button>
                    <button
                      onClick={() => handleReviewAppeal(selectedAppeal, 'accept')}
                      disabled={processing}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      Accept Appeal (Un{selectedAppeal.type === 'ban' ? 'ban' : 'suspend'})
                    </button>
                  </div>
                </div>
              ) : appeals.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Check size={36} className="mx-auto mb-2 opacity-40 text-emerald-400" />
                  <p className="text-sm">No pending appeals.</p>
                </div>
              ) : (
                appeals.map((appeal) => (
                  <div
                    key={appeal.appealId}
                    className="p-3.5 rounded-xl border border-white/10 bg-white/5 hover:border-white/20 transition-all flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-sky-400">@{appeal.username}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 uppercase font-semibold">
                          {appeal.type} Appeal
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-1 italic">
                        "{appeal.reason}"
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedAppeal(appeal)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 transition-colors shrink-0"
                    >
                      Review
                    </button>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
