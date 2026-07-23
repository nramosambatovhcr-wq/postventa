import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// ============================================
// INTERFACES PARA RECEPCIÓN DE CONTENEDORES
// ============================================

// Empresas de Transporte
export interface TransportCompanyDto {
  companyId: number;
  companyName: string;
  ruc?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateTransportCompanyDto {
  companyName: string;
  ruc?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
}

export interface UpdateTransportCompanyDto {
  companyName?: string;
  ruc?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  isActive?: boolean;
}

// Conductores
export interface DriverDto {
  driverId: number;
  companyId: number;
  companyName: string;
  fullName: string;
  idCard: string;
  licenseNumber?: string;
  phone?: string;
  isActive: boolean;
}

export interface CreateDriverDto {
  companyId: number;
  fullName: string;
  idCard: string;
  licenseNumber?: string;
  phone?: string;
}

export interface UpdateDriverDto {
  companyId?: number;
  fullName?: string;
  idCard?: string;
  licenseNumber?: string;
  phone?: string;
  isActive?: boolean;
}

// Unidades de Transporte
export interface TransportUnitDto {
  unitId: number;
  companyId: number;
  companyName: string;
  plateNumber: string;
  unitType?: string;
  brand?: string;
  model?: string;
  year?: number;
  isActive: boolean;
}

export interface CreateTransportUnitDto {
  companyId: number;
  plateNumber: string;
  unitType?: string;
  brand?: string;
  model?: string;
  year?: number;
}

export interface UpdateTransportUnitDto {
  companyId?: number;
  plateNumber?: string;
  unitType?: string;
  brand?: string;
  model?: string;
  year?: number;
  isActive?: boolean;
}

// Recepciones de Contenedores
export interface ContainerReceptionDto {
  receptionId: number;
  companyId: number;
  companyName: string;
  driverId: number;
  driverName: string;
  driverIdCard: string;
  unitId: number;
  plateNumber: string;
  containerNumber?: string;
  containerType?: string;
  sealNumber?: string;
  blNumber?: string;
  entryDate: string;
  entryTime: string;
  exitTime?: string;
  receptionStatus: string;
  generalObservations?: string;
  deliveredBy?: string;
  receivedBy?: string;
  createdAt: string;
  hasInspection: boolean;
}

export interface ContainerReceptionDetailDto extends ContainerReceptionDto {
  inspection?: ContainerInspectionDto;
}

export interface CreateContainerReceptionDto {
  companyId: number;
  driverId: number;
  unitId: number;
  containerNumber?: string;
  containerType?: string;
  sealNumber?: string;
  blNumber?: string;
  entryDate?: string;
  entryTime?: string;
  generalObservations?: string;
  deliveredBy?: string;
  receivedBy?: string;
}

export interface UpdateContainerReceptionDto {
  companyId?: number;
  driverId?: number;
  unitId?: number;
  containerNumber?: string;
  containerType?: string;
  sealNumber?: string;
  blNumber?: string;
  entryDate?: string;
  entryTime?: string;
  exitTime?: string;
  receptionStatus?: string;
  generalObservations?: string;
  deliveredBy?: string;
  receivedBy?: string;
}

// Inspecciones de Contenedores
export interface ContainerInspectionDto {
  inspectionId: number;
  receptionId: number;
  overallCondition?: string;
  
  // Estructura
  trailerBaseCondition?: string;
  trailerBaseNotes?: string;
  doorsCondition?: string;
  doorsNotes?: string;
  rightWallCondition?: string;
  rightWallNotes?: string;
  roofCondition?: string;
  roofNotes?: string;
  frontWallCondition?: string;
  frontWallNotes?: string;
  leftWallCondition?: string;
  leftWallNotes?: string;
  floorCondition?: string;
  floorNotes?: string;
  
  // Sellos
  lockMechanismOk?: boolean;
  sealPullTestOk?: boolean;
  sealTwistTestOk?: boolean;
  sealCondition?: string;
  sealNotes?: string;
  
  photos?: string[];
  inspectedBy?: string;
  inspectionDate: string;
  isApproved: boolean;
  rejectionReason?: string;
}

export interface CreateContainerInspectionDto {
  receptionId: number;
  overallCondition?: string;
  trailerBaseCondition?: string;
  trailerBaseNotes?: string;
  doorsCondition?: string;
  doorsNotes?: string;
  rightWallCondition?: string;
  rightWallNotes?: string;
  roofCondition?: string;
  roofNotes?: string;
  frontWallCondition?: string;
  frontWallNotes?: string;
  leftWallCondition?: string;
  leftWallNotes?: string;
  floorCondition?: string;
  floorNotes?: string;
  lockMechanismOk?: boolean;
  sealPullTestOk?: boolean;
  sealTwistTestOk?: boolean;
  sealCondition?: string;
  sealNotes?: string;
  photos?: string[];
  inspectedBy?: string;
  isApproved?: boolean;
  rejectionReason?: string;
}

export interface UpdateContainerInspectionDto {
  overallCondition?: string;
  trailerBaseCondition?: string;
  trailerBaseNotes?: string;
  doorsCondition?: string;
  doorsNotes?: string;
  rightWallCondition?: string;
  rightWallNotes?: string;
  roofCondition?: string;
  roofNotes?: string;
  frontWallCondition?: string;
  frontWallNotes?: string;
  leftWallCondition?: string;
  leftWallNotes?: string;
  floorCondition?: string;
  floorNotes?: string;
  lockMechanismOk?: boolean;
  sealPullTestOk?: boolean;
  sealTwistTestOk?: boolean;
  sealCondition?: string;
  sealNotes?: string;
  photos?: string[];
  inspectedBy?: string;
  isApproved?: boolean;
  rejectionReason?: string;
}

// Estadísticas
export interface ReceptionStatsDto {
  totalReceptions: number;
  pendingReceptions: number;
  completedReceptions: number;
  todayReceptions: number;
  weekReceptions: number;
}

// Respuesta API estándar
export interface ApiResponse {
  success: boolean;
  message: string;
  id?: number;
  data?: any;
}

// Opciones de condición para inspección
export type ConditionStatus = 'BUENO' | 'MALO' | 'REGULAR';

// Estados de recepción
export type ReceptionStatus = 'EN_PROCESO' | 'APROBADO' | 'RECHAZADO' | 'COMPLETADO';


// Find-or-Create DTOs
export interface FindOrCreateDriverDto {
  companyId: number;
  fullName: string;
  idCard?: string;
}

export interface FindOrCreateUnitDto {
  companyId: number;
  plateNumber: string;
}

export interface FindOrCreateResponse {
  success: boolean;
  id: number;
  created: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ContainerReceptionService {
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
  // EMPRESAS DE TRANSPORTE
  // ============================================

  /**
   * GET: Obtener todas las empresas de transporte
   * Endpoint: /api/containerreceptions/companies?isActive={boolean}
   */
  getAllCompanies(isActive?: boolean): Observable<TransportCompanyDto[]> {
    let params = new HttpParams();
    
    if (isActive !== undefined) {
      params = params.set('isActive', isActive.toString());
    }
    
    return this.http.get<TransportCompanyDto[]>(
      `${this.apiUrl}/containerreceptions/companies`, 
      { params }
    );
  }

  /**
   * GET: Obtener empresa por ID
   * Endpoint: /api/containerreceptions/companies/{id}
   */
  getCompanyById(id: number): Observable<TransportCompanyDto> {
    return this.http.get<TransportCompanyDto>(
      `${this.apiUrl}/containerreceptions/companies/${id}`
    );
  }

  /**
   * POST: Crear nueva empresa de transporte
   * Endpoint: /api/containerreceptions/companies
   */
  createCompany(company: CreateTransportCompanyDto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.apiUrl}/containerreceptions/companies`, 
      company, 
      this.httpOptions
    );
  }

  /**
   * PUT: Actualizar empresa de transporte
   * Endpoint: /api/containerreceptions/companies/{id}
   */
  updateCompany(id: number, company: UpdateTransportCompanyDto): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(
      `${this.apiUrl}/containerreceptions/companies/${id}`, 
      company, 
      this.httpOptions
    );
  }

  /**
   * DELETE: Eliminar empresa de transporte
   * Endpoint: /api/containerreceptions/companies/{id}
   */
  deleteCompany(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(
      `${this.apiUrl}/containerreceptions/companies/${id}`
    );
  }

  // ============================================
  // CONDUCTORES
  // ============================================

  /**
   * GET: Obtener todos los conductores
   * Endpoint: /api/containerreceptions/drivers?companyId={id}&isActive={boolean}&search={term}
   */
  getAllDrivers(
    companyId?: number,
    isActive?: boolean,
    search?: string
  ): Observable<DriverDto[]> {
    let params = new HttpParams();
    
    if (companyId) {
      params = params.set('companyId', companyId.toString());
    }
    if (isActive !== undefined) {
      params = params.set('isActive', isActive.toString());
    }
    if (search) {
      params = params.set('search', search);
    }
    
    return this.http.get<DriverDto[]>(
      `${this.apiUrl}/containerreceptions/drivers`, 
      { params }
    );
  }

  /**
   * GET: Obtener conductores por empresa
   */
  getDriversByCompany(companyId: number): Observable<DriverDto[]> {
    return this.getAllDrivers(companyId, true);
  }

  /**
   * GET: Obtener conductor por ID
   * Endpoint: /api/containerreceptions/drivers/{id}
   */
  getDriverById(id: number): Observable<DriverDto> {
    return this.http.get<DriverDto>(
      `${this.apiUrl}/containerreceptions/drivers/${id}`
    );
  }

  /**
   * POST: Crear nuevo conductor
   * Endpoint: /api/containerreceptions/drivers
   */
  createDriver(driver: CreateDriverDto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.apiUrl}/containerreceptions/drivers`, 
      driver, 
      this.httpOptions
    );
  }

  /**
   * PUT: Actualizar conductor
   * Endpoint: /api/containerreceptions/drivers/{id}
   */
  updateDriver(id: number, driver: UpdateDriverDto): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(
      `${this.apiUrl}/containerreceptions/drivers/${id}`, 
      driver, 
      this.httpOptions
    );
  }

  /**
   * DELETE: Eliminar conductor
   * Endpoint: /api/containerreceptions/drivers/{id}
   */
  deleteDriver(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(
      `${this.apiUrl}/containerreceptions/drivers/${id}`
    );
  }

  // ============================================
  // UNIDADES DE TRANSPORTE
  // ============================================

  /**
   * GET: Obtener todas las unidades de transporte
   * Endpoint: /api/containerreceptions/units?companyId={id}&isActive={boolean}&plateNumber={plate}
   */
  getAllUnits(
    companyId?: number,
    isActive?: boolean,
    plateNumber?: string
  ): Observable<TransportUnitDto[]> {
    let params = new HttpParams();
    
    if (companyId) {
      params = params.set('companyId', companyId.toString());
    }
    if (isActive !== undefined) {
      params = params.set('isActive', isActive.toString());
    }
    if (plateNumber) {
      params = params.set('plateNumber', plateNumber);
    }
    
    return this.http.get<TransportUnitDto[]>(
      `${this.apiUrl}/containerreceptions/units`, 
      { params }
    );
  }

  /**
   * GET: Obtener unidades por empresa
   */
  getUnitsByCompany(companyId: number): Observable<TransportUnitDto[]> {
    return this.getAllUnits(companyId, true);
  }

  /**
   * GET: Obtener unidad por ID
   * Endpoint: /api/containerreceptions/units/{id}
   */
  getUnitById(id: number): Observable<TransportUnitDto> {
    return this.http.get<TransportUnitDto>(
      `${this.apiUrl}/containerreceptions/units/${id}`
    );
  }

  /**
   * POST: Crear nueva unidad de transporte
   * Endpoint: /api/containerreceptions/units
   */
  createUnit(unit: CreateTransportUnitDto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.apiUrl}/containerreceptions/units`, 
      unit, 
      this.httpOptions
    );
  }

  /**
   * PUT: Actualizar unidad de transporte
   * Endpoint: /api/containerreceptions/units/{id}
   */
  updateUnit(id: number, unit: UpdateTransportUnitDto): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(
      `${this.apiUrl}/containerreceptions/units/${id}`, 
      unit, 
      this.httpOptions
    );
  }

  /**
   * DELETE: Eliminar unidad de transporte
   * Endpoint: /api/containerreceptions/units/{id}
   */
  deleteUnit(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(
      `${this.apiUrl}/containerreceptions/units/${id}`
    );
  }

  // ============================================
  // RECEPCIONES DE CONTENEDORES
  // ============================================

  /**
   * GET: Obtener todas las recepciones
   * Endpoint: /api/containerreceptions?dateFrom={date}&dateTo={date}&status={status}&companyId={id}&containerNumber={num}&blNumber={bl}
   */
  getAllReceptions(
    dateFrom?: string,
    dateTo?: string,
    status?: string,
    companyId?: number,
    containerNumber?: string,
    blNumber?: string
  ): Observable<ContainerReceptionDto[]> {
    let params = new HttpParams();
    
    if (dateFrom) {
      params = params.set('dateFrom', dateFrom);
    }
    if (dateTo) {
      params = params.set('dateTo', dateTo);
    }
    if (status) {
      params = params.set('status', status);
    }
    if (companyId) {
      params = params.set('companyId', companyId.toString());
    }
    if (containerNumber) {
      params = params.set('containerNumber', containerNumber);
    }
    if (blNumber) {
      params = params.set('blNumber', blNumber);
    }
    
    return this.http.get<ContainerReceptionDto[]>(
      `${this.apiUrl}/containerreceptions`, 
      { params }
    );
  }

  /**
   * GET: Obtener recepciones de hoy
   */
  getTodayReceptions(): Observable<ContainerReceptionDto[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getAllReceptions(today, today);
  }

  /**
   * GET: Obtener recepciones en proceso (activas)
   */
  getActiveReceptions(): Observable<ContainerReceptionDto[]> {
    return this.getAllReceptions(undefined, undefined, 'EN_PROCESO');
  }

  /**
   * GET: Obtener recepción por ID con detalle
   * Endpoint: /api/containerreceptions/{id}
   */
  getReceptionById(id: number): Observable<ContainerReceptionDetailDto> {
    return this.http.get<ContainerReceptionDetailDto>(
      `${this.apiUrl}/containerreceptions/${id}`
    );
  }

  /**
   * POST: Crear nueva recepción de contenedor
   * Endpoint: /api/containerreceptions
   */
  createReception(reception: CreateContainerReceptionDto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.apiUrl}/containerreceptions`, 
      reception, 
      this.httpOptions
    );
  }

  /**
   * PUT: Actualizar recepción
   * Endpoint: /api/containerreceptions/{id}
   */
  updateReception(id: number, reception: UpdateContainerReceptionDto): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(
      `${this.apiUrl}/containerreceptions/${id}`, 
      reception, 
      this.httpOptions
    );
  }

  /**
   * PUT: Registrar salida de contenedor
   * Endpoint: /api/containerreceptions/{id}/exit
   */
  registerExit(id: number, receivedBy?: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(
      `${this.apiUrl}/containerreceptions/${id}/exit`, 
      receivedBy ? JSON.stringify(receivedBy) : null, 
      this.httpOptions
    );
  }

  /**
   * DELETE: Eliminar recepción
   * Endpoint: /api/containerreceptions/{id}
   */
  deleteReception(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(
      `${this.apiUrl}/containerreceptions/${id}`
    );
  }

  // ============================================
  // INSPECCIONES DE CONTENEDORES
  // ============================================

  /**
   * GET: Obtener todas las inspecciones
   * Endpoint: /api/containerreceptions/inspections?receptionId={id}&isApproved={boolean}&dateFrom={date}&dateTo={date}
   */
  getAllInspections(
    receptionId?: number,
    isApproved?: boolean,
    dateFrom?: string,
    dateTo?: string
  ): Observable<ContainerInspectionDto[]> {
    let params = new HttpParams();
    
    if (receptionId) {
      params = params.set('receptionId', receptionId.toString());
    }
    if (isApproved !== undefined) {
      params = params.set('isApproved', isApproved.toString());
    }
    if (dateFrom) {
      params = params.set('dateFrom', dateFrom);
    }
    if (dateTo) {
      params = params.set('dateTo', dateTo);
    }
    
    return this.http.get<ContainerInspectionDto[]>(
      `${this.apiUrl}/containerreceptions/inspections`, 
      { params }
    );
  }

  /**
   * GET: Obtener inspección por ID
   * Endpoint: /api/containerreceptions/inspections/{id}
   */
  getInspectionById(id: number): Observable<ContainerInspectionDto> {
    return this.http.get<ContainerInspectionDto>(
      `${this.apiUrl}/containerreceptions/inspections/${id}`
    );
  }

  /**
   * GET: Obtener inspección por recepción
   */
  getInspectionByReception(receptionId: number): Observable<ContainerInspectionDto | null> {
    return this.http.get<ContainerInspectionDto>(
      `${this.apiUrl}/containerreceptions/inspections?receptionId=${receptionId}`
    );
  }

  /**
   * POST: Crear nueva inspección
   * Endpoint: /api/containerreceptions/inspections
   */
  createInspection(inspection: CreateContainerInspectionDto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.apiUrl}/containerreceptions/inspections`, 
      inspection, 
      this.httpOptions
    );
  }

  /**
   * PUT: Actualizar inspección
   * Endpoint: /api/containerreceptions/inspections/{id}
   */
  updateInspection(id: number, inspection: UpdateContainerInspectionDto): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(
      `${this.apiUrl}/containerreceptions/inspections/${id}`, 
      inspection, 
      this.httpOptions
    );
  }

  /**
   * DELETE: Eliminar inspección
   * Endpoint: /api/containerreceptions/inspections/{id}
   */
  deleteInspection(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(
      `${this.apiUrl}/containerreceptions/inspections/${id}`
    );
  }

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  /**
   * GET: Obtener estadísticas de recepciones
   * Endpoint: /api/containerreceptions/stats/summary
   */
  getStatistics(): Observable<ReceptionStatsDto> {
    return this.http.get<ReceptionStatsDto>(
      `${this.apiUrl}/containerreceptions/stats/summary`
    );
  }

  // ============================================
  // MÉTODOS AUXILIARES Y UTILIDADES
  // ============================================

  /**
   * Formatear fecha para input type="date"
   */
  formatDateForInput(date: Date | string): string {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  /**
   * Formatear fecha para visualización
   */
  formatDateForDisplay(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Formatear hora para visualización
   */
  formatTimeForDisplay(timeString: string): string {
    if (!timeString) return '--:--';
    // timeString viene como "HH:mm:ss" o formato ISO
    const time = timeString.includes('T') 
      ? new Date(timeString).toTimeString().substring(0, 5)
      : timeString.substring(0, 5);
    return time;
  }

  /**
   * Calcular duración de estadía en formato legible
   */
  calculateDuration(entryDate: string, entryTime: string, exitTime?: string): string {
    // .NET devuelve entryDate como "2026-03-08T00:00:00" y entryTime como "13:05:00"
    // Se extrae solo YYYY-MM-DD para evitar doble T al concatenar
    const datePart = entryDate ? entryDate.substring(0, 10) : '';
    const timePart = entryTime ? entryTime.substring(0, 8) : '00:00:00';

    const entry = new Date(`${datePart}T${timePart}`);
    if (isNaN(entry.getTime())) return '—';

    if (!exitTime) {
      const diffMs = new Date().getTime() - entry.getTime();
      return this.formatDuration(diffMs);
    }

    const exitPart = exitTime.substring(0, 8);
    const exit = new Date(`${datePart}T${exitPart}`);
    if (isNaN(exit.getTime())) return '—';

    const diffMs = exit.getTime() - entry.getTime();
    return this.formatDuration(diffMs);
  }

  private formatDuration(milliseconds: number): string {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours === 0) return `${minutes} min`;
    if (minutes === 0) return `${hours} h`;
    return `${hours} h ${minutes} min`;
  }

  /**
   * Obtener clase CSS según estado de recepción
   */
  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'EN_PROCESO': 'badge badge-warning',
      'APROBADO': 'badge badge-success',
      'RECHAZADO': 'badge badge-danger',
      'COMPLETADO': 'badge badge-info'
    };
    return classes[status] || 'badge badge-secondary';
  }

  /**
   * Obtener texto legible del estado
   */
  getStatusText(status: string): string {
    const texts: { [key: string]: string } = {
      'EN_PROCESO': 'En Proceso',
      'APROBADO': 'Aprobado',
      'RECHAZADO': 'Rechazado',
      'COMPLETADO': 'Completado'
    };
    return texts[status] || status;
  }

  /**
   * Obtener clase CSS según condición de inspección
   */
  getConditionClass(condition?: string): string {
    const classes: { [key: string]: string } = {
      'BUENO': 'text-success',
      'MALO': 'text-danger',
      'REGULAR': 'text-warning'
    };
    return classes[condition || ''] || 'text-secondary';
  }

  /**
   * Validar número de contenedor (formato ISO 6346)
   * 4 letras + 7 dígitos (ej: MSNU6544146)
   */
  isValidContainerNumber(number: string): boolean {
    if (!number) return true; // Opcional
    const pattern = /^[A-Z]{4}[0-9]{7}$/;
    return pattern.test(number.toUpperCase().trim());
  }

  /**
   * Formatear número de contenedor
   */
  formatContainerNumber(number: string): string {
    return number.toUpperCase().trim().replace(/\s+/g, '');
  }

  /**
   * Validar placa ecuatoriana
   */
  isValidEcuadorianPlate(plate: string): boolean {
    const pattern = /^[A-Z]{3}[0-9]{4}$/;
    return pattern.test(plate.toUpperCase().trim());
  }

  /**
   * Formatear placa
   */
  formatPlate(plate: string): string {
    return plate.toUpperCase().trim().replace(/\s+/g, '');
  }

  /**
   * Validar cédula ecuatoriana (10 dígitos)
   */
  isValidEcuadorianIdCard(idCard: string): boolean {
    const pattern = /^[0-9]{10}$/;
    return pattern.test(idCard.trim());
  }

  /**
   * Verificar si una recepción puede ser editada
   */
  canEditReception(reception: ContainerReceptionDto): { canEdit: boolean; reason?: string } {
    if (reception.receptionStatus === 'COMPLETADO') {
      return { canEdit: false, reason: 'No se puede editar una recepción completada' };
    }
    return { canEdit: true };
  }

  /**
   * Verificar si una recepción puede ser eliminada
   */
  canDeleteReception(reception: ContainerReceptionDto): { canDelete: boolean; reason?: string } {
    if (reception.hasInspection) {
      return { canDelete: false, reason: 'Elimine primero la inspección asociada' };
    }
    if (reception.receptionStatus === 'COMPLETADO') {
      return { canDelete: false, reason: 'No se puede eliminar una recepción completada' };
    }
    return { canDelete: true };
  }

  /**
   * Verificar si se puede registrar salida
   */
  canRegisterExit(reception: ContainerReceptionDto): { canExit: boolean; reason?: string } {
    if (reception.exitTime) {
      return { canExit: false, reason: 'La salida ya fue registrada' };
    }
    // EN_PROCESO también puede registrar salida (inspección es opcional)
    if (reception.receptionStatus === 'RECHAZADO') {
      return { canExit: false, reason: 'No se puede registrar salida de un contenedor rechazado' };
    }
    if (reception.receptionStatus === 'COMPLETADO') {
      return { canExit: false, reason: 'La recepción ya está completada' };
    }
    return { canExit: true };
  }

  /**
   * Agrupar recepciones por estado
   */
  groupReceptionsByStatus(receptions: ContainerReceptionDto[]): Map<string, ContainerReceptionDto[]> {
    const groups = new Map<string, ContainerReceptionDto[]>();
    
    receptions.forEach(reception => {
      const status = reception.receptionStatus;
      if (!groups.has(status)) {
        groups.set(status, []);
      }
      groups.get(status)?.push(reception);
    });
    
    return groups;
  }

  /**
   * Agrupar recepciones por empresa
   */
  groupReceptionsByCompany(receptions: ContainerReceptionDto[]): Map<string, ContainerReceptionDto[]> {
    const groups = new Map<string, ContainerReceptionDto[]>();
    
    receptions.forEach(reception => {
      const company = reception.companyName;
      if (!groups.has(company)) {
        groups.set(company, []);
      }
      groups.get(company)?.push(reception);
    });
    
    return groups;
  }

  /**
   * Filtrar recepciones por término de búsqueda
   */
  searchReceptions(receptions: ContainerReceptionDto[], searchTerm: string): ContainerReceptionDto[] {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return receptions;
    
    return receptions.filter(r => 
      r.containerNumber?.toLowerCase().includes(term) ||
      r.blNumber?.toLowerCase().includes(term) ||
      r.plateNumber.toLowerCase().includes(term) ||
      r.driverName.toLowerCase().includes(term) ||
      r.companyName.toLowerCase().includes(term)
    );
  }

  /**
   * Ordenar recepciones por fecha (más recientes primero)
   */
  sortReceptionsByDate(receptions: ContainerReceptionDto[]): ContainerReceptionDto[] {
    return [...receptions].sort((a, b) => {
      const dateA = new Date(`${a.entryDate}T${a.entryTime}`);
      const dateB = new Date(`${b.entryDate}T${b.entryTime}`);
      return dateB.getTime() - dateA.getTime();
    });
  }

  /**
   * Generar reporte de recepción en formato texto
   */
  generateReceptionReport(reception: ContainerReceptionDetailDto): string {
    let report = `REPORTE DE RECEPCIÓN DE CONTENEDOR\n`;
    report += `==================================\n\n`;
    report += `ID Recepción: ${reception.receptionId}\n`;
    report += `Fecha: ${this.formatDateForDisplay(reception.entryDate)}\n`;
    report += `Hora Entrada: ${this.formatTimeForDisplay(reception.entryTime)}\n`;
    report += `Hora Salida: ${reception.exitTime ? this.formatTimeForDisplay(reception.exitTime) : 'Pendiente'}\n`;
    report += `Duración: ${this.calculateDuration(reception.entryDate, reception.entryTime, reception.exitTime)}\n\n`;
    
    report += `EMPRESA DE TRANSPORTE\n`;
    report += `---------------------\n`;
    report += `Nombre: ${reception.companyName}\n`;
    report += `Placa: ${reception.plateNumber}\n\n`;
    
    report += `CONDUCTOR\n`;
    report += `---------\n`;
    report += `Nombre: ${reception.driverName}\n`;
    report += `Cédula: ${reception.driverIdCard}\n\n`;
    
    report += `CONTENEDOR\n`;
    report += `----------\n`;
    report += `Número: ${reception.containerNumber || 'N/A'}\n`;
    report += `Tipo: ${reception.containerType || 'N/A'}\n`;
    report += `Sello: ${reception.sealNumber || 'N/A'}\n`;
    report += `B/L: ${reception.blNumber || 'N/A'}\n\n`;
    
    report += `ESTADO: ${this.getStatusText(reception.receptionStatus)}\n\n`;
    
    if (reception.inspection) {
      const insp = reception.inspection;
      report += `INSPECCIÓN\n`;
      report += `----------\n`;
      report += `Condición General: ${insp.overallCondition || 'N/A'}\n`;
      report += `Aprobado: ${insp.isApproved ? 'Sí' : 'No'}\n`;
      report += `Inspeccionado por: ${insp.inspectedBy || 'N/A'}\n`;
      report += `Fecha Inspección: ${this.formatDateForDisplay(insp.inspectionDate)}\n`;
      
      if (insp.rejectionReason) {
        report += `Motivo Rechazo: ${insp.rejectionReason}\n`;
      }
    }
    
    if (reception.generalObservations) {
      report += `\nOBSERVACIONES\n`;
      report += `-------------\n`;
      report += `${reception.generalObservations}\n`;
    }
    
    return report;
  }

  /**
   * Exportar recepciones a CSV
   */
  exportReceptionsToCsv(receptions: ContainerReceptionDto[]): string {
    let csv = 'ID,Fecha,Hora Entrada,Hora Salida,Empresa,Conductor,Placa,Contenedor,Tipo,Sello,B/L,Estado,Observaciones\n';
    
    receptions.forEach(r => {
      csv += `${r.receptionId},${r.entryDate},${r.entryTime},${r.exitTime || ''},`;
      csv += `"${r.companyName}","${r.driverName}",${r.plateNumber},`;
      csv += `${r.containerNumber || ''},${r.containerType || ''},${r.sealNumber || ''},${r.blNumber || ''},`;
      csv += `${r.receptionStatus},"${r.generalObservations || ''}"\n`;
    });
    
    return csv;
  }

  /**
   * Crear objeto de recepción rápida con valores por defecto
   */
  createQuickReception(
    companyId: number,
    driverId: number,
    unitId: number,
    containerNumber?: string
  ): CreateContainerReceptionDto {
    const now = new Date();
    return {
      companyId,
      driverId,
      unitId,
      containerNumber: containerNumber ? this.formatContainerNumber(containerNumber) : undefined,
      entryDate: now.toISOString().split('T')[0],
      entryTime: now.toTimeString().substring(0, 5)
    };
  }

  /**
   * Crear objeto de inspección vacío
   */
  createEmptyInspection(receptionId: number): CreateContainerInspectionDto {
    return {
      receptionId,
      overallCondition: 'BUENO',
      trailerBaseCondition: 'BUENO',
      doorsCondition: 'BUENO',
      rightWallCondition: 'BUENO',
      roofCondition: 'BUENO',
      frontWallCondition: 'BUENO',
      leftWallCondition: 'BUENO',
      floorCondition: 'BUENO',
      lockMechanismOk: true,
      sealPullTestOk: true,
      sealTwistTestOk: true,
      sealCondition: 'BUENO',
      isApproved: true
    };
  }

  // ============================================
  // FIND-OR-CREATE: Conductor y Unidad
  // ============================================

  /**
   * POST: Busca conductor por cédula/nombre dentro de la empresa.
   * Si no existe, lo crea automáticamente.
   * Endpoint: /api/containerreceptions/drivers/find-or-create
   */
  findOrCreateDriver(
    companyId: number,
    fullName: string,
    idCard?: string
  ): Observable<FindOrCreateResponse> {
    const body: FindOrCreateDriverDto = { companyId, fullName, idCard };
    return this.http.post<FindOrCreateResponse>(
      `${this.apiUrl}/containerreceptions/drivers/find-or-create`,
      body,
      this.httpOptions
    );
  }

  /**
   * POST: Busca unidad por placa.
   * Si no existe, la crea asociada a la empresa indicada.
   * Endpoint: /api/containerreceptions/units/find-or-create
   */
  findOrCreateUnit(
    companyId: number,
    plateNumber: string
  ): Observable<FindOrCreateResponse> {
    const body: FindOrCreateUnitDto = { companyId, plateNumber };
    return this.http.post<FindOrCreateResponse>(
      `${this.apiUrl}/containerreceptions/units/find-or-create`,
      body,
      this.httpOptions
    );
  }

}