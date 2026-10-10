# Champ Sets NC – Tire Inventory

Used and take-off tire inventory for Champ Sets NC, 1501 Douglas Dr., Sanford, NC 27330.

- `index.html` is the whole site: inventory data, search, "Also fits" sizes, cart and checkout.
- Hosted on Netlify. Every change saved to this repository goes live automatically.
- Orders from the "Send order" button arrive as Netlify form submissions named **order** and are emailed to ChampSetsNc@gmail.com (set under Site configuration → Notifications).
- Shop phone, email, hours and policies are in the `SHOP` settings near the top of the script in `index.html`.
- Each verified order is also sent to the warehouse Pick List (Google Sheet) by `netlify/functions/pick-list.mjs`. It needs the environment variable **PICKLIST_URL** (the sheet's web app link ending in `/exec?key=...`), set under Project configuration → Environment variables. No outgoing webhook is used, so there is nothing for Netlify to disable.
- The site hides tires that are on the Pick List, using `soldFeed` in the `SHOP` settings (the same link without the key).
- Retail customer IDs (10% off) are checked by `netlify/functions/customer-id.mjs` against the environment variable **CUSTOMER_IDS**, e.g. `SMITH24=Smith Tire, ABCAUTO7=ABC Auto`. IDs never appear in the site code. Orders show the ID in the Pick List note; an unrecognized ID is flagged "NOT VALID, CHECK PRICES".
