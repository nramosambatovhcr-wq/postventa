import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, Observable, tap } from 'rxjs';

// Interfaces para tipado de Bodega
export interface BodegaItemModel {
  codigo: string;
  descripcion: string;
  cantidad: number;
  ubicacion: string;
  ubicacionProvisional?: string;
  maximos?: number;
  minimos?: number;
  estado: string;
  idUsuario?: number;
  fecha: Date;
  reservada: number;
}

export interface BodegaListResponse {
  success: boolean;
  message: string;
  totalRecords: number;
  items: BodegaItemModel[];
}

export interface BodegaItemResponse {
  success: boolean;
  message: string;
  item?: BodegaItemModel;
}

export interface ExcelImportResultModel {
  success: boolean;
  message: string;
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  errorRows: number;
  errors: string[];
  warnings: string[];
}

// Parámetros de búsqueda para la API de search
export interface BodegaSearchParams {
  codigo?: string;
  ubicacion?: string;
  estado?: string;
  page?: number;
  pageSize?: number;
}


export interface BodegaReservationResponse {
  success: boolean;
  message: string;
}

export interface BodegaUpdateResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class BodegaService {
  private apiUrl = 'https://bodega.vehicentro.com:1830/api/api/Liquidacionbl';

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) { }

  getApiUrl(): string {
    return this.apiUrl;
  }

  /**
   * Sube un archivo Excel para importar datos de bodega
   * @param file Archivo Excel a subir
   * @param idUsuario ID del usuario que realiza la operación (opcional)
   * @returns Observable con el resultado de la importación
   */
  uploadExcelData(file: File, idUsuario?: number): Observable<ExcelImportResultModel> {
    const formData = new FormData();
    formData.append('excelFile', file, file.name);
    
    if (idUsuario !== undefined && idUsuario !== null) {
      formData.append('idUsuario', idUsuario.toString());
    }

    return this.http.post<ExcelImportResultModel>(`${this.apiUrl}/upload-excel`, formData);
  }

  /**
   * Obtiene todos los registros de bodega
   * @returns Observable con la lista de todos los registros
   */
  getAllBodegaItems(): Observable<BodegaListResponse> {
    return this.http.get<BodegaListResponse>(`${this.apiUrl}/bodega-items`);
  }

  /**
   * Obtiene un registro de bodega por código
   * @param codigo Código del producto a buscar
   * @returns Observable con el registro encontrado
   */
  getBodegaItemByCodigo(codigo: string): Observable<BodegaItemResponse> {
    return this.http.get<BodegaItemResponse>(`${this.apiUrl}/bodega-items/${encodeURIComponent(codigo)}`);
  }

   updateBodegaItem(item: BodegaItemModel): Observable<BodegaUpdateResponse> {
    const updateUrl = `${this.apiUrl}/bodega/actualizar`;
    return this.http.put<BodegaUpdateResponse>(updateUrl, item).pipe(
      tap(response => console.log('Respuesta de actualización:', response)),
      catchError(this.handleError)
    );
  }


  /**
   * Busca registros de bodega con filtros y paginación
   * @param params Parámetros de búsqueda (codigo, ubicacion, estado, page, pageSize)
   * @returns Observable con los resultados paginados
   */
  searchBodegaItems(params: BodegaSearchParams = {}): Observable<BodegaListResponse> {
    let queryParams: string[] = [];

    if (params.codigo) {
      queryParams.push(`codigo=${encodeURIComponent(params.codigo)}`);
    }
    if (params.ubicacion) {
      queryParams.push(`ubicacion=${encodeURIComponent(params.ubicacion)}`);
    }
    if (params.estado) {
      queryParams.push(`estado=${encodeURIComponent(params.estado)}`);
    }
    if (params.page !== undefined && params.page !== null) {
      queryParams.push(`page=${params.page}`);
    }
    if (params.pageSize !== undefined && params.pageSize !== null) {
      queryParams.push(`pageSize=${params.pageSize}`);
    }

    const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
    
    return this.http.get<BodegaListResponse>(`${this.apiUrl}/bodega-items/search${queryString}`);
  }

  /**
   * Busca registros por código (parcial)
   * @param codigo Código parcial a buscar
   * @param page Número de página (opcional)
   * @param pageSize Registros por página (opcional)
   * @returns Observable con los resultados
   */
  searchByCodigo(codigo: string, page?: number, pageSize?: number): Observable<BodegaListResponse> {
    return this.searchBodegaItems({
      codigo,
      page,
      pageSize
    });
  }

  /**
   * Busca registros por ubicación (parcial)
   * @param ubicacion Ubicación parcial a buscar
   * @param page Número de página (opcional)
   * @param pageSize Registros por página (opcional)
   * @returns Observable con los resultados
   */
  searchByUbicacion(ubicacion: string, page?: number, pageSize?: number): Observable<BodegaListResponse> {
    return this.searchBodegaItems({
      ubicacion,
      page,
      pageSize
    });
  }

  /**
   * Obtiene registros por estado
   * @param estado Estado a filtrar ('activo', 'inactivo', etc.)
   * @param page Número de página (opcional)
   * @param pageSize Registros por página (opcional)
   * @returns Observable con los resultados
   */
  getByEstado(estado: string, page?: number, pageSize?: number): Observable<BodegaListResponse> {
    return this.searchBodegaItems({
      estado,
      page,
      pageSize
    });
  }

  /**
   * Obtiene registros con paginación
   * @param page Número de página
   * @param pageSize Registros por página
   * @returns Observable con los resultados paginados
   */
  getBodegaItemsPaginated(page: number, pageSize: number): Observable<BodegaListResponse> {
    return this.searchBodegaItems({
      page,
      pageSize
    });
  }

  /**
   * Verifica si existe un registro con el código especificado
   * @param codigo Código a verificar
   * @returns Observable<boolean> - true si existe, false si no existe
   */
  existsBodegaItem(codigo: string): Observable<boolean> {
    return new Observable<boolean>(observer => {
      this.getBodegaItemByCodigo(codigo).subscribe({
        next: (response) => {
          observer.next(response.success && !!response.item);
          observer.complete();
        },
        error: (error) => {
          // Si es un 404, significa que no existe
          if (error.status === 404) {
            observer.next(false);
            observer.complete();
          } else {
            observer.error(error);
          }
        }
      });
    });
  }

  /**
   * Obtiene estadísticas básicas de la bodega
   * @returns Observable con estadísticas calculadas del lado cliente
   */
  getBodegaStats(): Observable<{
    totalItems: number;
    itemsActivos: number;
    itemsInactivos: number;
    totalCantidad: number;
    totalReservado: number;
  }> {
    return new Observable(observer => {
      this.getAllBodegaItems().subscribe({
        next: (response) => {
          if (response.success && response.items) {
            const items = response.items;
            const stats = {
              totalItems: items.length,
              itemsActivos: items.filter(item => item.estado === 'activo').length,
              itemsInactivos: items.filter(item => item.estado !== 'activo').length,
              totalCantidad: items.reduce((sum, item) => sum + item.cantidad, 0),
              totalReservado: items.reduce((sum, item) => sum + item.reservada, 0)
            };
            observer.next(stats);
            observer.complete();
          } else {
            observer.error('Error al obtener datos para estadísticas');
          }
        },
        error: (error) => observer.error(error)
      });
    });
  }
  reservarBodegaItem(codigo: string, cantidad: number): Observable<BodegaReservationResponse> {
    const body = { codigo, cantidad };
    return this.http.post<BodegaReservationResponse>(`${this.apiUrl}/reservar`, body, this.httpOptions).pipe(
      tap(response => console.log('Respuesta de reserva:', response)),
      catchError(this.handleError)
    );
  }

  /**
   * Función auxiliar para manejar errores
   * @param error Error a manejar
   */
  private handleError(error: any): Observable<never> {
    console.error('Error en BodegaService:', error);
    throw error;
  }
}

//https://bodega.vehicentro.com:1830/api