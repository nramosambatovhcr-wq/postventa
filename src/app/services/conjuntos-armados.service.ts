import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';

// ═══════════════════════════════════════════════════════════════
//  INTERFACES  —  Componentes base
// ═══════════════════════════════════════════════════════════════

/** Campos logísticos compartidos por todos los componentes */
export interface ComponenteBase {
  id:             string;
  conjuntoArmadoId: string;
  origen:         string | null;
  destino:        string | null;
  fechaIngreso:   string | null;
  fechaSalida:    string | null;
  observacion:    string | null;
  codigoVhcr:     string | null;
  descripcion:    string | null;
  medidaVolumen:  string | null;
  medidaPeso:     string | null;
  unidadAplica:   string | null;
  fechaRegistro:  string;
  fechaActualizacion: string;
}

export interface CajaCambio extends ComponenteBase {
  model:                  string | null;
  serialNo:               string | null;
  customerNo:             string | null;
  inputTorque:            string | null;
  oilCapacity:            string | null;
  retardadorPartsListNo:  string | null;
  retardadorSerialNo:     string | null;
  fotoUrl:                string | null;
}

export interface Motor extends ComponenteBase {
  model:    string | null;
  serialNo: string | null;
}

export interface Frontal extends ComponenteBase {
  type:    string | null;
  assyNo:  string | null;
  jourNo:  string | null;
  fotoUrl: string | null;
}

export interface Diferencial extends ComponenteBase {
  typeFunda:   string | null;
  assyNoFunda: string | null;
  jourNoFunda: string | null;
  typeHuevo:   string | null;
  assyNoHuevo: string | null;
  jourNoHuevo: string | null;
}

export interface Cabina extends ComponenteBase {
  numeroProducto:       string | null;
  departamentoCuerpo:   string | null;
  numeroSerie:          string | null;
  partsListNo:          string | null;
  color:                string | null;
  configuracionEspecial:string | null;
  tiempoSinConexion:    string | null;
}

// ═══════════════════════════════════════════════════════════════
//  INTERFACES  —  Imágenes
// ═══════════════════════════════════════════════════════════════

export type ComponenteTipo =
  | 'conjunto'
  | 'caja_cambio'
  | 'motor'
  | 'frontal'
  | 'diferencial'
  | 'cabina';

export interface ImagenConjunto {
  idImagen:       number;
  componenteTipo: ComponenteTipo;
  componenteId:   string | null;
  nombreArchivo:  string;
  nombreOriginal: string;
  urlImagen:      string;
  urlCompleta:    string;
  tipoImagen:     string;
  descripcion:    string | null;
  orden:          number;
  esPrincipal:    boolean;
  tamanioBytes:   number | null;
  fechaSubida:    string;
}

/** Imágenes agrupadas por tipo de componente — usadas en el detalle */
export type ImagenesPorComponente = Partial<Record<ComponenteTipo, ImagenConjunto[]>>;

// ═══════════════════════════════════════════════════════════════
//  INTERFACES  —  Conjunto Armado
// ═══════════════════════════════════════════════════════════════

/** Fila del listado (GET /api/conjuntos-armados) */
export interface ConjuntoArmadoResumen {
  id:                 string;
  codigo:             string;
  descripcion:        string | null;
  observacion:        string | null;
  fechaRegistro:      string;
  imagenPrincipal:    string | null;

  cajaId:             string | null;
  cajaModel:          string | null;
  cajaSerial:         string | null;
  cajaVhcr:           string | null;

  motorId:            string | null;
  motorModel:         string | null;
  motorSerial:        string | null;
  motorVhcr:          string | null;

  frontalId:          string | null;
  frontalType:        string | null;
  frontalAssy:        string | null;

  diferencialId:      string | null;
  typeFunda:          string | null;
  typeHuevo:          string | null;

  cabinaId:           string | null;
  cabinaDescripcion:  string | null;
  cabinaColor:        string | null;
}

/** Detalle completo (GET /api/conjuntos-armados/{id}) */
export interface ConjuntoArmadoDetalle {
  id:                 string;
  codigo:             string;
  descripcion:        string | null;
  observacion:        string | null;
  fechaRegistro:      string;
  fechaActualizacion: string;

  cajaCambio:   CajaCambio   | null;
  motor:        Motor        | null;
  frontal:      Frontal      | null;
  diferencial:  Diferencial  | null;
  cabina:       Cabina       | null;

  imagenes: ImagenesPorComponente;
}

// ─────────────────────────────────────────────────────────────
//  Respuestas genéricas de la API
// ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data:    T;
  count?:  number;
  msg?:    string;
}

export interface ApiListResponse<T> {
  success: boolean;
  data:    T[];
  count:   number;
}

export interface ApiCreateResponse {
  success: boolean;
  msg:     string;
  id:      string;
}

export interface ApiMutationResponse {
  success: boolean;
  msg:     string;
}

export interface ApiUploadResponse {
  success:     boolean;
  msg:         string;
  conjuntoId:  string;
  componente:  string;
  imagenes:    ImagenSubida[];
}

export interface ImagenSubida {
  idImagen:       number;
  nombreArchivo:  string;
  nombreOriginal: string;
  url:            string;
  esPrincipal:    boolean;
  tamanioKb:      number;
}

// ═══════════════════════════════════════════════════════════════
//  INTERFACES  —  Requests (payloads de escritura)
// ═══════════════════════════════════════════════════════════════

export interface ComponenteBaseRequest {
  origen?:        string;
  destino?:       string;
  fechaIngreso?:  string;   // 'YYYY-MM-DD'
  fechaSalida?:   string;
  observacion?:   string;
  codigoVhcr?:    string;
  descripcion?:   string;
  medidaVolumen?: string;
  medidaPeso?:    string;
  unidadAplica?:  string;
}

export interface CajaCambioRequest extends ComponenteBaseRequest {
  model?:                 string;
  serialNo?:              string;
  customerNo?:            string;
  inputTorque?:           string;
  oilCapacity?:           string;
  retardadorPartsListNo?: string;
  retardadorSerialNo?:    string;
}

export interface MotorRequest extends ComponenteBaseRequest {
  model?:    string;
  serialNo?: string;
}

export interface FrontalRequest extends ComponenteBaseRequest {
  type?:   string;
  assyNo?: string;
  jourNo?: string;
}

export interface DiferencialRequest extends ComponenteBaseRequest {
  typeFunda?:   string;
  assyNoFunda?: string;
  jourNoFunda?: string;
  typeHuevo?:   string;
  assyNoHuevo?: string;
  jourNoHuevo?: string;
}

export interface CabinaRequest extends ComponenteBaseRequest {
  numeroProducto?:        string;
  departamentoCuerpo?:    string;
  numeroSerie?:           string;
  partsListNo?:           string;
  color?:                 string;
  configuracionEspecial?: string;
  tiempoSinConexion?:     string;
}

/** Payload para crear un conjunto completo en una sola llamada */
export interface ConjuntoCreateRequest {
  codigo:       string;
  descripcion?: string;
  observacion?: string;
  cajaCambio?:  CajaCambioRequest;
  motor?:       MotorRequest;
  frontal?:     FrontalRequest;
  diferencial?: DiferencialRequest;
  cabina?:      CabinaRequest;
}

export interface ConjuntoUpdateRequest {
  codigo:       string;
  descripcion?: string;
  observacion?: string;
}

export interface OrdenImagenRequest {
  orden: number;
}

// ═══════════════════════════════════════════════════════════════
//  SERVICE
// ═══════════════════════════════════════════════════════════════

@Injectable({
  providedIn: 'root'
})
export class ConjuntosArmadosService {

  private readonly baseUrl = 'https://bodega.vehicentro.com:1830/api/api/ConjuntosArmados';

  constructor(private http: HttpClient) {}

  // ═══════════════════════════════════════════════════════════════
  //  CONJUNTOS — Lectura
  // ═══════════════════════════════════════════════════════════════

  // ─────────────────────────────────────────────────────────────
  //  GET /api/conjuntos-armados
  // ─────────────────────────────────────────────────────────────
  getAll(): Observable<ApiListResponse<ConjuntoArmadoResumen>> {
    return this.http.get<ApiListResponse<ConjuntoArmadoResumen>>(this.baseUrl).pipe(
      catchError(err => {
        console.error('getAll conjuntos error:', err);
        return of({ success: false, data: [], count: 0 });
      })
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  GET /api/conjuntos-armados/{id}
  // ─────────────────────────────────────────────────────────────
  getById(id: string): Observable<ApiResponse<ConjuntoArmadoDetalle>> {
    return this.http.get<ApiResponse<ConjuntoArmadoDetalle>>(
      `${this.baseUrl}/${id}`
    ).pipe(
      catchError(err => {
        console.error('getById conjunto error:', err);
        throw err;
      })
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  GET /api/conjuntos-armados/buscar?termino=
  // ─────────────────────────────────────────────────────────────
  buscar(termino: string): Observable<ApiListResponse<ConjuntoArmadoResumen>> {
    const params = new HttpParams().set('termino', termino);
    return this.http.get<ApiListResponse<ConjuntoArmadoResumen>>(
      `${this.baseUrl}/buscar`, { params }
    ).pipe(
      catchError(err => {
        console.error('buscar conjuntos error:', err);
        return of({ success: false, data: [], count: 0 });
      })
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  CONJUNTOS — Escritura
  // ═══════════════════════════════════════════════════════════════

  // ─────────────────────────────────────────────────────────────
  //  POST /api/conjuntos-armados
  //  Crea conjunto + todos los componentes en una transacción
  // ─────────────────────────────────────────────────────────────
  create(payload: ConjuntoCreateRequest): Observable<ApiCreateResponse> {
    return this.http.post<ApiCreateResponse>(this.baseUrl, payload).pipe(
      catchError(err => {
        console.error('create conjunto error:', err);
        throw err;
      })
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  PUT /api/conjuntos-armados/{id}
  //  Actualiza datos base (código, descripción, observación)
  // ─────────────────────────────────────────────────────────────
  update(id: string, payload: ConjuntoUpdateRequest): Observable<ApiMutationResponse> {
    return this.http.put<ApiMutationResponse>(`${this.baseUrl}/${id}`, payload).pipe(
      catchError(err => {
        console.error('update conjunto error:', err);
        throw err;
      })
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  DELETE /api/conjuntos-armados/{id}
  // ─────────────────────────────────────────────────────────────
  delete(id: string): Observable<ApiMutationResponse> {
    return this.http.delete<ApiMutationResponse>(`${this.baseUrl}/${id}`).pipe(
      catchError(err => {
        console.error('delete conjunto error:', err);
        throw err;
      })
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  COMPONENTES — Actualización individual
  // ═══════════════════════════════════════════════════════════════

  // ─────────────────────────────────────────────────────────────
  //  PUT /api/conjuntos-armados/{id}/caja-cambio
  // ─────────────────────────────────────────────────────────────
  updateCajaCambio(id: string, payload: CajaCambioRequest): Observable<ApiMutationResponse> {
    return this.http.put<ApiMutationResponse>(
      `${this.baseUrl}/${id}/caja-cambio`, payload
    ).pipe(
      catchError(err => {
        console.error('updateCajaCambio error:', err);
        throw err;
      })
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  PUT /api/conjuntos-armados/{id}/motor
  // ─────────────────────────────────────────────────────────────
  updateMotor(id: string, payload: MotorRequest): Observable<ApiMutationResponse> {
    return this.http.put<ApiMutationResponse>(
      `${this.baseUrl}/${id}/motor`, payload
    ).pipe(
      catchError(err => {
        console.error('updateMotor error:', err);
        throw err;
      })
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  PUT /api/conjuntos-armados/{id}/frontal
  // ─────────────────────────────────────────────────────────────
  updateFrontal(id: string, payload: FrontalRequest): Observable<ApiMutationResponse> {
    return this.http.put<ApiMutationResponse>(
      `${this.baseUrl}/${id}/frontal`, payload
    ).pipe(
      catchError(err => {
        console.error('updateFrontal error:', err);
        throw err;
      })
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  PUT /api/conjuntos-armados/{id}/diferencial
  // ─────────────────────────────────────────────────────────────
  updateDiferencial(id: string, payload: DiferencialRequest): Observable<ApiMutationResponse> {
    return this.http.put<ApiMutationResponse>(
      `${this.baseUrl}/${id}/diferencial`, payload
    ).pipe(
      catchError(err => {
        console.error('updateDiferencial error:', err);
        throw err;
      })
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  PUT /api/conjuntos-armados/{id}/cabina
  // ─────────────────────────────────────────────────────────────
  updateCabina(id: string, payload: CabinaRequest): Observable<ApiMutationResponse> {
    return this.http.put<ApiMutationResponse>(
      `${this.baseUrl}/${id}/cabina`, payload
    ).pipe(
      catchError(err => {
        console.error('updateCabina error:', err);
        throw err;
      })
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  IMÁGENES — Subida y gestión
  // ═══════════════════════════════════════════════════════════════

  // ─────────────────────────────────────────────────────────────
  //  POST /api/conjuntos-armados/upload-imagen/{componenteTipo}/{conjuntoId}
  //  Sube 1 o más imágenes para un componente específico.
  //  El backend guarda el archivo físico en el servidor y registra en BD.
  // ─────────────────────────────────────────────────────────────
  uploadImagenes(
    conjuntoId:     string,
    componenteTipo: ComponenteTipo,
    files:          File[],
    tipoImagen:     string  = 'general',
    componenteId?:  string
  ): Observable<ApiUploadResponse> {
    const form = new FormData();
    files.forEach(f => form.append('files', f, f.name));
    form.append('tipoImagen', tipoImagen);
    if (componenteId) form.append('componenteIdStr', componenteId);

    return this.http.post<ApiUploadResponse>(
      `${this.baseUrl}/upload-imagen/${componenteTipo}/${conjuntoId}`, form
    ).pipe(
      catchError(err => {
        console.error('uploadImagenes error:', err);
        throw err;
      })
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  GET /api/conjuntos-armados/{id}/imagenes
  //  Todas las imágenes de un conjunto (lista plana)
  // ─────────────────────────────────────────────────────────────
  getImagenes(conjuntoId: string): Observable<ApiListResponse<ImagenConjunto>> {
    return this.http.get<ApiListResponse<ImagenConjunto>>(
      `${this.baseUrl}/${conjuntoId}/imagenes`
    ).pipe(
      catchError(err => {
        console.error('getImagenes error:', err);
        return of({ success: false, data: [], count: 0 });
      })
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  PUT /api/conjuntos-armados/imagen/{idImagen}/principal
  // ─────────────────────────────────────────────────────────────
  setImagenPrincipal(idImagen: number): Observable<ApiMutationResponse> {
    return this.http.put<ApiMutationResponse>(
      `${this.baseUrl}/imagen/${idImagen}/principal`, {}
    ).pipe(
      catchError(err => {
        console.error('setImagenPrincipal error:', err);
        throw err;
      })
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  PUT /api/conjuntos-armados/imagen/{idImagen}/orden
  // ─────────────────────────────────────────────────────────────
  updateOrdenImagen(idImagen: number, orden: number): Observable<ApiMutationResponse> {
    return this.http.put<ApiMutationResponse>(
      `${this.baseUrl}/imagen/${idImagen}/orden`, { orden } satisfies OrdenImagenRequest
    ).pipe(
      catchError(err => {
        console.error('updateOrdenImagen error:', err);
        throw err;
      })
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  DELETE /api/conjuntos-armados/imagen/{idImagen}
  //  Eliminación lógica en BD + borrado físico del archivo en el servidor
  // ─────────────────────────────────────────────────────────────
  deleteImagen(idImagen: number): Observable<ApiMutationResponse> {
    return this.http.delete<ApiMutationResponse>(
      `${this.baseUrl}/imagen/${idImagen}`
    ).pipe(
      catchError(err => {
        console.error('deleteImagen error:', err);
        throw err;
      })
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  GET /api/conjuntos-armados/imagen/archivo/{filename}
  //  URL pública para mostrar la imagen directamente en <img src="...">
  // ─────────────────────────────────────────────────────────────
  getUrlImagen(nombreArchivo: string): string {
    return `${this.baseUrl}/imagen/archivo/${encodeURIComponent(nombreArchivo)}`;
  }

  // ═══════════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════════

  /** Devuelve solo el array de conjuntos del listado. */
  getAllData(): Observable<ConjuntoArmadoResumen[]> {
    return this.getAll().pipe(
      map(res => res.success ? res.data : [])
    );
  }

  /** Devuelve solo el objeto de detalle de un conjunto. */
  getDetalleData(id: string): Observable<ConjuntoArmadoDetalle> {
    return this.getById(id).pipe(
      map(res => res.data)
    );
  }

  /** Devuelve las imágenes de un componente específico del conjunto. */
  getImagenesPorComponente(
    conjuntoId: string,
    tipo: ComponenteTipo
  ): Observable<ImagenConjunto[]> {
    return this.getImagenes(conjuntoId).pipe(
      map(res => res.data.filter(img => img.componenteTipo === tipo))
    );
  }

  /** Devuelve la imagen principal de un componente, o null si no existe. */
  getImagenPrincipal(
    conjuntoId: string,
    tipo: ComponenteTipo = 'conjunto'
  ): Observable<ImagenConjunto | null> {
    return this.getImagenesPorComponente(conjuntoId, tipo).pipe(
      map(imgs => imgs.find(i => i.esPrincipal) ?? imgs[0] ?? null)
    );
  }

  /**
   * Sube una sola imagen y la marca como principal si es la primera del componente.
   * Atajo para el flujo más común desde formularios.
   */
  uploadImagenUnica(
    conjuntoId:     string,
    componenteTipo: ComponenteTipo,
    file:           File,
    tipoImagen:     string = 'general'
  ): Observable<ApiUploadResponse> {
    return this.uploadImagenes(conjuntoId, componenteTipo, [file], tipoImagen);
  }

  /**
   * Verifica si un conjunto tiene todos sus componentes cargados.
   * Útil para mostrar indicadores de completitud en el listado.
   */
  isCompleto(conjunto: ConjuntoArmadoDetalle): boolean {
    return !!(
      conjunto.cajaCambio  &&
      conjunto.motor       &&
      conjunto.frontal     &&
      conjunto.diferencial &&
      conjunto.cabina
    );
  }

  /**
   * Construye una descripción corta del conjunto para tooltips o badges.
   * Ej.: "HW116 / WP2.3Q110A0 / Tomate"
   */
  getDescripcionCorta(conjunto: ConjuntoArmadoResumen): string {
    const partes: string[] = [];
    if (conjunto.cajaModel)        partes.push(conjunto.cajaModel);
    if (conjunto.motorModel)       partes.push(conjunto.motorModel);
    if (conjunto.cabinaColor)      partes.push(conjunto.cabinaColor);
    return partes.length ? partes.join(' / ') : conjunto.codigo;
  }

  /**
   * Agrupa las imágenes de una lista plana por tipo de componente.
   * Útil cuando se usa getImagenes() en lugar del detalle completo.
   */
  agruparImagenesPorComponente(imagenes: ImagenConjunto[]): ImagenesPorComponente {
    return imagenes.reduce<ImagenesPorComponente>((acc, img) => {
      const tipo = img.componenteTipo;
      if (!acc[tipo]) acc[tipo] = [];
      acc[tipo]!.push(img);
      return acc;
    }, {});
  }
}