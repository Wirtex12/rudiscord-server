import './TitleBar.css';

export function TitleBar() {
  const handleMinimize = () => {
    window.electron?.minimizeWindow();
  };

  const handleMaximize = () => {
    window.electron?.maximizeWindow();
  };

  const handleClose = () => {
    window.electron?.closeWindow();
  };

  return (
    <div className="title-bar">
      <div className="title-bar-drag-region">Voxit Messenger</div>
      <div className="title-bar-controls">
        <button className="title-bar-btn minimize-btn" onClick={handleMinimize} title="Minimize">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <line x1="0" y1="6" x2="12" y2="6" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
        <button className="title-bar-btn maximize-btn" onClick={handleMaximize} title="Maximize">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="1" y="1" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
        <button className="title-bar-btn close-btn" onClick={handleClose} title="Close">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" />
            <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
