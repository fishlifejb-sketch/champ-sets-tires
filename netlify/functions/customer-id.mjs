// Checks a retail customer ID for the 10% discount. The list of valid IDs lives in the Netlify
// environment variable CUSTOMER_IDS, never in the public site code.
//
// CUSTOMER_IDS format (store names optional, separate entries with commas):
//   SMITH24=Smith Tire, ABCAUTO7=ABC Auto, JONES99
export default async (req) => {
  const id = (new URL(req.url).searchParams.get('id') || '').trim().toUpperCase();
  const ids = new Map();
  String(process.env.CUSTOMER_IDS || '').split(/[,;\n]+/).forEach(part => {
    const [key, ...name] = part.split('=');
    const k = (key || '').trim().toUpperCase();
    if (k) ids.set(k, name.join('=').trim());
  });
  await new Promise(r => setTimeout(r, 400)); // slows down anyone trying to guess IDs
  const ok = !!id && ids.has(id);
  return new Response(JSON.stringify(ok ? { ok: true, name: ids.get(id) } : { ok: false }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
};
