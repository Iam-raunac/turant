import { useState } from "react";

// Proactive Feature B — Reorder / Replenishment Prediction.
//
// Uses the user's OWN order history (and nothing else): the backend timestamps
// every order, knows the typical replenishment cycle for each consumable, and
// predicts what's likely running low now. We just render what it returns.
// Tapping an item builds a cart from that real data — no LLM guess needed.

export default function ReorderSuggestion({ profile, onReorder }) {
  const [dismissed, setDismissed] = useState(false);
  const suggestions = profile?.reorder_suggestions || [];

  if (dismissed || !suggestions.length) return null;

  return (
    <div className="proactive proactive-reorder" role="status">
      <button
        className="proactive-close"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
      >
        ×
      </button>
      <div className="proactive-body">
        <span className="proactive-emoji">🔄</span>
        <div className="proactive-text">
          <p className="proactive-title">Running low? Based on your past orders</p>
          <p className="proactive-sub">
            Turant noticed these are probably due — no need to search.
          </p>
        </div>
      </div>

      <ul className="reorder-list">
        {suggestions.map((s) => (
          <li key={s.product_id} className="reorder-item">
            <div className="reorder-item-text">
              <span className="reorder-item-name">{s.name}</span>
              <span className="reorder-item-meta">
                ~{s.days_since} days ago · ₹{s.price_inr}
              </span>
            </div>
            <button
              className="reorder-item-btn"
              onClick={() => onReorder([s])}
            >
              Reorder
            </button>
          </li>
        ))}
      </ul>

      {suggestions.length > 1 && (
        <button
          className="proactive-cta"
          onClick={() => onReorder(suggestions)}
        >
          ⚡ Reorder all {suggestions.length} in one cart
        </button>
      )}
    </div>
  );
}
