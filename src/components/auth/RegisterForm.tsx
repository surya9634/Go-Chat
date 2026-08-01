import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Mail, Lock, User as UserIcon, UserPlus, Loader2, Upload, Eye, EyeOff, MessageSquare } from 'lucide-react';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const { signUp, updateProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password || password !== passwordConfirm) return;

    try {
      setIsSubmitting(true);
      await signUp(username, email, password, passwordConfirm, avatarFile || undefined);
    } catch (err) {
      // Error toast shown by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 sm:p-6 rounded-3xl bg-card/95 border border-border/60 shadow-2xl backdrop-blur-xl transition-all">
      {/* Compact Brand Header */}
      <div className="text-center mb-3 sm:mb-4">
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 mb-1.5 shadow-inner">
          <MessageSquare className="w-5 h-5" />
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">Create Account</h2>
        <p className="text-[11px] sm:text-xs text-muted-foreground font-medium">
          Join Go-Chat realtime network
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-3">
        {/* Compact Avatar + Username Row */}
        <div className="flex items-center gap-3">
          <label className="relative cursor-pointer group shrink-0">
            <div className="w-12 h-12 rounded-full bg-background border-2 border-dashed border-border flex items-center justify-center overflow-hidden group-hover:border-emerald-500 transition-all shadow-sm">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <Upload className="w-4 h-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </label>
          <div className="flex-1 min-w-0">
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
              Username
            </label>
            <div className="relative">
              <UserIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="alex_dev"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-muted-foreground/60"
              />
            </div>
          </div>
        </div>

        {/* Email Address */}
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@company.com"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        {/* Passwords in 2-Column Grid on sm+ or compact stack */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 chars"
                className="w-full pl-8 pr-8 py-2 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-muted-foreground/60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
              Confirm Pass
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="Confirm"
                className="w-full pl-8 pr-8 py-2 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-muted-foreground/60"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
              >
                {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {passwordConfirm && password !== passwordConfirm && (
          <span className="text-[10px] text-rose-400 font-semibold block text-center">Passwords do not match</span>
        )}

        <button
          type="submit"
          disabled={isSubmitting || (!!passwordConfirm && password !== passwordConfirm)}
          className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Registering...
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" /> Create Account
            </>
          )}
        </button>
      </form>

      {/* Switch to Login */}
      <div className="mt-3 text-center border-t border-border/50 pt-3">
        <p className="text-xs text-muted-foreground">
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-emerald-500 hover:text-emerald-400 font-bold transition-colors underline-offset-4 hover:underline"
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
};
