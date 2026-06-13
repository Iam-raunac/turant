export default function Header({ profileName }) {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="brand">
          <span className="brand-bolt">⚡</span>
          <div className="brand-text">
            <span className="brand-now">amazon now</span>
            <span className="brand-mode">
              Confident Mode <span className="brand-tag">Turant</span>
            </span>
          </div>
        </div>
        <div className="header-profile">
          <span className="header-profile-label">You</span>
          <span className="header-profile-name">{profileName}</span>
        </div>
      </div>
    </header>
  );
}
