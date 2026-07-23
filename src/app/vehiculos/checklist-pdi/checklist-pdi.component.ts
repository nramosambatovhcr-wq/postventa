import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';



import {
  ChecklistEnsamblajeService,
  ChecklistListDto
} from 'src/app/services/checklist-ensamblaje.service';
import {
  VehiculosImportService,
  BlContainerDto,
  BlVehiculosListDto
} from 'src/app/services/vehiculos-import.service';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError, map } from 'rxjs/operators';
import { ChecklistPdiListDto, RecepcionPdiDto, GrupoPdiDto, ChecklistPdiDetailDto, AreaPdi, CreateRecepcionPdiDto, ChecklistPdiService, RecepcionPdiService, CreateChecklistPdiDto, RegistroCumplimientoPdiDto, UpdateRegistroCumplimientoPdiDto } from 'src/app/services/recepcion-pdi.service';

// ============================================================
// INTERFACES LOCALES
// ============================================================

/** Chasis finalizado en ensamblaje listo para PDI */
export interface PdiItem {
  chassisNumber  : string;
  containerNumber: string;
  invoiceNumber  : string;
  blNumber       : string;
  blId           : number;
  ensamblaje?    : ChecklistListDto;
  pdi?           : ChecklistPdiListDto;
  recepcion?     : RecepcionPdiDto;
}

// ============================================================
// COMPONENTE
// ============================================================

@Component({
  selector   : 'app-checklist-pdi',
  templateUrl: './checklist-pdi.component.html',
  styleUrls  : ['./checklist-pdi.component.css']
})
export class ChecklistPdiComponent implements OnInit, OnDestroy {

  @ViewChild('modalRecepcion')  modalRecepcion!: ElementRef;
  @ViewChild('modalNuevoPdi')   modalNuevoPdi!: ElementRef;
  @ViewChild('modalDetallePdi') modalDetallePdi!: ElementRef;
  @ViewChild('modalTareasPdi')  modalTareasPdi!: ElementRef;
  @ViewChild('modalReportePdi') modalReportePdi!: ElementRef;

  // ── Datos ───────────────────────────────────────────────────
  allPdiItems      : PdiItem[]              = [];
  filteredPdiItems : PdiItem[]              = [];
  catalogoPdiTareas: GrupoPdiDto[]          = [];
  allRecepciones   : RecepcionPdiDto[]      = [];

  loadingPdi    = false;
  pdiError: string | null = null;

  selectedPdiItem?      : PdiItem;
  selectedPdiChecklist? : ChecklistPdiDetailDto;
  reportePdiData        : ChecklistPdiDetailDto | null = null;

  // ── Área activa en modal de tareas ──────────────────────────
  areaActiva: AreaPdi = 'mecanica';

  // ── Filtros ─────────────────────────────────────────────────
  pdiSearch        = '';
  pdiFilterBl      = '';
  pdiFilterStatus: 'all' | 'sin-pdi' | 'en-progreso' | 'aprobado' = 'all';

  // ── Contadores tarjetas ─────────────────────────────────────
  totalSinPdi        = 0;
  totalPdiEnProgreso = 0;
  totalPdiAprobados  = 0;

  // ── Formulario Recepción ────────────────────────────────────
  nuevaRecepcion: CreateRecepcionPdiDto = {
    fecha         : '',
    numeroVin     : '',
    modelo        : '',
    color         : '',
    kilometraje   : undefined,
    estadoGeneral : 'Bueno',
    chasisOk      : false,
    modeloCoincide: false,
    documentosOk  : false,
    observaciones : '',
    recibidoPor   : '',
    entregadoPor  : ''
  };

  // ── Formulario Nuevo PDI ────────────────────────────────────
  nuevoPdi = {
    fecha        : '',
    inspector    : '',
    observaciones: '',
    concesionario: '',
    color        : '',
    kilometraje  : undefined as number | undefined
  };

  // ── Estado general UI ───────────────────────────────────────
  loading        = false;
  loadingDetail  = false;
  errorMessage   = '';
  successMessage = '';

  activeModal      : HTMLDivElement | null = null;
  gruposExpandidos : Set<number>           = new Set();

  private destroy$ = new Subject<void>();

  constructor(
    private pdiService       : ChecklistPdiService,
    private recepcionService : RecepcionPdiService,
    private ensamblajeService: ChecklistEnsamblajeService,
    private vehiculosService : VehiculosImportService,
    private el               : ElementRef
  ) {}

  // ============================================================
  // LIFECYCLE
  // ============================================================

  ngOnInit(): void {
    this.nuevoPdi.fecha       = new Date().toISOString().split('T')[0];
    this.nuevaRecepcion.fecha = new Date().toISOString().split('T')[0];
    this.loadCatalogo();
    this.loadAllData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================
  // CARGA DE DATOS
  // ============================================================

  loadAllData(): void {
    this.loadingPdi = true;
    this.pdiError   = null;

    forkJoin({
      bls        : this.vehiculosService.getAllBlVehiculos().pipe(catchError(() => of([] as BlVehiculosListDto[]))),
      ensamblaje : this.ensamblajeService.getAllChecklists().pipe(catchError(() => of([] as ChecklistListDto[]))),
      pdis       : this.pdiService.getAllChecklists().pipe(catchError(() => of([] as ChecklistPdiListDto[]))),
      recepciones: this.recepcionService.getAll().pipe(catchError(() => of([] as RecepcionPdiDto[])))
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe(({ bls, ensamblaje, pdis, recepciones }) => {
      this.allRecepciones = recepciones;
      const finalizados   = ensamblaje.filter(e => e.porcentajeAvance === 100);
      this.buildPdiItems(bls, finalizados, pdis, recepciones);
    });
  }

  private buildPdiItems(
    bls         : BlVehiculosListDto[],
    finalizados : ChecklistListDto[],
    pdis        : ChecklistPdiListDto[],
    recepciones : RecepcionPdiDto[]
  ): void {
    if (bls.length === 0) {
      this.allPdiItems = []; this.filteredPdiItems = [];
      this.loadingPdi  = false; this.recalcularContadores(); return;
    }

    const requests = bls.map(bl =>
      this.vehiculosService.getBlContainers(bl.id).pipe(
        map(data => ({ bl, containers: data.containers || [] })),
        catchError(() => of({ bl, containers: [] as BlContainerDto[] }))
      )
    );

    forkJoin(requests).pipe(takeUntil(this.destroy$)).subscribe({
      next: (results) => {
        const items: PdiItem[] = [];
        results.forEach(({ bl, containers }) => {
          containers.forEach(c => {
            (c.chassisNumbers || []).forEach(num => {
              const ensamblajeCheck = finalizados.find(
                e => e.numeroVin?.toUpperCase() === num.toUpperCase()
              );
              if (!ensamblajeCheck) return;

              items.push({
                chassisNumber  : num,
                containerNumber: c.containerNumber,
                invoiceNumber  : c.invoiceNumber || '',
                blNumber       : bl.blNumber,
                blId           : bl.id,
                ensamblaje     : ensamblajeCheck,
                pdi            : pdis.find(p => p.numeroVin?.toUpperCase() === num.toUpperCase()),
                recepcion      : recepciones.find(r => r.numeroVin?.toUpperCase() === num.toUpperCase())
              });
            });
          });
        });
        this.allPdiItems = items;
        this.loadingPdi  = false;
        this.recalcularContadores();
        this.applyPdiFilters();
      },
      error: () => { this.pdiError = 'Error al cargar los vehículos'; this.loadingPdi = false; }
    });
  }

  loadCatalogo(): void {
    this.pdiService.getCatalogoTareas()
      .pipe(takeUntil(this.destroy$), catchError(() => of([] as GrupoPdiDto[])))
      .subscribe(data => { this.catalogoPdiTareas = data; });
  }

  // ============================================================
  // FILTROS
  // ============================================================

  applyPdiFilters(): void {
    let result = [...this.allPdiItems];
    const q    = this.pdiSearch.toLowerCase().trim();
    if (q) result = result.filter(i =>
      i.chassisNumber.toLowerCase().includes(q) ||
      i.blNumber.toLowerCase().includes(q)      ||
      (i.ensamblaje?.modelo || '').toLowerCase().includes(q)
    );
    if (this.pdiFilterBl.trim())
      result = result.filter(i => i.blNumber.toLowerCase().includes(this.pdiFilterBl.toLowerCase().trim()));
    switch (this.pdiFilterStatus) {
      case 'sin-pdi':     result = result.filter(i => !i.pdi); break;
      case 'en-progreso': result = result.filter(i => i.pdi && i.pdi.porcentajeAvance < 100); break;
      case 'aprobado':    result = result.filter(i => i.pdi?.porcentajeAvance === 100); break;
    }
    this.filteredPdiItems = result;
  }

  clearPdiFilters(): void {
    this.pdiSearch = ''; this.pdiFilterBl = ''; this.pdiFilterStatus = 'all';
    this.applyPdiFilters();
  }

  private recalcularContadores(): void {
    this.totalSinPdi        = this.allPdiItems.filter(i => !i.pdi).length;
    this.totalPdiEnProgreso = this.allPdiItems.filter(i => i.pdi && i.pdi.porcentajeAvance < 100).length;
    this.totalPdiAprobados  = this.allPdiItems.filter(i => i.pdi?.porcentajeAvance === 100).length;
  }

  // ============================================================
  // ACCIÓN PRINCIPAL
  // ============================================================

  accionPdi(item: PdiItem): void {
    this.selectedPdiItem = item;
    if (item.pdi) {
      this.areaActiva = 'mecanica';
      this.openModalTareasPdi(item.pdi);
    } else if (!item.recepcion) {
      this.prepararFormRecepcion(item);
      this.openModal(this.modalRecepcion);
    } else {
      this.prepararFormNuevoPdi(item);
      this.openModal(this.modalNuevoPdi);
    }
  }

  // ============================================================
  // MÓDULO 1 — RECEPCIÓN
  // ============================================================

  private prepararFormRecepcion(item: PdiItem): void {
    this.nuevaRecepcion = {
      fecha         : new Date().toISOString().split('T')[0],
      numeroVin     : item.chassisNumber,
      modelo        : item.ensamblaje?.modelo || '',
      color         : '',
      kilometraje   : undefined,
      estadoGeneral : 'Bueno',
      chasisOk      : false,
      modeloCoincide: false,
      documentosOk  : false,
      observaciones : '',
      recibidoPor   : '',
      entregadoPor  : ''
    };
  }

  guardarRecepcion(): void {
    if (!this.nuevaRecepcion.fecha || !this.nuevaRecepcion.numeroVin) return;
    this.loading = true;
    this.recepcionService.create(this.nuevaRecepcion).subscribe({
      next: () => {
        this.successMessage = '✓ Recepción registrada correctamente';
        this.loading        = false;
        this.closeModal(this.modalRecepcion);
        this.loadAllData();
        if (this.selectedPdiItem) {
          setTimeout(() => {
            this.prepararFormNuevoPdi(this.selectedPdiItem!);
            this.openModal(this.modalNuevoPdi);
          }, 400);
        }
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al registrar la recepción';
        this.loading = false;
      }
    });
  }

  verRecepcion(item: PdiItem): void {
    if (!item.recepcion) return;
    // Mapear a CreateRecepcionPdiDto para mostrar en el mismo formulario
    this.nuevaRecepcion = {
      fecha         : item.recepcion.fecha,
      numeroVin     : item.recepcion.numeroVin,
      modelo        : item.recepcion.modelo,
      color         : item.recepcion.color        || '',
      kilometraje   : item.recepcion.kilometraje,
      estadoGeneral : item.recepcion.estadoGeneral,
      chasisOk      : item.recepcion.chasisOk,
      modeloCoincide: item.recepcion.modeloCoincide,
      documentosOk  : item.recepcion.documentosOk,
      observaciones : item.recepcion.observaciones || '',
      recibidoPor   : item.recepcion.recibidoPor   || '',
      entregadoPor  : item.recepcion.entregadoPor  || ''
    };
    this.openModal(this.modalRecepcion);
  }

  // ============================================================
  // MÓDULO 2 — INICIAR PDI
  // ============================================================

  private prepararFormNuevoPdi(item: PdiItem): void {
    this.nuevoPdi = {
      fecha        : new Date().toISOString().split('T')[0],
      inspector    : '',
      observaciones: '',
      concesionario: '',
      color        : item.recepcion?.color || '',
      kilometraje  : item.recepcion?.kilometraje
    };
  }

  iniciarPdi(): void {
    if (!this.selectedPdiItem || !this.nuevoPdi.fecha) return;
    const dto: CreateChecklistPdiDto = {
      fecha        : this.nuevoPdi.fecha,
      modelo       : this.selectedPdiItem.ensamblaje?.modelo || '',
      numeroVin    : this.selectedPdiItem.chassisNumber,
      color        : this.nuevoPdi.color?.trim()         || undefined,
      concesionario: this.nuevoPdi.concesionario?.trim() || undefined,
      kilometraje  : this.nuevoPdi.kilometraje           || undefined,
      observaciones: this.nuevoPdi.observaciones?.trim() || undefined
    };
    this.loading = true;
    this.pdiService.createChecklist(dto).subscribe({
      next: (response) => {
        this.successMessage = '¡Inspección PDI iniciada!';
        this.closeModal(this.modalNuevoPdi);
        this.loading = false;
        if (response.id) {
          this.loadAllData();
          setTimeout(() => {
            this.pdiService.getChecklistDetail(response.id!).subscribe(cl => {
              this.selectedPdiChecklist = cl;
              this.areaActiva = 'mecanica';
              this.gruposExpandidos.clear();
              this.openModal(this.modalTareasPdi);
            });
          }, 500);
        }
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al iniciar la inspección PDI';
        this.loading = false;
      }
    });
  }

  // ============================================================
  // MODALES DETALLE / TAREAS / REPORTE
  // ============================================================

  openModalDetallePdi(checklist: ChecklistPdiListDto): void {
    this.selectedPdiChecklist = undefined;
    this.loadingDetail = true;
    this.openModal(this.modalDetallePdi);
    this.loadPdiDetail(checklist.id);
  }

  openModalTareasPdi(checklist: ChecklistPdiListDto | any): void {
    this.selectedPdiChecklist = undefined;
    this.loadingDetail = true;
    this.openModal(this.modalTareasPdi);
    this.loadPdiDetail(checklist.id);
  }

  openModalReportePdi(checklist: ChecklistPdiListDto): void {
    this.loadingDetail = true;
    this.pdiService.getChecklistDetail(checklist.id).subscribe({
      next : (data) => { this.reportePdiData = data; this.loadingDetail = false; this.openModal(this.modalReportePdi); },
      error: ()     => { this.errorMessage = 'Error al cargar reporte PDI'; this.loadingDetail = false; }
    });
  }

  private loadPdiDetail(id: number, afterLoad?: () => void): void {
    this.loadingDetail = true;
    this.pdiService.getChecklistDetail(id).subscribe({
      next : (data) => { this.selectedPdiChecklist = data; this.loadingDetail = false; afterLoad?.(); },
      error: ()     => { this.errorMessage = 'Error al cargar detalle PDI'; this.loadingDetail = false; }
    });
  }

  // ============================================================
  // GESTIÓN DE TAREAS
  // ============================================================

  toggleTareaPdi(registro: RegistroCumplimientoPdiDto): void {
    if (!this.selectedPdiChecklist) return;
    const update: UpdateRegistroCumplimientoPdiDto = {
      completado   : !registro.completado,
      observaciones: registro.observaciones || '',
      realizadoPor : registro.realizadoPor  || ''
    };
    this.pdiService.updateTarea(this.selectedPdiChecklist.id, registro.tareaId, update).subscribe({
      next : () => this.loadPdiDetail(this.selectedPdiChecklist!.id),
      error: () => { this.errorMessage = 'Error al actualizar la tarea PDI'; }
    });
  }

  // ── Tabs de área ─────────────────────────────────────────────
  setAreaActiva(area: AreaPdi): void { this.areaActiva = area; this.gruposExpandidos.clear(); }

  getRegistrosArea(area: AreaPdi): RegistroCumplimientoPdiDto[] {
    return (this.selectedPdiChecklist?.registros || []).filter(r => r.area === area);
  }

  getRegistrosAreaReporte(area: AreaPdi): RegistroCumplimientoPdiDto[] {
    return (this.reportePdiData?.registros || []).filter(r => r.area === area);
  }

  // ============================================================
  // ACORDEÓN
  // ============================================================

  toggleGrupo(i: number): void { this.gruposExpandidos.has(i) ? this.gruposExpandidos.delete(i) : this.gruposExpandidos.add(i); }
  isGrupoExpanded(i: number): boolean { return this.gruposExpandidos.has(i); }
  expandirTodos(): void { this.agruparRegistros(this.getRegistrosArea(this.areaActiva)).forEach((_, i) => this.gruposExpandidos.add(i)); }
  colapsarTodos(): void { this.gruposExpandidos.clear(); }

  // ============================================================
  // EXPORTAR / IMPRIMIR
  // ============================================================

  exportarExcelPdi(): void {
    let csv = 'VIN,Modelo,B/L,Contenedor,Recepción,Estado PDI,Avance Global,Mecánica,Latonería,Tareas OK,Total\n';
    this.filteredPdiItems.forEach(i => {
      const recep  = i.recepcion ? `OK (${i.recepcion.estadoGeneral})` : 'Sin registrar';
      const estado = this.getPdiStatusLabel(i);
      csv += `"${i.chassisNumber}","${i.ensamblaje?.modelo || ''}","${i.blNumber}","${i.containerNumber}","${recep}","${estado}","${this.getPorcentajeFormateado(i.pdi?.porcentajeAvance || 0)}","${this.getPorcentajeFormateado(i.pdi?.porcentajeMecanica || 0)}","${this.getPorcentajeFormateado(i.pdi?.porcentajeLatoneria || 0)}",${i.pdi?.tareasCompletadas ?? 0},${i.pdi?.totalTareas ?? 0}\n`;
    });
    this.downloadCsv(csv, `pdi_reporte_${new Date().toISOString().split('T')[0]}.csv`);
  }

  exportarExcelPdiSingle(): void {
    const data = this.reportePdiData || this.selectedPdiChecklist;
    if (!data) return;
    const blob = new Blob([this.pdiService.exportToCsv(data)], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pdi_${data.numeroVin}_${new Date().toISOString().split('T')[0]}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }

  private downloadCsv(csv: string, filename: string): void {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = filename;
    link.style.visibility = 'hidden';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }

  imprimirReportePdi(): void { window.print(); }

  // ============================================================
  // MODAL HELPERS
  // ============================================================

  openModal(ref: ElementRef | HTMLDivElement): void {
    const el = ref instanceof HTMLDivElement ? ref : (ref as ElementRef).nativeElement as HTMLDivElement;
    if (el.parentElement !== document.body) {
      document.body.appendChild(el);
    }
    el.classList.add('show'); el.style.display = 'flex';
    this.activeModal = el; document.body.classList.add('modal-open');
  }

  closeModal(ref: ElementRef | HTMLDivElement): void {
    const el = ref instanceof HTMLDivElement ? ref : (ref as ElementRef).nativeElement as HTMLDivElement;
    el.classList.remove('show'); el.style.display = 'none';
    this.activeModal = null; document.body.classList.remove('modal-open');
  }

  closeAllModals(): void {
    [this.modalRecepcion, this.modalNuevoPdi, this.modalDetallePdi, this.modalTareasPdi, this.modalReportePdi]
      .forEach(m => { if (m) this.closeModal(m); });
  }

  onKeydown(event: KeyboardEvent): void { if (event.key === 'Escape') this.closeAllModals(); }

  // ============================================================
  // HELPERS TEMPLATE
  // ============================================================

  getTotalTareasCatalogo(): number { return this.catalogoPdiTareas.reduce((t, g) => t + g.tareas.length, 0); }
  getGruposCatalogo(area: AreaPdi): GrupoPdiDto[] { return this.catalogoPdiTareas.filter(g => g.area === area); }
  getTotalTareasCatalogoArea(area: AreaPdi): number { return this.getGruposCatalogo(area).reduce((t, g) => t + g.tareas.length, 0); }

  getPdiStatusClass(item: PdiItem): string {
    if (!item.pdi)                         return 'badge-secondary';
    if (item.pdi.porcentajeAvance === 100) return 'badge-success';
    if (item.pdi.porcentajeAvance > 0)     return 'badge-warning';
    return 'badge-info';
  }

  getPdiStatusLabel(item: PdiItem): string {
    if (!item.pdi)                         return 'Sin PDI';
    if (item.pdi.porcentajeAvance === 100) return 'Aprobado';
    if (item.pdi.porcentajeAvance > 0)     return `En revisión · ${this.getPorcentajeFormateado(item.pdi.porcentajeAvance)}`;
    return 'Iniciado · 0%';
  }

  getRecepcionBadgeClass(item: PdiItem): string {
    if (!item.recepcion) return 'badge-secondary';
    return this.recepcionService.getEstadoBadgeClass(item.recepcion.estadoGeneral)
      .replace('badge ', '').replace('bg-', 'badge-');
  }

  getProgressClass(p: number): string        { return this.pdiService.getProgressClass(p); }
  getStatusText(p: number): string           { return this.pdiService.getStatusText(p); }
  getPorcentajeFormateado(p: number): string { return this.pdiService.getPorcentajeFormateado(p); }
  formatDate(d: string): string              { return this.pdiService.formatDateForDisplay(d); }

  agruparRegistros(registros: RegistroCumplimientoPdiDto[]): [string, RegistroCumplimientoPdiDto[]][] {
    return Array.from(this.pdiService.agruparPorGrupo(registros).entries());
  }

  calcularEstadisticasGrupo(registros: RegistroCumplimientoPdiDto[]) {
    return this.pdiService.calcularEstadisticas(registros);
  }

  calcularEstadisticasArea(area: AreaPdi) {
    return this.pdiService.calcularEstadisticas(
      this.selectedPdiChecklist ? this.getRegistrosArea(area) : []
    );
  }

  calcularEstadisticasAreaReporte(area: AreaPdi) {
    return this.pdiService.calcularEstadisticas(
      this.reportePdiData ? this.getRegistrosAreaReporte(area) : []
    );
  }
}