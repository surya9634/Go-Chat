import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { pb, authService } from '../services/pocketbase';
import { useToast } from './ToastContext';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signUp: (username: string, email: string, pass: string, passConfirm: string) => Promise<void>;
  logout: () => void;
  requestPasswordReset: (email: string) => Promise<void>;
  requestVerification: (email: string) => Promise<void>;
  updateProfile: (data: Partial<User> | FormData) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(
    ((pb.authStore.model as unknown) as User | null) || null
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { showToast } = useToast();

  useEffect(() => {
    // Sync PocketBase auth store changes
    const unsubscribe = pb.authStore.onChange((token, model) => {
      setCurrentUser((model as unknown as User) || null);
    });

    if (pb.authStore.isValid && pb.authStore.model) {
      // Refresh auth store to verify token validity
      pb.collection('users').authRefresh<User>()
        .then((res) => {
          setCurrentUser(res.record);
          authService.updatePresence(true);
        })
        .catch(() => {
          pb.authStore.clear();
          setCurrentUser(null);
          showToast('Session expired. Please log in again.', 'warning', 'Session Expired');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }

    return () => {
      unsubscribe();
    };
  }, [showToast]);

  // Online status presence listener
  useEffect(() => {
    if (!currentUser?.id) return;

    const handleFocus = () => authService.updatePresence(true);
    const handleBlur = () => authService.updatePresence(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Heartbeat every 2 minutes
    const heartbeat = setInterval(() => {
      authService.updatePresence(true);
    }, 120000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      clearInterval(heartbeat);
    };
  }, [currentUser?.id]);

  const login = async (email: string, pass: string) => {
    try {
      const user = await authService.login(email, pass);
      setCurrentUser(user);
      showToast(`Welcome back, ${user.username || 'User'}!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Invalid email or password', 'error', 'Login Failed');
      throw err;
    }
  };

  const signUp = async (username: string, email: string, pass: string, passConfirm: string) => {
    try {
      const user = await authService.signUp(username, email, pass, passConfirm);
      setCurrentUser(user);
      showToast('Account created successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to create account', 'error', 'Sign Up Error');
      throw err;
    }
  };

  const logout = () => {
    authService.logout();
    setCurrentUser(null);
    showToast('Logged out successfully', 'info');
  };

  const requestPasswordReset = async (email: string) => {
    try {
      await authService.requestPasswordReset(email);
      showToast('Password reset link sent to your email', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to send reset email', 'error');
      throw err;
    }
  };

  const requestVerification = async (email: string) => {
    try {
      await authService.requestVerification(email);
      showToast('Verification email dispatched', 'success');
    } catch (err: any) {
      showToast(err.message || 'Verification request failed', 'error');
      throw err;
    }
  };

  const updateProfile = async (data: Partial<User> | FormData) => {
    if (!currentUser?.id) return;
    try {
      const updated = await authService.updateProfile(currentUser.id, data);
      setCurrentUser(updated);
      showToast('Profile updated', 'success');
    } catch (err: any) {
      showToast(err.message || 'Profile update failed', 'error');
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser && pb.authStore.isValid,
        isLoading,
        login,
        signUp,
        logout,
        requestPasswordReset,
        requestVerification,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
