// catalog.js — client copy of the product catalog, kept in sync with
// backend/data/catalog.json (same product_ids, names, prices, stock, tags).
// Used for Smart Substitution so the demo works instantly even when the live
// backend isn't reachable (mock fallback).

export const CATALOG = [
  { product_id: "P001", name: "Eveready Candles (pack of 10)", category: "power_cut", price_inr: 45, in_stock: false, tags: ["light", "emergency"], eta_min: 10 },
  { product_id: "P002", name: "Wipro Emergency Rechargeable LED Bulb", category: "power_cut", price_inr: 399, in_stock: true, tags: ["light", "emergency", "rechargeable"], eta_min: 12 },
  { product_id: "P003", name: "Mi Power Bank 10000mAh", category: "power_cut", price_inr: 899, in_stock: true, tags: ["charging", "emergency"], eta_min: 14 },
  { product_id: "P004", name: "Maggi 2-Minute Masala Noodles (pack of 4)", category: "power_cut", price_inr: 56, in_stock: true, tags: ["food", "instant", "no-fridge"], eta_min: 10 },
  { product_id: "P005", name: "Thums Up Cans (pack of 6, 300ml)", category: "power_cut", price_inr: 240, in_stock: true, tags: ["beverage", "no-fridge"], eta_min: 12 },
  { product_id: "P006", name: "Eveready Rechargeable LED Lantern", category: "power_cut", price_inr: 749, in_stock: true, tags: ["light", "emergency", "rechargeable"], eta_min: 14 },
  { product_id: "P020", name: "Omron BP Monitor Power Adapter", category: "power_cut", price_inr: 449, in_stock: true, tags: ["health", "elderly"], eta_min: 18 },
  { product_id: "P021", name: "Philips Rechargeable LED Night Light", category: "power_cut", price_inr: 299, in_stock: true, tags: ["baby", "light"], eta_min: 12 },

  { product_id: "P010", name: "Amul Malai Paneer 200g", category: "guests", price_inr: 95, in_stock: true, tags: ["food", "main-course"], eta_min: 12 },
  { product_id: "P011", name: "iD Fresh Wholewheat Naan (4 pc)", category: "guests", price_inr: 85, in_stock: true, tags: ["food", "main-course"], eta_min: 15 },
  { product_id: "P012", name: "Coca-Cola 1.25L", category: "guests", price_inr: 70, in_stock: true, tags: ["beverage"], eta_min: 12 },
  { product_id: "P013", name: "Haldiram's Classic Namkeen Mix 200g", category: "guests", price_inr: 55, in_stock: true, tags: ["snack"], eta_min: 12 },
  { product_id: "P014", name: "Haldiram's Gulab Jamun 1kg", category: "guests", price_inr: 199, in_stock: false, tags: ["dessert"], eta_min: 15 },
  { product_id: "P015", name: "Party Ice Cubes 1kg", category: "guests", price_inr: 45, in_stock: true, tags: ["beverage", "cooling"], eta_min: 18 },
  { product_id: "P016", name: "iD Fresh Malabar Parotta (5 pc)", category: "guests", price_inr: 99, in_stock: true, tags: ["food", "main-course"], eta_min: 15 },
  { product_id: "P089", name: "Ezee Disposable Plates (pack of 25)", category: "guests", price_inr: 99, in_stock: true, tags: ["guests", "party"], eta_min: 15 },

  { product_id: "P030", name: "Eco Clay Diyas (pack of 12)", category: "pooja", price_inr: 60, in_stock: true, tags: ["pooja"], eta_min: 18 },
  { product_id: "P031", name: "Mangalam Pure Camphor (Kapur) 50g", category: "pooja", price_inr: 55, in_stock: true, tags: ["pooja"], eta_min: 18 },
  { product_id: "P032", name: "Cycle Three-in-One Agarbatti Pack", category: "pooja", price_inr: 70, in_stock: true, tags: ["pooja"], eta_min: 18 },
  { product_id: "P033", name: "Moli Kalawa Sacred Red Thread", category: "pooja", price_inr: 20, in_stock: true, tags: ["pooja"], eta_min: 18 },
  { product_id: "P034", name: "Pooja Coconut (2 pc)", category: "pooja", price_inr: 60, in_stock: true, tags: ["pooja"], eta_min: 18 },
  { product_id: "P035", name: "Fresh Marigold Garland (Genda Phool)", category: "pooja", price_inr: 50, in_stock: true, tags: ["pooja"], eta_min: 18 },
  { product_id: "P036", name: "Gangajal Holy Water 500ml", category: "pooja", price_inr: 40, in_stock: true, tags: ["pooja"], eta_min: 22 },
  { product_id: "P037", name: "Cycle Sambrani Dhoop Cups (12)", category: "pooja", price_inr: 65, in_stock: true, tags: ["pooja"], eta_min: 18 },

  { product_id: "P040", name: "Nescafé Classic Coffee Sachets (pack of 12)", category: "exam", price_inr: 90, in_stock: true, tags: ["beverage", "energy"], eta_min: 10 },
  { product_id: "P041", name: "Yoga Bar Multigrain Energy Bars (pack of 6)", category: "exam", price_inr: 250, in_stock: true, tags: ["snack", "energy"], eta_min: 10 },
  { product_id: "P042", name: "Classmate Sticky Notes Pad", category: "exam", price_inr: 50, in_stock: true, tags: ["stationery"], eta_min: 10 },
  { product_id: "P043", name: "Camlin Highlighter Set (5 colors)", category: "exam", price_inr: 120, in_stock: true, tags: ["stationery"], eta_min: 10 },
  { product_id: "P044", name: "Parle Monaco Salted Crackers", category: "exam", price_inr: 40, in_stock: true, tags: ["snack"], eta_min: 10 },
  { product_id: "P045", name: "Red Bull Energy Drink (pack of 4, 250ml)", category: "exam", price_inr: 440, in_stock: true, tags: ["beverage", "energy"], eta_min: 10 },

  { product_id: "P050", name: "Vicks VapoRub 50g", category: "health", price_inr: 160, in_stock: true, tags: ["otc", "cold"], eta_min: 10 },
  { product_id: "P051", name: "Strepsils Original Lozenges (pack of 16)", category: "health", price_inr: 95, in_stock: true, tags: ["otc", "throat"], eta_min: 10 },
  { product_id: "P052", name: "Dabur Honey 250g", category: "health", price_inr: 165, in_stock: true, tags: ["natural", "throat"], eta_min: 10 },
  { product_id: "P053", name: "Organic India Tulsi Ginger Tea (25 bags)", category: "health", price_inr: 190, in_stock: true, tags: ["beverage", "cold"], eta_min: 10 },
  { product_id: "P054", name: "Crocin Advance Tablets (OTC, strip of 15)", category: "health", price_inr: 35, in_stock: true, tags: ["otc", "fever"], eta_min: 10 },
  { product_id: "P055", name: "Origami Soft Tissue Box (100 pulls)", category: "health", price_inr: 65, in_stock: true, tags: ["essentials"], eta_min: 10 },
  { product_id: "P056", name: "Dolo 650 Tablets (OTC, strip of 15)", category: "health", price_inr: 33, in_stock: true, tags: ["otc", "fever"], eta_min: 10 },
  { product_id: "P057", name: "Electral ORS Sachets (pack of 4)", category: "health", price_inr: 80, in_stock: true, tags: ["otc", "hydration"], eta_min: 10 },

  { product_id: "P060", name: "Aashirvaad Shudh Atta 5kg", category: "staples", price_inr: 275, in_stock: true, tags: ["staple", "reorder"], eta_min: 20 },
  { product_id: "P061", name: "Tata Sugar 1kg", category: "staples", price_inr: 55, in_stock: true, tags: ["staple", "reorder"], eta_min: 20 },
  { product_id: "P062", name: "Tata Tea Gold 250g", category: "staples", price_inr: 140, in_stock: true, tags: ["staple", "reorder"], eta_min: 18 },
  { product_id: "P063", name: "Britannia Marie Gold Biscuits (pack of 6)", category: "staples", price_inr: 90, in_stock: true, tags: ["snack", "reorder"], eta_min: 18 },
  { product_id: "P064", name: "Amul Taaza Toned Milk 1L", category: "staples", price_inr: 66, in_stock: true, tags: ["staple", "reorder"], eta_min: 15 },
  { product_id: "P065", name: "Tata Salt 1kg", category: "staples", price_inr: 28, in_stock: true, tags: ["staple", "reorder"], eta_min: 20 },
  { product_id: "P066", name: "Fortune Sunlite Refined Sunflower Oil 1L", category: "staples", price_inr: 145, in_stock: true, tags: ["staple", "reorder"], eta_min: 20 },
  { product_id: "P067", name: "India Gate Basmati Rice 5kg", category: "staples", price_inr: 540, in_stock: true, tags: ["staple", "reorder"], eta_min: 20 },

  { product_id: "P070", name: "Behrouz Hyderabadi Chicken Biryani (serves 2)", category: "food", price_inr: 349, in_stock: true, tags: ["food", "meal", "main-course"], eta_min: 22 },
  { product_id: "P071", name: "FreshMenu Veg Pulao (serves 2)", category: "food", price_inr: 199, in_stock: true, tags: ["food", "meal", "veg"], eta_min: 20 },
  { product_id: "P072", name: "Butter Paneer Masala (serves 2)", category: "food", price_inr: 230, in_stock: true, tags: ["food", "meal", "veg", "main-course"], eta_min: 20 },
  { product_id: "P073", name: "Tandoori Roti (6 pc)", category: "food", price_inr: 70, in_stock: true, tags: ["food", "meal", "bread"], eta_min: 18 },
  { product_id: "P074", name: "Veg Hakka Noodles (serves 2)", category: "food", price_inr: 160, in_stock: true, tags: ["food", "meal", "chinese"], eta_min: 20 },

  { product_id: "P080", name: "Duracell AA Batteries (pack of 4)", category: "essentials", price_inr: 130, in_stock: true, tags: ["electronics", "remote", "battery"], eta_min: 12 },
  { product_id: "P081", name: "Duracell AAA Batteries (pack of 4)", category: "essentials", price_inr: 120, in_stock: true, tags: ["electronics", "remote", "battery"], eta_min: 12 },
  { product_id: "P082", name: "boAt USB-C Charging Cable 1m", category: "essentials", price_inr: 199, in_stock: true, tags: ["electronics", "charging"], eta_min: 14 },
  { product_id: "P083", name: "GM 4-Socket Extension Board", category: "essentials", price_inr: 399, in_stock: true, tags: ["electronics", "power"], eta_min: 16 },

  { product_id: "P084", name: "Good Knight Activ+ Mosquito Repellent Refill", category: "monsoon", price_inr: 78, in_stock: true, tags: ["monsoon", "home"], eta_min: 14 },
  { product_id: "P085", name: "Cello Compact Folding Umbrella", category: "monsoon", price_inr: 350, in_stock: true, tags: ["monsoon", "rain"], eta_min: 16 },
  { product_id: "P091", name: "Duckback Foldable Raincoat", category: "monsoon", price_inr: 450, in_stock: true, tags: ["monsoon", "rain"], eta_min: 18 },

  { product_id: "P086", name: "Designer Rakhi Set (2 pc)", category: "festival", price_inr: 150, in_stock: true, tags: ["festival", "rakshabandhan", "rakhi"], eta_min: 16 },
  { product_id: "P087", name: "Bikano Soan Papdi 250g", category: "festival", price_inr: 110, in_stock: true, tags: ["festival", "sweets", "dessert"], eta_min: 16 },
  { product_id: "P088", name: "Roli Chawal Tikka Pooja Set", category: "festival", price_inr: 40, in_stock: true, tags: ["festival", "pooja", "rakshabandhan"], eta_min: 16 },
  { product_id: "P093", name: "Haldiram's Kaju Katli 250g", category: "festival", price_inr: 260, in_stock: true, tags: ["festival", "sweets", "dessert"], eta_min: 16 },
  { product_id: "P094", name: "Cadbury Celebrations Gift Box", category: "festival", price_inr: 180, in_stock: true, tags: ["festival", "sweets", "dessert"], eta_min: 16 },
];

const BY_ID = Object.fromEntries(CATALOG.map((p) => [p.product_id, p]));

export function getProduct(productId) {
  return BY_ID[productId] || null;
}

// Tags / categories that mark a product as edible food or drink. Used to gate
// substitutions so a non-food item (e.g. a Rakhi Set) can NEVER replace a food
// item (e.g. Soan Papdi) just because they share a broad tag like "festival".
const FOOD_TAGS = new Set([
  "food", "snack", "snacks", "dessert", "sweets", "beverage", "beverages",
  "meal", "main-course", "instant", "no-fridge",
]);
const FOOD_CATEGORIES = new Set([
  "food", "staples", "snacks", "beverages", "sweets", "noodles", "biscuits",
]);

// True if the product is something you eat or drink. Tags decide first (most
// reliable here); a broad situational tag like "festival" does NOT make
// something food.
function isFoodProduct(p) {
  if (!p) return false;
  const tags = (p.tags || []).map((t) => t.toLowerCase());
  if (tags.some((t) => FOOD_TAGS.has(t))) return true;
  return FOOD_CATEGORIES.has((p.category || "").toLowerCase());
}

// Find the best in-catalog alternative for an out-of-stock product:
// ranked by tag overlap (semantic similarity) first, then same-category,
// then closest price. Only IN-STOCK products are considered.
//
// HARD GATE: food is only ever swapped for food, and non-food only for
// non-food — so a Rakhi Set can never stand in for an out-of-stock sweet.
export function findSubstitute(productId, excludeIds = []) {
  const target = BY_ID[productId];
  if (!target) return null;

  const exclude = new Set([...excludeIds, productId]);
  const targetTags = new Set(target.tags || []);
  const targetIsFood = isFoodProduct(target);

  const pool = CATALOG.filter(
    (p) =>
      !exclude.has(p.product_id) &&
      p.in_stock !== false &&
      isFoodProduct(p) === targetIsFood
  );
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

// Generic, too-broad tags that don't by themselves make two products genuine
// alternatives (a cola and ice cubes both being "beverage"/"cooling" is not a
// real swap). A substitution is only offered when products share a SPECIFIC
// tag below.
const GENERIC_TAGS = new Set([
  "food", "beverage", "beverages", "snack", "snacks", "emergency", "instant",
  "no-fridge", "essentials", "staple", "reorder", "meal", "home", "energy",
  "natural", "cooling", "party", "guests", "electronics", "power",
]);

// For the UI's "out of stock" offer: find the best IN-STOCK alternative that
// shares a SPECIFIC tag with the target (same food/non-food class, closest
// price). Returns null when there's no genuinely close match, so we never offer
// an odd swap. `overlap` is the count of shared specific tags.
export function findSubstituteScored(productId, excludeIds = []) {
  const target = BY_ID[productId];
  if (!target) return null;

  const targetSpecific = new Set(
    (target.tags || []).filter((t) => !GENERIC_TAGS.has(t))
  );
  if (!targetSpecific.size) return null; // nothing specific to match on

  const exclude = new Set([...excludeIds, productId]);
  const targetIsFood = isFoodProduct(target);

  let best = null;
  for (const p of CATALOG) {
    if (exclude.has(p.product_id) || p.in_stock === false) continue;
    if (isFoodProduct(p) !== targetIsFood) continue;
    const overlap = (p.tags || []).filter((t) => targetSpecific.has(t)).length;
    if (overlap < 1) continue;
    const priceDiff = Math.abs((p.price_inr || 0) - (target.price_inr || 0));
    if (
      !best ||
      overlap > best.overlap ||
      (overlap === best.overlap && priceDiff < best.priceDiff)
    ) {
      best = { substitute: p, overlap, priceDiff };
    }
  }
  return best ? { substitute: best.substitute, overlap: best.overlap } : null;
}
