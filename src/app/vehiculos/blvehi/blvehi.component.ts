import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { 
  VehiculosImportService, 
  BlHierarchyDto, 
  ContainerDto, 
  CreateContainerDto,
  UpdateContainerDto,
  BlVehiculosDto,
  CreateBlVehiculosDto,
  UpdateBlVehiculosDto,
  BlVehiculosListDto,
  BlVehiculosDetailDto,
  BlContainerDto,
  BlContainersResponseDto
} from '../../services/vehiculos-import.service';
import * as XLSX from 'xlsx';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Interfaces extendidas
interface ContainerSummaryView {
  id: number;
  containerId?: number;
  containerNumber: string;
  sealNumber: string;
  contentDescription?: string;
  netWeightKg: number;
  grossWeightKg: number;
  volumeM3: number;
  containerStatus: string;
  invoiceNumber?: string;
  serialNumber?: number;
}

interface ContainerDetailView extends ContainerSummaryView {
  chassisNumbers?: string[];
  cabNumbers?: string[];
  engineNumbers?: string[];
  remarks?: string;
  packingDate?: string;
  qtyPackagingUnits?: number;
  packagingUnitType?: string;
  containerSize?: string;
  itemCategory?: string;
  invoiceId?: number;
  blId?: number;
  orderId?: number;
}

interface InvoiceDetailItem {
  detailId: number;
  lineNumber: number;
  itemDescription: string;
  itemCode: string;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  totalPrice: number;
  hsCode: string;
  originCountry: string;
}

interface InvoiceView {
  id: number;
  invoiceNumber: string;
  containerCount: number;
  totalGrossWeight: number;
  containers: ContainerSummaryView[];
  details?: InvoiceDetailItem[];
}

@Component({
  selector: 'app-blvehi',
  templateUrl: './blvehi.component.html',
  styleUrls: ['./blvehi.component.css']
})
export class BlvehiComponent implements OnInit, OnDestroy {
  // Datos del B/L
  blId: number | null = null;
  blHierarchy: BlHierarchyDto | null = null;
  blDetail: BlVehiculosDetailDto | null = null;
  allBls: BlVehiculosListDto[] = [];

  // Estados
  loading = false;
  error: string | null = null;
  viewMode: 'list' | 'detail' = 'list';
  isSubmitting = false;

  // Control de modales (sin ViewChild)
  showCreateBlModal = false;
  showEditBlModal = false;
  showCreateContainerModal = false;
  showEditContainerModal = false;
  showContainerDetailModal = false;
  showUploadModal = false;
  showInvoiceDetailModal = false;

  // Formularios
  newBl: CreateBlVehiculosDto = this.getInitialBlForm();
  editBlData: UpdateBlVehiculosDto = {};
  
  selectedInvoice: InvoiceView | null = null;
  selectedContainer: ContainerDetailView | null = null;

  newContainer: CreateContainerDto = this.getInitialContainerForm();
  editContainerData: UpdateContainerDto = {};

  // Contenedores del B/L (nuevo endpoint)
  blContainersData: BlContainersResponseDto | null = null;
  loadingContainers = false;
  showBlContainersModal = false;
  containerSearchTerm = '';

  // Filtros de búsqueda en vista detalle
  filterInvoice = '';
  filterContainer = '';
  filterChassis = '';
  filterCab = '';

  // Excel upload
  excelFile: File | null = null;
  excelPreview: any[] = [];
  uploadErrors: string[] = [];
  selectedInvoiceForUpload: number | null = null;

  // Inputs dinámicos
  newChassisNumber = '';
  newCabNumber = '';

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private vehiculosService: VehiculosImportService
  ) {}

  ngOnInit(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['id']) {
          this.blId = +params['id'];
          this.viewMode = 'detail';
          this.loadBlHierarchy(this.blId);
          this.loadBlDetail(this.blId);
          this.loadBlContainers(this.blId); // precarga para el modal de detalle
        } else {
          this.viewMode = 'list';
          this.loadAllBls();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================
  // FORM INITIALIZERS
  // ============================================

  private getInitialBlForm(): CreateBlVehiculosDto {
    const today = new Date().toISOString().split('T')[0];
    return {
      blNumber: '',
      blDate: today,
      vesselName: '',
      voyageNumber: '',
      portOfLoading: 'Shanghai',
      portOfDischarge: 'Guayaquil',
      shippingLine: '',
      agentName: '',
      remarks: ''
    };
  }

  private getInitialContainerForm(): CreateContainerDto {
    const today = new Date().toISOString().split('T')[0];
    return {
      orderId: 0,
      invoiceId: 0,
      blId: 0,
      serialNumber: 1,
      containerNumber: '',
      sealNumber: '',
      contentDescription: '',
      chassisNumbers: [],
      cabNumbers: [],
      qtyPackagingUnits: 0,
      netWeightKg: 0,
      grossWeightKg: 0,
      volumeM3: 0,
      packingDate: today,
      containerStatus: 'stuffed',
      remarks: ''
    };
  }

  // ============================================
  // DATA LOADING
  // ============================================

  loadAllBls(): void {
    this.loading = true;
    this.error = null;
    
    this.vehiculosService.getAllBlVehiculos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.allBls = data;
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Error al cargar B/Ls: ' + err.message;
          this.loading = false;
          console.error('Error cargando B/Ls:', err);
        }
      });
  }

  loadBlHierarchy(blId: number): void {
    this.loading = true;
    this.error = null;
    
    this.vehiculosService.getBlHierarchy(blId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.blHierarchy = data;
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Error al cargar jerarquía: ' + err.message;
          this.loading = false;
          console.error('Error cargando jerarquía:', err);
        }
      });
  }

  loadBlDetail(blId: number): void {
    this.vehiculosService.getBlVehiculosDetail(blId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.blDetail = data;
        },
        error: (err) => {
          console.error('Error cargando detalle de B/L:', err);
        }
      });
  }

  // ============================================
  // MODAL CONTROLS
  // ============================================

  openCreateBlModal(): void {
    this.newBl = this.getInitialBlForm();
    this.showCreateBlModal = true;
    document.body.style.overflow = 'hidden';
  }

  openEditBlModal(bl: BlVehiculosDto | any): void {
    this.editBlData = {
      blNumber: bl.blNumber,
      blDate: bl.blDate,
      vesselName: bl.vesselName,
      voyageNumber: bl.voyageNumber || '',
      portOfLoading: bl.portOfLoading,
      portOfDischarge: bl.portOfDischarge,
      shippingLine: bl.shippingLine || '',
      agentName: bl.agentName || '',
      remarks: bl.remarks
    };
    this.showEditBlModal = true;
    document.body.style.overflow = 'hidden';
  }

  openCreateContainerModal(invoice: any): void {
    this.selectedInvoice = invoice;
    this.newContainer = {
      ...this.getInitialContainerForm(),
      orderId: invoice.id,
      invoiceId: invoice.id,
      blId: this.blHierarchy?.id || 0,
      serialNumber: (invoice.containers?.length || 0) + 1
    };
    this.newChassisNumber = '';
    this.newCabNumber = '';
    this.showCreateContainerModal = true;
    document.body.style.overflow = 'hidden';
  }

  openEditContainerModal(container: any, invoice: any): void {
    this.selectedInvoice = invoice;
    this.selectedContainer = container as ContainerDetailView;
    this.editContainerData = { 
      sealNumber: container.sealNumber,
      contentDescription: container.contentDescription,
      chassisNumbers: (container as any).chassisNumbers || [],
      cabNumbers: (container as any).cabNumbers || [],
      qtyPackagingUnits: (container as any).qtyPackagingUnits,
      netWeightKg: container.netWeightKg,
      grossWeightKg: container.grossWeightKg,
      volumeM3: container.volumeM3,
      packingDate: (container as any).packingDate,
      containerStatus: container.containerStatus,
      remarks: (container as any).remarks
    };
    this.newChassisNumber = '';
    this.newCabNumber = '';
    this.showEditContainerModal = true;
    document.body.style.overflow = 'hidden';
  }

  openContainerDetailModal(container: any): void {
    // Mostrar datos básicos inmediatamente
    this.selectedContainer = container as ContainerDetailView;
    this.showContainerDetailModal = true;
    document.body.style.overflow = 'hidden';

    // 1. Buscar en blContainersData (ya cargado, tiene chasis/cabinas/motores completos)
    const containerNumber = container.containerNumber;
    if (this.blContainersData?.containers) {
      const full = this.blContainersData.containers.find(
        c => c.containerNumber === containerNumber
      );
      if (full) {
        this.selectedContainer = {
          id:                 container.id,
          containerId:        full.containerId,
          containerNumber:    full.containerNumber,
          sealNumber:         full.sealNumber,
          contentDescription: full.contentDescription ?? '',
          netWeightKg:        full.netWeightKg,
          grossWeightKg:      full.grossWeightKg,
          volumeM3:           full.volumeM3,
          containerStatus:    full.containerStatus ?? '',
          chassisNumbers:     full.chassisNumbers ?? [],
          cabNumbers:         full.cabNumbers ?? [],
          engineNumbers:      full.engineNumbers ?? [],
          qtyPackagingUnits:  full.qtyPackagingUnits,
          packagingUnitType:  full.packagingUnitType,
          containerSize:      full.containerSize,
          itemCategory:       full.itemCategory,
          packingDate:        full.packingDate,
          invoiceNumber:      full.invoiceNumber,
          serialNumber:       full.serialNumber,
          invoiceId:          full.invoiceId,
          blId:               full.blId,
          orderId:            full.orderId,
          remarks:            full.remarks
        } as ContainerDetailView;
        return;
      }
    }

    // 2. Si no está en caché, cargamos desde el API y cacheamos
    if (!this.blId) return;
    this.loadBlContainers(this.blId);

    // Esperar a que cargue y volver a mapear
    const sub = this.vehiculosService.getBlContainers(this.blId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.blContainersData = data;
          const full = data.containers.find(c => c.containerNumber === containerNumber);
          if (full) {
            this.selectedContainer = {
              id:                 container.id,
              containerId:        full.containerId,
              containerNumber:    full.containerNumber,
              sealNumber:         full.sealNumber,
              contentDescription: full.contentDescription ?? '',
              netWeightKg:        full.netWeightKg,
              grossWeightKg:      full.grossWeightKg,
              volumeM3:           full.volumeM3,
              containerStatus:    full.containerStatus ?? '',
              chassisNumbers:     full.chassisNumbers ?? [],
              cabNumbers:         full.cabNumbers ?? [],
              engineNumbers:      full.engineNumbers ?? [],
              qtyPackagingUnits:  full.qtyPackagingUnits,
              packagingUnitType:  full.packagingUnitType,
              containerSize:      full.containerSize,
              itemCategory:       full.itemCategory,
              packingDate:        full.packingDate,
              invoiceNumber:      full.invoiceNumber,
              serialNumber:       full.serialNumber,
              invoiceId:          full.invoiceId,
              blId:               full.blId,
              orderId:            full.orderId,
              remarks:            full.remarks
            } as ContainerDetailView;
          }
          sub.unsubscribe();
        },
        error: (err) => console.warn('No se pudo enriquecer detalle:', err)
      });
  }

  openUploadContainersModal(invoice?: InvoiceView): void {
    this.selectedInvoiceForUpload = invoice?.id || null;
    this.excelFile = null;
    this.excelPreview = [];
    this.uploadErrors = [];
    this.showUploadModal = true;
    document.body.style.overflow = 'hidden';
  }

  openInvoiceDetailModal(invoice: any): void {
    this.selectedInvoice = invoice;
    this.showInvoiceDetailModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.showCreateBlModal = false;
    this.showEditBlModal = false;
    this.showCreateContainerModal = false;
    this.showEditContainerModal = false;
    this.showContainerDetailModal = false;
    this.showUploadModal = false;
    this.showInvoiceDetailModal = false;
    this.showBlContainersModal = false;
    this.isSubmitting = false;
    document.body.style.overflow = '';
  }

  closeModalOnOverlay(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  createBl(): void {
    if (!this.validateBl(this.newBl)) return;

    this.isSubmitting = true;
    this.vehiculosService.createBlVehiculos(this.newBl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.closeModal();
          this.loadAllBls();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.error = 'Error al crear B/L: ' + err.message;
          console.error('Error creando B/L:', err);
        }
      });
  }

  updateBl(): void {
    if (!this.validateBlUpdate(this.editBlData)) return;

    const idToUpdate = this.blId || this.blDetail?.id;
    if (!idToUpdate) {
      this.error = 'No se pudo determinar el ID del B/L';
      return;
    }

    this.isSubmitting = true;
    this.vehiculosService.updateBlVehiculos(idToUpdate, this.editBlData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.closeModal();
          if (this.viewMode === 'detail' && this.blId) {
            this.loadBlHierarchy(this.blId);
            this.loadBlDetail(this.blId);
          } else {
            this.loadAllBls();
          }
        },
        error: (err) => {
          this.isSubmitting = false;
          this.error = 'Error al actualizar B/L: ' + err.message;
          console.error('Error actualizando B/L:', err);
        }
      });
  }

  deleteBl(blId: number): void {
    if (!confirm('¿Está seguro de eliminar este B/L? Solo se puede eliminar si no tiene invoices asociadas.')) {
      return;
    }

    this.vehiculosService.deleteBlVehiculos(blId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadAllBls();
        },
        error: (err) => {
          this.error = 'Error al eliminar B/L: ' + err.message;
          console.error('Error eliminando B/L:', err);
        }
      });
  }

  createContainer(): void {
    if (!this.validateContainer(this.newContainer)) return;

    this.isSubmitting = true;
    this.vehiculosService.createContainer(this.newContainer)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.closeModal();
          if (this.blId) {
            this.loadBlHierarchy(this.blId);
          }
        },
        error: (err) => {
          this.isSubmitting = false;
          this.error = 'Error al crear contenedor: ' + err.message;
          console.error('Error creando contenedor:', err);
        }
      });
  }

  updateContainer(): void {
    const containerId = this.selectedContainer?.id || (this.editContainerData as any).id;
    if (!containerId) {
      this.error = 'No se pudo determinar el ID del contenedor';
      return;
    }

    this.isSubmitting = true;
    this.vehiculosService.updateContainer(containerId, this.editContainerData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.closeModal();
          if (this.blId) {
            this.loadBlHierarchy(this.blId);
          }
        },
        error: (err) => {
          this.isSubmitting = false;
          this.error = 'Error al actualizar contenedor: ' + err.message;
          console.error('Error actualizando contenedor:', err);
        }
      });
  }

  deleteContainer(container: any): void {
    if (!confirm(`¿Está seguro de eliminar el contenedor ${container.containerNumber}?`)) {
      return;
    }

    this.vehiculosService.deleteContainer(container.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          if (this.blId) {
            this.loadBlHierarchy(this.blId);
          }
        },
        error: (err) => {
          this.error = 'Error al eliminar contenedor: ' + err.message;
          console.error('Error eliminando contenedor:', err);
        }
      });
  }

  // ============================================
  // EXCEL UPLOAD
  // ============================================

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.excelFile = file;
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[];

      this.processExcelData(jsonData);
    };

    reader.readAsArrayBuffer(file);
  }

  private processExcelData(data: any[]): void {
    if (data.length === 0) return;
    
    const headers = data[0];
    this.excelPreview = data.slice(1, 6).map((row, index) => {
      const obj: any = { rowNumber: index + 2 };
      headers.forEach((header: string, i: number) => {
        obj[header] = row[i];
      });
      return obj;
    });

    const requiredColumns = ['containerNumber', 'sealNumber', 'grossWeightKg', 'volumeM3'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));

    this.uploadErrors = [];
    if (missingColumns.length > 0) {
      this.uploadErrors.push(`Columnas faltantes: ${missingColumns.join(', ')}`);
    }
  }

  uploadContainersExcel(): void {
    if (!this.excelFile || this.uploadErrors.length > 0 || !this.blId) {
      if (!this.blId) this.error = 'No hay B/L seleccionado';
      return;
    }

    this.isSubmitting = true;
    this.vehiculosService.uploadContainersExcel(
      this.excelFile, 
      this.blId, 
      this.selectedInvoiceForUpload || 0
    )
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => {
        this.closeModal();
        this.loadBlHierarchy(this.blId!);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.error = 'Error al cargar Excel: ' + err.message;
        console.error('Error cargando Excel:', err);
      }
    });
  }

  // ============================================
  // TAG MANAGEMENT
  // ============================================

  addChassisNumber(): void {
    if (this.newChassisNumber.trim()) {
      this.newContainer.chassisNumbers = [
        ...(this.newContainer.chassisNumbers || []), 
        this.newChassisNumber.trim()
      ];
      this.newChassisNumber = '';
    }
  }

  removeChassisNumber(index: number): void {
    this.newContainer.chassisNumbers?.splice(index, 1);
  }

  addCabNumber(): void {
    if (this.newCabNumber.trim()) {
      this.newContainer.cabNumbers = [
        ...(this.newContainer.cabNumbers || []), 
        this.newCabNumber.trim()
      ];
      this.newCabNumber = '';
    }
  }

  removeCabNumber(index: number): void {
    this.newContainer.cabNumbers?.splice(index, 1);
  }

  addChassisToEdit(): void {
    if (this.newChassisNumber.trim()) {
      this.editContainerData.chassisNumbers = [
        ...(this.editContainerData.chassisNumbers || []), 
        this.newChassisNumber.trim()
      ];
      this.newChassisNumber = '';
    }
  }

  removeChassisFromEdit(index: number): void {
    this.editContainerData.chassisNumbers?.splice(index, 1);
  }

  addCabToEdit(): void {
    if (this.newCabNumber.trim()) {
      this.editContainerData.cabNumbers = [
        ...(this.editContainerData.cabNumbers || []), 
        this.newCabNumber.trim()
      ];
      this.newCabNumber = '';
    }
  }

  removeCabFromEdit(index: number): void {
    this.editContainerData.cabNumbers?.splice(index, 1);
  }

  // ============================================
  // VALIDATION
  // ============================================

  private validateBl(bl: CreateBlVehiculosDto): boolean {
    if (!bl.blNumber?.trim()) {
      this.error = 'El número de B/L es obligatorio';
      return false;
    }
    if (!bl.vesselName?.trim()) {
      this.error = 'El nombre del buque es obligatorio';
      return false;
    }
    if (!bl.portOfLoading?.trim()) {
      this.error = 'El puerto de carga es obligatorio';
      return false;
    }
    if (!bl.portOfDischarge?.trim()) {
      this.error = 'El puerto de descarga es obligatorio';
      return false;
    }
    return true;
  }

  private validateBlUpdate(bl: UpdateBlVehiculosDto): boolean {
    const hasValue = Object.values(bl).some(v => v !== undefined && v !== null && v !== '');
    if (!hasValue) {
      this.error = 'Debe proporcionar al menos un campo para actualizar';
      return false;
    }
    return true;
  }

  private validateContainer(container: CreateContainerDto): boolean {
    if (!container.containerNumber?.trim()) {
      this.error = 'El número de contenedor es obligatorio';
      return false;
    }
    if (!container.sealNumber?.trim()) {
      this.error = 'El número de sello es obligatorio';
      return false;
    }
    if (container.grossWeightKg <= 0) {
      this.error = 'El peso bruto debe ser mayor a 0';
      return false;
    }
    if (container.volumeM3 <= 0) {
      this.error = 'El volumen debe ser mayor a 0';
      return false;
    }
    return true;
  }

  // ============================================
  // NAVIGATION
  // ============================================

  viewBlDetail(blId: number): void {
    this.router.navigate(['/blvehi', blId]);
  }

  backToList(): void {
    this.router.navigate(['/blvehi']);
  }

  goToInvoicePage(): void {
    this.router.navigate(['/invoicevehi']);
  }

  // ============================================
  // CONTENEDORES DEL B/L
  // ============================================

  openBlContainersModal(): void {
    if (!this.blId) return;
    this.containerSearchTerm = '';
    this.showBlContainersModal = true;
    document.body.style.overflow = 'hidden';

    if (!this.blContainersData) {
      this.loadBlContainers(this.blId);
    }
  }

  loadBlContainers(blId: number): void {
    this.loadingContainers = true;

    this.vehiculosService.getBlContainers(blId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.blContainersData = data;
          this.loadingContainers = false;
        },
        error: (err) => {
          this.loadingContainers = false;
          console.error('Error cargando contenedores:', err);
        }
      });
  }

  get filteredBlContainers(): BlContainerDto[] {
    if (!this.blContainersData?.containers) return [];
    const term = this.containerSearchTerm.toLowerCase().trim();
    if (!term) return this.blContainersData.containers;
    return this.blContainersData.containers.filter(c =>
      c.containerNumber.toLowerCase().includes(term) ||
      c.sealNumber?.toLowerCase().includes(term) ||
      c.invoiceNumber?.toLowerCase().includes(term) ||
      c.chassisNumbers?.some(ch => ch.toLowerCase().includes(term)) ||
      c.cabNumbers?.some(cab => cab.toLowerCase().includes(term))
    );
  }

  // ============================================
  // FILTROS DE BÚSQUEDA EN DETALLE
  // ============================================

  clearFilters(): void {
    this.filterInvoice   = '';
    this.filterContainer = '';
    this.filterChassis   = '';
    this.filterCab       = '';
  }

  get hasActiveFilter(): boolean {
    return !!(this.filterInvoice || this.filterContainer || this.filterChassis || this.filterCab);
  }

  get filteredInvoices(): any[] {
    if (!this.blHierarchy?.invoices) return [];

    // Si no hay filtros activos, devolver todo con datos enriquecidos
    const invoices = this.blHierarchy.invoices.map(invoice => {
      // Enriquecer contenedores con chasis/cabinas desde blContainersData
      const containers = (invoice.containers || []).map((c: any) => {
        const full = this.blContainersData?.containers?.find(
          bc => bc.containerNumber === c.containerNumber
        );
        return full ? { ...c, ...full } : c;
      });
      return { ...invoice, containers };
    });

    if (!this.hasActiveFilter) return invoices;

    const inv   = this.filterInvoice.toLowerCase().trim();
    const cont  = this.filterContainer.toLowerCase().trim();
    const chas  = this.filterChassis.toLowerCase().trim();
    const cab   = this.filterCab.toLowerCase().trim();

    return invoices
      .filter(invoice => !inv || invoice.invoiceNumber.toLowerCase().includes(inv))
      .map(invoice => ({
        ...invoice,
        containers: invoice.containers.filter((c: any) => {
          const matchCont = !cont || c.containerNumber?.toLowerCase().includes(cont);
          const matchChas = !chas || (c.chassisNumbers as string[] || []).some(
            ch => ch.toLowerCase().includes(chas)
          );
          const matchCab  = !cab  || (c.cabNumbers as string[] || []).some(
            cb => cb.toLowerCase().includes(cab)
          );
          return matchCont && matchChas && matchCab;
        })
      }))
      .filter(invoice => invoice.containers.length > 0);
  }

  get filteredTotalContainers(): number {
    return this.filteredInvoices.reduce((sum, inv) => sum + inv.containers.length, 0);
  }

  // ============================================
  // HELPERS
  // ============================================

  getObjectKeys(obj: any): string[] {
    return Object.keys(obj);
  }
}