import { useState, useEffect } from 'react';
import './CallModal.css';

interface CallModalProps {
  isOpen: boolean;
  isOutgoing?: boolean;
  friendUsername: string;
  friendAvatar?: string | null;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  callAccepted: boolean;
  callEnded: boolean;
}

export function CallModal({
  isOpen,
  isOutgoing = false,
  friendUsername,
  friendAvatar,
  onAccept,
  onReject,
  onEnd,
  isMuted,
  onToggleMute,
  callAccepted,
  callEnded,
}: CallModalProps) {
  const [callDuration, setCallDuration] = useState(0);

  // Update call duration - useEffect на верхнем уровне, ДО return
  useEffect(() => {
    if (!callAccepted || callEnded) {
      setCallDuration(0);
      return;
    }
    
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [callAccepted, callEnded]);

  // Automatically close modal when call ends
  useEffect(() => {
    if (callEnded && isOpen) {
      const timeout = setTimeout(() => {
        onEnd();
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [callEnded, isOpen, onEnd]);

  // Ранний return ПОСЛЕ всех hooks
  if (!isOpen) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="call-modal-overlay">
      <div className={`call-modal ${callEnded ? 'ended' : ''}`}>
        {/* Caller/Callee Info */}
        <div className="call-info">
          <div className="call-avatar">
            {friendAvatar ? (
              <img src={friendAvatar.startsWith('http') ? friendAvatar : `http://localhost:3000${friendAvatar}`} alt={friendUsername} />
            ) : (
              <span>{friendUsername.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <h2 className="call-username">{friendUsername}</h2>
          <p className="call-status">
            {callEnded
              ? 'Call ended'
              : callAccepted
              ? formatDuration(callDuration)
              : isOutgoing
              ? 'Calling...'
              : 'Incoming call...'}
          </p>
        </div>

        {/* Call Controls */}
        <div className="call-controls">
          {!callAccepted && !callEnded && (
            <>
              {!isOutgoing && (
                <button className="control-btn accept" onClick={onAccept} title="Accept">
                  📞
                </button>
              )}
              <button className="control-btn reject" onClick={onReject} title="Reject">
                ✕
              </button>
            </>
          )}

          {callAccepted && !callEnded && (
            <>
              <button
                className={`control-btn mute ${isMuted ? 'active' : ''}`}
                onClick={onToggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? '🔇' : '🎤'}
              </button>
              <button className="control-btn end" onClick={onEnd} title="End Call">
                📞
              </button>
            </>
          )}

          {callEnded && (
            <button className="control-btn end" onClick={onEnd} title="Close">
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
