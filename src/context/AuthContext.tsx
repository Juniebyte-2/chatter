import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  increment,
  arrayUnion
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, CustomColors } from '../types';
import { defaultColors, applyThemeToDOM, CREATOR_STARRY_THEME_CSS } from '../themePresets';
import { generateFriendCode } from '../utils/validation';

export const ADMIN_EMAIL = 'evillakeman@gmail.com';
export const ADMIN_USERNAME = 'A321-251N';
export const ADMIN_DISPLAY_NAME = 'Neo';
export const ADMIN_PASSWORD = 'Hydrabob1$';
export const ADMIN_UID = 'admin_neo_creator_uid';

export interface AuthUser {
  uid: string;
  email: string | null;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isModOrAdmin: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  signup: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  updateThemeColors: (presetId: string, colors: CustomColors) => Promise<void>;
  resetThemeColors: () => Promise<void>;
  deactivateAccount: (confirmedUsername: string) => Promise<void>;
  deleteAccount: (password: string, immediate: boolean) => Promise<void>;
  changePassword: (currentPass: string, newPass: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Apply default or saved theme immediately on app start
  useEffect(() => {
    try {
      const savedThemeJson = localStorage.getItem('nexus_custom_theme');
      if (savedThemeJson) {
        const parsed = JSON.parse(savedThemeJson);
        if (parsed?.colors && parsed?.activePresetId !== 'creator-starry-twilight') {
          applyThemeToDOM(parsed.colors);
          return;
        }
      }
    } catch {
      // Fallback
    }
    applyThemeToDOM(defaultColors);
  }, []);

  const ensureAdminSeeded = async () => {
    try {
      const adminSnap = await getDoc(doc(db, 'users', ADMIN_UID));
      if (!adminSnap.exists()) {
        const adminProfile: UserProfile = {
          userId: ADMIN_UID,
          email: ADMIN_EMAIL,
          username: ADMIN_USERNAME,
          displayName: ADMIN_DISPLAY_NAME,
          bio: 'Creator & Administrator of Chatter.',
          photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          friendCode: '#NEO-1001',
          role: 'admin',
          customTheme: {
            activePresetId: 'navy-deep',
            colors: defaultColors,
          },
          customCss: CREATOR_STARRY_THEME_CSS,
          friendsCount: 0,
          followersCount: 0,
          followingCount: 0,
          likesCount: 0,
          createdAt: new Date().toISOString(),
        };

        await setDoc(doc(db, 'users', ADMIN_UID), adminProfile);
        await setDoc(doc(db, 'usernames', ADMIN_USERNAME.toLowerCase()), {
          username: ADMIN_USERNAME,
          userId: ADMIN_UID,
          email: ADMIN_EMAIL,
        });
        await setDoc(doc(db, 'usernames', 'neo'), {
          username: ADMIN_USERNAME,
          userId: ADMIN_UID,
          email: ADMIN_EMAIL,
        });
        await setDoc(doc(db, 'admins', ADMIN_UID), { role: 'admin' });
        await setDoc(doc(db, 'accounts', ADMIN_USERNAME.toLowerCase()), {
          userId: ADMIN_UID,
          email: ADMIN_EMAIL,
          username: ADMIN_USERNAME,
          password: ADMIN_PASSWORD,
        });
        await setDoc(doc(db, 'accounts', 'neo'), {
          userId: ADMIN_UID,
          email: ADMIN_EMAIL,
          username: ADMIN_USERNAME,
          password: ADMIN_PASSWORD,
        });
        await setDoc(doc(db, 'accounts', ADMIN_EMAIL.toLowerCase()), {
          userId: ADMIN_UID,
          email: ADMIN_EMAIL,
          username: ADMIN_USERNAME,
          password: ADMIN_PASSWORD,
        });
      } else {
        // Ensure existing creator account in database has the starry cosmic CSS for its profile page
        const existing = adminSnap.data() as UserProfile;
        const updates: Partial<UserProfile> = {};
        if (!existing.customCss) {
          updates.customCss = CREATOR_STARRY_THEME_CSS;
        }
        // If site theme was previously set to creator-starry-twilight, migrate site theme to navy-deep
        if (existing.customTheme?.activePresetId === 'creator-starry-twilight') {
          updates.customTheme = {
            activePresetId: 'navy-deep',
            colors: defaultColors,
          };
        }
        if (Object.keys(updates).length > 0) {
          await updateDoc(doc(db, 'users', ADMIN_UID), updates);
        }
        await setDoc(doc(db, 'usernames', 'neo'), {
          username: ADMIN_USERNAME,
          userId: ADMIN_UID,
          email: ADMIN_EMAIL,
        }, { merge: true });
      }

      // Ensure Neo has sample media posts for testing media switcher
      try {
        const neoPostsSnap = await getDocs(
          query(collection(db, 'posts'), where('authorId', '==', ADMIN_UID))
        );
        if (neoPostsSnap.empty) {
          await addDoc(collection(db, 'posts'), {
            authorId: ADMIN_UID,
            authorUsername: ADMIN_USERNAME,
            authorDisplayName: ADMIN_DISPLAY_NAME,
            authorPhotoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            authorRole: 'admin',
            authorIsVerified: true,
            content: 'Welcome to Chatter! 🌌 Exploring cosmic aesthetics with custom themes & stars.',
            imageUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1080&auto=format&fit=crop&q=80',
            gifUrl: null,
            likes: [],
            likesCount: 14,
            commentsCount: 2,
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          });
          await addDoc(collection(db, 'posts'), {
            authorId: ADMIN_UID,
            authorUsername: ADMIN_USERNAME,
            authorDisplayName: ADMIN_DISPLAY_NAME,
            authorPhotoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            authorRole: 'admin',
            authorIsVerified: true,
            content: 'Matrix vibes in 2026! 🚀 The media switcher lets you view in Grid or Feed mode.',
            imageUrl: null,
            gifUrl: 'https://media.giphy.com/media/A06UFEx8jxEwU/giphy.gif',
            likes: [],
            likesCount: 28,
            commentsCount: 4,
            createdAt: new Date().toISOString(),
          });
        }
      } catch (errPost) {
        console.warn('Could not seed sample neo posts:', errPost);
      }
    } catch (e) {
      console.error('ensureAdminSeeded error:', e);
    }
  };

  const loadUserProfileByUid = async (uid: string): Promise<UserProfile | null> => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;

        // Check if deletion was scheduled
        if (data.deletionRequestedAt) {
          const reqTime = new Date(data.deletionRequestedAt).getTime();
          const now = Date.now();
          const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

          if (data.deletionGracePeriod && now - reqTime > sevenDaysMs) {
            // Grace period expired, perform actual deletion
            await deleteDoc(userRef);
            await deleteDoc(doc(db, 'usernames', data.username.toLowerCase()));
            await deleteDoc(doc(db, 'accounts', data.username.toLowerCase()));
            await deleteDoc(doc(db, 'accounts', data.email.toLowerCase()));
            localStorage.removeItem('nexus_session_uid');
            setCurrentUser(null);
            setUserProfile(null);
            throw new Error('account not found');
          } else if (data.deletionGracePeriod) {
            // Logged back in within grace period: cancel deletion automatically
            await updateDoc(userRef, {
              deletionRequestedAt: null,
              deletionGracePeriod: false,
            });
            data.deletionRequestedAt = null;
            data.deletionGracePeriod = false;
          }
        }

        // Check if account was deactivated: reactivate on login
        if (data.isDeactivated) {
          await updateDoc(userRef, { isDeactivated: false });
          data.isDeactivated = false;
        }

        // Check if temporary suspension expired
        if (data.isSuspended && data.suspendedUntil && data.suspendedUntil !== 'indefinite') {
          const suspendEnd = new Date(data.suspendedUntil).getTime();
          if (Date.now() > suspendEnd) {
            await updateDoc(userRef, { isSuspended: false, suspendedUntil: null });
            data.isSuspended = false;
            data.suspendedUntil = null;
          }
        }

        // If Creator account, guarantee starry CSS for the profile page
        if (data.userId === ADMIN_UID) {
          if (!data.customCss) {
            data.customCss = CREATOR_STARRY_THEME_CSS;
          }
          if (data.customTheme?.activePresetId === 'creator-starry-twilight') {
            data.customTheme = {
              activePresetId: 'navy-deep',
              colors: defaultColors,
            };
          }
        }

        // Apply user's saved theme
        if (data.customTheme && data.customTheme.colors && data.customTheme.activePresetId !== 'creator-starry-twilight') {
          applyThemeToDOM(data.customTheme.colors);
          try {
            localStorage.setItem('nexus_custom_theme', JSON.stringify(data.customTheme));
          } catch {
            // Ignore storage quota
          }
        } else {
          applyThemeToDOM(defaultColors);
        }

        setUserProfile(data);
        setCurrentUser({ uid: data.userId, email: data.email });
        return data;
      }
    } catch (err: any) {
      if (err.message === 'account not found') throw err;
      console.error('Error fetching user profile:', err);
    }
    return null;
  };

  // Restore session on app boot
  useEffect(() => {
    async function initSession() {
      await ensureAdminSeeded();
      const savedUid = localStorage.getItem('nexus_session_uid');
      if (savedUid) {
        try {
          await loadUserProfileByUid(savedUid);
        } catch {
          localStorage.removeItem('nexus_session_uid');
          setCurrentUser(null);
          setUserProfile(null);
        }
      }
      setLoading(false);
    }
    initSession();
  }, []);

  const login = async (identifier: string, pass: string) => {
    const rawInput = identifier.trim();
    if (!rawInput) {
      throw new Error('account not found');
    }

    const cleanInput = rawInput.toLowerCase();
    const cleanUser = rawInput.replace(/^@/, '').trim().toLowerCase();

    // Check if this is the admin account login
    const isAdminLogin =
      cleanUser === ADMIN_USERNAME.toLowerCase() ||
      cleanUser === 'neo' ||
      cleanInput === ADMIN_EMAIL.toLowerCase();

    if (isAdminLogin) {
      if (pass !== ADMIN_PASSWORD) {
        throw new Error('account not found');
      }
      await ensureAdminSeeded();
      const adminProfile = await loadUserProfileByUid(ADMIN_UID);
      if (adminProfile) {
        localStorage.setItem('nexus_session_uid', ADMIN_UID);
        return;
      }
    }

    // Lookup account in accounts collection by username or email
    let accountDoc = await getDoc(doc(db, 'accounts', cleanInput));
    if (!accountDoc.exists()) {
      accountDoc = await getDoc(doc(db, 'accounts', cleanUser));
    }

    let targetUid: string | null = null;
    let expectedPassword = '';

    if (accountDoc.exists()) {
      const aData = accountDoc.data();
      targetUid = aData.userId;
      expectedPassword = aData.password;
    } else {
      // Look up by username
      const usernameSnap = await getDoc(doc(db, 'usernames', cleanUser));
      if (usernameSnap.exists()) {
        const uData = usernameSnap.data();
        targetUid = uData.userId;
        // Fetch account doc
        const accSnap = await getDoc(doc(db, 'accounts', cleanUser));
        if (accSnap.exists()) {
          expectedPassword = accSnap.data().password;
        }
      } else {
        // Fallback query users collection
        const q1 = query(collection(db, 'users'), where('username', '==', rawInput.replace(/^@/, '').trim()));
        const snap1 = await getDocs(q1);
        if (!snap1.empty) {
          targetUid = snap1.docs[0].id;
          const accSnap = await getDoc(doc(db, 'accounts', targetUid));
          if (accSnap.exists()) expectedPassword = accSnap.data().password;
        }
      }
    }

    if (!targetUid || (expectedPassword && expectedPassword !== pass)) {
      throw new Error('account not found');
    }

    const profile = await loadUserProfileByUid(targetUid);
    if (!profile) {
      throw new Error('account not found');
    }

    if (profile.isBanned) {
      throw new Error('Your account has been banned');
    }

    localStorage.setItem('nexus_session_uid', targetUid);
  };

  const signup = async (email: string, username: string, pass: string) => {
    const cleanUsername = username.trim();
    const lowerUsername = cleanUsername.toLowerCase();
    const cleanEmail = email.trim();
    const lowerEmail = cleanEmail.toLowerCase();

    // Check if username is already taken
    const usernameRef = doc(db, 'usernames', lowerUsername);
    const usernameSnap = await getDoc(usernameRef);
    if (usernameSnap.exists()) {
      throw new Error(`Username @${cleanUsername} is already taken. Please choose another.`);
    }

    // Check if email already in use
    const emailRef = doc(db, 'accounts', lowerEmail);
    const emailSnap = await getDoc(emailRef);
    if (emailSnap.exists()) {
      throw new Error('An account with this email already exists.');
    }

    const isSigningUpAsAdmin = lowerEmail === ADMIN_EMAIL.toLowerCase();
    const uid = isSigningUpAsAdmin ? ADMIN_UID : `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const willAutoFollowNeo = !isSigningUpAsAdmin;

    // Ensure Neo exists in database
    await ensureAdminSeeded();

    const newProfile: UserProfile = {
      userId: uid,
      email: cleanEmail,
      username: cleanUsername,
      displayName: cleanUsername,
      bio: `Hello, I'm new here!`,
      photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`,
      friendCode: generateFriendCode(cleanUsername),
      role: isSigningUpAsAdmin ? 'admin' : 'user',
      customTheme: {
        activePresetId: 'navy-deep',
        colors: defaultColors,
      },
      friendsCount: 0,
      followersCount: 0,
      followerUserIds: [],
      followingCount: willAutoFollowNeo ? 1 : 0,
      followingUserIds: willAutoFollowNeo ? [ADMIN_UID] : [],
      likesCount: 0,
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'users', uid), newProfile);
      await setDoc(usernameRef, {
        username: cleanUsername,
        userId: uid,
        email: cleanEmail,
        createdAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'accounts', lowerUsername), {
        userId: uid,
        username: cleanUsername,
        email: cleanEmail,
        password: pass,
      });
      await setDoc(doc(db, 'accounts', lowerEmail), {
        userId: uid,
        username: cleanUsername,
        email: cleanEmail,
        password: pass,
      });

      if (newProfile.role === 'admin') {
        await setDoc(doc(db, 'admins', uid), { role: 'admin' });
      }

      // Automatically add this new user to Neo's followers
      if (willAutoFollowNeo) {
        try {
          await updateDoc(doc(db, 'users', ADMIN_UID), {
            followerUserIds: arrayUnion(uid),
            followersCount: increment(1),
          });
        } catch (e) {
          console.warn('Could not increment Neo followers on signup:', e);
        }
      }

      localStorage.setItem('nexus_session_uid', uid);
      setUserProfile(newProfile);
      setCurrentUser({ uid, email: cleanEmail });
      applyThemeToDOM(defaultColors);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${uid}`);
    }
  };

  const logout = async () => {
    localStorage.removeItem('nexus_session_uid');
    setCurrentUser(null);
    setUserProfile(null);
    applyThemeToDOM(defaultColors);
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!currentUser || !userProfile) return;
    const userRef = doc(db, 'users', currentUser.uid);

    // If changing username, check uniqueness
    if (data.username && data.username.toLowerCase() !== userProfile.username.toLowerCase()) {
      const newLower = data.username.toLowerCase();
      const newUsernameRef = doc(db, 'usernames', newLower);
      const snap = await getDoc(newUsernameRef);
      if (snap.exists()) {
        throw new Error(`Username @${data.username} is already taken.`);
      }

      // Claim new username
      await setDoc(newUsernameRef, {
        username: data.username,
        userId: currentUser.uid,
        email: userProfile.email,
        createdAt: serverTimestamp(),
      });

      // Update accounts map
      const oldAccountDoc = await getDoc(doc(db, 'accounts', userProfile.username.toLowerCase()));
      if (oldAccountDoc.exists()) {
        await setDoc(doc(db, 'accounts', newLower), oldAccountDoc.data());
        await deleteDoc(doc(db, 'accounts', userProfile.username.toLowerCase()));
      }

      // Delete old username
      await deleteDoc(doc(db, 'usernames', userProfile.username.toLowerCase()));
    }

    const updated = {
      ...userProfile,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    try {
      await updateDoc(userRef, data as any);
      setUserProfile(updated);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const updateThemeColors = async (presetId: string, colors: CustomColors) => {
    applyThemeToDOM(colors);
    const themeData = {
      activePresetId: presetId,
      colors,
    };
    try {
      localStorage.setItem('nexus_custom_theme', JSON.stringify(themeData));
    } catch {
      // Ignore
    }

    if (currentUser && userProfile) {
      setUserProfile({
        ...userProfile,
        customTheme: themeData,
      });
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          customTheme: themeData,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
      }
    }
  };

  const resetThemeColors = async () => {
    await updateThemeColors('navy-deep', defaultColors);
  };

  const deactivateAccount = async (confirmedUsername: string) => {
    if (!currentUser || !userProfile) return;
    if (confirmedUsername.trim() !== userProfile.username) {
      throw new Error('Inputted username does not match your username.');
    }

    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        isDeactivated: true,
      });
      localStorage.removeItem('nexus_session_uid');
      setCurrentUser(null);
      setUserProfile(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const deleteAccount = async (password: string, immediate: boolean) => {
    if (!currentUser || !userProfile) return;

    // Validate password
    const accDoc = await getDoc(doc(db, 'accounts', userProfile.username.toLowerCase()));
    if (accDoc.exists() && accDoc.data().password !== password) {
      throw new Error('Incorrect password');
    }

    if (immediate) {
      const uid = currentUser.uid;
      const lowerUsername = userProfile.username.toLowerCase();
      const lowerEmail = userProfile.email.toLowerCase();

      // Delete from Firestore
      await deleteDoc(doc(db, 'users', uid));
      await deleteDoc(doc(db, 'usernames', lowerUsername));
      await deleteDoc(doc(db, 'accounts', lowerUsername));
      await deleteDoc(doc(db, 'accounts', lowerEmail));

      localStorage.removeItem('nexus_session_uid');
      setCurrentUser(null);
      setUserProfile(null);
    } else {
      // 7-day grace period
      await updateDoc(doc(db, 'users', currentUser.uid), {
        deletionRequestedAt: new Date().toISOString(),
        deletionGracePeriod: true,
      });
      localStorage.removeItem('nexus_session_uid');
      setCurrentUser(null);
      setUserProfile(null);
    }
  };

  const changePassword = async (currentPass: string, newPass: string) => {
    if (!currentUser || !userProfile) return;

    const accDoc = await getDoc(doc(db, 'accounts', userProfile.username.toLowerCase()));
    if (!accDoc.exists() || accDoc.data().password !== currentPass) {
      throw new Error('Current password entered is incorrect');
    }

    await updateDoc(doc(db, 'accounts', userProfile.username.toLowerCase()), {
      password: newPass,
    });
    await updateDoc(doc(db, 'accounts', userProfile.email.toLowerCase()), {
      password: newPass,
    });
  };

  const refreshProfile = async () => {
    if (currentUser) {
      await loadUserProfileByUid(currentUser.uid);
    }
  };

  const isAdmin = userProfile?.role === 'admin' || userProfile?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const isModOrAdmin = isAdmin || userProfile?.role === 'mod';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        isAdmin,
        isModOrAdmin,
        login,
        signup,
        logout,
        updateProfileData,
        updateThemeColors,
        resetThemeColors,
        deactivateAccount,
        deleteAccount,
        changePassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
