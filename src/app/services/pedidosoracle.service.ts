import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES — Forma "pública" que consume el componente (sin cambios)
// ─────────────────────────────────────────────────────────────────────────────

/** Un renglón: una agencia+bodega con su stock del artículo */
export interface StockPorAgenciaItem {
  oficinaId:       number;          // el endpoint devuelve OFI.OFICINA (numérico)
  oficina:         string;
  articulo:        string;
  nombre:          string;
  bodegaId:        string;
  bodega:          string;
  ubicacion:       string | null;
  stock:           number;
  stockReservado:  number;
  stockDisponible: number;
}

/** Respuesta "aplanada" que sigue usando tu componente */
export interface ApiResponseStockTodasAgencias {
  success:           boolean;
  articuloBuscado:   string;
  totalAgencias:     number;
  agenciasConStock:  number;
  stockTotalGeneral: number;
  datos:             StockPorAgenciaItem[];   // todas las agencias (incluye stock 0)
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES — Forma CRUDA que devuelve el endpoint nuevo
// Endpoint: GET /api/MaestroPartes/{articulo}/stock
// ─────────────────────────────────────────────────────────────────────────────

interface ResumenStock {
  totalAgencias:       number;
  agenciasConStock:    number;
  stockTotal:          number;
  reservadoTotal:      number;
  disponibleTotal:     number;
  tieneDisponibilidad: boolean;
}

interface RawStockResponse {
  success:          boolean;
  articulo:         string;
  nombre:           string;
  resumen:          ResumenStock;
  agenciasConStock: StockPorAgenciaItem[];   // ya filtradas (disponible > 0)
  detalle:          StockPorAgenciaItem[];   // todas
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class PedidosoracleService {

  // OJO: apiUrl ya termina en /api → no anteponer otro /api en las rutas
  private readonly apiUrl = 'https://bodega.vehicentro.com:1830/api/api';

  constructor(private http: HttpClient) {}

  // ───────────────────────────────────────────────────────────────────────────
  // getStockTodasAgencias
  // Pega al endpoint nuevo (/MaestroPartes/{articulo}/stock) y ADAPTA su
  // respuesta anidada a la forma plana que ya consume el componente.
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Retorna el stock de un artículo en TODAS las agencias y bodegas,
   * incluyendo las que tienen stock = 0.
   *
   * @example
   * this.pedidosOracle.getStockTodasAgencias('AAK-110').subscribe(res => {
   *   if (res.success) console.log(res.datos);
   * });
   */
  getStockTodasAgencias(articulo: string): Observable<ApiResponseStockTodasAgencias> {
    const art = articulo.trim().toUpperCase();

    return this.http
      .get<RawStockResponse>(
        `${this.apiUrl}/MaestroPartes/${encodeURIComponent(art)}/stock`
      )
      .pipe(
        map((raw): ApiResponseStockTodasAgencias => ({
          success:           raw.success,
          articuloBuscado:   raw.articulo,
          totalAgencias:     raw.resumen?.totalAgencias    ?? 0,
          agenciasConStock:  raw.resumen?.agenciasConStock ?? 0,
          stockTotalGeneral: raw.resumen?.stockTotal       ?? 0,
          datos:             raw.detalle ?? []
        })),
        catchError(err => {
          // 404 = artículo inexistente; cualquier otro = error real
          console.error('[PedidosoracleService] getStockTodasAgencias error:', err);
          return of<ApiResponseStockTodasAgencias>({
            success:           false,
            articuloBuscado:   art,
            totalAgencias:     0,
            agenciasConStock:  0,
            stockTotalGeneral: 0,
            datos:             []
          });
        })
      );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // getStockTodasAgenciasDatos
  // Versión simplificada — { articulo, nombre, agencias }.
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * @example
   * this.pedidosOracle.getStockTodasAgenciasDatos('AAK-110').subscribe(({ nombre, agencias }) => {
   *   this.nombreArticulo = nombre;
   *   this.agencias       = agencias;
   * });
   */
  getStockTodasAgenciasDatos(articulo: string): Observable<{
    articulo: string;
    nombre:   string;
    agencias: StockPorAgenciaItem[];
  }> {
    const fallback = (label: string) => ({
      articulo,
      nombre:   label,
      agencias: [] as StockPorAgenciaItem[]
    });

    return this.getStockTodasAgencias(articulo).pipe(
      map(response =>
        response.success && response.datos.length > 0
          ? {
              articulo: response.articuloBuscado,
              nombre:   response.datos[0].nombre,
              agencias: response.datos
            }
          : fallback('Artículo no encontrado')
      ),
      catchError(() => of(fallback('Error al consultar')))
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // getAgenciasConStock
  // Atajo: solo agencias con disponibilidad real.
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * @example
   * this.pedidosOracle.getAgenciasConStock('AAK-110').subscribe(agencias => {
   *   this.disponibleEn = agencias;
   * });
   */
  getAgenciasConStock(articulo: string): Observable<StockPorAgenciaItem[]> {
    return this.getStockTodasAgencias(articulo).pipe(
      map(res =>
        res.success
          ? res.datos.filter(a => a.stockDisponible > 0)
          : []
      ),
      catchError(() => of([]))
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // getStockConAgencias
  // Misma firma que OracleService para no tocar cargarEquivalentesModal.
  // ───────────────────────────────────────────────────────────────────────────

  getStockConAgencias(articulo: string): Observable<{
    total:    number;
    agencias: { oficina: string; stock: number }[];
  }> {
    return this.getAgenciasConStock(articulo).pipe(
      map(items => {
        const agencias = items.map(a => ({
          oficina: a.oficina,
          stock:   a.stockDisponible
        }));
        return {
          total:    agencias.reduce((sum, a) => sum + a.stock, 0),
          agencias
        };
      }),
      catchError(() => of({ total: 0, agencias: [] }))
    );
  }
}