export interface Listing {
  id: string;
  titulo: string;
  descripcion: string;
  ubicacion: {
    direccion: string;
    ciudad: string;
    pais: string;
    lat?: number;
    lng?: number;
  };
  precioPorNoche: number;
  imagenes: string[];
  servicios: string[];
  calificacionPromedio?: number;
  numeroResenas?: number;
  anfitrionId: string;
  anfitrionNombre?: string;
  disponibleDesde?: string;
  disponibleHasta?: string;
  capacidad: number;
}
