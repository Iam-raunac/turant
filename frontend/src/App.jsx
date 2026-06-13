import { useMemo, useState } from "react";
import { generateCart } from "./api.js";
import Header from "./components/Header.jsx";
import HeroInput from "./components/HeroInput.jsx";
import SampleChips from "./components/SampleChips.jsx";
import ProfileSwitcher from "./components/ProfileSwitcher.jsx";
import ModeToggle from "./components/ModeToggle.jsx";
import Loading from "./components/Loading.jsx";
import Cart from "./components/Cart.jsx";
import BattleCarts from "./components/BattleCarts.jsx";
import ClarifyingQuestion from "./components/ClarifyingQuestion.jsx";
import RefineBar from "./components/RefineBar.jsx";
import OrderConfirmation from "./components/OrderConfirmation.jsx";
import ErrorBanner from "./components/ErrorBanner.jsx";

const PROFILES = [
  { id: "", name: "Anonymous", subtitle: "no personalization" },
  { id: "demo_user_1", name: "Mrs. Iyer", subtitle: "Chennai · senior · BP context" },
  { id: "demo_user_2", name: "Aarav", subtitle: "Delhi · hostel · exam stress" },
];

const SAMPLE_PROMPTS = [
  "light chali gayi, monsoon hai bahar, ghar pe kuch nahi hai",
  "bukhar lag raha hai, throat bhi kharab hai",
  "kal pooja hai, last-minute saamagri chahiye",
  "movie night for 4 people",
  "kuch chahiye",
];

export default function App() {
  const [userText, setUserText] = useState("");
  const [userId, setUserId] = useState("");
  const [mode, setMode] = useState("single"); // single | battle
  const [budget, setBudget] = useState(500);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [ordered, setOrdered] = useState(null);

  const profile = useMemo(
    () => PROFILES.find((p) => p.id === userId) || PROFILES[0],
    [userId]
  );

  async function submit(textOverride, modeOverride) {
    const text = (textOverride ?? userText).trim();
    if (!text) return;

    setUserText(text);
    setLoading(true);
    setError(null);
    setResult(null);
    setOrdered(null);

    const payload = { user_text: text };
    if (userId) payload.user_id = userId;
    const useMode = modeOverride ?? mode;
    if (useMode === "battle") {
      payload.mode = "battle";
      payload.budget_inr = Number(budget) || 500;
    }

    try {
      const data = await generateCart(payload);
      setResult(data);
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

    const payload = {
      user_text: refinementText,
      previous_cart: result,
    };
    if (userId) payload.user_id = userId;

    try {
      const data = await generateCart(payload);
      setResult(data);
    } catch (err) {
      setError(err.message || "Refinement failed");
    } finally {
      setLoading(false);
    }
  }

  function placeOrder(cart) {
    const eta = Math.max(...(cart.items || []).map((i) => i.eta_min || 12), 12);
    setOrdered({ cart, eta });
  }

  function reset() {
    setResult(null);
    setOrdered(null);
    setUserText("");
    setError(null);
  }

  return (
    <div className="app">
      <Header profileName={profile.name} />

      <main className="container">
        {!result && !loading && !ordered && (
          <section className="hero">
            <h1 className="hero-title">
              Need something urgently?<br />
              <span className="accent">Just say it.</span>
            </h1>
            <p className="hero-sub">
              No searching. No 47 results. One confident cart with reasons —
              under 10 seconds.
            </p>

            <ProfileSwitcher
              profiles={PROFILES}
              currentId={userId}
              onChange={setUserId}
            />

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
            <button className="back-btn" onClick={reset}>
              ← Start over
            </button>

            {result._fallback && (
              <div className="fallback-banner">
                Showing a local fallback response (API unreachable).
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
                <Cart cart={result} variant="best_guess" onOrder={() => placeOrder(result)} />
                <RefineBar onRefine={refine} />
              </>
            )}

            {result.response_type === "confident" && (
              <>
                <Cart cart={result} variant="confident" onOrder={() => placeOrder(result)} />
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
