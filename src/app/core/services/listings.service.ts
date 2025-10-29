import { Injectable, signal } from '@angular/core';
import { Listing } from '../models/listing.model';

@Injectable({ providedIn: 'root' })
export class ListingsService {
  listings = signal<Listing[]>(this.bootstrap());
  favorites = signal<string[]>([]);

  getById(id: string): Listing | undefined {
    return this.listings().find(x => x.id === id);
  }

  create(listing: Listing): Listing {
    this.listings.set([...this.listings(), listing]);
    return listing;
  }

  update(id: string, values: Partial<Listing>): Listing | undefined {
    const updated = this.listings().map(l => (l.id === id ? { ...l, ...values } : l));
    this.listings.set(updated);
    return this.getById(id);
  }

  remove(id: string): boolean {
    this.listings.set(this.listings().filter(l => l.id !== id));
    return true;
  }

  addFavorite(id: string): void {
    if (!this.favorites().includes(id)) {
      this.favorites.set([...this.favorites(), id]);
    }
  }

  removeFavorite(id: string): void {
    this.favorites.set(this.favorites().filter(x => x !== id));
  }

  private bootstrap(): Listing[] {
    return [
      {
        id: 'a1',
        titulo: 'Descripción alojamiento',
        descripcion: 'Hermoso apartamento cerca de la playa.',
        ubicacion: { direccion: 'Calle 1 #2-34', ciudad: 'Cartagena', pais: 'Colombia', lat: 10.4, lng: -75.5 },
        precioPorNoche: 120,
        imagenes: ['https://picsum.photos/400/300?random=4'],
        servicios: ['WiFi', 'Piscina'],
        calificacionPromedio: 5,
        anfitrionId: 'u1',
        disponibleDesde: '2023-01-01',
        capacidad: 4
      },
      {
        id: 'a2',
        titulo: 'Descripción alojamiento',
        descripcion: 'Villa con piscina y jardín privado.',
        ubicacion: { direccion: 'Vereda El Roble', ciudad: 'Manizales', pais: 'Colombia', lat: 5.06, lng: -75.51 },
        precioPorNoche: 90,
        imagenes: ['https://picsum.photos/400/300?random=5'],
        servicios: ['WiFi', 'Piscina'],
        calificacionPromedio: 5,
        anfitrionId: 'u2',
        disponibleDesde: '2023-01-01',
        capacidad: 2
      },
      {
        id: 'a3',
        titulo: 'Descripción alojamiento',
        descripcion: 'Apartamento moderno en el centro de la ciudad.',
        ubicacion: { direccion: 'Calle 10 #15-20', ciudad: 'Bogotá', pais: 'Colombia', lat: 4.7, lng: -74.1 },
        precioPorNoche: 85,
        imagenes: ['https://picsum.photos/400/300?random=2'],
        servicios: ['WiFi', 'Aire acondicionado'],
        calificacionPromedio: 5,
        anfitrionId: 'u3',
        disponibleDesde: '2023-01-01',
        capacidad: 3
      },
      {
        id: 'a4',
        titulo: 'Descripción alojamiento',
        descripcion: 'Casa colonial en el centro histórico.',
        ubicacion: { direccion: 'Carrera 5 #8-12', ciudad: 'Villa de Leyva', pais: 'Colombia', lat: 5.6, lng: -73.5 },
        precioPorNoche: 110,
        imagenes: ['https://picsum.photos/400/300?random=1'],
        servicios: ['WiFi', 'Chimenea'],
        calificacionPromedio: 5,
        anfitrionId: 'u4',
        disponibleDesde: '2023-01-01',
        capacidad: 6
      },
      {
        id: 'a5',
        titulo: 'Descripción alojamiento',
        descripcion: 'Loft moderno con vista panorámica.',
        ubicacion: { direccion: 'Avenida 19 #120-30', ciudad: 'Medellín', pais: 'Colombia', lat: 6.2, lng: -75.6 },
        precioPorNoche: 95,
        imagenes: ['https://picsum.photos/400/300?random=6'],
        servicios: ['WiFi', 'Gimnasio'],
        calificacionPromedio: 4,
        anfitrionId: 'u5',
        disponibleDesde: '2023-01-01',
        capacidad: 2
      },
      {
        id: 'a6',
        titulo: 'Descripción alojamiento',
        descripcion: 'Hotel boutique en zona exclusiva.',
        ubicacion: { direccion: 'Calle 93 #11-20', ciudad: 'Bogotá', pais: 'Colombia', lat: 4.7, lng: -74.0 },
        precioPorNoche: 150,
        imagenes: ['https://picsum.photos/400/300?random=3'],
        servicios: ['WiFi', 'Spa', 'Restaurante'],
        calificacionPromedio: 5,
        anfitrionId: 'u6',
        disponibleDesde: '2023-01-01',
        capacidad: 4
      },
      {
        id: 'a7',
        titulo: 'Descripción alojamiento',
        descripcion: 'Suite ejecutiva con todas las comodidades.',
        ubicacion: { direccion: 'Carrera 13 #85-40', ciudad: 'Bogotá', pais: 'Colombia', lat: 4.6, lng: -74.1 },
        precioPorNoche: 130,
        imagenes: ['https://picsum.photos/400/300?random=7'],
        servicios: ['WiFi', 'Aire acondicionado', 'Minibar'],
        calificacionPromedio: 4,
        anfitrionId: 'u7',
        disponibleDesde: '2023-01-01',
        capacidad: 2
      },
      {
        id: 'a8',
        titulo: 'Descripción alojamiento',
        descripcion: 'Edificio moderno con todas las amenidades.',
        ubicacion: { direccion: 'Calle 100 #15-25', ciudad: 'Bogotá', pais: 'Colombia', lat: 4.7, lng: -74.0 },
        precioPorNoche: 140,
        imagenes: ['https://picsum.photos/400/300?random=8'],
        servicios: ['WiFi', 'Piscina', 'Gimnasio'],
        calificacionPromedio: 5,
        anfitrionId: 'u8',
        disponibleDesde: '2023-01-01',
        capacidad: 4
      }
    ];
  }
}
