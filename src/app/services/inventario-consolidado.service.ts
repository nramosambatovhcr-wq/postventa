// src/app/core/services/inventario-consolidado.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, Observable, of } from 'rxjs';

/* --------------------- INTERFACES --------------------- */
export interface InventarioConsolidadoDto {
  codigoArticulo: string;
  descripcion: string;
  claseId: string;
  clase: string;
  grupo: string;
  grupoId: string;
  lineaCompetencia: string;
  stockTotalConsolidado: number;
  stockReservadoTotal: number;
  stockDisponibleTotal: number;
  fob: number;
  costoPromedio: number;
  valorInventarioTotal: number;
  precioSinIva: number;
  descuentoMaximo: number;
  primeraCompra?: string;
  ultimaCompra?: string;
  ultimaVenta?: string;
  vendidoUltimoMes: number;
  numTransferencias: number;
  agenciasUbicaciones: string;
  fechaActualizacion?: string;
  tiempoEntrega?: number;
  cantidadMinima?: number;
}

export interface RespuestaConsolidado {
  success: boolean;
  totalRegistros: number;
  tiempoMs: number;
  tiempoSegundos: number;
  fuente: string;
  advertencia?: string;
  data: InventarioConsolidadoDto[];
}

export interface RespuestaRefrescar {
  success: boolean;
  mensaje: string;
  tiempoMs: number;
}

export interface TiempoEntregaRequest {
  tiempoEntrega: number;
  usuario?: string;
}

export interface TiempoEntregaItem {
  codigoArticulo: string;
  tiempoEntrega: number;
}

export interface TiempoEntregaBatchRequest {
  articulos: TiempoEntregaItem[];
  usuario?: string;
}

export interface TiempoEntregaResponse {
  success: boolean;
  articulo: string;
  tiempoEntrega: number;
  usuarioModif?: string;
  fechaModif?: string;
  mensaje?: string;
}

export interface BatchResponse {
  success: boolean;
  message: string;
  actualizados?: number;
  insertados?: number;
  totalProcesados?: number;
  totalEnviados?: number;
  errores?: string[];
}

/* ----------- CANTIDADES MÍNIMAS ----------- */
export interface CantidadMinimaRequest {
  cantidadMinima: number;
  usuario?: string;
}

export interface CantidadMinimaItem {
  codigoArticulo: string;
  cantidadMinima: number;
}

export interface CantidadMinimaBatchRequest {
  articulos: CantidadMinimaItem[];
  usuario?: string;
}

export interface CantidadMinimaResponse {
  success: boolean;
  articulo: string;
  cantidadMinima: number;
  usuarioModif?: string;
  fechaModif?: string;
  mensaje?: string;
}

/* ----------- INVENTARIO SIMPLIFICADO ----------- */

/** Refleja el DTO del backend InventarioSimplificadoDto */
export interface InventarioSimplificadoDto {
  codigoArticulo: string;
  descripcion: string;
  clase: string;
  grupo: string;
  stockTotal: number;
  stockReservado: number;
  stockDisponible: number;
  agenciasConDisponible: string;
  costoPromedio: number;
  precioSinIva: number;
  precioConIva: number;
}

/** Parámetros de consulta para el endpoint inventario-simplificado */
export interface InventarioSimplificadoRequest {
  articulo?: string;
  clase?: string;
  grupo?: string;
  /** Si es true trae solo artículos con stock > 0. Default: false */
  soloConStock?: boolean;
  pagina?: number;
  /** -1 para traer todo sin paginar */
  registrosPorPagina?: number;
}

/** Respuesta paginada del endpoint inventario-simplificado */
export interface RespuestaSimplificado {
  success: boolean;
  paginaActual: number;
  registrosPorPagina: number;
  totalRegistros: number;
  totalPaginas: number;
  data: InventarioSimplificadoDto[];
}

export interface ImagenUnificada { id: number; fuente: string; url: string; nombre: string; esBytea: boolean; }
export interface ImagenesResponse { codigo: string; totalImagenes: number; fuentes: {importaciones:number; laboratorio:number}; imagenes: ImagenUnificada[]; }


/* --------------------- SERVICE --------------------- */
@Injectable({
  providedIn: 'root'
})
export class InventarioConsolidadoService {
  private readonly baseUrl = 'https://bodega.vehicentro.com:1830/api/api/InventarioConsolidado';
  private readonly BASE = 'https://bodega.vehicentro.com:1830/api/api/ImagenesUnificadas';

  constructor(private http: HttpClient) {}


  // Interfaces a exportar

// Método a agregar dentro de la clase
getImagenesPorCodigo(codigo: string): Observable<ImagenesResponse | null> {
  return this.http.get<ImagenesResponse>(
    `${this.BASE}/${encodeURIComponent(codigo)}`
  ).pipe(catchError(() => of(null)));
}


  getCompleto(
    articulo?: string,
    clase?: string,
    grupo?: string,
    pagina: number = 1,
    registrosPorPagina: number = 1000,
    ordenarPor?: string
  ): Observable<RespuestaConsolidado> {
    let params = new HttpParams()
      .set('pagina', pagina.toString())
      .set('registrosPorPagina', registrosPorPagina.toString());

    if (articulo)   { params = params.set('articulo', articulo); }
    if (clase)      { params = params.set('clase', clase); }
    if (grupo)      { params = params.set('grupo', grupo); }
    if (ordenarPor) { params = params.set('ordenarPor', ordenarPor); }

    return this.http.get<RespuestaConsolidado>(`${this.baseUrl}/all`, { params });
  }

  /**
   * Inventario simplificado: una fila por artículo con stock consolidado,
   * agencias con disponible y precios (sin/con IVA).
   *
   * @example
   * // Solo artículos con stock, paginado
   * this.service.getSimplificado({ soloConStock: true, pagina: 1, registrosPorPagina: 50 });
   *
   * // Buscar por código de artículo sin paginar
   * this.service.getSimplificado({ articulo: 'AAK', registrosPorPagina: -1 });
   */
  getSimplificado(
    request: InventarioSimplificadoRequest = {}
  ): Observable<RespuestaSimplificado> {
    let params = new HttpParams();

    if (request.articulo)                          { params = params.set('articulo',           request.articulo); }
    if (request.clase)                             { params = params.set('clase',               request.clase); }
    if (request.grupo)                             { params = params.set('grupo',               request.grupo); }
    if (request.soloConStock !== undefined)         { params = params.set('soloConStock',        String(request.soloConStock)); }
    if (request.pagina !== undefined)              { params = params.set('pagina',              String(request.pagina)); }
    if (request.registrosPorPagina !== undefined)  { params = params.set('registrosPorPagina',  String(request.registrosPorPagina)); }

    return this.http.get<RespuestaSimplificado>(`${this.baseUrl}/inventario-simplificado`, { params });
  }

  /**
   * Refresca la vista materializada en el backend.
   */
  refrescarVista(): Observable<RespuestaRefrescar> {
    return this.http.post<RespuestaRefrescar>(`${this.baseUrl}/refrescar`, {});
  }

  /**
   * Obtiene el tiempo de entrega de un artículo
   * @param codigoArticulo Código del artículo
   */
  getTiempoEntrega(codigoArticulo: string): Observable<TiempoEntregaResponse> {
    return this.http.get<TiempoEntregaResponse>(`${this.baseUrl}/tiempo-entrega/${codigoArticulo}`);
  }

  /**
   * Actualiza el tiempo de entrega de un artículo (PUT)
   * @param codigoArticulo Código del artículo
   * @param request Datos del tiempo de entrega
   */
  actualizarTiempoEntrega(codigoArticulo: string, request: TiempoEntregaRequest): Observable<TiempoEntregaResponse> {
    return this.http.put<TiempoEntregaResponse>(`${this.baseUrl}/tiempo-entrega/${codigoArticulo}`, request);
  }

  /**
   * Crea o actualiza el tiempo de entrega de un artículo (POST)
   * @param request Datos del tiempo de entrega
   */
  crearTiempoEntrega(request: TiempoEntregaRequest & { codigoArticulo: string }): Observable<TiempoEntregaResponse> {
    return this.http.post<TiempoEntregaResponse>(`${this.baseUrl}/tiempo-entrega`, request);
  }

  /**
   * Elimina el tiempo de entrega personalizado de un artículo
   * @param codigoArticulo Código del artículo
   */
  eliminarTiempoEntrega(codigoArticulo: string): Observable<{ success: boolean; message: string; articulo: string }> {
    return this.http.delete<{ success: boolean; message: string; articulo: string }>(`${this.baseUrl}/tiempo-entrega/${codigoArticulo}`);
  }

  /**
   * Actualiza múltiples tiempos de entrega en lote (PUT)
   * @param request Datos del lote
   */
  actualizarTiemposEntregaLote(request: TiempoEntregaBatchRequest): Observable<BatchResponse> {
    return this.http.put<BatchResponse>(`${this.baseUrl}/tiempo-entrega/batch`, request);
  }

  /**
   * Crea o actualiza múltiples tiempos de entrega en lote (POST)
   * @param request Datos del lote
   */
  crearTiemposEntregaLote(request: TiempoEntregaBatchRequest): Observable<BatchResponse> {
    return this.http.post<BatchResponse>(`${this.baseUrl}/tiempo-entrega/batch`, request);
  }

  /**
   * Obtiene la cantidad mínima de un artículo
   */
  getCantidadMinima(codigoArticulo: string): Observable<CantidadMinimaResponse> {
    return this.http.get<CantidadMinimaResponse>(`${this.baseUrl}/cantidad-minima/${codigoArticulo}`);
  }

  /**
   * Actualiza la cantidad mínima de un artículo (PUT)
   */
  actualizarCantidadMinima(codigoArticulo: string, request: CantidadMinimaRequest): Observable<CantidadMinimaResponse> {
    return this.http.put<CantidadMinimaResponse>(`${this.baseUrl}/cantidad-minima/${codigoArticulo}`, request);
  }

  /**
   * Crea o actualiza la cantidad mínima de un artículo (POST)
   */
  crearCantidadMinima(request: CantidadMinimaRequest & { codigoArticulo: string }): Observable<CantidadMinimaResponse> {
    return this.http.post<CantidadMinimaResponse>(`${this.baseUrl}/cantidad-minima`, request);
  }

  /**
   * Elimina la cantidad mínima personalizada de un artículo
   */
  eliminarCantidadMinima(codigoArticulo: string): Observable<{ success: boolean; message: string; articulo: string }> {
    return this.http.delete<{ success: boolean; message: string; articulo: string }>(`${this.baseUrl}/cantidad-minima/${codigoArticulo}`);
  }

  /**
   * Actualiza múltiples cantidades mínimas en lote (PUT)
   */
  actualizarCantidadesMinimasLote(request: CantidadMinimaBatchRequest): Observable<BatchResponse> {
    return this.http.put<BatchResponse>(`${this.baseUrl}/cantidad-minima/batch`, request);
  }

  /**
   * Crea múltiples cantidades mínimas en lote (POST)
   */
  crearCantidadesMinimasLote(request: CantidadMinimaBatchRequest): Observable<BatchResponse> {
    return this.http.post<BatchResponse>(`${this.baseUrl}/cantidad-minima/batch`, request);
  }

  /**
   * Obtiene TODOS los tiempos de entrega almacenados
   */
  getAllTiemposEntrega(): Observable<{ success: boolean; data: TiempoEntregaResponse[] }> {
    return this.http.get<{ success: boolean; data: TiempoEntregaResponse[] }>(`${this.baseUrl}/tiempo-entrega`);
  }

  /**
   * Obtiene TODAS las cantidades mínimas almacenadas
   */
  getAllCantidadesMinimas(): Observable<{ success: boolean; data: CantidadMinimaResponse[] }> {
    return this.http.get<{ success: boolean; data: CantidadMinimaResponse[] }>(`${this.baseUrl}/cantidad-minima`);
  }

  getAllOficinas(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/oficinas-bodegas`);
  }
}