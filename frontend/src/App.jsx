import { useCallback, useEffect, useState } from "react";
import { generateCart, recordOrder, getProfile, recordRemoval } from "./api.js";
import Header from "./components/Header.jsx";
import HeroInput from "./components/HeroInput.jsx";
import SampleChips from "./components/SampleChips.jsx";
import Identity from "./components/Identity.jsx";
import LearnedStrip from "./components/LearnedStrip.jsx";
import ModeToggle from "./components/ModeToggle.jsx";
import Loading from "./components/Loading.jsx";
import Cart from "./components/Cart.jsx";
import BattleCarts from "./components/BattleCarts.jsx";
import ClarifyingQuestion from "./components/ClarifyingQuestion.jsx";
import RefineBar from "./components/RefineBar.jsx";
import OrderConfirmation from "./components/OrderConfirmation.jsx";
import ErrorBanner from "./components/ErrorBanner.jsx";
import NeighborhoodPulse from "./components/NeighborhoodPulse.jsx";
import SmartSubstitution from "./components/SmartSubstitution.jsx";

const SAMPLE_PROMPTS = [
  "light chali gayi, monsoon hai bahar, ghar pe kuch nahi hai",
  "bukhar lag raha hai, throat bhi kharab hai",
  "mehmaan aa rahe hain, dinner banana hai",
  "movie night for 4 people",
  "kuch chahiye",
];

const IDENTITY_KEY = "turant_identity";

function slugify(name) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return `${base || "user"}_${Math.random().toString(36).slice(2, 6)}`;
}

function loadIdentity() {
  try {
    return JSON.parse(localStorage.getItem(IDENTITY_KEY)) || { id: "", name: "" };
  } catch {
    return { id: "", name: "" };
  }
}

export default function App() {
  const [user, setUser] = useState(loadIdentity);
  const [profile, setProfile] = useState(null);

  const [userText, setUserText] = useState("");
  const [mode, setMode] = useState("single");
  const [budget, setBudget] = useState(500);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [ordered, setOrdered] = useState(null);
  const [feedbackNote, setFeedbackNote] = useState(null);

  const refreshProfile = useCallback(async (uid) => {
    if (!uid) {
      setProfile(null);
      return;
    }
    try {
      const p = await getProfile(uid);
      setProfile(p);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    refreshProfile(user.id);
  }, [user.id, refreshProfile]);

  function signIn(name) {
    const existing = loadIdentity();
    // keep same id if signing in with the same name (so learning persists)
    const id =
      existing.name.toLowerCase() === name.toLowerCase() && existing.id
        ? existing.id
        : slugify(name);
    const next = { id, name };
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(next));
    setUser(next);
  }

  function signOut() {
    localStorage.removeItem(IDENTITY_KEY);
    setUser({ id: "", name: "" });
    setProfile(null);
  }

  async function submit(textOverride, modeOverride) {
    const text = (textOverride ?? userText).trim();
    if (!text) return;

    setUserText(text);
    setLoading(true);
    setError(null);
    setResult(null);
    setOrdered(null);
    setFeedbackNote(null);

    const payload = { user_text: text };
    if (user.id) payload.user_id = user.id;
    const useMode = modeOverride ?? mode;
    if (useMode === "battle") {
      payload.mode = "battle";
      payload.budget_inr = Number(budget) || 500;
    }

    try {
      setResult(await generateCart(payload));
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function refine(refinementText) {
    if (!result || result.response_type === "battle") return;
    setLoading(true);
    setError(null);
    const payload = { user_text: refinementText, previous_cart: result };
    if (user.id) payload.user_id = user.id;
    try {
      setResult(await generateCart(payload));
    } catch (err) {
      setError(err.message || "Refinement failed");
    } finally {
      setLoading(false);
    }
  }

  async function placeOrder(cart) {
    const eta = Math.max(...(cart.items || []).map((i) => i.eta_min || 12), 12);
    setOrdered({ cart, eta });

    // Record the order so Turant learns — only when signed in.
    if (user.id && cart.items?.length) {
      try {
        await recordOrder({
          userId: user.id,
          name: user.name,
          items: cart.items.map((i) => ({ product_id: i.product_id, name: i.name })),
        });
        await refreshProfile(user.id);
      } catch (err) {
        console.error("record order failed", err);
      }
    }
  }

  function reset() {
    setResult(null);
    setOrdered(null);
    setUserText("");
    setError(null);
    setFeedbackNote(null);
  }

  function withRecalculatedTotal(cart, items) {
    return {
      ...cart,
      items,
      total_inr: items.reduce((s, i) => s + (i.price_inr || 0), 0),
    };
  }

  // Smart Substitution — accept the proposed swap for an out-of-stock item.
  function applySubstitute(targetId, substituteItem) {
    if (!result?.items) return;
    const items = result.items.map((it) =>
      it.product_id === targetId ? substituteItem : it
    );
    setResult(withRecalculatedTotal(result, items));
  }

  // Smart Substitution — user declined the swap; drop the OOS item.
  function dropItem(targetId) {
    if (!result?.items) return;
    const items = result.items.filter((it) => it.product_id !== targetId);
    setResult(withRecalculatedTotal(result, items));
  }

  // Confidence Feedback Loop — remove an item and store it as a negative signal.
  async function removeItem(item) {
    if (!result?.items) return;
    const items = result.items.filter((it) => it.product_id !== item.product_id);
    setResult(withRecalculatedTotal(result, items));

    const context = result.cart_title || result.situation_understood || null;
    if (user.id) {
      setFeedbackNote(
        `📝 Noted — Turant won't suggest ${item.name}${
          context ? ` for "${context}"` : ""
        } next time.`
      );
      try {
        await recordRemoval({
          userId: user.id,
          items: [{ product_id: item.product_id, name: item.name }],
          context,
        });
        await refreshProfile(user.id);
      } catch (err) {
        console.error("record removal failed", err);
      }
    } else {
      setFeedbackNote(
        `Removed ${item.name}. Sign in so Turant remembers this preference next time.`
      );
    }
  }

  const showHome = !result && !loading && !ordered;

  return (
    <div className="app">
      <Header user={user} cartCount={result?.items?.length || 0} />

      <main className="container">
        {showHome && (
          <section className="hero">
            <Identity user={user} onSignIn={signIn} onSignOut={signOut} />
            <LearnedStrip profile={profile} />

            <NeighborhoodPulse
              city={profile?.city}
              onTrigger={(prompt) => submit(prompt, "single")}
            />

            <h1 className="hero-title">
              Need something urgently? <span className="accent">Just say it.</span>
            </h1>
            <p className="hero-sub">
              No searching. No 47 results. One confident cart with reasons — in
              seconds. {user.id ? "The more you order, the smarter it gets." : ""}
            </p>

            <ModeToggle
              mode={mode}
              onModeChange={setMode}
              budget={budget}
              onBudgetChange={setBudget}
            />

            <HeroInput
              value={userText}
              onChange={setUserText}
              onSubmit={() => submit()}
              placeholder={
                mode === "battle"
                  ? "What's the occasion? (e.g. movie night for 4)"
                  : "Type in any language. e.g. light chali gayi…"
              }
            />

            <SampleChips prompts={SAMPLE_PROMPTS} onPick={(t) => submit(t)} />
          </section>
        )}

        {loading && <Loading />}

        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        {!loading && result && !ordered && (
          <section className="result-section">
            <button className="back-btn" onClick={reset}>← Start over</button>

            {result._source && result._source !== "live" && (
              <div className="fallback-banner">
                {result._source === "mock-fallback"
                  ? `Live API unreachable — showing local fallback. (${result._error || ""})`
                  : "Demo mode: using local mock data (no API URL set)."}
              </div>
            )}

            {result.response_type === "clarifying_question" && (
              <ClarifyingQuestion
                question={result.clarifying_question}
                onAnswer={(t) => submit(t)}
              />
            )}

            {result.response_type === "best_guess" && (
              <>
                <SmartSubstitution
                  cart={result}
                  onApply={applySubstitute}
                  onDrop={dropItem}
                />
                <Cart cart={result} variant="best_guess" onOrder={() => placeOrder(result)} onRemove={removeItem} />
                {feedbackNote && <div className="feedback-note">{feedbackNote}</div>}
                <RefineBar onRefine={refine} />
              </>
            )}

            {result.response_type === "confident" && (
              <>
                <SmartSubstitution
                  cart={result}
                  onApply={applySubstitute}
                  onDrop={dropItem}
                />
                <Cart cart={result} variant="confident" onOrder={() => placeOrder(result)} onRemove={removeItem} />
                {feedbackNote && <div className="feedback-note">{feedbackNote}</div>}
                <RefineBar onRefine={refine} />
              </>
            )}

            {result.response_type === "battle" && (
              <BattleCarts result={result} onOrder={placeOrder} />
            )}
          </section>
        )}

        {ordered && (
          <OrderConfirmation
            cart={ordered.cart}
            eta={ordered.eta}
            learned={user.id ? profile : null}
            onDone={reset}
          />
        )}
      </main>

      <footer className="footer">
        <span>Turant — Confident Mode for Amazon Now · HackOn 6.0</span>
      </footer>
    </div>
  );
}
