import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';

// ═══════════════════════════════════════════════════════════════
//  INTERFACES  —  OTs / Facturas Talleres
// ═══════════════════════════════════════════════════════════════

/** Filtros de fecha para los endpoints con rango libre */
export interface FiltrosTalleres {
  fechaInicio: string;   // DD/MM/YYYY
  fechaFin:    string;   // DD/MM/YYYY
}

// ── Resumen (una fila por factura — endpoints 1 y 2) ─────────
export interface VentaTaller {
  oficinaId:           string;
  oficina:             string;
  tipoOtId:            string;
  tipoOt:              string;
  ordenTrabajo:        string;
  fechaOt:             string | null;
  codCliente:          string;
  idCliente:           string;
  cliente:             string;
  tipoDocumento:       string;
  numDocumento:        string;
  fecha:               string | null;
  valorTotalSinIva:    number;
  usuarioCrearOt:      string;
  usuarioCrearFactura: string;
}

export interface ApiResponseVentasTaller {
  success:        boolean;
  totalRegistros: number;
  tiempoSegundos: number;
  filtros:        { fechaInicio: string; fechaFin: string };
  totalSinIva:    number;
  datos:          VentaTaller[];
}

// ── Detalle (una fila por artículo — endpoints 3 y 4) ────────
export interface VentaTallerDetalle {
  oficinaId:           string;
  oficina:             string;
  tipoOtId:            string;
  tipoOt:              string;
  ordenTrabajo:        string;
  fechaOt:             string | null;
  codCliente:          string;
  idCliente:           string;
  cliente:             string;
  tipoDocumento:       string;
  numDocumento:        string;
  fecha:               string | null;
  valorTotalSinIva:    number;
  valorIva:            number;
  total:               number;
  clase:               string;
  grupo:               string;
  codArticulo:         string;
  nombreArticulo:      string;
  cantidad:            number;
  costoUnitario:       number;
  costoTotal:          number;
  precioUnitario:      number;
  precioTotal:         number;
  porcDescuento:       number;
  valorDescuento:      number;
  usuarioCrearOt:      string;
  usuarioCrearFactura: string;
}

export interface ApiResponseVentasTallerDetalle {
  success:        boolean;
  totalRegistros: number;
  tiempoSegundos: number;
  filtros:        { fechaInicio: string; fechaFin: string };
  totalSinIva:    number;
  totalConIva:    number;
  datos:          VentaTallerDetalle[];
}

// ── Detalle con stock actual por SKU (endpoint 5) ────────────
export interface VentaTallerDetalleConStock {
  oficinaId:           string;
  oficina:             string;
  tipoOtId:            string;
  tipoOt:              string;
  ordenTrabajo:        string;
  fechaOt:             string | null;
  codCliente:          string;
  idCliente:           string;
  cliente:             string;
  tipoDocumento:       string;
  numDocumento:        string;
  fecha:               string | null;
  valorTotalSinIva:    number;
  valorIva:            number;
  total:               number;
  clase:               string;
  grupo:               string;
  codArticulo:         string;
  nombreArticulo:      string;
  cantidad:            number;
  costoUnitario:       number;
  costoTotal:          number;
  precioUnitario:      number;
  precioTotal:         number;
  porcDescuento:       number;
  valorDescuento:      number;
  stockActual:         number;
  usuarioCrearOt:      string;
  usuarioCrearFactura: string;
}

export interface ApiResponseVentasTallerDetalleConStock {
  success:        boolean;
  totalRegistros: number;
  tiempoSegundos: number;
  filtros:        { fechaInicio: string; fechaFin: string };
  totalSinIva:    number;
  totalConIva:    number;
  datos:          VentaTallerDetalleConStock[];
}

// ── SKUs en garantía con stock actual (endpoint 6) ───────────
export interface SkuGarantiaConStock {
  clase:          string;
  grupo:          string;
  codArticulo:    string;
  nombreArticulo: string;
  totalGarantia:  number;
  stockActual:    number;
}

export interface ApiResponseSkusGarantia {
  success:               boolean;
  totalSkus:             number;
  tiempoSegundos:        number;
  filtros:               { fechaInicio: string; fechaFin: string };
  totalUnidadesGarantia: number;
  datos:                 SkuGarantiaConStock[];
}

// ═══════════════════════════════════════════════════════════════
//  SERVICE
// ═══════════════════════════════════════════════════════════════

@Injectable({
  providedIn: 'root'
})
export class OtsFacturasService {

  private readonly baseUrl = 'https://bodega.vehicentro.com:1830/api/api/talleres';

  constructor(private http: HttpClient) {}

  // ─────────────────────────────────────────────────────────────
  //  ENDPOINT 1  —  GET /api/talleres/ventas
  //  Resumen por factura, rango libre  (OT: GRT, AUT)
  // ─────────────────────────────────────────────────────────────
  getVentas(filtros: FiltrosTalleres): Observable<ApiResponseVentasTaller> {
    const params = new HttpParams()
      .set('fechaInicio', filtros.fechaInicio)
      .set('fechaFin',    filtros.fechaFin);

    return this.http.get<ApiResponseVentasTaller>(`${this.baseUrl}/ventas`, { params }).pipe(
      catchError(err => {
        console.error('OtsFacturasService.getVentas error:', err);
        return of({
          success:        false,
          totalRegistros: 0,
          tiempoSegundos: 0,
          filtros:        { fechaInicio: filtros.fechaInicio, fechaFin: filtros.fechaFin },
          totalSinIva:    0,
          datos:          []
        });
      })
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  ENDPOINT 2  —  GET /api/talleres/ventas/ano-actual
  //  Resumen por factura, 01/01/2025 – hoy  (OT: GRT, AUT)
  // ─────────────────────────────────────────────────────────────
  getVentasAnoActual(): Observable<ApiResponseVentasTaller> {
    return this.http.get<ApiResponseVentasTaller>(`${this.baseUrl}/ventas/ano-actual`).pipe(
      catchError(err => {
        console.error('OtsFacturasService.getVentasAnoActual error:', err);
        return of({
          success:        false,
          totalRegistros: 0,
          tiempoSegundos: 0,
          filtros:        { fechaInicio: '01/01/2025', fechaFin: '' },
          totalSinIva:    0,
          datos:          []
        });
      })
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  ENDPOINT 3  —  GET /api/talleres/ventas-detalle
  //  Detalle por artículo, rango libre  (OT: GRT, AUT, PDI)
  // ─────────────────────────────────────────────────────────────
  getVentasDetalle(filtros: FiltrosTalleres): Observable<ApiResponseVentasTallerDetalle> {
    const params = new HttpParams()
      .set('fechaInicio', filtros.fechaInicio)
      .set('fechaFin',    filtros.fechaFin);

    return this.http.get<ApiResponseVentasTallerDetalle>(`${this.baseUrl}/ventas-detalle`, { params }).pipe(
      catchError(err => {
        console.error('OtsFacturasService.getVentasDetalle error:', err);
        return of({
          success:        false,
          totalRegistros: 0,
          tiempoSegundos: 0,
          filtros:        { fechaInicio: filtros.fechaInicio, fechaFin: filtros.fechaFin },
          totalSinIva:    0,
          totalConIva:    0,
          datos:          []
        });
      })
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  ENDPOINT 4  —  GET /api/talleres/ventas-detalle/ano-actual
  //  Detalle por artículo, 01/01/2025 – hoy  (OT: GRT, AUT, PDI)
  // ─────────────────────────────────────────────────────────────
  getVentasDetalleAnoActual(): Observable<ApiResponseVentasTallerDetalle> {
    return this.http.get<ApiResponseVentasTallerDetalle>(`${this.baseUrl}/ventas-detalle/ano-actual`).pipe(
      catchError(err => {
        console.error('OtsFacturasService.getVentasDetalleAnoActual error:', err);
        return of({
          success:        false,
          totalRegistros: 0,
          tiempoSegundos: 0,
          filtros:        { fechaInicio: '01/01/2025', fechaFin: '' },
          totalSinIva:    0,
          totalConIva:    0,
          datos:          []
        });
      })
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  ENDPOINT 5  —  GET /api/talleres/ventas-detalle-con-stock
  //  Detalle completo (todos los tipos OT) + stock actual del SKU.
  //  Rango libre.
  // ─────────────────────────────────────────────────────────────
  getVentasDetalleConStock(
    filtros: FiltrosTalleres
  ): Observable<ApiResponseVentasTallerDetalleConStock> {
    const params = new HttpParams()
      .set('fechaInicio', filtros.fechaInicio)
      .set('fechaFin',    filtros.fechaFin);

    return this.http
      .get<ApiResponseVentasTallerDetalleConStock>(
        `${this.baseUrl}/ventas-detalle-con-stock`, { params }
      )
      .pipe(
        catchError(err => {
          console.error('OtsFacturasService.getVentasDetalleConStock error:', err);
          return of({
            success:        false,
            totalRegistros: 0,
            tiempoSegundos: 0,
            filtros:        { fechaInicio: filtros.fechaInicio, fechaFin: filtros.fechaFin },
            totalSinIva:    0,
            totalConIva:    0,
            datos:          []
          });
        })
      );
  }

  // ─────────────────────────────────────────────────────────────
  //  ENDPOINT 6  —  GET /api/talleres/skus-garantia
  //  SKUs agrupados con cantidad total en garantía (OT=GRT)
  //  + stock actual consolidado.  Rango libre.
  // ─────────────────────────────────────────────────────────────
  getSkusGarantia(filtros: FiltrosTalleres): Observable<ApiResponseSkusGarantia> {
    const params = new HttpParams()
      .set('fechaInicio', filtros.fechaInicio)
      .set('fechaFin',    filtros.fechaFin);

    return this.http
      .get<ApiResponseSkusGarantia>(`${this.baseUrl}/skus-garantia`, { params })
      .pipe(
        catchError(err => {
          console.error('OtsFacturasService.getSkusGarantia error:', err);
          return of({
            success:               false,
            totalSkus:             0,
            tiempoSegundos:        0,
            filtros:               { fechaInicio: filtros.fechaInicio, fechaFin: filtros.fechaFin },
            totalUnidadesGarantia: 0,
            datos:                 []
          });
        })
      );
  }

  // ═══════════════════════════════════════════════════════════════
  //  HELPERS  —  endpoints 1–4 (originales)
  // ═══════════════════════════════════════════════════════════════

  /** Devuelve solo el array de facturas del resumen, rango libre. */
  getVentasDatos(filtros: FiltrosTalleres): Observable<VentaTaller[]> {
    return this.getVentas(filtros).pipe(
      map(res => res.success ? res.datos : [])
    );
  }

  /** Devuelve solo el array de facturas del resumen, año actual. */
  getVentasAnoActualDatos(): Observable<VentaTaller[]> {
    return this.getVentasAnoActual().pipe(
      map(res => res.success ? res.datos : [])
    );
  }

  /** Devuelve solo el array de líneas de detalle, rango libre. */
  getVentasDetalleDatos(filtros: FiltrosTalleres): Observable<VentaTallerDetalle[]> {
    return this.getVentasDetalle(filtros).pipe(
      map(res => res.success ? res.datos : [])
    );
  }

  /** Devuelve solo el array de líneas de detalle, año actual. */
  getVentasDetalleAnoActualDatos(): Observable<VentaTallerDetalle[]> {
    return this.getVentasDetalleAnoActual().pipe(
      map(res => res.success ? res.datos : [])
    );
  }

  /** Agrupa el detalle por tipo de OT y devuelve totales por grupo. */
  getTotalesPorTipoOt(
    filtros: FiltrosTalleres
  ): Observable<{ tipoOtId: string; tipoOt: string; totalSinIva: number; totalConIva: number; cantFacturas: number }[]> {
    return this.getVentasDetalle(filtros).pipe(
      map(res => {
        if (!res.success) return [];
        const grupos = new Map<string, {
          tipoOtId: string; tipoOt: string;
          facturas: Set<string>; totalSinIva: number; totalConIva: number;
        }>();

        for (const row of res.datos) {
          const key = row.tipoOtId;
          if (!grupos.has(key)) {
            grupos.set(key, {
              tipoOtId: row.tipoOtId, tipoOt: row.tipoOt,
              facturas: new Set(), totalSinIva: 0, totalConIva: 0
            });
          }
          const g = grupos.get(key)!;
          g.facturas.add(row.numDocumento);
          g.totalSinIva += row.valorTotalSinIva;
          g.totalConIva += row.total;
        }

        return [...grupos.values()].map(g => ({
          tipoOtId:     g.tipoOtId,
          tipoOt:       g.tipoOt,
          cantFacturas: g.facturas.size,
          totalSinIva:  Math.round(g.totalSinIva * 100) / 100,
          totalConIva:  Math.round(g.totalConIva * 100) / 100
        }));
      })
    );
  }

  /** Agrupa el detalle por oficina y devuelve totales. */
  getTotalesPorOficina(
    filtros: FiltrosTalleres
  ): Observable<{ oficinaId: string; oficina: string; cantFacturas: number; totalSinIva: number }[]> {
    return this.getVentasDetalle(filtros).pipe(
      map(res => {
        if (!res.success) return [];
        const grupos = new Map<string, {
          oficinaId: string; oficina: string;
          facturas: Set<string>; totalSinIva: number;
        }>();

        for (const row of res.datos) {
          const key = row.oficinaId;
          if (!grupos.has(key)) {
            grupos.set(key, {
              oficinaId: row.oficinaId, oficina: row.oficina,
              facturas: new Set(), totalSinIva: 0
            });
          }
          const g = grupos.get(key)!;
          g.facturas.add(row.numDocumento);
          g.totalSinIva += row.valorTotalSinIva;
        }

        return [...grupos.values()]
          .map(g => ({
            oficinaId:    g.oficinaId,
            oficina:      g.oficina,
            cantFacturas: g.facturas.size,
            totalSinIva:  Math.round(g.totalSinIva * 100) / 100
          }))
          .sort((a, b) => b.totalSinIva - a.totalSinIva);
      })
    );
  }

  /** Calcula el margen por línea de detalle ((precioTotal - costoTotal) / precioTotal). */
  calcularMargenPct(item: VentaTallerDetalle | VentaTallerDetalleConStock): number {
    if (!item.precioTotal || item.precioTotal === 0) return 0;
    return Math.round(((item.precioTotal - item.costoTotal) / item.precioTotal) * 10000) / 100;
  }

  // ═══════════════════════════════════════════════════════════════
  //  HELPERS  —  endpoints 5 y 6 (nuevos)
  // ═══════════════════════════════════════════════════════════════

  /** Devuelve solo el array de líneas del detalle con stock, rango libre. */
  getVentasDetalleConStockDatos(
    filtros: FiltrosTalleres
  ): Observable<VentaTallerDetalleConStock[]> {
    return this.getVentasDetalleConStock(filtros).pipe(
      map(res => res.success ? res.datos : [])
    );
  }

  /** Devuelve solo el array de SKUs en garantía con stock, rango libre. */
  getSkusGarantiaDatos(filtros: FiltrosTalleres): Observable<SkuGarantiaConStock[]> {
    return this.getSkusGarantia(filtros).pipe(
      map(res => res.success ? res.datos : [])
    );
  }

  /**
   * Filtra los SKUs en garantía cuyo stock actual es menor
   * que la cantidad garantizada en el período.
   * Útil para detectar artículos con riesgo de desabastecimiento.
   */
  getSkusGarantiaStockInsuficiente(
    filtros: FiltrosTalleres
  ): Observable<SkuGarantiaConStock[]> {
    return this.getSkusGarantiaDatos(filtros).pipe(
      map(skus => skus.filter(s => s.stockActual < s.totalGarantia))
    );
  }

  /**
   * Agrupa el detalle con stock por tipo de OT y devuelve
   * totales de venta + suma de stock disponible por grupo.
   */
  getTotalesPorTipoOtConStock(
    filtros: FiltrosTalleres
  ): Observable<{
    tipoOtId:    string;
    tipoOt:      string;
    cantFacturas: number;
    totalSinIva: number;
    totalConIva: number;
  }[]> {
    return this.getVentasDetalleConStock(filtros).pipe(
      map(res => {
        if (!res.success) return [];
        const grupos = new Map<string, {
          tipoOtId: string; tipoOt: string;
          facturas: Set<string>; totalSinIva: number; totalConIva: number;
        }>();

        for (const row of res.datos) {
          const key = row.tipoOtId;
          if (!grupos.has(key)) {
            grupos.set(key, {
              tipoOtId: row.tipoOtId, tipoOt: row.tipoOt,
              facturas: new Set(), totalSinIva: 0, totalConIva: 0
            });
          }
          const g = grupos.get(key)!;
          g.facturas.add(row.numDocumento);
          g.totalSinIva += row.valorTotalSinIva;
          g.totalConIva += row.total;
        }

        return [...grupos.values()]
          .map(g => ({
            tipoOtId:     g.tipoOtId,
            tipoOt:       g.tipoOt,
            cantFacturas: g.facturas.size,
            totalSinIva:  Math.round(g.totalSinIva * 100) / 100,
            totalConIva:  Math.round(g.totalConIva * 100) / 100
          }))
          .sort((a, b) => b.totalSinIva - a.totalSinIva);
      })
    );
  }

  /**
   * Calcula el margen por línea del detalle con stock,
   * igual que calcularMargenPct pero tipado explícitamente
   * para VentaTallerDetalleConStock.
   */
  calcularMargenPctConStock(item: VentaTallerDetalleConStock): number {
    if (!item.precioTotal || item.precioTotal === 0) return 0;
    return Math.round(((item.precioTotal - item.costoTotal) / item.precioTotal) * 10000) / 100;
  }
}