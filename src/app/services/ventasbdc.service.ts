import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES — Ventas
// ─────────────────────────────────────────────────────────────────────────────

export interface VentasItem {
  tipoDocumento: string;
  vin:           string;
  modelo:        string;
  cantidad:      number;
}

export interface ApiResponseVentas {
  success:           boolean;
  totalRegistros:    number;
  totalVentas:       number;
  totalDevoluciones: number;
  datos:             VentasItem[];
}

export interface ApiResponseVentasPorTipo {
  success:        boolean;
  tipoBuscado:    string;
  totalRegistros: number;
  datos:          VentasItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES — Tránsito
// ─────────────────────────────────────────────────────────────────────────────

export interface TransitoItem {
  modelo:       string;
  color:        string;
  anio:         number;
  cantidad:     number;
  fecha:        string | null;   // ISO string tal como llega del backend
  orden:        string;
  contenedores: string;
}

export interface ApiResponseTransito {
  success:        boolean;
  totalRegistros: number;
  totalCantidad:  number;
  datos:          TransitoItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// RESPUESTA GENÉRICA DE ERROR (404 / 500)
// ─────────────────────────────────────────────────────────────────────────────

interface ApiErrorResponse {
  success: boolean;
  message: string;
  errorCode?: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class VentasbdcService {

  // Ajusta si tu base real difiere (revisa que no dupliques /api como en PedidosoracleService)
  private readonly apiUrl = 'https://bodega.vehicentro.com:1830/api/api/VentasBDC';

  constructor(private http: HttpClient) {}

  // ───────────────────────────────────────────────────────────────────────────
  // getVentas
  // GET /api/VentasBDC/ventas
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * @example
   * this.ventasBdc.getVentas().subscribe(res => {
   *   if (res.success) console.log(res.datos);
   * });
   */
  getVentas(): Observable<ApiResponseVentas> {
    return this.http
      .get<ApiResponseVentas>(`${this.apiUrl}/ventas`)
      .pipe(
        catchError(err => {
          console.error('[VentasbdcService] getVentas error:', err);
          return of<ApiResponseVentas>({
            success: false,
            totalRegistros: 0,
            totalVentas: 0,
            totalDevoluciones: 0,
            datos: []
          });
        })
      );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // getVentasPorTipo
  // GET /api/VentasBDC/ventas/por-tipo?tipo=VENTA|DEVOLUCION
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * @example
   * this.ventasBdc.getVentasPorTipo('DEVOLUCION').subscribe(res => {
   *   this.devoluciones = res.datos;
   * });
   */
  getVentasPorTipo(tipo: string): Observable<ApiResponseVentasPorTipo> {
    const tipoNormalizado = tipo.trim().toUpperCase();

    return this.http
      .get<ApiResponseVentasPorTipo>(`${this.apiUrl}/ventas/por-tipo`, {
        params: { tipo: tipoNormalizado }
      })
      .pipe(
        catchError(err => {
          console.error('[VentasbdcService] getVentasPorTipo error:', err);
          return of<ApiResponseVentasPorTipo>({
            success: false,
            tipoBuscado: tipoNormalizado,
            totalRegistros: 0,
            datos: []
          });
        })
      );
  }

  /** Atajo directo para ventas (TIPODOCUMENTO = 'VENTA') */
  getSoloVentas(): Observable<VentasItem[]> {
    return this.getVentasPorTipo('VENTA').pipe(
      map(res => (res.success ? res.datos : [])),
      catchError(() => of([]))
    );
  }

  /** Atajo directo para devoluciones (TIPODOCUMENTO = 'DEVOLUCION') */
  getDevoluciones(): Observable<VentasItem[]> {
    return this.getVentasPorTipo('DEVOLUCION').pipe(
      map(res => (res.success ? res.datos : [])),
      catchError(() => of([]))
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // getTransito
  // GET /api/VentasBDC/transito
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * @example
   * this.ventasBdc.getTransito().subscribe(res => {
   *   if (res.success) this.transito = res.datos;
   * });
   */
  getTransito(): Observable<ApiResponseTransito> {
    return this.http
      .get<ApiResponseTransito>(`${this.apiUrl}/transito`)
      .pipe(
        catchError(err => {
          console.error('[VentasbdcService] getTransito error:', err);
          return of<ApiResponseTransito>({
            success: false,
            totalRegistros: 0,
            totalCantidad: 0,
            datos: []
          });
        })
      );
  }
}