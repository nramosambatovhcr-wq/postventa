import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// ============================================
// INTERFACES - INVOICES
// ============================================

export interface InvoiceVehiDto {
  invoiceId: number;
  invoiceNumber: string;
  invoiceDate?: string;
  blId?: number;
  customerId?: number;
  currency?: string;
  totalAmount: number;
  paymentTerms?: string;
  dueDate?: string;
  status?: string;
  containerCount: number;
  totalNetWeight: number;
  totalGrossWeight: number;
  totalVolume: number;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
  notes?: string;
}

export interface CreateInvoiceVehiDto {
  invoiceNumber: string;
  invoiceDate?: string;
  blId?: number;
  customerId?: number;
  currency?: string;
  totalAmount: number;
  paymentTerms?: string;
  dueDate?: string;
  status?: string;
  containerCount?: number;
  totalNetWeight?: number;
  totalGrossWeight?: number;
  totalVolume?: number;
  createdBy?: string;
  notes?: string;
}

export interface UpdateInvoiceVehiDto {
  invoiceNumber?: string;
  invoiceDate?: string;
  blId?: number;
  customerId?: number;
  currency?: string;
  totalAmount?: number;
  paymentTerms?: string;
  dueDate?: string;
  status?: string;
  containerCount?: number;
  totalNetWeight?: number;
  totalGrossWeight?: number;
  totalVolume?: number;
  createdBy?: string;
  notes?: string;
}

export interface InvoiceVehiStatsDto {
  totalInvoices: number;
  pending: number;
  paid: number;
  totalAmount: number;
  pendingAmount: number;
}

// ============================================
// INTERFACES - INVOICE DETAILS
// ============================================

export interface InvoiceDetailVehiDto {
  detailId: number;
  invoiceId: number;
  lineNumber: number;
  itemDescription?: string;
  itemCode?: string;
  quantity: number;
  unitOfMeasure?: string;
  unitPrice: number;
  totalPrice: number;
  hsCode?: string;
  originCountry?: string;
}

export interface CreateInvoiceDetailVehiDto {
  invoiceId: number;
  lineNumber?: number;
  itemDescription?: string;
  itemCode?: string;
  quantity: number;
  unitOfMeasure?: string;
  unitPrice: number;
  totalPrice: number;
  hsCode?: string;
  originCountry?: string;
}

export interface UpdateInvoiceDetailVehiDto {
  lineNumber?: number;
  itemDescription?: string;
  itemCode?: string;
  quantity?: number;
  unitOfMeasure?: string;
  unitPrice?: number;
  totalPrice?: number;
  hsCode?: string;
  originCountry?: string;
}

export interface InvoiceWithDetailsVehiDto {
  invoice: InvoiceVehiDto;
  details: InvoiceDetailVehiDto[];
}

export interface BulkDetailResponseVehiDto {
  success: boolean;
  message: string;
  ids: number[];
}

export interface ApiResponseVehi {
  success: boolean;
  message: string;
  id?: number;
  lineNumber?: number;
  deletedCount?: number;
}

// ============================================
// SERVICE
// ============================================

@Injectable({
  providedIn: 'root'
})
export class InvoicesVehiService {

  private apiUrl = 'https://bodega.vehicentro.com:1830/api/api';

  private httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  // ============================================
  // INVOICES ENDPOINTS
  // ============================================

  /**
   * GET: Obtener todas las invoices con filtros opcionales
   * Endpoint: GET /api/invoicesvehi
   * Filtros: blId, customerId, status, invoiceNumber, dateFrom, dateTo
   */
  getAllInvoices(
    blId?: number,
    customerId?: number,
    status?: string,
    invoiceNumber?: string,
    dateFrom?: string,
    dateTo?: string
  ): Observable<InvoiceVehiDto[]> {
    let params = new HttpParams();
    if (blId)          params = params.set('blId', blId.toString());
    if (customerId)    params = params.set('customerId', customerId.toString());
    if (status)        params = params.set('status', status);
    if (invoiceNumber) params = params.set('invoiceNumber', invoiceNumber);
    if (dateFrom)      params = params.set('dateFrom', dateFrom);
    if (dateTo)        params = params.set('dateTo', dateTo);

    return this.http.get<InvoiceVehiDto[]>(`${this.apiUrl}/invoicesvehi`, { params });
  }

  /**
   * GET: Obtener invoice por ID
   * Endpoint: GET /api/invoicesvehi/{id}
   */
  getInvoiceById(id: number): Observable<InvoiceVehiDto> {
    return this.http.get<InvoiceVehiDto>(`${this.apiUrl}/invoicesvehi/${id}`);
  }

  /**
   * GET: Obtener invoice con todas sus lineas de detalle
   * Endpoint: GET /api/invoicesvehi/{id}/detail
   */
  getInvoiceWithDetails(id: number): Observable<InvoiceWithDetailsVehiDto> {
    return this.http.get<InvoiceWithDetailsVehiDto>(`${this.apiUrl}/invoicesvehi/${id}/detail`);
  }

  /**
   * POST: Crear nueva invoice
   * Endpoint: POST /api/invoicesvehi
   */
  createInvoice(invoice: CreateInvoiceVehiDto): Observable<ApiResponseVehi> {
    return this.http.post<ApiResponseVehi>(`${this.apiUrl}/invoicesvehi`, invoice, this.httpOptions);
  }

  /**
   * PUT: Actualizar invoice (solo los campos enviados)
   * Endpoint: PUT /api/invoicesvehi/{id}
   */
  updateInvoice(id: number, invoice: UpdateInvoiceVehiDto): Observable<ApiResponseVehi> {
    return this.http.put<ApiResponseVehi>(`${this.apiUrl}/invoicesvehi/${id}`, invoice, this.httpOptions);
  }

  /**
   * DELETE: Eliminar invoice
   * Bloquea si la invoice tiene lineas de detalle asociadas
   * Endpoint: DELETE /api/invoicesvehi/{id}
   */
  deleteInvoice(id: number): Observable<ApiResponseVehi> {
    return this.http.delete<ApiResponseVehi>(`${this.apiUrl}/invoicesvehi/${id}`);
  }

  /**
   * GET: Estadisticas generales de invoices
   * Endpoint: GET /api/invoicesvehi/stats/summary
   */
  getInvoiceStats(): Observable<InvoiceVehiStatsDto> {
    return this.http.get<InvoiceVehiStatsDto>(`${this.apiUrl}/invoicesvehi/stats/summary`);
  }

  // ============================================
  // INVOICE DETAILS ENDPOINTS
  // ============================================

  /**
   * GET: Obtener todas las lineas de detalle de una invoice
   * Endpoint: GET /api/invoicedetailsvehi?invoiceId={id}
   */
  getDetailsByInvoice(invoiceId: number): Observable<InvoiceDetailVehiDto[]> {
    const params = new HttpParams().set('invoiceId', invoiceId.toString());
    return this.http.get<InvoiceDetailVehiDto[]>(`${this.apiUrl}/invoicedetailsvehi`, { params });
  }

  /**
   * GET: Obtener linea de detalle por ID
   * Endpoint: GET /api/invoicedetailsvehi/{id}
   */
  getDetailById(id: number): Observable<InvoiceDetailVehiDto> {
    return this.http.get<InvoiceDetailVehiDto>(`${this.apiUrl}/invoicedetailsvehi/${id}`);
  }

  /**
   * POST: Crear linea de detalle
   * Si no se envia lineNumber, el backend lo asigna automaticamente
   * Endpoint: POST /api/invoicedetailsvehi
   */
  createDetail(detail: CreateInvoiceDetailVehiDto): Observable<ApiResponseVehi> {
    return this.http.post<ApiResponseVehi>(`${this.apiUrl}/invoicedetailsvehi`, detail, this.httpOptions);
  }

  /**
   * POST: Crear multiples lineas de detalle en una sola llamada (dentro de una transaccion)
   * Endpoint: POST /api/invoicedetailsvehi/bulk
   */
  createDetailsBulk(details: CreateInvoiceDetailVehiDto[]): Observable<BulkDetailResponseVehiDto> {
    return this.http.post<BulkDetailResponseVehiDto>(
      `${this.apiUrl}/invoicedetailsvehi/bulk`, details, this.httpOptions
    );
  }

  /**
   * PUT: Actualizar linea de detalle
   * Endpoint: PUT /api/invoicedetailsvehi/{id}
   */
  updateDetail(id: number, detail: UpdateInvoiceDetailVehiDto): Observable<ApiResponseVehi> {
    return this.http.put<ApiResponseVehi>(`${this.apiUrl}/invoicedetailsvehi/${id}`, detail, this.httpOptions);
  }

  /**
   * DELETE: Eliminar linea de detalle por ID
   * Endpoint: DELETE /api/invoicedetailsvehi/{id}
   */
  deleteDetail(id: number): Observable<ApiResponseVehi> {
    return this.http.delete<ApiResponseVehi>(`${this.apiUrl}/invoicedetailsvehi/${id}`);
  }

  /**
   * DELETE: Eliminar todas las lineas de detalle de una invoice
   * Endpoint: DELETE /api/invoicedetailsvehi/by-invoice/{invoiceId}
   */
  deleteAllDetailsByInvoice(invoiceId: number): Observable<ApiResponseVehi> {
    return this.http.delete<ApiResponseVehi>(`${this.apiUrl}/invoicedetailsvehi/by-invoice/${invoiceId}`);
  }

  // ============================================
  // METODOS AUXILIARES
  // ============================================

  /**
   * Calcula el total de una linea: quantity * unitPrice
   */
  calcLineTotal(quantity: number, unitPrice: number): number {
    return +(quantity * unitPrice).toFixed(2);
  }

  /**
   * Suma el totalPrice de todas las lineas de una invoice
   */
  calcInvoiceTotal(details: InvoiceDetailVehiDto[]): number {
    return +details.reduce((sum, d) => sum + d.totalPrice, 0).toFixed(2);
  }

  /**
   * Valida los campos minimos de una linea de detalle antes de enviar
   */
  validateDetail(detail: CreateInvoiceDetailVehiDto): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!detail.invoiceId || detail.invoiceId <= 0)
      errors.push('El ID de la invoice es obligatorio');
    if (detail.quantity <= 0)
      errors.push('La cantidad debe ser mayor a 0');
    if (detail.unitPrice < 0)
      errors.push('El precio unitario no puede ser negativo');
    if (!detail.itemDescription?.trim())
      errors.push('La descripcion del item es obligatoria');
    return { valid: errors.length === 0, errors };
  }

  /**
   * Valida los campos minimos de una invoice antes de enviar
   */
  validateInvoice(invoice: CreateInvoiceVehiDto): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!invoice.invoiceNumber?.trim())
      errors.push('El numero de invoice es obligatorio');
    if (invoice.totalAmount < 0)
      errors.push('El monto total no puede ser negativo');
    return { valid: errors.length === 0, errors };
  }

  /**
   * Filtra invoices por estado (pending, paid, etc.)
   */
  filterByStatus(invoices: InvoiceVehiDto[], status: string): InvoiceVehiDto[] {
    return invoices.filter(i => i.status?.toLowerCase() === status.toLowerCase());
  }

  /**
   * Ordena invoices de mas reciente a mas antigua
   */
  sortByDate(invoices: InvoiceVehiDto[]): InvoiceVehiDto[] {
    return [...invoices].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Busqueda local en lista por numero de invoice, estado o notas
   */
  searchInList(invoices: InvoiceVehiDto[], term: string): InvoiceVehiDto[] {
    const t = term.toLowerCase().trim();
    if (!t) return invoices;
    return invoices.filter(i =>
      i.invoiceNumber.toLowerCase().includes(t) ||
      i.status?.toLowerCase().includes(t) ||
      i.notes?.toLowerCase().includes(t)
    );
  }
}