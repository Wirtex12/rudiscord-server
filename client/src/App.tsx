import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import { ChatDashboard } from './components/ChatDashboard';
import { TitleBar } from './components/TitleBar';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const PROTOCOL = 'voxit';

interface Message {
  text: string;
  type: 'success' | 'error';
}

interface User {
  id: string;
  userId?: string;
  shortId?: string;
  gender?: 'male' | 'female' | null;
  username: string;
  email: string;
  avatar?: string | null;
}

type Tab = 'login' | 'register';
type Screen = 'form' | 'verification' | 'chat' | 'forgot-password' | 'reset-password';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('login');
  const [screen, setScreen] = useState<Screen>('form');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Debug: Track currentUser changes
  useEffect(() => {
    console.log('═══════════════════════════════════════════════════');
    console.log('[App] currentUser CHANGED');
    console.log('[App] currentUser:', currentUser);
    console.log('[App] currentUser.avatar:', currentUser?.avatar);
    console.log('[App] currentUser.username:', currentUser?.username);
    console.log('[App] screen:', screen);
    console.log('═══════════════════════════════════════════════════');
  }, [currentUser, screen]);

  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    checkAutoLogin();
    checkResetToken();
    setupDeepLinkListener();
  }, []);

  useEffect(() => {
    if (screen === 'verification' && codeInputRefs.current[0]) {
      codeInputRefs.current[0].focus();
    }
  }, [screen]);

  const setupDeepLinkListener = () => {
    // Listen for deep links from Electron main process
    if (window.electron?.receive) {
      const handleDeepLink = (url: unknown) => {
        console.log('Deep link received:', url);
        if (typeof url === 'string') {
          parseDeepLink(url);
        }
      };

      window.electron.receive('deep-link', handleDeepLink);

      // Cleanup listener on unmount
      return () => {
        window.electron?.removeListener('deep-link', handleDeepLink);
      };
    }
  };

  const parseDeepLink = (url: string) => {
    try {
      const parsedUrl = new URL(url);
      
      if (parsedUrl.protocol !== `${PROTOCOL}:`) {
        return;
      }

      const pathname = parsedUrl.pathname;
      const token = parsedUrl.searchParams.get('token');

      if (pathname === '/reset-password' && token) {
        setResetToken(token);
        setScreen('reset-password');
      }
    } catch (error) {
      console.error('Error parsing deep link:', error);
    }
  };

  const checkAutoLogin = async () => {
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    const storage = localStorage.getItem('accessToken') ? localStorage : sessionStorage;

    if (!token) {
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/auth/verify-token`, { token });

      if (response.data.valid && response.data.user) {
        // Check for stored username, avatar, and userId
        const storedUsername = storage.getItem('username');
        const storedAvatar = storage.getItem('avatar');
        const storedUserId = storage.getItem('userId');

        const user = {
          ...response.data.user,
          ...(storedUsername && { username: storedUsername }),
          ...(storedAvatar && { avatar: storedAvatar }),
          ...(storedUserId && { userId: storedUserId }),
          // Always use userId from server if available
          ...(response.data.user.userId && { userId: response.data.user.userId })
        };

        // Save userId and id to storage
        if (response.data.user.userId) {
          storage.setItem('userId', response.data.user.userId);
        }
        if (response.data.user.id) {
          storage.setItem('userId', response.data.user.id);
        }

        console.log('[App] Auto-login with user:', user);
        console.log('[App] User ID:', user.id);
        setCurrentUser(user);
        setScreen('chat');
      } else {
        localStorage.removeItem('accessToken');
        sessionStorage.removeItem('accessToken');
      }
    } catch {
      localStorage.removeItem('accessToken');
      sessionStorage.removeItem('accessToken');
    }
  };

  const checkResetToken = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      setResetToken(token);
      setScreen('reset-password');
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      await axios.post(`${API_URL}/auth/register`, { username, email, password, gender });
      setScreen('verification');
    } catch (error: unknown) {
      let errorText = 'Registration error';
      if (axios.isAxiosError(error)) {
        errorText = error.response?.data?.message || error.message || errorText;
      }
      setMessage({ text: errorText, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
        rememberMe
      });

      const { accessToken } = response.data;

      if (rememberMe) {
        localStorage.setItem('accessToken', accessToken);
      } else {
        sessionStorage.setItem('accessToken', accessToken);
      }

      const userResponse = await axios.post(`${API_URL}/auth/verify-token`, { token: accessToken });

      if (userResponse.data.valid && userResponse.data.user) {
        // Check for stored username and avatar
        const storage = rememberMe ? localStorage : sessionStorage;
        const storedUsername = storage.getItem('username');
        const storedAvatar = storage.getItem('avatar');
        const storedUserId = storage.getItem('userId');

        const user = {
          ...userResponse.data.user,
          ...(storedUsername && { username: storedUsername }),
          ...(storedAvatar && { avatar: storedAvatar }),
          ...(storedUserId && { userId: storedUserId }),
          // Always save userId from server if available
          ...(userResponse.data.user.userId && { userId: userResponse.data.user.userId })
        };

        // Save userId and id to storage
        if (userResponse.data.user.userId) {
          storage.setItem('userId', userResponse.data.user.userId);
        }
        if (userResponse.data.user.id) {
          storage.setItem('userId', userResponse.data.user.id);
        }

        console.log('[App] Login with user:', user);
        console.log('[App] User ID:', user.id);
        setCurrentUser(user);
        setScreen('chat');
        setEmail('');
        setPassword('');
      }
    } catch (error: unknown) {
      let errorText = 'Login error';
      if (axios.isAxiosError(error)) {
        errorText = error.response?.data?.message || error.message || errorText;
      }
      setMessage({ text: errorText, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      await axios.post(`${API_URL}/auth/forgot-password`, { email });
      setMessage({ 
        text: 'Password reset link sent! Check your email.', 
        type: 'success' 
      });
      setEmail('');
    } catch (error: unknown) {
      let errorText = 'Error sending reset link';
      if (axios.isAxiosError(error)) {
        errorText = error.response?.data?.message || error.message || errorText;
      }
      setMessage({ text: errorText, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    if (password !== confirmPassword) {
      setMessage({ text: 'Passwords do not match', type: 'error' });
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setMessage({ text: 'Password must be at least 6 characters', type: 'error' });
      setLoading(false);
      return;
    }

    try {
      await axios.post(`${API_URL}/auth/reset-password`, { 
        token: resetToken, 
        newPassword: password 
      });
      
      setMessage({ 
        text: 'Password reset successful! Please log in.', 
        type: 'success' 
      });
      
      setResetToken('');
      setPassword('');
      setConfirmPassword('');
      
      setTimeout(() => {
        setScreen('form');
        setActiveTab('login');
      }, 2000);
    } catch (error: unknown) {
      let errorText = 'Error resetting password';
      if (axios.isAxiosError(error)) {
        errorText = error.response?.data?.message || error.message || errorText;
      }
      setMessage({ text: errorText, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      setMessage({ text: 'Please enter all 6 digits', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await axios.post(`${API_URL}/auth/verify-code`, { email, code });
      const { accessToken } = response.data;

      localStorage.setItem('accessToken', accessToken);

      const userResponse = await axios.post(`${API_URL}/auth/verify-token`, { token: accessToken });

      if (userResponse.data.valid && userResponse.data.user) {
        // Check for stored username, avatar, and userId
        const storedUsername = localStorage.getItem('username');
        const storedAvatar = localStorage.getItem('avatar');
        const storedUserId = localStorage.getItem('userId');

        const user = {
          ...userResponse.data.user,
          ...(storedUsername && { username: storedUsername }),
          ...(storedAvatar && { avatar: storedAvatar }),
          ...(storedUserId && { userId: storedUserId }),
          // Always use userId from server if available
          ...(userResponse.data.user.userId && { userId: userResponse.data.user.userId })
        };

        // Save userId to storage
        if (userResponse.data.user.userId) {
          localStorage.setItem('userId', userResponse.data.user.userId);
        }

        console.log('[App] Verify code with user:', user);
        setCurrentUser(user);
        setScreen('chat');
        setEmail('');
        setUsername('');
        setPassword('');
        setVerificationCode(['', '', '', '', '', '']);
      }
    } catch (error: unknown) {
      let errorText = 'Verification error';
      if (axios.isAxiosError(error)) {
        errorText = error.response?.data?.message || error.message || errorText;
      }
      setMessage({ text: errorText, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('username');
    localStorage.removeItem('avatar');
    localStorage.removeItem('userId');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('avatar');
    sessionStorage.removeItem('userId');
    setCurrentUser(null);
    setScreen('form');
    setMessage({ text: 'Logged out successfully', type: 'success' });
  };

  const handleUpdateUser = (updatedUser: Partial<User>) => {
    console.log('[App] handleUpdateUser CALLED');
    console.log('[App] updatedUser:', updatedUser);
    console.log('[App] currentUser BEFORE:', currentUser);

    if (currentUser) {
      const newCurrentUser = { ...currentUser, ...updatedUser };
      console.log('[App] newCurrentUser:', newCurrentUser);
      console.log('[App] newCurrentUser.avatar:', newCurrentUser.avatar);

      setCurrentUser(newCurrentUser);
      console.log('[App] setCurrentUser CALLED');
      console.log('[App] currentUser AFTER:', newCurrentUser);

      // Save avatar to localStorage for persistence
      if (updatedUser.avatar !== undefined) {
        const storage = localStorage.getItem('accessToken') ? localStorage : sessionStorage;
        console.log('[App] Using storage:', storage === localStorage ? 'localStorage' : 'sessionStorage');

        if (updatedUser.avatar) {
          storage.setItem('avatar', updatedUser.avatar);
          console.log('[App] ✓ Avatar SAVED to storage:', updatedUser.avatar);
          console.log('[App] ✓ Avatar from storage:', storage.getItem('avatar'));
        } else {
          storage.removeItem('avatar');
          console.log('[App] ✓ Avatar REMOVED from storage');
        }
      }
    } else {
      console.error('[App] ✗ currentUser is NULL, cannot update!');
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    
    if (pastedData.length === 0) return;

    const newCode = [...verificationCode];
    for (let i = 0; i < pastedData.length && i < 6; i++) {
      newCode[i] = pastedData[i];
    }
    setVerificationCode(newCode);

    const nextEmptyIndex = newCode.findIndex((digit) => digit === '');
    const focusIndex = nextEmptyIndex !== -1 ? nextEmptyIndex : Math.min(pastedData.length, 5);
    codeInputRefs.current[focusIndex]?.focus();
  };

  const navigateToScreen = (newScreen: Screen) => {
    setScreen(newScreen);
    setMessage(null);
  };

  if (screen === 'chat' && currentUser) {
    return (
      <>
        <TitleBar />
        <ChatDashboard user={currentUser} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />
      </>
    );
  }

  if (screen === 'forgot-password') {
    return (
      <>
        <TitleBar />
        <div className="app">
          <div className="container">
            <div className="header">
              <h1>Voxit</h1>
              <p>Reset your password</p>
            </div>

            <p className="form-description">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <form className="form" onSubmit={handleForgotPassword}>
              <div className="form-group">
                <label htmlFor="forgot-email">Email</label>
                <input
                  type="email"
                  id="forgot-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={loading}
                />
              </div>

              {message && (
                <div className={`message ${message.type}`}>
                  {message.text}
                </div>
              )}

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <button
                type="button"
                className="back-link-btn"
                onClick={() => navigateToScreen('form')}
              >
                ← Back to Login
              </button>
            </form>
          </div>
        </div>
      </>
    );
  }

  if (screen === 'reset-password') {
    return (
      <>
        <TitleBar />
        <div className="app">
          <div className="container">
            <div className="header">
              <h1>Voxit</h1>
              <p>Create new password</p>
            </div>

            <p className="form-description">
              Enter your new password below.
            </p>

            <form className="form" onSubmit={handleResetPassword}>
              <div className="form-group">
                <label htmlFor="new-password">New Password</label>
                <input
                  type="password"
                  id="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  disabled={loading || !resetToken}
                  minLength={6}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirm-password">Confirm Password</label>
                <input
                  type="password"
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  disabled={loading || !resetToken}
                  minLength={6}
                />
              </div>

              {!resetToken && (
                <div className="message error">
                  No reset token found. Please request a password reset link.
                </div>
              )}

              {message && (
                <div className={`message ${message.type}`}>
                  {message.text}
                </div>
              )}

              <button type="submit" className="submit-btn" disabled={loading || !resetToken}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </div>
        </div>
      </>
    );
  }

  if (screen === 'verification') {
    return (
      <>
        <TitleBar />
        <div className="app">
          <div className="container">
            <div className="header">
              <h1>Voxit</h1>
              <p>Enter verification code</p>
            </div>

            <p className="verification-subtitle">
              We sent a 6-digit code to <strong>{email}</strong>
            </p>
            <p className="verification-note">Check your email inbox (and spam folder)</p>

            <div className="code-inputs" onPaste={handlePaste}>
              {verificationCode.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (codeInputRefs.current[index] = el)}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(index, e)}
                  disabled={loading}
                  className="code-input"
                />
              ))}
            </div>

            {message && (
              <div className={`message ${message.type}`}>
                {message.text}
              </div>
            )}

            <button
              type="button"
              className="submit-btn confirm-btn"
              onClick={handleVerifyCode}
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Confirm'}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TitleBar />
      <div className="app">
        <div className="container">
          <div className="header">
            <h1>Voxit</h1>
            <p>Messenger</p>
          </div>

          <div className="tabs">
            <button
              className={`tab ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('login');
                setMessage(null);
              }}
            >
              Log In
            </button>
            <button
              className={`tab ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('register');
                setMessage(null);
              }}
            >
              Register
            </button>
          </div>

          <form className="form" onSubmit={activeTab === 'login' ? handleLogin : handleRegister}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={loading}
              />
            </div>

            {activeTab === 'register' && (
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  disabled={loading}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={loading}
              />
            </div>

            {activeTab === 'register' && (
              <div className="form-group">
                <label>Gender (optional)</label>
                <div className="gender-selector">
                  <button
                    type="button"
                    className={`gender-btn male ${gender === 'male' ? 'selected' : ''}`}
                    onClick={() => setGender(gender === 'male' ? null : 'male')}
                  >
                    <svg viewBox="0 0 100 200" className="gender-icon">
                      <circle cx="50" cy="40" r="25" fill="currentColor"/>
                      <rect x="25" y="70" width="50" height="60" rx="10" fill="currentColor"/>
                      <line x1="25" y1="80" x2="5" y2="110" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
                      <line x1="75" y1="80" x2="95" y2="110" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
                      <line x1="35" y1="130" x2="35" y2="190" stroke="currentColor" strokeWidth="14" strokeLinecap="round"/>
                      <line x1="65" y1="130" x2="65" y2="190" stroke="currentColor" strokeWidth="14" strokeLinecap="round"/>
                    </svg>
                    <span>Male</span>
                  </button>

                  <button
                    type="button"
                    className={`gender-btn female ${gender === 'female' ? 'selected' : ''}`}
                    onClick={() => setGender(gender === 'female' ? null : 'female')}
                  >
                    <svg viewBox="0 0 100 200" className="gender-icon">
                      <circle cx="50" cy="40" r="25" fill="currentColor"/>
                      <polygon points="50,70 80,140 20,140" fill="currentColor"/>
                      <line x1="20" y1="80" x2="5" y2="110" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
                      <line x1="80" y1="80" x2="95" y2="110" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
                      <line x1="35" y1="140" x2="35" y2="190" stroke="currentColor" strokeWidth="14" strokeLinecap="round"/>
                      <line x1="65" y1="140" x2="65" y2="190" stroke="currentColor" strokeWidth="14" strokeLinecap="round"/>
                    </svg>
                    <span>Female</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'login' && (
              <div className="remember-me-group">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={loading}
                  />
                  <span className="checkmark"></span>
                  <span className="checkbox-label">Remember me</span>
                </label>
              </div>
            )}

            {message && (
              <div className={`message ${message.type}`}>
                {message.text}
              </div>
            )}

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading
                ? activeTab === 'login'
                  ? 'Logging in...'
                  : 'Registering...'
                : activeTab === 'login'
                  ? 'Log In'
                  : 'Register'}
            </button>

            {activeTab === 'login' && (
              <button
                type="button"
                className="forgot-password-btn"
                onClick={() => navigateToScreen('forgot-password')}
              >
                Forgot Password?
              </button>
            )}
          </form>
        </div>
      </div>
    </>
  );
}

export default App;
