export default function Header({ user, cartCount = 0 }) {
  const name = user?.id ? user.name : null;

  return (
    <header className="az-header">
      {/* Top bar — centered Amazon Now logo, app-style icons */}
      <div className="az-topbar">
        <span className="az-fast-badge" aria-hidden="true">⚡</span>
        <div className="az-logo">
          <span className="az-logo-text">amazon</span>
          <span className="az-logo-now">now</span>
        </div>
        <div className="az-topbar-right">
          <span className="az-cart-mini" aria-label={`${cartCount} items in cart`}>
            🛒<b>{cartCount}</b>
          </span>
        </div>
      </div>

      {/* Delivery promise pill — the Amazon Now fast-delivery row */}
      <div className="az-deliverbar">
        <span className="az-deliver-eta">⚡ 10 min</span>
        <span className="az-deliver-to">
          Deliver to <strong>{name || "your area"}</strong>
        </span>
        <span className="az-deliver-chevron">▾</span>
      </div>

      {/* Confident Mode sub-bar — Turant's thesis, no search/browse */}
      <div className="az-subbar">
        <span className="az-subbar-tag">Turant</span>
        <span className="az-subbar-mode">Confident Mode</span>
        <span className="az-subbar-dim">· no search — just say it</span>
      </div>
    </header>
  );
}
