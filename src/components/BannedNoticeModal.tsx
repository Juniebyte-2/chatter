import React from 'react';
import { Ban, ShieldAlert, ArrowRight, LogOut, X } from 'lucide-react';

interface BannedNoticeModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onNavigateHelp: (path: string) => void;
  onLogout?: () => void;
  username?: string;
}

export const BannedNoticeModal: React.FC<BannedNoticeModalProps> = ({
  isOpen,
  onClose,
  onNavigateHelp,
  onLogout,
  username,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none animate-fade-in">
      <div
        className="w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border text-center space-y-5 border-red-500/40 relative overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-card)',
          color: 'var(--text-primary)',
        }}
      >
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        )}

        {/* Big Alert Icon */}
        <div className="w-16 h-16 rounded-2xl bg-red-600/20 text-red-500 mx-auto flex items-center justify-center border border-red-500/30">
          <Ban size={36} />
        </div>

        {/* Title & Message */}
        <div className="space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-black text-red-500">Your Account is Banned</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            {username ? `@${username}, this` : 'This'} account has been permanently suspended and banned from Chatter for violating our Community Guidelines or Terms of Service.
          </p>
        </div>

        {/* Ban Details Box */}
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/25 text-left space-y-2 text-xs">
          <div className="flex items-center justify-between font-bold text-red-400">
            <span>Penalty Status:</span>
            <span className="px-2 py-0.5 rounded bg-red-600/30 border border-red-500/40 text-[10px] uppercase">
              Permanent Ban
            </span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            All account permissions have been revoked. If you believe this action was made in error or without justification, you may submit a formal appeal through our Safety Forums.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={() => {
              if (onClose) onClose();
              onNavigateHelp('/forms/appealforms/banappeal');
            }}
            className="w-full py-3 px-4 rounded-full text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Learn More & File an Appeal</span>
            <ArrowRight size={14} />
          </button>

          {onLogout ? (
            <button
              onClick={() => {
                if (onClose) onClose();
                onLogout();
              }}
              className="w-full py-2.5 px-4 rounded-full text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut size={14} />
              <span>Log Out</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-full text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
