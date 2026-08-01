import React, { useEffect, useRef, useState } from 'react';
import { useCall } from '../../context/CallContext';
import { getPocketBaseFileUrl } from '../../utils/formatters';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  PhoneCall,
  Monitor,
  MonitorOff,
  Phone,
} from 'lucide-react';

export const CallModal: React.FC = () => {
  const {
    activeCall,
    localStream,
    remoteStream,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
  } = useCall();

  // Separate refs for main video and PiP preview
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Bind localStream → PiP (caller side preview)
  useEffect(() => {
    if (pipVideoRef.current && localStream) {
      pipVideoRef.current.srcObject = localStream;
    }
    if (mainVideoRef.current && localStream && !remoteStream) {
      mainVideoRef.current.srcObject = localStream;
    }
  }, [localStream, remoteStream]);

  // Bind remoteStream → main stage
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Auto-hide controls after 4s of no interaction in a connected call
  const showControls = () => {
    setControlsVisible(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    if (activeCall?.status === 'connected' && activeCall.type === 'video') {
      controlsTimerRef.current = setTimeout(() => setControlsVisible(false), 4000);
    }
  };

  useEffect(() => {
    if (activeCall?.status === 'connected' && activeCall.type === 'video') {
      controlsTimerRef.current = setTimeout(() => setControlsVisible(false), 4000);
    } else {
      setControlsVisible(true);
    }
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [activeCall?.status, activeCall?.type]);

  if (!activeCall) return null;

  const isIncoming = activeCall.status === 'incoming';
  const isCalling = activeCall.status === 'calling';
  const isConnected = activeCall.status === 'connected';

  const targetUser =
    activeCall.status === 'incoming' ? activeCall.caller : activeCall.receiver;

  const avatarSrc = targetUser.avatar
    ? getPocketBaseFileUrl(targetUser, targetUser.avatar)
    : undefined;

  const initials = (targetUser.username || 'U').substring(0, 2).toUpperCase();

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ─── Incoming Call Banner ───────────────────────────────────────────────────
  if (isIncoming) {
    return (
      <div className="fixed top-5 right-5 z-[100] max-w-sm w-full animate-slide-in-right">
        <div className="relative overflow-hidden rounded-2xl bg-zinc-900/95 border border-white/10 shadow-2xl backdrop-blur-xl p-5">
          {/* Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10">
            {/* Pulsing Avatar */}
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping" />
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-emerald-500/60 bg-zinc-700 flex items-center justify-center">
                {avatarSrc ? (
                  <img src={avatarSrc} alt={targetUser.username} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-lg">{initials}</span>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-base truncate">{targetUser.username}</p>
              <p className="text-emerald-400 text-xs font-medium">
                Incoming {activeCall.type === 'video' ? '📹 Video' : '📞 Audio'} Call...
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4 relative z-10">
            <button
              onClick={declineCall}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-all active:scale-95"
            >
              <PhoneOff className="w-4 h-4" /> Decline
            </button>
            <button
              onClick={acceptCall}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all active:scale-95 animate-pulse"
            >
              <PhoneCall className="w-4 h-4" /> Accept
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Full-Screen Active Call UI ─────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[100] bg-black flex flex-col"
      onMouseMove={showControls}
      onTouchStart={showControls}
    >
      {/* Background: remote video or avatar */}
      {activeCall.type === 'video' && remoteStream ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center">
          {/* Decorative rings */}
          {isCalling && (
            <>
              <div className="absolute w-64 h-64 rounded-full border border-white/5 animate-ping [animation-duration:2s]" />
              <div className="absolute w-48 h-48 rounded-full border border-white/10 animate-ping [animation-duration:2.5s] [animation-delay:0.5s]" />
            </>
          )}
          <div className="flex flex-col items-center gap-5 z-10">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl bg-zinc-700 flex items-center justify-center">
              {avatarSrc ? (
                <img src={avatarSrc} alt={targetUser.username} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold text-4xl">{initials}</span>
              )}
            </div>
            <div className="text-center">
              <h2 className="text-white font-bold text-2xl">{targetUser.username}</h2>
              <p className="text-zinc-400 text-sm mt-1">
                {isConnected
                  ? formatTimer(activeCall.durationSeconds)
                  : isCalling
                  ? 'Ringing...'
                  : 'Connecting...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Overlay gradient top */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 to-transparent pointer-events-none z-10" />
      {/* Overlay gradient bottom */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10" />

      {/* Top Bar */}
      <div
        className={`absolute top-0 inset-x-0 z-20 px-6 pt-safe-top pt-6 transition-opacity duration-500 ${
          controlsVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/60 text-xs font-medium uppercase tracking-widest">
              {activeCall.type} Call
            </p>
            <h3 className="text-white font-bold text-lg">{targetUser.username}</h3>
            {isConnected && (
              <p className="text-emerald-400 text-sm font-mono">
                {formatTimer(activeCall.durationSeconds)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {activeCall.isMuted && (
              <span className="px-2 py-1 rounded-full bg-red-600/80 text-white text-[11px] font-semibold flex items-center gap-1">
                <MicOff className="w-3 h-3" /> Muted
              </span>
            )}
            {activeCall.isScreenSharing && (
              <span className="px-2 py-1 rounded-full bg-emerald-600/80 text-white text-[11px] font-semibold flex items-center gap-1">
                <Monitor className="w-3 h-3" /> Sharing
              </span>
            )}
          </div>
        </div>
      </div>

      {/* PiP — Local Camera Preview (video call only) */}
      {activeCall.type === 'video' && localStream && !activeCall.isVideoOff && (
        <div className="absolute top-24 right-5 w-32 h-44 md:w-40 md:h-56 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black z-20">
          <video
            ref={pipVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover scale-x-[-1]"
          />
        </div>
      )}

      {/* Bottom Control Bar */}
      <div
        className={`absolute bottom-0 inset-x-0 z-20 pb-10 pt-6 px-6 transition-opacity duration-500 ${
          controlsVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center justify-center gap-4 md:gap-6">
          {/* Mute */}
          <CallButton
            onClick={toggleMute}
            active={activeCall.isMuted}
            activeClass="bg-red-600/80 border-red-500"
            label={activeCall.isMuted ? 'Unmute' : 'Mute'}
          >
            {activeCall.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </CallButton>

          {/* Video toggle (video calls only) */}
          {activeCall.type === 'video' && (
            <CallButton
              onClick={toggleVideo}
              active={activeCall.isVideoOff}
              activeClass="bg-red-600/80 border-red-500"
              label={activeCall.isVideoOff ? 'Camera On' : 'Camera Off'}
            >
              {activeCall.isVideoOff ? (
                <VideoOff className="w-5 h-5" />
              ) : (
                <Video className="w-5 h-5" />
              )}
            </CallButton>
          )}

          {/* End Call — prominent red */}
          <button
            onClick={endCall}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl shadow-red-600/50 transition-all active:scale-95 border-4 border-red-400/30"
            title="End Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>

          {/* Screen Share */}
          {activeCall.type === 'video' && (
            <CallButton
              onClick={toggleScreenShare}
              active={activeCall.isScreenSharing}
              activeClass="bg-emerald-600/80 border-emerald-500"
              label={activeCall.isScreenSharing ? 'Stop Share' : 'Share Screen'}
            >
              {activeCall.isScreenSharing ? (
                <MonitorOff className="w-5 h-5" />
              ) : (
                <Monitor className="w-5 h-5" />
              )}
            </CallButton>
          )}

          {/* Switch to audio (video calls) */}
          {activeCall.type === 'audio' && (
            <CallButton
              onClick={() => {}}
              active={false}
              label="Audio Call"
              disabled
            >
              <Phone className="w-5 h-5" />
            </CallButton>
          )}
        </div>
      </div>
    </div>
  );
};

// Reusable circular call control button
const CallButton: React.FC<{
  onClick: () => void;
  active?: boolean;
  activeClass?: string;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}> = ({ onClick, active, activeClass, label, children, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={label}
    className={`w-13 h-13 w-[52px] h-[52px] rounded-full border flex items-center justify-center text-white transition-all active:scale-95 ${
      disabled
        ? 'opacity-30 cursor-not-allowed border-white/10 bg-white/10'
        : active && activeClass
        ? `${activeClass} border-opacity-60`
        : 'bg-white/10 border-white/20 hover:bg-white/20'
    }`}
  >
    {children}
  </button>
);
