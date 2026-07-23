import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// ============================================
// INTERFACES PARA CHECKLIST DE ENSAMBLAJE SKD
// ============================================

export interface ChecklistEnsamblajeDto {
  id: number;
  fecha: string;
  modelo: string;
  numeroVin: string;
  observaciones?: string;
  createdAt: string;
  updatedAt?: string;
  porcentajeAvance: number;
  tareasCompletadas: number;
  totalTareas: number;
}

export interface CreateChecklistEnsamblajeDto {
  fecha: string;
  modelo: string;
  numeroVin: string;
  observaciones?: string;
}

export interface UpdateChecklistEnsamblajeDto {
  fecha?: string;
  modelo?: string;
  numeroVin?: string;
  observaciones?: string;
}

export interface ChecklistListDto {
  id: number;
  fecha: string;
  modelo: string;
  numeroVin: string;
  porcentajeAvance: number;
  tareasCompletadas: number;
  totalTareas: number;
  createdAt: string;
  observaciones:string;
}

export interface RegistroCumplimientoDto {
  id: number;
  tareaId: number;
  grupo: string;
  descripcionTarea: string;
  ordenTarea: number;
  completado: boolean;
  observaciones?: string;
  realizadoPor?: string;
  fechaRealizacion?: string;
}

export interface UpdateRegistroCumplimientoDto {
  completado: boolean;
  observaciones?: string;
  realizadoPor?: string;
}

export interface ChecklistDetailDto extends ChecklistEnsamblajeDto {
  registros: RegistroCumplimientoDto[];
}

export interface GrupoTrabajoDto {
  id: number;
  nombre: string;
  tareas: TareaDto[];
}

export interface TareaDto {
  id: number;
  descripcion: string;
  orden: number;
}

export interface ProgresoGrupoDto {
  grupo: string;
  totalTareas: number;
  completadas: number;
  porcentaje: number;
}

export interface ChecklistStatisticsDto {
  totalChecklists: number;
  recentChecklists: number;
  totalTareasRegistradas: number;
  tareasCompletadas: number;
  tareasPendientes: number;
  porcentajeGlobal: number;
  totalModelos: number;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  id?: number;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ChecklistEnsamblajeService {
  private apiUrl = 'https://bodega.vehicentro.com:1830/api/api';
  
  // Headers para POST/PUT (con Content-Type + ngrok bypass)
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type'              : 'application/json',
      'ngrok-skip-browser-warning': 'true'
    })
  };

  // Headers para GET (solo ngrok bypass — sin Content-Type)
  private getOptions = {
    headers: new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    })
  };

  constructor(private http: HttpClient) { }

  getApiUrl(): string {
    return this.apiUrl;
  }

  // ============================================
  // CHECKLIST ENSAMBLAJE ENDPOINTS
  // ============================================

  /**
   * GET: Obtener todos los checklists con filtros opcionales
   * Endpoint: /api/checklistensamblaje?modelo={modelo}&numeroVin={vin}&dateFrom={date}&dateTo={date}
   */
  getAllChecklists(
    modelo?: string,
    numeroVin?: string,
    dateFrom?: string,
    dateTo?: string
  ): Observable<ChecklistListDto[]> {
    let params = new HttpParams();
    
    if (modelo) {
      params = params.set('modelo', modelo);
    }
    if (numeroVin) {
      params = params.set('numeroVin', numeroVin);
    }
    if (dateFrom) {
      params = params.set('dateFrom', dateFrom);
    }
    if (dateTo) {
      params = params.set('dateTo', dateTo);
    }
    
    return this.http.get<ChecklistListDto[]>(`${this.apiUrl}/checklistensamblaje`, { params, headers: this.getOptions.headers });
  }

  /**
   * GET: Obtener checklist por ID
   * Endpoint: /api/checklistensamblaje/{id}
   */
  getChecklistById(id: number): Observable<ChecklistEnsamblajeDto> {
    return this.http.get<ChecklistEnsamblajeDto>(`${this.apiUrl}/checklistensamblaje/${id}`, this.getOptions);
  }

  /**
   * GET: Obtener checklist con detalle de tareas
   * Endpoint: /api/checklistensamblaje/{id}/detail
   */
  getChecklistDetail(id: number): Observable<ChecklistDetailDto> {
    return this.http.get<ChecklistDetailDto>(`${this.apiUrl}/checklistensamblaje/${id}/detail`, this.getOptions);
  }

  /**
   * GET: Buscar checklist por VIN
   * Endpoint: /api/checklistensamblaje/search/{numeroVin}
   */
  searchChecklistByVin(numeroVin: string): Observable<ChecklistListDto[]> {
    return this.http.get<ChecklistListDto[]>(`${this.apiUrl}/checklistensamblaje/search/${encodeURIComponent(numeroVin)}`, this.getOptions);
  }

  /**
   * POST: Crear nuevo checklist
   * Endpoint: /api/checklistensamblaje
   */
  createChecklist(checklist: CreateChecklistEnsamblajeDto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/checklistensamblaje`, checklist, this.httpOptions);
  }

  /**
   * PUT: Actualizar checklist
   * Endpoint: /api/checklistensamblaje/{id}
   */
  updateChecklist(id: number, checklist: UpdateChecklistEnsamblajeDto): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/checklistensamblaje/${id}`, checklist, this.httpOptions);
  }

  /**
   * PUT: Actualizar registro de cumplimiento (marcar tarea como completada/pendiente)
   * Endpoint: /api/checklistensamblaje/{checklistId}/tareas/{tareaId}
   */
  updateRegistroCumplimiento(
    checklistId: number, 
    tareaId: number, 
    registro: UpdateRegistroCumplimientoDto
  ): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(
      `${this.apiUrl}/checklistensamblaje/${checklistId}/tareas/${tareaId}`, 
      registro, 
      this.httpOptions
    );
  }

  /**
   * DELETE: Eliminar checklist
   * Endpoint: /api/checklistensamblaje/{id}
   */
  deleteChecklist(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/checklistensamblaje/${id}`);
  }

  /**
   * GET: Obtener catálogo de tareas disponibles (grupos y tareas)
   * Endpoint: /api/checklistensamblaje/catalogo/tareas
   */
  getCatalogoTareas(): Observable<GrupoTrabajoDto[]> {
    return this.http.get<GrupoTrabajoDto[]>(`${this.apiUrl}/checklistensamblaje/catalogo/tareas`, this.getOptions);
  }

  /**
   * GET: Obtener estadísticas de ensamblaje
   * Endpoint: /api/checklistensamblaje/stats/summary
   */
  getStatistics(): Observable<ChecklistStatisticsDto> {
    return this.http.get<ChecklistStatisticsDto>(`${this.apiUrl}/checklistensamblaje/stats/summary`, this.getOptions);
  }

  /**
   * GET: Obtener progreso por grupo para un checklist
   * Endpoint: /api/checklistensamblaje/{id}/progreso-grupos
   */
  getProgresoPorGrupo(id: number): Observable<ProgresoGrupoDto[]> {
    return this.http.get<ProgresoGrupoDto[]>(`${this.apiUrl}/ChecklistEnsamblaje/${id}/progreso-grupos`, this.getOptions);
  }

  // ============================================
  // MÉTODOS AUXILIARES
  // ============================================

  /**
   * Calcular porcentaje de avance formateado
   */
  getPorcentajeFormateado(porcentaje: number): string {
    return `${porcentaje.toFixed(2)}%`;
  }

  /**
   * Obtener clase CSS según el porcentaje de avance
   */
  getProgressClass(porcentaje: number): string {
    if (porcentaje === 0) return 'bg-secondary';
    if (porcentaje < 25) return 'bg-danger';
    if (porcentaje < 50) return 'bg-warning';
    if (porcentaje < 75) return 'bg-info';
    if (porcentaje < 100) return 'bg-primary';
    return 'bg-success';
  }

  /**
   * Obtener texto de estado según el porcentaje de avance
   */
  getStatusText(porcentaje: number): string {
    if (porcentaje === 0) return 'Sin iniciar';
    if (porcentaje < 25) return 'Iniciado';
    if (porcentaje < 50) return 'En progreso';
    if (porcentaje < 75) return 'Avanzado';
    if (porcentaje < 100) return 'Casi completo';
    return 'Completado';
  }

  /**
   * Validar formato de VIN (17 caracteres alfanuméricos, sin I, O, Q)
   */
  isValidVin(vin: string): boolean {
    const pattern = /^[A-HJ-NPR-Z0-9]{17}$/;
    return pattern.test(vin.toUpperCase().trim());
  }

  /**
   * Formatear VIN (mayúsculas, sin espacios)
   */
  formatVin(vin: string): string {
    return vin.toUpperCase().trim().replace(/\s+/g, '');
  }

  /**
   * Agrupar registros por grupo de trabajo
   */
  agruparRegistrosPorGrupo(registros: RegistroCumplimientoDto[]): Map<string, RegistroCumplimientoDto[]> {
    const grupos = new Map<string, RegistroCumplimientoDto[]>();
    
    registros.forEach(registro => {
      const grupo = registro.grupo;
      if (!grupos.has(grupo)) {
        grupos.set(grupo, []);
      }
      grupos.get(grupo)?.push(registro);
    });
    
    return grupos;
  }

  /**
   * Calcular estadísticas de un checklist
   */
  calcularEstadisticasChecklist(registros: RegistroCumplimientoDto[]): {
    total: number;
    completadas: number;
    pendientes: number;
    porcentaje: number;
  } {
    const total = registros.length;
    const completadas = registros.filter(r => r.completado).length;
    const pendientes = total - completadas;
    const porcentaje = total > 0 ? Math.round((completadas / total) * 100 * 100) / 100 : 0;
    
    return { total, completadas, pendientes, porcentaje };
  }

  /**
   * Verificar si todas las tareas de un grupo están completadas
   */
  isGrupoCompletado(registros: RegistroCumplimientoDto[], grupo: string): boolean {
    const tareasGrupo = registros.filter(r => r.grupo === grupo);
    return tareasGrupo.length > 0 && tareasGrupo.every(r => r.completado);
  }

  /**
   * Obtener resumen de grupos completados
   */
  getGruposCompletados(registros: RegistroCumplimientoDto[]): string[] {
    const grupos = [...new Set(registros.map(r => r.grupo))];
    return grupos.filter(grupo => this.isGrupoCompletado(registros, grupo));
  }

  /**
   * Filtrar checklists por estado de completitud
   */
  filterChecklistsByStatus(
    checklists: ChecklistListDto[], 
    status: 'pending' | 'in-progress' | 'completed'
  ): ChecklistListDto[] {
    return checklists.filter(c => {
      if (status === 'pending') return c.porcentajeAvance === 0;
      if (status === 'completed') return c.porcentajeAvance === 100;
      return c.porcentajeAvance > 0 && c.porcentajeAvance < 100;
    });
  }

  /**
   * Ordenar checklists por fecha (más recientes primero)
   */
  sortChecklistsByDate(checklists: ChecklistListDto[]): ChecklistListDto[] {
    return [...checklists].sort((a, b) => {
      return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
    });
  }

  /**
   * Ordenar checklists por porcentaje de avance
   */
  sortChecklistsByProgress(checklists: ChecklistListDto[], ascending: boolean = false): ChecklistListDto[] {
    return [...checklists].sort((a, b) => {
      return ascending 
        ? a.porcentajeAvance - b.porcentajeAvance
        : b.porcentajeAvance - a.porcentajeAvance;
    });
  }

  /**
   * Buscar checklists en lista por término (modelo, VIN)
   */
  searchChecklistsInList(checklists: ChecklistListDto[], searchTerm: string): ChecklistListDto[] {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return checklists;
    
    return checklists.filter(c => 
      c.modelo.toLowerCase().includes(term) ||
      c.numeroVin.toLowerCase().includes(term)
    );
  }

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
   * Generar reporte de progreso en formato texto
   */
  generarReporteProgreso(checklist: ChecklistDetailDto): string {
    let reporte = `REPORTE DE ENSAMBLAJE SKD\n`;
    reporte += `========================\n\n`;
    reporte += `VIN: ${checklist.numeroVin}\n`;
    reporte += `Modelo: ${checklist.modelo}\n`;
    reporte += `Fecha: ${this.formatDateForDisplay(checklist.fecha)}\n`;
    reporte += `Avance: ${this.getPorcentajeFormateado(checklist.porcentajeAvance)}\n\n`;
    
    const grupos = this.agruparRegistrosPorGrupo(checklist.registros);
    
    grupos.forEach((registros, nombreGrupo) => {
      const stats = this.calcularEstadisticasChecklist(registros);
      reporte += `\n${nombreGrupo}:\n`;
      reporte += `- Completado: ${stats.completadas}/${stats.total} (${stats.porcentaje}%)\n`;
      
      registros.forEach(r => {
        const estado = r.completado ? '✓' : '○';
        reporte += `  ${estado} ${r.descripcionTarea}\n`;
        if (r.realizadoPor) {
          reporte += `     Realizado por: ${r.realizadoPor}\n`;
        }
      });
    });
    
    return reporte;
  }

  /**
   * Exportar datos de checklist a CSV
   */
  exportToCsv(checklist: ChecklistDetailDto): string {
    let csv = 'Grupo,Tarea,Completado,Realizado Por,Fecha Realización,Observaciones\n';
    
    checklist.registros.forEach(r => {
      csv += `"${r.grupo}","${r.descripcionTarea}",${r.completado ? 'Sí' : 'No'},"${r.realizadoPor || ''}","${r.fechaRealizacion || ''}","${r.observaciones || ''}"\n`;
    });
    
    return csv;
  }

  /**
   * Validar si se puede eliminar un checklist
   */
  canDeleteChecklist(checklist: ChecklistListDto): { canDelete: boolean; reason?: string } {
    if (checklist.porcentajeAvance > 0) {
      return { 
        canDelete: false, 
        reason: 'No se puede eliminar un checklist que ya tiene tareas completadas' 
      };
    }
    return { canDelete: true };
  }

  /**
   * Obtener tiempo estimado restante (simulado basado en promedio)
   */
  getTiempoEstimadoRestante(porcentajeActual: number, tiempoTotalEstimadoHoras: number = 8): number {
    if (porcentajeActual >= 100) return 0;
    const tiempoTranscurrido = (porcentajeActual / 100) * tiempoTotalEstimadoHoras;
    return Math.max(0, tiempoTotalEstimadoHoras - tiempoTranscurrido);
  }
}