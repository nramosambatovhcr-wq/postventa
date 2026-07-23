import { Component, OnInit, OnDestroy, ElementRef, ViewChild, ChangeDetectorRef, NgZone } from '@angular/core';
import {
  ChecklistListDto, ChecklistDetailDto, GrupoTrabajoDto, ProgresoGrupoDto,
  CreateChecklistEnsamblajeDto, UpdateChecklistEnsamblajeDto,
  ChecklistEnsamblajeService, RegistroCumplimientoDto, UpdateRegistroCumplimientoDto
} from 'src/app/services/checklist-ensamblaje.service';
import {
  VehiculosImportService, BlContainerDto, BlVehiculosListDto
} from 'src/app/services/vehiculos-import.service';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError, map, finalize } from 'rxjs/operators';

// ============================================
// INTERFACES LOCALES
// ============================================

/** Un chasis extraído de los contenedores, enriquecido con su checklist si ya existe */
export interface ChassisItem {
  chassisNumber  : string;
  containerNumber: string;
  invoiceNumber  : string;
  blNumber       : string;
  blId           : number;
  checklist?     : ChecklistListDto;  // undefined = sin checklist aún
}

// ============================================
// COMPONENTE
// ============================================

@Component({
  selector: 'app-checklist-ensamblaje',
  templateUrl: './checklist-ensamblaje.component.html',
  styleUrls: ['./checklist-ensamblaje.component.css']
})
export class ChecklistEnsamblajeComponent implements OnInit, OnDestroy {

  @ViewChild('modalCrear')           modalCrear!: ElementRef;
  @ViewChild('modalEditar')          modalEditar!: ElementRef;
  @ViewChild('modalEliminar')        modalEliminar!: ElementRef;
  @ViewChild('modalDetalle')         modalDetalle!: ElementRef;
  @ViewChild('modalReporte')         modalReporte!: ElementRef;
  @ViewChild('modalNuevoEnsamblaje') modalNuevoEnsamblaje!: ElementRef;

  // ============================================
  // MODO DE VISTA
  // 'chassis'    → pantalla principal: lista de chasis
  // 'checklists' → vista secundaria: todos los checklists
  // 'tareas'     → página de gestión de tareas (antes era modal)
  // ============================================
  viewMode: 'chassis' | 'checklists' | 'tareas' = 'chassis';
  previousView: 'chassis' | 'checklists' = 'chassis'; // para el botón Volver

  // ---- Vista Chasis (principal) ----
  allChassis      : ChassisItem[] = [];
  filteredChassis : ChassisItem[] = [];
  loadingChassis   = false;
  chassisError: string | null = null;

  chassisSearch         = '';
  chassisFilterBl       = '';
  chassisFilterStatus: 'all' | 'sin-checklist' | 'en-progreso' | 'completado' = 'all';

  selectedChassisItem?: ChassisItem;

  // ---- Datos compartidos ----
  checklists         : ChecklistListDto[]     = [];
  filteredChecklists : ChecklistListDto[]     = [];
  selectedChecklist? : ChecklistDetailDto;
  selectedChecklistSimple?: ChecklistListDto;
  catalogoTareas     : GrupoTrabajoDto[]      = [];
  progresoGrupos     : ProgresoGrupoDto[]     = [];

  // ---- Filtros vista checklists ----
  searchTerm    = '';
  filterModelo  = '';
  filterDateFrom = '';
  filterDateTo  = '';
  filterStatus: 'all' | 'pending' | 'in-progress' | 'completed' = 'all';

  // ---- Formularios ----
  newChecklist: CreateChecklistEnsamblajeDto = {
    fecha: '', modelo: '', numeroVin: '', observaciones: ''
  };
  editChecklistData : UpdateChecklistEnsamblajeDto = {};
  currentEditId = 0;

  nuevoEnsamblaje = {
    fecha: '', modelo: '', modeloPersonalizado: '',
    numeroVin: '', ordenTrabajo: '', responsable: '', observaciones: ''
  };
  vinValido  = false;
  vinMensaje = 'Formato: 17 caracteres alfanuméricos (sin I, O, Q)';

  currentTareaEdit = {
    checklistId: 0, tareaId: 0, completado: false,
    observaciones: '', realizadoPor: ''
  };

  reporteData: any = null;

  // ---- Estado ----
  loading       = false;
  loadingDetail = false;
  errorMessage  = '';
  successMessage = '';

  // ---- Sorting (vista checklists) ----
  sortColumn   : keyof ChecklistListDto = 'fecha';
  sortDirection: 'asc' | 'desc'        = 'desc';

  activeModal      : HTMLDivElement | null = null;
  gruposExpandidos : Set<number>           = new Set();
  tareaEnEdicion   : RegistroCumplimientoDto | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private checklistService : ChecklistEnsamblajeService,
    private vehiculosService : VehiculosImportService,
    private el               : ElementRef,
    private cdr              : ChangeDetectorRef,
    private ngZone           : NgZone
  ) {}

  // ============================================
  // LIFECYCLE
  // ============================================

  ngOnInit(): void {
    this.loadCatalogo();
    this.setDefaultFecha();
    this.loadAllData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================
  // CARGA INICIAL: chasis + checklists en paralelo
  // ============================================

  /** Carga BLs y checklists simultáneamente, luego cruza los datos */
  loadAllData(): void {
    this.loadingChassis = true;
    this.chassisError   = null;

    forkJoin({
      bls       : this.vehiculosService.getAllBlVehiculos().pipe(catchError(() => of([] as BlVehiculosListDto[]))),
      checklists: this.checklistService.getAllChecklists().pipe(catchError(() => of([] as ChecklistListDto[])))
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe(({ bls, checklists }) => {
      this.checklists = checklists;
      this.applyFilters();
      this.loadChassisFromBls(bls);
    });
  }

  /** Llama getBlContainers() por cada BL y extrae los números de chasis */
  private loadChassisFromBls(bls: BlVehiculosListDto[]): void {
    if (bls.length === 0) {
      this.allChassis      = [];
      this.filteredChassis = [];
      this.loadingChassis  = false;
      return;
    }

    const requests = bls.map(bl =>
      this.vehiculosService.getBlContainers(bl.id).pipe(
        map(data => ({ bl, containers: data.containers || [] })),
        catchError(() => of({ bl, containers: [] as BlContainerDto[] }))
      )
    );

    forkJoin(requests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          const items: ChassisItem[] = [];

          results.forEach(({ bl, containers }) => {
            containers.forEach(c => {
              (c.chassisNumbers || []).forEach(num => {
                items.push({
                  chassisNumber  : num,
                  containerNumber: c.containerNumber,
                  invoiceNumber  : c.invoiceNumber || '',
                  blNumber       : bl.blNumber,
                  blId           : bl.id,
                  checklist      : this.findChecklistForChassis(num)
                });
              });
            });
          });

          this.allChassis     = items;
          this.loadingChassis = false;
          this.applyChassisFilters();
        },
        error: () => {
          this.chassisError   = 'Error al cargar los chasis';
          this.loadingChassis = false;
        }
      });
  }

  /** Recarga checklists y re-cruza con la lista de chasis ya cargada */
  loadChecklists(): void {
    this.checklistService.getAllChecklists(
      this.filterModelo    || undefined,
      undefined,
      this.filterDateFrom  || undefined,
      this.filterDateTo    || undefined
    )
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (data) => {
        this.checklists = data;
        this.applyFilters();
        // Actualizar la referencia de checklist en cada chasis
        this.allChassis.forEach(c => {
          c.checklist = this.findChecklistForChassis(c.chassisNumber);
        });
        this.applyChassisFilters();
      },
      error: () => { this.errorMessage = 'Error al cargar los checklists'; }
    });
  }

  loadCatalogo(): void {
    this.checklistService.getCatalogoTareas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.catalogoTareas = data; },
        error: (err)  => { console.error('Error cargando catálogo:', err); }
      });
  }

  loadChecklistDetail(id: number): void {
    this.loadingDetail = true;
    this.checklistService.getChecklistDetail(id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => { this.loadingDetail = false; })
      )
      .subscribe({
        next: (data: any) => {
          // ngZone.run garantiza que Angular detecte los cambios incluso si
          // el observable emite desde fuera de la zona (BehaviorSubject, etc.)
          this.ngZone.run(() => {
            try {
              console.log('Detail recibido:', data);

              // Normalizar posibles wrappers del API
              const detail = data?.data ?? data?.checklist ?? data?.result ?? data;

              // Normalizar nombre del campo registros
              if (!detail.registros) {
                detail.registros =
                  detail.registrosCumplimiento ??
                  detail.items ??
                  detail.tareas ??
                  [];
              }

              // Asegurar que registros sea siempre un arreglo
              if (!Array.isArray(detail.registros)) {
                detail.registros = [];
              }

              this.selectedChecklist = detail;
              this.progresoGrupos    = this.calcularProgresoGruposLocal(detail);
            } catch (err) {
              console.error('Error procesando detalle:', err);
              this.errorMessage = 'Error al procesar los datos del checklist';
            } finally {
              this.loadingDetail = false;
              this.cdr.detectChanges(); // forzar re-render inmediato
              setTimeout(() => this.expandirTodosLosGrupos(), 0);
            }
          });
        },
        error: (err) => {
          console.error('Error HTTP al cargar detalle:', err);
          this.errorMessage = 'Error al cargar el detalle';
        }
      });
  }

  /** Calcula el progreso por grupo a partir de los registros ya cargados — sin llamada extra */
  private calcularProgresoGruposLocal(checklist: ChecklistDetailDto): ProgresoGrupoDto[] {
    if (!checklist?.registros?.length) return [];
    return this.agruparRegistros(checklist.registros).map(([grupo, registros]) => {
      const total       = registros.length;
      const completadas = registros.filter(r => r.completado).length;
      return {
        grupo,
        totalTareas: total,
        completadas,
        porcentaje : total ? Math.round((completadas / total) * 100) : 0
      } as ProgresoGrupoDto;
    });
  }

  private findChecklistForChassis(chassisNumber: string): ChecklistListDto | undefined {
    return this.checklists.find(
      cl => cl.numeroVin.toUpperCase() === chassisNumber.toUpperCase()
    );
  }

  // ============================================
  // NAVEGACIÓN
  // ============================================

  goToView(view: 'chassis' | 'checklists'): void {
    this.viewMode = view;
  }

  // ============================================
  // FILTROS: VISTA CHASIS
  // ============================================

  applyChassisFilters(): void {
    let items = [...this.allChassis];

    const term = this.chassisSearch.toLowerCase().trim();
    if (term) {
      items = items.filter(c =>
        c.chassisNumber.toLowerCase().includes(term)   ||
        c.containerNumber.toLowerCase().includes(term) ||
        c.blNumber.toLowerCase().includes(term)        ||
        c.invoiceNumber.toLowerCase().includes(term)
      );
    }

    if (this.chassisFilterBl.trim()) {
      items = items.filter(c =>
        c.blNumber.toLowerCase().includes(this.chassisFilterBl.toLowerCase())
      );
    }

    if (this.chassisFilterStatus !== 'all') {
      items = items.filter(c => {
        if (this.chassisFilterStatus === 'sin-checklist') return !c.checklist;
        if (this.chassisFilterStatus === 'completado')    return c.checklist?.porcentajeAvance === 100;
        if (this.chassisFilterStatus === 'en-progreso')   return !!c.checklist && c.checklist.porcentajeAvance < 100;
        return true;
      });
    }

    this.filteredChassis = items;
  }

  clearChassisFilters(): void {
    this.chassisSearch       = '';
    this.chassisFilterBl     = '';
    this.chassisFilterStatus = 'all';
    this.applyChassisFilters();
  }

  get totalSinChecklist(): number { return this.allChassis.filter(c => !c.checklist).length; }
  get totalEnProgreso(): number   { return this.allChassis.filter(c => !!c.checklist && c.checklist.porcentajeAvance < 100).length; }
  get totalCompletados(): number  { return this.allChassis.filter(c => c.checklist?.porcentajeAvance === 100).length; }

  // ============================================
  // ACCIÓN PRINCIPAL: Abrir o crear checklist desde un chasis
  // ============================================

  /**
   * Si el chasis ya tiene checklist → abre directamente el modal de tareas.
   * Si NO tiene           → pre-llena el modal de nuevo ensamblaje con el VIN y lo abre.
   */
  accionChasis(item: ChassisItem): void {
    this.selectedChassisItem = item;

    if (item.checklist) {
      this.openModalTareas(item.checklist);
    } else {
      // Pre-llenar con los datos del chasis
      this.nuevoEnsamblaje = {
        fecha              : this.checklistService.formatDateForInput(new Date()),
        modelo             : '',
        modeloPersonalizado: '',
        numeroVin          : item.chassisNumber,
        ordenTrabajo       : '',
        responsable        : '',
        observaciones      : `Contenedor: ${item.containerNumber} | B/L: ${item.blNumber}`
      };
      this.validarVinEnTiempoReal();
      this.errorMessage = '';
      this.openModal(this.modalNuevoEnsamblaje);
    }
  }

  // ============================================
  // FILTROS: VISTA CHECKLISTS
  // ============================================

  applyFilters(): void {
    let result = [...this.checklists];

    if (this.searchTerm) {
      result = this.checklistService.searchChecklistsInList(result, this.searchTerm);
    }
    if (this.filterStatus !== 'all') {
      result = this.checklistService.filterChecklistsByStatus(result, this.filterStatus);
    }

    result.sort((a, b) => {
      let valA: any = a[this.sortColumn];
      let valB: any = b[this.sortColumn];
      if (typeof valA === 'string') { valA = valA.toLowerCase(); valB = (valB as string).toLowerCase(); }
      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ?  1 : -1;
      return 0;
    });

    this.filteredChecklists = result;
  }

  onSearch(): void       { this.applyFilters(); }
  onFilterChange(): void { this.loadChecklists(); }

  clearFilters(): void {
    this.searchTerm = ''; this.filterModelo = '';
    this.filterDateFrom = ''; this.filterDateTo = '';
    this.filterStatus = 'all';
    this.loadChecklists();
  }

  sortBy(column: keyof ChecklistListDto): void {
    this.sortDirection = this.sortColumn === column && this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.sortColumn    = column;
    this.applyFilters();
  }

  // ============================================
  // MODALES
  // ============================================

  openModal(modalRef: ElementRef): void {
    this.closeAllModals();
    const modal = modalRef.nativeElement as HTMLDivElement;
    modal.classList.add('show');

    // Los modales están fuera del :host — Angular no les aplica estilos encapsulados.
    // Aplicamos estilos inline para garantizar el centrado correcto.
    Object.assign(modal.style, {
      display        : 'flex',
      alignItems     : 'flex-start',
      justifyContent : 'center',
      position       : 'fixed',
      top            : '0',
      left           : '0',
      right          : '0',
      bottom         : '0',
      width          : '100vw',
      height         : '100vh',
      zIndex         : '1050',
      padding        : '32px 16px',
      overflowY      : 'auto',
      overflowX      : 'hidden',
      background     : 'rgba(15,23,42,.6)',
      backdropFilter : 'blur(4px)',
      boxSizing      : 'border-box',
    });

    // Aplicar tamaño al dialog hijo según clase del modal contenedor
    const dialog = modal.querySelector('.modal-dialog') as HTMLElement;
    if (dialog) {
      const maxWidth = modal.classList.contains('modal-xl') ? '1100px'
                     : modal.classList.contains('modal-lg') ? '880px'
                     : dialog.classList.contains('modal-sm') ? '420px'
                     : '580px';
      Object.assign(dialog.style, {
        background   : '#ffffff',
        borderRadius : '16px',
        boxShadow    : '0 20px 60px rgba(0,0,0,.25)',
        width        : '100%',
        maxWidth     : maxWidth,
        overflow     : 'hidden',
        margin       : '0 auto',
        flexShrink   : '0',
        position     : 'relative',
      });
    }

    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    this.activeModal = modal;
    modal.addEventListener('click', (e: Event) => { if (e.target === modal) this.closeModal(modalRef); });
  }

  closeModal(modalRef: any): void {
    const modal = modalRef.nativeElement as HTMLDivElement;
    modal.classList.remove('show');
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    this.activeModal = null;
  }

  closeAllModals(): void {
    [this.modalCrear, this.modalEditar, this.modalEliminar,
     this.modalDetalle, this.modalReporte,
     this.modalNuevoEnsamblaje].forEach(m => {
      if (m) { m.nativeElement.classList.remove('show'); m.nativeElement.style.display = 'none'; }
    });
    document.body.classList.remove('modal-open');
    this.activeModal = null;
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.closeAllModals();
  }

  // ============================================
  // CREAR CHECKLIST (modal simple)
  // ============================================

  setDefaultFecha(): void {
    this.newChecklist.fecha = this.checklistService.formatDateForInput(new Date());
  }

  openModalCrear(): void {
    this.newChecklist = {
      fecha: this.checklistService.formatDateForInput(new Date()),
      modelo: '', numeroVin: '', observaciones: ''
    };
    this.errorMessage = '';
    this.openModal(this.modalCrear);
  }

  crearChecklist(): void {
    if (!this.validateNewChecklist()) return;
    this.loading = true;
    this.checklistService.createChecklist(this.newChecklist).subscribe({
      next: () => {
        this.successMessage = 'Checklist creado exitosamente';
        this.closeModal(this.modalCrear);
        this.loadChecklists();
        this.loading = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => { this.errorMessage = err.error?.message || 'Error al crear'; this.loading = false; }
    });
  }

  validateNewChecklist(): boolean {
    if (!this.newChecklist.modelo?.trim())    { this.errorMessage = 'El modelo es obligatorio'; return false; }
    if (!this.newChecklist.numeroVin?.trim()) { this.errorMessage = 'El VIN es obligatorio';    return false; }
    if (!this.checklistService.isValidVin(this.newChecklist.numeroVin)) {
      this.errorMessage = 'El formato del VIN no es válido (17 caracteres alfanuméricos)'; return false;
    }
    return true;
  }

  // ============================================
  // NUEVO ENSAMBLAJE (modal completo)
  // ============================================

  openModalNuevoEnsamblaje(): void {
    this.selectedChassisItem = undefined;
    this.nuevoEnsamblaje = {
      fecha: this.checklistService.formatDateForInput(new Date()),
      modelo: '', modeloPersonalizado: '', numeroVin: '',
      ordenTrabajo: '', responsable: '', observaciones: ''
    };
    this.vinValido  = false;
    this.vinMensaje = 'Formato: 17 caracteres alfanuméricos (sin I, O, Q)';
    this.errorMessage = '';
    this.openModal(this.modalNuevoEnsamblaje);
  }

  validarVinEnTiempoReal(): void {
    const vin = this.nuevoEnsamblaje.numeroVin;
    if (!vin)              { this.vinValido = false; this.vinMensaje = 'Formato: 17 caracteres alfanuméricos (sin I, O, Q)'; return; }
    if (vin.length !== 17) { this.vinValido = false; this.vinMensaje = `Faltan ${17 - vin.length} caracteres`; return; }
    if (this.checklistService.isValidVin(vin)) { this.vinValido = true;  this.vinMensaje = '✓ VIN válido'; }
    else                                        { this.vinValido = false; this.vinMensaje = '✗ Formato inválido (evite I, O, Q)'; }
  }

  generarVinTemporal(): void {
    const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
    let vin = 'TEST';
    for (let i = 0; i < 13; i++) vin += chars.charAt(Math.floor(Math.random() * chars.length));
    this.nuevoEnsamblaje.numeroVin = vin;
    this.validarVinEnTiempoReal();
  }

  validarFormularioEnsamblaje(): boolean {
    const modeloFinal = this.nuevoEnsamblaje.modelo === 'Otro'
      ? this.nuevoEnsamblaje.modeloPersonalizado
      : this.nuevoEnsamblaje.modelo;
    return !!(this.nuevoEnsamblaje.fecha && modeloFinal && this.nuevoEnsamblaje.numeroVin && this.vinValido);
  }

  iniciarNuevoEnsamblaje(): void {
    if (!this.validarFormularioEnsamblaje()) return;

    const modeloFinal = this.nuevoEnsamblaje.modelo === 'Otro'
      ? this.nuevoEnsamblaje.modeloPersonalizado
      : this.nuevoEnsamblaje.modelo;

    let obs = this.nuevoEnsamblaje.observaciones || '';
    if (this.nuevoEnsamblaje.ordenTrabajo) obs = `[OT: ${this.nuevoEnsamblaje.ordenTrabajo}] ${obs}`;
    if (this.nuevoEnsamblaje.responsable)  obs = `[Resp: ${this.nuevoEnsamblaje.responsable}] ${obs}`;

    const dto: CreateChecklistEnsamblajeDto = {
      fecha        : this.nuevoEnsamblaje.fecha,
      modelo       : modeloFinal,
      numeroVin    : this.nuevoEnsamblaje.numeroVin.toUpperCase(),
      observaciones: obs.trim() || undefined
    };

    this.loading = true;
    this.checklistService.createChecklist(dto).subscribe({
      next: (response) => {
        this.successMessage = '¡Ensamblaje iniciado exitosamente!';
        this.closeModal(this.modalNuevoEnsamblaje);
        this.loadChecklists();
        this.loading = false;

        if (response.id) {
          setTimeout(() => {
            this.checklistService.getChecklistById(response.id!).subscribe(cl => {
              this.openModalTareas(cl);
            });
          }, 500);
        }
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al iniciar el ensamblaje';
        this.loading      = false;
      }
    });
  }

  getTotalTareasCatalogo(): number {
    return this.catalogoTareas.reduce((t, g) => t + g.tareas.length, 0);
  }

  // ============================================
  // EDITAR
  // ============================================

  openModalEditar(checklist: ChecklistListDto): void {
    this.currentEditId     = checklist.id;
    this.editChecklistData = {
      fecha: checklist.fecha, modelo: checklist.modelo,
      numeroVin: checklist.numeroVin, observaciones: checklist.observaciones || ''
    };
    this.errorMessage = '';
    this.openModal(this.modalEditar);
  }

  actualizarChecklist(): void {
    this.loading = true;
    this.checklistService.updateChecklist(this.currentEditId, this.editChecklistData).subscribe({
      next: () => {
        this.successMessage = 'Checklist actualizado';
        this.closeModal(this.modalEditar);
        this.loadChecklists();
        this.loading = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => { this.errorMessage = err.error?.message || 'Error al actualizar'; this.loading = false; }
    });
  }

  // ============================================
  // ELIMINAR
  // ============================================

  openModalEliminar(checklist: ChecklistListDto): void {
    this.selectedChecklistSimple = checklist;
    this.errorMessage = '';
    this.openModal(this.modalEliminar);
  }

  confirmarEliminar(): void {
    if (!this.selectedChecklistSimple) return;
    const v = this.checklistService.canDeleteChecklist(this.selectedChecklistSimple);
    if (!v.canDelete) { this.errorMessage = v.reason || 'No se puede eliminar'; return; }

    this.loading = true;
    this.checklistService.deleteChecklist(this.selectedChecklistSimple.id).subscribe({
      next: () => {
        this.successMessage = 'Checklist eliminado';
        this.closeModal(this.modalEliminar);
        this.loadChecklists();
        this.loading = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => { this.errorMessage = err.error?.message || 'Error al eliminar'; this.loading = false; }
    });
  }

  // ============================================
  // DETALLE Y TAREAS
  // ============================================

  openModalDetalle(checklist: ChecklistListDto): void {
    // CORRECCIÓN: limpiar datos anteriores para evitar mostrar info de otro checklist
    // mientras carga el nuevo. El modal spinner cubre este estado.
    this.selectedChecklist = undefined;
    this.progresoGrupos    = [];
    this.loadChecklistDetail(checklist.id);
    this.openModal(this.modalDetalle);
  }

  /** Navega a la vista de tareas (página completa, sin modal) */
  goToViewTareas(checklist: any, origen?: 'chassis' | 'checklists'): void {
    if (!checklist) return; // CORRECCIÓN: guard contra undefined (ej: botón presionado antes de cargar)

    this.previousView   = origen ?? (this.viewMode as 'chassis' | 'checklists');
    this.tareaEnEdicion = null;
    this.gruposExpandidos.clear();
    this.viewMode = 'tareas';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Si ya tenemos el detalle completo de este checklist, usarlo directamente (sin llamada extra)
    if (
      this.selectedChecklist &&
      this.selectedChecklist.id === checklist.id &&
      Array.isArray(this.selectedChecklist.registros) &&
      this.selectedChecklist.registros.length > 0
    ) {
      this.loadingDetail  = false;
      this.progresoGrupos = this.calcularProgresoGruposLocal(this.selectedChecklist);
      setTimeout(() => this.expandirTodosLosGrupos(), 0);
      return;
    }

    // Solo cargar si no tenemos los datos aún
    this.selectedChecklist = undefined;
    this.loadChecklistDetail(checklist.id);
  }

  /** Volver a la vista anterior desde la página de tareas */
  volverDesTareas(): void {
    this.viewMode = this.previousView;
    this.selectedChecklist = undefined;
  }

  /** Recibe el checklist actualizado desde app-checklist-tareas-page */
  onChecklistActualizado(updated: any): void {
    this.selectedChecklist = updated;
    // Sincronizar el porcentaje en la lista de checklists (para la tabla)
    const idx = this.checklists.findIndex(c => c.id === updated.id);
    if (idx >= 0) {
      this.checklists[idx] = {
        ...this.checklists[idx],
        porcentajeAvance : updated.porcentajeAvance,
        tareasCompletadas: updated.tareasCompletadas
      };
      this.applyFilters();
    }
    // Sincronizar también en la lista de chasis
    const chassis = this.allChassis.find(c => c.checklist?.id === updated.id);
    if (chassis?.checklist) {
      chassis.checklist.porcentajeAvance  = updated.porcentajeAvance;
      chassis.checklist.tareasCompletadas = updated.tareasCompletadas;
    }
  }

  /** @deprecated — mantener para compatibilidad con modales existentes */
  openModalTareas(checklist: any): void {
    this.goToViewTareas(checklist);
  }

  /**
   * Llamado por (ngModelChange): ngModel ya actualizó registro.completado.
   * Solo recalcula progreso, muestra panel opcional y persiste.
   */
  toggleTareaCompleta(registro: RegistroCumplimientoDto): void {
    if (!this.selectedChecklist) return;

    const nuevoEstado = registro.completado; // ngModel ya lo cambió

    if (nuevoEstado && !registro.fechaRealizacion) {
      registro.fechaRealizacion = new Date().toISOString().split('T')[0] as any;
    }
    if (!nuevoEstado) {
      registro.realizadoPor     = '';
      registro.fechaRealizacion = undefined as any;
      registro.observaciones    = '';
    }

    // Recalcular barra de progreso al instante
    const regs        = this.selectedChecklist.registros;
    const completadas = regs.filter(r => r.completado).length;
    this.selectedChecklist.tareasCompletadas = completadas;
    this.selectedChecklist.totalTareas       = regs.length;
    this.selectedChecklist.porcentajeAvance  = regs.length
      ? Math.round((completadas / regs.length) * 100) : 0;

    // Actualizar también el desglose por grupo (usado en modal detalle)
    this.progresoGrupos = this.calcularProgresoGruposLocal(this.selectedChecklist);

    this.currentTareaEdit = {
      checklistId  : this.selectedChecklist.id,
      tareaId      : registro.tareaId,
      completado   : nuevoEstado,
      observaciones: registro.observaciones || '',
      realizadoPor : registro.realizadoPor  || ''
    };

    if (nuevoEstado) {
      this.tareaEnEdicion = registro;
    } else {
      if (this.tareaEnEdicion?.tareaId === registro.tareaId) {
        this.tareaEnEdicion = null;
      }
    }

    this.enviarActualizacionTarea(registro);
  }

  /** Guarda detalles adicionales (realizadoPor, observaciones) desde el panel inline */
  guardarEstadoTarea(): void {
    this.tareaEnEdicion = null;
    this.enviarActualizacionTarea(null);
  }

  private enviarActualizacionTarea(registro: RegistroCumplimientoDto | null): void {
    const checklistId = this.currentTareaEdit.checklistId;
    const update: UpdateRegistroCumplimientoDto = {
      completado   : this.currentTareaEdit.completado,
      observaciones: this.currentTareaEdit.observaciones,
      realizadoPor : this.currentTareaEdit.realizadoPor
    };
    this.checklistService.updateRegistroCumplimiento(
      checklistId, this.currentTareaEdit.tareaId, update
    ).subscribe({
      next: () => {
        // Solo recargar la lista de checklists (para actualizar porcentajes en la tabla)
        // No recargar el detalle — la UI ya fue actualizada de forma optimista
        this.loadChecklists();
      },
      error: () => {
        this.errorMessage = 'Error al guardar la tarea. Intente nuevamente.';
        setTimeout(() => this.errorMessage = '', 4000);
      }
    });
  }

  openEditTareaModal(registro: RegistroCumplimientoDto): void {
    this.currentTareaEdit.observaciones = registro.observaciones || '';
    this.currentTareaEdit.realizadoPor  = registro.realizadoPor  || '';
    this.tareaEnEdicion = registro;
  }

  cancelarEdicionTarea(registro?: RegistroCumplimientoDto): void {
    this.tareaEnEdicion = null;
  }

  // ============================================
  // GRUPOS
  // ============================================

  toggleGrupo(index: number): void {
    this.gruposExpandidos.has(index) ? this.gruposExpandidos.delete(index) : this.gruposExpandidos.add(index);
  }
  isGrupoExpanded(i: number): boolean { return this.gruposExpandidos.has(i); }
  expandirTodosLosGrupos(): void {
    if (!this.selectedChecklist) return;
    this.agruparRegistros(this.selectedChecklist.registros).forEach((_, i) => this.gruposExpandidos.add(i));
  }
  colapsarTodosLosGrupos(): void { this.gruposExpandidos.clear(); }

  // ============================================
  // REPORTES Y EXCEL
  // ============================================

  openModalReporte(checklist: ChecklistListDto): void {
    this.checklistService.getChecklistDetail(checklist.id).subscribe({
      next: (data) => { this.reporteData = data; this.openModal(this.modalReporte); },
      error: ()    => { this.errorMessage = 'Error al cargar datos del reporte'; }
    });
  }

  exportarExcel(): void {
    if (!this.reporteData) return;
    const blob = new Blob([this.checklistService.exportToCsv(this.reporteData)], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `checklist_${this.reporteData.numeroVin}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }

  exportarExcelMultiple(): void {
    let csv = 'ID,Fecha,Modelo,VIN,Progreso,Tareas Completadas,Total Tareas,Estado\n';
    this.filteredChecklists.forEach(c => {
      csv += `${c.id},"${c.fecha}","${c.modelo}","${c.numeroVin}",${c.porcentajeAvance},${c.tareasCompletadas},${c.totalTareas},"${this.checklistService.getStatusText(c.porcentajeAvance)}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `reporte_checklists_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }

  imprimirReporte(): void { window.print(); }

  // ============================================
  // HELPERS
  // ============================================

  getProgressClass(p: number): string        { return this.checklistService.getProgressClass(p); }
  getStatusText(p: number): string           { return this.checklistService.getStatusText(p); }
  getPorcentajeFormateado(p: number): string { return this.checklistService.getPorcentajeFormateado(p); }
  formatDate(d: string): string              { return this.checklistService.formatDateForDisplay(d); }

  getChassisStatusClass(item: ChassisItem): string {
    if (!item.checklist)                         return 'badge-secondary';
    if (item.checklist.porcentajeAvance === 100) return 'badge-success';
    if (item.checklist.porcentajeAvance > 0)     return 'badge-warning';
    return 'badge-info';
  }

  getChassisStatusLabel(item: ChassisItem): string {
    if (!item.checklist)                         return 'Sin checklist';
    if (item.checklist.porcentajeAvance === 100) return 'Completado';
    if (item.checklist.porcentajeAvance > 0)
      return `En progreso · ${this.getPorcentajeFormateado(item.checklist.porcentajeAvance)}`;
    return 'Iniciado · 0%';
  }

  agruparRegistros(registros: RegistroCumplimientoDto[]): [string, RegistroCumplimientoDto[]][] {
    if (!registros?.length) return [];
    const mapa = new Map<string, RegistroCumplimientoDto[]>();
    for (const r of registros) {
      // CORRECCIÓN: cubrir todos los posibles nombres de campo que puede retornar el API
      const nombreGrupo =
        (r as any).grupo              ||
        (r as any).grupoTrabajo       ||
        (r as any).nombreGrupo        ||
        (r as any).nombreGrupoTrabajo ||
        (r as any).area               ||
        (r as any).categoria          ||
        (r as any).groupName          ||
        'Sin grupo';
      if (!mapa.has(nombreGrupo)) mapa.set(nombreGrupo, []);
      mapa.get(nombreGrupo)!.push(r);
    }
    return Array.from(mapa.entries());
  }

  calcularEstadisticasGrupo(registros: RegistroCumplimientoDto[]) {
    const total       = registros.length;
    const completadas = registros.filter(r => r.completado).length;
    const porcentaje  = total ? Math.round((completadas / total) * 100) : 0;
    return { total, completadas, porcentaje };
  }
}