// Sends each verified website order to the warehouse Pick List (Google Sheet).
// Runs on Netlify's servers for every verified submission, so there is no outgoing webhook to get disabled,
// and the sheet's private key stays in a Netlify setting instead of the public site code.
//
// Setup: Netlify > Project configuration > Environment variables > add PICKLIST_URL
// with the sheet's full web app link, ending in /exec?key=...
export default {
  async formSubmitted(event) {
    const url = process.env.PICKLIST_URL;
    let data = (event && event.data) || {};
    if (!url) { console.log('PICKLIST_URL is not set; add it under Environment variables'); return; }
    if (!data.picklist && !data.order) { console.log('Not an order; skipped'); return; }

    // Put Pickup / Delivery (and the delivery address) at the front of the Note, so it shows on the
    // Pick List with any version of the sheet script.
    if (data.fulfill) {
      const tag = data.fulfill === 'Delivery' ? `DELIVERY to ${data.address || '(no address given)'}` : 'PICKUP';
      data = { ...data, note: data.note ? `${tag} | ${data.note}` : tag };
    }

    // Same shape as Netlify's webhook payload, which the sheet script already understands.
    // The order number doubles as the duplicate check, so a retry never adds the same order twice.
    const body = JSON.stringify({
      form_name: 'order', id: data.oid || '', number: data.oid || '',
      created_at: new Date().toISOString(), data,
    });

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // Google answers with a redirect; following it returns the script's reply ("ok").
        const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, redirect: 'follow' });
        const reply = (await r.text()).trim();
        if (reply === 'ok') { console.log(`Pick List updated: order ${data.oid || '(no number)'}`); return; }
        console.log(`Attempt ${attempt}: status ${r.status}: ${reply.slice(0, 150)}`);
        if (reply === 'forbidden') { console.log('Wrong key in PICKLIST_URL'); return; }
      } catch (err) {
        console.log(`Attempt ${attempt}: ${err}`);
      }
      await new Promise(res => setTimeout(res, 1500 * attempt));
    }
    console.log(`Gave up on order ${data.oid || '(no number)'}; it is still in Netlify Forms and your email`);
  },
};
