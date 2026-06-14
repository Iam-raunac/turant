import { getProduct } from "../catalog.js";

// A clean category-based thumbnail. We deliberately do NOT load external
// product photos (they were unreliable and inaccurate); instead each item
// shows a tasteful category icon tile. No network fetch, nothing to break.

const CATEGORY_EMOJI = {
  power_cut: "💡",
  guests: "🍽️",
  pooja: "🪔",
  exam: "📚",
  health: "💊",
  staples: "🛒",
  food: "🍲",
  essentials: "🔌",
  monsoon: "☔",
  festival: "🎁",
};

export default function ProductThumb({ item, size = 56 }) {
  const product = getProduct(item?.product_id);
  const category = item?.category || product?.category;
  const emoji = CATEGORY_EMOJI[category] || "🛍️";

  return (
    <div
      className={`thumb thumb-cat thumb-${category || "default"}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span style={{ fontSize: size * 0.5 }}>{emoji}</span>
    </div>
  );
}
