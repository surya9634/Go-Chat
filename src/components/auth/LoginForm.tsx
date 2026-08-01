import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Mail, Lock, LogIn, Loader2, Eye, EyeOff, MessageSquare } from 'lucide-react';

interface LoginFormProps {
  onSwitchToRegister: () => void;
  onOpenForgotPassword: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSwitchToRegister,
  onOpenForgotPassword,
}) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setIsSubmitting(true);
      await login(email, password);
    } catch (err) {
      // Handled by AuthContext toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 rounded-3xl bg-card/90 border border-border/60 shadow-2xl backdrop-blur-xl transition-all">
      {/* Brand Header */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 mb-3 shadow-inner">
          <MessageSquare className="w-7 h-7" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">Welcome Back</h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 font-medium">
          Sign in to your Go-Chat account
        </p>
      </div>

      {/* Auth Form */}
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Email or Username
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="username or name@example.com"
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-background border border-border text-foreground text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Password
            </label>
            <button
              type="button"
              onClick={onOpenForgotPassword}
              className="text-xs text-emerald-500 hover:text-emerald-400 font-semibold transition-colors"
            >
              Forgot?
            </button>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-10 py-3 rounded-2xl bg-background border border-border text-foreground text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-muted-foreground/60"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Signing In...
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" /> Sign In
            </>
          )}
        </button>
      </form>

      {/* Switch to Register */}
      <div className="mt-6 sm:mt-8 text-center border-t border-border/50 pt-5 sm:pt-6">
        <p className="text-xs sm:text-sm text-muted-foreground">
          Don't have an account?{' '}
          <button
            onClick={onSwitchToRegister}
            className="text-emerald-500 hover:text-emerald-400 font-bold transition-colors underline-offset-4 hover:underline"
          >
            Create Account
          </button>
        </p>
      </div>
    </div>
  );
};
