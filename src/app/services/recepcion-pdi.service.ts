import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// ==============================================================
// INTERFACES — RECEPCIÓN PDI (Planta Ensambladora → PDI)
// ==============================================================

export interface RecepcionPdiDto {
  id: number;
  fecha: string;
  numeroVin: string;
  modelo: string;
  color?: string;
  kilometraje?: number;
  estadoGeneral: 'Bueno' | 'Regular' | 'Con Daños';
  chasisOk: boolean;
  modeloCoincide: boolean;
  documentosOk: boolean;
  observaciones?: string;
  recibidoPor?: string;
  entregadoPor?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateRecepcionPdiDto {
  fecha: string;
  numeroVin: string;
  modelo: string;
  color?: string;
  kilometraje?: number;
  estadoGeneral: 'Bueno' | 'Regular' | 'Con Daños';
  chasisOk: boolean;
  modeloCoincide: boolean;
  documentosOk: boolean;
  observaciones?: string;
  recibidoPor?: string;
  entregadoPor?: string;
}

export interface UpdateRecepcionPdiDto {
  fecha?: string;
  numeroVin?: string;
  modelo?: string;
  color?: string;
  kilometraje?: number;
  estadoGeneral?: 'Bueno' | 'Regular' | 'Con Daños';
  chasisOk?: boolean;
  modeloCoincide?: boolean;
  documentosOk?: boolean;
  observaciones?: string;
  recibidoPor?: string;
  entregadoPor?: string;
}

// ==============================================================
// INTERFACES — CHECKLIST PDI (Mecánica + Latonería)
// ==============================================================

export type AreaPdi = 'mecanica' | 'latoneria';

export interface ChecklistPdiDto {
  id: number;
  recepcionId?: number;
  fecha: string;
  modelo: string;
  numeroVin: string;
  kilometraje?: number;
  color?: string;
  concesionario?: string;
  observaciones?: string;
  createdAt: string;
  updatedAt?: string;
  porcentajeAvance: number;
  porcentajeMecanica: number;
  porcentajeLatoneria: number;
  tareasCompletadas: number;
  totalTareas: number;
}

export interface CreateChecklistPdiDto {
  recepcionId?: number;
  fecha: string;
  modelo: string;
  numeroVin: string;
  kilometraje?: number;
  color?: string;
  concesionario?: string;
  observaciones?: string;
}

export interface UpdateChecklistPdiDto {
  recepcionId?: number;
  fecha?: string;
  modelo?: string;
  numeroVin?: string;
  kilometraje?: number;
  color?: string;
  concesionario?: string;
  observaciones?: string;
}

export interface ChecklistPdiListDto {
  id: number;
  recepcionId?: number;
  fecha: string;
  modelo: string;
  numeroVin: string;
  color?: string;
  concesionario?: string;
  observaciones?: string;
  porcentajeAvance: number;
  porcentajeMecanica: number;
  porcentajeLatoneria: number;
  tareasCompletadas: number;
  totalTareas: number;
  createdAt: string;
}

export interface RegistroCumplimientoPdiDto {
  id: number;
  tareaId: number;
  area: AreaPdi;
  grupo: string;
  descripcionTarea: string;
  ordenTarea: number;
  completado: boolean;
  observaciones?: string;
  realizadoPor?: string;
  fechaRealizacion?: string;
}

export interface UpdateRegistroCumplimientoPdiDto {
  completado: boolean;
  observaciones?: string;
  realizadoPor?: string;
}

export interface ChecklistPdiDetailDto extends ChecklistPdiDto {
  registros: RegistroCumplimientoPdiDto[];
}

export interface GrupoPdiDto {
  id: number;
  nombre: string;
  area: AreaPdi;
  tareas: TareaPdiDto[];
}

export interface TareaPdiDto {
  id: number;
  descripcion: string;
  orden: number;
}

export interface ProgresoGrupoPdiDto {
  area: AreaPdi;
  grupo: string;
  totalTareas: number;
  completadas: number;
  porcentaje: number;
}

export interface ChecklistPdiStatisticsDto {
  totalChecklists: number;
  recentChecklists: number;
  totalTareasRegistradas: number;
  tareasCompletadas: number;
  tareasPendientes: number;
  porcentajeGlobal: number;
  porcentajeMecanica: number;
  porcentajeLatoneria: number;
  totalModelos: number;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  id?: number;
  data?: any;
}

// ==============================================================
// SERVICE — RECEPCIÓN PDI
// ==============================================================

@Injectable({ providedIn: 'root' })
export class RecepcionPdiService {
  private apiUrl = 'https://bodega.vehicentro.com:1830/api/api';

  private httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * GET /api/recepcionpdi
   * Listado de recepciones con filtros opcionales
   */
  getAll(
    numeroVin?: string,
    modelo?: string,
    dateFrom?: string,
    dateTo?: string
  ): Observable<RecepcionPdiDto[]> {
    let params = new HttpParams();
    if (numeroVin) params = params.set('numeroVin', numeroVin);
    if (modelo)    params = params.set('modelo',    modelo);
    if (dateFrom)  params = params.set('dateFrom',  dateFrom);
    if (dateTo)    params = params.set('dateTo',    dateTo);
    return this.http.get<RecepcionPdiDto[]>(`${this.apiUrl}/recepcionpdi`, { params });
  }

  /**
   * GET /api/recepcionpdi/{id}
   */
  getById(id: number): Observable<RecepcionPdiDto> {
    return this.http.get<RecepcionPdiDto>(`${this.apiUrl}/recepcionpdi/${id}`);
  }

  /**
   * POST /api/recepcionpdi
   * Registrar recepción de vehículo desde planta
   */
  create(dto: CreateRecepcionPdiDto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/recepcionpdi`, dto, this.httpOptions);
  }

  /**
   * PUT /api/recepcionpdi/{id}
   */
  update(id: number, dto: UpdateRecepcionPdiDto): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/recepcionpdi/${id}`, dto, this.httpOptions);
  }

  /**
   * DELETE /api/recepcionpdi/{id}
   */
  delete(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/recepcionpdi/${id}`);
  }

  // ── Helpers Recepción ────────────────────────────────────────

  /** Clase CSS Badge según estado general */
  getEstadoBadgeClass(estado: string): string {
    switch (estado) {
      case 'Bueno':     return 'badge bg-success';
      case 'Regular':   return 'badge bg-warning text-dark';
      case 'Con Daños': return 'badge bg-danger';
      default:          return 'badge bg-secondary';
    }
  }

  /** Calcular porcentaje de verificaciones aprobadas en recepción */
  getPorcentajeRecepcion(r: RecepcionPdiDto): number {
    const checks = [r.chasisOk, r.modeloCoincide, r.documentosOk];
    const ok = checks.filter(Boolean).length;
    return Math.round((ok / checks.length) * 100);
  }

  /** Verificar si la recepción está completa (todos los checks ok) */
  isRecepcionCompleta(r: RecepcionPdiDto): boolean {
    return r.chasisOk && r.modeloCoincide && r.documentosOk;
  }
}

// ==============================================================
// SERVICE — CHECKLIST PDI (Mecánica + Latonería)
// ==============================================================

@Injectable({ providedIn: 'root' })
export class ChecklistPdiService {
  private apiUrl = 'https://bodega.vehicentro.com:1830/api/api';

  private httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  // ── CRUD Checklist ───────────────────────────────────────────

  /**
   * GET /api/checklistpdi
   * Listado con porcentajes globales, mecánica y latonería
   */
  getAllChecklists(
    modelo?: string,
    numeroVin?: string,
    concesionario?: string,
    dateFrom?: string,
    dateTo?: string
  ): Observable<ChecklistPdiListDto[]> {
    let params = new HttpParams();
    if (modelo)        params = params.set('modelo',        modelo);
    if (numeroVin)     params = params.set('numeroVin',     numeroVin);
    if (concesionario) params = params.set('concesionario', concesionario);
    if (dateFrom)      params = params.set('dateFrom',      dateFrom);
    if (dateTo)        params = params.set('dateTo',        dateTo);
    return this.http.get<ChecklistPdiListDto[]>(`${this.apiUrl}/checklistpdi`, { params });
  }

  /**
   * GET /api/checklistpdi/{id}
   */
  getChecklistById(id: number): Observable<ChecklistPdiDto> {
    return this.http.get<ChecklistPdiDto>(`${this.apiUrl}/checklistpdi/${id}`);
  }

  /**
   * GET /api/checklistpdi/{id}/detail
   * Retorna todos los registros con campo `area` (mecanica|latoneria)
   */
  getChecklistDetail(id: number): Observable<ChecklistPdiDetailDto> {
    return this.http.get<ChecklistPdiDetailDto>(`${this.apiUrl}/checklistpdi/${id}/detail`);
  }

  /**
   * GET /api/checklistpdi/search/{vin}
   */
  searchByVin(numeroVin: string): Observable<ChecklistPdiListDto[]> {
    return this.http.get<ChecklistPdiListDto[]>(
      `${this.apiUrl}/checklistpdi/search/${encodeURIComponent(numeroVin)}`
    );
  }

  /**
   * POST /api/checklistpdi
   * Crea el checklist y genera automáticamente todos los registros
   * (mecánica + latonería)
   */
  createChecklist(dto: CreateChecklistPdiDto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/checklistpdi`, dto, this.httpOptions);
  }

  /**
   * PUT /api/checklistpdi/{id}
   */
  updateChecklist(id: number, dto: UpdateChecklistPdiDto): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/checklistpdi/${id}`, dto, this.httpOptions);
  }

  /**
   * PUT /api/checklistpdi/{checklistId}/tareas/{tareaId}
   * Marcar tarea como completada o pendiente
   */
  updateTarea(
    checklistId: number,
    tareaId: number,
    registro: UpdateRegistroCumplimientoPdiDto
  ): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(
      `${this.apiUrl}/checklistpdi/${checklistId}/tareas/${tareaId}`,
      registro,
      this.httpOptions
    );
  }

  /**
   * DELETE /api/checklistpdi/{id}
   */
  deleteChecklist(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/checklistpdi/${id}`);
  }

  // ── Catálogo y estadísticas ──────────────────────────────────

  /**
   * GET /api/checklistpdi/catalogo/tareas?area=mecanica|latoneria
   * Pasar area=undefined para obtener ambas áreas
   */
  getCatalogoTareas(area?: AreaPdi): Observable<GrupoPdiDto[]> {
    let params = new HttpParams();
    if (area) params = params.set('area', area);
    return this.http.get<GrupoPdiDto[]>(`${this.apiUrl}/checklistpdi/catalogo/tareas`, { params });
  }

  /**
   * GET /api/checklistpdi/stats/summary
   */
  getStatistics(): Observable<ChecklistPdiStatisticsDto> {
    return this.http.get<ChecklistPdiStatisticsDto>(`${this.apiUrl}/checklistpdi/stats/summary`);
  }

  /**
   * GET /api/checklistpdi/{id}/progreso-grupos
   * Progreso por grupo agrupado por área
   */
  getProgresoPorGrupo(id: number): Observable<ProgresoGrupoPdiDto[]> {
    return this.http.get<ProgresoGrupoPdiDto[]>(`${this.apiUrl}/checklistpdi/${id}/progreso-grupos`);
  }

  // ── Helpers generales ────────────────────────────────────────

  /** Porcentaje con 2 decimales */
  getPorcentajeFormateado(pct: number): string {
    return `${pct.toFixed(2)}%`;
  }

  /** Clase CSS Bootstrap para barra de progreso */
  getProgressClass(pct: number): string {
    if (pct === 0)   return 'bg-secondary';
    if (pct < 25)    return 'bg-danger';
    if (pct < 50)    return 'bg-warning';
    if (pct < 75)    return 'bg-info';
    if (pct < 100)   return 'bg-primary';
    return 'bg-success';
  }

  /** Texto de estado */
  getStatusText(pct: number): string {
    if (pct === 0)   return 'Sin iniciar';
    if (pct < 25)    return 'Iniciado';
    if (pct < 50)    return 'En progreso';
    if (pct < 75)    return 'Avanzado';
    if (pct < 100)   return 'Casi completo';
    return 'Aprobado';
  }

  /** Validar VIN */
  isValidVin(vin: string): boolean {
    return /^[A-HJ-NPR-Z0-9]{17}$/.test(vin.toUpperCase().trim());
  }

  /** Formatear VIN */
  formatVin(vin: string): string {
    return vin.toUpperCase().trim().replace(/\s+/g, '');
  }

  // ── Helpers por área ─────────────────────────────────────────

  /** Filtrar registros por área */
  getRegistrosPorArea(
    registros: RegistroCumplimientoPdiDto[],
    area: AreaPdi
  ): RegistroCumplimientoPdiDto[] {
    return registros.filter(r => r.area === area);
  }

  /** Agrupar registros por grupo dentro de un área */
  agruparPorGrupo(
    registros: RegistroCumplimientoPdiDto[]
  ): Map<string, RegistroCumplimientoPdiDto[]> {
    const mapa = new Map<string, RegistroCumplimientoPdiDto[]>();
    registros.forEach(r => {
      if (!mapa.has(r.grupo)) mapa.set(r.grupo, []);
      mapa.get(r.grupo)!.push(r);
    });
    return mapa;
  }

  /** Calcular estadísticas de un subconjunto de registros */
  calcularEstadisticas(registros: RegistroCumplimientoPdiDto[]): {
    total: number; completadas: number; pendientes: number; porcentaje: number;
  } {
    const total       = registros.length;
    const completadas = registros.filter(r => r.completado).length;
    return {
      total,
      completadas,
      pendientes: total - completadas,
      porcentaje: total > 0 ? Math.round((completadas / total) * 10000) / 100 : 0
    };
  }

  /** Progreso por área (mecánica y latonería) de un detalle */
  getProgresoPorArea(detail: ChecklistPdiDetailDto): {
    mecanica: { total: number; completadas: number; porcentaje: number };
    latoneria: { total: number; completadas: number; porcentaje: number };
  } {
    const mec = this.calcularEstadisticas(this.getRegistrosPorArea(detail.registros, 'mecanica'));
    const lat = this.calcularEstadisticas(this.getRegistrosPorArea(detail.registros, 'latoneria'));
    return {
      mecanica:  { total: mec.total, completadas: mec.completadas, porcentaje: mec.porcentaje },
      latoneria: { total: lat.total, completadas: lat.completadas, porcentaje: lat.porcentaje }
    };
  }

  /** Verificar si un grupo completo está aprobado */
  isGrupoAprobado(registros: RegistroCumplimientoPdiDto[], grupo: string): boolean {
    const tareas = registros.filter(r => r.grupo === grupo);
    return tareas.length > 0 && tareas.every(r => r.completado);
  }

  // ── Filtros y ordenamiento ───────────────────────────────────

  filterByStatus(
    checklists: ChecklistPdiListDto[],
    status: 'pending' | 'in-progress' | 'completed'
  ): ChecklistPdiListDto[] {
    return checklists.filter(c => {
      if (status === 'pending')   return c.porcentajeAvance === 0;
      if (status === 'completed') return c.porcentajeAvance === 100;
      return c.porcentajeAvance > 0 && c.porcentajeAvance < 100;
    });
  }

  sortByDate(checklists: ChecklistPdiListDto[]): ChecklistPdiListDto[] {
    return [...checklists].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
  }

  searchInList(checklists: ChecklistPdiListDto[], term: string): ChecklistPdiListDto[] {
    const t = term.toLowerCase().trim();
    if (!t) return checklists;
    return checklists.filter(c =>
      c.modelo.toLowerCase().includes(t)               ||
      c.numeroVin.toLowerCase().includes(t)            ||
      (c.concesionario?.toLowerCase().includes(t) ?? false)
    );
  }

  // ── Fechas ───────────────────────────────────────────────────

  formatDateForInput(date: Date | string): string {
    return new Date(date).toISOString().split('T')[0];
  }

  formatDateForDisplay(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  // ── Exportación ──────────────────────────────────────────────

  /** Genera reporte de texto plano dividido por área */
  generarReporte(checklist: ChecklistPdiDetailDto): string {
    const areas: AreaPdi[] = ['mecanica', 'latoneria'];
    const labelArea = { mecanica: 'MECÁNICA', latoneria: 'LATONERÍA' };

    let reporte = `REPORTE PDI — PRE-DELIVERY INSPECTION\n`;
    reporte    += `======================================\n\n`;
    reporte    += `VIN:           ${checklist.numeroVin}\n`;
    reporte    += `Modelo:        ${checklist.modelo}\n`;
    reporte    += `Color:         ${checklist.color ?? '—'}\n`;
    reporte    += `Concesionario: ${checklist.concesionario ?? '—'}\n`;
    reporte    += `Kilometraje:   ${checklist.kilometraje ?? '—'} km\n`;
    reporte    += `Fecha:         ${this.formatDateForDisplay(checklist.fecha)}\n`;
    reporte    += `Avance global: ${this.getPorcentajeFormateado(checklist.porcentajeAvance)}\n`;
    reporte    += `  · Mecánica:  ${this.getPorcentajeFormateado(checklist.porcentajeMecanica)}\n`;
    reporte    += `  · Latonería: ${this.getPorcentajeFormateado(checklist.porcentajeLatoneria)}\n\n`;

    areas.forEach(area => {
      const registros = this.getRegistrosPorArea(checklist.registros, area);
      const stats     = this.calcularEstadisticas(registros);
      reporte += `\n━━ ${labelArea[area]} (${stats.completadas}/${stats.total}) ━━\n`;

      const grupos = this.agruparPorGrupo(registros);
      grupos.forEach((items, grupo) => {
        reporte += `\n  ${grupo}:\n`;
        items.forEach(r => {
          reporte += `    ${r.completado ? '✓' : '○'} ${r.descripcionTarea}\n`;
          if (r.realizadoPor)  reporte += `       Inspector: ${r.realizadoPor}\n`;
          if (r.observaciones) reporte += `       Nota: ${r.observaciones}\n`;
        });
      });
    });

    return reporte;
  }

  /** Exportar a CSV con columna de área */
  exportToCsv(checklist: ChecklistPdiDetailDto): string {
    let csv = 'Área,Grupo,Tarea,Completado,Inspector,Fecha Inspección,Observaciones\n';
    checklist.registros.forEach(r => {
      csv += `"${r.area}","${r.grupo}","${r.descripcionTarea}",`;
      csv += `${r.completado ? 'Sí' : 'No'},"${r.realizadoPor ?? ''}","${r.fechaRealizacion ?? ''}","${r.observaciones ?? ''}"\n`;
    });
    return csv;
  }

  /** Verificar si el checklist puede eliminarse */
  canDelete(checklist: ChecklistPdiListDto): { canDelete: boolean; reason?: string } {
    if (checklist.porcentajeAvance > 0)
      return { canDelete: false, reason: 'No se puede eliminar un checklist PDI con tareas completadas' };
    return { canDelete: true };
  }
}