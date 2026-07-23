import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GarantiasService {
  private apiUrl = 'https://bodega.vehicentro.com:1830/api/api/talleres';

  constructor(private http: HttpClient) { }

  // ─── Órdenes con detalle de artículos ────────────────────────────────────────

  getOrdenesAbiertasConDetalle(): Observable<OrdenTrabajoDetalle[]> {
    return this.http.get<OrdenTrabajoDetalle[]>(`${this.apiUrl}/ot-grt`);
  }

  getOrdenesProcesadasConDetalle(): Observable<OrdenTrabajoDetalle[]> {
    return this.http.get<OrdenTrabajoDetalle[]>(`${this.apiUrl}/ot-grt-pro`);
  }



  // ─── Órdenes resumen (sin detalle de artículos) ───────────────────────────────

  getOrdenesAbiertasResumen(): Observable<OrdenTrabajoResumen[]> {
    return this.http.get<OrdenTrabajoResumen[]>(`${this.apiUrl}/ot-grt-resumen`);
  }

  getOrdenesProcesadasResumen(): Observable<OrdenTrabajoResumen[]> {
    return this.http.get<OrdenTrabajoResumen[]>(`${this.apiUrl}/ot-grt-resumen-pro`);
  }

   getOrdenesAbiertasAutResumen(): Observable<OrdenTrabajoResumen[]> {
    return this.http.get<OrdenTrabajoResumen[]>(`${this.apiUrl}/ot-aut-resumen`);
  }

  getOrdenesProcesadasAutResumen(): Observable<OrdenTrabajoResumen[]> {
    return this.http.get<OrdenTrabajoResumen[]>(`${this.apiUrl}/ot-aut-resumen-pro`);
  }

    getOrdenesAbiertasAutConDetalle(): Observable<OrdenTrabajoDetalle[]> {
    return this.http.get<OrdenTrabajoDetalle[]>(`${this.apiUrl}/ot-aut`);
  }

  getOrdenesProcesadasAutConDetalle(): Observable<OrdenTrabajoDetalle[]> {
    return this.http.get<OrdenTrabajoDetalle[]>(`${this.apiUrl}/ot-aut-pro`);
  }

  // ─── Órdenes de garantía (GRT) ────────────────────────────────────────────────

  /**
   * Obtiene todas las órdenes de garantía activas (excluye anuladas)
   */
  getOrdenesGarantia(): Observable<OrdenGarantia[]> {
    return this.http.get<OrdenGarantia[]>(`${this.apiUrl}/ot-garantia`);
  }

  /**
   * Obtiene las órdenes de garantía activas filtradas por agencia
   * @param oficinaId Código de la agencia (ej: '021', '001')
   */
  getOrdenesGarantiaPorOficina(oficinaId: string): Observable<OrdenGarantia[]> {
    return this.http.get<OrdenGarantia[]>(`${this.apiUrl}/ot-garantia/${oficinaId}`);
  }
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface OrdenTrabajoDetalle {
  oficinaId?: string;
  oficinaNombre?: string;
  numero?: string;
  tipo?: string;
  estado?: string;
  fechaSolicitud?: Date;
  diasAbierto?: number;
  clienteCedula?: string;
  clienteNombre?: string;
  chasis?: string;
  articuloId?: string;
  articuloClase?: string;
  articuloGrupo?: string;
  articuloDescripcion?: string;
  usuarioCreacion?: string;
  usuarioActualizacion?: string;
  cantidad?: number;
  precioUnitario?: number;
  precioTotal?: number;
  motivo?: string;
  monto?: number;
  tasaIva?: number;
  total?: number;
}

export interface OrdenTrabajoResumen {
  oficinaId?: string;
  oficinaNombre?: string;
  numero?: string;
  tipo?: string;
  estado?: string;
  fechaSolicitud?: Date;
  diasAbierto?: number;
  clienteCedula?: string;
  clienteNombre?: string;
  chasis?: string;
  usuarioCreacion?: string;
  usuarioActualizacion?: string;
  motivo?: string;
  monto?: number;
  tasaIva?: number;
  total?: number;
}

export interface OrdenGarantia {
  oficinaId?: string;
  oficinaNombre?: string;
  numero?: string;
  tipo?: string;
  estado?: string;
  fechaSolicitud?: Date;
  diasAbierto?: number;
  clienteCedula?: string;
  clienteNombre?: string;
  chasis?: string;
  placa?: string;
  modelo?: string;           // presente en la respuesta (puede venir null)
  usuarioCreacion?: string;
  usuarioActualizacion?: string;
  motivo?: string;
  monto?: number;
  tasaIva?: number;
  total?: number;
}