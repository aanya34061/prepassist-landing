import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

/**
 * @typedef {{ id: string; email: string | null; name: string; picture: string | null; provider: string; isGuest: boolean; signedInAt: string }} AuthUser
 * @typedef {{
 *   user: AuthUser | null;
 *   isLoading: boolean;
 *   isFirstLaunch: boolean;
 *   isGuestMode: boolean;
 *   signIn: (userData: any) => Promise<void>;
 *   signOut: () => Promise<void>;
 *   signInAsGuest: (name?: string) => Promise<AuthUser>;
 *   signInWithEmail: (email: string, password: string) => Promise<any>;
 *   signUpWithEmail: (email: string, password: string, name: string, phone?: string) => Promise<any>;
 *   sendMagicLink: (email: string, name?: string) => Promise<boolean>;
 *   sendPasswordResetEmail: (email: string) => Promise<boolean>;
 *   sendPasswordOTP: (email: string) => Promise<boolean>;
 *   verifyOTPAndResetPassword: (email: string, token: string, newPassword: string) => Promise<boolean>;
 *   resetPassword: (newPassword: string) => Promise<boolean>;
 *   deleteAccount: () => Promise<void>;
 *   updateUser: (updates: Partial<AuthUser>) => Promise<void>;
 *   completeOnboarding: () => Promise<void>;
 *   isAuthenticated: boolean;
 * }} AuthContextType
 */

/** @type {React.Context<AuthContextType>} */
const AuthContext = createContext(/** @type {AuthContextType} */ ({
  user: null,
  isLoading: true,
  isFirstLaunch: true,
  isGuestMode: false,
  signIn: async () => {},
  signOut: async () => {},
  signInAsGuest: async () => ({}),
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  sendMagicLink: async () => false,
  sendPasswordResetEmail: async () => false,
  sendPasswordOTP: async () => false,
  verifyOTPAndResetPassword: async () => false,
  resetPassword: async () => false,
  deleteAccount: async () => {},
  updateUser: async () => {},
  completeOnboarding: async () => {},
  isAuthenticated: false,
}));

const USER_STORAGE_KEY = '@upsc_user';
const GUEST_USER_KEY = '@upsc_guest_user';
const SUPABASE_SESSION_KEY = '@upsc_supabase_session';

// Generate a unique guest ID
const generateGuestId = () => {
  return 'guest_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const [isGuestMode, setIsGuestMode] = useState(false);

  // Refs to avoid stale closures in the auth listener
  const isGuestModeRef = useRef(false);
  const isSigningInRef = useRef(false);

  // Check for existing user session on app launch
  useEffect(() => {
    checkUserSession();

    // Set up Supabase auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] Auth state changed:', event);

      // Skip events while we're handling sign-in directly (prevents race conditions)
      if (isSigningInRef.current) {
        console.log('[AuthContext] Skipping auth event during direct sign-in');
        return;
      }

      if (event === 'SIGNED_IN' && session?.user) {
        await handleSupabaseUser(session.user, session);
      } else if (event === 'SIGNED_OUT') {
        // Only clear if user is not in guest mode (use ref to avoid stale closure)
        if (!isGuestModeRef.current) {
          await clearUserData();
        }
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleSupabaseUser = async (supabaseUser, session) => {
    try {
      const userData = {
        id: supabaseUser.id,
        email: supabaseUser.email,
        name: supabaseUser.user_metadata?.name ||
          supabaseUser.user_metadata?.full_name ||
          supabaseUser.email?.split('@')[0] || 'User',
        picture: supabaseUser.user_metadata?.picture || null,
        provider: 'supabase',
        isGuest: false,
        signedInAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      if (session) {
        await AsyncStorage.setItem(SUPABASE_SESSION_KEY, JSON.stringify(session));
      }
      await AsyncStorage.setItem('@has_launched', 'true');

      setUser(userData);
      setIsGuestMode(false);
      isGuestModeRef.current = false;
      setIsFirstLaunch(false);

      console.log('[AuthContext] Supabase user signed in:', userData.email);
    } catch (error) {
      console.error('[AuthContext] Error handling Supabase user:', error);
    }
  };

  const clearUserData = async () => {
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
    await AsyncStorage.removeItem(SUPABASE_SESSION_KEY);
    setUser(null);
    setIsGuestMode(false);
    isGuestModeRef.current = false;
  };

  const checkUserSession = async () => {
    try {
      console.log('[AuthContext] Checking user session...');

      const hasLaunched = await AsyncStorage.getItem('@has_launched');
      if (hasLaunched) {
        setIsFirstLaunch(false);
      }

      // First, check for active Supabase session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (session?.user && !error) {
        console.log('[AuthContext] Found active Supabase session');
        await handleSupabaseUser(session.user, session);
        setIsLoading(false);
        return;
      }

      // Check for stored user (regular or guest)
      const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
      const guestUser = await AsyncStorage.getItem(GUEST_USER_KEY);

      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);

          // Trust stored user data on reload. If the Supabase session is truly
          // expired, the onAuthStateChange listener will fire SIGNED_OUT and
          // clear the user. This prevents the flash-to-landing-page on web
          // where getSession() may return null before the session loads.
          setUser(userData);
          setIsGuestMode(userData.isGuest || false);
          isGuestModeRef.current = userData.isGuest || false;
          console.log('[AuthContext] User restored from storage:', userData.email || userData.name);
        } catch (e) {
          console.error('[AuthContext] Error parsing stored user:', e);
        }
      } else if (guestUser) {
        try {
          const userData = JSON.parse(guestUser);
          setUser(userData);
          setIsGuestMode(true);
          isGuestModeRef.current = true;
          console.log('[AuthContext] Guest user restored:', userData.name);
        } catch (e) {
          console.error('[AuthContext] Error parsing guest user:', e);
        }
      }
    } catch (error) {
      console.error('[AuthContext] Error checking user session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (userData) => {
    try {
      console.log('[AuthContext] Signing in user:', userData.email || userData.name);
      const userToStore = {
        ...userData,
        signedInAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userToStore));
      await AsyncStorage.setItem('@has_launched', 'true');
      setUser(userToStore);
      setIsGuestMode(userData.isGuest || false);
      isGuestModeRef.current = userData.isGuest || false;
      setIsFirstLaunch(false);
    } catch (error) {
      console.error('[AuthContext] Error signing in:', error);
      throw error;
    }
  };

  // Sign in as guest - no backend required
  const signInAsGuest = async (name = 'Guest User') => {
    try {
      console.log('[AuthContext] Signing in as guest:', name);
      const guestUser = {
        id: generateGuestId(),
        name: name,
        email: null,
        picture: null,
        provider: 'guest',
        isGuest: true,
        signedInAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(guestUser));
      await AsyncStorage.setItem(GUEST_USER_KEY, JSON.stringify(guestUser));
      await AsyncStorage.setItem('@has_launched', 'true');
      setUser(guestUser);
      setIsGuestMode(true);
      isGuestModeRef.current = true;
      setIsFirstLaunch(false);
      return guestUser;
    } catch (error) {
      console.error('[AuthContext] Error signing in as guest:', error);
      throw error;
    }
  };

  const signOut = async () => {
    console.log('[AuthContext] Signing out user');

    // Clear local state immediately so UI updates instantly
    setUser(null);
    setIsGuestMode(false);
    isGuestModeRef.current = false;

    // Clear storage in parallel
    await Promise.all([
      AsyncStorage.removeItem(USER_STORAGE_KEY),
      AsyncStorage.removeItem(GUEST_USER_KEY),
      AsyncStorage.removeItem(SUPABASE_SESSION_KEY),
    ]).catch(() => {});

    // Sign out from Supabase in background (don't block UI)
    if (user?.provider === 'supabase') {
      Promise.race([
        supabase.auth.signOut(),
        new Promise(r => setTimeout(r, 3000)), // 3s timeout
      ]).catch(() => {});
    }
  };

  // Supabase sign in with email and password
  const signInWithEmail = async (email, password) => {
    try {
      console.log('[AuthContext] Signing in with Supabase:', email);

      // Flag to prevent the onAuthStateChange listener from racing with us
      isSigningInRef.current = true;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[AuthContext] Sign in error:', error.message);
        throw new Error(error.message);
      }

      if (!data?.user) {
        throw new Error('No user data returned from sign in');
      }

      // Directly handle the user (like signUpWithEmail does) for instant state update
      await handleSupabaseUser(data.user, data.session);

      console.log('[AuthContext] Sign in successful:', data.user.email);
      return data.user;
    } catch (error) {
      console.error('[AuthContext] Error in signInWithEmail:', error);
      throw error;
    } finally {
      isSigningInRef.current = false;
    }
  };

  // Supabase sign up with email and password
  const signUpWithEmail = async (email, password, name, phone = '') => {
    try {
      console.log('[AuthContext] Signing up with Supabase:', email);

      const signUpOptions = {
        email,
        password,
        options: {
          data: {
            name: name,
            full_name: name,
            phone: phone || null,
          },
          // Use proper redirect URL based on platform
          emailRedirectTo: Platform.OS === 'web'
            ? `${window.location.origin}/auth/callback`
            : 'upscprep://auth/callback',
        },
      };

      // Note: Phone is stored in user_metadata (options.data.phone)
      // The auth.users.phone column requires phone auth/verification to be enabled

      const { data, error } = await supabase.auth.signUp(signUpOptions);

      if (error) {
        console.error('[AuthContext] Sign up error:', error.message);
        throw new Error(error.message);
      }

      if (!data?.user) {
        throw new Error('No user data returned from sign up');
      }

      console.log('[AuthContext] Sign up response:', {
        userId: data.user.id,
        email: data.user.email,
        emailConfirmed: !!data.user.email_confirmed_at,
        hasSession: !!data.session,
      });

      // If we got a session, the user is signed in (email confirmation disabled)
      if (data.session) {
        console.log('[AuthContext] User signed in immediately after signup');
        // Directly handle the user to ensure state update
        await handleSupabaseUser(data.user, data.session);

        // Initialize 10 free credits for new user
        try {
          const { error: creditError } = await supabase.rpc('add_credits', {
            p_user_id: data.user.id,
            p_credits: 10,
            p_transaction_type: 'signup_bonus',
            p_payment_id: null,
            p_description: 'Welcome bonus - 10 free credits'
          });
          if (creditError) {
            console.error('[AuthContext] Failed to add signup credits via RPC:', creditError.message);
            // Fallback: direct insert
            await supabase.from('user_subscriptions').upsert({
              user_id: data.user.id,
              plan_type: 'free',
              current_credits: 10,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });
          } else {
            console.log('[AuthContext] Signup bonus: 10 free credits added');
          }
        } catch (e) {
          console.error('[AuthContext] Credit init error:', e);
        }

        return data.user;
      }

      // No session means email confirmation is required
      // Return the user with email_confirmed_at = null so the UI can show the verification message
      console.log('[AuthContext] Email confirmation required - returning user for verification');
      return data.user;
    } catch (error) {
      console.error('[AuthContext] signUpWithEmail Error:', error);
      throw error;
    }
  };

  // Send OTP for password reset
  const sendPasswordOTP = async (email) => {
    try {
      console.log('[AuthContext] Sending password reset OTP to:', email);

      // Use signInWithOtp with shouldCreateUser: false to only work for existing users
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false, // Only send OTP to existing users
        },
      });

      if (error) {
        console.error('[AuthContext] Password reset OTP error:', error.message);
        // If user doesn't exist, give a generic message for security
        if (error.message.includes('User not found') || error.message.includes('Signups not allowed')) {
          throw new Error('If an account exists with this email, a verification code has been sent.');
        }
        throw new Error(error.message);
      }

      console.log('[AuthContext] Password reset OTP sent successfully');
      return true;
    } catch (error) {
      console.error('[AuthContext] Error in sendPasswordOTP:', error);
      throw error;
    }
  };

  // Verify OTP and reset password
  const verifyOTPAndResetPassword = async (email, token, newPassword) => {
    try {
      console.log('[AuthContext] Verifying OTP for:', email);

      // First, verify the OTP to get a session
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email', // Using email OTP type
      });

      if (verifyError) {
        console.error('[AuthContext] OTP verification error:', verifyError.message);
        throw new Error(verifyError.message || 'Invalid or expired verification code');
      }

      if (!data?.session) {
        throw new Error('Verification failed. Please try again.');
      }

      console.log('[AuthContext] OTP verified, updating password');

      // Now update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error('[AuthContext] Password update error:', updateError.message);
        throw new Error(updateError.message || 'Failed to update password');
      }

      // Sign out after password reset so user can login with new password
      await supabase.auth.signOut();

      console.log('[AuthContext] Password reset successful');
      return true;
    } catch (error) {
      console.error('[AuthContext] Error in verifyOTPAndResetPassword:', error);
      throw error;
    }
  };

  const sendPasswordResetEmail = async (email) => {
    // Keep for backward compatibility, but now uses OTP
    return sendPasswordOTP(email);
  };

  // Reset password with new password (after clicking reset link)
  const resetPassword = async (newPassword) => {
    try {
      console.log('[AuthContext] Resetting password');

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('[AuthContext] Reset password error:', error.message);
        throw new Error(error.message);
      }

      console.log('[AuthContext] Password reset successful');
      return true;
    } catch (error) {
      console.error('[AuthContext] Error in resetPassword:', error);
      throw error;
    }
  };

  // Send Magic Link (Passwordless Sign In/Up)
  const sendMagicLink = async (email, name) => {
    try {
      console.log('[AuthContext] Sending magic link to:', email);

      const options = {
        emailRedirectTo: Platform.OS === 'web'
          ? `${window.location.origin}/auth/callback`
          : 'upscprep://auth/callback',
      };

      // If name is provided, add it to user metadata
      if (name) {
        options.options = {
          data: {
            name: name,
            full_name: name,
          }
        };
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        ...options,
      });

      if (error) {
        console.error('[AuthContext] Magic link error:', error.message);
        throw new Error(error.message);
      }

      console.log('[AuthContext] Magic link sent successfully');
      return true;
    } catch (error) {
      console.error('[AuthContext] Error in sendMagicLink:', error);
      throw error;
    }
  };

  const deleteAccount = async () => {
    try {
      // Clear all user data
      const keysToRemove = [
        USER_STORAGE_KEY,
        '@upsc_stats',
        '@upsc_streak',
        '@upsc_test_history',
        '@upsc_settings',
        '@question_bank',
      ];
      await AsyncStorage.multiRemove(keysToRemove);
      setUser(null);
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  };

  const updateUser = async (updates) => {
    try {
      const updatedUser = { ...user, ...updates };
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('@has_launched', 'true');
      setIsFirstLaunch(false);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isFirstLaunch,
        isGuestMode,
        signIn,
        signOut,
        signInAsGuest,
        signInWithEmail,
        signUpWithEmail,
        sendMagicLink,
        sendPasswordResetEmail,
        sendPasswordOTP,
        verifyOTPAndResetPassword,
        resetPassword,
        deleteAccount,
        updateUser,
        completeOnboarding,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

