export default function OrderConfirmation({ cart, eta, learned, onDone }) {
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

        {learned && learned.exists && (
          <div className="confirm-learn">
            ✨ Turant just learned from this order. Next time it'll surface your
            favorites first — you've placed {learned.order_count} order
            {learned.order_count === 1 ? "" : "s"} so far.
          </div>
        )}

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
