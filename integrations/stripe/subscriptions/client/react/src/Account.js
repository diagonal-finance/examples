import React, { useState, useEffect } from "react";
import "./App.css";

async function addWallet() {
  const { url } = await fetch("/diagonal/add-wallet", {
    method: "post",
    headers: {
      "Content-Type": "application/json",
    },
  }).then((r) => r.json());

  window.location.replace(url);
}

async function addCard() {
  const { url } = await fetch("/stripe/add-card", {
    method: "post",
    headers: {
      "Content-Type": "application/json",
    },
  }).then((r) => r.json());

  window.location.replace(url);
}

const Account = () => {
  const [subscription, setSubscription] = useState();
  const [paymentMethods, setPaymentMethods] = useState([]);

  const fetchAccount = async () => {
    const { subscription, paymentMethods } = await fetch("/account").then((r) => r.json());

    setSubscription(subscription);
    setPaymentMethods(paymentMethods);
  };

  const setDefaultPaymentMethod = async (paymentMethodId, isWallet) => {
    await fetch("/set-default-payment-method", {
      method: "post",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        isWallet,
        paymentMethodId,
      }),
    });
    await fetchAccount();
  };

  const handleCancel = async () => {
    await fetch("/subscription/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    await fetchAccount();
  };

  useEffect(() => {
    fetchAccount();
  }, []);

  if (!subscription || !paymentMethods) {
    return (
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        Loading...
      </div>
    );
  }

  const price = subscription.items.data[0]?.price;

  return (
    <div>
      <div>
        <h1>Account</h1>
        <a href="/">Restart demo</a>
      </div>

      <hr style={{ marginBottom: 30, marginTop: 30 }} />

      <div>
        <h2>Subscription</h2>
        <section style={{ paddingLeft: 20, paddingRight: 20 }}>
          <h4>
            <a
              href={`https://dashboard.stripe.com/test/subscriptions/${subscription.id}`}
              target="_blank"
              rel="noreferrer"
            >
              {subscription.id}
            </a>
          </h4>

          <p>Status: {subscription.status}</p>

          <p>
            ${price.unit_amount / 100} / {price.recurring.interval}
          </p>

          <p>Current period end: {new Date(subscription.current_period_end * 1000).toString()}</p>

          <button
            disabled={subscription.status === "canceled"}
            to={{ pathname: "/cancel", state: { subscription: subscription.id } }}
            onClick={() => handleCancel()}
          >
            Cancel
          </button>
        </section>
      </div>

      <hr style={{ marginBottom: 30, marginTop: 30 }} />

      <div>
        <div style={{ display: "flex" }}>
          <h2>Payment Methods</h2>
          <div style={{ flex: 1, justifyContent: "flex-end", display: "flex" }}>
            <button style={{ height: "50%", marginRight: 10 }} onClick={() => addWallet()}>
              Add wallet
            </button>
            <button style={{ height: "50%" }} onClick={() => addCard()}>
              Add card
            </button>
          </div>
        </div>
        <div id="payment-methods" style={{ paddingLeft: 20, paddingRight: 20 }}>
          {paymentMethods.wallets?.map((wallet) => {
            const selected = paymentMethods.default === wallet.id;
            return (
              <section key={wallet.id} style={{ borderWidth: 1, borderColor: "black" }}>
                <h4 style={{ fontWeight: "900" }}>Wallet {selected && "- default"}</h4>
                <div style={{ paddingLeft: 20 }}>
                  <p>Address: {wallet.wallet.address}</p>
                  <p>Token: {wallet.wallet.token}</p>
                  <p>Chain: {wallet.wallet.chain}</p>
                </div>
                {!selected && (
                  <button style={{ margin: 10 }} onClick={() => setDefaultPaymentMethod(wallet.id, true)}>
                    Set as default
                  </button>
                )}
                <hr style={{ marginBottom: 30, marginTop: 30, marginLeft: 30, marginRight: 30 }} />
              </section>
            );
          })}
          {paymentMethods.cards?.map((card) => {
            console.log(card, paymentMethods.default);
            const selected = paymentMethods.default === card.id;
            return (
              <div key={card.id}>
                <h4 style={{ fontWeight: "bolder" }}>Card {selected && "- default"}</h4>
                <div style={{ paddingLeft: 20 }}>
                  <p>Last digits: {card.card.last4}</p>
                  <p>
                    Expiry: {card.card.exp_month}/{card.card.exp_year}
                  </p>
                  <p>Country: {card.card.country}</p>
                </div>
                {!selected && (
                  <button style={{ margin: 10 }} onClick={() => setDefaultPaymentMethod(card.id, false)}>
                    Set as default
                  </button>
                )}
                <hr style={{ marginBottom: 30, marginTop: 30, marginLeft: 30, marginRight: 30 }} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Account;
