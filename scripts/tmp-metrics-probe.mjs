// Prueba rápida para capturar el cuerpo de error del endpoint de métricas vía proxy
const BASE = process.env.BASE || 'http://localhost:4004/api';
const email = process.env.EMAIL || 'e2e_1761976108056@example.com';
const password = process.env.PASS || 'E2Etest123*';
const listingId = process.env.LISTING_ID || '2e36aafd-8761-4b3d-90d4-47207b8cb696';

async function main() {
  const post = (u, b) => fetch(u, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(b)
  });
  const get = (u, t) => fetch(u, {
    headers: { Authorization: `Bearer ${t}` }
  });

  console.log('[probe] BASE', BASE);
  console.log('[probe] email', email);

  const lr = await post(`${BASE}/auth/login`, { email, password });
  const ltxt = await lr.text();
  console.log('[probe] login status', lr.status);
  console.log('[probe] login body', ltxt);

  let token;
  try { token = JSON.parse(ltxt).token; } catch {}
  if (!token) {
    console.error('[probe] No token parsed, aborting.');
    process.exit(2);
  }

  // Fetch alojamiento details to inspect anfitrionId mapping
  const dr = await get(`${BASE}/alojamientos/${listingId}`, token);
  const dtxt = await dr.text();
  console.log('[probe] alojamiento status', dr.status);
  console.log('[probe] alojamiento body', dtxt);

  const url = `${BASE}/alojamientos/${listingId}/metricas`;
  const mr = await get(url, token);
  const mtxt = await mr.text();
  console.log('[probe] metrics url', url);
  console.log('[probe] metrics status', mr.status);
  console.log('[probe] metrics body', mtxt);
}

main().catch((e) => {
  console.error('[probe] Uncaught error', e?.stack || e);
  process.exit(1);
});
