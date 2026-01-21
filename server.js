require("dotenv").config();
const express = require("express");
const axios = require("axios");
const crypto = require("crypto");

const app = express();

/* IMPORTANT : body RAW pour IPN */
app.use("/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(express.static("public"));

/* Paiement */
app.post("/pay", async (req, res) => {
  try {
    const { amount } = req.body;

    const response = await axios.post(
      "https://api.nowpayments.io/v1/payment",
      {
        price_amount: amount,
        price_currency: "usd",
        pay_currency: "usdttrc20",
        order_description: "Paiement réel"
      },
      {
        headers: {
          "x-api-key": process.env.NOWPAYMENTS_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Erreur paiement" });
  }
});

/* 🔐 WEBHOOK IPN SÉCURISÉ */
app.post("/webhook", (req, res) => {
  const signature = req.headers["x-nowpayments-sig"];
  const body = req.body;

  const expectedSignature = crypto
    .createHmac("sha512", process.env.NOWPAYMENTS_IPN_SECRET)
    .update(body)
    .digest("hex");

  if (signature !== expectedSignature) {
    console.log("❌ IPN signature invalide");
    return res.status(400).send("Invalid signature");
  }

  const payment = JSON.parse(body.toString());

  if (payment.payment_status === "finished") {
    console.log("✅ Paiement confirmé :", payment.payment_id);
    // 👉 ici : créditer l'utilisateur / DB
  }

  res.sendStatus(200);
});

app.listen(process.env.PORT, () =>
  console.log("🚀 Serveur sécurisé lancé")
);
