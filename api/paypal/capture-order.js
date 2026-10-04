export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { orderID } = req.body || {};

    if (!orderID) {
      return res.status(400).json({ error: "Falta el ID del pedido" });
    }

    const clientId = process.env.PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !secret) {
      return res.status(500).json({
        error: "Faltan las credenciales de PayPal en Vercel"
      });
    }

    const base = "https://api-m.paypal.com";
    const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");

    const tokenResp = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    });

    const token = await tokenResp.json();

    if (!tokenResp.ok) {
      return res.status(502).json({
        error: "No se pudo autenticar con PayPal"
      });
    }

    const captureResp = await fetch(
      `${base}/v2/checkout/orders/${encodeURIComponent(orderID)}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          "Content-Type": "application/json"
        }
      }
    );

    const result = await captureResp.json();

    return res.status(captureResp.status).json(result);

  } catch (e) {
    console.error(e);

    return res.status(500).json({
      error: "Error interno al capturar el pago"
    });
  }
}
