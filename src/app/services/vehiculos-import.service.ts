import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// ============================================
// INTERFACES PARA CONTAINER MANAGEMENT
// ============================================

export interface ContainerDto {
  id: number;
  containerNumber: string;
  sealNumber: string;
  contentDescription: string;
  chassisNumbers?: string[];
  cabNumbers?: string[];
  qtyPackagingUnits: number;
  netWeightKg: number;
  grossWeightKg: number;
  volumeM3: number;
  packingDate?: string;
  containerStatus: string;
  remarks?: string;
}

export interface CreateContainerDto {
  orderId: number;
  invoiceId: number;
  blId: number;
  serialNumber: number;
  containerNumber: string;
  sealNumber: string;
  contentDescription: string;
  chassisNumbers?: string[];
  cabNumbers?: string[];
  qtyPackagingUnits: number;
  netWeightKg: number;
  grossWeightKg: number;
  volumeM3: number;
  packingDate?: string;
  containerStatus?: string;
  remarks?: string;
}

export interface UpdateContainerDto {
  sealNumber?: string;
  contentDescription?: string;
  chassisNumbers?: string[];
  cabNumbers?: string[];
  qtyPackagingUnits?: number;
  netWeightKg?: number;
  grossWeightKg?: number;
  containerNumber?: number;
  volumeM3?: number;
  packingDate?: string;
  containerStatus?: string;
  remarks?: string;
}

export interface ContainerContentDto {
  id: number;
  containerId: number;
  itemTypeCode: string;
  itemTypeName: string;
  quantity: number;
  specifications?: string;
}

export interface CreateContainerContentDto {
  itemTypeId: number;
  quantity: number;
  specifications?: string;
}

export interface ShippingOrderDto {
  id: number;
  orderNumber: string;
  invoiceId: number;
  invoiceNumber: string;
  blId: number;
  blNumber: string;
  orderDescription?: string;
  destination: string;
  totalContainers: number;
  containerType: string;
  totalNetWeight: number;
  totalGrossWeight: number;
  totalVolume: number;
  orderStatus: string;
}

export interface CreateShippingOrderDto {
  orderNumber: string;
  invoiceId: number;
  blId: number;
  orderDescription?: string;
  destination?: string;
  totalContainers?: number;
  containerType?: string;
  orderStatus?: string;
}

export interface InvoiceWithContainersDto {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  blId: number;
  blNumber: string;
  customerName: string;
  containerCount: number;
  totalNetWeight: number;
  totalGrossWeight: number;
  totalVolume: number;
  status?: string;
  notes?: string;
  containers: ContainerSummaryDto[];
}

export interface ContainerSummaryDto {
  id: number;
  containerNumber: string;
  netWeightKg: number;
  sealNumber: string;
  grossWeightKg: number;
  volumeM3: number;
  contentDescription: string;
  containerStatus?: string;
}

export interface BlHierarchyDto {
  id: number;
  blNumber: string;
  blDate?: string;
  vesselName: string;
  portOfLoading: string;
  portOfDischarge: string;
  totalContainers: number;
  totalGrossWeight: number;
  totalVolume: number;
  invoices: InvoiceInBlDto[];
}

export interface InvoiceInBlDto {
  id: number;
  invoiceNumber: string;
  containerCount: number;
  totalGrossWeight: number;
  containers: ContainerSummaryDto[];
}

export interface InventorySummaryDto {
  typeCode: string;
  typeName: string;
  typeNameEs?: string;
  totalQuantity: number;
  containersCount: number;
}

export interface ContainerDetailResponse {
  container: {
    id: number;
    containerNumber: string;
    sealNumber: string;
    contentDescription: string;
    chassisNumbers?: string[];
    cabNumbers?: string[];
    qtyPackagingUnits: number;
    netWeightKg: number;
    grossWeightKg: number;
    volumeM3: number;
    packingDate?: string;
    containerStatus: string;
    remarks?: string;
    invoiceNumber: string;
    orderNumber: string;
    blNumber: string;
  };
  contents: ContainerContentDto[];
}

export interface ApiResponse {
  success: boolean;
  message: string;
  id?: number;
  data?: any;
}

export interface ChassisSearchResult {
  containerId: number;
  containerNumber: string;
  sealNumber: string;
  chassisNumbers: string[];
  cabNumbers?: string[];
  invoiceNumber: string;
  blNumber: string;
}

// ============================================
// NUEVAS INTERFACES PARA B/L VEHÍCULOS
// ============================================

export interface BlVehiculosDto {
  id: number;
  blNumber: string;
  blDate?: string;
  vesselName: string;
  voyageNumber: string;
  portOfLoading: string;
  portOfDischarge: string;
  etd?: string;
  eta?: string;
  shippingLine?: string;
  agentName?: string;
  totalContainers: number;
  totalNetWeight: number;
  totalGrossWeight: number;
  totalVolume: number;
  remarks?: string;
  createdAt: string;
  updatedAt?: string;
  
}

export interface CreateBlVehiculosDto {
  blNumber: string;
  blDate?: string;
  vesselName: string;
  voyageNumber?: string;
  portOfLoading: string;
  portOfDischarge: string;
  etd?: string;
  eta?: string;
  shippingLine?: string;
  agentName?: string;
  remarks?: string;
}

export interface UpdateBlVehiculosDto {
  blNumber?: string;
  blDate?: string;
  vesselName?: string;
  voyageNumber?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  etd?: string;
  eta?: string;
  shippingLine?: string;
  agentName?: string;
  remarks?: string;
}

export interface BlVehiculosListDto {
  id: number;
  blNumber: string;
  blDate?: string;
  vesselName: string;
  portOfLoading: string;
  portOfDischarge: string;
  totalContainers: number;
  invoiceCount: number;
  createdAt: string;
  remarks?: string;
}

export interface BlInvoiceSummaryDto {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  containerCount: number;
  totalGrossWeight: number;
}

export interface BlVehiculosDetailDto extends BlVehiculosDto {
  invoices: BlInvoiceSummaryDto[];
}

export interface BlStatisticsDto {
  totalBl: number;
  recentBl: number;
  totalContainers: number;
  totalGrossWeight: number;
}


export interface BlContainerDto {
  containerId: number;
  orderId?: number;
  invoiceId?: number;
  blId?: number;
  serialNumber?: number;
  containerNumber: string;
  sealNumber: string;
  containerSize?: string;
  itemCategory?: string;
  contentDescription?: string;
  chassisNumbers: string[];
  cabNumbers: string[];
  engineNumbers: string[];
  qtyPackagingUnits?: number;
  packagingUnitType?: string;
  netWeightKg: number;
  grossWeightKg: number;
  volumeM3: number;
  packingDate?: string;
  containerStatus?: string;
  remarks?: string;
  createdAt: string;
  updatedAt?: string;
  invoiceNumber?: string;
}

export interface BlContainersResponseDto {
  blId: number;
  totalContainers: number;
  containers: BlContainerDto[];
}

// ============================================
// NUEVAS INTERFACES PARA INVOICE VEHICULOS
// ============================================

export interface CreateInvoiceVehiculosDto {
  invoiceNumber: string;
  invoiceDate?: string;
  blId: number;
  customerId?: number;
  currency?: string;
  status?: string;
  notes?: string;
  totalAmount?: number;
}

export interface UpdateInvoiceVehiculosDto {
  invoiceNumber?: string;
  invoiceDate?: string;
  blId?: number;
  customerId?: number;
  currency?: string;
  status?: string;
  notes?: string;
  totalAmount?: number;
}

export interface InvoiceListDto {
  id: number;
  invoiceNumber: string;
  invoiceDate?: string;
  blId: number;
  blNumber: string;
  customerName: string;
  containerCount: number;
  totalGrossWeight: number;
  status: string;
  createdAt: string;
}

export interface SaveRevisionDto {
  revisedBy: string;
  items: RevisionItemDto[];
}

export interface RevisionItemDto {
  containerId: number;
  itemType: 'chassis' | 'cab' | 'engine';
  itemNumber: string;
  status: 'pending' | 'revised' | 'observation' | 'missing';
  note: string;
}

export interface RevisionResponseDto {
  revisionId: number;
  blId: number;
  revisionDate: string;
  revisedBy: string;
  totalItems: number;
  revisedItems: number;
  status: string;
  notes: string;
  items: RevisionItemResponseDto[];
}

export interface RevisionItemResponseDto {
  itemId: number;
  containerId: number;
  containerNumber: string;
  itemType: string;
  itemNumber: string;
  status: string;
  note: string;
  revisedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class VehiculosImportService {
  private apiUrl = 'https://bodega.vehicentro.com:1830/api/api';
  
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) { }

  getApiUrl(): string {
    return this.apiUrl;
  }

  // ============================================
  // B/L VEHÍCULOS ENDPOINTS (NUEVOS)
  // ============================================

  /**
   * GET: Obtener todos los B/L con filtros opcionales
   * Endpoint: /api/blvehiculos?vesselName={vesselName}&portOfLoading={port}&dateFrom={date}&dateTo={date}
   */
  getAllBlVehiculos(
    vesselName?: string,
    portOfLoading?: string,
    portOfDischarge?: string,
    dateFrom?: string,
    dateTo?: string
  ): Observable<BlVehiculosListDto[]> {
    let url = `${this.apiUrl}/blvehiculos`;
    const params: string[] = [];
    
    if (vesselName) {
      params.push(`vesselName=${encodeURIComponent(vesselName)}`);
    }
    if (portOfLoading) {
      params.push(`portOfLoading=${encodeURIComponent(portOfLoading)}`);
    }
    if (portOfDischarge) {
      params.push(`portOfDischarge=${encodeURIComponent(portOfDischarge)}`);
    }
    if (dateFrom) {
      params.push(`dateFrom=${dateFrom}`);
    }
    if (dateTo) {
      params.push(`dateTo=${dateTo}`);
    }
    
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    
    return this.http.get<BlVehiculosListDto[]>(url);
  }

  /**
   * GET: Obtener B/L por ID
   * Endpoint: /api/blvehiculos/{id}
   */
  getBlVehiculosById(id: number): Observable<BlVehiculosDto> {
    return this.http.get<BlVehiculosDto>(`${this.apiUrl}/blvehiculos/${id}`);
  }

  /**
   * GET: Obtener B/L por ID con detalle de invoices
   * Endpoint: /api/blvehiculos/{id}/detail
   */
  getBlVehiculosDetail(id: number): Observable<BlVehiculosDetailDto> {
    return this.http.get<BlVehiculosDetailDto>(`${this.apiUrl}/blvehiculos/${id}/detail`);
  }

  /**
   * GET: Buscar B/L por número
   * Endpoint: /api/blvehiculos/search/{blNumber}
   */
  searchBlVehiculosByNumber(blNumber: string): Observable<BlVehiculosListDto[]> {
    return this.http.get<BlVehiculosListDto[]>(`${this.apiUrl}/blvehiculos/search/${encodeURIComponent(blNumber)}`);
  }

  /**
   * POST: Crear nuevo B/L
   * Endpoint: /api/blvehiculos
   */
  createBlVehiculos(bl: CreateBlVehiculosDto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/blvehiculos`, bl, this.httpOptions);
  }

  /**
   * PUT: Actualizar B/L
   * Endpoint: /api/blvehiculos/{id}
   */
  updateBlVehiculos(id: number, bl: UpdateBlVehiculosDto): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/blvehiculos/${id}`, bl, this.httpOptions);
  }

  /**
   * DELETE: Eliminar B/L (solo si no tiene invoices)
   * Endpoint: /api/blvehiculos/{id}
   */
  deleteBlVehiculos(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/blvehiculos/${id}`);
  }


  /**
   * GET: Obtener contenedores de un B/L con todo su contenido
   * Endpoint: /api/blvehiculos/{id}/containers
   */
  getBlContainers(blId: number): Observable<BlContainersResponseDto> {
    return this.http.get<BlContainersResponseDto>(`${this.apiUrl}/blvehiculos/${blId}/containers`);
  }

  /**
   * GET: Obtener estadísticas de B/L
   * Endpoint: /api/blvehiculos/stats/summary
   */
  getBlStatistics(): Observable<BlStatisticsDto> {
    return this.http.get<BlStatisticsDto>(`${this.apiUrl}/blvehiculos/stats/summary`);
  }

  // ============================================
  // INVOICE VEHICULOS ENDPOINTS (NUEVOS)
  // ============================================

  /**
   * GET: Obtener todas las invoices con contenedores
   * Endpoint: /api/invoicevehiculos
   */
  getAllInvoicesWithContainers(
    searchTerm?: string, 
    blId?: number, 
    status?: string
  ): Observable<InvoiceWithContainersDto[]> {
    let params = new HttpParams();
    if (searchTerm) params = params.set('searchTerm', searchTerm);
    if (blId) params = params.set('blId', blId.toString());
    if (status) params = params.set('status', status);
    
    return this.http.get<InvoiceWithContainersDto[]>(
      `${this.apiUrl}/invoicevehiculos`, 
      { params }
    );
  }

  /**
   * GET: Obtener invoice por ID con contenedores
   * Endpoint: /api/invoicevehiculos/{id}
   */
  getInvoiceWithContainers(id: number): Observable<InvoiceWithContainersDto> {
    return this.http.get<InvoiceWithContainersDto>(`${this.apiUrl}/invoicevehiculos/${id}`);
  }

  /**
   * POST: Crear nueva invoice
   * Endpoint: /api/invoicevehiculos
   */
  createInvoice(invoice: CreateInvoiceVehiculosDto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/invoicevehiculos`, invoice, this.httpOptions);
  }

  /**
   * PUT: Actualizar invoice
   * Endpoint: /api/invoicevehiculos/{id}
   */
  updateInvoice(id: number, invoice: UpdateInvoiceVehiculosDto): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/invoicevehiculos/${id}`, invoice, this.httpOptions);
  }

  /**
   * DELETE: Eliminar invoice
   * Endpoint: /api/invoicevehiculos/{id}
   */
  deleteInvoice(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/invoicevehiculos/${id}`);
  }

  /**
   * POST: Carga masiva desde Excel
   * Endpoint: /api/invoicevehiculos/bulk-upload
   */
  bulkUploadInvoices(data: any[]): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/invoicevehiculos/bulk-upload`, data, this.httpOptions);
  }

  /**
   * GET: Lista simple de invoices
   * Endpoint: /api/invoicevehiculos/list
   */
  getInvoiceList(blId?: number): Observable<InvoiceListDto[]> {
    let params = new HttpParams();
    if (blId) params = params.set('blId', blId.toString());
    
    return this.http.get<InvoiceListDto[]>(
      `${this.apiUrl}/invoicevehiculos/list`, 
      { params }
    );
  }

  /**
   * GET: Estadísticas de invoices
   * Endpoint: /api/invoicevehiculos/stats/summary
   */
  getInvoiceStatistics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/invoicevehiculos/stats/summary`);
  }

  // ============================================
  // B/L HIERARCHY ENDPOINTS (EXISTENTES)
  // ============================================

  /**
   * GET: Obtener jerarquía completa del B/L con invoices y contenedores
   * Endpoint: /api/container/bl-hierarchy/{blId}
   */
  getBlHierarchy(blId: number): Observable<BlHierarchyDto> {
    return this.http.get<BlHierarchyDto>(`${this.apiUrl}/container/bl-hierarchy/${blId}`);
  }

  // ============================================
  // CONTAINER ENDPOINTS (EXISTENTES)
  // ============================================

  /**
   * GET: Obtener todos los contenedores con filtros opcionales
   * Endpoint: /api/container/containers?invoiceId={invoiceId}&blId={blId}
   */
  getAllContainers(invoiceId?: number, blId?: number): Observable<ContainerDto[]> {
    let url = `${this.apiUrl}/container/containers`;
    const params: string[] = [];
    
    if (invoiceId) {
      params.push(`invoiceId=${invoiceId}`);
    }
    if (blId) {
      params.push(`blId=${blId}`);
    }
    
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    
    return this.http.get<ContainerDto[]>(url);
  }

  /**
   * GET: Obtener detalle de un contenedor con su contenido
   * Endpoint: /api/container/containers/{id}
   */
  getContainerById(id: number): Observable<ContainerDetailResponse> {
    return this.http.get<ContainerDetailResponse>(`${this.apiUrl}/container/containers/${id}`);
  }

  /**
   * POST: Crear nuevo contenedor
   * Endpoint: /api/container/containers
   */
  createContainer(container: CreateContainerDto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/container/containers`, container, this.httpOptions);
  }

  /**
   * PUT: Actualizar contenedor
   * Endpoint: /api/container/containers/{id}
   */
  updateContainer(id: number, container: UpdateContainerDto): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/container/containers/${id}`, container, this.httpOptions);
  }

  /**
   * DELETE: Eliminar contenedor
   * Endpoint: /api/container/containers/{id}
   */
  deleteContainer(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/container/containers/${id}`);
  }

  // ============================================
  // CONTAINER CONTENT ENDPOINTS (EXISTENTES)
  // ============================================

  /**
   * POST: Agregar contenido a un contenedor
   * Endpoint: /api/container/containers/{containerId}/contents
   */
  addContainerContent(containerId: number, content: CreateContainerContentDto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.apiUrl}/container/containers/${containerId}/contents`, 
      content, 
      this.httpOptions
    );
  }

  // ============================================
  // SEARCH ENDPOINTS (EXISTENTES)
  // ============================================

  /**
   * GET: Buscar contenedor por número de chasis
   * Endpoint: /api/container/search-by-chassis/{chassisNumber}
   */
  searchByChassis(chassisNumber: string): Observable<ChassisSearchResult[]> {
    return this.http.get<ChassisSearchResult[]>(`${this.apiUrl}/container/search-by-chassis/${chassisNumber}`);
  }

  // ============================================
  // INVENTORY ENDPOINTS (EXISTENTES)
  // ============================================

  /**
   * GET: Resumen de inventario por tipo de item
   * Endpoint: /api/container/inventory-summary?blId={blId}
   */
  getInventorySummary(blId?: number): Observable<InventorySummaryDto[]> {
    let url = `${this.apiUrl}/container/inventory-summary`;
    if (blId) {
      url += `?blId=${blId}`;
    }
    return this.http.get<InventorySummaryDto[]>(url);
  }

  // ============================================
  // SHIPPING ORDERS ENDPOINTS (AGREGADOS ANTERIORMENTE)
  // ============================================

  /**
   * POST: Crear nueva shipping order
   * Endpoint: /api/container/shipping-orders
   */
  createShippingOrder(order: CreateShippingOrderDto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/container/shipping-orders`, order, this.httpOptions);
  }

  /**
   * GET: Obtener todas las shipping orders
   */
  getAllShippingOrders(): Observable<ShippingOrderDto[]> {
    return this.http.get<ShippingOrderDto[]>(`${this.apiUrl}/container/shipping-orders`);
  }

  /**
   * GET: Obtener shipping order por ID
   */
  getShippingOrderById(id: number): Observable<ShippingOrderDto> {
    return this.http.get<ShippingOrderDto>(`${this.apiUrl}/container/shipping-orders/${id}`);
  }

  // ============================================
  // BULK OPERATIONS (AGREGADOS ANTERIORMENTE)
  // ============================================

  /**
   * POST: Cargar contenedores masivamente desde Excel
   * Endpoint: /api/container/containers/bulk-upload
   */
  uploadContainersExcel(file: File, blId: number, invoiceId: number): Observable<ApiResponse> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('blId', blId.toString());
    formData.append('invoiceId', invoiceId.toString());
    
    return this.http.post<ApiResponse>(`${this.apiUrl}/container/containers/bulk-upload`, formData);
  }

  /**
   * POST: Crear múltiples contenedores a la vez
   */
  createMultipleContainers(containers: CreateContainerDto[]): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/container/containers/bulk`, containers, this.httpOptions);
  }

  /**
   * GET: Obtener tipos de items (catálogo)
   */
  getItemTypes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/container/item-types`);
  }

  // ============================================
  // MÉTODOS AUXILIARES (EXISTENTES)
  // ============================================

  /**
   * Calcular peso total de un B/L
   */
  calculateBlTotalWeight(blHierarchy: BlHierarchyDto): number {
    return blHierarchy.invoices.reduce((total, invoice) => {
      return total + invoice.containers.reduce((invTotal, container) => {
        return invTotal + container.grossWeightKg;
      }, 0);
    }, 0);
  }

  /**
   * Calcular volumen total de un B/L
   */
  calculateBlTotalVolume(blHierarchy: BlHierarchyDto): number {
    return blHierarchy.invoices.reduce((total, invoice) => {
      return total + invoice.containers.reduce((invTotal, container) => {
        return invTotal + container.volumeM3;
      }, 0);
    }, 0);
  }

  /**
   * Contar total de contenedores en un B/L
   */
  countBlContainers(blHierarchy: BlHierarchyDto): number {
    return blHierarchy.invoices.reduce((total, invoice) => {
      return total + invoice.containers.length;
    }, 0);
  }

  /**
   * Buscar contenedor por número en la jerarquía del B/L
   */
  findContainerInBlHierarchy(blHierarchy: BlHierarchyDto, containerNumber: string): ContainerSummaryDto | null {
    for (const invoice of blHierarchy.invoices) {
      const container = invoice.containers.find(c => 
        c.containerNumber.toLowerCase() === containerNumber.toLowerCase()
      );
      if (container) return container;
    }
    return null;
  }

  /**
   * Obtener todos los chassis de un B/L
   */
  getAllChassisFromBl(blHierarchy: BlHierarchyDto): string[] {
    const chassis: string[] = [];
    // Nota: Esto requiere que el backend incluya chassis_numbers en la respuesta
    // o hacer llamadas individuales por contenedor
    return chassis;
  }

  /**
   * Filtrar contenedores por tipo de contenido (chasis o cabinas)
   */
  filterContainersByContentType(containers: ContainerDto[], type: 'chassis' | 'cab'): ContainerDto[] {
    return containers.filter(c => {
      if (type === 'chassis') {
        return c.chassisNumbers && c.chassisNumbers.length > 0;
      } else {
        return c.cabNumbers && c.cabNumbers.length > 0;
      }
    });
  }

  /**
   * Validar si un contenedor tiene información completa
   */
  validateContainer(container: CreateContainerDto): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!container.containerNumber || container.containerNumber.trim() === '') {
      errors.push('El número de contenedor es obligatorio');
    }
    
    if (!container.sealNumber || container.sealNumber.trim() === '') {
      errors.push('El número de sello es obligatorio');
    }
    
    if (container.grossWeightKg <= 0) {
      errors.push('El peso bruto debe ser mayor a 0');
    }
    
    if (container.volumeM3 <= 0) {
      errors.push('El volumen debe ser mayor a 0');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Formatear número de contenedor (estándar ISO)
   */
  formatContainerNumber(containerNumber: string): string {
    // Formato: XXXU1234567 (4 letras + 7 números)
    return containerNumber.toUpperCase().trim();
  }

  /**
   * Verificar si un número de contenedor es válido
   */
  isValidContainerNumber(containerNumber: string): boolean {
    const pattern = /^[A-Z]{4}\d{7}$/;
    return pattern.test(containerNumber.toUpperCase().trim());
  }

  // ============================================
  // NUEVOS MÉTODOS AUXILIARES PARA B/L
  // ============================================

  /**
   * Validar si un número de B/L es válido
   */
  isValidBlNumber(blNumber: string): boolean {
    // Formato típico: letras, números y guiones
    const pattern = /^[A-Z0-9\-]+$/i;
    return pattern.test(blNumber.trim()) && blNumber.length >= 3;
  }

  /**
   * Formatear número de B/L (mayúsculas, sin espacios)
   */
  formatBlNumber(blNumber: string): string {
    return blNumber.toUpperCase().trim().replace(/\s+/g, '');
  }

  /**
   * Calcular días hasta la llegada estimada (ETA)
   */
  getDaysToEta(etaString?: string): number | null {
    if (!etaString) return null;
    
    const eta = new Date(etaString);
    const today = new Date();
    const diffTime = eta.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  /**
   * Verificar si un B/L está vencido (ETA pasada)
   */
  isBlOverdue(etaString?: string): boolean {
    const days = this.getDaysToEta(etaString);
    return days !== null && days < 0;
  }

  /**
   * Obtener estado del B/L basado en fechas
   */
  getBlStatus(etaString?: string, etdString?: string): 'pending' | 'in-transit' | 'arrived' | 'overdue' {
    const now = new Date();
    const eta = etaString ? new Date(etaString) : null;
    const etd = etdString ? new Date(etdString) : null;

    if (eta && now > eta) return 'arrived';
    if (eta && this.isBlOverdue(etaString)) return 'overdue';
    if (etd && now > etd && eta && now < eta) return 'in-transit';
    
    return 'pending';
  }

  /**
   * Filtrar B/L por estado de tránsito
   */
  filterBlByStatus(bls: BlVehiculosListDto[], status: 'pending' | 'in-transit' | 'arrived'): BlVehiculosListDto[] {
    return bls.filter(bl => {
      // Aquí podrías implementar lógica más compleja según tus necesidades
      // Por ahora filtra por totalContainers como indicador de actividad
      if (status === 'arrived') return bl.totalContainers > 0;
      if (status === 'pending') return bl.totalContainers === 0;
      return true;
    });
  }

  /**
   * Ordenar B/L por fecha de creación (más recientes primero)
   */
  sortBlByDate(bls: BlVehiculosListDto[]): BlVehiculosListDto[] {
    return [...bls].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  /**
   * Buscar B/L en lista por número (búsqueda parcial)
   */
  searchBlInList(bls: BlVehiculosListDto[], searchTerm: string): BlVehiculosListDto[] {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return bls;
    
    return bls.filter(bl => 
      bl.blNumber.toLowerCase().includes(term) ||
      bl.vesselName.toLowerCase().includes(term) ||
      bl.portOfLoading.toLowerCase().includes(term) ||
      bl.portOfDischarge.toLowerCase().includes(term)
    );
  }

  saveBlRevision(blId: number, revision: SaveRevisionDto): Observable<ApiResponse> {
  return this.http.post<ApiResponse>(
    `${this.apiUrl}/blvehiculos/${blId}/revision`, 
    revision
  );
}

/**
 * GET: Obtener revisión guardada de vehículos
 * Endpoint: /api/blvehiculos/{id}/revision
 */
getBlRevision(blId: number): Observable<RevisionResponseDto> {
  return this.http.get<RevisionResponseDto>(
    `${this.apiUrl}/blvehiculos/${blId}/revision`
  );
}

}