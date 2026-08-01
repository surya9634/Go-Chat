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

export function App() {
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
