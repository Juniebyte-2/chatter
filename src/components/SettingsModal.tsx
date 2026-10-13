import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { COLOR_PRESETS, defaultColors } from '../themePresets';
import { CustomColors } from '../types';
import { validatePassword, validateUsername, validateDisplayName } from '../utils/validation';
import { compressImage } from '../utils/imageCompressor';
import {
  Palette,
  User,
  Lock,
  RotateCcw,
  Upload,
  Check,
  AlertTriangle,
  X,
  Trash2,
  UserMinus,
  Copy,
  CheckCheck,
  Code,
  Sparkles
} from 'lucide-react';
import { PROFILE_CSS_SNIPPETS } from './TwitterProfile';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'customization' | 'account' | 'security' | 'profile-css';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'customization',
}) => {
  const {
    userProfile,
    updateProfileData,
    updateThemeColors,
    resetThemeColors,
    deactivateAccount,
    deleteAccount,
    changePassword,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'customization' | 'account' | 'security' | 'profile-css'>(initialTab);

  // Profile Custom CSS state
  const [profileCss, setProfileCss] = useState(userProfile?.customCss || '');
  const [cssSuccess, setCssSuccess] = useState('');
  const [savingCss, setSavingCss] = useState(false);

  useEffect(() => {
    if (userProfile?.customCss !== undefined) {
      setProfileCss(userProfile.customCss || '');
    }
  }, [userProfile?.customCss]);

  // Customization state
  const [selectedPresetId, setSelectedPresetId] = useState(
    userProfile?.customTheme?.activePresetId === 'creator-starry-twilight'
      ? 'navy-deep'
      : userProfile?.customTheme?.activePresetId || 'navy-deep'
  );
  const [customColors, setCustomColors] = useState<CustomColors>(
    userProfile?.customTheme?.activePresetId === 'creator-starry-twilight'
      ? defaultColors
      : userProfile?.customTheme?.colors || defaultColors
  );
  const [themeSuccess, setThemeSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (userProfile?.customTheme) {
        if (userProfile.customTheme.activePresetId === 'creator-starry-twilight') {
          setSelectedPresetId('navy-deep');
          setCustomColors(defaultColors);
        } else {
          setSelectedPresetId(userProfile.customTheme.activePresetId || 'navy-deep');
          setCustomColors(userProfile.customTheme.colors || defaultColors);
        }
      } else {
        try {
          const saved = localStorage.getItem('nexus_custom_theme');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed?.colors && parsed?.activePresetId !== 'creator-starry-twilight') {
              setSelectedPresetId(parsed.activePresetId || 'navy-deep');
              setCustomColors(parsed.colors);
              return;
            }
          }
        } catch {
          // Ignore
        }
        setSelectedPresetId('navy-deep');
        setCustomColors(defaultColors);
      }
    }
  }, [isOpen, userProfile?.customTheme]);

  // Account state
  const [username, setUsername] = useState(userProfile?.username || '');
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [photoURL, setPhotoURL] = useState(userProfile?.photoURL || '');
  const [accountError, setAccountError] = useState('');
  const [accountSuccess, setAccountSuccess] = useState('');
  const [accountSaving, setAccountSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Deactivate Modal state
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivateInputUsername, setDeactivateInputUsername] = useState('');
  const [deactivateError, setDeactivateError] = useState('');

  // Delete Modal state (Step 1 & Step 2)
  const [showDeleteStep1, setShowDeleteStep1] = useState(false);
  const [showDeleteStep2, setShowDeleteStep2] = useState(false);
  const [deleteInputUsername, setDeleteInputUsername] = useState('');
  const [deleteInputPassword, setDeleteInputPassword] = useState('');
  const [deleteUnderstandChecked, setDeleteUnderstandChecked] = useState(false);
  const [deleteTimeOption, setDeleteTimeOption] = useState<'immediate' | 'grace' | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Security state (Change password)
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [securityErrors, setSecurityErrors] = useState<string[]>([]);
  const [securitySuccess, setSecuritySuccess] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  if (!isOpen || !userProfile) return null;

  // Customization Handlers
  const handleSelectPreset = (preset: (typeof COLOR_PRESETS)[0]) => {
    setSelectedPresetId(preset.id);
    setCustomColors(preset.colors);
    updateThemeColors(preset.id, preset.colors);
    setThemeSuccess(`Applied theme: ${preset.name}`);
    setTimeout(() => setThemeSuccess(''), 2500);
  };

  const handleCustomColorChange = (key: keyof CustomColors, value: string) => {
    const updated = { ...customColors, [key]: value };
    setCustomColors(updated);
    updateThemeColors('custom', updated);
  };

  const handleResetColors = async () => {
    setSelectedPresetId('navy-deep');
    setCustomColors(defaultColors);
    await resetThemeColors();
    setThemeSuccess('All colors have been reset to default!');
    setTimeout(() => setThemeSuccess(''), 2500);
  };

  // Account Handlers
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    try {
      const compressed = await compressImage(e.target.files[0], 400, 400, 0.8);
      setPhotoURL(compressed);
    } catch {
      setAccountError('Failed to process image file');
    }
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountError('');
    setAccountSuccess('');

    const userVal = validateUsername(username);
    if (!userVal.isValid) {
      setAccountError(userVal.error || 'Invalid username');
      return;
    }

    const nameVal = validateDisplayName(displayName);
    if (!nameVal.isValid) {
      setAccountError(nameVal.error || 'Invalid display name');
      return;
    }

    setAccountSaving(true);
    try {
      await updateProfileData({
        username: username.trim(),
        displayName: displayName.trim(),
        bio: bio.trim(),
        photoURL,
      });
      setAccountSuccess('Account preferences saved successfully!');
      setTimeout(() => setAccountSuccess(''), 3000);
    } catch (err: any) {
      setAccountError(err.message || 'Failed to update account preferences');
    } finally {
      setAccountSaving(false);
    }
  };

  const copyFriendCode = () => {
    if (userProfile.friendCode) {
      navigator.clipboard.writeText(userProfile.friendCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Deactivate Account
  const handleConfirmDeactivate = async () => {
    if (deactivateInputUsername.trim() !== userProfile.username) {
      setDeactivateError('The entered username does not match your account username.');
      return;
    }
    try {
      await deactivateAccount(deactivateInputUsername.trim());
      setShowDeactivateModal(false);
      onClose();
    } catch (err: any) {
      setDeactivateError(err.message || 'Failed to deactivate account');
    }
  };

  // Delete Account
  const handleConfirmDelete = async () => {
    setDeleteError('');
    if (deleteInputUsername.trim() !== userProfile.username) {
      setDeleteError('The entered username does not match your username.');
      return;
    }
    if (!deleteInputPassword) {
      setDeleteError('Please enter your account password.');
      return;
    }
    if (!deleteUnderstandChecked) {
      setDeleteError('You must check that you understand deleting is final and irreversible.');
      return;
    }
    if (!deleteTimeOption) {
      setDeleteError('Please choose one of the two deletion timeframe options.');
      return;
    }

    setDeleting(true);
    try {
      await deleteAccount(deleteInputPassword, deleteTimeOption === 'immediate');
      setShowDeleteStep2(false);
      onClose();
    } catch (err: any) {
      setDeleteError(err.message || 'Authentication failed or deletion error.');
    } finally {
      setDeleting(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityErrors([]);
    setSecuritySuccess('');

    if (newPass !== confirmPass) {
      setSecurityErrors(['New password and confirmation password do not match']);
      return;
    }

    const val = validatePassword(newPass);
    if (!val.isValid) {
      setSecurityErrors(val.errors);
      return;
    }

    setChangingPass(true);
    try {
      await changePassword(currentPass, newPass);
      setSecuritySuccess('Password successfully changed!');
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setSecurityErrors(['Current password entered is incorrect']);
      } else {
        setSecurityErrors([err.message || 'Failed to update password']);
      }
    } finally {
      setChangingPass(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div
        className="w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden border"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-app)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Settings Navigation Sidebar */}
        <div
          className="w-full md:w-64 p-5 border-b md:border-b-0 md:border-r flex md:flex-col justify-between"
          style={{
            backgroundColor: 'var(--bg-sidebar)',
            borderColor: 'var(--border-app)',
          }}
        >
          <div className="space-y-6 w-full">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-extrabold text-lg tracking-tight">Settings</h2>
                <p className="text-xs text-slate-400">User Preferences</p>
              </div>
              <button
                onClick={onClose}
                className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex md:flex-col gap-1.5 w-full">
              <button
                onClick={() => setActiveTab('customization')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'customization'
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Palette size={16} />
                <span>Customization</span>
              </button>

              <button
                onClick={() => setActiveTab('profile-css')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'profile-css'
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Code size={16} />
                <span>Profile CSS</span>
              </button>

              <button
                onClick={() => setActiveTab('account')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'account'
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <User size={16} />
                <span>Account</span>
              </button>

              <button
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'security'
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Lock size={16} />
                <span>Security</span>
              </button>
            </nav>
          </div>

          <button
            onClick={onClose}
            className="hidden md:flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 border border-white/5"
          >
            <X size={15} />
            <span>Close Settings</span>
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* TAB 1: CUSTOMIZATION */}
          {activeTab === 'customization' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--border-app)' }}>
                <div>
                  <h3 className="text-xl font-bold">Theme & Customization</h3>
                  <p className="text-xs text-slate-400">
                    Personalized appearance stored on your profile. Choose from 20 presets or customize individual colors.
                  </p>
                </div>
                <button
                  onClick={handleResetColors}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-200 transition-colors shrink-0"
                >
                  <RotateCcw size={14} />
                  <span>Reset All Colors</span>
                </button>
              </div>

              {themeSuccess && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <Check size={16} />
                  <span>{themeSuccess}</span>
                </div>
              )}

              {/* 20 Presets */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Preset Color Schemes (10 Dark Mode, 10 Light Mode)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {COLOR_PRESETS.map((preset) => {
                    const isSelected = selectedPresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => handleSelectPreset(preset)}
                        className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-2.5 ${
                          isSelected
                            ? 'border-sky-400 shadow-md ring-2 ring-sky-400/30 scale-[1.02]'
                            : 'border-white/10 hover:border-white/20 bg-white/5'
                        }`}
                        style={{
                          backgroundColor: preset.colors.background,
                          color: preset.colors.text,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold truncate max-w-[100px]">{preset.name}</span>
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-full bg-white/20">
                            {preset.mode}
                          </span>
                        </div>
                        {/* Mini Color Swatches */}
                        <div className="flex items-center gap-1.5">
                          <span className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: preset.colors.accent }} />
                          <span className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: preset.colors.bubbleSelf }} />
                          <span className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: preset.colors.nameSelf }} />
                          <span className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: preset.colors.sidebar }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Individual Color Customizers */}
              <div className="pt-4 border-t border-white/10">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Fine-Tune Individual Colors
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {[
                    { key: 'background', label: 'Main Background' },
                    { key: 'sidebar', label: 'Sidebar & Channel List' },
                    { key: 'card', label: 'Card / Modal Surfaces' },
                    { key: 'border', label: 'Borders & Dividers' },
                    { key: 'accent', label: 'Accent & Highlight Color' },
                    { key: 'text', label: 'Primary Text Color' },
                    { key: 'textMuted', label: 'Muted Text Color' },
                    { key: 'bubbleSelf', label: 'My Message Bubble' },
                    { key: 'bubbleOther', label: "Other's Message Bubble" },
                    { key: 'nameSelf', label: 'My Display Name Color (Over Message)' },
                    { key: 'nameOther', label: "Other's Display Name Color (Gray)" },
                  ].map(({ key, label }) => (
                    <div
                      key={key}
                      className="p-3 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between gap-3"
                    >
                      <span className="text-xs font-medium text-slate-300">{label}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={customColors[key as keyof CustomColors]}
                          onChange={(e) =>
                            handleCustomColorChange(key as keyof CustomColors, e.target.value)
                          }
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                        <span className="text-[11px] font-mono uppercase text-slate-400">
                          {customColors[key as keyof CustomColors]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: PROFILE CUSTOM CSS */}
          {activeTab === 'profile-css' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--border-app)' }}>
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Code className="text-sky-400" size={20} />
                    <span>Profile Custom CSS</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Input custom CSS to style your personal profile banner, avatar glow, fonts, cards, and colors.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {profileCss && (
                    <button
                      type="button"
                      onClick={() => setProfileCss('')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
                    >
                      <RotateCcw size={13} />
                      <span>Clear</span>
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={savingCss}
                    onClick={async () => {
                      setSavingCss(true);
                      setCssSuccess('');
                      try {
                        await updateProfileData({ customCss: profileCss });
                        setCssSuccess('Profile custom CSS saved successfully!');
                        setTimeout(() => setCssSuccess(''), 2500);
                      } catch (err: any) {
                        console.error('Error saving profile CSS:', err);
                      } finally {
                        setSavingCss(false);
                      }
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-40"
                    style={{
                      backgroundColor: 'var(--color-accent)',
                      color: '#090e17',
                    }}
                  >
                    <Check size={14} />
                    <span>{savingCss ? 'Saving...' : 'Save Profile CSS'}</span>
                  </button>
                </div>
              </div>

              {cssSuccess && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <Check size={16} />
                  <span>{cssSuccess}</span>
                </div>
              )}

              {/* Informational Callout */}
              <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 space-y-1">
                <div className="flex items-center gap-2 text-sky-300 font-bold text-xs">
                  <Sparkles size={15} />
                  <span>How Custom Profile CSS Works</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Your custom styles are safely scoped and rendered whenever anyone views your Chatter profile page. You can customize the page background, banner shadows, avatar ring effects, post cards, and heading gradients!
                </p>
              </div>

              {/* Quick Style Presets */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Quick Style Presets
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {PROFILE_CSS_SNIPPETS.map((snip) => (
                    <button
                      key={snip.name}
                      type="button"
                      onClick={() => setProfileCss(snip.code)}
                      className="p-2.5 rounded-xl border border-white/10 hover:border-sky-500/40 bg-white/5 hover:bg-sky-500/10 text-left text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
                    >
                      {snip.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Available Selectors */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Target Selectors (Click to Insert)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '.profile-banner', desc: 'Banner image & gradient' },
                    { label: '.profile-avatar', desc: 'Avatar picture & glow ring' },
                    { label: '.profile-display-name', desc: 'Display name & text shadows' },
                    { label: '.profile-bio', desc: 'Biography font & color' },
                    { label: '.profile-stats', desc: 'Follower & friend counts bar' },
                    { label: '.profile-post-card', desc: 'Post card border, background & glow' },
                    { label: '.profile-tabs', desc: 'Navigation tabs (Posts/Media/Likes)' },
                    { label: '#chatter-profile-view', desc: 'Entire profile page root' },
                    { label: '.star', desc: 'Twinkling stars for cosmic themes' },
                  ].map(({ label, desc }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        const snippet = `\n${label} {\n  \n}\n`;
                        setProfileCss((prev) => (prev ? prev + snippet : snippet.trim()));
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-mono bg-white/5 hover:bg-sky-500/20 text-slate-300 hover:text-sky-300 border border-white/10 transition-colors cursor-pointer"
                      title={desc}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* CSS Code Editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    CSS Code Editor
                  </h4>
                  <span className="text-[11px] font-mono text-slate-500">
                    {profileCss.length} characters
                  </span>
                </div>
                <textarea
                  value={profileCss}
                  onChange={(e) => setProfileCss(e.target.value)}
                  spellCheck={false}
                  rows={12}
                  placeholder={`/* Input custom CSS to style your profile */\n.profile-banner {\n  background: linear-gradient(135deg, #0284c7, #8b5cf6) !important;\n}\n\n.profile-display-name {\n  color: #38bdf8 !important;\n  text-shadow: 0 0 10px rgba(56, 189, 248, 0.5);\n}`}
                  className="w-full text-xs font-mono p-4 rounded-2xl bg-slate-950 text-emerald-400 border border-white/10 focus:outline-none focus:border-sky-400 resize-y leading-relaxed selection:bg-sky-500/30"
                />
              </div>

              {/* Bottom Save Action */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-400">
                  Styles take effect immediately on your profile view!
                </span>
                <button
                  type="button"
                  disabled={savingCss}
                  onClick={async () => {
                    setSavingCss(true);
                    setCssSuccess('');
                    try {
                      await updateProfileData({ customCss: profileCss });
                      setCssSuccess('Profile custom CSS saved successfully!');
                      setTimeout(() => setCssSuccess(''), 2500);
                    } catch (err: any) {
                      console.error('Error saving profile CSS:', err);
                    } finally {
                      setSavingCss(false);
                    }
                  }}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-40"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: '#090e17',
                  }}
                >
                  {savingCss ? 'Saving...' : 'Save Profile CSS'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: ACCOUNT */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              <div className="border-b pb-4" style={{ borderColor: 'var(--border-app)' }}>
                <h3 className="text-xl font-bold">Account Preferences</h3>
                <p className="text-xs text-slate-400">
                  Update your identity, display name, bio, and profile picture.
                </p>
              </div>

              {accountError && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  <span>{accountError}</span>
                </div>
              )}

              {accountSuccess && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <Check size={16} />
                  <span>{accountSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSaveAccount} className="space-y-5">
                {/* Profile Pic Upload */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                      alt="Avatar"
                      className="w-20 h-20 rounded-full object-cover border-2 border-white/20 shadow-md"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 cursor-pointer text-xs font-semibold transition-colors">
                      <Upload size={14} />
                      <span>Change Profile Picture</span>
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                    <p className="text-[11px] text-slate-400 mt-1">Recommended: Square PNG/JPEG or WebP</p>
                  </div>
                </div>

                {/* Friend Code Display */}
                <div className="p-3.5 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                      Your Friend Code
                    </span>
                    <span className="text-sm font-mono font-bold text-sky-400">
                      {userProfile.friendCode || '#USER-0000'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={copyFriendCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-slate-200 transition-colors"
                  >
                    {copiedCode ? <CheckCheck size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Username (Unique, no spaces)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 text-xs">@</span>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full text-xs pl-7 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-sky-400"
                        placeholder="username"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Display Name (Can include spaces)
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-sky-400"
                      placeholder="Display Name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Bio / About Me
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={300}
                    className="w-full text-xs px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-sky-400 resize-none"
                    placeholder="Tell everyone a little bit about yourself..."
                  />
                  <span className="text-[10px] text-slate-500 float-right">{bio.length}/300</span>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={accountSaving}
                    className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 transition-all disabled:opacity-50"
                  >
                    {accountSaving ? 'Saving Changes...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>

              {/* Account Deletion & Deactivation Section at Bottom */}
              <div className="pt-8 border-t border-red-500/20 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-red-400">Account Management & Danger Zone</h4>
                  <p className="text-xs text-slate-400">
                    Deactivate your account temporarily or permanently delete your account.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Deactivate Button */}
                  <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                      <UserMinus size={16} />
                      <span>Deactivate Account</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Hides your account from searches, friend lists, and disables messaging until you log in again.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setDeactivateInputUsername('');
                        setDeactivateError('');
                        setShowDeactivateModal(true);
                      }}
                      className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-colors w-full"
                    >
                      Deactivate Account
                    </button>
                  </div>

                  {/* Delete Button */}
                  <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/5 space-y-2">
                    <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                      <Trash2 size={16} />
                      <span>Delete Account</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Irreversibly removes your account data, or gives you a 7-day grace period to recover.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowDeleteStep1(true)}
                      className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors w-full"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="border-b pb-4" style={{ borderColor: 'var(--border-app)' }}>
                <h3 className="text-xl font-bold">Security & Password</h3>
                <p className="text-xs text-slate-400">
                  Update your authentication credentials with strict security standards.
                </p>
              </div>

              {securityErrors.length > 0 && (
                <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-red-300 space-y-1">
                  {securityErrors.map((err, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <AlertTriangle size={13} className="shrink-0" />
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              )}

              {securitySuccess && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <Check size={16} />
                  <span>{securitySuccess}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Current Password:
                  </label>
                  <input
                    type="password"
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    required
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-sky-400"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    New Password:
                  </label>
                  <input
                    type="password"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    required
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-sky-400"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Confirm New Password:
                  </label>
                  <input
                    type="password"
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    required
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-sky-400"
                    placeholder="••••••••"
                  />
                </div>

                {/* Password Requirements Checklist */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5 text-[11px] text-slate-400">
                  <span className="font-bold text-slate-300 block mb-1">Password Requirements:</span>
                  <div className="grid grid-cols-1 gap-1">
                    <span className={newPass.length >= 8 ? 'text-emerald-400' : ''}>• At least 8 characters long</span>
                    <span className={newPass && !/\s/.test(newPass) ? 'text-emerald-400' : ''}>• Cannot contain spaces</span>
                    <span className={newPass && !/^[.-]|[.-]$/.test(newPass) ? 'text-emerald-400' : ''}>• Cannot start or end with a dash or period</span>
                    <span className={/[0-9]/.test(newPass) ? 'text-emerald-400' : ''}>• At least one number (0-9)</span>
                    <span className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPass) ? 'text-emerald-400' : ''}>• At least one special character (!#$%@ etc.)</span>
                    <span className={/[A-Z]/.test(newPass) ? 'text-emerald-400' : ''}>• At least one uppercase letter (A-Z)</span>
                    <span className={/[a-z]/.test(newPass) ? 'text-emerald-400' : ''}>• At least one lowercase letter (a-z)</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={changingPass}
                  className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 transition-all disabled:opacity-50"
                >
                  {changingPass ? 'Updating Password...' : 'Change Password'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: DEACTIVATE ACCOUNT */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div
            className="w-full max-w-md p-6 rounded-2xl border space-y-4 shadow-2xl"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-app)',
              color: 'var(--text-primary)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                <UserMinus size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold">Deactivate Account</h3>
                <p className="text-xs text-slate-400">Temporary suspension of your profile</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              To deactivate your account, enter your username below. Display names will not be accepted. Once deactivated, you will be hidden from searches and friends lists. Logging back in will immediately restore your account.
            </p>

            {deactivateError && (
              <div className="p-2.5 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-red-300">
                {deactivateError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Enter your username to confirm:
              </label>
              <input
                type="text"
                value={deactivateInputUsername}
                onChange={(e) => setDeactivateInputUsername(e.target.value)}
                placeholder={userProfile.username}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeactivateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivate}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors"
              >
                Deactivate My Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE STEP 1 (Confirmation Prompt) */}
      {showDeleteStep1 && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div
            className="w-full max-w-md p-6 rounded-2xl border border-red-500/40 space-y-5 shadow-2xl text-center"
            style={{
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
            }}
          >
            <div className="w-14 h-14 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={32} />
            </div>

            <div>
              <h3 className="text-xl font-bold text-red-400">
                Are you sure you want to delete your account? This cannot be undone!
              </h3>
              <p className="text-xs text-slate-300 mt-2">
                All your profile data, chat messages, posts, and settings may be permanently erased.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteStep1(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold transition-colors border"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: '#090e17',
                  borderColor: 'var(--color-accent)',
                }}
              >
                No, take me back to settings
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteStep1(false);
                  setShowDeleteStep2(true);
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors"
              >
                Yes, delete my account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE STEP 2 (Username, Password, Checkboxes) */}
      {showDeleteStep2 && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div
            className="w-full max-w-lg p-6 rounded-2xl border border-red-500/40 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]"
            style={{
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-400">Confirm Account Deletion</h3>
                <p className="text-xs text-slate-400">Final verification step</p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-red-300">
                {deleteError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Enter your Username (NOT display name):
                </label>
                <input
                  type="text"
                  value={deleteInputUsername}
                  onChange={(e) => setDeleteInputUsername(e.target.value)}
                  placeholder={userProfile.username}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-red-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Enter your Password:
                </label>
                <input
                  type="password"
                  value={deleteInputPassword}
                  onChange={(e) => setDeleteInputPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-red-400"
                />
              </div>

              <div className="pt-2 space-y-3 border-t border-white/10">
                <p className="text-xs font-bold text-slate-300">Required Confirmations:</p>

                {/* Check 1: Mandatory */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-white/10 bg-white/5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={deleteUnderstandChecked}
                    onChange={(e) => setDeleteUnderstandChecked(e.target.checked)}
                    className="mt-0.5 rounded text-red-500 focus:ring-0"
                  />
                  <span className="text-slate-200">
                    I understand that deleting my account is final and irreversible.
                  </span>
                </label>

                {/* Check 2: Immediate */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-white/10 bg-white/5 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="deleteTime"
                    checked={deleteTimeOption === 'immediate'}
                    onChange={() => setDeleteTimeOption('immediate')}
                    className="mt-0.5 text-red-500 focus:ring-0"
                  />
                  <div>
                    <span className="text-slate-200 font-semibold block">
                      Delete my account immediately
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Instantly purges all data from Firebase Database and makes your username available immediately.
                    </span>
                  </div>
                </label>

                {/* Check 3: 7-day grace period */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-white/10 bg-white/5 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="deleteTime"
                    checked={deleteTimeOption === 'grace'}
                    onChange={() => setDeleteTimeOption('grace')}
                    className="mt-0.5 text-red-500 focus:ring-0"
                  />
                  <div>
                    <span className="text-slate-200 font-semibold block">
                      Delete my account and give me a 7-day grace period in case I wish to get my account back
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Logging back in within 7 days will automatically cancel the deletion status.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setShowDeleteStep2(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-6 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-opacity disabled:opacity-50"
              >
                {deleting ? 'Processing Deletion...' : 'Permanently Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
