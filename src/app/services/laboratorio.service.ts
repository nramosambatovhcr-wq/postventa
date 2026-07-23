import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SoporteRequest {
  codigo: string;
  descripcion: string;
  observacion: string;
  vim?: string;
  color?: string;
  modelo?: string;
  tipoSoporte?: string;
  origen?: string;
  destino?: string;
  fechaingreso?: Date;
  fechaentrega?: Date;
  usuarioCrea: number;
  usuarioRepara?: number;
  usuarioEntrega?: number;
  estado?: string;
}

export interface Soporte {
  id: number;
  codigo: string;
  descripcion: string;
  observacion: string;
  vim?: string;
  color?: string;
  modelo?: string;
  tiposoporte?: string;
  origen?: string;
  destino?: string;
  fechaingreso?: Date;
  fechaentrega?: Date;
  fecha_recepcion?: Date | string | null;
  fecha_calibracion?: Date | string | null;
  usuariocrea: number;
  usuariorepara?: number;
  usuarioentrega?: number;
  usuariocrea_nombre?: string;
  usuariorepara_nombre?: string;
  usuarioentrega_nombre?: string;
  estado?: string;
  imagenes?: string[];
}

/** Usuario/mecánico devuelto por /Laboratorio/disponibles */
export interface UsuarioDisponible {
  id: number;
  idimportaciones: number;
  nombre_usuario?: string;
  nombre?: string;
  [key: string]: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  id?: number;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  imageIds: number[];
  fileNames: string[];
}

@Injectable({
  providedIn: 'root'
})
export class LaboratorioService {
  private baseUrl = 'https://bodega.vehicentro.com:1830/api/api'; // Ajusta según tu configuración
  private soporteUrl = `${this.baseUrl}/SoporteLab`;
  private laboratorioUrl = `${this.baseUrl}/Laboratorio`;

  constructor(private http: HttpClient) { }

  // ========================
  // GESTIÓN DE SOPORTES
  // ========================

  /**
   * Crear un nuevo soporte
   */
  createSoporte(soporte: SoporteRequest): Observable<ApiResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<ApiResponse>(`${this.soporteUrl}/create-soporte`, soporte, { headers });
  }

  /**
   * Obtener todos los soportes con sus imágenes
   */
  getAllSoportes(): Observable<Soporte[]> {
    return this.http.get<Soporte[]>(`${this.soporteUrl}/soportes-all`);
  }

  /**
   * Obtener un soporte específico por ID
   */
  getSoporteById(id: number): Observable<Soporte> {
    return this.http.get<Soporte>(`${this.soporteUrl}/soporte/${id}`);
  }

   getSoportesByUsuarioCrea(idUsuarioCrea: number): Observable<Soporte[]> {
    return this.http.get<Soporte[]>(`${this.soporteUrl}/soporte/usuario/${idUsuarioCrea}`);
  }

  /**
   * Actualizar un soporte existente
   */
  updateSoporte(id: number, soporte: SoporteRequest): Observable<ApiResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.put<ApiResponse>(`${this.soporteUrl}/update-soporte/${id}`, soporte, { headers });
  }

  /**
   * Eliminar un soporte
   */
  deleteSoporte(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.soporteUrl}/delete-soporte/${id}`);
  }

  // ========================
  // FLUJO DE TALLER
  //   asignación -> recepción -> calibración -> entrega
  // ========================

  /**
   * Lista de mecánicos/usuarios disponibles para asignar.
   * NOTA: si tu endpoint "disponibles" NO vive en el controlador Laboratorio,
   * cambia `laboratorioUrl` por la ruta correcta.
   */
  getUsuariosParaAsignar(): Observable<UsuarioDisponible[]> {
    return this.http.get<UsuarioDisponible[]>(`${this.laboratorioUrl}/disponibles`);
  }

  /**
   * Asignar mecánico (PENDIENTE -> EN_PROCESO).
   */
  asignarMecanico(idSoporte: number, usuarioRepara: number): Observable<ApiResponse> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.patch<ApiResponse>(
      `${this.soporteUrl}/asignar-mecanico/${idSoporte}`,
      { usuarioRepara },
      { headers }
    );
  }

  /**
   * Registrar recepción (EN_PROCESO -> REPARANDO). usuarioRepara es opcional
   * (si se envía, confirma/establece el mecánico al momento de recibir).
   */
  recepcionSoporte(idSoporte: number, usuarioRepara?: number | null): Observable<ApiResponse> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.patch<ApiResponse>(
      `${this.soporteUrl}/recepcion/${idSoporte}`,
      { usuarioRepara: usuarioRepara ?? null },
      { headers }
    );
  }

  /**
   * Registrar calibración (REPARANDO -> COMPLETADO).
   */
  calibrarSoporte(idSoporte: number): Observable<ApiResponse> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.patch<ApiResponse>(
      `${this.soporteUrl}/calibracion/${idSoporte}`,
      {},
      { headers }
    );
  }

  /**
   * Registrar entrega (COMPLETADO -> ENTREGADO).
   */
  entregarSoporte(idSoporte: number, usuarioEntrega: number): Observable<ApiResponse> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.patch<ApiResponse>(
      `${this.soporteUrl}/entrega/${idSoporte}`,
      { usuarioEntrega },
      { headers }
    );
  }

  // ========================
  // GESTIÓN DE IMÁGENES
  // ========================

  /**
   * Subir imágenes para un soporte
   */
  uploadSoporteImages(idSoporte: number, files: File[]): Observable<UploadResponse> {
    const formData = new FormData();
    
    files.forEach(file => {
      formData.append('files', file, file.name);
    });

    return this.http.post<UploadResponse>(`${this.soporteUrl}/upload-soporte-image/${idSoporte}`, formData);
  }

  /**
   * Obtener URL de imagen de soporte
   */
  getSoporteImageUrl(filename: string): string {
    return `${this.soporteUrl}/soporte-images/${filename}`;
  }

  /**
   * Descargar imagen de soporte
   */
  getSoporteImage(filename: string): Observable<Blob> {
    return this.http.get(`${this.soporteUrl}/soporte-images/${filename}`, {
      responseType: 'blob'
    });
  }

  // ========================
  // MÉTODOS AUXILIARES
  // ========================

  /**
   * Filtrar soportes por estado
   */
  getSoportesByEstado(estado: string): Observable<Soporte[]> {
    return new Observable(observer => {
      this.getAllSoportes().subscribe({
        next: (soportes) => {
          const filtered = soportes.filter(soporte => 
            soporte.estado?.toLowerCase() === estado.toLowerCase()
          );
          observer.next(filtered);
          observer.complete();
        },
        error: (error) => observer.error(error)
      });
    });
  }

  /**
   * Buscar soportes por código o descripción
   */
  searchSoportes(searchTerm: string): Observable<Soporte[]> {
    return new Observable(observer => {
      this.getAllSoportes().subscribe({
        next: (soportes) => {
          const filtered = soportes.filter(soporte => 
            soporte.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            soporte.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
          );
          observer.next(filtered);
          observer.complete();
        },
        error: (error) => observer.error(error)
      });
    });
  }

  /**
   * Obtener soportes por usuario creador
   */
  getSoportesByUsuario(usuarioId: number): Observable<Soporte[]> {
    return new Observable(observer => {
      this.getAllSoportes().subscribe({
        next: (soportes) => {
          const filtered = soportes.filter(soporte => 
            soporte.usuariocrea === usuarioId
          );
          observer.next(filtered);
          observer.complete();
        },
        error: (error) => observer.error(error)
      });
    });
  }

  /**
   * Validar si existe un código de soporte
   */
  checkCodigoExists(codigo: string): Observable<boolean> {
    return new Observable(observer => {
      this.getAllSoportes().subscribe({
        next: (soportes) => {
          const exists = soportes.some(soporte => 
            soporte.codigo.toLowerCase() === codigo.toLowerCase()
          );
          observer.next(exists);
          observer.complete();
        },
        error: (error) => observer.error(error)
      });
    });
  }

  // ========================
  // MÉTODOS PARA REPORTES
  // ========================

  /**
   * Obtener estadísticas de soportes
   */
  getSoporteStats(): Observable<any> {
    return new Observable(observer => {
      this.getAllSoportes().subscribe({
        next: (soportes) => {
          const stats = {
            total: soportes.length,
            pendientes: soportes.filter(s => s.estado === 'PENDIENTE').length,
            enProceso: soportes.filter(s => s.estado === 'EN_PROCESO').length,
            completados: soportes.filter(s => s.estado === 'COMPLETADO').length,
            entregados: soportes.filter(s => s.estado === 'ENTREGADO').length,
            porEstado: this.groupByEstado(soportes),
            porUsuario: this.groupByUsuario(soportes)
          };
          observer.next(stats);
          observer.complete();
        },
        error: (error) => observer.error(error)
      });
    });
  }

  /**
   * Obtener soportes por rango de fechas
   */
  getSoportesByDateRange(fechaInicio: Date, fechaFin: Date): Observable<Soporte[]> {
    return new Observable(observer => {
      this.getAllSoportes().subscribe({
        next: (soportes) => {
          const filtered = soportes.filter(soporte => {
            if (!soporte.fechaingreso) return false;
            const fecha = new Date(soporte.fechaingreso);
            return fecha >= fechaInicio && fecha <= fechaFin;
          });
          observer.next(filtered);
          observer.complete();
        },
        error: (error) => observer.error(error)
      });
    });
  }

  // ========================
  // MÉTODOS PRIVADOS
  // ========================

  private groupByEstado(soportes: Soporte[]): { [key: string]: number } {
    return soportes.reduce((acc, soporte) => {
      const estado = soporte.estado || 'SIN_ESTADO';
      acc[estado] = (acc[estado] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
  }

  private groupByUsuario(soportes: Soporte[]): { [key: number]: number } {
    return soportes.reduce((acc, soporte) => {
      const usuario = soporte.usuariocrea;
      acc[usuario] = (acc[usuario] || 0) + 1;
      return acc;
    }, {} as { [key: number]: number });
  }

  // ========================
  // MÉTODOS DE UTILIDAD
  // ========================

  /**
   * Crear objeto FormData para subida de archivos múltiples
   */
  createImageFormData(files: File[]): FormData {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append('files', file, file.name);
    });
    return formData;
  }

  /**
   * Validar formato de archivo de imagen
   */
  isValidImageFile(file: File): boolean {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    return allowedTypes.includes(file.type) && file.size <= maxSize;
  }

  /**
   * Obtener mensaje de error de validación de archivo
   */
  getFileValidationError(file: File): string | null {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      return `Tipo de archivo no permitido: ${file.type}. Solo se permiten: ${allowedTypes.join(', ')}`;
    }

    if (file.size > maxSize) {
      return `El archivo ${file.name} excede el tamaño máximo de 5MB`;
    }

    return null;
  }
}