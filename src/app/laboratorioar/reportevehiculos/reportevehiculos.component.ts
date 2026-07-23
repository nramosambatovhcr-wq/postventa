import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { VehiceService } from 'src/app/services/vehice.service';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-reportevehiculos',
  templateUrl: './reportevehiculos.component.html',
  styleUrls: ['./reportevehiculos.component.css']
})
export class ReportevehiculosComponent implements OnInit {

  vehiculos: any[] = [];
  vehiculosFiltrados: any[] = [];

  // Fila expandida para detalle de repuestos
  filaExpandida: number | null = null;

  // Filtros
  filtroBusqueda   = '';
  filtroEstado     = '';
  filtroAsignacion = '';

  // Ordenamiento
  columnaOrden    = '';
  direccionOrden: 'asc' | 'desc' = 'asc';

  hoy = new Date();

  // Dropdown exportar
  showExportMenu = false;

  constructor(
    private vehiceService: VehiceService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarVehiculos();
  }

  // ─────────────────────────────────────────────────────
  // DROPDOWN EXPORTAR
  // ─────────────────────────────────────────────────────

  toggleExportMenu(event: Event): void {
    event.stopPropagation();
    this.showExportMenu = !this.showExportMenu;
  }

  @HostListener('document:click')
  cerrarExportMenu(): void {
    this.showExportMenu = false;
  }

  // ─────────────────────────────────────────────────────
  // CARGA DE DATOS
  // ─────────────────────────────────────────────────────

  cargarVehiculos(): void {
    this.vehiceService.getReporteRepuestosPorVehiculo().subscribe({
      next: (res: any) => {
        const raw = res.data ?? [];

        this.vehiculos = raw.map((v: any) => {
          // Parsear detalleRepuestos si viene como string JSON
          if (typeof v.detalleRepuestos === 'string') {
            try { v.detalleRepuestos = JSON.parse(v.detalleRepuestos); }
            catch { v.detalleRepuestos = []; }
          }
          v.detalleRepuestos = v.detalleRepuestos ?? [];

          // Normalizar números que Postgres puede devolver como string
          v.totalRepuestos        = Number(v.totalRepuestos)        || 0;
          v.repuestosRevisados    = Number(v.repuestosRevisados)    || 0;
          v.repuestosPendientes   = Number(v.repuestosPendientes)   || 0;
          v.cantidadTotalRepuestos= Number(v.cantidadTotalRepuestos)|| 0;
          v.duracionMinutos       = Number(v.duracionMinutos)       || 0;
          v.tiempoRevisionRepuestosMinutos = Number(v.tiempoRevisionRepuestosMinutos) || 0;

          return v;
        });

        this.vehiculosFiltrados = [...this.vehiculos];
      },
      error: (err) => console.error('Error cargando reporte:', err)
    });
  }

  // ─────────────────────────────────────────────────────
  // TARJETAS RESUMEN
  // ─────────────────────────────────────────────────────

  get vehiculosAsignados(): number {
    return this.vehiculos.filter(v => !!v.asignadoPor).length;
  }

  get vehiculosEnRevision(): number {
    return this.vehiculos.filter(v =>
      v.revisionId && !this.esCompletado(v.estadoRevision)
    ).length;
  }

  get vehiculosCompletados(): number {
    return this.vehiculos.filter(v => this.esCompletado(v.estadoRevision)).length;
  }

  get vehiculosSinRevision(): number {
    return this.vehiculos.filter(v => !v.revisionId).length;
  }

  get totalRepuestosGlobal(): number {
    return this.vehiculos.reduce((acc, v) => acc + v.totalRepuestos, 0);
  }

  get totalRevisadosGlobal(): number {
    return this.vehiculos.reduce((acc, v) => acc + v.repuestosRevisados, 0);
  }

  private esCompletado(estado: string): boolean {
    if (!estado) return false;
    const e = estado.toLowerCase();
    return e.includes('complet') || e.includes('finaliz') || e.includes('terminad');
  }

  // ─────────────────────────────────────────────────────
  // FILA EXPANDIBLE (detalle de repuestos)
  // ─────────────────────────────────────────────────────

  toggleFila(vehiculoId: number): void {
    this.filaExpandida = this.filaExpandida === vehiculoId ? null : vehiculoId;
  }

  // ─────────────────────────────────────────────────────
  // FILTROS
  // ─────────────────────────────────────────────────────

  aplicarFiltros(): void {
    let resultado = [...this.vehiculos];

    if (this.filtroBusqueda.trim()) {
      const q = this.filtroBusqueda.toLowerCase();
      resultado = resultado.filter(v =>
        v.linea?.toLowerCase().includes(q)         ||
        v.modelo?.toLowerCase().includes(q)        ||
        v.chasis?.toLowerCase().includes(q)        ||
        v.asignadoPor?.toLowerCase().includes(q)
      );
    }

    if (this.filtroEstado) {
      resultado = resultado.filter(v => {
        if (this.filtroEstado === 'sin_revision') return !v.revisionId;
        if (this.filtroEstado === 'completado')   return this.esCompletado(v.estadoRevision);
        if (this.filtroEstado === 'en_proceso')   return v.revisionId && !this.esCompletado(v.estadoRevision);
        return true;
      });
    }

    if (this.filtroAsignacion) {
      resultado = resultado.filter(v => {
        if (this.filtroAsignacion === 'asignado')    return !!v.asignadoPor;
        if (this.filtroAsignacion === 'sin_asignar') return !v.asignadoPor;
        return true;
      });
    }

    if (this.columnaOrden) {
      resultado = this.sortData(resultado);
    }

    this.vehiculosFiltrados = resultado;
    this.filaExpandida = null;
  }

  limpiarFiltros(): void {
    this.filtroBusqueda   = '';
    this.filtroEstado     = '';
    this.filtroAsignacion = '';
    this.columnaOrden     = '';
    this.filaExpandida    = null;
    this.vehiculosFiltrados = [...this.vehiculos];
  }

  // ─────────────────────────────────────────────────────
  // ORDENAMIENTO
  // ─────────────────────────────────────────────────────

  ordenarPor(columna: string): void {
    if (this.columnaOrden === columna) {
      this.direccionOrden = this.direccionOrden === 'asc' ? 'desc' : 'asc';
    } else {
      this.columnaOrden   = columna;
      this.direccionOrden = 'asc';
    }
    this.aplicarFiltros();
  }

  private sortData(data: any[]): any[] {
    return [...data].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (this.columnaOrden) {
        case 'linea':
          valA = `${a.linea} ${a.modelo}`;
          valB = `${b.linea} ${b.modelo}`;
          break;
        case 'usuario':
          valA = a.asignadoPor ?? '';
          valB = b.asignadoPor ?? '';
          break;
        case 'fechaAsignacion':
          valA = a.fechaAsignacion ? new Date(a.fechaAsignacion).getTime() : 0;
          valB = b.fechaAsignacion ? new Date(b.fechaAsignacion).getTime() : 0;
          break;
        case 'fechaInicio':
          valA = a.fechaInicio ? new Date(a.fechaInicio).getTime() : 0;
          valB = b.fechaInicio ? new Date(b.fechaInicio).getTime() : 0;
          break;
        case 'duracion':
          valA = a.duracionMinutos ?? 0;
          valB = b.duracionMinutos ?? 0;
          break;
        case 'estado':
          valA = this.getEstadoLabel(a);
          valB = this.getEstadoLabel(b);
          break;
        case 'repuestosRevisados':
          valA = a.repuestosRevisados ?? 0;
          valB = b.repuestosRevisados ?? 0;
          break;
        case 'totalRepuestos':
          valA = a.totalRepuestos ?? 0;
          valB = b.totalRepuestos ?? 0;
          break;
        case 'primeraFechaRepuesto':
          valA = a.primeraFechaRepuesto ? new Date(a.primeraFechaRepuesto).getTime() : 0;
          valB = b.primeraFechaRepuesto ? new Date(b.primeraFechaRepuesto).getTime() : 0;
          break;
        case 'ultimaFechaRepuesto':
          valA = a.ultimaFechaRepuesto ? new Date(a.ultimaFechaRepuesto).getTime() : 0;
          valB = b.ultimaFechaRepuesto ? new Date(b.ultimaFechaRepuesto).getTime() : 0;
          break;
        case 'tiempoRevisionRepuestos':
          valA = a.tiempoRevisionRepuestosMinutos ?? 0;
          valB = b.tiempoRevisionRepuestosMinutos ?? 0;
          break;
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return this.direccionOrden === 'asc' ? valA - valB : valB - valA;
      }
      return this.direccionOrden === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }

  getSortIcon(columna: string): string {
    if (this.columnaOrden !== columna) return '↕';
    return this.direccionOrden === 'asc' ? '↑' : '↓';
  }

  // ─────────────────────────────────────────────────────
  // HELPERS DE REPUESTOS
  // ─────────────────────────────────────────────────────

  getPorcentaje(revisados: number, total: number): number {
    if (!total) return 0;
    return Math.round((revisados / total) * 100);
  }

  getColorBarra(porcentaje: number): string {
    if (porcentaje >= 100) return 'barra-completa';
    if (porcentaje >= 50)  return 'barra-parcial';
    return 'barra-baja';
  }

  // ─────────────────────────────────────────────────────
  // HELPERS DE INICIALES
  // ─────────────────────────────────────────────────────

  getIniciales(nombre: string): string {
    if (!nombre) return '?';
    const partes = nombre.trim().split(' ');
    if (partes.length >= 2) {
      return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return nombre.substring(0, 2).toUpperCase();
  }

  // ─────────────────────────────────────────────────────
  // HELPERS DE DURACIÓN
  // ─────────────────────────────────────────────────────

  calcularDuracion(fechaInicio: string, fechaFin: string): string {
    if (!fechaInicio || !fechaFin) return '—';
    const inicio = new Date(fechaInicio);
    const fin    = new Date(fechaFin);
    return this.formatearDuracion(fin.getTime() - inicio.getTime());
  }

  calcularDuracionHastaHoy(fechaInicio: string): string {
    if (!fechaInicio) return '—';
    const inicio = new Date(fechaInicio);
    return this.formatearDuracion(new Date().getTime() - inicio.getTime());
  }

  private formatearDuracion(ms: number): string {
    if (ms < 0) return '—';
    const minutos = Math.floor(ms / 60000);
    const horas   = Math.floor(minutos / 60);
    const dias    = Math.floor(horas / 24);

    if (dias > 0) {
      const horasRestantes = horas % 24;
      return horasRestantes > 0 ? `${dias}d ${horasRestantes}h` : `${dias}d`;
    }
    if (horas > 0) {
      const minutosRestantes = minutos % 60;
      return minutosRestantes > 0 ? `${horas}h ${minutosRestantes}min` : `${horas}h`;
    }
    return `${minutos}min`;
  }

  // ─────────────────────────────────────────────────────
  // HELPERS DE TIEMPO DE REPUESTOS
  // ─────────────────────────────────────────────────────

  formatearTiempoRepuestos(tiempoIntervalo: string | null, minutos: number | null): string {
    if (minutos !== null && minutos !== undefined && minutos > 0) {
      return this.formatearDuracionDesdeMinutos(minutos);
    }
    
    if (tiempoIntervalo) {
      return this.parsearIntervaloPostgres(tiempoIntervalo);
    }
    
    return '—';
  }

  private formatearDuracionDesdeMinutos(minutosTotales: number): string {
    if (minutosTotales <= 0) return '0 min';
    
    const dias = Math.floor(minutosTotales / 1440);
    const horas = Math.floor((minutosTotales % 1440) / 60);
    const minutos = Math.floor(minutosTotales % 60);
    
    const partes: string[] = [];
    
    if (dias > 0) partes.push(`${dias}d`);
    if (horas > 0) partes.push(`${horas}h`);
    if (minutos > 0 || partes.length === 0) partes.push(`${minutos}min`);
    
    return partes.join(' ');
  }

  private parsearIntervaloPostgres(intervalo: string): string {
    const match = intervalo.match(/^(\d+)\.(\d{2}):(\d{2}):(\d{2})/);
    
    if (!match) return intervalo;
    
    const [, dias, horas, minutos] = match;
    
    const d = parseInt(dias, 10);
    const h = parseInt(horas, 10);
    const m = parseInt(minutos, 10);
    
    const partes: string[] = [];
    if (d > 0) partes.push(`${d}d`);
    if (h > 0) partes.push(`${h}h`);
    if (m > 0 || partes.length === 0) partes.push(`${m}min`);
    
    return partes.join(' ');
  }

  // ─────────────────────────────────────────────────────
  // ESTADO / BADGE
  // ─────────────────────────────────────────────────────

  getEstadoLabel(v: any): string {
    if (!v.revisionId) return 'Sin revisión';
    if (this.esCompletado(v.estadoRevision)) return 'Completado';
    return v.estadoRevision || 'En proceso';
  }

  getBadgeClass(v: any): string {
    if (!v.revisionId) return 'badge-sin-revision';
    if (this.esCompletado(v.estadoRevision)) return 'badge-completado';
    return 'badge-en-proceso';
  }

  // ─────────────────────────────────────────────────────
  // ACCIONES
  // ─────────────────────────────────────────────────────

  volver(): void {
    this.router.navigate(['/asignarvehi']);
  }

  imprimir(): void {
    window.print();
  }

  // ─────────────────────────────────────────────────────
  // EXPORTAR CSV
  // ─────────────────────────────────────────────────────

  exportarCSV(): void {
    const headers = [
      'N°', 'Línea', 'Modelo', 'Chasis',
      'Asignado a', 'Fecha Asignación',
      'Inicio Revisión', 'Fin Revisión', 'Tiempo Revisión',
      'Inicio Repuestos', 'Fin Repuestos', 'Tiempo Repuestos',
      'Total Repuestos', 'Revisados', 'Pendientes', 'Cantidad Total',
      'Estado'
    ];

    const filas = this.vehiculosFiltrados.map((v, i) => {
      const fechaAsig    = v.fechaAsignacion
        ? new Date(v.fechaAsignacion).toLocaleString('es-EC') : '';
      const fechaInicio  = v.fechaInicio
        ? new Date(v.fechaInicio).toLocaleString('es-EC') : '';
      const fechaFin     = v.fechaFin
        ? new Date(v.fechaFin).toLocaleString('es-EC') : '';
      const duracion     = v.revisionId
        ? (v.fechaFin
            ? this.calcularDuracion(v.fechaInicio, v.fechaFin)
            : this.calcularDuracionHastaHoy(v.fechaInicio) + ' (en curso)')
        : '';
      
      const inicioRep = v.primeraFechaRepuesto
        ? new Date(v.primeraFechaRepuesto).toLocaleString('es-EC') : '';
      const finRep = v.ultimaFechaRepuesto
        ? new Date(v.ultimaFechaRepuesto).toLocaleString('es-EC') : '';
      const tiempoRep = v.tiempoRevisionRepuestosMinutos
        ? this.formatearDuracionDesdeMinutos(v.tiempoRevisionRepuestosMinutos)
        : '';

      return [
        i + 1,
        v.linea              ?? '',
        v.modelo             ?? '',
        v.chasis             ?? '',
        v.asignadoPor        ?? '',
        fechaAsig,
        fechaInicio,
        fechaFin,
        duracion,
        inicioRep,
        finRep,
        tiempoRep,
        v.totalRepuestos     ?? 0,
        v.repuestosRevisados ?? 0,
        v.repuestosPendientes?? 0,
        v.cantidadTotalRepuestos ?? 0,
        this.getEstadoLabel(v)
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...filas].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `reporte-vehiculos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // ─────────────────────────────────────────────────────
  // EXPORTAR EXCEL
  // ─────────────────────────────────────────────────────

  exportarExcel(): void {
    const datos = this.vehiculosFiltrados.map((v, i) => ({
      'N°': i + 1,
      'Línea': v.linea ?? '',
      'Modelo': v.modelo ?? '',
      'Chasis': v.chasis ?? '',
      'Asignado a': v.asignadoPor ?? '—',
      'Fecha Asignación': v.fechaAsignacion 
        ? new Date(v.fechaAsignacion).toLocaleString('es-EC') 
        : '—',
      'Inicio Revisión': v.fechaInicio 
        ? new Date(v.fechaInicio).toLocaleString('es-EC') 
        : '—',
      'Fin Revisión': v.fechaFin 
        ? new Date(v.fechaFin).toLocaleString('es-EC') 
        : '—',
      'Tiempo Revisión': v.revisionId
        ? (v.fechaFin
            ? this.calcularDuracion(v.fechaInicio, v.fechaFin)
            : this.calcularDuracionHastaHoy(v.fechaInicio) + ' (en curso)')
        : '—',
      'Inicio Repuestos': v.primeraFechaRepuesto 
        ? new Date(v.primeraFechaRepuesto).toLocaleString('es-EC') 
        : '—',
      'Fin Repuestos': v.ultimaFechaRepuesto 
        ? new Date(v.ultimaFechaRepuesto).toLocaleString('es-EC') 
        : '—',
      'Tiempo Repuestos': v.tiempoRevisionRepuestosMinutos
        ? this.formatearDuracionDesdeMinutos(v.tiempoRevisionRepuestosMinutos)
        : '—',
      'Total Repuestos': v.totalRepuestos ?? 0,
      'Repuestos Revisados': v.repuestosRevisados ?? 0,
      'Repuestos Pendientes': v.repuestosPendientes ?? 0,
      'Cantidad Total Uds.': v.cantidadTotalRepuestos ?? 0,
      '% Avance': v.totalRepuestos > 0 
        ? Math.round((v.repuestosRevisados / v.totalRepuestos) * 100) + '%'
        : '0%',
      'Estado': this.getEstadoLabel(v)
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datos);

    const anchos = [
      { wch: 4 },   // N°
      { wch: 10 },  // Línea
      { wch: 15 },  // Modelo
      { wch: 15 },  // Chasis
      { wch: 18 },  // Asignado a
      { wch: 20 },  // Fecha Asignación
      { wch: 20 },  // Inicio Revisión
      { wch: 20 },  // Fin Revisión
      { wch: 15 },  // Tiempo Revisión
      { wch: 20 },  // Inicio Repuestos
      { wch: 20 },  // Fin Repuestos
      { wch: 15 },  // Tiempo Repuestos
      { wch: 12 },  // Total Repuestos
      { wch: 14 },  // Repuestos Revisados
      { wch: 15 },  // Repuestos Pendientes
      { wch: 16 },  // Cantidad Total Uds.
      { wch: 10 },  // % Avance
      { wch: 15 },  // Estado
    ];
    ws['!cols'] = anchos;

    // Estilos para encabezados
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws[address]) continue;
      
      ws[address].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '1A1F2E' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };
    }

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte Vehículos');

    const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob: Blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' 
    });
    
    const fecha = new Date().toISOString().slice(0, 10);
    saveAs(blob, `reporte-vehiculos-${fecha}.xlsx`);
  }

  // ─────────────────────────────────────────────────────
  // EXPORTAR EXCEL CON DETALLE
  // ─────────────────────────────────────────────────────

  exportarExcelConDetalle(): void {
    const wb: XLSX.WorkBook = XLSX.utils.book_new();

    // Hoja 1: Resumen
    const datosResumen = this.vehiculosFiltrados.map((v, i) => ({
      'N°': i + 1,
      'Línea': v.linea ?? '',
      'Modelo': v.modelo ?? '',
      'Chasis': v.chasis ?? '',
      'Asignado a': v.asignadoPor ?? '—',
      'Fecha Asignación': v.fechaAsignacion 
        ? new Date(v.fechaAsignacion).toLocaleString('es-EC') 
        : '—',
      'Inicio Revisión': v.fechaInicio 
        ? new Date(v.fechaInicio).toLocaleString('es-EC') 
        : '—',
      'Fin Revisión': v.fechaFin 
        ? new Date(v.fechaFin).toLocaleString('es-EC') 
        : '—',
      'Tiempo Revisión': v.revisionId
        ? (v.fechaFin
            ? this.calcularDuracion(v.fechaInicio, v.fechaFin)
            : this.calcularDuracionHastaHoy(v.fechaInicio) + ' (en curso)')
        : '—',
      'Inicio Repuestos': v.primeraFechaRepuesto 
        ? new Date(v.primeraFechaRepuesto).toLocaleString('es-EC') 
        : '—',
      'Fin Repuestos': v.ultimaFechaRepuesto 
        ? new Date(v.ultimaFechaRepuesto).toLocaleString('es-EC') 
        : '—',
      'Tiempo Repuestos': v.tiempoRevisionRepuestosMinutos
        ? this.formatearDuracionDesdeMinutos(v.tiempoRevisionRepuestosMinutos)
        : '—',
      'Total Repuestos': v.totalRepuestos ?? 0,
      'Repuestos Revisados': v.repuestosRevisados ?? 0,
      'Repuestos Pendientes': v.repuestosPendientes ?? 0,
      'Estado': this.getEstadoLabel(v)
    }));

    const wsResumen: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosResumen);
    wsResumen['!cols'] = [
      { wch: 4 }, { wch: 10 }, { wch: 15 }, { wch: 15 },
      { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
      { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 },
      { wch: 12 }, { wch: 14 }, { wch: 15 }, { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Vehículos');

    // Hoja 2: Detalle
    const datosDetalle: any[] = [];
    this.vehiculosFiltrados.forEach(v => {
      if (v.detalleRepuestos && v.detalleRepuestos.length > 0) {
        v.detalleRepuestos.forEach((rep: any, idx: number) => {
          datosDetalle.push({
            'Vehículo': `${v.linea} ${v.modelo}`,
            'Chasis': v.chasis,
            'N°': idx + 1,
            'Nombre Repuesto': rep.nombre ?? '—',
            'Código': rep.codigo ?? '—',
            'Cantidad': rep.cantidad ?? 0,
            'Revisado Por': rep.revisadoPor ?? '—',
            'Fecha Revisión': rep.fecha 
              ? new Date(rep.fecha).toLocaleString('es-EC') 
              : '—',
            'Estado': (rep.revisado === 'true' || rep.revisado === true) 
              ? 'Revisado' 
              : 'Pendiente',
            'Observación': rep.observacion ?? '—'
          });
        });
      }
    });

    if (datosDetalle.length > 0) {
      const wsDetalle: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosDetalle);
      wsDetalle['!cols'] = [
        { wch: 20 }, { wch: 15 }, { wch: 4 }, { wch: 25 },
        { wch: 15 }, { wch: 10 }, { wch: 18 }, { wch: 20 },
        { wch: 12 }, { wch: 30 }
      ];
      XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle Repuestos');
    }

    const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob: Blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' 
    });
    
    const fecha = new Date().toISOString().slice(0, 10);
    saveAs(blob, `reporte-vehiculos-completo-${fecha}.xlsx`);
  }
}