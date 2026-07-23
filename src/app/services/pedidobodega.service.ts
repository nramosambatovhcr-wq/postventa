import { HttpClient, HttpHeaders, HttpEvent, HttpEventType, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';


export interface PedidoData {
  Codigo: string;
  Descripcion: string;
  Cantidad: number;
  Modelo: string;
  Cliente: string;
  Ot: string;
  Observaciones: string;
  Tipo: string;
  IdUsuarioCreacion: number;
  IdUsuarioModificacion: number;
}

interface UploadExcelResponse {
  success: number;
  failed: number;
  message: string;
  details?: Array<{
    row: number;
    status: 'success' | 'error';
    message: string;
  }>;
}

export interface UploadProgressEvent {
  loaded: number;
  total: number;
  percentage: number;
}


export interface CommentImage {
  idImagen: number;
  idObservacion: number;
  rutaImagen: string;
  nombreArchivo: string;
  tipoArchivo: string;
  tamanoKb: number;
  fechaSubida: string;
}

// Interfaz para los comentarios/observaciones del pedido
export interface CommentDetail {
  idObservacion: number;
  idPedido: number;
  mensaje: string;
  fechaCreacion: string;
  usuario: string;
  commentImages: CommentImage[];
}

// Interfaz para las imágenes del pedido principal
export interface PedidoImage {
  idImagen: number;
  nombreArchivo: string;
  rutaArchivo: string;
  tipoArchivo: string;
  tamanoKb: number;
  fechaCarga: string;
}

// Interfaz principal para los detalles del pedido
export interface PedidoDetail {
  // Campos obligatorios
  idPedido: number;
  fechaCreacion: string;
  idUsuarioCreacion: number;
  cantidad: number;
  nombreUsuarioCreacion: string;
  apellidoUsuarioCreacion: string;
  
  // Campos opcionales
  codigo?: string;
  descripcion?: string;
  observaciones?: string;
  fechaModificacion?: string;
  idUsuarioModificacion?: number;
  modelo?: string;
  cliente?: string;
  ot?: string;
  estado?: string;
  tipo?: string;
  
  // Arrays relacionados
  pedidoImages: PedidoImage[];
  comentarios: CommentDetail[];
}

// Interfaz para crear un nuevo comentario (payload)
export interface CreateCommentPayload {
  pedidoId: number;
  userId: number;
  mensaje: string;
  images?: File[];
}

// Interfaz para la respuesta de la API al crear comentario
export interface CreateCommentResponse {
  success: boolean;
  message: string;
  commentId?: number;
}

// Enum para estados del pedido (opcional, si tienes estados definidos)
export enum PedidoEstado {
  PENDIENTE = 'PENDIENTE',
  EN_PROCESO = 'EN_PROCESO',
  COMPLETADO = 'COMPLETADO',
  CANCELADO = 'CANCELADO'
}

// Enum para tipos de pedido (opcional)
export enum PedidoTipo {
  PRODUCCION = 'PRODUCCION',
  MANTENIMIENTO = 'MANTENIMIENTO',
  REPARACION = 'REPARACION'
}


export interface Estadisticas {
  total_carros: number;
  total_partes_revisadas: number;
  total_partes_pendientes: number;
  total_partes: number;
}

export interface EstadisticasPorLinea {
  linea_id: number;
  linea_codigo: string;
  linea_nombre: string;
  total_carros: number;
  total_partes_revisadas: number;
  total_partes_pendientes: number;
  total_partes: number;
}

export interface Linea {
  id: number;
  codigo: string;
  nombre: string;
}

@Injectable({
  providedIn: 'root'
})
export class PedidobodegaService {
  // URL base para la API
  //url = 'https://localhost:7294';
  url = 'https://bodega.vehicentro.com:1830/api';
  
  constructor(private http: HttpClient) {}

  /**
   * Crea un nuevo pedido en la bodega (para importación masiva desde Excel)
   * @param pedidoData Datos del pedido a crear
   * @returns Observable con la respuesta del servidor
   */
  createPedido(pedidoData: PedidoData): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<any>(`${this.url}/api/PedidosWeb`, pedidoData, { headers })
      .pipe(
        map(response => {
          return response;
        }),
        catchError(error => {
          console.error('Error al crear pedido:', error);
          
          // Si el servidor devuelve un mensaje de error específico
          if (error.error && typeof error.error === 'object') {
            return throwError(() => error);
          }
          
          // Error genérico o de red
          return throwError(() => ({
            error: 'Error al procesar el pedido. Verifique la conexión o inténtelo más tarde.'
          }));
        })
      );
  }

  createSugerido1(pedido: any) {
    return this.http.post(`${this.url}/api/laboratorio/sugerido`, pedido);
  }

  createSugerido(pedidoData: PedidoData): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<any>(`${this.url}/api/PedidosWeb/suge`, pedidoData, { headers })
      .pipe(
        map(response => {
          return response;
        }),
        catchError(error => {
          console.error('Error al crear sugerido:', error);
          
          // Si el servidor devuelve un mensaje de error específico
          if (error.error && typeof error.error === 'object') {
            return throwError(() => error);
          }
          
          // Error genérico o de red
          return throwError(() => ({
            error: 'Error al procesar el sugerido. Verifique la conexión o inténtelo más tarde.'
          }));
        })
      );
  }
   createLabSugerido(pedidoData: PedidoData): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<any>(`${this.url}/api/Laboratorio/sugerido`, pedidoData, { headers })
      .pipe(
        map(response => {
          return response;
        }),
        catchError(error => {
          console.error('Error al crear sugerido:', error);
          
          // Si el servidor devuelve un mensaje de error específico
          if (error.error && typeof error.error === 'object') {
            return throwError(() => error);
          }
          
          // Error genérico o de red
          return throwError(() => ({
            error: 'Error al procesar el sugerido. Verifique la conexión o inténtelo más tarde.'
          }));
        })
      );
  }


  createPedido1(pedidoData: PedidoData): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<any>(`${this.url}/api/Pedidos/create`, pedidoData, { headers })
      .pipe(
        map(response => {
          return response;
        }),
        catchError(error => {
          console.error('Error al crear pedido:', error);
          
          // Si el servidor devuelve un mensaje de error específico
          if (error.error && typeof error.error === 'object') {
            return throwError(() => error);
          }
          
          // Error genérico o de red
          return throwError(() => ({
            error: 'Error al procesar el pedido. Verifique la conexión o inténtelo más tarde.'
          }));
        })
      );
  }
  
  uploadExcelImage(formData: FormData): Observable<UploadExcelResponse> {
    // No establecer Content-Type manualmente para FormData
    // Angular y el navegador lo manejarán automáticamente con el boundary correcto
    const headers = new HttpHeaders({
      // Aquí puedes agregar otros headers si es necesario, como Authorization
      // 'Authorization': `Bearer ${token}`
    });

    return this.http.post<UploadExcelResponse>(
      `${this.url}/api/PedidosWeb/upload-excel1`, 
      formData,
      { headers }
    );
  }

  uploadExcelSu(formData: FormData): Observable<any> {
  // No es necesario establecer Content-Type manualmente para FormData.
  // Angular y el navegador lo manejarán automáticamente con el boundary correcto.
  const headers = new HttpHeaders({
    // Aquí puedes agregar otros headers si es necesario, como Authorization.
    // Por ejemplo, para un token de autenticación:
    // 'Authorization': `Bearer ${yourAuthToken}`
  });

  return this.http.post<any>(
    `${this.url}/api/PedidosWeb/suge-excel1`,
    formData,
    { headers }
  );
}

  uploadExcelLabSu(formData: FormData): Observable<any> {
  // No es necesario establecer Content-Type manualmente para FormData.
  // Angular y el navegador lo manejarán automáticamente con el boundary correcto.
  const headers = new HttpHeaders({
    // Aquí puedes agregar otros headers si es necesario, como Authorization.
    // Por ejemplo, para un token de autenticación:
    // 'Authorization': `Bearer ${yourAuthToken}`
  });

  return this.http.post<any>(
    `${this.url}/api/Laboratorio/suge-excel1`,
    formData,
    { headers }
  );
}

  /**
   * Sube imágenes asociadas a un pedido específico
   * @param pedidoId ID del pedido al que se asociarán las imágenes
   * @param formData FormData con los archivos a subir
   * @param trackProgress Opcional: Si se debe rastrear el progreso de la carga
   * @returns Observable con la respuesta del servidor o eventos de progreso
   */
  uploadImages(pedidoId: number, formData: FormData, trackProgress: boolean = false): Observable<any> {
    // Añadir el ID del pedido al FormData si es necesario para el backend
    formData.append('pedidoId', pedidoId.toString());
    
    // Opciones para la solicitud HTTP
    const options: any = {
      headers: new HttpHeaders({
        // No establecer Content-Type aquí, el navegador lo establecerá con el boundary correcto
      }),
      reportProgress: trackProgress,
      observe: trackProgress ? 'events' : 'response'
    };

    return this.http.post<any>(`${this.url}/api/PedidosWeb/images/subir/${pedidoId}`, formData, options)
      .pipe(
        map(event => {
          // Si estamos rastreando el progreso, devolver información sobre el progreso
          if (trackProgress && event.type === HttpEventType.UploadProgress) {
            const progress: UploadProgressEvent = {
              loaded: event.loaded,
              total: event.total || 0,
              percentage: Math.round(100 * (event.loaded / (event.total || 1)))
            };
            return progress;
          }
          
          // Si es la respuesta final, devolver solo el cuerpo de la respuesta
          if (event.type === HttpEventType.Response) {
            return event.body;
          }
          
          // Para otros tipos de eventos, simplemente devolver el evento
          return event;
        }),
        catchError(error => {
          console.error(`Error al subir imágenes para el pedido ID ${pedidoId}:`, error);
          
          // Formatear el mensaje de error de manera amigable
          let errorMsg = 'Error al subir imágenes';
          if (error.error && error.error.message) {
            errorMsg = error.error.message;
          } else if (error.message) {
            errorMsg = error.message;
          }
          
          return throwError(() => ({ message: errorMsg }));
        })
      );
  }

  uploadSugeImages(pedidoId: number, formData: FormData, trackProgress: boolean = false): Observable<any> {
    // Añadir el ID del pedido al FormData si es necesario para el backend
    formData.append('pedidoId', pedidoId.toString());
    
    // Opciones para la solicitud HTTP
    const options: any = {
      headers: new HttpHeaders({
        // No establecer Content-Type aquí, el navegador lo establecerá con el boundary correcto
      }),
      reportProgress: trackProgress,
      observe: trackProgress ? 'events' : 'response'
    };

    return this.http.post<any>(`${this.url}/api/PedidosWeb/images/suge/${pedidoId}`, formData, options)
      .pipe(
        map(event => {
          // Si estamos rastreando el progreso, devolver información sobre el progreso
          if (trackProgress && event.type === HttpEventType.UploadProgress) {
            const progress: UploadProgressEvent = {
              loaded: event.loaded,
              total: event.total || 0,
              percentage: Math.round(100 * (event.loaded / (event.total || 1)))
            };
            return progress;
          }
          
          // Si es la respuesta final, devolver solo el cuerpo de la respuesta
          if (event.type === HttpEventType.Response) {
            return event.body;
          }
          
          // Para otros tipos de eventos, simplemente devolver el evento
          return event;
        }),
        catchError(error => {
          console.error(`Error al subir imágenes para el sugerido ID ${pedidoId}:`, error);
          
          // Formatear el mensaje de error de manera amigable
          let errorMsg = 'Error al subir imágenes';
          if (error.error && error.error.message) {
            errorMsg = error.error.message;
          } else if (error.message) {
            errorMsg = error.message;
          }
          
          return throwError(() => ({ message: errorMsg }));
        })
      );
  }

   uploadLabSugeImages(pedidoId: number, formData: FormData, trackProgress: boolean = false): Observable<any> {
    // Añadir el ID del pedido al FormData si es necesario para el backend
    formData.append('pedidoId', pedidoId.toString());
    
    // Opciones para la solicitud HTTP
    const options: any = {
      headers: new HttpHeaders({
        // No establecer Content-Type aquí, el navegador lo establecerá con el boundary correcto
      }),
      reportProgress: trackProgress,
      observe: trackProgress ? 'events' : 'response'
    };

    return this.http.post<any>(`${this.url}/api/Laboratorio/images/suge/${pedidoId}`, formData, options)
      .pipe(
        map(event => {
          // Si estamos rastreando el progreso, devolver información sobre el progreso
          if (trackProgress && event.type === HttpEventType.UploadProgress) {
            const progress: UploadProgressEvent = {
              loaded: event.loaded,
              total: event.total || 0,
              percentage: Math.round(100 * (event.loaded / (event.total || 1)))
            };
            return progress;
          }
          
          // Si es la respuesta final, devolver solo el cuerpo de la respuesta
          if (event.type === HttpEventType.Response) {
            return event.body;
          }
          
          // Para otros tipos de eventos, simplemente devolver el evento
          return event;
        }),
        catchError(error => {
          console.error(`Error al subir imágenes para el sugerido ID ${pedidoId}:`, error);
          
          // Formatear el mensaje de error de manera amigable
          let errorMsg = 'Error al subir imágenes';
          if (error.error && error.error.message) {
            errorMsg = error.error.message;
          } else if (error.message) {
            errorMsg = error.message;
          }
          
          return throwError(() => ({ message: errorMsg }));
        })
      );
  }

  /**
   * Obtiene todas las imágenes asociadas a un pedido
   * @param pedidoId ID del pedido
   * @returns Observable con la lista de URLs de imágenes
   */
  getImagesByPedidoId(pedidoId: number): Observable<string[]> {
    return this.http.get<string[]>(`${this.url}/api/Pedidos/${pedidoId}/images`)
      .pipe(
        catchError(error => {
          console.error(`Error al obtener imágenes del pedido ID ${pedidoId}:`, error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Elimina una imagen específica de un pedido
   * @param pedidoId ID del pedido
   * @param imageId ID de la imagen a eliminar
   * @returns Observable con la respuesta del servidor
   */
  deleteImage(pedidoId: number, imageId: string): Observable<any> {
    return this.http.delete<any>(`${this.url}/api/Pedidos/${pedidoId}/images/${imageId}`)
      .pipe(
        catchError(error => {
          console.error(`Error al eliminar imagen ID ${imageId} del pedido ID ${pedidoId}:`, error);
          return throwError(() => error);
        })
      );
  }

  
  pedidos() {
    return this.http.get<any>(`${this.url}/api/Pedidos`);
  }

  clocal() {
    return this.http.get<any>(`${this.url}/api/Pedidos/clocal`);
  }
   
  asignarProveedor(formData: FormData): Observable<any> {
        // La URL debe apuntar al endpoint de tu API que maneja la asignación de proveedor.
        // Ejemplo: /api/pedidos/asignar-proveedor
        return this.http.post(`${this.url}/api/pedidos/asignar-proveedor`, formData);
    }

  pedidosasignado() {
    return this.http.get<any>(`${this.url}/api/Pedidos/asignado`);
  }
  pedidosenviado() {
    return this.http.get<any>(`${this.url}/api/Pedidos/enviado`);
  }
   pedidosprocesado() {
    return this.http.get<any>(`${this.url}/api/Pedidos/proceso`);
  }
  getPedidoDetails(pedidoId: number): Observable<PedidoDetail> {
  // Corregir la URL - faltaba '/api' en la ruta
  return this.http.get<PedidoDetail>(`${this.url}/api/PedidosWeb/${pedidoId}/details`);
}


  // Método para agregar comentario con imágenes
  addComment(formData: FormData): Observable<any> {
    return this.http.post(`${this.url}/Pedidos/observaciones`, formData);
  }

  // Métodos existentes que podrías mantener para compatibilidad
  getCommentsForPedido(pedidoId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/pedidos/${pedidoId}/comments`);
  }

  // Método alternativo para agregar comentario (versión anterior)
  addCommentLegacy(commentPayload: any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    return this.http.post(`${this.url}/comments`, commentPayload, { headers });
  }
  pedidosbyuser(id:any) {
    return this.http.get<any>(`${this.url}/api/PedidosWeb/user=${id}`);
  }

pedidosbyagencia(agencia: string) {
  const params = new HttpParams().set('agencia', agencia);
  return this.http.get<any>(`${this.url}/api/PedidosWeb/taller`, { params });
}
pedidosbyagenciapro(agencia: string) {
  const params = new HttpParams().set('agencia', agencia);
  return this.http.get<any>(`${this.url}/api/PedidosWeb/tallerpro`, { params });
}
pedidosbyagenciaasig(agencia: string) {
  const params = new HttpParams().set('agencia', agencia);
  return this.http.get<any>(`${this.url}/api/PedidosWeb/tallerasig`, { params });
}
pedidosbyagenciarev(agencia: string) {
  const params = new HttpParams().set('agencia', agencia);
  return this.http.get<any>(`${this.url}/api/PedidosWeb/tallerfin`, { params });
}
pedidosbyagenciaerror(agencia: string) {
  const params = new HttpParams().set('agencia', agencia);
  return this.http.get<any>(`${this.url}/api/PedidosWeb/tallererror`, { params });
}


  sugeridosbyuser(id:any) {
    return this.http.get<any>(`${this.url}/api/PedidosWeb/users=${id}`);
  }

sugeridoslabbyuser(id:any) {
    return this.http.get<any>(`${this.url}/api/Laboratorio/users=${id}`);
  }
sugeridoslabuser() {
    return this.http.get<any>(`${this.url}/api/Laboratorio/sugeslab`);
  }
  sugeridos() {
    return this.http.get<any>(`${this.url}/api/PedidosWeb/sugerido`);
  }

  revisado() {
    return this.http.get<any>(`${this.url}/api/PedidosWeb/revisado`);
  }

  revisadop(id:any) {
    return this.http.get<any>(`${this.url}/api/PedidosWeb/revuser=${id}`);
  }

  //asiguser
 asignadop(id:any) {
    return this.http.get<any>(`${this.url}/api/PedidosWeb/asiguser=${id}`);
  }
  //proceuser
 procesop(id:any) {
    return this.http.get<any>(`${this.url}/api/PedidosWeb/proceuser=${id}`);
  }
  errorped(id:any) {
    return this.http.get<any>(`${this.url}/api/PedidosWeb/pederror=${id}`);
  }
  

  errosuge() {
    return this.http.get<any>(`${this.url}/api/PedidosWeb/error`);
  }
  errosuge1() {
    return this.http.get<any>(`${this.url}/api/PedidosWeb/sugrevuser`);
  }

  errosuge2(id:any) {
    return this.http.get<any>(`${this.url}/api/PedidosWeb/sugerror=${id}`);
  }
  revsuge1(id:any) {
    return this.http.get<any>(`${this.url}/api/PedidosWeb/sugrevuser=${id}`); 
  }

  pedidos1(): Observable<any> {
    return this.http.get(`${this.url}/api/Pedidos1`);
  }

  actualizarEstadoPedido1(id: number, pedido: any): Observable<any> {
    return this.http.put(`${this.url}/api/Pedidos/${id}`, pedido);
  }

  // Nuevos métodos para observaciones
  getObservacionesPedido(idPedido: number): Observable<any> {
    return this.http.get(`${this.url}/api/Pedidos/observaciones/${idPedido}`);
  }
 getObservacionesOilPedido(idPedido: number): Observable<any> {
    return this.http.get(`${this.url}/api/Pedidos/observacionesoil/${idPedido}`);
  }
   getObservacionesFilterPedido(idPedido: number): Observable<any> {
    return this.http.get(`${this.url}/api/Pedidos/observacionesfilter/${idPedido}`);
  }
    getObservacionesInsumosPedido(idPedido: number): Observable<any> {
    return this.http.get(`${this.url}/api/Pedidos/observacionesinsumos/${idPedido}`);
  }

getObservacionesVidriosPedido(idPedido: number): Observable<any> {
    return this.http.get(`${this.url}/api/Pedidos/observacionesvidrios/${idPedido}`);
  }

  addObservacion(formData: FormData): Observable<any> {
    return this.http.post(`${this.url}/api/Pedidos/observacion`, formData);
  }
   addObservacionOil(formData: FormData): Observable<any> {
    return this.http.post(`${this.url}/api/Pedidos/observacionoil`, formData);
  }
 addObservacionFilter(formData: FormData): Observable<any> {
    return this.http.post(`${this.url}/api/Pedidos/observacionfilter`, formData);
  }
  addObservacionInsumos(formData: FormData): Observable<any> {
    return this.http.post(`${this.url}/api/Pedidos/observacioninsumos`, formData);
  }

addObservacionVidrios(formData: FormData): Observable<any> {
    return this.http.post(`${this.url}/api/Pedidos/observacionvidrios`, formData);
  }

  getObservacionDetalle(idObservacion: number): Observable<any> {
    return this.http.get(`${this.url}/api/Pedidos1/observacion/${idObservacion}`);
  }

// Nuevo método para cargar un archivo Excel
uploadExcel(formData: FormData): Observable<any> {
  // No configures manualmente los encabezados para FormData
  // Deja que el navegador establezca automáticamente el Content-Type con el boundary correcto
  return this.http.post(`${this.url}/api/PedidosWeb/upload-excel`, formData)
    .pipe(
      // Añadir timeout para archivos grandes
      timeout(60000),
      // Manejo de errores para proporcionar mensajes más descriptivos
      catchError((error: HttpErrorResponse) => {
        console.error('Error en la carga del archivo Excel:', error);
        
        // Manejo específico del error 405 Method Not Allowed
        if (error.status === 405) {
          return throwError(() => new Error('El servidor no acepta este método en esta ruta. Verifique la configuración del backend.'));
        }
        
        // Para otros errores, usa el mensaje del servidor cuando sea posible
        const errorMsg = error.error?.message || error.message || 'Error al procesar el archivo';
        return throwError(() => new Error(errorMsg));
      })
    );
}



uploadExcelSuge(formData: FormData): Observable<any> {
  // No configures manualmente los encabezados para FormData
  // Deja que el navegador establezca automáticamente el Content-Type con el boundary correcto
  return this.http.post(`${this.url}/api/PedidosWeb/suge-excel`, formData)
    .pipe(
      // Añadir timeout para archivos grandes
      timeout(60000),
      // Manejo de errores para proporcionar mensajes más descriptivos
      catchError((error: HttpErrorResponse) => {
        console.error('Error en la carga del archivo Excel:', error);
        
        // Manejo específico del error 405 Method Not Allowed
        if (error.status === 405) {
          return throwError(() => new Error('El servidor no acepta este método en esta ruta. Verifique la configuración del backend.'));
        }
        
        // Para otros errores, usa el mensaje del servidor cuando sea posible
        const errorMsg = error.error?.message || error.message || 'Error al procesar el archivo';
        return throwError(() => new Error(errorMsg));
      })
    );
}
 
  revisados() {
    return this.http.get<any>(`${this.url}/api/Pedidos/rev`);
  }

   
  erroneos() {
    return this.http.get<any>(`${this.url}/api/Pedidos/error`);
  }

   
  laboratorio() {
    return this.http.get<any>(`${this.url}/api/Laboratorio`);
  }

   laboratorioid(id:any) {
    return this.http.get<any>(`${this.url}/api/Laboratorio/pendiente/${id}`);
  }

  
 
  laboratoriorev() {
    return this.http.get<any>(`${this.url}/api/Laboratorio/revisado`);
  }

   laboratoriorevcat(cat:any) {
    return this.http.get<any>(`${this.url}/api/Laboratorio/revisado/${cat}`);
  }

  laboratoriovehiall(id:any) {
    return this.http.get<any>(`${this.url}/api/Laboratorio/total=${id}`);
  }

   
  laboratoriovehi() {
    return this.http.get<any>(`${this.url}/api/Laboratorio/vehiculos`);
  }
  //https://localhost:7294/api/Laboratorio/vehiculos/27

  laboratoriovehiid(id:any) {
    return this.http.get<any>(`${this.url}/api/Laboratorio/vehiculos/${id}`);
  }

  getEstadisticasGenerales() {
    return this.http.get<Estadisticas>(`${this.url}/api/Laboratorio/estadisticas`);
  }

  // Obtener estadísticas de todas las líneas
  getEstadisticasPorLinea() {
    return this.http.get<EstadisticasPorLinea[]>(`${this.url}/api/Laboratorio/estadisticas/por-linea`);
  }

  // Obtener estadísticas de una línea específica
  getEstadisticasDeLinea(idLinea: number) {
    return this.http.get<EstadisticasPorLinea>(`${this.url}/api/Laboratorio/estadisticas/por-linea?idLinea=${idLinea}`);
  }

  // Obtener lista de líneas disponibles
  getLineas() {
    return this.http.get<Linea[]>(`${this.url}/api/Laboratorio/lineas`);
  }

  
  pedidosimg(user: number) {
    return this.http.get<any>(`${this.url}/api/Pedidos/user=` + user);
  }
 
  actualizarEstadoPedido(id: number, pedido: any): Observable<any> {
    return this.http.put<any>(`${this.url}/api/pedidos/${id}`, pedido)
      .pipe(
        catchError(error => {
          console.error(`Error al actualizar pedido ID ${id}:`, error);
          return throwError(() => error);
        })
      );
  }

    actualizarEstadoPedido2(id: number, pedido: any): Observable<any> {
    return this.http.put<any>(`${this.url}/api/pedidos/actualiza/${id}`, pedido)
      .pipe(
        catchError(error => {
          console.error(`Error al actualizar pedido ID ${id}:`, error);
          return throwError(() => error);
        })
      );
  }

  actualizarEstadoSugerido(id: number, pedido: any): Observable<any> {
    return this.http.put<any>(`${this.url}/api/PedidosWeb/${id}`, pedido)
      .pipe(
        catchError(error => {
          console.error(`Error al actualizar sugerido ID ${id}:`, error);
          return throwError(() => error);
        })
      );
  }

  
  actualizarEstadoLabRep(id: number, repuesto: any): Observable<any> {
    return this.http.put<any>(`${this.url}/api/Laboratorio/${id}`, repuesto)
      .pipe(
        catchError(error => {
          console.error(`Error al actualizar repuesto de laboratorio ID ${id}:`, error);
          return throwError(() => error);
        })
      );
  }

 
  deletePedido(id: number): Observable<any> {
    return this.http.delete<any>(`${this.url}/api/Pedidos/${id}`)
      .pipe(
        catchError(error => {
          console.error(`Error al eliminar pedido ID ${id}:`, error);
          return throwError(() => error);
        })
      );
  }

   
  getPedidoById(id: number): Observable<any> {
    return this.http.get<any>(`${this.url}/api/Pedidos/${id}`)
      .pipe(
        catchError(error => {
          console.error(`Error al obtener pedido ID ${id}:`, error);
          return throwError(() => error);
        })
      );
  }

 
  getPedidosByEstado(estado: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/api/Pedidos/estado/${estado}`)
      .pipe(
        catchError(error => {
          console.error(`Error al obtener pedidos con estado ${estado}:`, error);
          return throwError(() => error);
        })
      );
  }
}