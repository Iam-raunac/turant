# Turant — Confident Mode for Amazon Now
**Product Requirements Document**
HackOn with Amazon 6.0 · Problem Statement 2: Reimagining Urgent Shopping
Team repo: github.com/Iam-raunac/turant

---

## Before the specs: the one thing we kept coming back to

Quick-commerce in India won the delivery race a while ago. Ten minutes, sometimes eight. That fight is over.

The part nobody fixed is what happens *before* the delivery clock even starts — the four to six minutes a customer spends turning "I have a situation" into "here are the exact products I should buy." That translation step is the whole problem. And it's hardest at the exact moment the customer is least able to do it: a power cut, a fever at 2am, guests at the door.

So we didn't build faster delivery. We built faster *decisions*. That distinction shaped every call we made over the 48 hours.

---

## 1. The pitch in one line

Amazon Now today makes you search. Turant lets you say what's happening — in whatever language is already in your head — and one explained cart shows up in under ten seconds.

That's the product. Everything below is us defending that sentence.

---

## 2. Who this is for

We wrote the whole thing for two people. They're composites, but the situations are pulled from real app-store complaints and from watching our own families fumble through these apps.

**Mrs. Lakshmi Iyer, 58, Chennai.** Retired schoolteacher, lives with her husband near Mylapore. Comfortable on WhatsApp, uses Amazon for "big" purchases like a pressure cooker, tried quick-commerce twice and gave up both times.

It's 9:15pm on a Tuesday in July. Heavy rain. The transformer near her colony has blown and the watchman says four hours minimum. Her husband's digital BP monitor is dead and needs charging. The Diwali candles are finished. Her own phone is at 38%.

She opens the app and stares at the search box. What does she type — "power cut things"? "emergency stuff"? She tries "candles" and gets 30 brands from ₹40 to ₹450. She tries "power bank" and gets 80 options. By the sixth minute the lights are still off and her cart is still empty. Her husband asks if she's done.

This exact moment is what Turant is built to delete. She types "light chali gayi, monsoon hai bahar" and four seconds later sees a Power Cut Kit — candles, a rechargeable LED bulb, a power bank, a couple of snacks for the night — each line telling her *why* it's there. Total at the bottom. One tap to order.

**Aarav Kapoor, 21, Delhi.** Engineering student, hostel, final exam tomorrow morning. It's 2am and his throat is starting to go — the scratchy feeling that means he'll be miserable by 8am if he doesn't act. He searches "cold remedies" and gets Vicks, Strepsils, Honitus, lemon, ginger, ten immune boosters. Eighteen minutes later his cart is empty and his exam stress is worse.

What he needed was one tap that returns a small, sane cold-and-cough cart with a note to see a doctor if it doesn't clear in 48 hours. That's it.

If a feature didn't make one of these two moments easier, we cut it. We cut a few. More on that later.

---

## 3. What the customer actually sees

The customer types or taps a situation. No category browsing, no filters, no comparison.

Turant reads the message and makes one decision before it responds: *am I confident enough to act, or do I need to ask?* There is no third option. Either it returns a full cart, or it asks exactly one short question. We'll explain why the design is deliberately binary in the next section.

A confident response looks like this:

```
You typed:  "light chali gayi, monsoon hai bahar"

Power Cut Kit                                    [CONFIDENT]
─────────────────────────────────────────────────────────
Eveready Candles (pack of 10)         ₹45    90%
  Tonight's light, no electricity needed.

⚠ Eveready Candles abhi out of stock hai —
  Philips LED Night Light rakh diya, similar. Theek hai?
  [ Haan, rakho ]   [ Nahi, hata do ]

Wipro Emergency Rechargeable LED Bulb ₹399   88%
  Lasts 6 hrs on a single charge.

Mi Power Bank 10000mAh                ₹899   85%
  Keeps your phone (and BP monitor) powered.

TOTAL  ₹1,343  ·  delivery in ~14 min
[ Order now ]    [ Share on WhatsApp ]
```

Every line earns its place with a one-line reason. The customer reads the cart, not a search results page.

---

## 4. The features, and why each one exists

We ship eight. They aren't eight separate ideas bolted together — they're one decision engine with the supporting behaviors a real customer needs around it. Here's each, with the reasoning.

**4.1 Adaptive Situation Engine (binary).**
The core. The model classifies the message into one of two modes. If it can honestly pick at least three relevant catalog items above a confidence of 0.6, it builds the cart. If it can't, it asks one clarifying question instead of guessing. The 0.6 floor is hard-coded, not left to the model's mood.

We originally had a third "best guess" middle mode and removed it on purpose. A half-confident cart is worse than no cart — it makes the customer do the very verification work we're trying to save them. The honest stances are "I know what you need" or "let me ask one thing." Nothing in between.

**4.2 Explainable + personalized reasoning.**
Every item carries a plain-language reason. When the customer has order history, their preferences surface — "Coca-Cola, your usual choice" or "you order this often" — with a small badge.

The important design rule here: *the model picks products, but Python owns the personalization.* A deterministic function checks each item name against the customer's favorite brands and actual order history, sets the flags, and rewrites the personalization phrase itself. This killed a real bug where the model would slap "your usual choice" onto the wrong product, or repeat the phrase twice in one line. The model is allowed to be creative; the code is what's allowed to be trusted.

One rule we enforce strictly: history personalizes *which item gets picked*, never *what the situation is*. If a customer who often buys candles types "shaam ho gayi, kuch khane ka man," the title is "Evening Snacks," not "Power Cut Kit." The situation always comes from the current message.

**4.3 Conversational refinement.**
After the cart appears, the customer can talk to it — "Maggi hata do, kuch healthy do." The previous cart goes back into the request as context and the model swaps items instead of starting over. The title updates too ("Power Cut Kit" becomes "Power Cut Kit, Healthy Edition").

**4.4 Smart substitution, driven by real stock.**
This is not simulated. The catalog has a real `in_stock` field. When a cart contains something genuinely out of stock, Turant offers the closest *in-stock* alternative inline and asks the customer to confirm. The matching is deliberately strict: there's a hard food/non-food gate (a Rakhi set can never replace a sweet just because both are tagged "festival"), and the alternative has to share a *specific* tag — light for light, throat for throat — not a generic one like "beverage." If there's no genuinely close match, no swap is offered. Better to show nothing than to substitute nonsense.

**4.5 Confidence feedback loop.**
Every item has an × button. Removing one records it as a negative signal, with the situation context, in DynamoDB. Next time that customer builds a cart, the removed item is *deterministically* stripped in Python — the prompt asks the model to avoid it, but the code guarantees it. It only comes back if the customer names it explicitly by a distinctive brand word ("Haldiram"), never by a generic category word ("namkeen"). Remove it once and it stays gone.

**4.6 Time-of-day routine anticipation.**
The home screen reads the actual device clock and anticipates the household rhythm — morning pooja and breakfast, evening chai and snacks, late-night next-day essentials. This is real proactivity off the real clock, not fake telemetry. One tap sends the suggestion through the same engine, so the resulting cart is genuine, not canned.

**4.7 Reorder and replenishment prediction.**
Every order is timestamped per item. Each consumable has a typical cycle — milk every 4 days, coffee every 12, candles every 20. When 80% of the cycle has elapsed, Turant flags it: "You bought Eveready Candles about 22 days ago, likely run out by now. Reorder?" Durable goods (power banks, bulbs, batteries) are excluded by design so the customer is never nagged to rebuy a one-off. Tapping reorder builds the cart straight from the prediction, no model guess involved.

**4.8 WhatsApp share.**
One tap after the cart is built opens WhatsApp with a clean summary — items, prices, total, ETA. In an Indian household the person opening the app often isn't the person who approves the spend. This lets the cart go to whoever decides before anything is ordered.

---

## 5. Code > Model: how we keep an AI from embarrassing us

This is the part we're proudest of, and it's a direct answer to a question Amazon asked in the briefing: *how would you prevent incorrect automations from creating a poor customer experience?*

Our answer is that the model is never the last word. After it returns its JSON, a chain of deterministic Python guards runs before anything reaches the customer:

- **Catalog enrichment** overwrites every item's name, price, and ETA from the real catalog by product ID, and drops anything the model invented. Prices and products cannot be hallucinated — the catalog is the single source of truth.
- **Medical gating** lets OTC items (Crocin, Vicks, ORS) appear *only* when the current message mentions a health symptom, even if they're a favorite. "light chali gayi" will never surface Crocin; "bukhar hai, throat kharab" will.
- **Disliked-item stripping** removes anything the customer previously rejected.
- **Personalization correction** fixes or removes any wrong or duplicated personalization wording the model wrote.
- **Safety-note enforcement** allows only the exact OTC disclaimer string or nothing — the model can't invent its own warnings.
- **Delivery-note enforcement** fires a delivery warning only when an item's real ETA exceeds 20 minutes.

All six are tested. Our internal feature test run is 33 of 33 passing, including specific cases like "model tried to add a non-standard safety note → stripped" and "Gangajal has a 22-minute ETA → delivery note correctly set."

The point we'll make to a judge: an LLM in a shopping flow that can hallucinate a price or push a medicine is a liability. We treat the model as a creative drafting layer wrapped in code that is allowed to say no.

---

## 6. Architecture

```
React + Vite  ──HTTPS──▶  API Gateway  ──invoke──▶  Lambda (Python 3.12)
   frontend                REST proxy                parse_and_generate
                                                          │
                          ┌───────────────────────────────┼─────────────┐
                          ▼                               ▼             ▼
                    DynamoDB (on-demand)          Amazon Bedrock
                    Catalog (63 products)         Nova Lite
                    UserPreferences               (Converse API)
                    SituationPlaybooks
                    CartSessions
```

One Lambda handles everything; an `action` field in the request routes the behavior (`generate`, `substitute`, `record_order`, `record_removal`, `get_profile`). The model's output always passes through the guard chain in Section 5 before it returns.

**Why serverless, and why no EC2.** Quick-commerce traffic is bursty in a very specific way — a power cut hits one neighborhood and 500 carts get generated in two minutes, then nothing for an hour. Lambda absorbs both the spike and the idle automatically and costs nothing when no one's shopping. DynamoDB on-demand scales the same way with zero provisioning. An always-on EC2 fleet would mean paying for capacity that sits unused most of the day and still risk being underprovisioned during a localized surge.

**Stack:** React 18 + Vite on the front; API Gateway REST; Lambda on Python 3.12; Amazon Nova Lite via Bedrock (2–3s latency, cheapest frontier model that does the job); DynamoDB on-demand. Built in Kiro, per the hackathon mandate.

**Demo safety net.** The frontend ships with a complete mock backend that mirrors the Lambda. If the live API is ever unreachable during judging, the mock takes over silently and every response is tagged as live, mock, or fallback. The demo cannot hard-fail in front of a judge.

---

## 7. Scale and cost

The architecture that runs the demo is the architecture that scales — there's no "we'd rebuild it for production" asterisk.

At a million users, the cost works out to roughly ₹0.45 per generated cart, dominated by the Bedrock Nova Lite call. Lambda and DynamoDB on-demand stay inside or near Free Tier at hackathon volume and scale linearly with usage rather than with provisioned capacity. The whole cost story fits on one slide, which is the point — it means scale was a design input, not an afterthought.

---

## 8. Non-functional requirements

The briefing explicitly raised privacy and bad-automation prevention, so we're putting our answers on record rather than waiting to be asked.

**Privacy.** The only personal data we store is per-user order history, favorite brands, and removal signals — all keyed to a user ID, all used solely to personalize that same user's carts. Personalization is opt-in: anonymous mode works fully and simply skips the personalization layer. Nothing is shared across users, and no third-party product images or trackers are pulled into the UI (each item shows a clean category icon, partly for this reason and partly because stock-photo services returned broken images).

**Preventing bad automations.** Covered in depth in Section 5 — the six deterministic guards exist precisely so an automated cart can't surface a hallucinated price, a wrong medicine, or an invented warning.

**Reliability.** The mock-fallback design (Section 6) means a backend outage degrades to a working offline demo rather than an error screen.

---

## 9. What we deliberately did not build

We think the cuts say as much about the product as the features.

- **A "best guess" middle mode** — removed. A half-confident cart undermines the entire thesis.
- **Cart Battle (budget vs premium side-by-side)** — removed from the UI. It added a comparison decision, which is exactly the friction we're trying to eliminate. The backend code is inert but left in place.
- **Neighborhood Pulse** — removed entirely. It relied on fake telemetry, and we'd rather ship genuine proactivity (the clock and real reorder data) than fake a signal.
- **Photo and voice input** — roadmap, not demo. The architecture supports Bedrock vision and Transcribe/Polly, but a shaky live demo is worse than a clean typed one.
- **Prescription medicines** — OTC only. Prescription handling needs verified upload, a registered pharmacist, and pharmacy licensing — that's Amazon Pharmacy's existing infrastructure. Building it inside a quick-commerce assistant would either duplicate or compromise it. We scoped Turant to OTC for v1 and put Rx integration in the v3+ roadmap, routed *through* Amazon Pharmacy, not around it. We'd rather the judging conversation be about AI quality than about pharmacy law, which is why Power Cut, not health, is our headline demo.

---

## 10. Where this goes next

If Amazon picked this up, here's the order we'd build in.

**First three months.** Expand from a handful of situations to 50+ playbooks (festival, regional, seasonal). Add personalization based on which suggestions a customer actually taps. Roll out Tamil, Telugu, Bengali, and Marathi.

**Three to six months.** Festival auto-mode (the system reads the calendar and offers a Diwali kit three days out). Family group carts (the household decision-maker approves from their own phone before checkout). Weather-triggered prompts ("heavy rain forecast tonight — want a monsoon kit ready?"). State electricity-board data feeding proactive power-cut notifications.

**Six to twelve months.** Alexa ("Alexa, light chali gayi" and the cart is on your phone before you find the candles). Pantry photo (a picture of your shelf becomes a weekly cart). Hyperlocal — an outage detected in an area, Confident Mode offered to that whole neighborhood.

**Beyond a year.** Cross-category situations like "wedding in the family" — groceries, gifts, and travel essentials coordinated across Amazon. A B2B version for kirana shops to use Confident Mode for restocking. An open situations API so Fresh, Business, and (with proper Rx infrastructure) Pharmacy can plug in.

---

## 11. Why Amazon should care

Beyond the customer win, the business case is straightforward. A situation cart bundles intelligently, so a power-cut order at ₹1,300+ is several times a typical single-item search order — higher basket value without any upsell pressure. The vernacular, situation-first design is a genuine moat in Tier 2 and Tier 3 expansion, where the search-box model serves non-English customers worst. And it leans directly into the Amazon Now engagement flywheel: the easier the decision, the more often people come back.

*(Note for the team: if we cite any specific engagement statistic or executive quote in the deck, verify the exact figure and source first. A misquoted number in front of Amazon judges costs more than leaving it out.)*

---

## 12. How we map to the four judging criteria

**Customer obsession.** Mrs. Iyer and Aarav are built from real reviews and observed behavior, and every feature traces back to one of their moments. The cuts in Section 9 are the customer thesis enforced under pressure.

**Quality of implementation.** A working end-to-end prototype on real Bedrock, not stubs, with a 33/33 internal test pass and a mock fallback so the demo can't fail live. The deterministic guard chain is the standout.

**Scalability and architecture.** Serverless by design, the demo stack is the production stack, ₹0.45 per cart at a million users, with a clear reason for every infrastructure choice.

**Future vision.** Four phases of concrete features, each tied back to a customer outcome rather than a technology for its own sake.

---

## 13. The compass

Every time there was a decision to make — a feature to keep or cut, a tradeoff, an animation — we asked one question:

**Does this make Mrs. Iyer's 9pm power-cut moment easier?**

If yes, build it. If no, drop it, however clever it looked. That's what "start with the customer" meant for us in practice, and it's why the product is smaller and sharper than it could have been.
