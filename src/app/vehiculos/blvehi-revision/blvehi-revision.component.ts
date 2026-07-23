import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  VehiculosImportService,
  BlContainerDto,          // containerId  ← campo correcto (no "id")
  BlContainersResponseDto,
  BlVehiculosDetailDto,
  BlVehiculosListDto,
  SaveRevisionDto,         // { revisedBy: string; items: RevisionItemDto[] }
  RevisionItemDto,         // { containerId, itemType, itemNumber, status, note }
  RevisionResponseDto,
  RevisionItemResponseDto
} from '../../services/vehiculos-import.service';
import { AuthService } from '../../services/auth.service';
import { Usuario } from '../../models/usuario';
import * as XLSX from 'xlsx';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError, map, debounceTime, switchMap } from 'rxjs/operators';

// ============================================
// TIPOS LOCALES  (UI en español)
// ============================================

export type ItemType   = 'chassis' | 'cab' | 'engine';
export type ItemStatus = 'pendiente' | 'revisado' | 'observacion' | 'faltante';

/** Status exacto que acepta el backend (inglés) */
type ApiStatus = RevisionItemDto['status'];  // 'pending' | 'revised' | 'observation' | 'missing'

// ============================================
// MAPEOS BIDIRECCIONALES UI ↔ API
// ============================================

const STATUS_TO_API: Record<ItemStatus, ApiStatus> = {
  pendiente  : 'pending',
  revisado   : 'revised',
  observacion: 'observation',
  faltante   : 'missing'
};

const STATUS_FROM_API: Record<ApiStatus, ItemStatus> = {
  pending    : 'pendiente',
  revised    : 'revisado',
  observation: 'observacion',
  missing    : 'faltante'
};

// ============================================
// INTERFACES LOCALES
// ============================================

export interface RevisionItem {
  id: string;               // clave única de UI
  number: string;           // número del chasis / cabina / motor
  type: ItemType;
  containerNumber: string;
  invoiceNumber?: string;
  containerId: number;      // ← viene de BlContainerDto.containerId
  status: ItemStatus;       // siempre en español dentro del componente
  note: string;
  editingNote: boolean;
  tempNote: string;
}

export interface BlListItemView extends BlVehiculosListDto {
  chassisCount: number;
  cabCount: number;
  engineCount: number;
}

export interface CountDiscrepancy {
  containerNumber: string;
  invoiceNumber?: string;
  chassisDeclared: number;
  chassisFound: number;
  cabDeclared: number;
  cabFound: number;
  engineDeclared: number;
  engineFound: number;
}

interface BlProgress {
  percent: number;
  done: number;
  total: number;
}

interface BlInfoView {
  blNumber: string;
  vesselName: string;
  portOfLoading: string;
  portOfDischarge: string;
}

// ============================================
// COMPONENTE
// ============================================

@Component({
  selector: 'app-blvehi-revision',
  templateUrl: './blvehi-revision.component.html',
  styleUrls: ['./blvehi-revision.component.css']
})
export class BlvehiRevisionComponent implements OnInit, OnDestroy {

  // ---- Usuario actual ----
  usuario: Usuario | null = null;

  // ---- Modo de vista ----
  viewMode: 'list' | 'revision' = 'list';

  // ---- Vista Lista ----
  allBlList: BlListItemView[] = [];
  loadingList    = false;
  listError: string | null = null;
  blSearchTerm   = '';
  blSearchVessel = '';
  private progressMap = new Map<number, BlProgress>();

  // ---- Vista Revisión ----
  blId: number | null = null;
  blInfo: BlInfoView | null = null;
  private containersRaw: BlContainerDto[] = [];

  loading  = false;
  error: string | null = null;
  isSaving = false;
  saveSuccess = false;

  allItems: RevisionItem[] = [];
  countDiscrepancies: CountDiscrepancy[] = [];

  // Filtros
  activeTab: 'todos' | ItemType = 'todos';
  searchTerm       = '';
  filterStatus     = '';
  filterContainer  = '';
  filterInvoice    = '';

  showResetModal = false;

  private destroy$  = new Subject<void>();
  /** Emite cada vez que hay un cambio; el debounce agrupa cambios rápidos en 1 sola llamada */
  private autoSave$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private vehiculosService: VehiculosImportService,
    public  authService: AuthService
  ) {}

  // ============================================
  // LIFECYCLE
  // ============================================

  ngOnInit(): void {
    // Igual que en el resto de componentes: suscripción al usuario actual
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
    });

    // Pipeline de auto-guardado: agrupa cambios rápidos con debounce de 600 ms
    this.autoSave$
      .pipe(
        debounceTime(600),
        switchMap(() => {
          if (!this.blId) return of(null);

          const revisedBy = this.usuario?.nombreUsuario
            || (this.usuario as any)?.nombre
            || 'sistema';

          const payload: SaveRevisionDto = {
            revisedBy,
            items: this.allItems.map(item => ({
              containerId: item.containerId,
              itemType   : item.type,
              itemNumber : item.number,
              status     : STATUS_TO_API[item.status],
              note       : item.note
            } satisfies RevisionItemDto))
          };

          this.isSaving = true;
          return this.vehiculosService.saveBlRevision(this.blId!, payload).pipe(
            catchError(err => {
              this.error    = 'Error al guardar: ' + err.message;
              this.isSaving = false;
              return of(null);
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(result => {
        if (result !== null) {
          this.isSaving    = false;
          this.saveSuccess = true;
          setTimeout(() => { this.saveSuccess = false; }, 2500);
        }
      });

    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['id']) {
          this.blId     = +params['id'];
          this.viewMode = 'revision';
          this.loadRevisionData(this.blId);
        } else {
          this.viewMode = 'list';
          this.loadBlList();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.autoSave$.complete();
  }

  // ============================================
  // CARGA: LISTA DE BLs
  // ============================================

  loadBlList(): void {
    this.loadingList = true;
    this.listError   = null;

    this.vehiculosService.getAllBlVehiculos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bls) => {
          const requests = bls.map(bl =>
            this.vehiculosService.getBlContainers(bl.id).pipe(
              map(data => {
                let chassis = 0, cab = 0, engine = 0;
                (data.containers || []).forEach(c => {
                  chassis += (c.chassisNumbers || []).length;
                  cab     += (c.cabNumbers     || []).length;
                  engine  += (c.engineNumbers  || []).length;
                });
                return { ...bl, chassisCount: chassis, cabCount: cab, engineCount: engine } as BlListItemView;
              }),
              catchError(() => of({ ...bl, chassisCount: 0, cabCount: 0, engineCount: 0 } as BlListItemView))
            )
          );

          if (requests.length === 0) {
            this.allBlList   = [];
            this.loadingList = false;
            return;
          }

          forkJoin(requests)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (enriched) => { this.allBlList = enriched; this.loadingList = false; },
              error: () => {
                this.allBlList   = bls.map(b => ({ ...b, chassisCount: 0, cabCount: 0, engineCount: 0 }));
                this.loadingList = false;
              }
            });
        },
        error: (err) => {
          this.listError   = 'Error al cargar B/Ls: ' + err.message;
          this.loadingList = false;
        }
      });
  }

  // ============================================
  // CARGA: REVISIÓN DE UN BL
  // Primero carga contenedores, luego intenta
  // cargar la revisión guardada y aplicarla.
  // ============================================

  loadRevisionData(blId: number): void {
    this.loading = true;
    this.error   = null;

    this.vehiculosService.getBlContainers(blId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.containersRaw = data.containers || [];
          this.buildItems(this.containersRaw);
          this.buildDiscrepancies(this.containersRaw);
          this.loadBlInfo(blId);
          this.loadStoredRevision(blId);   // aplica estados guardados si existen
          this.loading = false;
        },
        error: (err) => {
          this.error   = 'Error al cargar contenedores: ' + err.message;
          this.loading = false;
        }
      });
  }

  private loadBlInfo(blId: number): void {
    this.vehiculosService.getBlVehiculosDetail(blId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (detail: BlVehiculosDetailDto) => {
          this.blInfo = {
            blNumber       : detail.blNumber        || `BL-${blId}`,
            vesselName     : detail.vesselName      || '',
            portOfLoading  : detail.portOfLoading   || '',
            portOfDischarge: detail.portOfDischarge || ''
          };
        },
        error: () => {
          this.blInfo = { blNumber: `BL-${blId}`, vesselName: '', portOfLoading: '', portOfDischarge: '' };
        }
      });
  }

  /** Intenta cargar revisión previa del backend y aplica los estados guardados */
  private loadStoredRevision(blId: number): void {
    this.vehiculosService.getBlRevision(blId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => of(null))   // si no hay revisión guardada, no hace nada
      )
      .subscribe(stored => {
        if (stored?.items?.length) {
          this.applyStoredRevision(stored.items);
        }
      });
  }

  // ============================================
  // CONSTRUCCIÓN DE ÍTEMS LOCALES
  // ============================================

  /**
   * Convierte los contenedores planos → lista de RevisionItems.
   * Usa BlContainerDto.containerId  (NO .id — ese campo no existe en este DTO).
   */
  private buildItems(containers: BlContainerDto[]): void {
    const items: RevisionItem[] = [];

    containers.forEach(c => {
      const base = {
        containerNumber: c.containerNumber,
        invoiceNumber  : c.invoiceNumber || undefined,
        containerId    : c.containerId,          // ✅ campo correcto del DTO
        status         : 'pendiente' as ItemStatus,
        note           : '',
        editingNote    : false,
        tempNote       : ''
      };

      (c.chassisNumbers || []).forEach(num =>
        items.push({ ...base, id: `chassis_${num}_${c.containerNumber}`, number: num, type: 'chassis' })
      );
      (c.cabNumbers || []).forEach(num =>
        items.push({ ...base, id: `cab_${num}_${c.containerNumber}`, number: num, type: 'cab' })
      );
      (c.engineNumbers || []).forEach(num =>
        items.push({ ...base, id: `engine_${num}_${c.containerNumber}`, number: num, type: 'engine' })
      );
    });

    this.allItems = items;
  }

  private buildDiscrepancies(containers: BlContainerDto[]): void {
    const disc: CountDiscrepancy[] = [];
    containers.forEach(c => {
      const chassisFound  = (c.chassisNumbers || []).length;
      const cabFound      = (c.cabNumbers     || []).length;
      const engineFound   = (c.engineNumbers  || []).length;

      const chassisDeclared = (c as any).expectedChassisCount ?? chassisFound;
      const cabDeclared     = (c as any).expectedCabCount     ?? cabFound;
      const engineDeclared  = (c as any).expectedEngineCount  ?? engineFound;

      if (chassisDeclared !== chassisFound || cabDeclared !== cabFound || engineDeclared !== engineFound) {
        disc.push({
          containerNumber: c.containerNumber,
          invoiceNumber  : c.invoiceNumber,
          chassisDeclared, chassisFound,
          cabDeclared,     cabFound,
          engineDeclared,  engineFound
        });
      }
    });
    this.countDiscrepancies = disc;
  }

  /**
   * Aplica estados guardados del backend al estado local.
   * STATUS_FROM_API convierte el string del backend al ItemStatus en español.
   */
  private applyStoredRevision(stored: RevisionItemResponseDto[]): void {
    stored.forEach(dto => {
      const item = this.allItems.find(
        i => i.number === dto.itemNumber && i.type === (dto.itemType as ItemType)
      );
      if (item) {
        const apiStatus = dto.status as ApiStatus;
        item.status = STATUS_FROM_API[apiStatus] ?? 'pendiente';  // ✅ tipo correcto
        item.note   = dto.note ?? '';
      }
    });
  }

  // ============================================
  // SELECCIÓN DE BL (desde lista)
  // ============================================

  selectBl(bl: BlListItemView): void {
    this.blId     = bl.id;
    this.viewMode = 'revision';
    this.clearFilters();
    this.loadRevisionData(bl.id);
  }

  backToList(): void {
    if (this.blId !== null) this.saveProgress(this.blId);
    this.viewMode = 'list';
    this.allItems = [];
    this.blInfo   = null;
    this.error    = null;
    this.loadBlList();
  }

  private saveProgress(blId: number): void {
    const total = this.totalItems;
    const done  = this.allItems.filter(i => i.status !== 'pendiente').length;
    this.progressMap.set(blId, {
      percent: total > 0 ? Math.round((done / total) * 100) : 0,
      done,
      total
    });
  }

  // ============================================
  // GETTERS LISTA BLs
  // ============================================

  get filteredBlList(): BlListItemView[] {
    let list = this.allBlList;
    const term   = this.blSearchTerm.toLowerCase().trim();
    const vessel = this.blSearchVessel.toLowerCase().trim();
    if (term)   list = list.filter(bl => bl.blNumber.toLowerCase().includes(term));
    if (vessel) list = list.filter(bl => (bl.vesselName || '').toLowerCase().includes(vessel));
    return list;
  }

  getBlProgress(blId: number): BlProgress | null {
    return this.progressMap.get(blId) || null;
  }

  clearBlSearch(): void {
    this.blSearchTerm   = '';
    this.blSearchVessel = '';
  }

  // ============================================
  // GETTERS ÍTEMS REVISIÓN
  // ============================================

  get chassisItems(): RevisionItem[] { return this.allItems.filter(i => i.type === 'chassis'); }
  get cabItems():     RevisionItem[] { return this.allItems.filter(i => i.type === 'cab');     }
  get engineItems():  RevisionItem[] { return this.allItems.filter(i => i.type === 'engine');  }
  get totalItems():   number         { return this.allItems.length; }

  get progressPercent(): number {
    if (!this.totalItems) return 0;
    return (this.allItems.filter(i => i.status !== 'pendiente').length / this.totalItems) * 100;
  }

  get filteredItems(): RevisionItem[] {
    let items = this.allItems;
    if (this.activeTab !== 'todos')  items = items.filter(i => i.type === this.activeTab);
    if (this.filterStatus)           items = items.filter(i => i.status === this.filterStatus);
    if (this.filterContainer.trim()) items = items.filter(i => i.containerNumber.toLowerCase().includes(this.filterContainer.toLowerCase()));
    if (this.filterInvoice.trim())   items = items.filter(i => (i.invoiceNumber || '').toLowerCase().includes(this.filterInvoice.toLowerCase()));
    const term = this.searchTerm.toLowerCase().trim();
    if (term) items = items.filter(i =>
      i.number.toLowerCase().includes(term) ||
      i.containerNumber.toLowerCase().includes(term) ||
      (i.invoiceNumber || '').toLowerCase().includes(term)
    );
    return items;
  }

  get hasAnyFilter(): boolean {
    return !!(this.searchTerm || this.filterStatus || this.filterContainer || this.filterInvoice || this.activeTab !== 'todos');
  }

  clearFilters(): void {
    this.searchTerm      = '';
    this.filterStatus    = '';
    this.filterContainer = '';
    this.filterInvoice   = '';
    this.activeTab       = 'todos';
  }

  // ============================================
  // CONTADORES
  // ============================================

  statusCount(status: ItemStatus): number {
    return this.allItems.filter(i => i.status === status).length;
  }

  getRevisadoCount(type: ItemType): number {
    return this.allItems.filter(i => i.type === type && i.status === 'revisado').length;
  }

  getCountValidation(type: ItemType): { ok: boolean; label: string } {
    const total    = this.allItems.filter(i => i.type === type).length;
    const revisado = this.getRevisadoCount(type);
    if (total === 0) return { ok: true, label: 'N/A' };
    return { ok: revisado === total, label: `${revisado}/${total}` };
  }

  // ============================================
  // ACCIONES SOBRE ÍTEMS
  // ============================================

  /** Cambia el estado del ítem y dispara el guardado automático */
  setStatus(item: RevisionItem, status: ItemStatus): void {
    item.status = item.status === status ? 'pendiente' : status;
    this.autoSave$.next();
  }

  markAllVisible(): void {
    this.filteredItems.forEach(item => { item.status = 'revisado'; });
    this.autoSave$.next();
  }

  getStatusLabel(status: ItemStatus): string {
    const map: Record<ItemStatus, string> = {
      pendiente  : 'Pendiente',
      revisado   : 'Revisado',
      observacion: 'Observación',
      faltante   : 'Faltante'
    };
    return map[status] || status;
  }

  // ============================================
  // NOTAS INLINE
  // ============================================

  startEditNote(item: RevisionItem): void { item.tempNote = item.note; item.editingNote = true; }

  saveNote(item: RevisionItem): void {
    item.note        = item.tempNote.trim();
    item.editingNote = false;
    if (item.note && item.status === 'pendiente') item.status = 'observacion';
    this.autoSave$.next();
  }

  cancelNote(item: RevisionItem): void { item.editingNote = false; item.tempNote = ''; }

  // ============================================
  // TABS
  // ============================================

  setTab(tab: 'todos' | ItemType): void { this.activeTab = tab; }

  // ============================================
  // RESET
  // ============================================

  resetRevision(): void   { this.showResetModal = true;  }
  closeResetModal(): void { this.showResetModal = false; }

  confirmReset(): void {
    this.allItems.forEach(item => {
      item.status = 'pendiente'; item.note = ''; item.editingNote = false; item.tempNote = '';
    });
    if (this.blId !== null) this.progressMap.delete(this.blId);
    this.showResetModal = false;
    this.autoSave$.next();   // persiste el reset en el backend
  }

  // ============================================
  // EXPORTAR A EXCEL
  // ============================================

  exportRevision(): void {
    if (!this.allItems.length) return;

    const rows = this.allItems.map((item, idx) => ({
      '#'          : idx + 1,
      'Tipo'       : item.type === 'chassis' ? 'Chasis' : item.type === 'cab' ? 'Cabina' : 'Motor',
      'Número'     : item.number,
      'Contenedor' : item.containerNumber,
      'Invoice'    : item.invoiceNumber || '',
      'Estado'     : this.getStatusLabel(item.status),
      'Observación': item.note
    }));

    const ws  = XLSX.utils.json_to_sheet(rows);
    const wb  = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Revisión');
    const blNum = this.blInfo?.blNumber || `BL_${this.blId}`;
    XLSX.writeFile(wb, `Revision_${blNum}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }
}