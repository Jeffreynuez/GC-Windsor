/* GC Windsor — Stripe Checkout session.
   Dormant by default: while data/products.json has "salesPaused": true (or a
   product's status is "coming-soon") this endpoint refuses to sell. Nothing can
   be bought by accident.

   To go live:
     1. Create the products + prices in Stripe (one price per size).
     2. Paste the price ids into data/products.json
        (stripePriceIdRegular / stripePriceIdTall) via the CMS.
     3. Set STRIPE_SECRET_KEY in the Vercel project env (never in the repo).
     4. Flip "salesPaused" to false, and each product's status to "live".
     5. Redeploy — Vercel bakes env vars at deploy time.
*/
const products = require('../data/products.json');

const SIZE_KEY = { regular: 'stripePriceIdRegular', tall: 'stripePriceIdTall' };

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { productId, size = 'regular', qty = 1 } = req.body || {};

  const product = products.items.find(p => p.id === productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  /* --- the kill switch --- */
  if (products.salesPaused || product.status !== 'live') {
    return res.status(409).json({ error: 'This set is not on sale yet. Sales are currently paused.' });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return res.status(500).json({ error: 'Checkout is not configured.' });

  const priceId = product[SIZE_KEY[size] || SIZE_KEY.regular];
  if (!priceId) return res.status(409).json({ error: 'This size is not available yet.' });

  const quantity = Math.min(Math.max(parseInt(qty, 10) || 1, 1), 10);
  const origin = `https://${req.headers['x-forwarded-host'] || req.headers.host}`;

  /* Stripe's REST API via fetch — no SDK dependency to keep the repo build-free. */
  const form = new URLSearchParams();
  form.append('mode', 'payment');
  form.append('line_items[0][price]', priceId);
  form.append('line_items[0][quantity]', String(quantity));
  form.append('success_url', `${origin}/?checkout=success`);
  form.append('cancel_url', `${origin}/product/${product.slug}?checkout=cancelled`);
  form.append('shipping_address_collection[allowed_countries][0]', 'US');
  form.append('automatic_tax[enabled]', 'true');
  form.append('phone_number_collection[enabled]', 'true');

  try {
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: form
    });
    const session = await r.json();
    if (!r.ok) {
      console.error('stripe error', session);
      return res.status(502).json({ error: session.error?.message || 'Stripe rejected the request.' });
    }
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not reach Stripe.' });
  }
};
