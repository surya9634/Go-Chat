import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-dark-bg flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          <span className="text-sm text-dark-subtext font-medium">Connecting to Go-Chat...</span>
        </div>
      </div>
    );
  }

  return <div className="h-screen w-screen overflow-hidden bg-dark-bg flex">{children}</div>;
};
