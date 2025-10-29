export interface User {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  rol: string;
  fechaNacimiento: string;
  avatarUrl?: string;
  token?: string;
}
