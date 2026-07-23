import { HttpClient, HttpHeaders, HttpEvent, HttpEventType } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';

// Interfaz para los datos de un pedido PDI al crear o actualizar
export interface PedidoPdiData {
  Codigo: string;
  Descripcion: string;
  Observaciones?: string; // Optional
  Cantidad: number;
  Modelo?: string; // Optional
  Cliente?: string; // Optional
  Ot?: string; // Optional
  Chasis?: string;
  Estado?: string; // Optional, used in update
  Tipo?: string; // Optional, but set to 'pdi' by backend
  IdUsuarioCreacion: number;
  IdUsuarioModificacion: number;
}

// Interfaz para la respuesta de carga de Excel
export interface UploadExcelPdiResponse {
  success: number;
  failed: number;
  total: number;
  details?: Array<{
    row: number;
    status: 'success' | 'error';
    message: string;
    id?: number; // Added for successful inserts
    codigo?: string; // Added for context
    descripcion?: string; // Added for context
  }>;
}

// Interfaz para eventos de progreso de carga (usado para imágenes)
export interface UploadProgressEvent {
  loaded: number;
  total: number;
  percentage: number;
}

// Interfaz para las imágenes asociadas a un pedido PDI
export interface PedidoPdiImage {
  id_imagen: number;
  nombre_archivo: string;
  ruta_archivo: string;
  tipo_archivo: string;
  tamaño_kb: number;
  fecha_carga: string;
}

// Interfaz para los detalles completos de un pedido PDI
export interface PedidoPdiDetail {
  id_pedido: number;
  codigo: string;
  descripcion: string;
  cantidad: number;
  observaciones?: string;
  fecha_creacion: string;
  fecha_modificacion: string;
  id_usuario_creacion: number;
  id_usuario_modificacion: number;
  modelo?: string;
  cliente?: string;
  ot?: string;
  chasis?: string;
  estado?: string;
  tipo?: string;
  imagenes?: PedidoPdiImage[]; // Array of images
}
export interface PedidoPdiObservacion {
  idObservacion: number;
  mensaje: string;
  fechaCreacion: string; // Date string from backend
  usuario: string;
  imagenes: Array<{
    idImagen?: number;
    rutaImagen: string;
    nombreArchivo?: string;
    tipoArchivo?: string;
    tamañoKb?: number;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class PedidosPdiService {
  // URL base para la API del controlador PedidosPdi
  // Asegúrate de que esta URL coincida con la configuración de tu backend
  // url = 'https://localhost:7294'; // Ejemplo para desarrollo local
  url = 'https://bodega.vehicentro.com:1830/api'; // Ejemplo para ngrok u otro despliegue

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los pedidos PDI con estado 'PENDIENTE'.
   * @returns Observable con la lista de pedidos PDI.
   */
  getAllPedidosPdi(): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/api/PedidosPdi`)
      .pipe(
        catchError(this.handleError('getAllPedidosPdi', []))
      );
  }

    getPedidosPdiByUser(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/api/PedidosPdi/user/${id}`)
      .pipe(
        catchError(this.handleError('getPedidosPdiByUser', []))
      );
  }

revisadop(id:any) {
    return this.http.get<any>(`${this.url}/api/PedidosPdi/revuser=${id}`);
  }

  errorp(id:any) {
    return this.http.get<any>(`${this.url}/api/PedidosPdi/pederror=${id}`);
  }

   asignadop(id:any) {
    return this.http.get<any>(`${this.url}/api/PedidosPdi/asiguser=${id}`);
  }
  //proceuser
 procesop(id:any) {
    return this.http.get<any>(`${this.url}/api/PedidosPdi/proceuser=${id}`);
  }

  getAllPedidosPdiPro(): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/api/PedidosPdi/proceso`)
      .pipe(
        catchError(this.handleError('getAllPedidosPdi', []))
      );
  }

  getAllPedidosPdiAsig(): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/api/PedidosPdi/asignado`)
      .pipe(
        catchError(this.handleError('getAllPedidosPdi', []))
      );
  }

  getAllPedidosRev(): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/api/PedidosPdi/revisado`)
      .pipe(
        catchError(this.handleError('getAllPedidosPdi', []))
      );
  }

  /**
   * Obtiene un pedido PDI específico por su ID, incluyendo sus imágenes.
   * @param id ID del pedido PDI a obtener.
   * @returns Observable con los datos del pedido PDI y sus imágenes.
   */
  getPedidoPdiById(id: number): Observable<PedidoPdiDetail> {
    return this.http.get<PedidoPdiDetail>(`${this.url}/api/PedidosPdi/${id}`)
      .pipe(
        catchError(this.handleError<PedidoPdiDetail>('getPedidoPdiById'))
      );
  }

  /**
   * Crea un nuevo pedido PDI.
   * @param pedidoData Datos del pedido PDI a crear.
   * @returns Observable con la respuesta del servidor.
   */
  createPedidoPdi(pedidoData: PedidoPdiData): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<any>(`${this.url}/api/PedidosPdi`, pedidoData, { headers })
      .pipe(
        catchError(this.handleError<any>('createPedidoPdi'))
      );
  }

  /**
   * Actualiza un pedido PDI existente.
   * @param id ID del pedido PDI a actualizar.
   * @param pedidoData Datos actualizados del pedido PDI.
   * @returns Observable con la respuesta del servidor.
   */
  updatePedidoPdi(id: number, pedidoData: PedidoPdiData): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put<any>(`${this.url}/api/PedidosPdi/${id}`, pedidoData, { headers })
      .pipe(
        catchError(this.handleError<any>('updatePedidoPdi'))
      );
  }

  /**
   * Elimina un pedido PDI y sus imágenes asociadas.
   * @param id ID del pedido PDI a eliminar.
   * @returns Observable con la respuesta del servidor.
   */
  deletePedidoPdi(id: number): Observable<any> {
    return this.http.delete<any>(`${this.url}/api/PedidosPdi/${id}`)
      .pipe(
        catchError(this.handleError<any>('deletePedidoPdi'))
      );
  }

  /**
   * Sube una o varias imágenes para un pedido PDI específico.
   * @param pedidoId ID del pedido PDI al que se asociarán las imágenes.
   * @param files Lista de archivos de imagen a subir.
   * @param trackProgress Opcional: Si se debe rastrear el progreso de la carga.
   * @returns Observable con la respuesta del servidor o eventos de progreso.
   */
  uploadImagesPdi(pedidoId: number, files: File[], trackProgress: boolean = false): Observable<any | UploadProgressEvent> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file, file.name));

    const options: any = {
      reportProgress: trackProgress,
      observe: trackProgress ? 'events' : 'response'
    };

    return this.http.post<any>(`${this.url}/api/PedidosPdi/images/upload/${pedidoId}`, formData, options)
      .pipe(
        map(event => {
          if (trackProgress && event.type === HttpEventType.UploadProgress) {
            const progress: UploadProgressEvent = {
              loaded: event.loaded,
              total: event.total || 0,
              percentage: Math.round(100 * (event.loaded / (event.total || 1)))
            };
            return progress;
          }
          if (event.type === HttpEventType.Response) {
            return event.body;
          }
          return event;
        }),
        catchError(this.handleError<any>('uploadImagesPdi'))
      );
  }

  /**
   * Obtiene una imagen específica de un pedido PDI.
   * @param filename Nombre del archivo de la imagen.
   * @returns Observable con el blob de la imagen.
   */
  getImagePdi(filename: string): Observable<Blob> {
    return this.http.get(`${this.url}/api/PedidosPdi/images/${filename}`, { responseType: 'blob' })
      .pipe(
        catchError(this.handleError<Blob>('getImagePdi'))
      );
  }

  /**
   * Sube y procesa un archivo Excel para crear múltiples pedidos PDI.
   * @param excelFile El archivo Excel a subir.
   * @param idUsuario ID del usuario que realiza la carga.
   * @returns Observable con el resultado del procesamiento del Excel.
   */
  uploadExcelPdi(excelFile: File, idUsuario: number): Observable<UploadExcelPdiResponse> {
    const formData = new FormData();
    formData.append('excelFile', excelFile, excelFile.name);
    formData.append('idUsuario', idUsuario.toString());

    return this.http.post<UploadExcelPdiResponse>(`${this.url}/api/PedidosPdi/upload-excel`, formData)
      .pipe(
        timeout(60000), // Timeout para archivos grandes
        catchError(this.handleError<UploadExcelPdiResponse>('uploadExcelPdi'))
      );
  }

  /**
   * Manejador de errores centralizado.
   * @param operation Nombre de la operación que falló.
   * @param result Valor opcional a devolver como resultado del observable.
   * @returns Una función que devuelve un Observable con un error.
   */
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: HttpErrorResponse): Observable<T> => {
      console.error(`${operation} failed:`, error);

      let errorMessage = 'An unknown error occurred!';
      if (error.error instanceof ErrorEvent) {
        // Client-side or network error
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Backend returned an unsuccessful response code.
        // The response body may contain clues as to what went wrong.
        errorMessage = `Server returned code ${error.status}, body was: ${JSON.stringify(error.error)}`;
        if (error.error && error.error.message) {
          errorMessage = error.error.message; // Use backend message if available
        }
      }

      // Return an observable with a user-facing error message.
      return throwError(() => new Error(errorMessage));
    };
  }

  getObservacionesPdi(idPedido: number): Observable<PedidoPdiObservacion[]> {
    return this.http.get<PedidoPdiObservacion[]>(`${this.url}/api/PedidosPdiObservaciones/${idPedido}`)
      .pipe(
        catchError(this.handleError<PedidoPdiObservacion[]>('getObservacionesPdi', []))
      );
  }

  /**
   * Adds a new observation to a PDI order, with optional image attachments.
   * @param formData FormData containing idPedido, mensaje, usuario, and 'imagenes' files.
   * @returns An Observable with the backend response.
   */
  addObservacionPdi(formData: FormData): Observable<any> {
    // Note: When sending FormData, Angular's HttpClient automatically sets
    // the 'Content-Type' header to 'multipart/form-data' with the correct boundary.
    // Do NOT set it manually here, as it will break the request.
    return this.http.post<any>(`${this.url}/api/PedidosPdiObservaciones`, formData)
      .pipe(
        catchError(this.handleError<any>('addObservacionPdi'))
      );
  }

  /**
   * Retrieves a specific observation image as a Blob.
   * @param filename The name of the image file.
   * @returns An Observable with the image Blob.
   */
  getImagenObservacionPdi(filename: string): Observable<Blob> {
    return this.http.get(`${this.url}/api/PedidosPdiObservaciones/imagen/${filename}`, { responseType: 'blob' })
      .pipe(
        catchError(this.handleError<Blob>('getImagenObservacionPdi'))
      );
  }
}
