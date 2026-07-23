import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

 
export interface SincronizarOtRequest {
  numeroOrden: string;
  oficinaId?: string;
  oficinaNombre?: string;
  clienteNombre?: string;
  chasis?: string;
  estado?: string;
  fechaSolicitud?: Date | string;
  usuarioCreacion?: string;
}
 
export interface SincronizarResultado {
  totalRecibidas: number;
  nuevasRegistradas: number;
  yaExistian: number;
  numerosRecienAparecen: string[];
}
 
export interface SeguimientoOt {
  id: number;
  numeroOrden: string;
  oficinaId?: string;
  oficinaNombre?: string;
  clienteNombre?: string;
  chasis?: string;
  estado?: string;
  fechaSolicitud?: Date;
  usuarioCreacion?: string;
  usuarioRegistro: string;
  recienAparece: boolean;
  fechaRegistro: Date;
  fechaActualizacion: Date;
  // ⭐️ [NUEVO] Última observación registrada (si existe)
  ultimaObservacion?: string;
  ultimaObservacionUsuario?: string;
  ultimaObservacionFecha?: Date;
}
 
export interface ObservacionOt {
  id: number;
  numeroOrden: string;
  observacion: string;
  usuario: string;
  fechaObservacion: Date;
  imagenes?: ImagenObservacionOt[];   // ⭐️ [NUEVO] esta línea es la que falta
}

export interface ImagenObservacionOt {
  id: number;
  nombreArchivo: string;
  fechaSubida?: Date;
}

@Injectable({ providedIn: 'root' })
export class SeguimientoOtService {
  // ⚠️ Ajusta esto al mismo patrón/base URL que usa GarantiasService
  private readonly baseUrl = 'https://bodega.vehicentro.com:1830/api/api/SeguimientoOt';

 
  constructor(private http: HttpClient) {}
 
  /**
   * Envía el lote de OTs pendientes recién cargadas para registrarlas
   * en el control (si no existen) sin duplicar las que ya existen.
   */
  sincronizar(usuarioRegistro: string, ordenes: SincronizarOtRequest[]): Observable<SincronizarResultado> {
    return this.http.post<SincronizarResultado>(`${this.baseUrl}/sincronizar`, {
      usuarioRegistro,
      ordenes
    });
  }
 
  obtenerTodos(oficina?: string, recienAparece?: boolean): Observable<SeguimientoOt[]> {
    let params = new HttpParams();
    if (oficina) params = params.set('oficina', oficina);
    if (recienAparece !== undefined) params = params.set('recienAparece', String(recienAparece));
    return this.http.get<SeguimientoOt[]>(this.baseUrl, { params });
  }
 
  agregarObservacion(numeroOrden: string, observacion: string, usuario: string): Observable<ObservacionOt> {
    return this.http.post<ObservacionOt>(
      `${this.baseUrl}/${encodeURIComponent(numeroOrden)}/observaciones`,
      { observacion, usuario }
    );
  }
 
  obtenerObservaciones(numeroOrden: string): Observable<ObservacionOt[]> {
    return this.http.get<ObservacionOt[]>(
      `${this.baseUrl}/${encodeURIComponent(numeroOrden)}/observaciones`
    );
  }

agregarObservacionConImagenes(
    numeroOrden: string,
    observacion: string,
    usuario: string,
    imagenes: File[]
  ): Observable<ObservacionOt> {
    const formData = new FormData();
    formData.append('observacion', observacion);
    formData.append('usuario', usuario);
    imagenes.forEach(archivo => formData.append('imagenes', archivo, archivo.name));
 
    // ⚠️ NO establecer Content-Type manualmente: el navegador lo hace
    // (multipart/form-data con boundary) al enviar FormData.
    return this.http.post<ObservacionOt>(
      `${this.baseUrl}/${encodeURIComponent(numeroOrden)}/observaciones-con-imagenes`,
      formData
    );
  }
 
  /**
   * ⭐️ [NUEVO] URL pública desde donde el backend sirve una imagen de evidencia.
   * Se usa directamente en el atributo [src] de las miniaturas.
   */
  urlImagenObservacion(imagenId: number): string {
    return `${this.baseUrl}/observaciones/imagenes/${imagenId}`;
  }

}