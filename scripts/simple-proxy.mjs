// Proxy de API mínimo al backend para pruebas E2E, evitando problemas con PowerShell
import express from 'express';
import url from 'node:url';

process.env.NO_PROXY = [process.env.NO_PROXY, 'localhost', '127.0.0.1']
  .filter(Boolean)
  .join(',');
process.env.HTTP_PROXY = process.env.HTTP_PROXY ?? '';
process.env.HTTPS_PROXY = process.env.HTTPS_PROXY ?? '';

const app = express();
// Control de mocks (por defecto habilitados). Para desactivar: USE_MOCKS="false"
const USE_MOCKS = String(process.env.USE_MOCKS ?? 'true').toLowerCase() !== 'false';

// Endpoints mínimos de raíz y salud para el ping del frontend E2E
app.get('/', (req, res) => res.status(200).send('ok'));
app.get('/actuator/health', (req, res) => res.json({ status: 'UP' }));

const TARGET = process.env.TARGET || 'http://127.0.0.1:8081';
console.log(`[proxy] Target backend: ${TARGET}`);

/**
 * Construye una respuesta mock si el backend no está disponible.
 * Devuelve null si la ruta no está soportada por los mocks.
 */
function buildMock(req, bodyBuffer) {
  const u = new URL(req.originalUrl, 'http://localhost');
  const pathname = u.pathname;
  const method = req.method.toUpperCase();
  // Soportar rutas con y sin prefijo '/api'
  const path = pathname.startsWith('/api/') ? pathname : `/api${pathname.startsWith('/') ? '' : '/'}${pathname}`;

  // Intentar parsear cuerpo JSON si aplica
  let bodyJson = null;
  try {
    const ct = String(req.headers['content-type'] || '');
    if (bodyBuffer && ct.includes('application/json')) {
      const text = Buffer.isBuffer(bodyBuffer) ? bodyBuffer.toString('utf8') : String(bodyBuffer || '');
      if (text) bodyJson = JSON.parse(text);
    }
  } catch {}

  // Mock de listings paginados
  if (path === '/api/alojamientos' && method === 'GET') {
    const page = Number(u.searchParams.get('page') ?? 0);
    const size = Number(u.searchParams.get('size') ?? 12);
    const content = [
      {
        id: 1,
        titulo: 'Apartamento céntrico',
        descripcion: 'Luminoso y moderno, ideal para viajes de trabajo.',
        calle: 'Calle Mayor 12',
        ciudad: 'Madrid',
        pais: 'España',
        latitud: 40.4168,
        longitud: -3.7038,
        precioNoche: 85,
        fotos: ['/icons/icon-512x512.png'],
        servicios: ['WiFi', 'Aire acondicionado', 'Cocina'],
        capacidad: 2
      },
      {
        id: 2,
        titulo: 'Casa con piscina',
        descripcion: 'Amplia y cómoda, perfecta para vacaciones en familia.',
        calle: 'Av. del Sol 45',
        ciudad: 'Valencia',
        pais: 'España',
        latitud: 39.4699,
        longitud: -0.3763,
        precioNoche: 140,
        fotos: ['/icons/icon-512x512.png'],
        servicios: ['Piscina', 'Estacionamiento', 'TV por cable'],
        capacidad: 6
      }
    ];
    return {
      status: 200,
      body: {
        content,
        totalElements: content.length,
        totalPages: 1,
        size,
        number: page
      }
    };
  }

  // Mock de autenticación: login
  if (path === '/api/auth/login' && method === 'POST') {
    const email = u.searchParams.get('email') || 'user@example.com';
    const body = {
      token: 'mock-token-123',
      user: {
        id: '1001',
        email,
        nombre: 'Usuario',
        apellido: 'Demo',
        telefono: '+57 300 000 0000',
        rol: 'HUESPED',
        avatarUrl: ''
      }
    };
    return { status: 200, body };
  }

  // Mock de autenticación: registro
  if (path === '/api/auth/register' && method === 'POST') {
    const body = {
      id: '1002',
      email: 'nuevo@example.com',
      nombre: 'Nuevo',
      apellido: 'Usuario',
      telefono: '',
      rol: 'HUESPED'
    };
    return { status: 200, body };
  }

  // Mock de autenticación: perfil actual
  if (path === '/api/auth/me' && method === 'GET') {
    const body = {
      id: '1001',
      email: 'user@example.com',
      nombre: 'Usuario',
      apellido: 'Demo',
      telefono: '+57 300 000 0000',
      rol: 'HUESPED'
    };
    return { status: 200, body };
  }

  // Mock de salud del backend (actuator)
  if (path === '/actuator/health' && method === 'GET') {
    const body = { status: 'UP' };
    return { status: 200, body };
  }

  // Mock de búsqueda de listings
  if (path === '/api/alojamientos/search' && method === 'POST') {
    const content = [
      {
        id: 3,
        titulo: 'Estudio cerca del mar',
        descripcion: 'A 100m de la playa, perfecto para pareja.',
        calle: 'Calle Arena 3',
        ciudad: 'Barcelona',
        pais: 'España',
        latitud: 41.3851,
        longitud: 2.1734,
        precioNoche: 110,
        fotos: ['/icons/icon-512x512.png'],
        servicios: ['WiFi', 'Balcón'],
        capacidad: 2
      }
    ];
    return {
      status: 200,
      body: {
        content,
        totalElements: content.length,
        totalPages: 1,
        size: 12,
        number: 0
      }
    };
  }

  // Mock de detalle de alojamiento por ID
  if (method === 'GET') {
    const m = path.match(/^\/api\/alojamientos\/(\d+)/);
    if (m) {
      const id = Number(m[1]);
      const body = {
        id,
        titulo: `Alojamiento #${id}`,
        descripcion: 'Detalle de alojamiento de prueba.',
        calle: 'Calle Falsa 123',
        ciudad: 'Sevilla',
        pais: 'España',
        zip: '41001',
        latitud: 37.3891,
        longitud: -5.9845,
        precioNoche: 95,
        fotos: ['/icons/icon-512x512.png'],
        servicios: ['WiFi', 'Cocina'],
        capacidad: 3
      };
      return { status: 200, body };
    }
  }

  // Mock de reservas propias del usuario
  if (path === '/api/reservas/mias' && method === 'GET') {
    const page = Number(u.searchParams.get('page') ?? 0);
    const size = Number(u.searchParams.get('size') ?? 10);
    const content = [
      {
        id: 101,
        alojamientoId: 1,
        huespedId: 1001,
        checkIn: '2025-11-10',
        checkOut: '2025-11-12',
        numeroHuespedes: 2,
        estado: 'CONFIRMADA'
      },
      {
        id: 102,
        alojamientoId: 2,
        huespedId: 1001,
        checkIn: '2025-12-05',
        checkOut: '2025-12-08',
        numeroHuespedes: 4,
        estado: 'PENDIENTE'
      }
    ];
    return {
      status: 200,
      body: {
        content,
        totalElements: content.length,
        totalPages: 1,
        size,
        number: page
      }
    };
  }

  // Listings del anfitrión autenticado
  if (path === '/api/alojamientos/anfitrion' && method === 'GET') {
    const page = Number(u.searchParams.get('page') ?? 0);
    const size = Number(u.searchParams.get('size') ?? 12);
    const content = [
      {
        id: 10,
        titulo: 'Loft moderno en el centro',
        descripcion: 'Ideal para estancias cortas, cerca de todo.',
        calle: 'Calle 7 #45-12',
        ciudad: 'Bogotá',
        pais: 'Colombia',
        zip: '110111',
        latitud: 4.711,
        longitud: -74.0721,
        precioNoche: 120,
        fotos: ['/icons/icon-512x512.png'],
        servicios: ['WiFi', 'Cocina'],
        capacidad: 2
      },
      {
        id: 11,
        titulo: 'Casa campestre con vista',
        descripcion: 'Perfecta para desconectar y disfrutar de la naturaleza.',
        calle: 'Vereda El Retiro km 3',
        ciudad: 'Medellín',
        pais: 'Colombia',
        zip: '050001',
        latitud: 6.2442,
        longitud: -75.5812,
        precioNoche: 220,
        fotos: ['/icons/icon-512x512.png'],
        servicios: ['Estacionamiento', 'Balcón'],
        capacidad: 6
      }
    ];
    return {
      status: 200,
      body: { content, totalElements: content.length, totalPages: 1, size, number: page }
    };
  }

  // Reservas del anfitrión autenticado
  if (path === '/api/reservas/anfitrion' && method === 'GET') {
    const page = Number(u.searchParams.get('page') ?? 0);
    const size = Number(u.searchParams.get('size') ?? 10);
    const content = [
      {
        id: 501,
        alojamientoId: 10,
        huespedId: 2001,
        checkIn: '2025-10-01',
        checkOut: '2025-10-05',
        numeroHuespedes: 2,
        estado: 'CONFIRMADA'
      },
      {
        id: 502,
        alojamientoId: 11,
        huespedId: 2002,
        checkIn: '2025-12-12',
        checkOut: '2025-12-15',
        numeroHuespedes: 4,
        estado: 'PENDIENTE'
      },
      {
        id: 503,
        alojamientoId: 10,
        huespedId: 2003,
        checkIn: '2025-09-10',
        checkOut: '2025-09-12',
        numeroHuespedes: 1,
        estado: 'CANCELADA'
      }
    ];
    return {
      status: 200,
      body: { content, totalElements: content.length, totalPages: 1, size, number: page }
    };
  }

  // Reservas por alojamiento específico
  if (method === 'GET') {
    const m = path.match(/^\/api\/reservas\/alojamiento\/(\d+)/);
    if (m) {
      const alojamientoId = Number(m[1]);
      const page = Number(u.searchParams.get('page') ?? 0);
      const size = Number(u.searchParams.get('size') ?? 10);
      const content = [
        {
          id: 601,
          alojamientoId,
          huespedId: 2101,
          checkIn: '2025-08-01',
          checkOut: '2025-08-03',
          numeroHuespedes: 2,
          estado: 'CONFIRMADA'
        },
        {
          id: 602,
          alojamientoId,
          huespedId: 2102,
          checkIn: '2025-11-20',
          checkOut: '2025-11-22',
          numeroHuespedes: 3,
          estado: 'PENDIENTE'
        }
      ];
      return {
        status: 200,
        body: { content, totalElements: content.length, totalPages: 1, size, number: page }
      };
    }
  }

  // Actualización de estado de reserva (PATCH)
  if (method === 'PATCH') {
    const m = path.match(/^\/api\/reservas\/(\d+)/);
    if (m) {
      const id = Number(m[1]);
      const estado = String(bodyJson?.estado || '').toUpperCase();
      const normalized = ['PENDIENTE', 'CONFIRMADA', 'CANCELADA'].includes(estado) ? estado : 'CONFIRMADA';
      const sample = {
        id,
        alojamientoId: 10,
        huespedId: 2001,
        checkIn: '2025-10-01',
        checkOut: '2025-10-05',
        numeroHuespedes: 2,
        estado: normalized
      };
      return { status: 200, body: sample };
    }
  }

  // Cancelación de reserva
  if (method === 'POST') {
    const m = path.match(/^\/api\/reservas\/(\d+)\/cancelar$/);
    if (m) {
      const id = Number(m[1]);
      return { status: 200, body: { id, ok: true } };
    }
  }

  // Perfil de usuario actual
  if (path === '/api/usuarios/me' && method === 'GET') {
    const body = {
      id: '1001',
      email: 'user@example.com',
      nombre: 'Usuario',
      apellido: 'Demo',
      telefono: '+57 300 000 0000',
      rol: 'ANFITRION',
      avatarUrl: ''
    };
    return { status: 200, body };
  }

  if (path === '/api/usuarios/me' && method === 'PATCH') {
    const current = {
      id: '1001',
      email: 'user@example.com',
      nombre: 'Usuario',
      apellido: 'Demo',
      telefono: '+57 300 000 0000',
      rol: 'ANFITRION',
      avatarUrl: ''
    };
    const merged = { ...current, ...(bodyJson || {}) };
    return { status: 200, body: merged };
  }

  // Métricas
  if (method === 'GET') {
    const m1 = path.match(/^\/api\/alojamientos\/(\d+)\/metricas$/);
    if (m1) {
      const id = Number(m1[1]);
      const body = {
        titulo: `Alojamiento #${id}`,
        promedioCalificacion: 4.3,
        totalReservas: 28,
        reservasCompletadas: 22,
        reservasCanceladas: 6,
        ingresosTotales: 5400
      };
      return { status: 200, body };
    }
  }

  if (path === '/api/alojamientos/metricas' && method === 'GET') {
    const list = [10, 11].map(id => ({
      titulo: `Alojamiento #${id}`,
      promedioCalificacion: id === 10 ? 4.5 : 4.1,
      totalReservas: id === 10 ? 30 : 18,
      reservasCompletadas: id === 10 ? 24 : 12,
      reservasCanceladas: id === 10 ? 6 : 6,
      ingresosTotales: id === 10 ? 6200 : 3800
    }));
    return { status: 200, body: list };
  }

  return null;
}

app.use('/api', (req, res) => {
  const targetUrl = `${TARGET}${req.originalUrl}`;
  const method = req.method;
  console.log('[proxy] incoming', { url: req.originalUrl, method });
  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers[key] = value;
  }
  delete headers['host'];
  delete headers['connection'];
  delete headers['content-length'];
  // Evitar que el backend active CORS por orígenes dinámicos del dev server
  delete headers['origin'];
  delete headers['referer'];

  const chunks = [];
  req
    .on('data', (chunk) => chunks.push(chunk))
    .on('end', async () => {
      const bodyBuffer = Buffer.concat(chunks);
      const body = (method === 'GET' || method === 'HEAD')
        ? undefined
        : (bodyBuffer.length ? bodyBuffer : undefined);

      // Responder con mock si la ruta está soportada y los mocks están habilitados
      const preMock = USE_MOCKS ? buildMock(req, body) : null;
      if (preMock) {
        res.status(preMock.status).setHeader('Content-Type', 'application/json');
        return res.send(JSON.stringify(preMock.body));
      }

      try {
        const response = await fetch(targetUrl, { method, headers, body });

        res.status(response.status);
        response.headers.forEach((value, name) => {
          const lower = name.toLowerCase();
          if (lower === 'content-encoding' || lower === 'transfer-encoding') return;
          res.setHeader(name, value);
        });

        const arrayBuf = await response.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        // Log opcional del cuerpo de respuesta cuando es JSON
        const LOG_BODY = String(process.env.LOG_BODY ?? 'false').toLowerCase() === 'true';
        try {
          const ct = String(response.headers.get('content-type') || '');
          if (LOG_BODY && ct.includes('application/json')) {
            const text = buf.toString('utf8');
            let preview = text;
            if (preview.length > 800) preview = preview.slice(0, 800) + '...';
            console.log('[proxy] upstream response body', { url: targetUrl, preview });
          }
        } catch {}
        res.send(buf);
      } catch (err) {
        console.error('[proxy] API error', {
          url: targetUrl,
          message: err?.message,
          code: err?.code ?? err?.cause?.code,
          cause: err?.cause?.message ?? String(err?.cause ?? ''),
        });
        // Intentar responder con datos mock si la ruta está soportada
        const mock = USE_MOCKS ? buildMock(req, body) : null;
        if (mock) {
          res.status(mock.status).setHeader('Content-Type', 'application/json');
          return res.send(JSON.stringify(mock.body));
        }
        // Si no hay mock, devolver 502 por defecto
        res.status(502).json({ error: 'Bad Gateway', detail: err?.message ?? 'Proxy failed' });
      }
    })
    .on('error', (err) => {
      console.error('[proxy] Request stream error', err);
      res.status(400).json({ error: 'Bad Request', detail: 'Stream error' });
    });
});

const port = process.env.PORT || 4004;
app.listen(port, () => {
  console.log(`[proxy] Listening on http://localhost:${port}`);
});
