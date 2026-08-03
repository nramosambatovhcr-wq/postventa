import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';

// ═══════════════════════════════════════════════════════════════
//  INTERFACES  —  Abastecimiento
// ═══════════════════════════════════════════════════════════════

export interface InventarioConsolidado {
  codigoArticulo:       string;
  descripcion:          string;
  claseId:              string;
  clase:                string;
  grupo:                string;
  lineaCompetencia:     string;
  stockTotal:           number;
  stockReservado:       number;
  stockDisponible:      number;
  fob:                  number;
  costoPromedio:        number;
  valorInventarioTotal: number;
  precioSinIva:         number;
  descuentoMaximo:      number;
  primeraCompra:        string | null;
  ultimaCompra:         string | null;
  ultimaVenta:          string | null;
  diasRendimiento:      number | null;
  vendidoUltimoMes:     number;
  undVendidasTotal:     number;
  costoTotalVendido:    number;
  precioTotalVendido:   number;
  margenUtilidad:       number;
  numTransferencias:    number;
  agenciasUbicaciones:  string;
}

export interface ApiResponseConsolidado {
  success:        boolean;
  totalRegistros: number;
  tiempoSegundos: number;
  filtros:        FiltrosAbastecimiento;
  datos:          InventarioConsolidado[];
}

export interface FiltrosAbastecimiento {
  clase?:         string;
  grupo?:         string;
  articulo?:      string;
  stockMinimo?:   number;
  mesesSinVenta?: number;
  limite?:        number;
  offset?:        number;
}

export interface MaestroArticulo {
  articulo:         string;
  nombre:           string;
  claseId:          string;
  clase:            string;
  grupoId:          string;
  grupo:            string;
  lineaCompetencia: string;
  fob:              number;
  costoPromedio:    number;
  precioSinIva:     number;
  descuentoMaximo:  number;
  primeraCompra:    string | null;
  ultimaCompra:     string | null;
  ultimaVenta:      string | null;
}

export interface StockAgencia {
  oficinaId:       string;
  oficina:         string;
  bodegaId:        string;
  bodega:          string;
  ubicacion:       string;
  stock:           number;
  stockReservado:  number;
  stockDisponible: number;
  costoUni:        number;
  valorTotal:      number;
}

export interface VentasHistoricas {
  oficinaId:      string;
  oficina:        string;
  cant1Mes:       number;
  cant3Meses:     number;
  cant6Meses:     number;
  cant12Meses:    number;
  promMensual3M:  number;
  promMensual6M:  number;
  promMensual12M: number;
  ingresoTotal:   number;
  costoTotal:     number;
  margenTotal:    number;
}

export interface MetricasAbast {
  oficinaId:           string;
  oficina:             string;
  stockMinimoSugerido: number;
  stockMaximoSugerido: number;
  puntoReorden:        number;
  estadoStock:         'CRÍTICO' | 'REORDEN' | 'SOBRESTOCK' | 'NORMAL';
  mesesInventario:     number | null;
  cantidadAPedir:      number;
}

export interface ApiResponseArticuloDetalle {
  success:                boolean;
  maestro:                MaestroArticulo;
  stockTotalConsolidado:  number;
  agenciasConStock:       number;
  stockPorAgencia:        StockAgencia[];
  ventasHistoricas:       VentasHistoricas[];
  metricasAbastecimiento: MetricasAbast[];
}

export interface SinMovimiento {
  articulo:        string;
  descripcion:     string;
  clase:           string;
  grupo:           string;
  stockTotal:      number;
  costoPromedio:   number;
  valorInventario: number;
  ultimaVenta:     string | null;
  ultimaCompra:    string | null;
  diasUltimaVenta: number | null;
  ubicaciones:     string;
}

export interface ApiResponseSinMovimiento {
  success:        boolean;
  mesesSinVenta:  number;
  totalRegistros: number;
  valorTotal:     number;
  datos:          SinMovimiento[];
}

export interface QuiebreStock {
  articulo:              string;
  descripcion:           string;
  clase:                 string;
  grupo:                 string;
  ultimaVenta:           string | null;
  ultimaCompra:          string | null;
  vendidoEnPeriodo:      number;
  precioSinIva:          number;
  ventaPotencialPerdida: number;
}

export interface ApiResponseQuiebreStock {
  success:               boolean;
  mesesReferencia:       number;
  totalArticulos:        number;
  ventaPotencialPerdida: number;
  datos:                 QuiebreStock[];
}

export interface ResumenKPIs {
  totalArticulosConStock:   number;
  totalArticulosSinStock:   number;
  valorTotalInventario:     number;
  articulosSinVenta6Meses:  number;
  articulosSinVenta12Meses: number;
  articulosConVentaUltMes:  number;
  costoPromedioInventario:  number;
  totalAgencias:            number;
}

export interface ApiResponseResumen {
  success: boolean;
  datos:   ResumenKPIs;
}

export interface TopRotacion {
  articulo:     string;
  descripcion:  string;
  clase:        string;
  grupo:        string;
  totalVendido: number;
  ingresoTotal: number;
  costoTotal:   number;
  margenTotal:  number;
  stockActual:  number;
  ultimaVenta:  string | null;
  promMensual:  number;
}

export interface ApiResponseTopRotacion {
  success:        boolean;
  meses:          number;
  totalArticulos: number;
  datos:          TopRotacion[];
}

export interface InventarioSncaMultLubr {
  codigoArticulo:       string;
  descripcion:          string;
  claseId:              string;
  clase:                string;
  grupo:                string;
  lineaCompetencia:     string;
  ultimaCompra:         string | null;
  ultimaVenta:          string | null;
  diasRendimiento:      number | null;
  fob:                  number;
  stockDisponibleTotal: number;
  costoPromedio:        number;
  valorInventarioTotal: number;
  precioSinIva:         number;
  vendidoUltimoMes:     number;
  undVendidasTotal:     number;
  costoTotalVendido:    number;
  precioTotalVendido:   number;
  margenUtilidad:       number;
}

export interface ApiResponseSncaMultLubr {
  success:        boolean;
  totalRegistros: number;
  tiempoSegundos: number;
  datos:          InventarioSncaMultLubr[];
}

// ─────────────────────────────────────────────────────────────
//  Pendientes  (GET /api/abastecimiento/pendientes)
// ─────────────────────────────────────────────────────────────
export interface PendienteAsignacion {
  orden:                 string;
  cotizacion:            string;
  invoice_con_anticipo:  string;
  proveedor:             string;
  date_invoice:          string | null;
  dias_pasados:          number;
  codigo:                string;
  descripcion:           string;
  solicitado:            number;
  enviado:               number;
  cantidad_activa:       number;
  cantidad_transito:     number;
  invoice_bls:           string;
  invoicebl_por_arribar: string;
  bls_en_transito:       string;
  bls_arribados:         string;
}
// ═══════════════════════════════════════════════════════════════
//  INTERFACES  —  Forecast
// ═══════════════════════════════════════════════════════════════

/** Filtros opcionales para GET /api/forecast/ventas-mensuales */
export interface FiltrosVentasMensuales {
  anioDesde?: number;   // default 2023
  clase?:     string;
  grupo?:     string;
  articulo?:  string;
}

/** Fila devuelta por /api/forecast/ventas-mensuales */
export interface VentaMensual {
  codEmpresa:       string;
  descripcion:      string;
  claseId:          string;
  clase:            string;
  grupoId:          string;
  grupo:            string;
  lineaCompetencia: string;
  fob:              number;
  anio:             number;
  mes:              number;
  cantVendida:      number;
}

export interface ApiResponseVentasMensuales {
  success:        boolean;
  totalRegistros: number;
  tiempoSegundos: number;
  filtros:        FiltrosVentasMensuales;
  datos:          VentaMensual[];
}

/** Fila devuelta por /api/forecast/inventario */
export interface InventarioForecast {
  codEmpresa:       string;
  descripcion:      string;
  claseId:          string;
  clase:            string;
  grupoId:          string;
  grupo:            string;
  lineaCompetencia: string;
  fob:              number;
  costoPromedio:    number;
  stockTotal:       number;
  stockReservado:   number;
  stockDisponible:  number;
  valorInventario:  number;
  precioSinIva:     number;
  descuentoMax:     number;
  fechaUc:          string | null;  // fecha última compra
  qtyUc:            number;         // cantidad última compra
  ultimaVenta:      string | null;
  vendidoUltMes:    number;
}

export interface ApiResponseInventarioForecast {
  success:        boolean;
  totalRegistros: number;
  tiempoSegundos: number;
  datos:          InventarioForecast[];
}

/** Fila devuelta por /api/forecast/ordenes-compra (misma forma que PendienteAsignacion) */
export interface OrdenCompraForecast {
  ordenCompra:         string;
  fechaOrden:          string;
  diasTranscurridos:   number | null;
  proveedor:           string;
  cotizacion:          string;
  codigo:              string;
  descripcion:         string;
  cantidadSolicitada:  number | null;
  cantidadEnviada:     number | null;
  cantidadPendiente:   number | null;
  cantidadTransito:    number | null;
  invoiceBls:          string;
  invoiceBlPorArribar: string;
  blsEnTransito:       string;
  blsArribados:        string;
}

export interface ApiResponseOrdenesForecast {
  success:        boolean;
  totalRegistros: number;
  datos:          OrdenCompraForecast[];
}

/** Bloque por año para METO WINTEL, dentro de /api/forecast/articulo/{codigo} */
export interface VentaAnioForecast {
  anio:      number;
  totalAnio: number;
  meses: {
    mes:         number;
    cantVendida: number;
  }[];
}

/** Respuesta completa de /api/forecast/articulo/{codigo} */
export interface ApiResponseArticuloForecast {
  success:           boolean;
  tiempoSegundos:    number;
  inventario:        InventarioForecast | null;
  ventasPorAnio:     VentaAnioForecast[];   // listo para METO WINTEL
  ventasDetalle:     VentaMensual[];
  ordenesPendientes: OrdenCompraForecast[];
  totalPendiente:    number;
  totalTransito:     number;
}

// ═══════════════════════════════════════════════════════════════
//  INTERFACES  —  Maestro de Partes
// ═══════════════════════════════════════════════════════════════

/** Fila devuelta por los 3 endpoints de MaestroPartesController */
export interface MaestroParte {
  articulo:         string;
  nombre:           string;
  claseId:          string | null;
  clase:            string | null;
  grupoId:          string | null;
  grupo:            string | null;
  lineaCompId:      string | null;
  lineaCompetencia: string | null;
  fob:              number;
}

/** Respuesta de GET /api/MaestroPartes/{articulo} */
export interface ApiResponseMaestroParte {
  success: boolean;
  message?: string;
  datos:   MaestroParte;
}

/** Respuesta de GET /api/MaestroPartes/buscar */
export interface ApiResponseMaestroPartesBusqueda {
  success:       boolean;
  textoBuscado:  string;
  total:         number;
  datos:         MaestroParte[];
}

/** Respuesta de GET /api/MaestroPartes (listado paginado) */
export interface ApiResponseMaestroPartesPaginado {
  success:         boolean;
  pagina:          number;
  tamanoPagina:    number;
  totalRegistros:  number;
  totalPaginas:    number;
  datos:           MaestroParte[];
}

// ═══════════════════════════════════════════════════════════════
//  SERVICE
// ═══════════════════════════════════════════════════════════════

@Injectable({
  providedIn: 'root'
})
export class AbastecimientoService {

  private readonly baseUrl        = 'https://bodega.vehicentro.com:1830/api/api/abastecimiento';
  private readonly forecastBaseUrl = 'https://bodega.vehicentro.com:1830/api/api/forecast';
  private readonly maestroPartesBaseUrl = 'https://bodega.vehicentro.com:1830/api/api/MaestroPartes';

  constructor(private http: HttpClient) {}

  // ═══════════════════════════════════════════════════════════════
  //  ABASTECIMIENTO
  // ═══════════════════════════════════════════════════════════════

  // ─────────────────────────────────────────────────────────────
  //  GET /api/abastecimiento/consolidado
  // ─────────────────────────────────────────────────────────────
  getConsolidado(filtros: FiltrosAbastecimiento = {}): Observable<ApiResponseConsolidado> {
    let params = new HttpParams();
    if (filtros.clase)                params = params.set('clase',         filtros.clase);
    if (filtros.grupo)                params = params.set('grupo',         filtros.grupo);
    if (filtros.articulo)             params = params.set('articulo',      filtros.articulo);
    if (filtros.stockMinimo   != null) params = params.set('stockMinimo',   filtros.stockMinimo.toString());
    if (filtros.mesesSinVenta != null) params = params.set('mesesSinVenta', filtros.mesesSinVenta.toString());
    if (filtros.limite        != null) params = params.set('limite',        filtros.limite.toString());
    if (filtros.offset        != null) params = params.set('offset',        filtros.offset.toString());

    return this.http.get<ApiResponseConsolidado>(`${this.baseUrl}/consolidado`, { params }).pipe(
      catchError(err => {
        console.error('getConsolidado error:', err);
        return of({ success: false, totalRegistros: 0, tiempoSegundos: 0, filtros, datos: [] });
      })
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  GET /api/abastecimiento/articulo/{codigo}
  // ─────────────────────────────────────────────────────────────
  getArticuloDetalle(codigo: string): Observable<ApiResponseArticuloDetalle> {
    return this.http.get<ApiResponseArticuloDetalle>(
      `${this.baseUrl}/articulo/${encodeURIComponent(codigo)}`
    ).pipe(
      catchError(err => {
        console.error('getArticuloDetalle error:', err);
        throw err;
      })
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  GET /api/abastecimiento/sin-movimiento
  // ─────────────────────────────────────────────────────────────
  getSinMovimiento(meses: number = 6, limite: number = 1000): Observable<ApiResponseSinMovimiento> {
    const params = new HttpParams()
      .set('meses',  meses.toString())
      .set('limite', limite.toString());

    return this.http.get<ApiResponseSinMovimiento>(`${this.baseUrl}/sin-movimiento`, { params }).pipe(
      catchError(err => {
        console.error('getSinMovimiento error:', err);
        return of({ success: false, mesesSinVenta: meses, totalRegistros: 0, valorTotal: 0, datos: [] });
      })
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  GET /api/abastecimiento/quiebre-stock
  // ─────────────────────────────────────────────────────────────
  getQuiebreStock(mesesReferencia: number = 3): Observable<ApiResponseQuiebreStock> {
    const params = new HttpParams().set('mesesReferencia', mesesReferencia.toString());

    return this.http.get<ApiResponseQuiebreStock>(`${this.baseUrl}/quiebre-stock`, { params }).pipe(
      catchError(err => {
        console.error('getQuiebreStock error:', err);
        return of({ success: false, mesesReferencia, totalArticulos: 0, ventaPotencialPerdida: 0, datos: [] });
      })
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  GET /api/abastecimiento/resumen
  // ─────────────────────────────────────────────────────────────
  getResumen(): Observable<ApiResponseResumen> {
    return this.http.get<ApiResponseResumen>(`${this.baseUrl}/resumen`).pipe(
      catchError(err => {
        console.error('getResumen error:', err);
        throw err;
      })
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  GET /api/abastecimiento/top-rotacion
  // ─────────────────────────────────────────────────────────────
  getTopRotacion(
    top:    number  = 50,
    meses:  number  = 12,
    clase?: string,
    grupo?: string
  ): Observable<ApiResponseTopRotacion> {
    let params = new HttpParams()
      .set('top',   top.toString())
      .set('meses', meses.toString());
    if (clase) params = params.set('clase', clase);
    if (grupo) params = params.set('grupo', grupo);

    return this.http.get<ApiResponseTopRotacion>(`${this.baseUrl}/top-rotacion`, { params }).pipe(
      catchError(err => {
        console.error('getTopRotacion error:', err);
        return of({ success: false, meses, totalArticulos: 0, datos: [] });
      })
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  GET /api/abastecimiento/inventario-snca-mult-lubr
  // ─────────────────────────────────────────────────────────────
  getInventarioSncaMultLubr(): Observable<ApiResponseSncaMultLubr> {
    return this.http.get<ApiResponseSncaMultLubr>(
      `${this.baseUrl}/inventario-snca-mult-lubr`
    ).pipe(
      catchError(err => {
        console.error('getInventarioSncaMultLubr error:', err);
        return of({ success: false, totalRegistros: 0, tiempoSegundos: 0, datos: [] });
      })
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  GET /api/abastecimiento/pendientes
  // ─────────────────────────────────────────────────────────────
  getPendientesAsignacion(): Observable<PendienteAsignacion[]> {
    return this.http.get<PendienteAsignacion[]>(
      `${this.baseUrl}/pendientes`
    ).pipe(
      catchError(err => {
        console.error('getPendientesAsignacion error:', err);
        return of([] as PendienteAsignacion[]);
      })
    );
  }

  getPendientesAsignacionByUsuario(usuarioId: number): Observable<PendienteAsignacion[]> {
  return this.http.get<PendienteAsignacion[]>(
    `${this.baseUrl}/pendientes/usuario/${usuarioId}`
  ).pipe(
    catchError(err => {
      console.error('getPendientesAsignacionByUsuario error:', err);
      return of([] as PendienteAsignacion[]);
    })
  );
}

  // ═══════════════════════════════════════════════════════════════
  //  FORECAST  (nuevos)
  // ═══════════════════════════════════════════════════════════════

  // ─────────────────────────────────────────────────────────────
  //  GET /api/forecast/ventas-mensuales
  //  Ventas agrupadas por artículo/año/mes desde 2023.
  //  Alimenta CANT_M1…CANT_M12 de METO WINTEL.
  //  Filtros opcionales: anioDesde, clase, grupo, articulo
  // ─────────────────────────────────────────────────────────────
  getForecastVentasMensuales(filtros: FiltrosVentasMensuales = {}): Observable<ApiResponseVentasMensuales> {
    let params = new HttpParams();
    if (filtros.anioDesde != null) params = params.set('anioDesde', filtros.anioDesde.toString());
    if (filtros.clase)             params = params.set('clase',     filtros.clase);
    if (filtros.grupo)             params = params.set('grupo',     filtros.grupo);
    if (filtros.articulo)          params = params.set('articulo',  filtros.articulo);

    return this.http.get<ApiResponseVentasMensuales>(`${this.forecastBaseUrl}/ventas-mensuales`, { params }).pipe(
      catchError(err => {
        console.error('getForecastVentasMensuales error:', err);
        return of({ success: false, totalRegistros: 0, tiempoSegundos: 0, filtros, datos: [] });
      })
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  GET /api/forecast/inventario
  //  Stock + QTY_UC + FECHA_UC para poblar la ficha CERTEZA.
  //  Filtros opcionales: clase, grupo, articulo
  // ─────────────────────────────────────────────────────────────
  getForecastInventario(
    clase?:    string,
    grupo?:    string,
    articulo?: string
  ): Observable<ApiResponseInventarioForecast> {
    let params = new HttpParams();
    if (clase)    params = params.set('clase',    clase);
    if (grupo)    params = params.set('grupo',    grupo);
    if (articulo) params = params.set('articulo', articulo);

    return this.http.get<ApiResponseInventarioForecast>(`${this.forecastBaseUrl}/inventario`, { params }).pipe(
      catchError(err => {
        console.error('getForecastInventario error:', err);
        return of({ success: false, totalRegistros: 0, tiempoSegundos: 0, datos: [] });
      })
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  GET /api/forecast/ordenes-compra
  //  Órdenes pendientes desde Postgres.
  //  Filtro opcional: codigo (filtra por artículo)
  // ─────────────────────────────────────────────────────────────
  getForecastOrdenesCompra(codigo?: string): Observable<ApiResponseOrdenesForecast> {
    let params = new HttpParams();
    if (codigo) params = params.set('codigo', codigo);

    return this.http.get<ApiResponseOrdenesForecast>(`${this.forecastBaseUrl}/ordenes-compra`, { params }).pipe(
      catchError(err => {
        console.error('getForecastOrdenesCompra error:', err);
        return of({ success: false, totalRegistros: 0, datos: [] });
      })
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  GET /api/forecast/articulo/{codigo}
  //  Ficha completa CERTEZA + WINTEL en una sola llamada:
  //    inventario + ventas 2023-hoy + ventasPorAnio + órdenes Postgres
  // ─────────────────────────────────────────────────────────────
  getForecastArticulo(codigo: string): Observable<ApiResponseArticuloForecast> {
    return this.http.get<ApiResponseArticuloForecast>(
      `${this.forecastBaseUrl}/articulo/${encodeURIComponent(codigo)}`
    ).pipe(
      catchError(err => {
        console.error('getForecastArticulo error:', err);
        throw err;
      })
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  MAESTRO DE PARTES  (nuevos)
  // ═══════════════════════════════════════════════════════════════

  // ─────────────────────────────────────────────────────────────
  //  GET /api/MaestroPartes/{articulo}
  //  Búsqueda por código exacto.
  // ─────────────────────────────────────────────────────────────
  getMaestroPartePorArticulo(articulo: string): Observable<ApiResponseMaestroParte> {
    return this.http.get<ApiResponseMaestroParte>(
      `${this.maestroPartesBaseUrl}/${encodeURIComponent(articulo)}`
    ).pipe(
      catchError(err => {
        console.error('getMaestroPartePorArticulo error:', err);
        throw err;
      })
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  GET /api/MaestroPartes/buscar
  //  Búsqueda flexible por código o nombre (parcial).
  //  Filtro opcional: limite (default backend: 50, tope 500)
  // ─────────────────────────────────────────────────────────────
  buscarMaestroPartes(texto: string, limite?: number): Observable<ApiResponseMaestroPartesBusqueda> {
    let params = new HttpParams().set('texto', texto);
    if (limite != null) params = params.set('limite', limite.toString());

    return this.http.get<ApiResponseMaestroPartesBusqueda>(`${this.maestroPartesBaseUrl}/buscar`, { params }).pipe(
      catchError(err => {
        console.error('buscarMaestroPartes error:', err);
        return of({ success: false, textoBuscado: texto, total: 0, datos: [] });
      })
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  GET /api/MaestroPartes
  //  Listado paginado de todo el maestro de partes.
  //  Filtros opcionales: pagina (default 1), tamanoPagina (default 50, tope 500)
  // ─────────────────────────────────────────────────────────────
  getMaestroPartesPaginado(pagina: number = 1, tamanoPagina: number = 50): Observable<ApiResponseMaestroPartesPaginado> {
    const params = new HttpParams()
      .set('pagina',       pagina.toString())
      .set('tamanoPagina', tamanoPagina.toString());

    return this.http.get<ApiResponseMaestroPartesPaginado>(this.maestroPartesBaseUrl, { params }).pipe(
      catchError(err => {
        console.error('getMaestroPartesPaginado error:', err);
        return of({ success: false, pagina, tamanoPagina, totalRegistros: 0, totalPaginas: 0, datos: [] });
      })
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════════

  /** Devuelve solo el array de datos del consolidado. */
  getConsolidadoDatos(filtros: FiltrosAbastecimiento = {}): Observable<InventarioConsolidado[]> {
    return this.getConsolidado(filtros).pipe(
      map(res => res.success ? res.datos : [])
    );
  }

  /** Devuelve solo las métricas de un artículo por agencia. */
  getMetricasArticulo(codigo: string): Observable<MetricasAbast[]> {
    return this.getArticuloDetalle(codigo).pipe(
      map(res => res.metricasAbastecimiento)
    );
  }

  /**
   * Calcula el estado de stock más crítico entre todas las agencias.
   * Orden de prioridad: CRÍTICO > REORDEN > SOBRESTOCK > NORMAL
   */
  getEstadoStockGlobal(codigo: string): Observable<'CRÍTICO' | 'REORDEN' | 'SOBRESTOCK' | 'NORMAL' | 'SIN DATOS'> {
    return this.getArticuloDetalle(codigo).pipe(
      map(res => {
        const metricas = res.metricasAbastecimiento;
        if (!metricas.length) return 'SIN DATOS';
        const prioridad = ['CRÍTICO', 'REORDEN', 'SOBRESTOCK', 'NORMAL'] as const;
        return prioridad.find(e => metricas.some(m => m.estadoStock === e)) ?? 'NORMAL';
      }),
      catchError(() => of('SIN DATOS' as const))
    );
  }

  /** Filtra el inventario consolidado por artículos sin venta en los últimos N meses. */
  getArticulosSinVenta(meses: number = 6, limite: number = 500): Observable<InventarioConsolidado[]> {
    return this.getConsolidadoDatos({ mesesSinVenta: meses, limite });
  }

  /** Margen porcentual de un artículo del consolidado. */
  calcularMargenPct(item: InventarioConsolidado): number {
    if (!item.precioTotalVendido || item.precioTotalVendido === 0) return 0;
    return Math.round((item.margenUtilidad / item.precioTotalVendido) * 10000) / 100;
  }

  /** Margen porcentual de un artículo SNCA/MULT/LUBR. */
  calcularMargenPctSncaMultLubr(item: InventarioSncaMultLubr): number {
    if (!item.precioTotalVendido || item.precioTotalVendido === 0) return 0;
    return Math.round((item.margenUtilidad / item.precioTotalVendido) * 10000) / 100;
  }

  /**
   * Extrae el array ventasPorAnio de la ficha de un artículo forecast.
   * Formato listo para alimentar METO WINTEL (CANT_M1…CANT_M12).
   */
  getForecastVentasPorAnio(codigo: string): Observable<VentaAnioForecast[]> {
    return this.getForecastArticulo(codigo).pipe(
      map(res => res.ventasPorAnio)
    );
  }
}