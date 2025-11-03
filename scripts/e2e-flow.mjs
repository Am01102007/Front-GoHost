#!/usr/bin/env node
/**
 * End-to-end (E2E) flow validator for backend-frontend integration via proxy.
 *
 * - Verifica que el frontend esté sirviendo en http://localhost:4200/
 * - Registra un usuario anfitrión (o usa credenciales vía env) y hace login
 * - Crea un alojamiento de prueba
 * - Obtiene métricas del alojamiento creado
 *
 * Variables de entorno opcionales:
 *   E2E_EMAIL, E2E_PASSWORD  -> para usar un usuario existente
 *   E2E_BASE                  -> base de API (default: http://localhost:4200/api)
 */

const BASE = process.env.E2E_BASE || 'http://localhost:4200/api';

// Evitar que undici/fetch utilice proxies del sistema para llamadas locales
process.env.NO_PROXY = [process.env.NO_PROXY, 'localhost', '127.0.0.1']
  .filter(Boolean)
  .join(',');
process.env.HTTP_PROXY = process.env.HTTP_PROXY ?? '';
process.env.HTTPS_PROXY = process.env.HTTPS_PROXY ?? '';

function logStep(title) {
  console.log(`\n[STEP] ${title}`);
}

async function pingFrontend() {
  const baseOrigin = BASE.replace(/\/api$/, '');
  logStep(`Verificando frontend en ${baseOrigin}`);
  let res;
  try {
    res = await fetch(baseOrigin);
    if (res) {
      console.log('Servidor responde:', res.status);
      return;
    }
  } catch {}
  // Fallback: intenta health pero considera cualquier respuesta como indicio de vida
  const health = await fetch(`${baseOrigin}/actuator/health`).catch(() => null);
  if (!health) {
    throw new Error(`Servidor no responde. Root=${res?.status ?? 'error'}, health=error`);
  }
  console.log('Servidor responde en health:', health.status);
}

async function registerHost(email, password) {
  logStep('Registrando usuario anfitrión');
  const payload = {
    email,
    nombre: 'E2E',
    apellidos: 'Tester',
    tipoDocumento: 'CC',
    numeroDocumento: String(Math.floor(Math.random() * 1_000_000_000)),
    fechaNacimiento: '1990-01-01',
    telefono: '3000000000',
    ciudad: 'Bogotá',
    pais: 'Colombia',
    password
  };
  const res = await fetch(`${BASE}/auth/register/anfitrion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (res.status === 409) {
    console.log('El usuario ya existe, continuando con login');
    return;
  }
  if (!res.ok) throw new Error(`Registro anfitrión falló: ${res.status}`);
  console.log('Usuario anfitrión registrado');
}

async function login(email, password) {
  logStep('Iniciando sesión');
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error(`Login falló: ${res.status}`);
  const data = await res.json();
  if (!data?.token) throw new Error('Respuesta de login sin token');
  console.log('Login OK. Rol:', data?.rol ?? 'desconocido');
  return data.token;
}

async function profile(token) {
  logStep('Obteniendo perfil');
  const res = await fetch(`${BASE}/usuarios/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Perfil falló: ${res.status}`);
  const data = await res.json();
  console.log('Perfil:', { id: data.id, email: data.email, rol: data.rol });
  return data;
}

async function createListing(token) {
  logStep('Creando alojamiento de prueba');
  const payload = {
    titulo: `E2E Alojamiento ${Date.now()}`,
    descripcion: 'Alojamiento generado por prueba E2E',
    ciudad: 'Medellín',
    pais: 'Colombia',
    calle: 'Calle Falsa 123',
    zip: '050010',
    precioNoche: 100000,
    capacidad: 2,
    fotos: ['https://picsum.photos/800/600'],
    servicios: []
  };
  const res = await fetch(`${BASE}/alojamientos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Crear alojamiento falló: ${res.status}`);
  const data = await res.json();
  console.log('Alojamiento creado:', { id: data.id, titulo: data.titulo });
  return data;
}

async function getListingMetrics(token, listingId) {
  logStep('Obteniendo métricas del alojamiento');
  const res = await fetch(`${BASE}/alojamientos/${listingId}/metricas`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Métricas fallaron: ${res.status}`);
  const data = await res.json();
  console.log('Métricas:', data);
  return data;
}

async function main() {
  await pingFrontend();

  const email = process.env.E2E_EMAIL || `e2e_${Date.now()}@example.com`;
  const password = process.env.E2E_PASSWORD || 'E2Etest123*';

  if (!process.env.E2E_EMAIL) {
    await registerHost(email, password);
  } else {
    console.log('Usando credenciales proporcionadas vía entorno');
  }

  const token = await login(email, password);
  await profile(token);
  const listing = await createListing(token);
  await getListingMetrics(token, listing.id);

  console.log('\nE2E flow completado exitosamente.');
}

main().catch(err => {
  console.error('\nE2E flow falló:', err?.message || err);
  process.exit(1);
});
