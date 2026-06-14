// catalog.js — lightweight client copy of the product catalog.
// Used for Smart Substitution so the demo can compute an out-of-stock swap
// instantly, even when the live backend isn't reachable (mock fallback).
// Keep in sync with backend/data/catalog.json.

export const CATALOG = [
  { product_id: "P001", name: "Candles (pack of 10)", category: "power_cut", price_inr: 40, tags: ["light", "emergency"], eta_min: 12 },
  { product_id: "P002", name: "Rechargeable LED Bulb", category: "power_cut", price_inr: 299, tags: ["light", "emergency", "rechargeable"], eta_min: 12 },
  { product_id: "P003", name: "Power Bank 10000mAh", category: "power_cut", price_inr: 699, tags: ["charging", "emergency"], eta_min: 14 },
  { product_id: "P004", name: "Maggi Atta Noodles (pack of 4)", category: "power_cut", price_inr: 140, tags: ["food", "instant", "no-fridge"], eta_min: 12 },
  { product_id: "P005", name: "Cold Drinks Pack (6 cans)", category: "power_cut", price_inr: 240, tags: ["beverage", "no-fridge"], eta_min: 12 },
  { product_id: "P010", name: "Paneer 200g", category: "guests", price_inr: 89, tags: ["food", "main-course"], eta_min: 15 },
  { product_id: "P011", name: "Ready-to-eat Naan (4 pc)", category: "guests", price_inr: 95, tags: ["food", "main-course"], eta_min: 15 },
  { product_id: "P012", name: "Coca-Cola 1.25L", category: "guests", price_inr: 65, tags: ["beverage"], eta_min: 15 },
  { product_id: "P013", name: "Haldiram Namkeen Mix 200g", category: "guests", price_inr: 85, tags: ["snack"], eta_min: 15 },
  { product_id: "P014", name: "Gulab Jamun Tin (8 pc)", category: "guests", price_inr: 140, tags: ["dessert"], eta_min: 15 },
  { product_id: "P015", name: "Ice Cubes 1kg", category: "guests", price_inr: 50, tags: ["beverage", "cooling"], eta_min: 15 },
  { product_id: "P016", name: "Extra Naan (4 pc)", category: "guests", price_inr: 95, tags: ["food", "extra"], eta_min: 15 },
  { product_id: "P020", name: "Digital BP Monitor Charger", category: "power_cut", price_inr: 199, tags: ["health", "elderly"], eta_min: 18 },
  { product_id: "P021", name: "Baby Night Light (battery)", category: "power_cut", price_inr: 249, tags: ["baby", "light"], eta_min: 12 },
  { product_id: "P030", name: "Diyas (pack of 12)", category: "pooja", price_inr: 60, tags: ["pooja"], eta_min: 18 },
  { product_id: "P031", name: "Camphor 50g", category: "pooja", price_inr: 45, tags: ["pooja"], eta_min: 18 },
  { product_id: "P032", name: "Agarbatti Pack", category: "pooja", price_inr: 80, tags: ["pooja"], eta_min: 18 },
  { product_id: "P033", name: "Kalawa Red Thread", category: "pooja", price_inr: 25, tags: ["pooja"], eta_min: 18 },
  { product_id: "P034", name: "Coconut (2 pc)", category: "pooja", price_inr: 70, tags: ["pooja"], eta_min: 18 },
  { product_id: "P035", name: "Marigold Flowers", category: "pooja", price_inr: 50, tags: ["pooja"], eta_min: 18 },
  { product_id: "P036", name: "Gangajal Bottle", category: "pooja", price_inr: 30, tags: ["pooja"], eta_min: 22 },
  { product_id: "P040", name: "Instant Coffee Sachets (10)", category: "exam", price_inr: 99, tags: ["beverage", "energy"], eta_min: 10 },
  { product_id: "P041", name: "Energy Bar (pack of 3)", category: "exam", price_inr: 120, tags: ["snack", "energy"], eta_min: 10 },
  { product_id: "P042", name: "Sticky Notes Pad", category: "exam", price_inr: 45, tags: ["stationery"], eta_min: 10 },
  { product_id: "P043", name: "Highlighter Set (5 colors)", category: "exam", price_inr: 89, tags: ["stationery"], eta_min: 10 },
  { product_id: "P044", name: "Salted Crackers Pack", category: "exam", price_inr: 35, tags: ["snack"], eta_min: 10 },
  { product_id: "P050", name: "Vicks Vaporub 25g", category: "health", price_inr: 95, tags: ["otc", "cold"], eta_min: 10 },
  { product_id: "P051", name: "Strepsils Lozenges (16)", category: "health", price_inr: 85, tags: ["otc", "throat"], eta_min: 10 },
  { product_id: "P052", name: "Honey 250g", category: "health", price_inr: 180, tags: ["natural", "throat"], eta_min: 10 },
  { product_id: "P053", name: "Ginger Tea Sachets (10)", category: "health", price_inr: 75, tags: ["beverage", "cold"], eta_min: 10 },
  { product_id: "P054", name: "Crocin Tablets (OTC, 10)", category: "health", price_inr: 35, tags: ["otc", "fever"], eta_min: 10 },
  { product_id: "P055", name: "Tissue Box", category: "health", price_inr: 60, tags: ["essentials"], eta_min: 10 },
  { product_id: "P060", name: "Atta 5kg", category: "staples", price_inr: 250, tags: ["staple", "reorder"], eta_min: 20 },
  { product_id: "P061", name: "Sugar 1kg", category: "staples", price_inr: 48, tags: ["staple", "reorder"], eta_min: 20 },
  { product_id: "P062", name: "Tea Powder 250g", category: "staples", price_inr: 110, tags: ["staple", "reorder"], eta_min: 20 },
  { product_id: "P063", name: "Britannia Biscuits (pack of 4)", category: "staples", price_inr: 80, tags: ["snack", "reorder"], eta_min: 20 },
  { product_id: "P064", name: "Milk 1L", category: "staples", price_inr: 64, tags: ["staple", "reorder"], eta_min: 20 },
  { product_id: "P070", name: "Hyderabadi Chicken Biryani (serves 2)", category: "food", price_inr: 220, tags: ["food", "meal", "main-course"], eta_min: 18 },
  { product_id: "P071", name: "Veg Pulao (serves 2)", category: "food", price_inr: 150, tags: ["food", "meal", "veg"], eta_min: 18 },
  { product_id: "P072", name: "Butter Paneer (serves 2)", category: "food", price_inr: 190, tags: ["food", "meal", "veg", "main-course"], eta_min: 18 },
  { product_id: "P073", name: "Tandoori Roti (6 pc)", category: "food", price_inr: 60, tags: ["food", "meal", "bread"], eta_min: 18 },
  { product_id: "P074", name: "Veg Hakka Noodles (serves 2)", category: "food", price_inr: 130, tags: ["food", "meal", "chinese"], eta_min: 18 },
  { product_id: "P080", name: "AA Batteries (pack of 4)", category: "essentials", price_inr: 90, tags: ["electronics", "remote", "battery"], eta_min: 12 },
  { product_id: "P081", name: "AAA Batteries (pack of 4)", category: "essentials", price_inr: 85, tags: ["electronics", "remote", "battery"], eta_min: 12 },
  { product_id: "P082", name: "USB-C Charging Cable", category: "essentials", price_inr: 199, tags: ["electronics", "charging"], eta_min: 14 },
  { product_id: "P083", name: "Extension Board (4 socket)", category: "essentials", price_inr: 349, tags: ["electronics", "power"], eta_min: 16 },
  { product_id: "P084", name: "Mosquito Repellent Refill", category: "monsoon", price_inr: 79, tags: ["monsoon", "home"], eta_min: 14 },
  { product_id: "P085", name: "Compact Umbrella", category: "monsoon", price_inr: 299, tags: ["monsoon", "rain"], eta_min: 16 },
  { product_id: "P086", name: "Rakhi Set (2 pc)", category: "festival", price_inr: 120, tags: ["festival", "rakshabandhan", "rakhi"], eta_min: 16 },
  { product_id: "P087", name: "Soan Papdi 250g", category: "festival", price_inr: 110, tags: ["festival", "sweets", "dessert"], eta_min: 16 },
  { product_id: "P088", name: "Roli Chawal Tikka Set", category: "festival", price_inr: 40, tags: ["festival", "pooja", "rakshabandhan"], eta_min: 16 },
  { product_id: "P089", name: "Disposable Plates (pack of 25)", category: "guests", price_inr: 99, tags: ["guests", "party"], eta_min: 15 },
];

const BY_ID = Object.fromEntries(CATALOG.map((p) => [p.product_id, p]));

// Find the best in-catalog alternative for an out-of-stock product:
// ranked by tag overlap (semantic similarity) first, then same-category,
// then closest price. Falls back to same category if nothing shares a tag.
export function findSubstitute(productId, excludeIds = []) {
  const target = BY_ID[productId];
  if (!target) return null;

  const exclude = new Set([...excludeIds, productId]);
  const targetTags = new Set(target.tags || []);

  const pool = CATALOG.filter((p) => !exclude.has(p.product_id));
  const overlapOf = (p) => (p.tags || []).filter((t) => targetTags.has(t)).length;

  let candidates = pool.filter((p) => overlapOf(p) > 0);
  if (!candidates.length) {
    candidates = pool.filter((p) => p.category === target.category);
  }
  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    const ov = overlapOf(b) - overlapOf(a);
    if (ov !== 0) return ov;
    const catA = a.category === target.category ? 0 : 1;
    const catB = b.category === target.category ? 0 : 1;
    if (catA !== catB) return catA - catB;
    return (
      Math.abs(a.price_inr - target.price_inr) -
      Math.abs(b.price_inr - target.price_inr)
    );
  });

  return candidates[0];
}
