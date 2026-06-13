// api.js — talks to the parse_and_generate Lambda via API Gateway.
// Falls back to a bundled mock if VITE_API_URL is missing or a call fails.
//
// Every response carries _source: "live" | "mock" | "mock-fallback" so the UI
// can show the user which backend they're hitting.

import { mockGenerate, mockRecordOrder, mockGetProfile, mockRecordRemoval, mockGetSubstitute } from "./mock.js";

const API_URL = (import.meta.env.VITE_API_URL || "").trim();
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "1";

export const apiInfo = {
  url: API_URL,
  usingMock: USE_MOCK || !API_URL,
};

async function postJson(payload) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 240)}`);
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response: ${text.slice(0, 200)}`);
  }
  // Unwrap API Gateway proxy shape if present.
  if (data && typeof data === "object" && typeof data.body === "string") {
    data = JSON.parse(data.body);
  }
  if (data && data.error) throw new Error(`Backend: ${data.error}`);
  return data;
}

export async function generateCart(payload) {
  if (USE_MOCK || !API_URL) {
    return { ...(await mockGenerate(payload)), _source: "mock" };
  }
  try {
    return { ...(await postJson(payload)), _source: "live" };
  } catch (err) {
    console.error("[Turant] generate failed, using mock:", err);
    return { ...(await mockGenerate(payload)), _source: "mock-fallback", _error: err.message };
  }
}

export async function recordOrder({ userId, name, items }) {
  const payload = { action: "record_order", user_id: userId, name, items };
  if (USE_MOCK || !API_URL) {
    return { ...(await mockRecordOrder(payload)), _source: "mock" };
  }
  try {
    return { ...(await postJson(payload)), _source: "live" };
  } catch (err) {
    console.error("[Turant] record_order failed, using mock:", err);
    return { ...(await mockRecordOrder(payload)), _source: "mock-fallback", _error: err.message };
  }
}

export async function getProfile(userId) {
  const payload = { action: "get_profile", user_id: userId };
  if (USE_MOCK || !API_URL) {
    return { ...(await mockGetProfile(payload)), _source: "mock" };
  }
  try {
    return { ...(await postJson(payload)), _source: "live" };
  } catch (err) {
    console.error("[Turant] get_profile failed, using mock:", err);
    return { ...(await mockGetProfile(payload)), _source: "mock-fallback", _error: err.message };
  }
}

// Confidence Feedback Loop — record an item the user removed (negative signal).
export async function recordRemoval({ userId, items, context }) {
  const payload = { action: "record_removal", user_id: userId, items, context };
  if (USE_MOCK || !API_URL) {
    return { ...(await mockRecordRemoval(payload)), _source: "mock" };
  }
  try {
    return { ...(await postJson(payload)), _source: "live" };
  } catch (err) {
    console.error("[Turant] record_removal failed, using mock:", err);
    return { ...(await mockRecordRemoval(payload)), _source: "mock-fallback", _error: err.message };
  }
}

// Smart Substitution — ask the backend for the best swap for an OOS product.
export async function getSubstitute({ productId, excludeIds }) {
  const payload = { action: "substitute", product_id: productId, exclude_ids: excludeIds };
  if (USE_MOCK || !API_URL) {
    return { ...(await mockGetSubstitute(payload)), _source: "mock" };
  }
  try {
    return { ...(await postJson(payload)), _source: "live" };
  } catch (err) {
    console.error("[Turant] substitute failed, using mock:", err);
    return { ...(await mockGetSubstitute(payload)), _source: "mock-fallback", _error: err.message };
  }
}
