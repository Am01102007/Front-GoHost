#!/usr/bin/env node
/**
 * Seed de datos: crea usuarios de prueba y alojamientos de ejemplo con direcciones completas.
 *
 * Variables:
 *  - E2E_BASE: base de API (default: http://localhost:4200/api)
 */

const BASE = process.env.E2E_BASE || 'http://localhost:4200/api';

process.env.NO_PROXY = [process.env.NO_PROXY, 'localhost', '127.0.0.1']
  .filter(Boolean)
  .join(',');
process.env.HTTP_PROXY = process.env.HTTP_PROXY ?? '';
process.env.HTTPS_PROXY = process.env.HTTPS_PROXY ?? '';

function logStep(title) { console.log(`\n[STEP] ${title}`); }

async function register(email, password, role) {
  logStep(`Registrando ${role || 'huesped'}: ${email}`);
  const payload = {
    email,
    nombre: 'Test',
    apellidos: 'User',
    tipoDocumento: 'CC',
    // Usar documento distinto por rol para evitar 400 por duplicados
    numeroDocumento: role === 'anfitrion' ? '99999901' : '99999902',
    fechaNacimiento: '1990-01-01',
    telefono: '3000000000',
    ciudad: role === 'anfitrion' ? 'Bogotá' : 'Medellín',
    pais: 'Colombia',
    password
  };
  const path = role === 'anfitrion' ? '/auth/register/anfitrion' : '/auth/register';
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  // Tolerar duplicados tanto en 409 como en 400 con mensaje "Ya existe"
  if (res.status === 409) { console.log('Usuario ya existe, continuando'); return; }
  if (!res.ok) {
    let msg = '';
    try { const body = await res.json(); msg = body?.message || ''; } catch {}
    if (res.status === 400 && (msg.includes('Ya existe') || msg.toLowerCase().includes('ya existe'))) {
      console.log('Usuario ya existe (400), continuando');
      return;
    }
    throw new Error(`Registro falló: ${res.status}${msg ? ' - ' + msg : ''}`);
  }
  console.log('Usuario registrado');
}

async function login(email, password) {
  logStep(`Login: ${email}`);
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error(`Login falló: ${res.status}`);
  const data = await res.json();
  if (!data?.token) throw new Error('Respuesta de login sin token');
  console.log('Login OK. Rol:', data?.rol ?? 'desconocido');
  return data.token;
}

async function createListing(token, dto) {
  logStep(`Creando alojamiento: ${dto.titulo}`);
  const res = await fetch(`${BASE}/alojamientos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(dto)
  });
  if (!res.ok) throw new Error(`Crear alojamiento falló: ${res.status}`);
  const data = await res.json();
  console.log('Alojamiento creado:', { id: data.id, titulo: data.titulo });
  return data;
}

async function main() {
  console.log('Usando BASE =', BASE);

  await register('testuser1@example.com', 'Test1234!', 'anfitrion');
  await register('testuser2@example.com', 'Test5678!', undefined);

  const hostToken = await login('testuser1@example.com', 'Test1234!');

  const samples = [
    {
      titulo: 'Apartamento en Bogotá Chapinero', descripcion: 'Luminoso y cómodo cerca de la Zona G.', ciudad: 'Bogotá', pais: 'Colombia',
      calle: 'Calle 59 # 7-23', zip: '110111', precioNoche: 120, capacidad: 2,
      fotos: ['https://picsum.photos/800/600?random=201'], servicios: []
    },
    {
      titulo: 'Estudio en Medellín El Poblado', descripcion: 'Moderno estudio cerca del Parque Lleras.', ciudad: 'Medellín', pais: 'Colombia',
      calle: 'Cra. 43A # 7-50', zip: '050021', precioNoche: 90, capacidad: 2,
      fotos: ['https://picsum.photos/800/600?random=202'], servicios: []
    }
  ];

  for (const s of samples) {
    await createListing(hostToken, s);
  }

  console.log('\nSeed completado exitosamente.');
}

main().catch(err => { console.error('\nSeed falló:', err?.message || err); process.exit(1); });
