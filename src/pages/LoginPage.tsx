import React, { useState } from 'react';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { ForgotPasswordModal } from '../components/auth/ForgotPasswordModal';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Shield } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const [view, setView] = useState<'login' | 'register'>('login');
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="h-screen max-h-screen w-full bg-background text-foreground flex flex-col items-center justify-between p-3 sm:p-6 relative overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Background Ambient Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-600/5 rounded-full blur-[90px] pointer-events-none" />

      {/* Top Header Bar with Theme Toggle */}
      <div className="absolute top-3 right-3 sm:top-5 sm:right-6 z-20 flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-2xl bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all shadow-sm"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-md z-10 my-auto py-2">
        {/* Navigation Mode Switcher Tabs */}
        <div className="flex bg-card/80 border border-border/80 p-1 rounded-2xl mb-3 sm:mb-4 shadow-sm backdrop-blur-md">
          <button
            onClick={() => setView('login')}
            className={`flex-1 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
              view === 'login'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setView('register')}
            className={`flex-1 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
              view === 'register'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Dynamic Form View */}
        {view === 'login' ? (
          <LoginForm
            onSwitchToRegister={() => setView('register')}
            onOpenForgotPassword={() => setIsForgotPasswordOpen(true)}
          />
        ) : (
          <RegisterForm onSwitchToLogin={() => setView('login')} />
        )}
      </div>

      {/* Footer Info */}
      <div className="z-10 text-center pb-1 pt-2 shrink-0">
        <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium flex items-center justify-center gap-1.5">
          <Shield className="w-3 h-3 text-emerald-500" />
          End-to-End Encrypted & Secure • Go-Chat Realtime Network
        </p>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
      />
    </div>
  );
};
