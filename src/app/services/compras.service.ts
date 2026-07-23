import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class ComprasService {
  private apiUrl = 'https://bodega.vehicentro.com:1830/api/api/InventarioOracle/comprasl'; 

  constructor(private http: HttpClient) { }

  /**
   * Obtiene todas las compras de un usuario específico
   * @param usuario Usuario creador (opcional, por defecto 'JCATOTA')
   * @returns Observable con el listado de compras
   */
  getComprasPorUsuario(usuario: string = 'JCATOTA'): Observable<ComprasResponse> {
    const params = new HttpParams().set('usuario', usuario);
    return this.http.get<ComprasResponse>(this.apiUrl, { params });
  }

  /**
   * Obtiene compras filtradas por múltiples criterios
   * @param filtros Objeto con los filtros a aplicar
   * @returns Observable con el listado de compras filtradas
   */
  getComprasFiltradas(filtros: FiltrosCompras): Observable<ComprasResponse> {
    let params = new HttpParams();

    if (filtros.usuario) {
      params = params.set('usuario', filtros.usuario);
    }
    if (filtros.fechaDesde) {
      params = params.set('fechaDesde', filtros.fechaDesde.toISOString().split('T')[0]);
    }
    if (filtros.fechaHasta) {
      params = params.set('fechaHasta', filtros.fechaHasta.toISOString().split('T')[0]);
    }
    if (filtros.proveedor) {
      params = params.set('proveedor', filtros.proveedor);
    }
    if (filtros.articulo) {
      params = params.set('articulo', filtros.articulo);
    }

    return this.http.get<ComprasResponse>(`${this.apiUrl}/filtrar`, { params });
  }

  /**
   * Obtiene compras por rango de fechas
   * @param fechaDesde Fecha inicio
   * @param fechaHasta Fecha fin
   * @param usuario Usuario creador (opcional)
   * @returns Observable con el listado de compras
   */
  getComprasPorFecha(
    fechaDesde: Date, 
    fechaHasta: Date, 
    usuario?: string
  ): Observable<ComprasResponse> {
    const filtros: FiltrosCompras = {
      fechaDesde,
      fechaHasta,
      usuario
    };
    return this.getComprasFiltradas(filtros);
  }

  /**
   * Obtiene compras de un proveedor específico
   * @param proveedor Nombre del proveedor
   * @param usuario Usuario creador (opcional)
   * @returns Observable con el listado de compras
   */
  getComprasPorProveedor(
    proveedor: string, 
    usuario?: string
  ): Observable<ComprasResponse> {
    const filtros: FiltrosCompras = {
      proveedor,
      usuario
    };
    return this.getComprasFiltradas(filtros);
  }

  /**
   * Obtiene compras que contienen un artículo específico
   * @param articulo Nombre o descripción del artículo
   * @param usuario Usuario creador (opcional)
   * @returns Observable con el listado de compras
   */
  getComprasPorArticulo(
    articulo: string, 
    usuario?: string
  ): Observable<ComprasResponse> {
    const filtros: FiltrosCompras = {
      articulo,
      usuario
    };
    return this.getComprasFiltradas(filtros);
  }
}

// ============================================
// INTERFACES
// ============================================

export interface ComprasResponse {
  total: number;
  usuario?: string;
  filtros?: FiltrosCompras;
  data: CompraDetalle[];
}

export interface CompraDetalle {
  // Datos de la Compra
  provCompania?: string;
  fechaEmision?: Date;
  fechaCreacion?: Date;
  fechaActualizacion?: Date;
  provCeduruc?: string;
  serie?: string;
  numero?: string;
  alcance?: string;

  // Datos del Proveedor
  proveedorNombre?: string;
  proveedorCiudad?: string;

  // Datos del Artículo
  lineaComplemento?: string;
  artlClase?: string;
  grarClase?: string;
  grarCodigrup?: string;
  articulo?: string;
  articuloNombre?: string;
  descripcion?: string;

  // Datos del Detalle Movimiento
  entrSali?: string;
  cantidad?: number;
  precioUnitario?: number;
  costoUnitario?: number;
  artlArticulo?: string;
  valor?: number;

  // RowIDs
  compraRowId?: string;
  proveedorRowId?: string;
  detalleRowId?: string;
  articuloRowId?: string;
}

export interface FiltrosCompras {
  usuario?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
  proveedor?: string;
  articulo?: string;
}

// ============================================
// OPCIONAL: Si prefieres agregar estas funciones 
// al servicio de garantías existente:
// ============================================

/*
// Agregar estas funciones a tu GarantiasService existente:

export class GarantiasService {
  private apiUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) { }

  // ... tus métodos existentes ...

  // Métodos de Compras
  getComprasPorUsuario(usuario: string = 'JCATOTA'): Observable<ComprasResponse> {
    const params = new HttpParams().set('usuario', usuario);
    return this.http.get<ComprasResponse>(`${this.apiUrl}/compras`, { params });
  }

  getComprasFiltradas(filtros: FiltrosCompras): Observable<ComprasResponse> {
    let params = new HttpParams();

    if (filtros.usuario) {
      params = params.set('usuario', filtros.usuario);
    }
    if (filtros.fechaDesde) {
      params = params.set('fechaDesde', filtros.fechaDesde.toISOString().split('T')[0]);
    }
    if (filtros.fechaHasta) {
      params = params.set('fechaHasta', filtros.fechaHasta.toISOString().split('T')[0]);
    }
    if (filtros.proveedor) {
      params = params.set('proveedor', filtros.proveedor);
    }
    if (filtros.articulo) {
      params = params.set('articulo', filtros.articulo);
    }

    return this.http.get<ComprasResponse>(`${this.apiUrl}/compras/filtrar`, { params });
  }

  getComprasPorFecha(
    fechaDesde: Date, 
    fechaHasta: Date, 
    usuario?: string
  ): Observable<ComprasResponse> {
    const filtros: FiltrosCompras = { fechaDesde, fechaHasta, usuario };
    return this.getComprasFiltradas(filtros);
  }

  getComprasPorProveedor(proveedor: string, usuario?: string): Observable<ComprasResponse> {
    const filtros: FiltrosCompras = { proveedor, usuario };
    return this.getComprasFiltradas(filtros);
  }

  getComprasPorArticulo(articulo: string, usuario?: string): Observable<ComprasResponse> {
    const filtros: FiltrosCompras = { articulo, usuario };
    return this.getComprasFiltradas(filtros);
  }
}
*/