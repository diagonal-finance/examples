import React, { useEffect, useState } from "react";

const createCheckout = async (priceId, fiat) => {
  const { url } = await fetch(fiat ? "/stripe/checkout" : "/diagonal/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      priceId,
    }),
  }).then((r) => r.json());

  window.location.replace(url);
};

const Prices = () => {
  const [prices, setPrices] = useState([]);
  const [selectedPrice, setSelectedPrice] = useState();

  const fetchPrices = async () => {
    const { prices } = await fetch("/plans").then((r) => r.json());
    setPrices(prices);
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  return (
    <div>
      <h1>Select a plan</h1>

      <div className="price-list">
        {prices.map((price) => {
          return (
            <div key={price.id} style={{ borderWidth: price.id === selectedPrice ? 3 : 0.5 }}>
              <h3>{price.product.name}</h3>

              <p>
                ${price.unit_amount / 100} / {price.recurring.interval}
              </p>
              <button onClick={() => setSelectedPrice(price.id)}>Select</button>
            </div>
          );
        })}
      </div>
      <div className="selection">
        <button
          disabled={!selectedPrice}
          style={{ margin: 10, backgroundColor: "#635bff" }}
          onClick={() => createCheckout(selectedPrice, true)}
        >
          Pay with Fiat
        </button>
        <button disabled={!selectedPrice} style={{ margin: 10 }} onClick={() => createCheckout(selectedPrice, false)}>
          Pay with Crypto
        </button>
      </div>
    </div>
  );
};

export default Prices;
