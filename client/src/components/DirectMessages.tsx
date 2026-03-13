import { useState, useEffect, useRef } from 'react';
import './DirectMessages.css';

const API_URL = 'http://localhost:3000';

interface Friend {
  id: string;
  userId?: string;
  username: string;
  avatar?: string | null;
  conversationId?: string | null;
  unreadCount?: number;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  sender: {
    id: string;
    username: string;
    avatar?: string | null;
  };
}

interface DirectMessagesProps {
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function DirectMessages({ currentUserId, isOpen, onClose }: DirectMessagesProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadFriends();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedFriend?.conversationId) {
      loadMessages(selectedFriend.conversationId);
    } else if (selectedFriend) {
      createConversation(selectedFriend.id);
    }
  }, [selectedFriend]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadFriends = async () => {
    const token = localStorage.getItem('accessToken');
    try {
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

  const createConversation = async (friendId: string) => {
    const token = localStorage.getItem('accessToken');
    try {
      const response = await fetch(`${API_URL}/messages/conversation?participantId=${friendId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const conversation = await response.json();
        setSelectedFriend({ ...selectedFriend!, conversationId: conversation.id });
        loadMessages(conversation.id);
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    const token = localStorage.getItem('accessToken');
    try {
      const response = await fetch(`${API_URL}/messages?conversationId=${conversationId}`, {
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

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedFriend) return;

    setLoading(true);
    const token = localStorage.getItem('accessToken');
    try {
      const response = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: messageInput,
          recipientId: selectedFriend.id,
        }),
      });

      if (response.ok) {
        const message = await response.json();
        setMessages([...messages, message]);
        setMessageInput('');
        loadFriends();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
    setLoading(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className="dm-overlay" onClick={onClose}>
      <div className="dm-container" onClick={(e) => e.stopPropagation()}>
        <div className="dm-header">
          <h3>💬 Direct Messages</h3>
          <button className="dm-close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="dm-content">
          {/* Friends List */}
          <div className="dm-friends-list">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className={`dm-friend-item ${selectedFriend?.id === friend.id ? 'selected' : ''}`}
                onClick={() => setSelectedFriend(friend)}
              >
                <div className="dm-friend-avatar">
                  {friend.avatar ? (
                    <img src={friend.avatar.startsWith('http') ? friend.avatar : `${API_URL}${friend.avatar}`} alt={friend.username} />
                  ) : (
                    <span>{friend.username.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="dm-friend-info">
                  <span className="dm-friend-name">{friend.username}</span>
                  {friend.unreadCount && friend.unreadCount > 0 && (
                    <span className="dm-unread-badge">{friend.unreadCount}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Chat Area */}
          <div className="dm-chat-area">
            {selectedFriend ? (
              <>
                <div className="dm-chat-header">
                  <div className="dm-chat-user-info">
                    <div className="dm-friend-avatar">
                      {selectedFriend.avatar ? (
                        <img src={selectedFriend.avatar.startsWith('http') ? selectedFriend.avatar : `${API_URL}${selectedFriend.avatar}`} alt={selectedFriend.username} />
                      ) : (
                        <span>{selectedFriend.username.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <span className="dm-friend-name">{selectedFriend.username}</span>
                      <span className="dm-user-id">{selectedFriend.userId}</span>
                    </div>
                  </div>
                </div>

                <div className="dm-messages-container">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`dm-message ${message.senderId === currentUserId ? 'own' : ''}`}
                    >
                      <div className="dm-message-avatar">
                        {message.sender.avatar ? (
                          <img src={message.sender.avatar.startsWith('http') ? message.sender.avatar : `${API_URL}${message.sender.avatar}`} alt={message.sender.username} />
                        ) : (
                          <span>{message.sender.username.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="dm-message-content">
                        <div className="dm-message-header">
                          <span className="dm-message-author">{message.sender.username}</span>
                          <span className="dm-message-time">{formatTime(message.createdAt)}</span>
                        </div>
                        <p className="dm-message-text">{message.content}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <form className="dm-message-input-form" onSubmit={sendMessage}>
                  <input
                    type="text"
                    className="dm-message-input"
                    placeholder={`Message @${selectedFriend.username}`}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    disabled={loading}
                  />
                  <button type="submit" className="dm-send-btn" disabled={loading || !messageInput.trim()}>
                    ➤
                  </button>
                </form>
              </>
            ) : (
              <div className="dm-no-chat">
                <p>Select a friend to start messaging</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
