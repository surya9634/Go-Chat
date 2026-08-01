import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CallSession, CallType, User } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useToast } from './ToastContext';

interface CallContextType {
  activeCall: CallSession | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  initiateCall: (targetUser: User, conversationId: string, type: CallType) => void;
  acceptCall: () => void;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // Use refs to always have the latest stream for cleanup without stale closures
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const stopStream = (stream: MediaStream | null) => {
    if (stream) stream.getTracks().forEach((t) => t.stop());
  };

  // Stable cleanup that always references current streams via refs
  const cleanupCall = useCallback(() => {
    stopStream(localStreamRef.current);
    stopStream(remoteStreamRef.current);
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    setActiveCall(null);
  }, []); // no deps needed — reads from refs

  // Initiate call
  const initiateCall = useCallback(
    async (targetUser: User, conversationId: string, type: CallType) => {
      if (!currentUser) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === 'video',
        });

        localStreamRef.current = stream;
        setLocalStream(stream);

        const newCall: CallSession = {
          id: Math.random().toString(36).substring(2, 9),
          conversationId,
          caller: currentUser,
          receiver: targetUser,
          type,
          status: 'calling',
          durationSeconds: 0,
          isMuted: false,
          isVideoOff: false,
          isScreenSharing: false,
        };

        setActiveCall(newCall);

        // Simulate the remote side accepting after 2.5s (demo mode)
        setTimeout(() => {
          setActiveCall((prev) => {
            if (prev && prev.status === 'calling') {
              callTimerRef.current = setInterval(() => {
                setActiveCall((c) =>
                  c ? { ...c, durationSeconds: c.durationSeconds + 1 } : null
                );
              }, 1000);
              return { ...prev, status: 'connected', startedAt: Date.now() };
            }
            return prev;
          });
        }, 2500);
      } catch (err: any) {
        showToast(
          err.name === 'NotAllowedError'
            ? `Camera/microphone permission denied. Please allow access in your browser.`
            : `Could not access ${type} devices: ${err.message}`,
          'error'
        );
      }
    },
    [currentUser, showToast]
  );

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    if (!activeCall) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: activeCall.type === 'video',
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      callTimerRef.current = setInterval(() => {
        setActiveCall((c) => (c ? { ...c, durationSeconds: c.durationSeconds + 1 } : null));
      }, 1000);

      setActiveCall((prev) =>
        prev ? { ...prev, status: 'connected', startedAt: Date.now() } : null
      );
      showToast('Call connected', 'success');
    } catch (err: any) {
      showToast(`Failed to accept call: ${err.message}`, 'error');
      cleanupCall();
    }
  }, [activeCall, showToast, cleanupCall]);

  const declineCall = useCallback(() => {
    showToast('Call declined', 'info');
    cleanupCall();
  }, [showToast, cleanupCall]);

  const endCall = useCallback(() => {
    showToast('Call ended', 'info');
    cleanupCall();
  }, [showToast, cleanupCall]);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setActiveCall((prev) => (prev ? { ...prev, isMuted: !audioTrack.enabled } : null));
      }
    }
  }, []);

  // Toggle Video
  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setActiveCall((prev) =>
          prev ? { ...prev, isVideoOff: !videoTrack.enabled } : null
        );
      }
    }
  }, []);

  // Toggle Screen Share
  const toggleScreenShare = useCallback(async () => {
    if (!activeCall) return;
    try {
      if (!activeCall.isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        localStreamRef.current = screenStream;
        setLocalStream(screenStream);
        setActiveCall((prev) => (prev ? { ...prev, isScreenSharing: true } : null));
        screenStream.getVideoTracks()[0].onended = () => {
          setActiveCall((prev) => (prev ? { ...prev, isScreenSharing: false } : null));
        };
      } else {
        const camStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: activeCall.type === 'video',
        });
        localStreamRef.current = camStream;
        setLocalStream(camStream);
        setActiveCall((prev) => (prev ? { ...prev, isScreenSharing: false } : null));
      }
    } catch (err: any) {
      showToast(`Screen share error: ${err.message}`, 'error');
    }
  }, [activeCall, showToast]);

  return (
    <CallContext.Provider
      value={{
        activeCall,
        localStream,
        remoteStream,
        initiateCall,
        acceptCall,
        declineCall,
        endCall,
        toggleMute,
        toggleVideo,
        toggleScreenShare,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within CallProvider');
  return context;
};
