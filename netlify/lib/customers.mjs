// Retail customers for the private 10% discount. Two sources, both kept out of the public site code:
//   CUSTOMERS_CSV_URL  the "Customers" tab of the Pick List sheet, published to the web as CSV
//                      (columns: Customer ID, Business, Contact name, Phone, Delivery address, Discount %, Sales rep, Active)
//   CUSTOMER_IDS       optional simple list, e.g.  SMITH24=Smith Tire, ABCAUTO7=ABC Auto
let cache = { at: 0, map: null };
const DEFAULT_PCT = 10;
const MAX_PCT = 50; // guards against a typo like 100 giving tires away

// "15", "15%", " 12.5 " -> 15 / 12.5; blank or unreadable -> 10; capped at 50
export function readPct(v) {
  const n = parseFloat(String(v == null ? '' : v).replace('%', '').trim());
  if (!isFinite(n) || n <= 0) return DEFAULT_PCT;
  return Math.min(n < 1 ? n * 100 : n, MAX_PCT);
}

export function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export async function loadCustomers() {
  if (cache.map && Date.now() - cache.at < 60000) return cache.map;
  const map = new Map();
  String(process.env.CUSTOMER_IDS || '').split(/[,;\n]+/).forEach(part => {
    const [key, ...name] = part.split('=');
    const id = (key || '').trim().toUpperCase();
    if (id) map.set(id, { business: name.join('=').trim(), contact: '', phone: '', address: '', pct: DEFAULT_PCT, rep: '' });
  });
  const url = process.env.CUSTOMERS_CSV_URL;
  if (url) {
    try {
      const r = await fetch(url, { redirect: 'follow' });
      if (!r.ok) throw new Error('status ' + r.status);
      const rows = parseCsv(await r.text());
      const head = (rows[0] || []).map(h => h.trim().toLowerCase());
      const ix = name => head.findIndex(h => h.startsWith(name));
      const iId = ix('customer id'), iBiz = ix('business'), iCon = ix('contact'), iPh = ix('phone'), iAd = ix('delivery address'), iAct = ix('active'), iPct = ix('discount'), iRep = ix('sales rep');
      if (iId < 0) throw new Error('no "Customer ID" column');
      for (const row of rows.slice(1)) {
        const id = String(row[iId] || '').trim().toUpperCase();
        if (!id) continue;
        if (iAct >= 0 && /^(n|no|inactive|false|off)$/i.test(String(row[iAct] || '').trim())) { map.delete(id); continue; }
        const get = i => (i >= 0 ? String(row[i] || '').trim() : '');
        map.set(id, { business: get(iBiz), contact: get(iCon), phone: get(iPh), address: get(iAd), pct: readPct(get(iPct)), rep: get(iRep) });
      }
    } catch (err) {
      console.log('Could not read the Customers sheet:', String(err));
      if (cache.map) return cache.map; // keep the last good list rather than turning customers away
    }
  }
  cache = { at: Date.now(), map };
  return map;
}
