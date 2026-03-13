import { useState, useEffect } from 'react';
import './FriendsModal.css';

const API_URL = 'http://localhost:3000';

interface Friend {
  id: string;
  userId?: string;
  username: string;
  avatar?: string | null;
}

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'friends' | 'pending' | 'add';

export function FriendsModal({ isOpen, onClose }: FriendsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [friendUserId, setFriendUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadFriends();
      loadPendingRequests();
    }
  }, [isOpen]);

  const loadFriends = async () => {
    const token = localStorage.getItem('accessToken');
    try {
      const response = await fetch(`${API_URL}/friends/list`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setFriends(data.map((item: any) => item.friend));
      }
    } catch (error) {
      console.error('Failed to load friends:', error);
    }
  };

  const loadPendingRequests = async () => {
    const token = localStorage.getItem('accessToken');
    try {
      const response = await fetch(`${API_URL}/friends/requests`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPendingRequests(data);
      }
    } catch (error) {
      console.error('Failed to load requests:', error);
    }
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const cleanUserId = friendUserId.replace('-', '');
    if (cleanUserId.length !== 8) {
      setMessage('❌ User ID must be 8 digits');
      setLoading(false);
      return;
    }
    const token = localStorage.getItem('accessToken');
    try {
      const response = await fetch(`${API_URL}/friends/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ friendUserId: cleanUserId }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage('✅ Friend request sent!');
        setFriendUserId('');
      } else {
        setMessage(`❌ ${data.message}`);
      }
    } catch (error) {
      setMessage('❌ Failed to send request');
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleRespond = async (friendshipId: string, action: 'accept' | 'decline') => {
    const token = localStorage.getItem('accessToken');
    try {
      const response = await fetch(`${API_URL}/friends/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ friendshipId, action }),
      });
      if (response.ok) {
        loadPendingRequests();
        if (action === 'accept') loadFriends();
        setMessage(action === 'accept' ? '✅ Friend added!' : '✅ Request declined');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Failed to respond:', error);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!confirm('Remove this friend?')) return;
    const token = localStorage.getItem('accessToken');
    try {
      const response = await fetch(`${API_URL}/friends/${friendId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        loadFriends();
        setMessage('✅ Friend removed');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Failed to remove:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="friends-modal-overlay" onClick={onClose}>
      <div className="friends-modal" onClick={(e) => e.stopPropagation()}>
        <div className="friends-header">
          <h2>👥 Friends</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="friends-tabs">
          <button
            className={`tab ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            Friends ({friends.length})
          </button>
          <button
            className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending ({pendingRequests.length})
          </button>
          <button
            className={`tab ${activeTab === 'add' ? 'active' : ''}`}
            onClick={() => setActiveTab('add')}
          >
            Add Friend
          </button>
        </div>
        <div className="friends-content">
          {message && <div className="message">{message}</div>}

          {activeTab === 'friends' && (
            <div className="friends-list">
              {friends.length === 0 ? (
                <p className="empty">No friends yet</p>
              ) : (
                friends.map((friend) => (
                  <div key={friend.id} className="friend-item">
                    <div className="friend-avatar">
                      {friend.avatar ? (
                        <img
                          src={friend.avatar.startsWith('http') ? friend.avatar : `${API_URL}${friend.avatar}`}
                          alt={friend.username}
                        />
                      ) : (
                        <span>{friend.username?.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="friend-info">
                      <span className="friend-name">{friend.username}</span>
                      <span className="friend-id">ID: {friend.userId}</span>
                    </div>
                    <button className="remove-btn" onClick={() => handleRemoveFriend(friend.id)}>
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'pending' && (
            <div className="pending-list">
              {pendingRequests.length === 0 ? (
                <p className="empty">No pending requests</p>
              ) : (
                pendingRequests.map((req) => (
                  <div key={req.id} className="request-item">
                    <div className="friend-avatar">
                      {req.sender.avatar ? (
                        <img
                          src={req.sender.avatar.startsWith('http') ? req.sender.avatar : `${API_URL}${req.sender.avatar}`}
                          alt={req.sender.username}
                        />
                      ) : (
                        <span>{req.sender.username?.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="friend-info">
                      <span className="friend-name">{req.sender.username}</span>
                      <span className="friend-id">ID: {req.sender.userId}</span>
                    </div>
                    <div className="request-actions">
                      <button className="accept-btn" onClick={() => handleRespond(req.id, 'accept')}>
                        ✓
                      </button>
                      <button className="decline-btn" onClick={() => handleRespond(req.id, 'decline')}>
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'add' && (
            <form className="add-friend-form" onSubmit={handleAddFriend}>
              <p className="form-description">Add friends by their 8-digit User ID</p>
              <div className="form-group">
                <input
                  type="text"
                  className="user-id-input"
                  placeholder="1234-5678"
                  value={friendUserId}
                  onChange={(e) => setFriendUserId(e.target.value)}
                  maxLength={9}
                  disabled={loading}
                />
                <button type="submit" className="send-request-btn" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Request'}
                </button>
              </div>
              <p className="form-hint">Find your User ID in Settings → Profile</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
