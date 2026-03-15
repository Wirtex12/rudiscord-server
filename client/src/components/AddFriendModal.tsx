import { useState } from 'react';
import './AddFriendModal.css';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFriend: (identifier: string) => Promise<void>;
}

export function AddFriendModal({ isOpen, onClose, onAddFriend }: AddFriendModalProps) {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const isShortId = /^\d{6}$/.test(identifier);
    const isUsername = /^[a-zA-Z0-9_]{3,20}$/.test(identifier);

    if (!isShortId && !isUsername) {
      setError('Please enter a valid 6-digit ID or username (3-20 characters)');
      setLoading(false);
      return;
    }

    try {
      await onAddFriend(identifier);
      setSuccess(isShortId
        ? `Friend request sent to user with ID ${identifier}!`
        : `Friend request sent to ${identifier}!`);
      
      setTimeout(() => {
        setSuccess('');
        setIdentifier('');
        onClose();
      }, 2000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to send friend request');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^[\w]*$/.test(value)) {
      setIdentifier(value);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="add-friend-modal">
      <div className="add-friend-overlay" onClick={onClose}></div>
      <div className="add-friend-content">
        <div className="add-friend-header">
          <h2>Add Friend</h2>
          <button className="add-friend-close" onClick={onClose}>×</button>
        </div>

        <div className="add-friend-body">
          <p className="add-friend-description">
            You can add a friend using their <strong>ID</strong> or <strong>username</strong>.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="friend-identifier">ID or Username</label>
              <input
                id="friend-identifier"
                type="text"
                value={identifier}
                onChange={handleInputChange}
                placeholder="e.g. 123456 or username"
                maxLength={20}
                disabled={loading}
                autoComplete="off"
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="add-friend-actions">
              <button
                type="submit"
                className="send-request-btn"
                disabled={loading || identifier.length === 0}
              >
                {loading ? 'Sending...' : 'Send Friend Request'}
              </button>
            </div>
          </form>

          <div className="id-help">
            <h4>What is an ID?</h4>
            <p>
              An ID is a unique 6-digit number assigned to each user.
              You can find your ID in your profile settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
