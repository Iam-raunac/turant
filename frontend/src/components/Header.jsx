export default function Header({ user, cartCount = 0 }) {
  return (
    <header className="az-header">
      <div className="az-header-main">
        <div className="az-logo">
          <span className="az-logo-text">amazon</span>
          <span className="az-logo-now">now</span>
          <span className="az-bolt">⚡</span>
        </div>

        <div className="az-location">
          <span className="az-location-pin">📍</span>
          <div className="az-location-text">
            <span className="az-location-deliver">Deliver in 10 min to</span>
            <span className="az-location-city">
              {user?.id ? user.name : "your area"}
            </span>
          </div>
        </div>

        <div className="az-search">
          <span className="az-search-mode">Confident</span>
          <input
            className="az-search-input"
            placeholder="Turant — tell us your situation, get one cart"
            readOnly
          />
          <span className="az-search-btn">🔍</span>
        </div>

        <div className="az-account">
          <span className="az-account-hi">
            Hello, {user?.id ? user.name : "sign in"}
          </span>
          <span className="az-account-sub">Account & Lists</span>
        </div>

        <div className="az-cart">
          <span className="az-cart-icon">🛒</span>
          <span className="az-cart-count">{cartCount}</span>
        </div>
      </div>

      <div className="az-subbar">
        <span className="az-subbar-tag">Turant</span>
        <span>Confident Mode</span>
        <span className="az-subbar-dim">· Power Cut</span>
        <span className="az-subbar-dim">· Guests</span>
        <span className="az-subbar-dim">· Pooja</span>
        <span className="az-subbar-dim">· Quick Health</span>
        <span className="az-subbar-dim">· Exam Night</span>
      </div>
    </header>
  );
}
