function ConfidenceDot({ score }) {
  const level = score >= 0.8 ? "high" : score >= 0.6 ? "med" : "low";
  return (
    <span className={`conf conf-${level}`} title={`Confidence ${(score * 100).toFixed(0)}%`}>
      {Math.round(score * 100)}%
    </span>
  );
}

function CartItem({ item, onRemove }) {
  return (
    <li className="cart-item">
      <div className="cart-item-thumb">
        <span>📦</span>
      </div>
      <div className="cart-item-body">
        <div className="cart-item-row1">
          <span className="cart-item-name">{item.name}</span>
          {item.personalized && (
            <span className="badge-personal" title="Personalized for you">✨ for you</span>
          )}
          {item.substituted && (
            <span className="badge-subst" title="Substituted (was out of stock)">🔁 swapped</span>
          )}
          {onRemove && (
            <button
              className="cart-item-remove"
              title="Remove this item"
              aria-label={`Remove ${item.name}`}
              onClick={() => onRemove(item)}
            >
              ×
            </button>
          )}
        </div>
        <p className="cart-item-reason">{item.reason}</p>
        <div className="cart-item-row2">
          <span className="cart-item-price">₹{item.price_inr}</span>
          <span className="cart-item-eta">~{item.eta_min} min</span>
          <ConfidenceDot score={item.confidence ?? 0} />
        </div>
      </div>
    </li>
  );
}

function buildShareText(cart, total, eta) {
  const lines = [
    `🛒 *${cart.cart_title || "My Turant Cart"}*`,
    cart.situation_understood ? `_${cart.situation_understood}_` : "",
    "",
    ...(cart.items || []).map((i) => `• ${i.name} — ₹${i.price_inr}`),
    "",
    `Total: ₹${total} · delivery in ~${eta} min`,
    "",
    "Built in seconds with Turant ⚡ (Confident Mode for Amazon Now)",
  ];
  return lines.filter((l) => l !== undefined).join("\n");
}

export default function Cart({ cart, variant, onOrder, onRemove, compact }) {
  if (!cart || !cart.items) return null;

  const total =
    cart.total_inr ||
    cart.items.reduce((s, i) => s + (i.price_inr || 0), 0);
  const eta = Math.max(...cart.items.map((i) => i.eta_min || 12), 12);

  function shareOnWhatsApp() {
    const text = encodeURIComponent(buildShareText(cart, total, eta));
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }

  return (
    <article className={`cart cart-${variant} ${compact ? "compact" : ""}`}>
      <header className="cart-header">
        <div className="cart-title-block">
          <h2 className="cart-title">{cart.cart_title}</h2>
          {variant === "confident" && (
            <span className="cart-pill pill-green">Confident</span>
          )}
          {cart.tier === "budget" && (
            <span className="cart-pill pill-blue">Budget</span>
          )}
          {cart.tier === "premium" && (
            <span className="cart-pill pill-gold">Premium</span>
          )}
        </div>
        <p className="cart-summary">{cart.situation_understood}</p>
        {cart.personalization_applied && (
          <p className="cart-personal-note">
            ✨ Personalized using your purchase history.
          </p>
        )}
      </header>

      <ul className="cart-list">
        {cart.items.map((it, i) => (
          <CartItem
            key={(it.product_id || "p") + i}
            item={it}
            onRemove={onRemove}
          />
        ))}
      </ul>

      {cart.delivery_note && (
        <div className="note note-delivery">⏱ {cart.delivery_note}</div>
      )}
      {cart.safety_note && (
        <div className="note note-safety">⚕ {cart.safety_note}</div>
      )}

      <footer className="cart-footer">
        <div className="cart-total">
          <span className="cart-total-label">Total</span>
          <span className="cart-total-value">₹{total}</span>
          <span className="cart-total-eta">· delivery in ~{eta} min</span>
        </div>
        <div className="cart-actions">
          <button className="share-btn" onClick={shareOnWhatsApp} title="Share on WhatsApp">
            <span className="share-btn-icon">🟢</span> Share
          </button>
          {onOrder && (
            <button className="order-btn" onClick={onOrder}>
              Order now
            </button>
          )}
        </div>
      </footer>
    </article>
  );
}
