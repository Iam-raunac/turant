// mock.js — local fallback responses keyed off the user_text.
// Used as a demo safety net if the API URL is missing or unreachable.

const SAFETY_NOTE =
  "This is not medical advice. Consult a doctor if symptoms persist beyond 48 hours or worsen. We only suggest OTC products available without a prescription.";

const POWER_CUT = {
  response_type: "confident",
  cart_title: "Power Cut Kit",
  situation_understood:
    "Power outage during monsoon — putting together light, charging, and easy food.",
  clarifying_question: null,
  items: [
    { product_id: "P001", name: "Candles (pack of 10)", reason: "Tonight's light, no electricity needed", confidence: 0.92, price_inr: 40, eta_min: 12, personalized: false },
    { product_id: "P002", name: "Rechargeable LED Bulb", reason: "Lasts 6 hrs on a single charge", confidence: 0.9, price_inr: 299, eta_min: 12, personalized: false },
    { product_id: "P003", name: "Power Bank 10000mAh", reason: "Keeps your phone and BP monitor powered", confidence: 0.88, price_inr: 699, eta_min: 14, personalized: false },
    { product_id: "P004", name: "Maggi Atta Noodles (pack of 4)", reason: "Quick dinner, no fridge or stove needed", confidence: 0.82, price_inr: 140, eta_min: 12, personalized: false },
    { product_id: "P005", name: "Cold Drinks Pack (6 cans)", reason: "Refreshing while the fridge is off", confidence: 0.78, price_inr: 240, eta_min: 12, personalized: false },
  ],
  safety_note: null,
  delivery_note: null,
  personalization_applied: false,
  total_inr: 1418,
};

const POWER_CUT_PERSONAL = {
  ...POWER_CUT,
  items: POWER_CUT.items.map((it) =>
    it.product_id === "P004"
      ? { ...it, reason: "Maggi — your usual choice", personalized: true }
      : it.product_id === "P003"
      ? { ...it, reason: "Keeps your husband's BP monitor powered through the outage", personalized: true }
      : it
  ),
  personalization_applied: true,
};

const HEALTH = {
  response_type: "confident",
  cart_title: "Cold & Cough Kit",
  situation_understood: "Early cold-and-cough symptoms — sending OTC relief items.",
  clarifying_question: null,
  items: [
    { product_id: "P054", name: "Crocin Tablets (OTC, 10)", reason: "Helps reduce mild fever and body ache (OTC)", confidence: 0.9, price_inr: 35, eta_min: 10, personalized: false },
    { product_id: "P051", name: "Strepsils Lozenges (16)", reason: "Relieves sore throat", confidence: 0.88, price_inr: 85, eta_min: 10, personalized: false },
    { product_id: "P050", name: "Vicks Vaporub 25g", reason: "Soothes chest congestion", confidence: 0.86, price_inr: 95, eta_min: 10, personalized: false },
    { product_id: "P052", name: "Honey 250g", reason: "Natural remedy for throat irritation", confidence: 0.8, price_inr: 180, eta_min: 10, personalized: false },
    { product_id: "P053", name: "Ginger Tea Sachets (10)", reason: "Warm relief for cold symptoms", confidence: 0.78, price_inr: 75, eta_min: 10, personalized: false },
    { product_id: "P055", name: "Tissue Box", reason: "Stay comfortable", confidence: 0.7, price_inr: 60, eta_min: 10, personalized: false },
  ],
  safety_note: SAFETY_NOTE,
  delivery_note: null,
  personalization_applied: false,
  total_inr: 530,
};

const BEST_GUESS = {
  response_type: "best_guess",
  cart_title: "Maybe Pooja Saamagri",
  situation_understood:
    "Assuming you're prepping for a small pooja — sending the most common items. Tell me more if it's something else.",
  clarifying_question: null,
  items: [
    { product_id: "P030", name: "Diyas (pack of 12)", reason: "Essential for the evening aarti", confidence: 0.65, price_inr: 60, eta_min: 18, personalized: false },
    { product_id: "P032", name: "Agarbatti Pack", reason: "Fragrance for the puja space", confidence: 0.6, price_inr: 80, eta_min: 18, personalized: false },
    { product_id: "P035", name: "Marigold Flowers", reason: "For decoration and offering", confidence: 0.55, price_inr: 50, eta_min: 18, personalized: false },
  ],
  safety_note: null,
  delivery_note: null,
  personalization_applied: false,
  total_inr: 190,
};

const CLARIFY = {
  response_type: "clarifying_question",
  cart_title: null,
  situation_understood: "Not enough context to suggest a confident cart yet.",
  clarifying_question:
    "Could you tell me a bit more — are you preparing for guests, an emergency, a festival, or feeling unwell?",
  items: [],
  safety_note: null,
  delivery_note: null,
  personalization_applied: false,
  total_inr: 0,
};

const BATTLE_MOVIE = {
  response_type: "battle",
  situation_understood: "Movie night for 4 — building a Budget vs Premium pick.",
  carts: [
    {
      tier: "budget",
      cart_title: "Budget Cart — Movie Night",
      items: [
        { product_id: "P044", name: "Salted Crackers Pack", reason: "Light savory bite", confidence: 0.85, price_inr: 35, eta_min: 10, personalized: false },
        { product_id: "P013", name: "Haldiram Namkeen Mix 200g", reason: "Crowd-pleasing snack", confidence: 0.85, price_inr: 85, eta_min: 15, personalized: false },
        { product_id: "P012", name: "Coca-Cola 1.25L", reason: "Shared drink for 4", confidence: 0.85, price_inr: 65, eta_min: 15, personalized: false },
        { product_id: "P040", name: "Instant Coffee Sachets (10)", reason: "Stays awake through the second half", confidence: 0.7, price_inr: 99, eta_min: 10, personalized: false },
        { product_id: "P041", name: "Energy Bar (pack of 3)", reason: "A bite without leaving the couch", confidence: 0.7, price_inr: 120, eta_min: 10, personalized: false },
      ],
      safety_note: null,
      delivery_note: null,
      personalization_applied: false,
      total_inr: 404,
    },
    {
      tier: "premium",
      cart_title: "Premium Cart — Movie Night",
      items: [
        { product_id: "P013", name: "Haldiram Namkeen Mix 200g", reason: "Better-quality savory snack", confidence: 0.9, price_inr: 85, eta_min: 15, personalized: false },
        { product_id: "P012", name: "Coca-Cola 1.25L", reason: "Crowd favorite", confidence: 0.88, price_inr: 65, eta_min: 15, personalized: false },
        { product_id: "P015", name: "Ice Cubes 1kg", reason: "Cold drinks without waiting", confidence: 0.85, price_inr: 50, eta_min: 15, personalized: false },
        { product_id: "P014", name: "Gulab Jamun Tin (8 pc)", reason: "A sweet ending to the night", confidence: 0.8, price_inr: 140, eta_min: 15, personalized: false },
        { product_id: "P041", name: "Energy Bar (pack of 3)", reason: "Healthier nibble", confidence: 0.7, price_inr: 120, eta_min: 10, personalized: false },
        { product_id: "P063", name: "Britannia Biscuits (pack of 4)", reason: "Backup with chai later", confidence: 0.7, price_inr: 80, eta_min: 20, personalized: false },
      ],
      safety_note: null,
      delivery_note:
        "Most items arrive in ~15 mins, but Britannia Biscuits takes about 20 mins — remove it if you need everything faster.",
      personalization_applied: false,
      total_inr: 540,
    },
  ],
};

function isPowerCut(t) {
  return /(light|bijli|power|electric|outage)/i.test(t);
}
function isHealth(t) {
  return /(bukhar|fever|cold|cough|sardi|khaansi|throat|sick|ill|unwell)/i.test(t);
}
function isPooja(t) {
  return /(pooja|puja|aarti|havan)/i.test(t);
}
function isMovie(t) {
  return /(movie|netflix|film)/i.test(t);
}
function isVague(t) {
  return t.trim().split(/\s+/).length <= 3;
}

export async function mockResponseFor(payload) {
  // tiny delay to mimic network
  await new Promise((r) => setTimeout(r, 600));

  const text = (payload.user_text || "").toLowerCase();

  // Refinement — heuristic: drop maggi if asked
  if (payload.previous_cart && /maggi.*hata|remove.*maggi|healthy/i.test(payload.user_text)) {
    const items = payload.previous_cart.items
      .filter((i) => !/maggi/i.test(i.name))
      .concat([
        {
          product_id: "P041",
          name: "Energy Bar (pack of 3)",
          reason: "Swapped in for a healthier alternative",
          confidence: 0.78,
          price_inr: 120,
          eta_min: 10,
          personalized: false,
        },
      ]);
    return {
      response_type: "confident",
      cart_title: payload.previous_cart.cart_title || "Refined Cart",
      situation_understood: "Swapped Maggi for an energy bar.",
      clarifying_question: null,
      items,
      safety_note: null,
      delivery_note: null,
      personalization_applied: !!payload.user_id,
      total_inr: items.reduce((s, i) => s + i.price_inr, 0),
    };
  }

  if (payload.mode === "battle") {
    return BATTLE_MOVIE;
  }

  if (isHealth(text)) return HEALTH;
  if (isPowerCut(text)) {
    return payload.user_id === "demo_user_1" ? POWER_CUT_PERSONAL : POWER_CUT;
  }
  if (isPooja(text)) return BEST_GUESS;
  if (isMovie(text)) return BATTLE_MOVIE;
  if (isVague(text)) return CLARIFY;

  // generic fallback — best guess
  return BEST_GUESS;
}
