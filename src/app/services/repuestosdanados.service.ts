import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

// ================================================================
// MODELOS — muévelos a un archivo models/repuestos-danados.model.ts
//           si el proyecto crece y los reutilizas en más lugares.
// ================================================================

/** Valores exactos que acepta el backend (CHECK constraint en PG) */
export type Severidad = 'Leve' | 'Moderado' | 'Grave' | 'Irreparable';
export type EstadoRepuesto =
  | 'Pendiente'
  | 'En Revisión'
  | 'En Garantía'
  | 'Desechado'
  | 'Reparado'
  | 'Devuelto';

export interface RepuestoDanado {
  id:                  number;
  agencia_id:          string;
  codigo_articulo:     string;
  nombre_articulo:     string;
  descripcion?:        string | null;
  numero_serie?:       string | null;
  unidad?:             string | null;
  tipo_dano:           string;
  severidad:           Severidad;
  descripcion_dano:    string;
  ubicacion_dano?:     string | null;
  ubicacion_fisica?:   string | null;
  orden_trabajo?:      string | null;
  proveedor?:          string | null;
  descuento?:          number | null;
  estado:              EstadoRepuesto;
  accion_tomada?:      string | null;
  costo_promedio?:     number | null;
  costo_reparacion?:   number | null;
  usuario_registro:    string;
  fecha_registro:      string;          // ISO 8601
  usuario_actualiza?:  string | null;
  fecha_actualizacion?: string | null;
  observaciones?:      string | null;
  // Campos extra que devuelve el JOIN con imagenes
  total_imagenes?:     number;
  imagen_principal?:   string | null;
  // Solo en /completo
  imagenes?:           ImagenRepuesto[];
}

export interface ImagenRepuesto {
  id:                 number;
  repuesto_danado_id: number;
  nombre_archivo:     string;
  ruta_archivo:       string;
  tipo_mime?:         string | null;
  tamano_bytes?:      number | null;
  descripcion_imagen?: string | null;
  usuario_subida:     string;
  fecha_subida:       string;           // ISO 8601
}

export interface TipoDano {
  id:          number;
  nombre:      string;
  descripcion?: string | null;
  activo:      boolean;
}

export interface EstadisticasRepuestos {
  total_registros:      number;
  pendientes:           number;
  en_revision:          number;
  en_garantia:          number;
  reparados:            number;
  desechados:           number;
  devueltos:            number;
  leve:                 number;
  moderado:             number;
  grave:                number;
  irreparable:          number;
  suma_costo_promedio:  number;
  suma_costo_reparacion: number;
  total_imagenes:       number;
}

export interface ResumenSeveridad {
  severidad:            Severidad;
  cantidad:             number;
  suma_costo_promedio:  number;
  suma_costo_reparacion: number;
}

export interface ResumenEstado {
  estado:                EstadoRepuesto;
  severidad:             Severidad;
  total:                 number;
  costo_total_promedio:  number;
  costo_total_reparacion: number;
}

// ── Wrappers de respuesta del backend ────────────────────────────
interface ApiListResponse<T> {
  success: boolean;
  total:   number;
  datos:   T[];
}
interface ApiItemResponse<T> {
  success: boolean;
  datos:   T;
}
interface ApiEstadisticasResponse {
  success:          boolean;
  agencia_filtrada: number | null;
  datos:            EstadisticasRepuestos;
}
interface ApiSeveridadResponse {
  success:          boolean;
  agencia_filtrada: number | null;
  datos:            ResumenSeveridad[];
}
interface ApiResumenResponse {
  success:          boolean;
  agencia_filtrada: number | null;
  datos:            ResumenEstado[];
}
interface ApiTiposDanoResponse {
  success: boolean;
  datos:   TipoDano[];
}
interface ApiImagenesResponse {
  success:        boolean;
  repuesto_id:    number;
  total_imagenes: number;
  datos:          ImagenRepuesto[];
}
interface ApiSubirImagenesResponse {
  success:  boolean;
  mensaje:  string;
  imagenes: { id: number; nombre: string; ruta: string }[];
}
interface ApiMutationResponse {
  success:  boolean;
  mensaje?: string;
  id?:      number;
}

// ── Filtros para getAll ───────────────────────────────────────────
export interface FiltrosRepuestos {
  agencia_id?:      string;
  estado?:          EstadoRepuesto;
  severidad?:       Severidad;
  codigo_articulo?: string;
}

// ================================================================
// DTOs para el backend (PascalCase)
// ================================================================
interface RepuestoDanadoCreateBackend {
  AgenciaId: string;
  CodigoArticulo: string;
  NombreArticulo: string;
  Descripcion?: string | null;
  NumeroSerie?: string | null;
  Unidad?: string | null;
  TipoDano: string;
  Severidad: string;
  DescripcionDano: string;
  UbicacionDano?: string | null;
  UbicacionFisica?: string | null;
  OrdenTrabajo?: string | null;
  Proveedor?: string | null;
  Estado: string;
  AccionTomada?: string | null;
  CostoPromedio?: number | null;
  CostoReparacion?: number | null;
  UsuarioRegistro: string;
  Observaciones?: string | null;
}

interface ApiPorProveedorResponse {
  success:   boolean;
  proveedor: string;
  total:     number;
  datos:     RepuestoDanado[];
}

// ================================================================
// SERVICE
// ================================================================

@Injectable({ providedIn: 'root' })
export class RepuestosdanadosService {

  /**
   * ⚠️  El controller ASP.NET tiene ruta [controller] = "repuestosdanados"
   *     (sin guión). Verifica que environment.apiUrl termine sin "/".
   *     Ejemplo: environment.apiUrl = 'http://localhost:5000/api'
   */

   private readonly base = 'https://bodega.vehicentro.com:1830/api/api/RepuestosDanadosvhcr';
   

  constructor(private http: HttpClient) {}

  // ── CRUD REGISTROS ──────────────────────────────────────────────

  /**
   * GET /api/repuestosdanados
   * Acepta cualquier combinación de filtros (todos opcionales).
   */
  getRepuestosDanados(filtros: FiltrosRepuestos = {}): Observable<RepuestoDanado[]> {
    let params = new HttpParams();
    if (filtros.agencia_id      != null) params = params.set('agencia_id',      filtros.agencia_id);
    if (filtros.estado          != null) params = params.set('estado',           filtros.estado);
    if (filtros.severidad       != null) params = params.set('severidad',        filtros.severidad);
    if (filtros.codigo_articulo != null) params = params.set('codigo_articulo',  filtros.codigo_articulo);

    return this.http
      .get<ApiListResponse<RepuestoDanado>>(this.base, { params })
      .pipe(map(r => r.datos));
  }

  /**
   * GET /api/repuestosdanados/:id
   */
  getRepuestoById(id: number): Observable<RepuestoDanado> {
    return this.http
      .get<ApiItemResponse<RepuestoDanado>>(`${this.base}/${id}`)
      .pipe(map(r => r.datos));
  }

  /**
   * GET /api/repuestosdanados/:id/completo
   * Devuelve el registro con el array de imágenes anidado.
   */
  getRepuestoCompleto(id: number): Observable<RepuestoDanado> {
    return this.http
      .get<ApiItemResponse<RepuestoDanado>>(`${this.base}/${id}/completo`)
      .pipe(map(r => r.datos));
  }

  /**
   * POST /api/repuestosdanados
   * Mapea snake_case → PascalCase antes de enviar
   */
  crearRepuesto(payload: Partial<RepuestoDanado>): Observable<ApiMutationResponse> {
    const body = this.toBackendFormat(payload);
    return this.http.post<ApiMutationResponse>(this.base, body);
  }

  /**
   * PUT /api/repuestosdanados/:id
   * Mapea snake_case → PascalCase antes de enviar
   */
  actualizarRepuesto(id: number, payload: Partial<RepuestoDanado>): Observable<ApiMutationResponse> {
    const body = this.toBackendFormat(payload);
    return this.http.put<ApiMutationResponse>(`${this.base}/${id}`, body);
  }

  /**
   * PATCH /api/repuestosdanados/:id/estado
   * Cambia únicamente el estado sin necesidad de enviar todo el objeto.
   */
  cambiarEstado(id: number, estado: EstadoRepuesto, usuario?: string): Observable<ApiMutationResponse> {
    return this.http.patch<ApiMutationResponse>(
      `${this.base}/${id}/estado`,
      { Estado: estado, Usuario: usuario ?? null }
    );
  }

  /**
   * DELETE /api/repuestosdanados/:id
   * Elimina el registro y sus imágenes físicas en cascada.
   */
  eliminarRepuesto(id: number): Observable<ApiMutationResponse> {
    return this.http.delete<ApiMutationResponse>(`${this.base}/${id}`);
  }

  // ── IMÁGENES ────────────────────────────────────────────────────

  /**
   * GET /api/repuestosdanados/:id/imagenes
   */
  getImagenes(repuestoId: number): Observable<ImagenRepuesto[]> {
    return this.http
      .get<ApiImagenesResponse>(`${this.base}/${repuestoId}/imagenes`)
      .pipe(map(r => r.datos));
  }

  /**
   * POST /api/repuestosdanados/imagenes  (multipart/form-data)
   *
   * Construye el FormData así en el componente:
   *   const fd = new FormData();
   *   fd.append('repuestoDanadoId', String(repuestoId));
   *   fd.append('usuarioSubida', usuario);
   *   archivos.forEach((f, i) => {
   *     fd.append('imagenes', f);
   *     fd.append(`descripcion_${i}`, descripcion);
   *   });
   *   this.service.subirImagenes(fd).subscribe(...);
   */
  subirImagenes(formData: FormData): Observable<ApiSubirImagenesResponse> {
    return this.http.post<ApiSubirImagenesResponse>(`${this.base}/imagenes`, formData);
  }

  /**
   * DELETE /api/repuestosdanados/imagenes/:imagenId
   */
  eliminarImagen(imagenId: number): Observable<ApiMutationResponse> {
    return this.http.delete<ApiMutationResponse>(`${this.base}/imagenes/${imagenId}`);
  }

  // ── REPORTES / ESTADÍSTICAS ─────────────────────────────────────

  /**
   * GET /api/repuestosdanados/estadisticas?agencia_id=N
   */
  getEstadisticas(agenciaId?: number): Observable<EstadisticasRepuestos> {
    let params = new HttpParams();
    if (agenciaId != null) params = params.set('agencia_id', agenciaId);

    return this.http
      .get<ApiEstadisticasResponse>(`${this.base}/estadisticas`, { params })
      .pipe(map(r => r.datos));
  }

  /**
   * GET /api/repuestosdanados/por-severidad?agencia_id=N
   * Ordenado: Irreparable → Grave → Moderado → Leve
   */
  getPorSeveridad(agenciaId?: number): Observable<ResumenSeveridad[]> {
    let params = new HttpParams();
    if (agenciaId != null) params = params.set('agencia_id', agenciaId);

    return this.http
      .get<ApiSeveridadResponse>(`${this.base}/por-severidad`, { params })
      .pipe(map(r => r.datos));
  }

  /**
   * GET /api/repuestosdanados/resumen-estados?agencia_id=N
   * Agrupa por estado + severidad con totales de costo.
   */
  getResumenEstados(agenciaId?: number): Observable<ResumenEstado[]> {
    let params = new HttpParams();
    if (agenciaId != null) params = params.set('agencia_id', agenciaId);

    return this.http
      .get<ApiResumenResponse>(`${this.base}/resumen-estados`, { params })
      .pipe(map(r => r.datos));
  }

  /**
   * GET /api/repuestosdanados/tipos-dano
   * Catálogo de tipos de daño activos.
   */
  getTiposDano(): Observable<TipoDano[]> {
    return this.http
      .get<ApiTiposDanoResponse>(`${this.base}/tipos-dano`)
      .pipe(map(r => r.datos));
  }

  getRepuestosPorProveedor(proveedor: string): Observable<RepuestoDanado[]> {
  const segmento = encodeURIComponent(proveedor.trim());
  return this.http
    .get<ApiPorProveedorResponse>(`${this.base}/por-proveedor/${segmento}`)
    .pipe(map(r => r.datos));
}

// PATCH /api/repuestosdanadosvhcr/{id}/descuento
guardarDescuento(id: number, descuento: number, usuario?: string): Observable<any> {
    return this.http.patch(`${this.base}/${id}/descuento`, {
      Descuento: descuento,
      Usuario:   usuario ?? null
    });
  }
 
  /**
   * PATCH /api/repuestosdanadosvhcr/descuentos/lote
   * Guarda el descuento de varios repuestos en una sola llamada.
   * items: array de { id, descuento }
   */
  guardarDescuentosLote(
    items:    { id: number; descuento: number }[],
    usuario?: string
  ): Observable<any> {
    return this.http.patch(`${this.base}/descuentos/lote`, {
      Items:   items.map(i => ({ Id: i.id, Descuento: i.descuento })),
      Usuario: usuario ?? null
    });
  }

  // ── HELPERS ─────────────────────────────────────────────────────

  /**
   * Mapea el payload del componente (snake_case) al formato que espera
   * el backend ASP.NET (PascalCase).
   */
  private toBackendFormat(payload: Partial<RepuestoDanado>): RepuestoDanadoCreateBackend {
    return {
      AgenciaId: payload.agencia_id!,
      CodigoArticulo: payload.codigo_articulo!,
      NombreArticulo: payload.nombre_articulo!,
      Descripcion: payload.descripcion ?? null,
      NumeroSerie: payload.numero_serie ?? null,
      Unidad: payload.unidad ?? null,
      TipoDano: payload.tipo_dano!,
      Severidad: payload.severidad!,
      DescripcionDano: payload.descripcion_dano!,
      UbicacionDano: payload.ubicacion_dano ?? null,
      UbicacionFisica: payload.ubicacion_fisica ?? null,
      OrdenTrabajo: payload.orden_trabajo ?? null,
      Proveedor: payload.proveedor ?? null,
      Estado: payload.estado!,
      AccionTomada: payload.accion_tomada ?? null,
      CostoPromedio: payload.costo_promedio ?? null,
      CostoReparacion: payload.costo_reparacion ?? null,
      UsuarioRegistro: payload.usuario_registro!,
      Observaciones: payload.observaciones ?? null,
    };
  }
}