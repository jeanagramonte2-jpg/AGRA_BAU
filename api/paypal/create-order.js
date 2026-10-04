
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { cart, promoCode } = req.body || {};
    if (!Array.isArray(cart) || !cart.length) {
      return res.status(400).json({ error: "Carrito vacío" });
    }

    const PRODUCTS = {
      1:{name:"Camisa Executive",price:1995},
      2:{name:"Camisa Essential",price:1795},
      3:{name:"Polo Signature",price:1495},
      4:{name:"Polo Elite",price:1595},
      5:{name:"Chaqueta Motion",price:2495},
      6:{name:"Jogger Motion",price:2195},
      7:{name:"Jogger Signature",price:1995},
      8:{name:"Hoodie Motion",price:2495},
      9:{name:"Polo Classic",price:1395},
      10:{name:"Pantalón Executive",price:2295}
    };

    let subtotal = 0;
    for (const item of cart) {
      const p = PRODUCTS[Number(item.id)];
      const qty = Math.max(1, Math.min(20, Number(item.qty) || 0));
      if (!p || !qty) return res.status(400).json({ error: "Producto inválido" });
      subtotal += p.price * qty;
    }

    const discount = String(promoCode || "").toUpperCase() === "PRIMERA40"
      ? Math.round(subtotal * 0.40) : 0;
    const totalDop = subtotal - discount;

    const dopPerUsd = Number(process.env.DOP_PER_USD || 60);
    const totalUsd = (totalDop / dopPerUsd).toFixed(2);
    if (Number(totalUsd) <= 0) return res.status(400).json({ error: "Monto inválido" });

    const clientId = process.env.PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_CLIENT_SECRET;
    if (!clientId || !secret) return res.status(500).json({ error: "Faltan credenciales de PayPal en Vercel" });

    const base = "https://api-m.paypal.com";
    const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");

    const tokenResp = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    });

    const token = await tokenResp.json();
    if (!tokenResp.ok) return res.status(502).json({ error: "No se pudo autenticar con PayPal" });

    const orderResp = await fetch(`${base}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token.access_token}`
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          description: "Compra AGRA_BAU",
          amount: { currency_code: "USD", value: totalUsd }
        }]
      })
    });

    const order = await orderResp.json();
    return res.status(orderResp.status).json(order);

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error interno al crear el pedido" });
  }
}
