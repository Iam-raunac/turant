import Cart from "./Cart.jsx";

export default function BattleCarts({ result, onOrder }) {
  const [budget, premium] = result.carts || [];

  return (
    <div className="battle-wrap">
      <div className="battle-header">
        <h2>Two carts, your call.</h2>
        <p>{result.situation_understood}</p>
      </div>
      <div className="battle-grid">
        {budget && (
          <Cart
            cart={budget}
            variant="confident"
            compact
            onOrder={() => onOrder(budget)}
          />
        )}
        {premium && (
          <Cart
            cart={premium}
            variant="confident"
            compact
            onOrder={() => onOrder(premium)}
          />
        )}
      </div>
    </div>
  );
}
