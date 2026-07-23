import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, Subject, interval } from 'rxjs';
import { takeUntil, startWith } from 'rxjs/operators';
import { ChecklistStatisticsDto, ChecklistListDto, ChecklistEnsamblajeService } from 'src/app/services/checklist-ensamblaje.service';
import { ReceptionStatsDto, ContainerReceptionDto, ContainerReceptionService } from 'src/app/services/container-reception.service';
import { BlStatisticsDto, BlVehiculosListDto, VehiculosImportService } from 'src/app/services/vehiculos-import.service';
import { VentasbdcService, TransitoItem, ApiResponseTransito } from 'src/app/services/ventasbdc.service';

// ─── Modelo interno del pipeline ────────────────────────────────────
export interface PipelineStage {
  id: string;
  label: string;
  sublabel: string;
  icon: string;
  count: number;
  pending: number;
  completed: number;
  color: string;
}

export interface RecentActivity {
  id: string | number;
  type: 'reception' | 'bl' | 'pdi' | 'transito';
  title: string;
  subtitle: string;
  status: string;
  statusColor: string;
  timestamp: string;
  progress?: number;
}

// ─── Modelo interno del tránsito ────────────────────────────────────
export interface TransitoOrdenResumen {
  orden: string;
  contenedores: string;
  unidades: number;
  modelos: number;
  proximaFecha: string | null;   // arribo estimado más cercano de la orden
}

@Component({
  selector: 'app-dashboardvehi',
  templateUrl: './dashboardvehi.component.html',
  styleUrls: ['./dashboardvehi.component.css']
})
export class DashboardvehiComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ── Estado de carga ──────────────────────────────────────────────
  loading = true;
  error: string | null = null;
  lastUpdated: Date = new Date();

  // ── Stats de cada módulo ─────────────────────────────────────────
  receptionStats: ReceptionStatsDto = {
    totalReceptions: 0,
    pendingReceptions: 0,
    completedReceptions: 0,
    todayReceptions: 0,
    weekReceptions: 0,
  };

  blStats: BlStatisticsDto = {
    totalBl: 0,
    recentBl: 0,
    totalContainers: 0,
    totalGrossWeight: 0,
  };

  checklistStats: ChecklistStatisticsDto = {
    totalChecklists: 0,
    recentChecklists: 0,
    totalTareasRegistradas: 0,
    tareasCompletadas: 0,
    tareasPendientes: 0,
    porcentajeGlobal: 0,
    totalModelos: 0,
  };

  // ── Tránsito (BDC) ───────────────────────────────────────────────
  transitoItems: TransitoItem[] = [];
  transitoTotalUnidades = 0;
  transitoTotalRegistros = 0;
  transitoOrdenes: TransitoOrdenResumen[] = [];
  transitoDisponible = true;   // false si el endpoint respondió success=false

  // ── Datos para las tablas ────────────────────────────────────────
  recentReceptions: ContainerReceptionDto[] = [];
  recentBls: BlVehiculosListDto[] = [];
  recentChecklists: ChecklistListDto[] = [];
  recentActivity: RecentActivity[] = [];

  // ── Pipeline visual ──────────────────────────────────────────────
  pipelineStages: PipelineStage[] = [];

  // ── KPIs principales ─────────────────────────────────────────────
  kpis = [
    { label: 'En Tránsito', value: 0, sub: 'Unidades por llegar', icon: '🚚', color: 'kpi-cyan' },
    { label: 'B/L Activos', value: 0, sub: 'Importaciones', icon: '🚢', color: 'kpi-blue' },
    { label: 'Recepciones Hoy', value: 0, sub: 'Contenedores en bodega', icon: '📦', color: 'kpi-amber' },
    { label: 'PDI en Proceso', value: 0, sub: 'Ensamblaje activo', icon: '🔧', color: 'kpi-purple' },
    { label: 'Completados', value: 0, sub: 'Vehículos listos', icon: '✅', color: 'kpi-green' },
  ];

  constructor(
    private receptionService: ContainerReceptionService,
    private vehiculosService: VehiculosImportService,
    private ventasBdcService: VentasbdcService,
    // `protected` para que la plantilla pueda acceder a
    // checklistService.getProgressClass() y checklistService.getStatusText()
    protected checklistService: ChecklistEnsamblajeService,
  ) {}

  ngOnInit(): void {
    // Recarga automática cada 60 segundos
    interval(60_000)
      .pipe(startWith(0), takeUntil(this.destroy$))
      .subscribe(() => this.loadDashboardData());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Carga paralela de todos los datos ──────────────────────────
  loadDashboardData(): void {
    this.loading = true;
    this.error = null;

    forkJoin({
      receptionStats: this.receptionService.getStatistics(),
      recentReceptions: this.receptionService.getAllReceptions(),
      blStats: this.vehiculosService.getBlStatistics(),
      recentBls: this.vehiculosService.getAllBlVehiculos(),
      checklistStats: this.checklistService.getStatistics(),
      recentChecklists: this.checklistService.getAllChecklists(),
      // El service ya maneja errores internamente y devuelve success=false,
      // así que nunca rompe el forkJoin
      transito: this.ventasBdcService.getTransito(),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.receptionStats = data.receptionStats;
          this.recentReceptions = this.receptionService.sortReceptionsByDate(data.recentReceptions).slice(0, 8);

          this.blStats = data.blStats;
          this.recentBls = this.vehiculosService.sortBlByDate(data.recentBls).slice(0, 5);

          this.checklistStats = data.checklistStats;
          this.recentChecklists = this.checklistService.sortChecklistsByDate(data.recentChecklists).slice(0, 8);

          this.procesarTransito(data.transito);

          this.buildPipeline();
          this.buildKpis();
          this.buildRecentActivity();

          this.lastUpdated = new Date();
          this.loading = false;
        },
        error: (err) => {
          console.error('Dashboard load error', err);
          this.error = 'Error al cargar los datos. Reintentando...';
          this.loading = false;
        },
      });
  }

  // ─── Procesa la respuesta del tránsito BDC ──────────────────────
  private procesarTransito(res: ApiResponseTransito): void {
    this.transitoDisponible = res.success;

    if (!res.success) {
      this.transitoItems = [];
      this.transitoTotalUnidades = 0;
      this.transitoTotalRegistros = 0;
      this.transitoOrdenes = [];
      return;
    }

    this.transitoItems = res.datos;
    this.transitoTotalUnidades = res.totalCantidad;
    this.transitoTotalRegistros = res.totalRegistros;

    // Agrupar por orden
    const map = new Map<string, TransitoItem[]>();
    for (const item of res.datos) {
      const key = item.orden || 'SIN ORDEN';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }

    const resumen: TransitoOrdenResumen[] = [];
    map.forEach((filas, orden) => {
      // Fecha de arribo estimado más cercana (>= hoy si existe, sino la más reciente)
      const fechas = filas
        .map(f => f.fecha)
        .filter((f): f is string => !!f)
        .sort();

      const hoy = new Date().toISOString().split('T')[0];
      const futuras = fechas.filter(f => f.substring(0, 10) >= hoy);
      const proximaFecha = futuras.length > 0 ? futuras[0] : (fechas.length > 0 ? fechas[fechas.length - 1] : null);

      resumen.push({
        orden,
        contenedores: filas.find(f => !!f.contenedores)?.contenedores || '',
        unidades: filas.reduce((sum, f) => sum + (f.cantidad || 0), 0),
        modelos: new Set(filas.map(f => f.modelo)).size,
        proximaFecha,
      });
    });

    // Ordenar por próxima fecha ascendente (las que llegan primero, arriba; sin fecha al final)
    this.transitoOrdenes = resumen.sort((a, b) => {
      if (!a.proximaFecha && !b.proximaFecha) return b.unidades - a.unidades;
      if (!a.proximaFecha) return 1;
      if (!b.proximaFecha) return -1;
      return a.proximaFecha.localeCompare(b.proximaFecha);
    });
  }

  // ─── Construye las etapas del pipeline ──────────────────────────
  private buildPipeline(): void {
    // Unidades con fecha estimada ya cumplida vs por llegar
    const hoy = new Date().toISOString().split('T')[0];
    const unidadesArribadas = this.transitoItems
      .filter(i => i.fecha && i.fecha.substring(0, 10) <= hoy)
      .reduce((sum, i) => sum + (i.cantidad || 0), 0);
    const unidadesPorLlegar = this.transitoTotalUnidades - unidadesArribadas;

    this.pipelineStages = [
      {
        id: 'transito',
        label: 'Tránsito',
        sublabel: 'En camino desde origen',
        icon: '🚚',
        count: this.transitoTotalUnidades,
        pending: unidadesPorLlegar,
        completed: unidadesArribadas,
        color: '#06b6d4',
      },
      {
        id: 'bl',
        label: 'Importación',
        sublabel: 'B/L & Contenedores',
        icon: '🚢',
        count: this.blStats.totalBl,
        pending: this.blStats.recentBl,
        completed: this.blStats.totalBl - this.blStats.recentBl,
        color: '#3b82f6',
      },
      {
        id: 'reception',
        label: 'Recepción',
        sublabel: 'Bodega física',
        icon: '📦',
        count: this.receptionStats.totalReceptions,
        pending: this.receptionStats.pendingReceptions,
        completed: this.receptionStats.completedReceptions,
        color: '#f59e0b',
      },
      {
        id: 'pdi',
        label: 'Ensamblaje / PDI',
        sublabel: 'Proceso de prep.',
        icon: '🔧',
        count: this.checklistStats.totalChecklists,
        pending:
          this.checklistStats.totalChecklists -
          Math.round((this.checklistStats.porcentajeGlobal / 100) * this.checklistStats.totalChecklists),
        completed: Math.round(
          (this.checklistStats.porcentajeGlobal / 100) * this.checklistStats.totalChecklists,
        ),
        color: '#8b5cf6',
      },
    ];
  }

  // ─── Construye KPIs con datos reales ────────────────────────────
  private buildKpis(): void {
    this.kpis = [
      {
        label: 'En Tránsito',
        value: this.transitoTotalUnidades,
        sub: `${this.transitoOrdenes.length} órdenes en camino`,
        icon: '🚚',
        color: 'kpi-cyan',
      },
      {
        label: 'B/L Activos',
        value: this.blStats.totalBl,
        sub: `${this.blStats.totalContainers} contenedores`,
        icon: '🚢',
        color: 'kpi-blue',
      },
      {
        label: 'Recepciones Hoy',
        value: this.receptionStats.todayReceptions,
        sub: `${this.receptionStats.pendingReceptions} pendientes`,
        icon: '📦',
        color: 'kpi-amber',
      },
      {
        label: 'PDI en Proceso',
        value: this.checklistStats.totalChecklists,
        sub: `${this.checklistStats.tareasPendientes} tareas pendientes`,
        icon: '🔧',
        color: 'kpi-purple',
      },
      {
        label: 'Completados',
        value:
          this.checklistStats.totalChecklists > 0
            ? Math.round(
                (this.checklistStats.porcentajeGlobal / 100) * this.checklistStats.totalChecklists,
              )
            : 0,
        sub: `${this.checklistStats.porcentajeGlobal.toFixed(1)}% global`,
        icon: '✅',
        color: 'kpi-green',
      },
    ];
  }

  // ─── Construye feed de actividad reciente combinado ──────────────
  private buildRecentActivity(): void {
    const activities: RecentActivity[] = [];

    this.recentReceptions.slice(0, 4).forEach((r) => {
      activities.push({
        id: r.receptionId,
        type: 'reception',
        title: `Recepción #${r.receptionId} — ${r.containerNumber ?? 'Sin N°'}`,
        subtitle: `${r.companyName} · ${r.plateNumber}`,
        status: this.receptionService.getStatusText(r.receptionStatus),
        statusColor: this.receptionService.getStatusClass(r.receptionStatus),
        timestamp: r.entryDate,
      });
    });

    this.recentBls.slice(0, 3).forEach((bl) => {
      activities.push({
        id: bl.id,
        type: 'bl',
        title: `B/L ${bl.blNumber}`,
        subtitle: `${bl.vesselName} · ${bl.portOfLoading} → ${bl.portOfDischarge}`,
        status: `${bl.totalContainers} cont.`,
        statusColor: 'badge-blue',
        timestamp: bl.createdAt,
      });
    });

    this.recentChecklists.slice(0, 4).forEach((c) => {
      activities.push({
        id: c.id,
        type: 'pdi',
        title: `PDI — ${c.modelo}`,
        subtitle: `VIN: ${c.numeroVin}`,
        status: this.checklistService.getStatusText(c.porcentajeAvance),
        statusColor: this.checklistService.getProgressClass(c.porcentajeAvance).replace('bg-', 'badge-'),
        timestamp: c.fecha,
        progress: c.porcentajeAvance,
      });
    });

    // Próximos arribos del tránsito (las 3 órdenes más cercanas con fecha)
    this.transitoOrdenes
      .filter(o => !!o.proximaFecha)
      .slice(0, 3)
      .forEach((o) => {
        activities.push({
          id: o.orden,
          type: 'transito',
          title: `Tránsito — ${o.orden}`,
          subtitle: `${o.unidades} unidades · ${o.modelos} modelo(s)` +
                    (o.contenedores ? ` · ${o.contenedores} cont.` : ''),
          status: this.esArriboProximo(o.proximaFecha!) ? 'Por llegar' : 'En camino',
          statusColor: this.esArriboProximo(o.proximaFecha!) ? 'badge-cyan' : 'badge-gray',
          timestamp: o.proximaFecha!,
        });
      });

    // Ordena por fecha descendente
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    this.recentActivity = activities.slice(0, 10);
  }

  // ─── Helpers de tránsito ─────────────────────────────────────────
  /** true si el arribo estimado está dentro de los próximos 30 días */
  esArriboProximo(fecha: string): boolean {
    const f = new Date(fecha.length === 10 ? fecha + 'T00:00:00' : fecha).getTime();
    const hoy = Date.now();
    const treintaDias = 30 * 24 * 60 * 60 * 1000;
    return f >= hoy - 24 * 60 * 60 * 1000 && f <= hoy + treintaDias;
  }

  /** % de participación de una orden sobre el total en tránsito (para la mini-barra) */
  getPorcentajeOrden(o: TransitoOrdenResumen): number {
    if (this.transitoTotalUnidades <= 0) return 0;
    return (o.unidades / this.transitoTotalUnidades) * 100;
  }

  // ─── Helpers de plantilla ────────────────────────────────────────
  getReceptionStatusClass(status: string): string {
    const map: Record<string, string> = {
      EN_PROCESO: 'badge-amber',
      APROBADO: 'badge-blue',
      RECHAZADO: 'badge-red',
      COMPLETADO: 'badge-green',
    };
    return map[status] ?? 'badge-gray';
  }

  getReceptionStatusLabel(status: string): string {
    const map: Record<string, string> = {
      EN_PROCESO: 'En Proceso',
      APROBADO: 'Aprobado',
      RECHAZADO: 'Rechazado',
      COMPLETADO: 'Completado',
    };
    return map[status] ?? status;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('es-EC', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getActivityIcon(type: string): string {
    return ({ reception: '📦', bl: '🚢', pdi: '🔧', transito: '🚚' } as Record<string, string>)[type] ?? '•';
  }

  trackByIndex(index: number, _item: unknown): number {
    return index;
  }
}