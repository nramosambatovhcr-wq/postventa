import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { forkJoin } from 'rxjs'; // Importar forkJoin

// Interfaces para tipado
export interface BlModel {
  nombre: string;
  estado: string;
}

export interface BlLiquidadoSimple {
  id: number;
  nombre: string;
  estado: string;
}

export interface BlLiquidadoConEstadisticas {
  id: number;
  nombre: string;
  estado: string;
  proveedor: string;
  total_liquidaciones: number;
  cantidad_total_liquidada: number;
}

export interface BlLiquidadoDetallado {
  id: number;
  nombre: string;
  estado: string;
  invoicebl: string;
  invoicen: string;
  total_liquidaciones: number;
  cantidad_total_liquidada: number;
  primera_liquidacion: Date;
  ultima_liquidacion: Date;
}

export interface BlNoLiquidado {
  id: number;
  nombre: string;
  estado: string;
  invoicebl: string;
  invoicen: string;
}

export interface BlLiquidadosResponse {
  message?: string;
  data: BlLiquidadoSimple[] | BlLiquidadoConEstadisticas[] | BlLiquidadoDetallado[] | BlNoLiquidado[];
}

export interface BlResponse {
  id: number;
  nombre: string;
  invoice: string;
  invoicebl: string;
  idinvoicebl: number;
  estado: string;
}

export interface ApiResponse {
  message: string;
  id?: number;
  data?: BlResponse;
  success?: boolean; 
  failed?: number;
  // Detalle por fila devuelto por uploadexcel-bybl (incluye validación
  // de códigos contra el maestro de partes de Oracle: codigoValidado, etc.)
  details?: ImportRowDetail[];
}

// Detalle de una fila procesada por el endpoint de importación de Excel.
// Refleja el resultado de la validación contra VW_MAESTRO_PARTES (Oracle)
// para cada uno de los tres códigos posibles: CODIGO, CODE_NEW, CODIGOVHCR.
export interface ImportRowDetail {
  row: number;
  status: 'success' | 'error';
  message: string;
  codigo?: string;
  codigoValidado?: boolean;
  codeNew?: string;
  codeNewValidado?: boolean;
  codigoVhcr?: string;
  codigoVhcrValidado?: boolean;
}

// NUEVA INTERFAZ: Para el modelo InvoiceBL
export interface InvoiceBlModel {
  ordenid: number;
  invoicebl: string;
  bl: string;
  contenedor: string;
  liquidacion: string;
  estado: string;
  idbl: number;
}

export interface LiquidacionBlModel {
  idinvoicebl:            number;
  iddetalle:              number;
  cantidad:               number;
  unidad:                 string;
  estado:                 string;
  estado2:                string;
  observacion:            string;
  fecha:                  string;
  extra:                  boolean;
  usuario:                number;
  ubicacion:              string;
  caracteristicas:        string;   // ← era 'caracteristica' (sin s)
  descripcionactualizada: string;   // ← era 'dactualizada'
  codvhcr:                string;
}


export interface LiquidacionBlModel1 {
  idinvoicebl: number;
  iddetalle: number;
  cantidad: number;
  unidad?: string;
  estado?: string;
  observacion?: string;
  fecha?: string; 
  extra?: boolean;
  usuario:number;
}
export interface ImgRepBlModel {
  id?: number; 
  nombre: string;
  ruta: string;
  tipoArchivo: string;
  tamano: number;
  fechaCarga: string; 
  idLiquidacionBl: number;
}
export interface PedidosBlModel {
  idBl: number;
  idInvoiceBl: number;
  idDetalle: number;
  cantidad: number;
  observacion?: string;
  idUsuario: number;
}

export interface CreateLiquidacionBlResponse {
  success: boolean;
  message: string;
  id: number;
  data: LiquidacionBlModel;
  images?: { id: number; nombre: string; ruta: string }[];
}

// NUEVA INTERFAZ para el modelo ArchivoBl del backend
export interface ArchivoBl {
  id: number;
  idBl: number;
  nombreOriginal: string;
  nombreGuardado: string;
  rutaRelativa: string;
  tipoArchivo: string;
  tamano: number;
  fechaCarga: Date;
}

export interface PedidosBlResponseDto {
  id: number;
  idInvoiceBl: number;
  idDetalle: number;
  cantidad: number;
  observacion: string;
  fecha: Date;
  idUsuario: number;
  invoiceBlNombre: string;
  blNombre: string;
  codigoDetalle: string;
  descripcionDetalle: string;
  nombreUsuario: string;
}

export interface CreatePedidoResponse {
  success: boolean;
  message: string;
  id: number;
  data: {
    id: number;
    idBl:number;
    idInvoiceBl: number;
    idDetalle: number;
    cantidad: number;
    observacion: string;
    idUsuario: number;
  };
}
 export interface BlActivoOracle {
  bl: string;
  fechaEmbarque: Date | null;
  fechaArribo: Date | null;
  proveedorId?: string;   
  proveedor?: string;     
  estado?: string;  
}

@Injectable({
  providedIn: 'root'
})
export class BlService {
  private apiUrl = 'https://bodega.vehicentro.com:1830/api/api/bl'; 
  private apiUrl2 = 'https://bodega.vehicentro.com:1830/api/api/LiquidacionBl'; 
  private apiUrlImagen = 'https://bodega.vehicentro.com:1830/api/api/liquidaciones/imagen';
  private apiUrlProveedor = 'https://bodega.vehicentro.com:1830/api/api/Proveedor';
   private apiUrl3 = 'https://bodega.vehicentro.com:1830/api/api'; 



  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) { }

    getApiUrl(): string {
    return this.apiUrl;
  }
  


// Método en BlService
getBlActivosOracle(): Observable<BlActivoOracle[]> {
  return this.http.get<BlActivoOracle[]>(`${this.apiUrlProveedor}/importacion/bl-activos`);
}

  // GET: Obtener todos los registros de BL
  getAllBl(): Observable<BlResponse[]> {
    return this.http.get<BlResponse[]>(this.apiUrl);
  }

 getAllBlid(id:any): Observable<BlResponse[]> {
    return this.http.get<BlResponse[]>(`${this.apiUrl}/usuario/${id}`);
  }

  getAllBl1(): Observable<BlResponse[]> {
    return this.http.get<BlResponse[]>(`${this.apiUrl}/todo`);
  }

  getBl(id:number): Observable<any> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.get<any>(url);
  }

  getAllBlAll(): Observable<BlResponse[]> {
    return this.http.get<BlResponse[]>(`${this.apiUrl}/all`);
  }
  
  getAllBlProveedor(id: number): Observable<BlResponse[]> {
    return this.http.get<BlResponse[]>(`${this.apiUrl}/proveedor/${id}`);
  }

  getAllBlProveedorTra(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/proveedortra/${id}`);
  }
  
  getAllBlProveedorIn(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/proveedorin/${id}`);
  }

  getAllDetails(id: number): Observable<any> {
    const url = `${this.apiUrl}/bl-excel-liqui/${id}`;
    return this.http.get<any>(url);
  }

  getDetalleCompleto(blId: number): Observable<any> {
  const url = `${this.apiUrl}/bl-detalle-completo/${blId}`;
  return this.http.get<any>(url);
}

  getLiquidacionesByBl(blId: number): Observable<any[]> {
  return this.http
    .get<any[]>(`${this.apiUrl2}/GetAllLiquidacionesDetalladasnuevo`)
    .pipe(
      map((all: any[]) => all.filter((l: any) => l.idInvoiceBl === blId))
    );
}

   getAllDetailsCom(id: number): Observable<any> {
    const url = `${this.apiUrl}/bl-excel-liqui-completo/${id}`;
    return this.http.get<any>(url);
  }

  getAllDetailsA(id: number): Observable<any> {
    const url = `${this.apiUrl}/bl-excel-pedi/${id}`;
    return this.http.get<any>(url);
  }

  // GET: Obtener un registro de BL por ID
  getBlById(id: number): Observable<BlResponse> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.get<BlResponse>(url);
  }

  // POST: Crear un nuevo registro de BL
  createBl(bl: BlModel): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.apiUrl, bl, this.httpOptions);
  }

  // PUT: Actualizar un registro existente de BL
  updateBl(id: number, bl: BlModel): Observable<ApiResponse> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.put<ApiResponse>(url, bl, this.httpOptions);
  }

  // DELETE: Eliminar un registro de BL
  deleteBl(id: number): Observable<ApiResponse> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.delete<ApiResponse>(url);
  }

  // NUEVO MÉTODO: POST para crear un nuevo registro de InvoiceBL
  createInvoiceBl(invoiceBl: InvoiceBlModel): Observable<ApiResponse> {
    const url = `${this.apiUrl}/invoicebl`; 
    return this.http.post<ApiResponse>(url, invoiceBl, this.httpOptions);
  }

  // NUEVO MÉTODO: PUT para actualizar un registro existente de InvoiceBL
  updateInvoiceBl(id: number, invoiceBl: InvoiceBlModel): Observable<ApiResponse> {
    const url = `${this.apiUrl}/invoicebl/${id}`; 
    return this.http.put<ApiResponse>(url, invoiceBl, this.httpOptions);
  }

  // Función auxiliar para manejar errores (se mantiene)
  private handleError(error: any): Observable<never> {
    console.error('Error en BlService:', error);
    throw error;
  }

  uploadExcelInvoiceBl(file: File): Observable<ApiResponse> {
    const formData = new FormData(); 
    formData.append('excelFile', file, file.name); 
    return this.http.post<ApiResponse>(`${this.apiUrl}/invoicebl/uploadexcel`, formData);
  }

  uploadExcelInvoiceBlByBl(file: File, blName: string): Observable<ApiResponse> {
  const formData = new FormData();
  formData.append('excelFile', file, file.name);

  const params = new HttpParams().set('blName', blName);

  return this.http.post<ApiResponse>(
    `${this.apiUrl3}/invoicebl/uploadexcel-bybl`,
    formData,
    { params }
  );
}

  getInvoiceBlDetails(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/ver/${id}`); 
  }

  deleteDetalleInvoiceBl(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`); 
  }

  createLiquidacionBl(data: LiquidacionBlModel, images?: File[]): Observable<CreateLiquidacionBlResponse> {
  const formData = new FormData();
 
  formData.append('Idinvoicebl', data.idinvoicebl.toString());
  formData.append('Iddetalle',   data.iddetalle.toString());
  formData.append('Cantidad',    data.cantidad.toString());
  formData.append('Estado2',     data.estado2.toString());
  formData.append('Codvhcr',     data.codvhcr.toString());
 
  if (data.unidad     != null) formData.append('Unidad',      data.unidad);
  if (data.estado     != null) formData.append('Estado',      data.estado);
  if (data.observacion != null) formData.append('Observacion', data.observacion);
  if (data.fecha      != null) formData.append('Fecha',       data.fecha);
  if (data.extra      != null) formData.append('Extra',       data.extra ? 'true' : 'false');
  if (data.usuario    != null) formData.append('Usuario',     data.usuario.toString());
  if (data.ubicacion  != null) formData.append('Ubicacion',   data.ubicacion.toString());
 
  // ← nombres corregidos para que coincidan con las columnas de PostgreSQL
  if (data.descripcionactualizada != null)
    formData.append('Descripcionactualizada', data.descripcionactualizada.toString());
 
  if (data.caracteristicas != null)
    formData.append('Caracteristicas', data.caracteristicas.toString());
 
  if (images && images.length > 0)
    images.forEach(image => formData.append('Images', image, image.name));
 
  return this.http.post<CreateLiquidacionBlResponse>(`${this.apiUrl2}/bl`, formData);
}

  /**
   * Updates an existing LiquidacionBl record.
   * @param id The ID of the record to update.
   * @param data The updated LiquidacionBl data.
   * @returns An Observable that emits the update response.
   */
 updateLiquidacionBl(id: number, data: LiquidacionBlModel, images?: File[]): Observable<any> {
  // Sin imágenes: PUT JSON normal (igual que antes, no rompe nada)
  if (!images || images.length === 0) {
    return this.http.put<any>(`${this.apiUrl2}/${id}`, data);
  }

  // Con imágenes: PUT multipart/form-data
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value !== null && value !== undefined ? String(value) : '');
  });
  images.forEach(img => formData.append('imagenes', img, img.name));

  return this.http.put<any>(`${this.apiUrl2}/${id}`, formData);
}

  getAllLiquidacionesDetalladas(): Observable<any> {
    return this.http.get(`${this.apiUrl2}/GetAllLiquidacionesDetalladas`);
  }

   getAllLiquidacionesDetalladasid(id:any): Observable<any> {
    return this.http.get(`${this.apiUrl2}/GetAllLiquidacionesDetalladas/${id}`);
  }
//buscarcodigo

 getcodigoliquidacion(codigo: any): Observable<any> {
    // Corrected URL using a query parameter
    return this.http.get(`${this.apiUrl2}/buscarcodigo?codigo=${codigo}`);
  }
  // --- MÉTODOS AÑADIDOS PARA LA GESTIÓN DE ARCHIVOS ---

 
  uploadFile(file: File, blId: number): Observable<ApiResponse> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('blId', blId.toString());
    
    // La URL del endpoint de tu API para subir archivos.
    const url = `${this.apiUrl}/upload-file`; 
    
    // HttpClient maneja automáticamente el Content-Type para FormData,
    // por lo que no necesitamos pasar HttpHeaders aquí.
    return this.http.post<ApiResponse>(url, formData);
  }

 
  getArchivosByBlId(blId: number): Observable<ArchivoBl[]> {
    return this.http.get<ArchivoBl[]>(`${this.apiUrl}/archivos/${blId}`);
  }

  downloadFile(fileId: number): Observable<Blob> {
    const url = `${this.apiUrl}/download/${fileId}`;
    return this.http.get(url, { responseType: 'blob' });
  }

  createRequestBl(data: LiquidacionBlModel): Observable<CreateLiquidacionBlResponse> {
    return this.http.post<CreateLiquidacionBlResponse>(this.apiUrl2, data, this.httpOptions);
  }


  getAllPedidos(): Observable<PedidosBlResponseDto[]> {
    return this.http.get<PedidosBlResponseDto[]>(`${this.apiUrl}/pedidos`);
  }


  createPedido(pedido: PedidosBlModel): Observable<CreatePedidoResponse> {
    return this.http.post<CreatePedidoResponse>(`${this.apiUrl}/pedidos`, pedido, this.httpOptions);
  }


  getPedidoById(id: number): Observable<PedidosBlResponseDto> {
    return this.http.get<PedidosBlResponseDto>(`${this.apiUrl}/pedidos/${id}`);
  }

  updatePedido(id: number, pedido: PedidosBlModel): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/pedidos/${id}`, pedido, this.httpOptions);
  }

 
  deletePedido(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/pedidos/${id}`);
  }


  getPedidosByUsuario(usuarioId: number): Observable<PedidosBlResponseDto[]> {
    return this.http.get<PedidosBlResponseDto[]>(`${this.apiUrl}/pedidos/usuario/${usuarioId}`);
  }

  
  getPedidosByInvoiceBl(invoiceBlId: number): Observable<PedidosBlResponseDto[]> {
    return this.http.get<PedidosBlResponseDto[]>(`${this.apiUrl}/pedidos/invoicebl/${invoiceBlId}`);
  }

getBlLiquidados(): Observable<BlLiquidadoConEstadisticas[]> {
  return this.http.get<BlLiquidadoConEstadisticas[]>(`${this.apiUrl2}/liquidados`);
}

/**
 * GET: Obtener BL que tienen liquidaciones (versión simple)
 * Endpoint: /api/bl/liquidados-simple
 */
getBlLiquidadosSimple(): Observable<BlLiquidadoSimple[]> {
  return this.http.get<BlLiquidadoSimple[]>(`${this.apiUrl2}/liquidados-simple`);
}

/**
 * GET: Obtener BL que tienen liquidaciones con información detallada
 * Endpoint: /api/bl/liquidados-detallado
 */
getBlLiquidadosDetallado(): Observable<BlLiquidadoDetallado[]> {
  return this.http.get<BlLiquidadoDetallado[]>(`${this.apiUrl2}/liquidados-detallado`);
}

/**
 * GET: Obtener BL que NO tienen liquidaciones
 * Endpoint: /api/bl/no-liquidados
 */
getBlNoLiquidados(): Observable<BlNoLiquidado[]> {
  return this.http.get<BlNoLiquidado[]>(`${this.apiUrl2}/no-liquidados`);
}

/**
 * GET: Obtener estadísticas generales de liquidaciones
 * Método auxiliar que combina información de liquidados y no liquidados
 */
getEstadisticasLiquidaciones(): Observable<{
  totalBl: number;
  blLiquidados: number;
  blNoLiquidados: number;
  porcentajeLiquidado: number;
}> {
  // Implementamos usando forkJoin para hacer ambas consultas en paralelo
  const liquidados$ = this.getBlLiquidadosSimple();
  const noLiquidados$ = this.getBlNoLiquidados();

  return new Observable(observer => {
    forkJoin({
      liquidados: liquidados$,
      noLiquidados: noLiquidados$
    }).subscribe({
      next: (result) => {
        const totalBl = result.liquidados.length + result.noLiquidados.length;
        const blLiquidados = result.liquidados.length;
        const blNoLiquidados = result.noLiquidados.length;
        const porcentajeLiquidado = totalBl > 0 ? (blLiquidados / totalBl) * 100 : 0;

        observer.next({
          totalBl,
          blLiquidados,
          blNoLiquidados,
          porcentajeLiquidado: Math.round(porcentajeLiquidado * 100) / 100
        });
        observer.complete();
      },
      error: (error) => observer.error(error)
    });
  });
}

/**
 * GET: Verificar si un BL específico tiene liquidaciones
 * @param blId ID del BL a verificar
 */
verificarBlLiquidado(blId: number): Observable<{ liquidado: boolean; bl?: BlLiquidadoSimple }> {
  return new Observable(observer => {
    this.getBlLiquidadosSimple().subscribe({
      next: (liquidados) => {
        const blEncontrado = liquidados.find(bl => bl.id === blId);
        observer.next({
          liquidado: !!blEncontrado,
          bl: blEncontrado
        });
        observer.complete();
      },
      error: (error) => observer.error(error)
    });
  });
}

  /**
   * NUEVO MÉTODO: Actualiza una liquidación.
   * @param id ID de la liquidación a actualizar.
   * @param data Los datos a actualizar (descripcionEspanol, ubicacionf).
   */
  updateLiquidacion(id: number, data: { descripcionActualizada: any, ubicacionf: any }): Observable<any> {
    const url = `${this.apiUrl2}/actua/${id}`;
    return this.http.put(url, data);
  }
  
  /**
   * NUEVO MÉTODO: Sube una imagen para una liquidación específica.
   * @param formData Contiene el archivo de imagen y el ID de la liquidación.
   */
  uploadImage(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl2}/imagen`, formData);
  }
}