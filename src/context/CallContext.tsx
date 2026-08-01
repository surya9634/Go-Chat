import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CallSession, CallType, User } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useToast } from './ToastContext';
import { pb } from '../services/pocketbase';

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

  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const stopStream = (stream: MediaStream | null) => {
    if (stream) stream.getTracks().forEach((t) => t.stop());
  };

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
  }, []);

  // Send real-time call signal via PocketBase messages
  const sendSignal = useCallback(
    async (
      conversationId: string,
      type: CallType,
      action: 'start' | 'accept' | 'decline' | 'end',
      callId: string,
      targetUserId: string
    ) => {
      if (!currentUser?.id) return;
      try {
        await pb.collection('messages').create({
          conversation: conversationId,
          sender: currentUser.id,
          text: `[CALL_SIGNAL:${type}:${action}:${callId}:${currentUser.id}:${targetUserId}]`,
        });
      } catch (_) {}
    },
    [currentUser?.id]
  );

  // Real-time listener for incoming call signals across devices
  useEffect(() => {
    if (!currentUser?.id) return;

    let unbind: (() => void) | null = null;
    pb.collection('messages')
      .subscribe('*', (e) => {
        if (e.action !== 'create') return;
        const text = (e.record as any)?.text || '';
        if (!text.startsWith('[CALL_SIGNAL:')) return;

        const content = text.slice(13, -1);
        const parts = content.split(':');
        if (parts.length < 5) return;
        const [type, action, callId, senderId, targetId] = parts as [CallType, string, string, string, string];

        // Check if signal is aimed at the current logged in user
        if (targetId === currentUser.id) {
          if (action === 'start') {
            const callerUser = (e.record as any).expand?.sender || { id: senderId, username: 'User' };
            setActiveCall({
              id: callId,
              conversationId: (e.record as any).conversation,
              caller: callerUser,
              receiver: currentUser,
              type,
              status: 'incoming',
              durationSeconds: 0,
              isMuted: false,
              isVideoOff: false,
              isScreenSharing: false,
            });
          } else if (action === 'accept') {
            setActiveCall((prev) => {
              if (prev && prev.id === callId) {
                if (callTimerRef.current) clearInterval(callTimerRef.current);
                callTimerRef.current = setInterval(() => {
                  setActiveCall((c) => (c ? { ...c, durationSeconds: c.durationSeconds + 1 } : null));
                }, 1000);
                return { ...prev, status: 'connected', startedAt: Date.now() };
              }
              return prev;
            });
            showToast('Call connected', 'success');
          } else if (action === 'decline' || action === 'end') {
            cleanupCall();
            showToast(action === 'decline' ? 'Call declined' : 'Call ended', 'info');
          }
        }
      })
      .then((unsub) => {
        unbind = unsub;
      })
      .catch(() => {});

    return () => {
      if (unbind) {
        try { unbind(); } catch (_) {}
      }
    };
  }, [currentUser?.id, cleanupCall, showToast]);

  // Initiate outgoing call
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

        const callId = Math.random().toString(36).substring(2, 9);
        const newCall: CallSession = {
          id: callId,
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

        // Send start signal to receiver via PocketBase
        await sendSignal(conversationId, type, 'start', callId, targetUser.id);
      } catch (err: any) {
        showToast(
          err.name === 'NotAllowedError'
            ? `Camera/microphone permission denied. Please allow access in your browser.`
            : `Could not access ${type} devices: ${err.message}`,
          'error'
        );
      }
    },
    [currentUser, showToast, sendSignal]
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

      if (callTimerRef.current) clearInterval(callTimerRef.current);
      callTimerRef.current = setInterval(() => {
        setActiveCall((c) => (c ? { ...c, durationSeconds: c.durationSeconds + 1 } : null));
      }, 1000);

      setActiveCall((prev) =>
        prev ? { ...prev, status: 'connected', startedAt: Date.now() } : null
      );

      // Send accept signal back to caller
      await sendSignal(
        activeCall.conversationId,
        activeCall.type,
        'accept',
        activeCall.id,
        activeCall.caller.id
      );

      showToast('Call connected', 'success');
    } catch (err: any) {
      showToast(`Failed to accept call: ${err.message}`, 'error');
      cleanupCall();
    }
  }, [activeCall, showToast, cleanupCall, sendSignal]);

  const declineCall = useCallback(async () => {
    if (activeCall) {
      await sendSignal(
        activeCall.conversationId,
        activeCall.type,
        'decline',
        activeCall.id,
        activeCall.caller.id
      );
    }
    showToast('Call declined', 'info');
    cleanupCall();
  }, [activeCall, showToast, cleanupCall, sendSignal]);

  const endCall = useCallback(async () => {
    if (activeCall && currentUser) {
      const otherUser = activeCall.caller.id === currentUser.id ? activeCall.receiver : activeCall.caller;
      await sendSignal(
        activeCall.conversationId,
        activeCall.type,
        'end',
        activeCall.id,
        otherUser.id
      );
    }
    showToast('Call ended', 'info');
    cleanupCall();
  }, [activeCall, currentUser, showToast, cleanupCall, sendSignal]);

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
