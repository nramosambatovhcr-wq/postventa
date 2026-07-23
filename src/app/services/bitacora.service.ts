import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

// Interfaces
export interface ActividadBitacora {
  id: number;
  fecha: Date;
  titulo: string;
  descripcion: string;
  categoria: string;
  prioridad: string;
  estado: string;
  duracion?: number; // en minutos
  usuarioId: number;
  usuarioNombre?: string;
  soporteId?: number;
  soporteCodigo?: string;
  imagenes?: string[];
  archivos?: string[];
  etiquetas?: string[];
  ubicacion?: string;
  observaciones?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ActividadRequest {
  fecha: Date | undefined;
  titulo: string;
  descripcion: string;
  categoria: string;
  prioridad: string;
  estado: string;
  duracion?: number;
  usuarioId: number;
  usuarioNombre?: string;
  soporteId?: number;
  etiquetas?: string[];
  ubicacion?: string;
  observaciones?: string;
}

export interface EstadisticasBitacora {
  totalActividades: number;
  completadas: number;
  pendientes: number;
  enProceso: number;
  tiempoTotal: number;
  actividadesPorCategoria: { [key: string]: number };
}

@Injectable({
  providedIn: 'root'
})
export class BitacoraService {
//  private apiUrl = 'http://localhost:3000/api'; // Ajustar según tu backend
  private apiUrl = 'https://bodega.vehicentro.com:1830/api/api'; 
  // Configuración
  readonly CATEGORIAS = [
    'REPARACIÓN',
    'CALIBRACIÓN',
    'MANTENIMIENTO',
    'DIAGNÓSTICO',
    'PRUEBAS',
    'DOCUMENTACIÓN',
    'REUNIÓN',
    'CAPACITACIÓN',
    'OTRO'
  ];

  readonly PRIORIDADES = [
    { value: 'BAJA', label: 'Baja', color: '#28a745' },
    { value: 'MEDIA', label: 'Media', color: '#ffc107' },
    { value: 'ALTA', label: 'Alta', color: '#fd7e14' },
    { value: 'URGENTE', label: 'Urgente', color: '#dc3545' }
  ];

  readonly ESTADOS = [
    { value: 'PENDIENTE', label: 'Pendiente' },
    { value: 'EN_PROCESO', label: 'En Proceso' },
    { value: 'COMPLETADA', label: 'Completada' },
    { value: 'CANCELADA', label: 'Cancelada' }
  ];

  readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  readonly ALLOWED_FILE_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];

  constructor(private http: HttpClient) { }

  // ========================
  // CRUD ACTIVIDADES
  // ========================

  getAllActividades(): Observable<ActividadBitacora[]> {
    return this.http.get<ActividadBitacora[]>(`${this.apiUrl}/bitacora`);
  }

  getActividadById(id: number): Observable<ActividadBitacora> {
    return this.http.get<ActividadBitacora>(`${this.apiUrl}/bitacora/${id}`);
  }

  getActividadesByUsuario(usuarioId: number): Observable<ActividadBitacora[]> {
    return this.http.get<ActividadBitacora[]>(`${this.apiUrl}/bitacora/usuario/${usuarioId}`);
  }

  getActividadesByFecha(fecha: string): Observable<ActividadBitacora[]> {
    return this.http.get<ActividadBitacora[]>(`${this.apiUrl}/bitacora/fecha/${fecha}`);
  }

  getActividadesByRangoFechas(fechaInicio: string, fechaFin: string): Observable<ActividadBitacora[]> {
    return this.http.get<ActividadBitacora[]>(
      `${this.apiUrl}/bitacora/rango?inicio=${fechaInicio}&fin=${fechaFin}`
    );
  }

  getActividadesBySoporte(soporteId: number): Observable<ActividadBitacora[]> {
    return this.http.get<ActividadBitacora[]>(`${this.apiUrl}/bitacora/soporte/${soporteId}`);
  }

  createActividad(actividad: ActividadRequest): Observable<ActividadBitacora> {
    return this.http.post<ActividadBitacora>(`${this.apiUrl}/bitacora`, actividad);
  }

  updateActividad(id: number, actividad: ActividadRequest): Observable<ActividadBitacora> {
    return this.http.put<ActividadBitacora>(`${this.apiUrl}/bitacora/${id}`, actividad);
  }

  deleteActividad(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/bitacora/${id}`);
  }

  // ========================
  // GESTIÓN DE ARCHIVOS
  // ========================

  uploadActividadImages(actividadId: number, files: File[]): Observable<any> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('imagenes', file);
    });
    return this.http.post(`${this.apiUrl}/bitacora/${actividadId}/imagenes`, formData);
  }

  uploadActividadFiles(actividadId: number, files: File[]): Observable<any> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('archivos', file);
    });
    return this.http.post(`${this.apiUrl}/bitacora/${actividadId}/archivos`, formData);
  }

  deleteActividadImage(actividadId: number, filename: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/bitacora/${actividadId}/imagenes/${filename}`);
  }

  deleteActividadFile(actividadId: number, filename: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/bitacora/${actividadId}/archivos/${filename}`);
  }

  getActividadImageUrl(filename: string): string {
    return `${this.apiUrl}/bitacora/imagenes/${filename}`;
  }

  getActividadFileUrl(filename: string): string {
    return `${this.apiUrl}/bitacora/archivos/${filename}`;
  }

  // ========================
  // ESTADÍSTICAS Y REPORTES
  // ========================

  getEstadisticas(usuarioId?: number, fechaInicio?: string, fechaFin?: string): Observable<EstadisticasBitacora> {
    let url = `${this.apiUrl}/bitacora/estadisticas?`;
    if (usuarioId) url += `usuarioId=${usuarioId}&`;
    if (fechaInicio) url += `fechaInicio=${fechaInicio}&`;
    if (fechaFin) url += `fechaFin=${fechaFin}`;
    return this.http.get<EstadisticasBitacora>(url);
  }

  // ========================
  // VALIDACIONES
  // ========================

  getImageValidationError(file: File): string | null {
    if (!this.ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return `Tipo de imagen no permitido. Use: ${this.ALLOWED_IMAGE_TYPES.join(', ')}`;
    }
    if (file.size > this.MAX_FILE_SIZE) {
      return `La imagen excede el tamaño máximo permitido (${this.MAX_FILE_SIZE / 1024 / 1024}MB)`;
    }
    return null;
  }

  getFileValidationError(file: File): string | null {
    const allAllowedTypes = [...this.ALLOWED_IMAGE_TYPES, ...this.ALLOWED_FILE_TYPES];
    if (!allAllowedTypes.includes(file.type)) {
      return `Tipo de archivo no permitido`;
    }
    if (file.size > this.MAX_FILE_SIZE) {
      return `El archivo excede el tamaño máximo permitido (${this.MAX_FILE_SIZE / 1024 / 1024}MB)`;
    }
    return null;
  }

  // ========================
  // UTILIDADES
  // ========================

  getColorPrioridad(prioridad: string): string {
    const p = this.PRIORIDADES.find(pr => pr.value === prioridad);
    return p ? p.color : '#6c757d';
  }

  formatDuracion(minutos: number): string {
    if (!minutos) return 'N/A';
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    if (horas > 0) {
      return `${horas}h ${mins}m`;
    }
    return `${mins}m`;
  }
}