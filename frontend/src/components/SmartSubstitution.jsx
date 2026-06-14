import { useMemo, useState } from "react";
import { findSubstitute } from "../catalog.js";

// Feature: Smart Substitution.
// Simulates a real quick-commerce pain point: an item the user wants is out of
// stock. Instead of breaking the flow with "item unavailable, remove?", Turant
// already knows a same-category alternative and offers a one-tap swap.

function buildSubstituteItem(target, sub) {
  return {
    product_id: sub.product_id,
    name: sub.name,
    reason: `Swapped in for ${target.name} — out of stock. Closest match in the catalog (similar use, comparable price).`,
    confidence: target.confidence ?? 0.85,
    price_inr: sub.price_inr,
    eta_min: sub.eta_min ?? target.eta_min ?? 12,
    personalized: false,
    substituted: true,
  };
}

export default function SmartSubstitution({ cart, onApply, onDrop }) {
  const [status, setStatus] = useState("offering"); // offering | applied | dropped

  const proposal = useMemo(() => {
    const items = cart?.items || [];
    if (items.length < 3) return null;
    const excludeIds = items.map((i) => i.product_id);
    for (const target of items) {
      const sub = findSubstitute(target.product_id, excludeIds);
      if (sub) return { target, substitute: buildSubstituteItem(target, sub) };
    }
    return null;
  }, [cart]);

  if (!proposal) return null;

  const { target, substitute } = proposal;

  if (status === "applied") {
    return (
      <div className="subst subst-done">
        ✅ Done — <strong>{substitute.name}</strong> ne{" "}
        <strong>{target.name}</strong> ki jagah le li. Same category, no waiting.
      </div>
    );
  }

  if (status === "dropped") {
    return (
      <div className="subst subst-done">
        Okay — <strong>{target.name}</strong> hata diya. Baaki cart waisi hi hai.
      </div>
    );
  }

  return (
    <div className="subst" role="alert">
      <div className="subst-head">
        <span className="subst-icon">🔁</span>
        <div>
          <p className="subst-title">
            <strong>{target.name}</strong> abhi out of stock hai
          </p>
          <p className="subst-sub">
            Turant already knows a match — rakh diya{" "}
            <strong>{substitute.name}</strong> (₹{substitute.price_inr}), similar
            choice, ~{substitute.eta_min} min. Theek hai?
          </p>
        </div>
      </div>
      <div className="subst-actions">
        <button
          className="subst-btn subst-btn-primary"
          onClick={() => {
            onApply(target.product_id, substitute);
            setStatus("applied");
          }}
        >
          Haan, rakho
        </button>
        <button
          className="subst-btn"
          onClick={() => {
            onDrop(target.product_id);
            setStatus("dropped");
          }}
        >
          Nahi, hata do
        </button>
      </div>
    </div>
  );
}
