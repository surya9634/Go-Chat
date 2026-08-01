import React from 'react';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { CallProvider } from './context/CallContext';
import { StoryProvider } from './context/StoryContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppLayout } from './layouts/AppLayout';
import { ChatPage } from './pages/ChatPage';
import { AuthScreen } from './pages/LoginPage';
import { CallModal } from './components/modals/CallModal';
import { StoryViewerModal } from './components/stories/StoryViewerModal';
import { CreateStoryModal } from './components/stories/CreateStoryModal';
import AdminPage from './pages/AdminPage';

// ─── Admin Route Guard ─────────────────────────────────────────────────────────
// The admin panel is completely isolated from user auth/context.
// It has its own session stored in sessionStorage.
const isAdminRoute = () =>
  typeof window !== 'undefined' && window.location.pathname === '/admin';

// ─── Main Router ───────────────────────────────────────────────────────────────
const MainRouter: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <ChatProvider>
      <AppLayout>
        <ChatPage />
        <CallModal />
        <StoryViewerModal />
        <CreateStoryModal />
      </AppLayout>
    </ChatProvider>
  );
};

// ─── App Root ──────────────────────────────────────────────────────────────────
export function App() {
  // Admin route: render completely isolated, no user providers
  if (isAdminRoute()) {
    return <AdminPage />;
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <CallProvider>
            <StoryProvider>
              <MainRouter />
            </StoryProvider>
          </CallProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
