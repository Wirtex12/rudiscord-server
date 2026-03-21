import { useState, useEffect } from 'react';
import './ChatDashboard.css';
import { FriendsModal } from './FriendsModal';
import { CallModal } from './CallModal';
import { useWebRTC } from '../hooks/useWebRTC';

const API_URL = 'http://localhost:3000';

interface User {
  id: string;
  userId?: string;
  shortId?: string;
  gender?: 'male' | 'female' | null;
  username: string;
  email: string;
  avatar?: string | null;
}

interface ChatDashboardProps {
  user: User;
  onLogout: () => void;
  onUpdateUser?: (updatedUser: Partial<User>) => void;
}

interface Friend {
  id: string;
  userId?: string;
  username: string;
  avatar?: string | null;
  status: string;
}

const getAvatarInitial = (username: string): string => {
  if (!username) return '?';
  const chars = Array.from(username);
  return chars[0]?.toUpperCase() || '?';
};

const maskEmail = (email: string): string => {
  const [username, domain] = email.split('@');
  if (!username || !domain) return email;
  const visiblePart = username.substring(0, 4);
  const maskedPart = '*'.repeat(Math.max(0, username.length - 4));
  return `${visiblePart}${maskedPart}@${domain}`;
};

export function ChatDashboard({ user, onLogout, onUpdateUser }: ChatDashboardProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState(user.username);
  const [saveMessage, setSaveMessage] = useState('');
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [isOutgoingCall, setIsOutgoingCall] = useState(false);
  
  // Update states
  const [currentVersion, setCurrentVersion] = useState('');
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error' | 'not-available'>('idle');
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateError, setUpdateError] = useState('');

  // Real friends list (loaded from server)
  const [friends, setFriends] = useState<Friend[]>([]);

  // Real messages (loaded from server)
  const [messages, setMessages] = useState<any[]>([]);

  // WebRTC hook
  const {
    call,
    callAccepted,
    callEnded,
    isMuted,
    toggleMute,
    setCallAccepted,
    setCallEnded,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
  } = useWebRTC(user?.id);

  // Sync editUsername when user.username changes
  useEffect(() => {
    setEditUsername(user.username);
  }, [user.username]);

  // Setup auto-update listeners
  useEffect(() => {
    // Get current version
    if ((window as any).electron) {
      (window as any).electron.invoke('get-app-version').then((version: string) => {
        setCurrentVersion(version);
      });
    }

    // Listen for update events (from electron main process)
    const { electron } = window as any;
    if (electron?.receive) {
      electron.receive('update-checking', () => {
        console.log('🔄 Update checking...');
        setUpdateStatus('checking');
        setUpdateError('');
      });

      electron.receive('update-available', (info: { version: string }) => {
        console.log('✅ Update available:', info.version);
        setUpdateStatus('available');
        setSaveMessage(`New version ${info.version} available! Downloading...`);
      });

      electron.receive('update-not-available', () => {
        console.log('⭕ No updates available');
        setUpdateStatus('not-available');
        setSaveMessage('✅ You have the latest version!');
        setTimeout(() => {
          setUpdateStatus('idle');
          setSaveMessage('');
        }, 3000);
      });

      electron.receive('update-progress', (data: { percent: number }) => {
        console.log('📥 Download progress:', data.percent);
        setUpdateStatus('downloading');
        setUpdateProgress(data.percent);
      });

      electron.receive('update-ready', () => {
        console.log('✅ Update ready to install');
        setUpdateStatus('ready');
        setSaveMessage('🔄 Update ready! Restart to apply.');
      });

      electron.receive('update-error', (data: { message: string }) => {
        console.error('❌ Update error:', data.message);
        setUpdateStatus('error');
        setUpdateError(data.message);
        setSaveMessage(`❌ Update error: ${data.message}`);
        setTimeout(() => {
          setUpdateStatus('idle');
          setSaveMessage('');
        }, 5000);
      });
    }

    return () => {
      // Cleanup listeners
      if (electron?.removeListener) {
        electron.removeListener('update-checking', () => {});
        electron.removeListener('update-available', () => {});
        electron.removeListener('update-not-available', () => {});
        electron.removeListener('update-progress', () => {});
        electron.removeListener('update-ready', () => {});
        electron.removeListener('update-error', () => {});
      }
    };
  }, []);

  // Load friends from server
  useEffect(() => {
    const loadFriends = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_URL}/friends/with-conversations`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setFriends(data);
        }
      } catch (error) {
        console.error('Failed to load friends:', error);
      }
    };
    loadFriends();
  }, []);

  const handleFriendClick = (friend: Friend) => {
    setSelectedFriend(friend);
    // Load messages from server
    loadMessages(friend.id);
  };

  const loadMessages = async (friendId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/messages?participantId=${friendId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleCloseChat = () => {
    setSelectedFriend(null);
  };

  const handleSendMessage = (content: string) => {
    console.log('Sending message:', content);
    const newMessage = {
      id: Date.now().toString(),
      senderId: 'user',
      content,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([...messages, newMessage]);
  };

  // Call handlers
  const handleStartCall = () => {
    if (!selectedFriend) return;
    setIsOutgoingCall(true);
    setShowCallModal(true);
    setCallAccepted(false);
    setCallEnded(false);
    startCall(selectedFriend.id);
  };

  const handleAcceptCall = () => {
    acceptCall();
    setShowCallModal(false);
  };

  const handleRejectCall = () => {
    rejectCall();
    setShowCallModal(false);
  };

  const handleEndCall = () => {
    endCall();
    setShowCallModal(false);
  };

  const handleLogoutClick = () => {
    console.log('🚪 Logging out...');
    
    // Очистить токены
    localStorage.removeItem('accessToken');
    sessionStorage.removeItem('accessToken');
    localStorage.removeItem('userId');
    sessionStorage.removeItem('userId');
    
    // Вызвать onLogout из props
    if (onLogout) {
      onLogout();
    }
  };

  // Settings functions
  const handleOpenSettings = () => {
    setShowSettings(true);
    setEditUsername(user.username);
    setIsEditing(false);
    setSaveMessage('');
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
    setIsEditing(false);
    setSaveMessage('');
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleSaveClick = () => {
    if (editUsername.trim() && editUsername !== user.username) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        localStorage.setItem('username', editUsername);
      }
      sessionStorage.setItem('username', editUsername);

      onUpdateUser?.({ username: editUsername });
      setSaveMessage('Username updated!');
      setTimeout(() => setSaveMessage(''), 3000);
    }
    setIsEditing(false);
  };

  const handleCancelClick = () => {
    setEditUsername(user.username);
    setIsEditing(false);
  };

  // Check for updates
  const handleCheckForUpdates = () => {
    console.log('🔍 Checking for updates manually...');
    setUpdateStatus('checking');
    setUpdateError('');
    
    const { electron } = window as any;
    if (electron?.send) {
      electron.send('check-for-updates');
      setSaveMessage('🔍 Checking for updates...');
    } else {
      setUpdateStatus('error');
      setSaveMessage('⚠️ Auto-update not available');
      setTimeout(() => {
        setUpdateStatus('idle');
        setSaveMessage('');
      }, 3000);
    }
  };

  // Restart to apply update
  const handleRestartForUpdate = () => {
    const { electron } = window as any;
    if (electron?.send) {
      electron.send('quit-and-install');
    }
  };

  // Avatar upload (Settings Modal only)
  const handleAvatarUploadClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/gif,image/webp';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        handleAvatarFileChange(file);
      }
    };
    input.click();
  };

  const handleAvatarFileChange = async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    formData.append('userId', user.id);

    try {
      const response = await fetch(`${API_URL}/auth/upload-avatar`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        const fullAvatarUrl = data.avatarUrl.startsWith('http')
          ? data.avatarUrl
          : `${API_URL}${data.avatarUrl}`;
        onUpdateUser?.({ avatar: fullAvatarUrl });
      } else {
        setSaveMessage(`❌ ${data.message || 'Failed to upload avatar'}`);
      }
    } catch (error) {
      setSaveMessage('❌ Failed to upload avatar');
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/remove-avatar`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (response.ok) {
        onUpdateUser?.({ avatar: null });
        setSaveMessage('Avatar removed');
      } else {
        const data = await response.json();
        setSaveMessage(`❌ ${data.message || 'Failed to remove avatar'}`);
      }
    } catch (error) {
      setSaveMessage('❌ Failed to remove avatar');
    }

    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      '⚠️ Are you sure you want to delete your account?\n\n' +
      'This action cannot be undone. All your data will be permanently deleted:\n' +
      '• Your profile\n' +
      '• Your messages\n' +
      '• Your friends\n' +
      '• Your avatar\n\n' +
      `Username: ${user.username}`
    );

    if (!confirmed) return;

    try {
      const token = localStorage.getItem('accessToken');

      const response = await fetch(`${API_URL}/auth/account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (response.ok) {
        localStorage.clear();
        sessionStorage.clear();
        onLogout();
      } else {
        const data = await response.json();
        setSaveMessage(`❌ ${data.message || 'Failed to delete account'}`);
      }
    } catch (error) {
      setSaveMessage('❌ Failed to delete account');
    }

    setTimeout(() => setSaveMessage(''), 5000);
  };

  // Show Settings Modal
  if (showSettings) {
    return (
      <div className="chat-dashboard">
        <div className="settings-overlay">
          <div className="settings-modal">
            <div className="settings-header">
              <h2>Profile Settings</h2>
              <button className="settings-close-btn" onClick={handleCloseSettings}>✕</button>
            </div>
            <div className="settings-content">
              {/* Avatar with upload overlay and Remove button */}
              <div className="avatar-section">
                <div
                  className="settings-avatar-wrapper"
                  onClick={handleAvatarUploadClick}
                >
                  <div className="settings-avatar-large">
                    {user.avatar && user.avatar.trim() !== '' ? (
                      <img
                        src={user.avatar.startsWith('http') ? user.avatar : `${API_URL}${user.avatar}`}
                        alt="Avatar"
                        className="settings-avatar-img"
                      />
                    ) : (
                      <span className="avatar-initial">{getAvatarInitial(user.username)}</span>
                    )}
                  </div>
                  <div className="avatar-overlay">
                    <span>📷 Click to upload</span>
                  </div>
                </div>
                <div className="avatar-actions">
                  {user.avatar && user.avatar.trim() !== '' && (
                    <button className="remove-avatar-btn" onClick={handleRemoveAvatar}>
                      Remove Avatar
                    </button>
                  )}
                </div>
              </div>

              {/* Username editing */}
              <div className="settings-user-info">
                <div className="username-row">
                  {isEditing ? (
                    <input
                      type="text"
                      className="username-input"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      autoFocus
                    />
                  ) : (
                    <div className="value-container">
                      <p className="info-label">
                        <span className="label">Name:</span> {user.username}
                        {user.gender && (
                          <span className={`gender-icon-small ${user.gender}`} title={user.gender === 'male' ? 'Male' : 'Female'}>
                            {user.gender === 'male' ? (
                              <svg viewBox="0 0 100 200">
                                <circle cx="50" cy="40" r="25" fill="currentColor"/>
                                <rect x="25" y="70" width="50" height="60" rx="10" fill="currentColor"/>
                                <line x1="25" y1="80" x2="5" y2="110" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
                                <line x1="75" y1="80" x2="95" y2="110" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
                                <line x1="35" y1="130" x2="35" y2="190" stroke="currentColor" strokeWidth="14" strokeLinecap="round"/>
                                <line x1="65" y1="130" x2="65" y2="190" stroke="currentColor" strokeWidth="14" strokeLinecap="round"/>
                              </svg>
                            ) : (
                              <svg viewBox="0 0 100 200">
                                <circle cx="50" cy="40" r="25" fill="currentColor"/>
                                <polygon points="50,70 80,140 20,140" fill="currentColor"/>
                                <line x1="20" y1="80" x2="5" y2="110" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
                                <line x1="80" y1="80" x2="95" y2="110" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
                                <line x1="35" y1="140" x2="35" y2="190" stroke="currentColor" strokeWidth="14" strokeLinecap="round"/>
                                <line x1="65" y1="140" x2="65" y2="190" stroke="currentColor" strokeWidth="14" strokeLinecap="round"/>
                              </svg>
                            )}
                          </span>
                        )}
                      </p>
                      <button
                        className="edit-btn"
                        onClick={handleEditClick}
                        title="Edit username"
                      >
                        ✏️
                      </button>
                    </div>
                  )}
                </div>
                {isEditing && (
                  <div className="edit-actions">
                    <button className="save-btn" onClick={handleSaveClick}>
                      Save
                    </button>
                    <button className="cancel-btn" onClick={handleCancelClick}>
                      Cancel
                    </button>
                  </div>
                )}
                <p className="info-label">
                  <span className="label">Email:</span> {maskEmail(user.email)}
                </p>
                <div className="user-id-block">
                  <p className="info-label user-id-label">
                    <span className="label">ID:</span>
                  </p>
                  <div className="user-id-value friend-code">
                    {user.shortId ? user.shortId : 'Not available'}
                  </div>
                </div>
                {saveMessage && (
                  <p className={`save-message ${saveMessage.includes('❌') ? 'error' : 'success'}`}>
                    {saveMessage}
                  </p>
                )}
                <div className="update-section">
                  <div className="version-info">
                    <span className="version-label">Current Version:</span>
                    <span className="version-value">{currentVersion || '...'}</span>
                  </div>
                  <button className="check-updates-btn" onClick={handleCheckForUpdates} disabled={updateStatus === 'checking'}>
                    {updateStatus === 'checking' ? '🔄 Checking...' : '🔍 Check for Updates'}
                  </button>
                  {updateStatus === 'downloading' && (
                    <div className="update-progress">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${updateProgress}%` }}></div>
                      </div>
                      <span className="progress-text">{updateProgress.toFixed(0)}%</span>
                    </div>
                  )}
                  {updateStatus === 'ready' && (
                    <button className="restart-btn" onClick={handleRestartForUpdate}>
                      🔄 Restart to Apply Update
                    </button>
                  )}
                  {updateStatus === 'error' && updateError && (
                    <p className="update-error">❌ {updateError}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="settings-footer">
              <div className="danger-zone">
                <p className="danger-zone-label">⚠️ Danger Zone</p>
                <button className="delete-account-btn" onClick={handleDeleteAccount}>
                  Delete Account
                </button>
              </div>
              <button className="settings-logout-btn" onClick={handleLogoutClick}>
                Logout
              </button>
              <button className="settings-close-btn-full" onClick={handleCloseSettings}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-dashboard">
      {/* Left Sidebar - Servers */}
      <aside className="servers-sidebar">
        {/* Home Button */}
        <div
          className="server-icon home-icon"
          onClick={() => setShowFriendsModal(true)}
          title="Friends"
        >
          👥
        </div>

        <div className="servers-divider"></div>

        {/* Direct Messages Header */}
        <div className="dm-header-label">
          <h3>DIRECT MESSAGES</h3>
        </div>

        {/* Friends List */}
        <div className="sidebar-friends-list">
          {friends.map((friend) => (
            <div
              key={friend.id}
              className={`sidebar-friend-item ${selectedFriend?.id === friend.id ? 'selected' : ''}`}
              onClick={() => handleFriendClick(friend)}
            >
              <div className="sidebar-friend-avatar">
                {friend.avatar ? (
                  <img src={friend.avatar.startsWith('http') ? friend.avatar : `${API_URL}${friend.avatar}`} alt={friend.username} />
                ) : (
                  <span>{friend.username?.charAt(0).toUpperCase()}</span>
                )}
                <span className={`status-indicator ${friend.status}`}></span>
              </div>
              <div className="sidebar-friend-info">
                <span className="sidebar-friend-name">{friend.username}</span>
                <span className={`sidebar-friend-status ${friend.status}`}>
                  {friend.status === 'online' ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* User Panel at Bottom */}
        <div className="user-panel">
          <div
            className="user-avatar clickable"
            onClick={handleOpenSettings}
            title="Profile Settings"
          >
            {user.avatar && user.avatar.trim() !== '' ? (
              <img
                src={user.avatar.startsWith('http') ? user.avatar : `${API_URL}${user.avatar}`}
                alt="Avatar"
                className="avatar-img"
              />
            ) : (
              <span className="avatar-initial">{getAvatarInitial(user.username)}</span>
            )}
          </div>
          <div className="user-details">
            <span className="user-name">{user.username}</span>
            <span className="user-status">Online</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Header */}
        <header className="chat-header">
          {selectedFriend ? (
            <div className="chat-header-content">
              <div className="chat-friend-info">
                <div className="friend-avatar small">
                  {selectedFriend.avatar ? (
                    <img src={selectedFriend.avatar.startsWith('http') ? selectedFriend.avatar : `${API_URL}${selectedFriend.avatar}`} alt={selectedFriend.username} />
                  ) : (
                    <span>{selectedFriend.username?.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <span className="friend-name">{selectedFriend.username}</span>
                  <span className={`friend-status ${selectedFriend.status}`}>{selectedFriend.status}</span>
                </div>
              </div>
              <div className="chat-actions">
                <button className="call-btn" onClick={handleStartCall} title="Voice Call">
                  📞
                </button>
                <button onClick={handleCloseChat} className="close-chat-btn">✕</button>
              </div>
            </div>
          ) : (
            <h2>Welcome, {user.username}!</h2>
          )}
        </header>

        {/* Messages Area or Friends List */}
        <main className="chat-main">
          {!selectedFriend ? (
            // Friends List (instead of channels)
            <div className="friends-list-container">
              <div className="friends-header">
                <h3>Direct Messages</h3>
              </div>
              <div className="friends-list">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="friend-item"
                    onClick={() => handleFriendClick(friend)}
                  >
                    <div className="friend-avatar">
                      {friend.avatar ? (
                        <img src={friend.avatar.startsWith('http') ? friend.avatar : `${API_URL}${friend.avatar}`} alt={friend.username} />
                      ) : (
                        <span>{friend.username?.charAt(0).toUpperCase()}</span>
                      )}
                      <span className={`status-indicator ${friend.status}`}></span>
                    </div>
                    <div className="friend-info">
                      <span className="friend-name">{friend.username}</span>
                      <span className={`friend-status ${friend.status}`}>{friend.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Chat with friend
            <div className="chat-with-friend">
              <div className="chat-messages">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`message ${msg.senderId === 'user' ? 'my-message' : 'friend-message'}`}
                  >
                    <div className="message-content">
                      <p>{msg.content}</p>
                      <span className="message-time">{msg.time}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="chat-input">
                <input
                  type="text"
                  placeholder={`Message @${selectedFriend.username}`}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      handleSendMessage(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.querySelector('.chat-input input') as HTMLInputElement;
                    if (input && input.value.trim()) {
                      handleSendMessage(input.value);
                      input.value = '';
                    }
                  }}
                >
                  ➤
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      <FriendsModal isOpen={showFriendsModal} onClose={() => setShowFriendsModal(false)} />

      {/* Call Modal */}
      <CallModal
        isOpen={showCallModal || (call !== null && !callEnded)}
        isOutgoing={isOutgoingCall}
        friendUsername={call?.fromUsername || selectedFriend?.username || ''}
        friendAvatar={selectedFriend?.avatar}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
        onEnd={handleEndCall}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        callAccepted={callAccepted}
        callEnded={callEnded}
      />
    </div>
  );
}
