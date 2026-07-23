import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RepuestosvhcrService {
  private readonly baseUrl = 'https://bodega.vehicentro.com:1830/api/api/Repuestos';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los repuestos con su información de inventario
   * Incluye: oficina, bodega, stock, stock_disponible, stock_reservado
   */
  getRepuestosConInventario(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/con-inventario`);
  }

  /**
   * Obtiene repuestos filtrados por oficina
   * @param oficinaId - ID de la oficina (ej: '001', '002')
   */
  getRepuestosPorOficina(oficinaId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/con-inventario?oficinaId=${oficinaId}`);
  }

  /**
   * Obtiene repuestos filtrados por bodega
   * @param bodegaId - ID de la bodega (ej: 'B001', 'B002')
   */
  getRepuestosPorBodega(bodegaId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/con-inventario?bodegaId=${bodegaId}`);
  }

  /**
   * Obtiene repuestos filtrados por oficina y bodega
   * @param oficinaId - ID de la oficina
   * @param bodegaId - ID de la bodega
   */
  getRepuestosPorOficinaYBodega(oficinaId: string, bodegaId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/con-inventario?oficinaId=${oficinaId}&bodegaId=${bodegaId}`);
  }

  // ============================================
  // ENDPOINTS EXISTENTES (por si los necesitas)
  // ============================================

  /** Obtiene todos los repuestos básicos */
  getAllRepuestos(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}`);
  }

  /** Obtiene un repuesto por ID */
  getRepuestoById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${id}`);
  }

  /** Obtiene repuesto por código */
  getRepuestoByCodigo(codigo: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/codigo/${codigo}`);
  }

  /** Obtiene repuestos por marca */
  getRepuestosPorMarca(idMarca: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/por-marca/${idMarca}`);
  }

  /** Obtiene repuestos por categoría/ubicación en vehículo */
  getRepuestosPorCategoria(categoria: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/por-categoria/${categoria}`);
  }

  getImagenesRepuesto(idRepuesto: number): Observable<any> {
  return this.http.get(`${this.baseUrl}/${idRepuesto}/imagenes`);
}
 


  /** Búsqueda de repuestos */
  buscarRepuestos(termino: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/buscar?termino=${encodeURIComponent(termino)}`);
  }


 getInventarioVhcr(params?: {
    oficinaId?: string;
    bodegaId?: string;
    articulo?: string;
    clase?: string;
    grupo?: string;
  }): Observable<any> {
    let url = `${this.baseUrl}/inventario-vhcr`;
    
    // Construir query params
    const queryParams: string[] = [];
    if (params?.oficinaId) queryParams.push(`oficinaId=${params.oficinaId}`);
    if (params?.bodegaId) queryParams.push(`bodegaId=${params.bodegaId}`);
    if (params?.articulo) queryParams.push(`articulo=${encodeURIComponent(params.articulo)}`);
    if (params?.clase) queryParams.push(`clase=${encodeURIComponent(params.clase)}`);
    if (params?.grupo) queryParams.push(`grupo=${encodeURIComponent(params.grupo)}`);
    
    if (queryParams.length > 0) {
      url += '?' + queryParams.join('&');
    }
    
    return this.http.get<any>(url);
  }

  /**
   * Obtiene un artículo del inventario por su ID interno
   * @param id - ID del registro en inventario_repuestosvhcr
   */
  getInventarioVhcrById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/inventario-vhcr/${id}`);
  }

  /**
   * Obtiene artículos del inventario por código de artículo
   * @param codigoArticulo - Código exacto del artículo (ej: 'D-KJ20CR-L11')
   */
  getInventarioVhcrByArticulo(codigoArticulo: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/inventario-vhcr/articulo/${codigoArticulo}`);
  }

  /**
   * Obtiene inventario filtrado por oficina (método de conveniencia)
   * @param oficinaId - ID de la oficina (ej: '005')
   */
  getInventarioPorOficina(oficinaId: string): Observable<any> {
    return this.getInventarioVhcr({ oficinaId });
  }
  public getMarcas(): Observable<any> {
    const url = `${this.baseUrl}/catalogos/marcas`;
    return this.http.get(url, { responseType: 'json' });
  }

  /** Obtener todos los modelos o filtrar por marca */
  public getModelos(idMarca?: number): Observable<any> {
    const url = `${this.baseUrl}/catalogos/modelos`;
    let params = new HttpParams();
    if (idMarca) {
      params = params.set('idMarca', idMarca.toString());
    }
    return this.http.get(url, { params, responseType: 'json' });
  }



  /**
   * Crea un nuevo modelo en el catálogo
   * @param modelo - Objeto con los datos del modelo a crear
   */
  public createModelo(modelo: CreateModeloRequest): Observable<any> {
    const url = `${this.baseUrl}/catalogos/modelos`;
    return this.http.post(url, modelo);
  }

  /**
   * Actualiza un modelo existente en el catálogo
   * @param idModelo - ID del modelo a actualizar
   * @param modelo - Objeto con los datos actualizados del modelo
   */
  public updateModelo(idModelo: number, modelo: UpdateModeloRequest): Observable<any> {
    const url = `${this.baseUrl}/catalogos/modelos/${idModelo}`;
    return this.http.put(url, modelo);
  }

  // ============================================
  // UBICACIONES
  // ============================================

  /** Obtiene todas las ubicaciones del catálogo */
  public getUbicaciones(): Observable<any> {
    const url = `${this.baseUrl}/catalogos/ubicaciones`;
    return this.http.get(url, { responseType: 'json' });
  }

  /**
   * Crea una nueva ubicación en el catálogo
   * @param ubicacion - Objeto con los datos de la ubicación a crear
   */
  public createUbicacion(ubicacion: CreateUbicacionRequest): Observable<any> {
    const url = `${this.baseUrl}/catalogos/ubicaciones`;
    return this.http.post(url, ubicacion);
  }
}

// ============================================
// INTERFACES/DTOs
// ============================================

/** Interface para crear un nuevo modelo */
export interface CreateModeloRequest {
  idMarca: number;
  nombreModelo: string;
  tipoCarroceria?: string;
  añoInicio?: number;
  añoFin?: number;
  descripcion?: string;
}

/** Interface para actualizar un modelo existente */
export interface UpdateModeloRequest {
  idMarca: number;
  nombreModelo: string;
  tipoCarroceria?: string;
  añoInicio?: number;
  añoFin?: number;
  descripcion?: string;
}

/** Interface para crear una nueva ubicación */
export interface CreateUbicacionRequest {
  codigoUbicacion: string;
  nombre: string;
  descripcion?: string;
  direccion?: string;
  seccion?: string;
  estante?: string;
  nivel?: string;
  capacidadMaxima?: number;
}