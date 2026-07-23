import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, filter, forkJoin, map, Observable, of, switchMap } from 'rxjs';

export interface TransferenciaModel {
  numero: number;
  fecha: string; 
  estado: string;
  oficinaOrigen: string;
  usuarioCreacion: string;
  oficinaDestino: string;
  cantidadSolicitada: number;
  articulo: string;
  nombreArticulo: string;
}

export interface TransferenciaModel1 {
  numero: number;
  tipoDocumento: string;
  fecha: string; 
  estado: string;
  usuarioCreacion: string;
  
  // Oficina Origen
  oficinaOrigenCodigo: string;
  oficinaOrigenNombre: string;
  
  // Oficina Destino
  oficinaDestinoCodigo: string;
  oficinaDestinoNombre: string;
  
  // Información del artículo
  cantidadSolicitada: number;
  articulo: string;
  nombreArticulo: string;
  
  // Información de stock en oficina destino
  stock: number;
  stockReservado: number;
  stockDisponible: number;
  ubicacion: string;
  cantidadVendidaUltimoMes: number;
  
  // Información de movimientos (arrays como strings concatenados con |)
  movimientosTipo: string;
  movimientosUsuario: string;
  movimientosFecha: string;
  movimientosCantidad: string;
  movimientosOficina: string;
  totalMovimientos: number;
}

// Interface para inventario básico
export interface InventarioBasicoModel {
  claseId: string;
  clase: string;
  grupoId: string;
  grupo: string;
  articulo: string;
  nombre: string;
}

export interface ApiResponseInventarioBasico {
  success: boolean;
  articuloBuscado: string;
  totalRegistros: number;
  datos: InventarioBasicoModel[];
}

// Interface para los movimientos procesados (arrays reales)
export interface MovimientoDetalle {
  tipo: string;
  usuario: string;
  fecha: string;
  cantidad: string;
  oficina: string;
}

// Interface extendida que incluye movimientos procesados
export interface TransferenciaConMovimientos extends TransferenciaModel1 {
    estadoGeneral?: 'Pendiente' | 'En Proceso' | 'En Revisión' | 'Despachada';
  estadoArmado?: 'Pendiente' | 'Parcial' | 'Completo';
  estadoRevision?: 'Pendiente' | 'Incompleto' | 'Revisado';
  usuarioArmador?: string;
  fechaHoraSolicitud?: string; 
  movimientosDetalle: MovimientoDetalle[];
}

export interface ApiResponseTransferencias1 {
  success: boolean;
  totalRegistros: number;
  datos: TransferenciaModel1[];
}

export interface ApiResponseTransferencias {
  success: boolean;
  totalRegistros: number;
  datos: TransferenciaModel[];
}

export interface ApiResponseInventarioGenParcial {
  success: boolean;
  articuloBuscado: string;
  agenciaFiltrada: string;
  totalRegistros: number;
  stockTotal: number;
  datos: InventarioGenParcialItem[];
}

export interface InventarioGenParcialItem {
  oficinaId: string;
  oficina: string;
  bodegaId: string;
  bodega: string;
  claseId: string;
  clase: string;
  grupoId: string;
  grupo: string;
  articulo: string;
  nombre: string;
  ubicacion: string;
  lineaCompId: string;
  lineaCompetencia: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES PARA: GET /api/inventariooracle/inventario-agencia
// ─────────────────────────────────────────────────────────────────────────────

/** Un artículo del inventario de una agencia específica */
export interface InventarioUnaAgenciaItem {
  oficinaId:            string;
  oficina:              string;
  bodegaId:             string;
  bodega:               string;
  claseId:              string;
  clase:                string;
  grupoId:              string;
  grupo:                string;
  articulo:             string;
  nombre:               string;
  ubicacion:            string;
  lineaCompId:          string;
  lineaCompetencia:     string;
  stock:                number;
  stockReservado:       number;
  stockDisponible:      number;
  fob:                  number | null;
  costoUnitario:        number | null;
  costoTotal:           number | null;
  costoPromedio:        number | null;
  precioSinIva:         number;
  descuentoMaximo:      number;
  primeraFechaCompra:   string | null;  // ISO date string
  ultimaFechaCompra:    string | null;
  ultimaFechaVenta:     string | null;
  cantVendidaUltMes:    number;
  numeroTransferencias: number;
}

/** Respuesta del endpoint inventario-agencia */
export interface ApiResponseInventarioAgencia {
  success:         boolean;
  oficina:         string;
  pagina:          number;
  tamanoPagina:    number;
  total:           number;
  total_registros: number;   // ← CAMBIO 2: campo nuevo que devuelve el backend
  datos:           InventarioUnaAgenciaItem[];
}

/** Parámetros opcionales del endpoint inventario-agencia */
export interface FiltrosInventarioAgencia {
  bodegaId?:     string;
  claseId?:      string;
  grupoId?:      string;
  articulo?:     string;
  soloConStock?: boolean;
  page?:         number;
  pageSize?:     number;
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class OracleService {

  private apiUrl = 'https://bodega.vehicentro.com:1830/api'; 
  
  constructor(private http: HttpClient) { }

  getTransferenciasSolicitadas(): Observable<ApiResponseTransferencias> {
    const url = `${this.apiUrl}/api/InventarioOracle/transferencias-solicitadas`; 
    return this.http.get<ApiResponseTransferencias>(url);
  }

  getTransferenciasSolicitadas1(): Observable<ApiResponseTransferencias1> {
    const url = `${this.apiUrl}/api/InventarioOracle/transferencias-solicitadas`; 
    return this.http.get<ApiResponseTransferencias1>(url);
  }

  getTransferenciaPorNumero(numero: number): Observable<TransferenciaConMovimientos[]> {
    return this.http.get<TransferenciaConMovimientos[]>(`${this.apiUrl}/api/InventarioOracle/transferencias/${numero}`);
  }

  /**
   * Obtiene el inventario básico de un artículo específico
   * @param articulo Código del artículo a buscar
   * @returns Observable con la información básica del inventario
   */
  getInventarioBasicoPorArticulo(articulo: string): Observable<ApiResponseInventarioBasico> {
    const url = `${this.apiUrl}/api/InventarioOracle/articulo/basico`;
    return this.http.get<ApiResponseInventarioBasico>(url, {
      params: { articulo }
    });
  }

  getInventarioGenParcialPorArticulo(articulo: string, agencia: string): Observable<ApiResponseInventarioGenParcial> {
    const url = `${this.apiUrl}/api/InventarioOracle/articuloagenparcial`;
    return this.http.get<ApiResponseInventarioGenParcial>(url, {
      params: { articulo, agencia }
    });
  }

  /**
   * Obtiene el inventario básico de un artículo y retorna solo los datos
   * @param articulo Código del artículo a buscar
   * @returns Observable con array de InventarioBasicoModel
   */
  getInventarioBasicoDatos(articulo: string): Observable<InventarioBasicoModel[]> {
    return new Observable(observer => {
      this.getInventarioBasicoPorArticulo(articulo).subscribe({
        next: (response) => {
          if (response.success) {
            observer.next(response.datos);
          } else {
            observer.next([]);
          }
          observer.complete();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  /**
   * Valida si existe un artículo en el inventario
   * @param articulo Código del artículo a validar
   * @returns Observable con boolean indicando si existe
   */
  existeArticulo(articulo: string): Observable<boolean> {
    return new Observable(observer => {
      this.getInventarioBasicoPorArticulo(articulo).subscribe({
        next: (response) => {
          observer.next(response.success && response.totalRegistros > 0);
          observer.complete();
        },
        error: () => {
          observer.next(false);
          observer.complete();
        }
      });
    });
  }

  existeArticuloConStock(articulo: string): Observable<boolean> {
    return new Observable(observer => {
      this.http.get<any>(`${this.apiUrl}/api/InventarioOracle/articulo-stock-consolidado`, {
        params: { articulo }
      }).subscribe({
        next: (response) => {
          const existe = response?.success === true && response?.totalAgenciasConStock > 0;
          observer.next(existe);
          observer.complete();
        },
        error: () => {
          observer.next(false);
          observer.complete();
        }
      });
    });
  }

  getStockDisponible(articulo: string): Observable<number> {
    return this.http
      .get<any>(`${this.apiUrl}/api/InventarioOracle/articulo-stock-consolidado`, {
        params: { articulo }
      })
      .pipe(
        map(res =>
          res?.success && res?.agencias?.length
            ? res.agencias.reduce((sum: number, a: any) => sum + (a.stockDisponible || 0), 0)
            : 0
        ),
        catchError(() => of(0))
      );
  }

  getStockConAgencias(articulo: string): Observable<{
    total: number;
    agencias: { oficina: string; stock: number }[];
  }> {
    return this.http
      .get<any>(`${this.apiUrl}/api/InventarioOracle/articulo-stock-consolidado`, {
        params: { articulo }
      })
      .pipe(
        map(res => {
          if (res?.success && res?.agencias?.length) {
            const list = res.agencias
              .filter((a: any) => a.stockDisponible > 0)
              .map((a: any) => ({
                oficina: a.oficina,
                stock: a.stockDisponible
              }));
            return {
              total: list.reduce((sum: number, item: any) => sum + item.stock, 0),
              agencias: list
            };
          }
          return { total: 0, agencias: [] };
        }),
        catchError(() => of({ total: 0, agencias: [] }))
      );
  }

  /**
   * Procesa las transferencias para convertir los strings concatenados de movimientos 
   * en arrays de objetos MovimientoDetalle
   */
  procesarMovimientos(transferencias: TransferenciaModel1[]): TransferenciaConMovimientos[] {
    return transferencias.map(transferencia => {
      const movimientosDetalle: MovimientoDetalle[] = [];
      
      if (transferencia.movimientosTipo && transferencia.totalMovimientos > 0) {
        const tipos     = transferencia.movimientosTipo.split('|');
        const usuarios  = transferencia.movimientosUsuario.split('|');
        const fechas    = transferencia.movimientosFecha.split('|');
        const cantidades = transferencia.movimientosCantidad.split('|');
        const oficinas  = transferencia.movimientosOficina.split('|');
        
        for (let i = 0; i < tipos.length; i++) {
          if (tipos[i]) {
            movimientosDetalle.push({
              tipo:     tipos[i]     || '',
              usuario:  usuarios[i]  || '',
              fecha:    fechas[i]    || '',
              cantidad: cantidades[i] || '',
              oficina:  oficinas[i]  || ''
            });
          }
        }
      }
      
      return { ...transferencia, movimientosDetalle };
    });
  }

  /**
   * Obtiene las transferencias solicitadas y las procesa para incluir movimientos
   */
  getTransferenciasSolicitadasConMovimientos(): Observable<TransferenciaConMovimientos[]> {
    return new Observable(observer => {
      this.getTransferenciasSolicitadas1().subscribe({
        next: (response) => {
          if (response.success) {
            observer.next(this.procesarMovimientos(response.datos));
          } else {
            observer.error('Error en la respuesta de la API');
          }
          observer.complete();
        },
        error: (error) => observer.error(error)
      });
    });
  }

  /** Obtiene los tipos de movimiento únicos de una transferencia */
  getTiposMovimientoUnicos(movimientos: MovimientoDetalle[]): string[] {
    return [...new Set(movimientos.map(m => m.tipo))].filter(t => t !== '');
  }

  /** Filtra movimientos por tipo */
  filtrarMovimientosPorTipo(movimientos: MovimientoDetalle[], tipo: string): MovimientoDetalle[] {
    return movimientos.filter(m => m.tipo === tipo);
  }

  /** Obtiene el último movimiento de una transferencia */
  getUltimoMovimiento(movimientos: MovimientoDetalle[]): MovimientoDetalle | null {
    return movimientos.length ? movimientos[movimientos.length - 1] : null;
  }

  /**
   * Obtiene el inventario completo (maestro + stock por agencia) de un artículo
   */
  getInventarioArticuloTotal(articulo: string): Observable<{
    success: boolean;
    articuloBuscado: string;
    master: {
      articulo: string; nombre: string; claseId: string; clase: string;
      grupoId: string; grupo: string; lineaCompetenciaId?: string;
      lineaCompetencia?: string; fob: number;
    };
    totalAgencias: number;
    inventario: {
      oficinaId: string; oficina: string; bodegaId: string; bodega: string;
      ubicacion: string; stock: number; stockReservado: number; stockDisponible: number;
    }[];
  }> {
    return this.http.get<any>(`${this.apiUrl}/api/InventarioOracle/articulo-total`, {
      params: { articulo }
    });
  }

  /**
   * Versión simplificada que solo retorna los datos o un array vacío
   */
  getInventarioArticuloTotalDatos(articulo: string): Observable<{
    master: {
      articulo: string; nombre: string; claseId: string; clase: string;
      grupoId: string; grupo: string; lineaCompetenciaId?: string;
      lineaCompetencia?: string; fob: number;
    };
    inventario: {
      oficinaId: string; oficina: string; bodegaId: string; bodega: string;
      ubicacion: string; stock: number; stockReservado: number; stockDisponible: number;
    }[];
  }> {
    const fallbackMaster = (label: string) => ({
      articulo: articulo, nombre: label,
      claseId: '', clase: '', grupoId: '', grupo: '', fob: 0
    });

    return new Observable(observer => {
      this.getInventarioArticuloTotal(articulo).subscribe({
        next: (response) => {
          observer.next(
            response.success
              ? { master: response.master, inventario: response.inventario }
              : { master: fallbackMaster('Artículo no encontrado'), inventario: [] }
          );
          observer.complete();
        },
        error: () => {
          observer.next({ master: fallbackMaster('Error al consultar'), inventario: [] });
          observer.complete();
        }
      });
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // NUEVO — GET /api/inventariooracle/inventario-agencia
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Retorna el inventario completo de una agencia con filtros y paginación.
   *
   * @param oficinaId  Código de la agencia (obligatorio), ej: '002'
   * @param filtros    Filtros y paginación opcionales
   *
   * @example
   * // Todos los artículos de la agencia 002, página 1
   * this.oracle.getInventarioAgencia('002').subscribe(...)
   *
   * @example
   * // Solo artículos con stock disponible, filtrando por clase
   * this.oracle.getInventarioAgencia('002', {
   *   claseId: 'REP', soloConStock: true, page: 1, pageSize: 100
   * }).subscribe(...)
   */
  getInventarioAgencia(
    oficinaId: string,
    filtros: FiltrosInventarioAgencia = {}
  ): Observable<ApiResponseInventarioAgencia> {
    let params = new HttpParams().set('oficina_id', oficinaId);

    if (filtros.bodegaId)                params = params.set('bodega_id',     filtros.bodegaId);
    if (filtros.claseId)                 params = params.set('clase_id',      filtros.claseId);
    if (filtros.grupoId)                 params = params.set('grupo_id',      filtros.grupoId);
    if (filtros.articulo)                params = params.set('articulo',      filtros.articulo);
    if (filtros.soloConStock !== undefined)
                                         params = params.set('solo_con_stock', filtros.soloConStock.toString());
    if (filtros.page     !== undefined)  params = params.set('page',          filtros.page.toString());
    if (filtros.pageSize !== undefined)  params = params.set('page_size',     filtros.pageSize.toString());

    return this.http
      .get<ApiResponseInventarioAgencia>(
        `${this.apiUrl}/api/InventarioOracle/inventario-agencia`,
        { params }
      )
      .pipe(
        catchError(err => {
          console.error('[OracleService] getInventarioAgencia error:', err);
          return of({
            success: false, oficina: oficinaId,
            pagina: 1, tamanoPagina: 0, total: 0, total_registros: 0, datos: []
          });
        })
      );
  }

  /**
   * Versión simplificada: retorna directamente el array de artículos (o []).
   *
   * @example
   * this.oracle.getInventarioAgenciaDatos('002', { soloConStock: true })
   *   .subscribe(items => this.articulos = items);
   */
  getInventarioAgenciaDatos(
    oficinaId: string,
    filtros: FiltrosInventarioAgencia = {}
  ): Observable<InventarioUnaAgenciaItem[]> {
    return this.getInventarioAgencia(oficinaId, filtros).pipe(
      map(res => res.success ? res.datos : []),
      catchError(() => of([]))
    );
  }

  /**
   * Carga TODAS las páginas de una agencia y las une en un solo array.
   * Útil para exportar o mostrar tablas sin paginación manual.
   *
   * ⚠️ Úsalo solo si el volumen de datos lo permite; para agencias grandes
   *    prefiere `getInventarioAgencia` con paginación explícita.
   *
   * @example
   * this.oracle.getInventarioAgenciaCompleto('002').subscribe(items => ...)
   */
  getInventarioAgenciaCompleto(
    oficinaId: string,
    filtros: Omit<FiltrosInventarioAgencia, 'page' | 'pageSize'> = {}
  ): Observable<InventarioUnaAgenciaItem[]> {
    const PAGE_SIZE = 5000;

    return new Observable<InventarioUnaAgenciaItem[]>(observer => {
      const acumulado: InventarioUnaAgenciaItem[] = [];
      let paginaActual = 1;

      const cargarPagina = () => {
        this.getInventarioAgencia(oficinaId, {
          ...filtros,
          page:     paginaActual,
          pageSize: PAGE_SIZE
        }).subscribe({
          next: (res) => {
            if (!res.success) {
              observer.error('Error al cargar inventario de agencia');
              return;
            }

            acumulado.push(...res.datos);

            // Si la página trajo menos registros que PAGE_SIZE, ya terminamos
            const hayMas = res.datos.length === PAGE_SIZE;
            if (hayMas) {
              paginaActual++;
              cargarPagina();
            } else {
              observer.next(acumulado);
              observer.complete();
            }
          },
          error: (err) => observer.error(err)
        });
      };

      cargarPagina();
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CACHÉ REACTIVO — getInventarioStream
  // ───────────────────────────────────────────────────────────────────────────

  /** Intervalo de refresco automático en background: 5 minutos */
  private readonly POLL_INTERVAL_MS = 5 * 60 * 1000;

  /**
   * null  → aún no ha llegado ninguna respuesta del servidor (cargando)
   * []    → el servidor respondió pero no hay artículos con stock
   * [...] → datos reales
   *
   * Usar null como centinela evita que el componente confunda
   * "todavía cargando" con "el servidor devolvió vacío".
   */
  private inventarioSubjects = new Map<string, BehaviorSubject<InventarioUnaAgenciaItem[] | null>>();

  /** IDs de setInterval activos por oficina_id */
  private inventarioIntervals = new Map<string, ReturnType<typeof setInterval>>();

  /**
   * Devuelve un Observable reactivo del inventario para una oficina.
   *
   * - Primera llamada: fetch inmediato + setInterval cada 5 min.
   * - Llamadas siguientes (misma oficina): devuelve el mismo Subject
   *   (datos en caché emitidos instantáneamente, sin ningún request HTTP extra).
   * - Cada vez que el servidor responde, todos los suscriptores se actualizan solos.
   * - El Observable nunca emite null; el centinela es solo interno.
   */
  getInventarioStream(
    oficina_id: string,
    soloConStock = true
  ): Observable<InventarioUnaAgenciaItem[]> {

    if (!this.inventarioSubjects.has(oficina_id)) {
      const subject$ = new BehaviorSubject<InventarioUnaAgenciaItem[] | null>(null);
      this.inventarioSubjects.set(oficina_id, subject$);

      // Función de fetch reutilizada por la carga inicial y el intervalo
      const fetch = () => {
        this.getInventarioSinPaginacion(oficina_id, soloConStock).subscribe({
          next:  items => subject$.next(items),
          error: ()    => { /* el error no destruye el polling; se reintenta en 5 min */ }
        });
      };

      fetch(); // carga inmediata
      this.inventarioIntervals.set(oficina_id, setInterval(fetch, this.POLL_INTERVAL_MS));
    }

    // Filtrar el null centinela: el componente solo recibe arrays reales del servidor
    return (this.inventarioSubjects.get(oficina_id)! as BehaviorSubject<InventarioUnaAgenciaItem[] | null>)
      .asObservable()
      .pipe(filter((v): v is InventarioUnaAgenciaItem[] => v !== null));
  }

  /**
   * true  → ya existe una respuesta en caché (datos reales o array vacío del servidor).
   * false → todavía esperando la primera respuesta (subject aún en null).
   */
  tieneInventarioCacheado(oficina_id: string): boolean {
    return this.inventarioSubjects.get(oficina_id)?.value !== null &&
           this.inventarioSubjects.get(oficina_id)?.value !== undefined;
  }

  /**
   * Fuerza un fetch inmediato fuera del ciclo del intervalo.
   * Llamar después de guardar / eliminar un repuesto para reflejar cambios al instante.
   */
  refrescarInventarioAgencia(oficina_id: string, soloConStock = true): void {
    const subject$ = this.inventarioSubjects.get(oficina_id);
    if (!subject$) return;
    this.getInventarioSinPaginacion(oficina_id, soloConStock).subscribe({
      next:  items => subject$.next(items),
      error: ()    => {}
    });
  }

  /**
   * Cancela el intervalo y elimina la caché de una oficina.
   * Usar al cambiar de agencia o al cerrar sesión.
   */
  limpiarCacheInventario(oficina_id: string): void {
    const id = this.inventarioIntervals.get(oficina_id);
    if (id !== undefined) clearInterval(id);
    this.inventarioIntervals.delete(oficina_id);
    this.inventarioSubjects.delete(oficina_id);
  }

  // ── getInventarioSinPaginacion ───────────────────────────────────────────────
  getInventarioSinPaginacion(
    oficinaId: string,
    soloConStock = true
  ): Observable<InventarioUnaAgenciaItem[]> {
    const PAGE_SIZE = 2000;
    const URL = `${this.apiUrl}/api/InventarioOracle/inventario-agencia`;

    const buildParams = (page: number): HttpParams =>
      new HttpParams()
        .set('oficina_id',     oficinaId)
        .set('solo_con_stock', soloConStock.toString())
        .set('page',           page.toString())
        .set('page_size',      PAGE_SIZE.toString());

    // 1️⃣ Pedir página 1 para obtener total_registros
    return this.http.get<ApiResponseInventarioAgencia>(URL, { params: buildParams(1) }).pipe(
      switchMap(res => {
        if (!res.success) return of([]);

        const totalPaginas = Math.ceil(res.total_registros / PAGE_SIZE);

        // Solo había una página
        if (totalPaginas <= 1) return of(res.datos ?? []);

        // 2️⃣ Lanzar las páginas restantes todas en PARALELO
        const paginas$ = Array.from(
          { length: totalPaginas - 1 },
          (_, i) => this.http.get<ApiResponseInventarioAgencia>(URL, { params: buildParams(i + 2) })
        );

        return forkJoin(paginas$).pipe(
          map(respuestas => [
            ...(res.datos ?? []),
            ...respuestas.flatMap(r => r.datos ?? [])
          ])
        );
      }),
      catchError(() => of([]))
    );
  }
}