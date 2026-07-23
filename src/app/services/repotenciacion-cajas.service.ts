import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// ============================================================
// INTERFACES / DTOs
// ============================================================

export interface ImagenRepotenciacionDto {
  id: number;
  tipo: string;
  url: string;
  nombreArchivo: string;
  orden: number;
  mimeType: string;
  tamanioBytes: number;
  fechaSubida: Date;
}

export interface RepotenciacionCajaDto {
  id: number;
  agencia: string;
  modelo: string;
  serie: string;
  cliente: string;
  ordenTrabajo: string;
  guiaRemision: string;
  agenciaDif?: string;
  modeloDif?: string;
  serieDif?: string;
  clienteDif?: string;
  ordenTrabajoDif?: string;
  guiaRemisionDif?: string;
  estado: string;
  fechaIngreso?: Date;
  fechaEntrega?: Date;
  observaciones?: string;
  tutorialUrl?: string;
  usuarioCrea: number;
  usuariocreaNombre?: string;
  fechaCreacion?: Date;
  fechaActualizacion?: Date;
  mecanicoId?:       number;
  mecanicoNombre?:   string;
  fechaAsignacion?:  Date;
  recepcion?:        RecepcionRepotenciacionDto;
  imagenPlaca?: ImagenRepotenciacionDto;
  fotografias: ImagenRepotenciacionDto[];
  
}

export interface RepotenciacionCajaRequest {
  agencia: string;
  modelo: string;
  serie: string;
  cliente: string;
  ordenTrabajo: string;
  guiaRemision: string;
  agenciaDif?: string;
  modeloDif?: string;
  serieDif?: string;
  clienteDif?: string;
  ordenTrabajoDif?: string;
  guiaRemisionDif?: string;
  estado: string;
  fechaIngreso?: string;
  fechaEntrega?: string;
  observaciones?: string;
  tutorialUrl?: string;
  usuarioCrea?: number;
  imagenPlaca?: File | null;
  fotografias?: File[];
}

export interface RepotenciacionFiltros {
  estado?: string;
  tipo?: string;
  busqueda?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  usuarioCrea?: number; // NUEVO: filtrar por usuario
}

export interface EstadisticasRepotenciacion {
  success: boolean;
  total: number;
  cajasCambio: number;
  diferenciales: number;
  pendientes: number;
  enProceso: number;
  completados: number;
  entregados: number;
}

export interface ApiListResponse<T> {
  success: boolean;
  total: number;
  data: T[];
}

// Respuesta específica del endpoint GET /usuario/{id}
export interface ApiUsuarioListResponse<T> {
  success: boolean;
  usuarioId: number;
  total: number;
  data: T[];
}

export interface ApiSingleResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiActionResponse {
  success: boolean;
  message: string;
  id?: number;
  repotenciacionId?: number;
}

export interface ImagenesResponse {
  success: boolean;
  repotenciacionId: number;
  total: number;
  imagenPlaca?: ImagenRepotenciacionDto;
  fotografias: ImagenRepotenciacionDto[];
}

export interface MecanicoDto {
  id:     number;
  nombre: string;
  email:  string;
}

export interface RecepcionRequest {
  repotenciacionId: number;
  fechaRecepcion:   string;
  recibidoPorId:    number;
  condicionFisica:  string;
  observaciones?:   string;
}

export interface RecepcionRepotenciacionDto {
  id:               number;
  repotenciacionId: number;
  fechaRecepcion:   Date;
  recibidoPorId:    number;
  recibidoPorNombre?: string;
  condicionFisica:  string;
  observaciones?:   string;
  createdAt:        Date;
  imagenes:any;
}

export interface AsignarMecanicoResponse {
  success:          boolean;
  message:          string;
  repotenciacionId: number;
  mecanicoId:       number;
  mecanicoNombre:   string;
}

// ─────────── Seguimiento de taller (flujo móvil del mecánico) ───────────

export interface ImagenMovilDto {
  id:            number;
  tipo:          string;        // DESARME | REPARACION | ENTREGA
  url:           string;
  nombreArchivo: string;
  descripcion?:  string;
  orden:         number;
  fechaSubida:   Date;
}

export interface PiezaDto {
  id:                number;
  codigo?:           string;
  nombre:            string;
  estado:            string;     // BUENO | REGULAR | MALO ...
  observaciones?:    string;
  requiereReemplazo: boolean;
}

export interface DesarmeDto {
  id:               number;
  repotenciacionId: number;
  mecanicoId:       number;
  fechaInicio:      Date;
  fechaFin?:        Date;
  observaciones?:   string;
  piezas:           PiezaDto[];
  imagenes:         ImagenMovilDto[];
}

export interface RepuestoDto {
  id:                 number;
  codigo?:            string;
  descripcion:        string;
  cantidadSolicitada: number;
  cantidadAprobada?:  number;
  estado:             string;    // PENDIENTE | APROBADO | RECHAZADO
  observaciones?:     string;
}

export interface SolicitudRepuestosDto {
  id:               number;
  repotenciacionId: number;
  mecanicoId:       number;
  fechaSolicitud:   Date;
  estado:           string;      // PENDIENTE | APROBADO | RECHAZADO | PARCIAL
  fechaRespuesta?:  Date;
  observaciones?:   string;
  repuestos:        RepuestoDto[];
}

export interface ReparacionDto {
  id:                   number;
  repotenciacionId:     number;
  mecanicoId:           number;
  fechaInicio:          Date;
  fechaFin?:            Date;
  trabajosRealizados:   string[];
  observaciones?:       string;
  pruebaFuncionamiento: boolean;
  imagenes:             ImagenMovilDto[];
}

export interface EntregaDto {
  id:               number;
  repotenciacionId: number;
  mecanicoId:       number;
  fechaEntrega:     Date;
  entregadoA:       string;
  observaciones?:   string;
  firmaDigital?:    string;
  fotoEntrega?:     ImagenMovilDto;
}

// ─────────── Aprobación de repuestos (lado admin) ───────────

export interface RepuestoAprobacionItem {
  repuestoId:       number;
  cantidadAprobada: number;
  estado:           string;      // APROBADO | RECHAZADO | PENDIENTE
  observaciones?:   string;
}

export interface AprobarRepuestosRequest {
  observaciones?: string;
  repuestos:      RepuestoAprobacionItem[];
}

export interface AprobarRepuestosResponse {
  success:          boolean;
  message:          string;
  solicitudId:      number;
  repotenciacionId: number;
  estadoSolicitud:  string;
}

export interface CatalogoRepuesto {
  id: number;
  modeloCaja: string;
  codigo: string;
  descripcion: string;
  cantidadSugerida: number;
}
 
/** Resultado de validar un código contra VW_MAESTRO_PARTES (Oracle). */
export interface ValidacionRepuesto {
  codigo: string;
  existe: boolean;
  descripcionOficial: string | null;
}

/** Un modelo de caja presente en el catálogo (endpoint /modelos). */
export interface ModeloCatalogo {
  modeloCaja: string;
  total: number;
}

/** Respuesta de /validar-repuestos: además del data trae el conteo de válidos. */
export interface ValidacionRepuestosResponse {
  success: boolean;
  total: number;
  validos: number;
  data: ValidacionRepuesto[];
}

// ============================================================
// SERVICE
// ============================================================

@Injectable({ providedIn: 'root' })
export class RepotenciacionCajasService {

  private readonly baseUrl = 'https://bodega.vehicentro.com:1830/api/api/RepotenciacionCajas';

  constructor(private http: HttpClient) {}

  // ─────────────────────────────────────────────────────────
  // GET ALL (con filtros opcionales)
  // ─────────────────────────────────────────────────────────
  getAll(filtros?: RepotenciacionFiltros): Observable<ApiListResponse<RepotenciacionCajaDto>> {
    let params = new HttpParams();

    if (filtros?.estado)     params = params.set('estado',     filtros.estado);
    if (filtros?.tipo)       params = params.set('tipo',       filtros.tipo);
    if (filtros?.busqueda)   params = params.set('busqueda',   filtros.busqueda);
    if (filtros?.fechaDesde) params = params.set('fechaDesde', filtros.fechaDesde);
    if (filtros?.fechaHasta) params = params.set('fechaHasta', filtros.fechaHasta);
    if (filtros?.usuarioCrea) params = params.set('usuarioCrea', filtros.usuarioCrea.toString());

    return this.http.get<ApiListResponse<RepotenciacionCajaDto>>(this.baseUrl, { params });
  }

  // GET BY USUARIO  →  GET api/RepotenciacionCajas/usuario/{usuarioId}
  // Usa el endpoint dedicado. Acepta los mismos filtros opcionales que getAll.
  getByUsuario(
    usuarioId: number,
    filtros?: Omit<RepotenciacionFiltros, 'usuarioCrea'>
  ): Observable<ApiUsuarioListResponse<RepotenciacionCajaDto>> {
    let params = new HttpParams();

    if (filtros?.estado)     params = params.set('estado',     filtros.estado);
    if (filtros?.tipo)       params = params.set('tipo',       filtros.tipo);
    if (filtros?.busqueda)   params = params.set('busqueda',   filtros.busqueda);
    if (filtros?.fechaDesde) params = params.set('fechaDesde', filtros.fechaDesde);
    if (filtros?.fechaHasta) params = params.set('fechaHasta', filtros.fechaHasta);

    return this.http.get<ApiUsuarioListResponse<RepotenciacionCajaDto>>(
      `${this.baseUrl}/usuario/${usuarioId}`,
      { params }
    );
  }

  // ─────────────────────────────────────────────────────────
  // GET BY ID
  // ─────────────────────────────────────────────────────────
  getById(id: number): Observable<ApiSingleResponse<RepotenciacionCajaDto>> {
    return this.http.get<ApiSingleResponse<RepotenciacionCajaDto>>(`${this.baseUrl}/${id}`);
  }

  // ─────────────────────────────────────────────────────────
  // GET ESTADÍSTICAS
  // ─────────────────────────────────────────────────────────
  getEstadisticas(): Observable<EstadisticasRepotenciacion> {
    return this.http.get<EstadisticasRepotenciacion>(`${this.baseUrl}/estadisticas`);
  }

  // NUEVO: Estadísticas por usuario
  getEstadisticasPorUsuario(usuarioId: number): Observable<EstadisticasRepotenciacion> {
    return this.http.get<EstadisticasRepotenciacion>(`${this.baseUrl}/estadisticas?usuarioCrea=${usuarioId}`);
  }

  

  // ─────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────
  create(request: RepotenciacionCajaRequest): Observable<ApiActionResponse> {
    return this.http.post<ApiActionResponse>(this.baseUrl, this.buildFormData(request));
  }

  // ─────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────
  update(id: number, request: RepotenciacionCajaRequest): Observable<ApiActionResponse> {
    return this.http.put<ApiActionResponse>(`${this.baseUrl}/${id}`, this.buildFormData(request));
  }

  // ─────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────
  delete(id: number): Observable<ApiActionResponse> {
    return this.http.delete<ApiActionResponse>(`${this.baseUrl}/${id}`);
  }

  // ─────────────────────────────────────────────────────────
  // SUBIR IMÁGENES
  // ─────────────────────────────────────────────────────────
  subirImagenes(
    repotenciacionId: number,
    imagenPlaca?: File | null,
    fotografias?: File[]
  ): Observable<ApiActionResponse> {
    const formData = new FormData();
    formData.append('repotenciacionId', repotenciacionId.toString());

    if (imagenPlaca) {
      formData.append('imagenPlaca', imagenPlaca, imagenPlaca.name);
    }

    if (fotografias?.length) {
      fotografias.forEach(foto => {
        formData.append('fotografias', foto, foto.name);
      });
    }

    return this.http.post<ApiActionResponse>(`${this.baseUrl}/imagenes`, formData);
  }

  // ─────────────────────────────────────────────────────────
  // GET IMÁGENES
  // ─────────────────────────────────────────────────────────
  getImagenes(id: number): Observable<ImagenesResponse> {
    return this.http.get<ImagenesResponse>(`${this.baseUrl}/${id}/imagenes`);
  }

  // ─────────────────────────────────────────────────────────
  // DELETE IMAGEN
  // ─────────────────────────────────────────────────────────
  deleteImagen(imagenId: number): Observable<ApiActionResponse> {
    return this.http.delete<ApiActionResponse>(`${this.baseUrl}/imagenes/${imagenId}`);
  }

  // ─────────────────────────────────────────────────────────
  // GET MECÁNICOS  →  GET api/RepotenciacionCajas/mecanicos
  // ─────────────────────────────────────────────────────────
  getMecanicos(): Observable<ApiListResponse<MecanicoDto>> {
    return this.http.get<ApiListResponse<MecanicoDto>>(`${this.baseUrl}/mecanicos`);
  }

  // ─────────────────────────────────────────────────────────
  // PUT ASIGNAR MECÁNICO  →  PUT api/RepotenciacionCajas/{id}/asignar-mecanico
  // ─────────────────────────────────────────────────────────
  asignarMecanico(repotenciacionId: number, mecanicoId: number): Observable<AsignarMecanicoResponse> {
    return this.http.put<AsignarMecanicoResponse>(
      `${this.baseUrl}/${repotenciacionId}/asignar-mecanico`,
      { mecanicoId }
    );
  }

  // ─────────────────────────────────────────────────────────
  // POST RECEPCIÓN  →  POST api/RepotenciacionCajas/{id}/recepcion
  // ─────────────────────────────────────────────────────────
  registrarRecepcion(req: RecepcionRequest): Observable<ApiActionResponse> {
    return this.http.post<ApiActionResponse>(
      `${this.baseUrl}/${req.repotenciacionId}/recepcion`,
      req
    );
  }

  // ─────────────────────────────────────────────────────────
  // GET RECEPCIÓN  →  GET api/RepotenciacionCajas/{id}/recepcion
  // Nota: la recepción ya viene incluida en getAll y getById dentro
  // de rep.recepcion. Usar este endpoint solo si se necesita de forma aislada.
  // ─────────────────────────────────────────────────────────
  getRecepcion(repotenciacionId: number): Observable<{ success: boolean; data: RecepcionRepotenciacionDto }> {
    return this.http.get<{ success: boolean; data: RecepcionRepotenciacionDto }>(
      `${this.baseUrl}/${repotenciacionId}/recepcion`
    );
  }

  // ─────────────────────────────────────────────────────────
  // GET DISPONIBLES  →  GET /disponibles  (cajas sin mecánico asignado)
  // ─────────────────────────────────────────────────────────
  getDisponibles(busqueda?: string, tipo?: string): Observable<ApiListResponse<RepotenciacionCajaDto>> {
    let params = new HttpParams();
    if (busqueda) params = params.set('busqueda', busqueda);
    if (tipo)     params = params.set('tipo', tipo);
    return this.http.get<ApiListResponse<RepotenciacionCajaDto>>(`${this.baseUrl}/disponibles`, { params });
  }

  // ─────────────────────────────────────────────────────────
  // SOLICITUDES DE REPUESTOS  →  GET /{id}/solicitud-repuestos
  // ─────────────────────────────────────────────────────────
  getSolicitudesRepuestos(id: number): Observable<ApiListResponse<SolicitudRepuestosDto>> {
    return this.http.get<ApiListResponse<SolicitudRepuestosDto>>(`${this.baseUrl}/${id}/solicitud-repuestos`);
  }

  // PUT APROBAR REPUESTOS  →  PUT /{id}/solicitud-repuestos/{solicitudId}/aprobar
  aprobarRepuestos(
    id: number,
    solicitudId: number,
    payload: AprobarRepuestosRequest
  ): Observable<AprobarRepuestosResponse> {
    return this.http.put<AprobarRepuestosResponse>(
      `${this.baseUrl}/${id}/solicitud-repuestos/${solicitudId}/aprobar`,
      payload
    );
  }

  // ═════════════════════════════════════════════════════════
  // CATÁLOGO DE REPUESTOS (PostgreSQL) + VALIDACIÓN ORACLE
  // ═════════════════════════════════════════════════════════

  /**
   * Catálogo de repuestos de un modelo de caja, con búsqueda opcional
   * multi-palabra (código + descripción).
   * GET /catalogo-repuestos?modelo=&q=&limit=
   *
   * El 'modelo' es el campo RepotenciacionCajaDto.modelo (p. ej. "HW25716XSTL").
   */
  getCatalogoRepuestos(
    modelo: string,
    q?: string,
    limit = 500
  ): Observable<ApiListResponse<CatalogoRepuesto>> {
    let params = new HttpParams()
      .set('modelo', modelo)
      .set('limit', String(limit));
    if (q && q.trim()) params = params.set('q', q.trim());

    return this.http.get<ApiListResponse<CatalogoRepuesto>>(
      `${this.baseUrl}/catalogo-repuestos`,
      { params }
    );
  }

  /**
   * Modelos de caja disponibles en el catálogo (por si se necesita un
   * selector manual o para depurar la carga).
   * GET /catalogo-repuestos/modelos
   */
  getModelosCatalogo(): Observable<{ success: boolean; data: ModeloCatalogo[] }> {
    return this.http.get<{ success: boolean; data: ModeloCatalogo[] }>(
      `${this.baseUrl}/catalogo-repuestos/modelos`
    );
  }

  /**
   * Valida una lista de códigos contra el maestro de partes de Oracle
   * (VW_MAESTRO_PARTES). Úsalo al agregar un código manual (fuera de catálogo)
   * o antes de enviar la solicitud, para avisar cuáles no existen.
   * POST /validar-repuestos   body: { codigos: string[] }
   */
  validarRepuestos(codigos: string[]): Observable<ValidacionRepuestosResponse> {
    return this.http.post<ValidacionRepuestosResponse>(
      `${this.baseUrl}/validar-repuestos`,
      { codigos }
    );
  }

  // ─────────────────────────────────────────────────────────
  // SEGUIMIENTO DE TALLER (solo lectura para el admin)
  // ─────────────────────────────────────────────────────────
  getDesarme(id: number): Observable<ApiSingleResponse<DesarmeDto>> {
    return this.http.get<ApiSingleResponse<DesarmeDto>>(`${this.baseUrl}/${id}/desarme`);
  }

  getReparacion(id: number): Observable<ApiSingleResponse<ReparacionDto>> {
    return this.http.get<ApiSingleResponse<ReparacionDto>>(`${this.baseUrl}/${id}/reparacion`);
  }

  getEntrega(id: number): Observable<ApiSingleResponse<EntregaDto>> {
    return this.http.get<ApiSingleResponse<EntregaDto>>(`${this.baseUrl}/${id}/entrega`);
  }

  // ─────────────────────────────────────────────────────────
  // Construir FormData
  // ─────────────────────────────────────────────────────────
  private buildFormData(req: RepotenciacionCajaRequest): FormData {
    const fd = new FormData();

    fd.append('agencia',      req.agencia);
    fd.append('modelo',       req.modelo);
    fd.append('serie',        req.serie);
    fd.append('cliente',      req.cliente);
    fd.append('ordenTrabajo', req.ordenTrabajo);
    fd.append('guiaRemision', req.guiaRemision);
    fd.append('estado',       req.estado);
    fd.append('usuarioCrea',  req.usuarioCrea!.toString());

    if (req.agenciaDif)      fd.append('agenciaDif',      req.agenciaDif);
    if (req.modeloDif)       fd.append('modeloDif',       req.modeloDif);
    if (req.serieDif)        fd.append('serieDif',        req.serieDif);
    if (req.clienteDif)      fd.append('clienteDif',      req.clienteDif);
    if (req.ordenTrabajoDif) fd.append('ordenTrabajoDif', req.ordenTrabajoDif);
    if (req.guiaRemisionDif) fd.append('guiaRemisionDif', req.guiaRemisionDif);

    if (req.fechaIngreso)  fd.append('fechaIngreso',  req.fechaIngreso);
    if (req.fechaEntrega)  fd.append('fechaEntrega',  req.fechaEntrega);
    if (req.observaciones) fd.append('observaciones', req.observaciones);
    if (req.tutorialUrl)   fd.append('tutorialUrl',   req.tutorialUrl);

    if (req.imagenPlaca) {
      fd.append('imagenPlaca', req.imagenPlaca, req.imagenPlaca.name);
    }
    req.fotografias?.forEach(foto => {
      fd.append('fotografias', foto, foto.name);
    });

    return fd;
  }

  // ─────────────────────────────────────────────────────────
  // UTILIDADES
  // ─────────────────────────────────────────────────────────
  validarImagen(file: File): string | null {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024;

    if (!allowed.includes(file.type.toLowerCase())) {
      return `"${file.name}": solo se permiten JPG, PNG o WEBP.`;
    }
    if (file.size > maxSize) {
      return `"${file.name}": supera el límite de 5 MB.`;
    }
    return null;
  }

  previsualizarImagen(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = (e: any) => resolve(e.target.result as string);
      reader.onerror = () => reject('No se pudo leer el archivo');
      reader.readAsDataURL(file);
    });
  }



}