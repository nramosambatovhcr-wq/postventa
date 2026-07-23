import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

// ══════════════════════════════════════════════════════════
// INTERFACES — DTOs de respuesta (espejo del backend)
// ══════════════════════════════════════════════════════════

export interface OtTecnico {
  numeroOt:      string;
  otId:          string;
  garantiaId:    string;
  estado:        EstadoGarantia;
  esUrgente:     boolean;
  placa:         string;
  numeroVin:     string;
  cliente:       string;
  fechaInicio:   string;
  actualizadoEn: string;
  totalArchivos: number;
}

export interface GarantiaJefe {
  garantiaId:             string;
  numeroOt:               string;
  estado:                 EstadoGarantia;
  esUrgente:              boolean;
  prioridad:              number;
  placa:                  string;
  numeroVin:              string;
  cliente:                string;
  tecnico:                string;
  fechaInicio:            string;
  motivoRechazo?:         string | null;
  ultimaRespuestaFabrica?: string | null;
  totalArchivos:          number;
  tieneDiagnostico:       boolean;
}

export interface GarantiaEncargado {
  garantiaId:             string;
  numeroOt:               string;
  estado:                 EstadoGarantia;
  placa:                  string;
  numeroVin:              string;
  cliente:                string;
  fechaFinalizacion?:     string | null;
  numeroTramiteSimscloud?: string | null;
  fechaEnvioSimscloud?:   string | null;
  respuestaFabrica?:      string | null;
  motivoRechazo?:         string | null;
}

export interface GarantiaDetalle {
  garantiaId:             string;
  estado:                 EstadoGarantia;
  esUrgente:              boolean;
  prioridad:              number;
  fechaInicio:            string;
  fechaEnvioJefe?:        string | null;
  fechaFinalizacion?:     string | null;
  fechaEnvioSimscloud?:   string | null;
  fechaRespuestaFabrica?: string | null;
  observacionesTecnico?:  string | null;
  numeroOt:               string;
  tipoOt:                 string;
  fechaApertura:          string;
  descripcionOt?:         string | null;
  placa:                  string;
  numeroVin:              string;
  modelo?:                string | null;
  anio?:                  number | null;
  kilometraje?:           number | null;
  cliente:                string;
  numeroDocumentoCliente: string;
  telefonoCliente?:       string | null;
  emailCliente?:          string | null;
  taller:                 string;
  tecnico:                string;
  jefeTaller?:            string | null;
  encargado?:             string | null;
}

export interface ArchivoGarantia {
  id:               string;
  nombreOriginal:   string;
  nombreAlmacenado: string;
  tipoArchivo:      TipoArchivo;
  extension:        string;
  tamanoBytes:      number;
  mimeType?:        string | null;
  descripcion?:     string | null;
  creadoEn:         string;
  subidoPor:        string;
}

export interface Diagnostico {
  id:                string;
  analisisDanio:     string;
  metodoReparacion:  string;
  estadoAceite?:     string | null;
  solucionAplicada:  string;
  requiereRepuestos: boolean;
  repuestosDetalle?: string | null;
  creadoEn:          string;
  actualizadoEn:     string;
  jefeTaller:        string;
}

export interface HistorialEstado {
  id:             string;
  estadoAnterior?: string | null;
  estadoNuevo:    string;
  esUrgente:      boolean;
  comentario?:    string | null;
  creadoEn:       string;
  usuario:        string;
  rol:            string;
}

export interface TramiteSimscloud {
  id:                     string;
  numeroTramiteSimscloud?: string | null;
  fechaEnvio:             string;
  estadoEnvio:            string;
  observaciones?:         string | null;
  resultadoFabrica?:      string | null;
  motivoRechazo?:         string | null;
  comentarioFabrica?:     string | null;
  codigoRespuesta?:       string | null;
  montoCubierto?:         number | null;
  fechaRespuestaFabrica?: string | null;
  encargado:              string;
}

export interface Notificacion {
  id:          string;
  titulo:      string;
  mensaje:     string;
  estado:      'no_leida' | 'leida';
  esUrgente:   boolean;
  creadoEn:    string;
  leidaEn?:    string | null;
  garantiaId?: string | null;
  numeroOt?:   string | null;
  emisor?:     string | null;
}

// ──────────────────────────────────────────────────────────
// INTERFACES — Requests (cuerpo de POST/PUT)
// ──────────────────────────────────────────────────────────

export interface ObservacionRequest {
  usuarioId:    string;
  observaciones: string;
}

export interface AccionUsuarioRequest {
  usuarioId: string;
}

export interface DiagnosticoRequest {
  jefeTallerId:      string;
  analisisDanio:     string;
  metodoReparacion:  string;
  estadoAceite?:     string | null;
  solucionAplicada:  string;
  requiereRepuestos: boolean;
  repuestosDetalle?: string | null;
}

export interface EnvioSimscloudRequest {
  encargadoId:            string;
  numeroTramiteSimscloud?: string | null;
  observaciones?:         string | null;
}

export interface RespuestaFabricaRequest {
  encargadoId:       string;
  resultado:         'aprobada' | 'rechazada';
  motivoRechazo?:    string | null;
  comentarioFabrica?: string | null;
  codigoRespuesta?:  string | null;
  montoCubierto?:    number | null;
}

// ──────────────────────────────────────────────────────────
// TIPOS AUXILIARES
// ──────────────────────────────────────────────────────────

export type EstadoGarantia =
  | 'pendiente_tecnico'
  | 'en_revision'
  | 'finalizada_taller'
  | 'enviada_simscloud'
  | 'aprobada'
  | 'rechazada'
  | 'urgente'
  | 'cerrada';

export type TipoArchivo = 'imagen' | 'video' | 'documento';

// ══════════════════════════════════════════════════════════
// GARANTÍAS SERVICE
// ══════════════════════════════════════════════════════════

@Injectable({
  providedIn: 'root'
})
export class GarantiasVHCRService {

  private apiGarantias   = `https://bodega.vehicentro.com:1830/api/api/Garantias`;
  private apiArchivos    = `https://bodega.vehicentro.com:1830/api/api/ArchivosGarantias`;
  private apiDiagnostico = `https://bodega.vehicentro.com:1830/api/api/Diagnosticos`;
  private apiTramites    = `https://bodega.vehicentro.com:1830/api/api/TramitesSimscloud`;
  private apiNotif       = `https://bodega.vehicentro.com:1830/api/api/Notificaciones`;

  constructor(private http: HttpClient) {}

  // ══════════════════════════════════════════════════════════
  // TÉCNICO — Listado de sus OT tipo GRT
  // ══════════════════════════════════════════════════════════

  /** Retorna todas las OT tipo GRT del técnico con estado y total de archivos */
  getOtPorTecnico(tecnicoId: string): Observable<OtTecnico[]> {
    return this.http.get<OtTecnico[]>(`${this.apiGarantias}/tecnico/${tecnicoId}`)
      .pipe(catchError(this.handleError));
  }

  // ══════════════════════════════════════════════════════════
  // JEFE DE TALLER — Listado (urgentes primero)
  // ══════════════════════════════════════════════════════════

  /** Retorna garantías activas del taller ordenadas: urgentes primero, luego por fecha */
  getGarantiasPorJefe(tallerId: string): Observable<GarantiaJefe[]> {
    return this.http.get<GarantiaJefe[]>(`${this.apiGarantias}/jefe/${tallerId}`)
      .pipe(catchError(this.handleError));
  }

  // ══════════════════════════════════════════════════════════
  // ENCARGADO — Garantías finalizadas y tramitadas
  // ══════════════════════════════════════════════════════════

  /** Retorna garantías finalizadas con estado en Simscloud y respuesta de fábrica */
  getGarantiasEncargado(tallerId: string): Observable<GarantiaEncargado[]> {
    return this.http.get<GarantiaEncargado[]>(`${this.apiGarantias}/encargado/${tallerId}`)
      .pipe(catchError(this.handleError));
  }

  // ══════════════════════════════════════════════════════════
  // DETALLE COMPLETO DE UNA GARANTÍA
  // ══════════════════════════════════════════════════════════

  /** Retorna todos los datos de una garantía: OT, vehículo, cliente, taller, actores */
  getGarantiaById(garantiaId: string): Observable<GarantiaDetalle> {
    return this.http.get<GarantiaDetalle>(`${this.apiGarantias}/${garantiaId}`)
      .pipe(catchError(this.handleError));
  }

  // ══════════════════════════════════════════════════════════
  // TÉCNICO — Actualizar observaciones
  // ══════════════════════════════════════════════════════════

  actualizarObservaciones(garantiaId: string, request: ObservacionRequest): Observable<any> {
    return this.http.put(`${this.apiGarantias}/${garantiaId}/observaciones`, request)
      .pipe(catchError(this.handleError));
  }

  // ══════════════════════════════════════════════════════════
  // JEFE DE TALLER — Finalizar garantía
  // ══════════════════════════════════════════════════════════

  /**
   * Finaliza la garantía: cambia estado a 'finalizada_taller',
   * la OT desaparece del listado activo y notifica al técnico automáticamente.
   */
  finalizarGarantia(garantiaId: string, jefeId: string): Observable<any> {
    const body: AccionUsuarioRequest = { usuarioId: jefeId };
    return this.http.post(`${this.apiGarantias}/${garantiaId}/finalizar`, body)
      .pipe(catchError(this.handleError));
  }

  // ══════════════════════════════════════════════════════════
  // HISTORIAL DE ESTADOS
  // ══════════════════════════════════════════════════════════

  /** Auditoría completa de cambios de estado de una garantía */
  getHistorialEstados(garantiaId: string): Observable<HistorialEstado[]> {
    return this.http.get<HistorialEstado[]>(`${this.apiGarantias}/${garantiaId}/historial`)
      .pipe(catchError(this.handleError));
  }

  // ══════════════════════════════════════════════════════════
  // ARCHIVOS MULTIMEDIA
  // ══════════════════════════════════════════════════════════

  /**
   * Sube uno o varios archivos multimedia a una garantía.
   * Formatos: jpg, png, mp4, pdf, etc. Límite: 100 archivos por garantía.
   */
  subirArchivos(garantiaId: string, subidoPor: string, archivos: File[]): Observable<any> {
    const formData = new FormData();
    archivos.forEach(archivo => formData.append('archivos', archivo, archivo.name));

    const params = new HttpParams().set('subidoPor', subidoPor);

    return this.http.post(`${this.apiArchivos}/${garantiaId}/upload`, formData, { params })
      .pipe(
        timeout(120000),
        catchError((error: HttpErrorResponse) => {
          if (error.status === 400 && error.error?.message?.includes('límite de 100')) {
            return throwError(() => new Error('Se alcanzó el límite de 100 archivos por garantía.'));
          }
          const msg = error.error?.message || error.message || 'Error al subir archivos.';
          return throwError(() => new Error(msg));
        })
      );
  }

  /** Lista todos los archivos multimedia registrados de una garantía */
  getArchivos(garantiaId: string): Observable<ArchivoGarantia[]> {
    return this.http.get<ArchivoGarantia[]>(`${this.apiArchivos}/${garantiaId}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Descarga un ZIP nombrado con el número de OT (ej: GRT-001.zip)
   * con todos los archivos multimedia de la garantía.
   */
  descargarZip(garantiaId: string): Observable<Blob> {
    return this.http.get(`${this.apiArchivos}/${garantiaId}/descargar-zip`, { responseType: 'blob' })
      .pipe(
        timeout(60000),
        catchError(this.handleError)
      );
  }

  /** Elimina un archivo multimedia (solo el usuario que lo subió puede eliminarlo) */
  eliminarArchivo(archivoId: string, usuarioId: string): Observable<any> {
    const params = new HttpParams().set('usuarioId', usuarioId);
    return this.http.delete(`${this.apiArchivos}/archivo/${archivoId}`, { params })
      .pipe(catchError(this.handleError));
  }

  // ══════════════════════════════════════════════════════════
  // DIAGNÓSTICO DEL JEFE DE TALLER
  // ══════════════════════════════════════════════════════════

  /** Obtiene el diagnóstico del jefe para una garantía */
  getDiagnostico(garantiaId: string): Observable<Diagnostico> {
    return this.http.get<Diagnostico>(`${this.apiDiagnostico}/${garantiaId}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Crea o actualiza el diagnóstico (UPSERT).
   * Campos: análisis del daño, método de reparación, estado del aceite, solución.
   */
  guardarDiagnostico(garantiaId: string, diagnostico: DiagnosticoRequest): Observable<any> {
    return this.http.post(`${this.apiDiagnostico}/${garantiaId}`, diagnostico)
      .pipe(catchError(this.handleError));
  }

  // ══════════════════════════════════════════════════════════
  // ENCARGADO — Trámites en Simscloud
  // ══════════════════════════════════════════════════════════

  /**
   * Registra el envío a Simscloud y cambia el estado a 'enviada_simscloud'.
   */
  registrarEnvioSimscloud(garantiaId: string, request: EnvioSimscloudRequest): Observable<any> {
    return this.http.post(`${this.apiTramites}/${garantiaId}/enviar`, request)
      .pipe(catchError(this.handleError));
  }

  /**
   * Registra la respuesta de fábrica (aprobada / rechazada).
   * Si es rechazada, el backend marca la garantía como URGENTE
   * y notifica automáticamente al jefe de taller.
   */
  registrarRespuestaFabrica(garantiaId: string, request: RespuestaFabricaRequest): Observable<any> {
    return this.http.post(`${this.apiTramites}/${garantiaId}/respuesta-fabrica`, request)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 400 && error.error?.message?.includes('motivo de rechazo')) {
            return throwError(() => new Error('El motivo de rechazo es obligatorio cuando la fábrica rechaza.'));
          }
          return this.handleError(error);
        })
      );
  }

  /** Historial de todos los envíos y respuestas de fábrica de una garantía */
  getHistorialTramites(garantiaId: string): Observable<TramiteSimscloud[]> {
    return this.http.get<TramiteSimscloud[]>(`${this.apiTramites}/${garantiaId}/historial`)
      .pipe(catchError(this.handleError));
  }

  // ══════════════════════════════════════════════════════════
  // NOTIFICACIONES
  // ══════════════════════════════════════════════════════════

  /**
   * Retorna notificaciones de un usuario.
   * Las urgentes aparecen primero.
   * @param soloNoLeidas - si true, retorna solo las no leídas
   */
  getNotificaciones(usuarioId: string, soloNoLeidas: boolean = false): Observable<Notificacion[]> {
    const params = new HttpParams().set('soloNoLeidas', soloNoLeidas.toString());
    return this.http.get<Notificacion[]>(`${this.apiNotif}/${usuarioId}`, { params })
      .pipe(catchError(this.handleError));
  }

  /** Marca una notificación como leída */
  marcarNotificacionLeida(notificacionId: string, usuarioId: string): Observable<any> {
    const params = new HttpParams().set('usuarioId', usuarioId);
    return this.http.put(`${this.apiNotif}/${notificacionId}/leer`, null, { params })
      .pipe(catchError(this.handleError));
  }

  // ══════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════

  /**
   * Dispara la descarga del ZIP en el navegador.
   * Uso: this.garantiasService.descargarZipEnNavegador(garantiaId, 'GRT-001')
   */
  descargarZipEnNavegador(garantiaId: string, numeroOt: string): void {
    this.descargarZip(garantiaId).subscribe({
      next: (blob) => {
        const url  = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = `${numeroOt}.zip`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Error al descargar ZIP:', err)
    });
  }

  /** Retorna el color CSS asociado al estado de una garantía para uso en la UI */
  getColorEstado(estado: EstadoGarantia, esUrgente: boolean = false): string {
    if (esUrgente) return 'danger';
    const colores: Record<EstadoGarantia, string> = {
      pendiente_tecnico:  'warning',
      en_revision:        'primary',
      finalizada_taller:  'secondary',
      enviada_simscloud:  'info',
      aprobada:           'success',
      rechazada:          'danger',
      urgente:            'danger',
      cerrada:            'dark'
    };
    return colores[estado] ?? 'secondary';
  }

  /** Retorna la etiqueta legible del estado para mostrar en la UI */
  getLabelEstado(estado: EstadoGarantia): string {
    const labels: Record<EstadoGarantia, string> = {
      pendiente_tecnico:  'Pendiente técnico',
      en_revision:        'En revisión',
      finalizada_taller:  'Finalizada en taller',
      enviada_simscloud:  'Enviada a Simscloud',
      aprobada:           'Aprobada por fábrica',
      rechazada:          'Rechazada por fábrica',
      urgente:            '⚠ Urgente — Corregir',
      cerrada:            'Cerrada'
    };
    return labels[estado] ?? estado;
  }

  // ──────────────────────────────────────────────────────────
  // MANEJADOR DE ERRORES CENTRAL
  // ──────────────────────────────────────────────────────────

  private handleError(error: HttpErrorResponse) {
    console.error('Error en API Garantías:', error);

    let errorMessage = 'Ha ocurrido un error en el servidor.';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 400: errorMessage = error.error?.message || 'Solicitud inválida.';           break;
        case 404: errorMessage = error.error?.message || 'Recurso no encontrado.';        break;
        case 409: errorMessage = 'Conflicto: el registro ya existe.';                     break;
        case 500: errorMessage = error.error?.message || 'Error interno del servidor.';   break;
        default:  errorMessage = error.error?.message || 'Error de conexión con el servidor.';
      }
    }

    return throwError(() => new Error(errorMessage));
  }
}