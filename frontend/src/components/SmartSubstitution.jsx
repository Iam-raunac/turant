import { useState } from "react";
import { findSubstituteScored, getProduct } from "../catalog.js";
import ProductThumb from "./ProductThumb.jsx";

// Feature: Smart Substitution.
// A real quick-commerce pain point: an item in the cart is out of stock.
// Instead of breaking the flow with "item unavailable, remove?", Turant already
// knows a close in-stock alternative and offers a one-tap swap.
//
// This is NOT simulated: it fires only for cart items that are genuinely marked
// out of stock in the catalog (in_stock === false), and the substitute is a
// real in-stock product that shares a specific tag with it.

function buildSubstituteItem(target, sub) {
  return {
    product_id: sub.product_id,
    name: sub.name,
    reason: `Swapped in for ${target.name} (out of stock). Closest in-stock match — similar use, comparable price.`,
    confidence: target.confidence ?? 0.85,
    price_inr: sub.price_inr,
    eta_min: sub.eta_min ?? target.eta_min ?? 12,
    personalized: false,
    substituted: true,
  };
}

// Find the first cart item that is actually out of stock AND has a close
// in-stock substitute. Returns null if every item is available.
function pickProposal(cart) {
  const items = cart?.items || [];
  const excludeIds = items.map((i) => i.product_id);
  for (const target of items) {
    const product = getProduct(target.product_id);
    if (!product || product.in_stock !== false) continue; // only real OOS items
    const scored = findSubstituteScored(target.product_id, excludeIds);
    if (scored) {
      return { target, substitute: buildSubstituteItem(target, scored.substitute) };
    }
  }
  return null;
}

export default function SmartSubstitution({ cart, onApply, onDrop }) {
  // Freeze the proposal for the life of this component instance. The parent
  // remounts us (via a `key` tied to the cart generation) only when a genuinely
  // NEW cart is generated — NOT when we ourselves apply/drop and mutate the
  // cart. This keeps the target stable so the confirmation banner can never
  // contradict what's actually in the cart.
  const [proposal] = useState(() => pickProposal(cart));
  const [status, setStatus] = useState("offering"); // offering | applied | dropped

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
        <ProductThumb item={substitute} size={44} />
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
