export default function OrderConfirmation({ cart, eta, onDone }) {
  const total =
    cart.total_inr ||
    (cart.items || []).reduce((s, i) => s + (i.price_inr || 0), 0);

  return (
    <div className="confirm">
      <div className="confirm-card">
        <div className="confirm-tick">✓</div>
        <h2>Out for delivery in {eta} mins</h2>
        <p className="confirm-sub">
          {cart.cart_title || "Your cart"} — ₹{total} ·{" "}
          {(cart.items || []).length} items
        </p>
        <p className="confirm-note">
          (Demo only — no real payment or delivery happens.)
        </p>
        <button className="order-btn" onClick={onDone}>
          Build another cart
        </button>
      </div>
    </div>
  );
}
