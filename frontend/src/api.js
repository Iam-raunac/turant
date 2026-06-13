// api.js — calls the parse_and_generate Lambda via API Gateway.
// Falls back to a bundled mock if VITE_USE_MOCK=1 or if the network call fails.

import { mockResponseFor } from "./mock.js";

const API_URL = import.meta.env.VITE_API_URL || "";
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "1";

export async function generateCart(payload) {
  if (USE_MOCK || !API_URL) {
    return await mockResponseFor(payload);
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    // API Gateway proxy responses sometimes come wrapped — unwrap if so.
    if (data && typeof data === "object" && typeof data.body === "string") {
      return JSON.parse(data.body);
    }
    return data;
  } catch (err) {
    console.error("[Turant] API call failed, falling back to mock:", err);
    const mock = await mockResponseFor(payload);
    return { ...mock, _fallback: true, _error: err.message };
  }
}
