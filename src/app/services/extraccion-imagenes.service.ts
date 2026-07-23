import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

// ========================
// TIPOS
// ========================
export type TipoExtraccion = 'BOD' | 'REPUESTO';
export type MomentoImagen = 'RECEPCION' | 'ESTADO' | 'ENTREGA';

export interface ImagenExtraccion {
  id: number;
  momento: MomentoImagen;
  nombreOriginal: string | null;
  contentType?: string | null;
  tamanoBytes?: number | null;
  fechaSubida?: string;
  subidoPor?: string | null;
  url: string; // URL absoluta lista para usar en <img src="...">
}

// Respuesta del GET (agrupada por momento)
export interface ImagenesAgrupadas {
  recepcion: ImagenExtraccion[];
  estado: ImagenExtraccion[];
  entrega: ImagenExtraccion[];
}

// Respuesta del POST /upload
export interface UploadImagenesResponse {
  mensaje: string;
  imagenes: {
    id: number;
    momento: MomentoImagen;
    nombreOriginal: string;
    url: string;
  }[];
}

export interface UploadImagenesPayload {
  tipoExtraccion: TipoExtraccion;
  extraccionId: number;
  momento: MomentoImagen;
  archivos: File[];
  subidoPor?: string;
}

// ========================
// SERVICE
// ========================
@Injectable({
  providedIn: 'root'
})
export class ExtraccionImagenesService {
  private readonly baseUrl =
    'https://bodega.vehicentro.com:1830/api/api/ExtraccionImagenes'; // ← cambia si tu URL varía

  constructor(private http: HttpClient) {}

  // -------- SUBIR (una o varias imágenes) --------
  upload(payload: UploadImagenesPayload): Observable<UploadImagenesResponse> {
    const form = new FormData();
    form.append('tipoExtraccion', payload.tipoExtraccion);
    form.append('extraccionId', String(payload.extraccionId));
    form.append('momento', payload.momento);
    // El nombre 'archivos' debe coincidir con List<IFormFile> archivos del backend
    payload.archivos.forEach(archivo => form.append('archivos', archivo, archivo.name));
    if (payload.subidoPor) form.append('subidoPor', payload.subidoPor);

    return this.http
      .post<UploadImagenesResponse>(`${this.baseUrl}/upload`, form)
      .pipe(
        timeout(60000),
        catchError(this.handleError)
      );
  }

  // -------- LISTAR imágenes de un registro (agrupadas) --------
  getByExtraccion(
    tipoExtraccion: TipoExtraccion,
    extraccionId: number
  ): Observable<ImagenesAgrupadas> {
    const params = new HttpParams()
      .set('tipoExtraccion', tipoExtraccion)
      .set('extraccionId', String(extraccionId));

    return this.http
      .get<ImagenesAgrupadas>(this.baseUrl, { params })
      .pipe(
        timeout(60000),
        catchError(this.handleError)
      );
  }

  // -------- BORRAR una imagen --------
  delete(id: number): Observable<{ mensaje: string; id: number }> {
    return this.http
      .delete<{ mensaje: string; id: number }>(`${this.baseUrl}/${id}`)
      .pipe(
        timeout(60000),
        catchError(this.handleError)
      );
  }

  // -------- HELPER: URL directa al binario --------
  // El backend ya devuelve 'url' en cada imagen, pero este helper sirve
  // si solo tienes el id (p. ej. para construir un <img> manualmente).
  getArchivoUrl(id: number): string {
    return `${this.baseUrl}/archivo/${id}`;
  }

  // -------- MANEJO DE ERRORES --------
  private handleError(error: any) {
    let mensaje = 'Error al procesar las imágenes';
    if (error?.error?.message) mensaje = error.error.message;
    else if (typeof error?.error === 'string') mensaje = error.error;
    else if (error?.message) mensaje = error.message;
    return throwError(() => new Error(mensaje));
  }
}