// mock.js — local fallback so the demo never hard-fails.
// Also implements REAL learning in localStorage: ordering items records them,
// and future carts surface the user's frequently-ordered items first.

import { findSubstitute, CATALOG } from "./catalog.js";

const SAFETY_NOTE =
  "This is not medical advice. Consult a doctor if symptoms persist beyond 48 hours or worsen. We only suggest OTC products available without a prescription.";

const HIST_KEY = (uid) => `turant_hist_${uid || "guest"}`;

const SECONDS_PER_DAY = 86400;
const CAT_BY_ID = Object.fromEntries(CATALOG.map((p) => [p.product_id, p]));

// Mirror of the backend replenishment cycles (Reorder Prediction). Kept in
// sync with parse_and_generate/lambda_function.py so the offline demo behaves
// like the live one.
const CATEGORY_REPLENISH_DAYS = { staples: 14, health: 30, pooja: 20, monsoon: 30 };
const PRODUCT_REPLENISH_DAYS = {
  P001: 20, P004: 12, P005: 10, P064: 4, P062: 18, P061: 30,
  P060: 30, P063: 12, P084: 30, P040: 12,
};
const REORDER_THRESHOLD = 0.8;

function replenishDaysFor(pid) {
  if (pid in PRODUCT_REPLENISH_DAYS) return PRODUCT_REPLENISH_DAYS[pid];
  const cat = CAT_BY_ID[pid]?.category;
  return CATEGORY_REPLENISH_DAYS[cat] || null;
}

// Built-in demo personas — mirror the SEEDED backend profiles so the offline
// fallback can still show personalization + reorder prediction. days_ago is
// converted to a real timestamp at read time (so it's never stale).
const DEMO_SEED = {
  demo_user_1: {
    name: "Mrs. Iyer",
    orders: [
      { product_id: "P064", name: "Milk 1L", count: 6, days_ago: 6 },
      { product_id: "P001", name: "Candles (pack of 10)", count: 2, days_ago: 22 },
      { product_id: "P063", name: "Britannia Biscuits (pack of 4)", count: 3, days_ago: 15 },
      { product_id: "P054", name: "Crocin Tablets (OTC, 10)", count: 2, days_ago: 34 },
    ],
  },
  demo_user_2: {
    name: "Aarav",
    orders: [
      { product_id: "P004", name: "Maggi Atta Noodles (pack of 4)", count: 5, days_ago: 14 },
      { product_id: "P040", name: "Instant Coffee Sachets (10)", count: 4, days_ago: 16 },
      { product_id: "P041", name: "Energy Bar (pack of 3)", count: 3, days_ago: 8 },
    ],
  },
};

function seededHistory(userId) {
  const seed = DEMO_SEED[userId];
  if (!seed) return null;
  const now = Math.floor(Date.now() / 1000);
  const hist = {
    order_count: 0,
    item_counts: {},
    item_names: {},
    item_last_ordered: {},
    disliked_items: {},
  };
  seed.orders.forEach((o) => {
    hist.item_counts[o.product_id] = o.count;
    hist.item_names[o.product_id] = o.name;
    hist.item_last_ordered[o.product_id] = now - o.days_ago * SECONDS_PER_DAY;
    hist.order_count += o.count;
  });
  return hist;
}

function computeReorderSuggestions(hist, limit = 3) {
  const lastOrdered = hist.item_last_ordered || {};
  const now = Math.floor(Date.now() / 1000);
  const out = [];
  for (const [pid, ts] of Object.entries(lastOrdered)) {
    const cycle = replenishDaysFor(pid);
    if (!cycle) continue;
    const daysSince = (now - ts) / SECONDS_PER_DAY;
    if (daysSince < cycle * REORDER_THRESHOLD) continue;
    const product = CAT_BY_ID[pid] || {};
    const name = hist.item_names?.[pid] || product.name || pid;
    out.push({
      product_id: pid,
      name,
      days_since: Math.round(daysSince),
      cycle_days: cycle,
      price_inr: product.price_inr || 0,
      eta_min: product.eta_min || 15,
      reason: `You bought ${name} about ${Math.round(daysSince)} days ago — it's likely running low. Reorder?`,
      urgency: Math.round((daysSince / cycle) * 100) / 100,
    });
  }
  out.sort((a, b) => b.urgency - a.urgency);
  return out.slice(0, limit);
}

function loadHistory(userId) {
  try {
    const stored = JSON.parse(localStorage.getItem(HIST_KEY(userId)));
    if (stored) return stored;
  } catch {
    /* fall through to seed/default */
  }
  // First visit for a demo persona → use the built-in seeded history.
  const seeded = seededHistory(userId);
  if (seeded) return seeded;
  return {
    order_count: 0,
    item_counts: {},
    item_names: {},
    item_last_ordered: {},
    disliked_items: {},
  };
}

function saveHistory(userId, hist) {
  localStorage.setItem(HIST_KEY(userId), JSON.stringify(hist));
}

function topLearned(userId, n = 6) {
  const h = loadHistory(userId);
  return Object.entries(h.item_counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([pid, count]) => ({ product_id: pid, name: h.item_names[pid] || pid, count }));
}

// ---- base carts -------------------------------------------------------------
const POWER_CUT = {
  response_type: "confident",
  cart_title: "Power Cut Kit",
  situation_understood:
    "Power outage during monsoon — light, charging, and easy food.",
  clarifying_question: null,
  items: [
    { product_id: "P001", name: "Candles (pack of 10)", reason: "Tonight's light, no electricity needed", confidence: 0.92, price_inr: 40, eta_min: 12, personalized: false },
    { product_id: "P002", name: "Rechargeable LED Bulb", reason: "Lasts 6 hrs on a single charge", confidence: 0.9, price_inr: 299, eta_min: 12, personalized: false },
    { product_id: "P003", name: "Power Bank 10000mAh", reason: "Keeps your phone powered", confidence: 0.88, price_inr: 699, eta_min: 14, personalized: false },
    { product_id: "P004", name: "Maggi Atta Noodles (pack of 4)", reason: "Quick dinner, no fridge or stove", confidence: 0.82, price_inr: 140, eta_min: 12, personalized: false },
    { product_id: "P005", name: "Cold Drinks Pack (6 cans)", reason: "Refreshing while the fridge is off", confidence: 0.78, price_inr: 240, eta_min: 12, personalized: false },
  ],
  safety_note: null, delivery_note: null, personalization_applied: false, total_inr: 1418,
};

const HEALTH = {
  response_type: "confident",
  cart_title: "Cold & Cough Kit",
  situation_understood: "Early cold-and-cough symptoms — OTC relief items.",
  clarifying_question: null,
  items: [
    { product_id: "P054", name: "Crocin Tablets (OTC, 10)", reason: "Helps reduce mild fever and body ache (OTC)", confidence: 0.9, price_inr: 35, eta_min: 10, personalized: false },
    { product_id: "P051", name: "Strepsils Lozenges (16)", reason: "Relieves sore throat", confidence: 0.88, price_inr: 85, eta_min: 10, personalized: false },
    { product_id: "P050", name: "Vicks Vaporub 25g", reason: "Soothes chest congestion", confidence: 0.86, price_inr: 95, eta_min: 10, personalized: false },
    { product_id: "P053", name: "Ginger Tea Sachets (10)", reason: "Warm relief for cold symptoms", confidence: 0.78, price_inr: 75, eta_min: 10, personalized: false },
    { product_id: "P055", name: "Tissue Box", reason: "Stay comfortable", confidence: 0.7, price_inr: 60, eta_min: 10, personalized: false },
  ],
  safety_note: SAFETY_NOTE, delivery_note: null, personalization_applied: false, total_inr: 350,
};

const DINNER = {
  response_type: "confident",
  cart_title: "Dinner for Guests",
  situation_understood: "Dinner to put together quickly for guests.",
  clarifying_question: null,
  items: [
    { product_id: "P072", name: "Butter Paneer (serves 2)", reason: "Crowd-pleasing main course", confidence: 0.85, price_inr: 190, eta_min: 18, personalized: false },
    { product_id: "P073", name: "Tandoori Roti (6 pc)", reason: "Pairs with the curry", confidence: 0.82, price_inr: 60, eta_min: 18, personalized: false },
    { product_id: "P013", name: "Haldiram Namkeen Mix 200g", reason: "Quick starter", confidence: 0.78, price_inr: 85, eta_min: 15, personalized: false },
    { product_id: "P014", name: "Gulab Jamun Tin (8 pc)", reason: "Dessert to finish", confidence: 0.75, price_inr: 140, eta_min: 15, personalized: false },
  ],
  safety_note: null, delivery_note: null, personalization_applied: false, total_inr: 475,
};

const POOJA = {
  response_type: "confident",
  cart_title: "Pooja Saamagri",
  situation_understood: "A small pooja at home — the common essentials.",
  clarifying_question: null,
  items: [
    { product_id: "P030", name: "Diyas (pack of 12)", reason: "For the evening aarti", confidence: 0.82, price_inr: 60, eta_min: 18, personalized: false },
    { product_id: "P032", name: "Agarbatti Pack", reason: "Fragrance for the space", confidence: 0.78, price_inr: 80, eta_min: 18, personalized: false },
    { product_id: "P035", name: "Marigold Flowers", reason: "Decoration and offering", confidence: 0.72, price_inr: 50, eta_min: 18, personalized: false },
  ],
  safety_note: null, delivery_note: null, personalization_applied: false, total_inr: 190,
};

const CLARIFY = {
  response_type: "clarifying_question",
  cart_title: null,
  situation_understood: "Not enough context yet.",
  clarifying_question:
    "Could you tell me a bit more — guests, an emergency, a festival, food, or feeling unwell?",
  items: [], safety_note: null, delivery_note: null, personalization_applied: false, total_inr: 0,
};

// ---- intent matching --------------------------------------------------------
const tests = [
  [/(light|bijli|power|electric|outage)/i, POWER_CUT],
  [/(bukhar|fever|cold|cough|sardi|khaansi|throat|sick|ill|unwell|tabiyat)/i, HEALTH],
  [/(guest|mehmaan|dinner|khaana|lunch|biryani|food|meal|bhook)/i, DINNER],
  [/(pooja|puja|aarti|havan)/i, POOJA],
];

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Re-rank only: boost items the cart ALREADY contains that the user buys often.
// Never pads the cart with unrelated favorites — relevance stays intact.
// Also drops items the user has previously removed (Confidence Feedback Loop).
function applyLearning(cart, userId) {
  if (!cart.items) return cart;
  const hist = loadHistory(userId);
  const disliked = hist.disliked_items || {};

  // Confidence Feedback Loop: honor negative signals.
  cart.items = cart.items.filter((it) => !disliked[it.product_id]);

  const learned = topLearned(userId, 8);
  if (learned.length) {
    cart.items.forEach((it) => {
      const hit = learned.find((l) => l.product_id === it.product_id);
      if (hit) {
        it.personalized = true;
        if (!/order this often|you order/i.test(it.reason || "")) {
          it.reason = `${it.reason} You order this often (${hit.count}×).`;
        }
        cart.personalization_applied = true;
      }
    });
  }

  cart.total_inr = cart.items.reduce((s, i) => s + (i.price_inr || 0), 0);
  return cart;
}

// ---- exported mock actions --------------------------------------------------

// Accept items as bare id strings (["P001"]) or dicts and always yield dicts,
// mirroring the backend's _normalize_items so neither format breaks learning.
function normalizeItems(items) {
  return (items || [])
    .map((it) => (typeof it === "string" ? { product_id: it, name: it } : it))
    .filter((it) => it && typeof it === "object");
}

export async function mockGenerate(payload) {
  await new Promise((r) => setTimeout(r, 500));
  const text = payload.user_text || "";

  // refinement
  if (payload.previous_cart && /maggi.*hata|remove.*maggi|healthy/i.test(text)) {
    const items = payload.previous_cart.items
      .filter((i) => !/maggi/i.test(i.name))
      .concat([{ product_id: "P041", name: "Energy Bar (pack of 3)", reason: "Healthier swap", confidence: 0.78, price_inr: 120, eta_min: 10, personalized: false }]);
    return { response_type: "confident", cart_title: payload.previous_cart.cart_title || "Refined Cart", situation_understood: "Swapped Maggi for an energy bar.", clarifying_question: null, items, safety_note: null, delivery_note: null, personalization_applied: false, total_inr: items.reduce((s, i) => s + i.price_inr, 0) };
  }

  let base = clone(CLARIFY);
  const trimmed = text.trim();
  const matched = tests.find(([rx]) => rx.test(trimmed));
  if (matched) base = clone(matched[1]);
  else if (trimmed.split(/\s+/).length <= 2) base = clone(CLARIFY);
  else base = clone(DINNER);

  return applyLearning(base, payload.user_id);
}

export async function mockRecordOrder(payload) {
  await new Promise((r) => setTimeout(r, 250));
  const uid = payload.user_id;
  const hist = loadHistory(uid);
  hist.order_count += 1;
  hist.item_last_ordered = hist.item_last_ordered || {};
  const now = Math.floor(Date.now() / 1000);
  normalizeItems(payload.items).forEach((it) => {
    const pid = it.product_id || it.name;
    if (!pid) return;
    hist.item_counts[pid] = (hist.item_counts[pid] || 0) + 1;
    hist.item_names[pid] = it.name || pid;
    hist.item_last_ordered[pid] = now;
  });
  saveHistory(uid, hist);
  return {
    status: "recorded",
    user_id: uid,
    order_count: hist.order_count,
    learned_items: hist.item_names,
    item_counts: hist.item_counts,
  };
}

export async function mockGetProfile(payload) {
  await new Promise((r) => setTimeout(r, 150));
  const uid = payload.user_id;
  const hist = loadHistory(uid);
  if (!hist.order_count && !Object.keys(hist.disliked_items || {}).length) {
    return { exists: false, user_id: uid };
  }
  return {
    exists: true,
    user_id: uid,
    order_count: hist.order_count,
    item_counts: hist.item_counts,
    item_names: hist.item_names,
    item_last_ordered: hist.item_last_ordered || {},
    disliked_items: hist.disliked_items || {},
    reorder_suggestions: computeReorderSuggestions(hist),
  };
}

// Confidence Feedback Loop — store a removed item as a negative signal.
export async function mockRecordRemoval(payload) {
  await new Promise((r) => setTimeout(r, 200));
  const uid = payload.user_id;
  const hist = loadHistory(uid);
  hist.disliked_items = hist.disliked_items || {};
  normalizeItems(payload.items).forEach((it) => {
    const pid = it.product_id || it.name;
    if (!pid) return;
    const entry = hist.disliked_items[pid] || { name: it.name || pid, count: 0 };
    entry.count += 1;
    entry.name = it.name || entry.name || pid;
    if (payload.context) entry.last_context = payload.context;
    hist.disliked_items[pid] = entry;
  });
  saveHistory(uid, hist);
  return {
    status: "removal_recorded",
    user_id: uid,
    disliked_items: hist.disliked_items,
  };
}

// Smart Substitution — best in-catalog swap for an out-of-stock product.
export async function mockGetSubstitute(payload) {
  await new Promise((r) => setTimeout(r, 200));
  const substitute = findSubstitute(payload.product_id, payload.exclude_ids || []);
  return { product_id: payload.product_id, substitute };
}
