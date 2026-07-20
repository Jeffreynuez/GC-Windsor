/* GC Windsor - newsletter signup -> Brevo contact.
   The "Join the house" form on the site POSTs here; this creates (or updates)
   the contact in Brevo and adds them to the newsletter list. Brevo's automation
   then sends the welcome email.

   Environment variables (set in the Vercel project, never in the repo):
     BREVO_API_KEY   - Brevo > SMTP & API > API Keys
     BREVO_LIST_ID   - Brevo > Contacts > Lists (the numeric id)

   Docs: https://developers.brevo.com/reference/create-contact
*/
'use strict';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  /* honeypot - bots fill hidden fields, humans don't. Pretend success. */
  if (body.company) return res.status(200).json({ ok: true });

  const email = String(body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const listId = parseInt(process.env.BREVO_LIST_ID, 10);
  if (!apiKey || !listId) {
    console.error('Brevo env vars missing');
    return res.status(500).json({ error: 'Signup is not configured yet.' });
  }

  const attributes = {};
  const first = String(body.first_name || '').trim();
  const last = String(body.last_name || '').trim();
  if (first) attributes.FIRSTNAME = first;   /* Brevo attributes are UPPERCASE */
  if (last) attributes.LASTNAME = last;

  try {
    const r = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        accept: 'application/json'
      },
      body: JSON.stringify({
        email: email,
        attributes: attributes,
        listIds: [listId],
        updateEnabled: true      /* re-subscribing is not an error */
      })
    });

    /* 201 created, 204 updated - both are success */
    if (r.status === 201 || r.status === 204) {
      return res.status(200).json({ ok: true });
    }

    const data = await r.json().catch(() => ({}));

    /* already on the list - treat as success, not an error the visitor sees */
    if (data.code === 'duplicate_parameter') {
      return res.status(200).json({ ok: true });
    }

    console.error('brevo error', r.status, data);
    return res.status(502).json({ error: 'Could not complete signup. Please try again.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not reach the mailing list.' });
  }
};
