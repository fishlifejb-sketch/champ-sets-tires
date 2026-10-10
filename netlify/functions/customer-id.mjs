// Checks a retail customer ID for the 10% discount and returns that customer's saved details so
// checkout can fill them in. The customer list lives in the Pick List sheet's "Customers" tab
// (and/or the CUSTOMER_IDS setting), never in the public site code. See netlify/lib/customers.mjs.
import { loadCustomers } from '../lib/customers.mjs';

export default async (req) => {
  const id = (new URL(req.url).searchParams.get('id') || '').trim().toUpperCase();
  await new Promise(r => setTimeout(r, 400)); // slows down anyone trying to guess IDs
  const c = id ? (await loadCustomers()).get(id) : null;
  const body = c ? { ok: true, name: c.business, contact: c.contact, phone: c.phone, address: c.address, pct: c.pct, rep: c.rep } : { ok: false };
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
};
