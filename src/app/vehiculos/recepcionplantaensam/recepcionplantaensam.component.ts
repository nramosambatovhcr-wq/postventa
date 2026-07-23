// recepcionplantaensam.component.ts
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ContainerReceptionDto, ContainerReceptionDetailDto, ReceptionStatsDto, TransportCompanyDto, DriverDto, TransportUnitDto, CreateContainerReceptionDto, UpdateContainerReceptionDto, ContainerReceptionService } from 'src/app/services/container-reception.service';


@Component({
  selector: 'app-recepcionplantaensam',
  templateUrl: './recepcionplantaensam.component.html',
  styleUrls: ['./recepcionplantaensam.component.css']
})
export class RecepcionplantaensamComponent implements OnInit {
  
  // Datos
  receptions: ContainerReceptionDto[] = [];
  filteredReceptions: ContainerReceptionDto[] = [];
  selectedReception?: ContainerReceptionDetailDto;
  stats: ReceptionStatsDto = {
    totalReceptions: 0,
    pendingReceptions: 0,
    completedReceptions: 0,
    todayReceptions: 0,
    weekReceptions: 0
  };

  // Catálogos
  companies: TransportCompanyDto[] = [];
  drivers: DriverDto[] = [];
  units: TransportUnitDto[] = [];

  // Filtros
  searchTerm: string = '';
  filterStatus: string = '';
  filterDateFrom: string = '';
  filterDateTo: string = '';

  // Formulario
  formData: CreateContainerReceptionDto = {
    companyId: 0,
    driverId: 0,
    unitId: 0
  };
  editFormData: UpdateContainerReceptionDto = {};
  isEditing: boolean = false;
  currentReceptionId?: number;

  // Referencias a modales
  @ViewChild('createModal') createModal!: ElementRef;
  @ViewChild('detailModal') detailModal!: ElementRef;
  @ViewChild('deleteModal') deleteModal!: ElementRef;
  @ViewChild('exitModal') exitModal!: ElementRef;

  // Control de modales
  activeModal: string | null = null;
  receivedByName: string = '';

  // Fotos (formulario crear)
  newPhotoType: string = '';
  selectedPhotoFile?: File;
  fotosForm: { tipo: string; archivo: File; preview: string }[] = [];

  // Sellos (formulario crear)
  sellosForm: { numero: string; mecanismos: string; tirar: string; torcer: string }[] = [];

  // Entrada directa de conductor y placa
  driverNameDirect: string = '';
  driverIdCardDirect: string = '';
  plateNumberDirect: string = '';

  // Inspección de contenedor (formulario crear)
  inspeccionForm: { elemento: string; estado: string; observacion: string }[] = [
    { elemento: 'Piso',               estado: '', observacion: '' },
    { elemento: 'Paredes laterales',  estado: '', observacion: '' },
    { elemento: 'Techo',              estado: '', observacion: '' },
    { elemento: 'Puertas',            estado: '', observacion: '' },
    { elemento: 'Bisagras',           estado: '', observacion: '' },
    { elemento: 'Ventilación',        estado: '', observacion: '' },
    { elemento: 'Estructura externa', estado: '', observacion: '' },
  ];

  constructor(public receptionService: ContainerReceptionService) {}

  ngOnInit(): void {
    this.loadData();
    this.loadCatalogs();
  }

  // ============================================
  // CARGA DE DATOS
  // ============================================

  loadData(): void {
    // Cargar recepciones
    this.receptionService.getAllReceptions().subscribe({
      next: (data) => {
        this.receptions = this.receptionService.sortReceptionsByDate(data);
        this.applyFilters();
      },
      error: (err) => console.error('Error cargando recepciones:', err)
    });

    // Cargar estadísticas
    this.receptionService.getStatistics().subscribe({
      next: (data) => this.stats = data,
      error: (err) => console.error('Error cargando estadísticas:', err)
    });
  }

  loadCatalogs(): void {
    this.receptionService.getAllCompanies(true).subscribe({
      next: (data) => this.companies = data,
      error: (err) => console.error('Error cargando empresas:', err)
    });
  }

  loadDriversByCompany(companyId: number): void {
    this.receptionService.getDriversByCompany(companyId).subscribe({
      next: (data) => this.drivers = data,
      error: (err) => console.error('Error cargando conductores:', err)
    });
  }

  loadUnitsByCompany(companyId: number): void {
    this.receptionService.getUnitsByCompany(companyId).subscribe({
      next: (data) => this.units = data,
      error: (err) => console.error('Error cargando unidades:', err)
    });
  }

  // ============================================
  // FILTROS
  // ============================================

  applyFilters(): void {
    let result = [...this.receptions];

    // Filtro de búsqueda
    if (this.searchTerm) {
      result = this.receptionService.searchReceptions(result, this.searchTerm);
    }

    // Filtro por estado
    if (this.filterStatus) {
      result = result.filter(r => r.receptionStatus === this.filterStatus);
    }

    // Filtro por fecha
    if (this.filterDateFrom) {
      result = result.filter(r => r.entryDate >= this.filterDateFrom);
    }
    if (this.filterDateTo) {
      result = result.filter(r => r.entryDate <= this.filterDateTo);
    }

    this.filteredReceptions = result;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterStatus = '';
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.applyFilters();
  }

  // ============================================
  // MODALES - CONTROL
  // ============================================

  openModal(modalName: string): void {
    this.activeModal = modalName;
    document.body.classList.add('modal-open');
  }

  closeModal(): void {
    this.activeModal = null;
    document.body.classList.remove('modal-open');
    this.resetForm();
  }

  closeModalOnOverlay(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal')) {
      this.closeModal();
    }
  }

getCurrentTime(): string {
  const now = new Date();
  return now.toTimeString().substring(0, 5); // Formato "HH:mm"
}

/**
 * Obtiene la fecha actual formateada para input type="date"
 */
getCurrentDate(): string {
  return new Date().toISOString().split('T')[0]; // Formato "YYYY-MM-DD"
}

  // ============================================
  // CREAR RECEPCIÓN
  // ============================================

  onCompanyChange(companyId: number): void {
    this.formData.companyId = companyId;
    this.formData.driverId = 0;
    this.formData.unitId = 0;
    this.loadDriversByCompany(companyId);
    this.loadUnitsByCompany(companyId);
  }

  createReception(): void {
    // ── Validaciones ──────────────────────────────────────────
    if (!this.formData.companyId) {
      alert('Por favor seleccione la empresa de transporte');
      return;
    }
    if (!this.driverNameDirect.trim()) {
      alert('Por favor ingrese el nombre del conductor');
      return;
    }
    if (!this.plateNumberDirect.trim()) {
      alert('Por favor ingrese la placa de la unidad');
      return;
    }

    // Establecer fecha/hora actual si no se proporcionaron
    if (!this.formData.entryDate) {
      this.formData.entryDate = new Date().toISOString().split('T')[0];
    }
    if (!this.formData.entryTime) {
      this.formData.entryTime = new Date().toTimeString().substring(0, 5);
    }
    if (this.formData.containerNumber) {
      this.formData.containerNumber = this.receptionService.formatContainerNumber(this.formData.containerNumber);
    }

    // ── Paso 1: Buscar o crear conductor ──────────────────────
    this.receptionService.findOrCreateDriver(
      this.formData.companyId,
      this.driverNameDirect.trim(),
      this.driverIdCardDirect.trim() || undefined
    ).subscribe({
      next: (driverResp) => {

        // ── Paso 2: Buscar o crear unidad ─────────────────────
        this.receptionService.findOrCreateUnit(
          this.formData.companyId,
          this.plateNumberDirect.trim().toUpperCase()
        ).subscribe({
          next: (unitResp) => {

            // ── Paso 3: Crear recepción con IDs reales ────────
            const payload: CreateContainerReceptionDto = {
              ...this.formData,
              companyId: this.formData.companyId,
              driverId: driverResp.id,
              unitId: unitResp.id,
            };

            this.receptionService.createReception(payload).subscribe({
              next: (response) => {
                if (response.success) {
                  alert('Recepción creada exitosamente');
                  this.closeModal();
                  this.loadData();
                }
              },
              error: (err) => {
                const msg = err.error?.message ?? err.message ?? 'Error desconocido';
                alert('Error al crear recepción: ' + msg);
              }
            });

          },
          error: (err) => {
            const msg = err.error?.message ?? err.message ?? 'Error desconocido';
            alert('Error al registrar unidad/placa: ' + msg);
          }
        });

      },
      error: (err) => {
        const msg = err.error?.message ?? err.message ?? 'Error desconocido';
        alert('Error al registrar conductor: ' + msg);
      }
    });
  }

  // ============================================
  // VER DETALLE
  // ============================================

  viewDetail(reception: ContainerReceptionDto): void {
    this.receptionService.getReceptionById(reception.receptionId).subscribe({
      next: (data) => {
        this.selectedReception = data;
        this.openModal('detail');
      },
      error: (err) => console.error('Error cargando detalle:', err)
    });
  }

  // ============================================
  // EDITAR RECEPCIÓN
  // ============================================

  openEditModal(reception: ContainerReceptionDto): void {
    const canEdit = this.receptionService.canEditReception(reception);
    if (!canEdit.canEdit) {
      alert(canEdit.reason);
      return;
    }

    this.isEditing = true;
    this.currentReceptionId = reception.receptionId;
    
    // Cargar catálogos de la empresa
    this.loadDriversByCompany(reception.companyId);
    this.loadUnitsByCompany(reception.companyId);

    // Preparar datos del formulario
    this.editFormData = {
      companyId: reception.companyId,
      driverId: reception.driverId,
      unitId: reception.unitId,
      containerNumber: reception.containerNumber,
      containerType: reception.containerType,
      sealNumber: reception.sealNumber,
      blNumber: reception.blNumber,
      generalObservations: reception.generalObservations,
      deliveredBy: reception.deliveredBy,
      receivedBy: reception.receivedBy
    };

    this.openModal('edit');
  }

  updateReception(): void {
    if (!this.currentReceptionId) return;

    this.receptionService.updateReception(this.currentReceptionId, this.editFormData).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Recepción actualizada exitosamente');
          this.closeModal();
          this.loadData();
        }
      },
      error: (err) => {
        alert('Error al actualizar: ' + err.error?.message || err.message);
      }
    });
  }

  // ============================================
  // ELIMINAR RECEPCIÓN
  // ============================================

  confirmDelete(reception: ContainerReceptionDto): void {
    const canDelete = this.receptionService.canDeleteReception(reception);
    if (!canDelete.canDelete) {
      alert(canDelete.reason);
      return;
    }

    this.selectedReception = reception as any;
    this.openModal('delete');
  }

  deleteReception(): void {
    if (!this.selectedReception) return;

    this.receptionService.deleteReception(this.selectedReception.receptionId).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Recepción eliminada exitosamente');
          this.closeModal();
          this.loadData();
        }
      },
      error: (err) => {
        alert('Error al eliminar: ' + err.error?.message || err.message);
      }
    });
  }

  // ============================================
  // REGISTRAR SALIDA
  // ============================================

  openExitModal(reception: ContainerReceptionDto | ContainerReceptionDetailDto): void {
    const canExit = this.receptionService.canRegisterExit(reception);
    if (!canExit.canExit) {
      alert(canExit.reason);
      return;
    }

    this.currentReceptionId = reception.receptionId;
    this.receivedByName = '';
    this.openModal('exit');
  }

  registerExit(): void {
    if (!this.currentReceptionId) return;

    this.receptionService.registerExit(this.currentReceptionId, this.receivedByName).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Salida registrada exitosamente');
          this.closeModal();
          this.loadData();
        }
      },
      error: (err) => {
        alert('Error al registrar salida: ' + err.error?.message || err.message);
      }
    });
  }

  // ============================================
  // UTILIDADES
  // ============================================

  resetForm(): void {
    this.formData = { companyId: 0, driverId: 0, unitId: 0 };
    this.editFormData = {};
    this.isEditing = false;
    this.currentReceptionId = undefined;
    this.drivers = [];
    this.units = [];
    this.receivedByName = '';
    // Limpiar campos directos
    this.driverNameDirect = '';
    this.driverIdCardDirect = '';
    this.plateNumberDirect = '';
    // Limpiar fotos, sellos e inspección
    this.fotosForm = [];
    this.sellosForm = [];
    this.newPhotoType = '';
    this.selectedPhotoFile = undefined;
    this.inspeccionForm = [
      { elemento: 'Piso',               estado: '', observacion: '' },
      { elemento: 'Paredes laterales',  estado: '', observacion: '' },
      { elemento: 'Techo',              estado: '', observacion: '' },
      { elemento: 'Puertas',            estado: '', observacion: '' },
      { elemento: 'Bisagras',           estado: '', observacion: '' },
      { elemento: 'Ventilación',        estado: '', observacion: '' },
      { elemento: 'Estructura externa', estado: '', observacion: '' },
    ];
  }

  // ============================================
  // FOTOS
  // ============================================

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedPhotoFile = input.files[0];
    }
  }

  addPhoto(): void {
    if (!this.selectedPhotoFile || !this.newPhotoType) {
      alert('Seleccione el tipo de foto y el archivo de imagen');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      this.fotosForm.push({
        tipo: this.newPhotoType,
        archivo: this.selectedPhotoFile!,
        preview: e.target?.result as string
      });
      this.newPhotoType = '';
      this.selectedPhotoFile = undefined;
    };
    reader.readAsDataURL(this.selectedPhotoFile);
  }

  removePhoto(index: number): void {
    this.fotosForm.splice(index, 1);
  }

  // ============================================
  // SELLOS
  // ============================================

  addSello(): void {
    this.sellosForm.push({ numero: '', mecanismos: '', tirar: '', torcer: '' });
  }

  removeSello(index: number): void {
    this.sellosForm.splice(index, 1);
  }

  getStatusClass(status: string): string {
    return this.receptionService.getStatusClass(status);
  }

  getStatusText(status: string): string {
    return this.receptionService.getStatusText(status);
  }

  formatDate(date: string): string {
    return this.receptionService.formatDateForDisplay(date);
  }

  formatTime(time: string): string {
    return this.receptionService.formatTimeForDisplay(time);
  }

  calculateDuration(reception: ContainerReceptionDto): string {
    return this.receptionService.calculateDuration(
      reception.entryDate,
      reception.entryTime,
      reception.exitTime
    );
  }

  // Exportar a CSV
  exportToCsv(): void {
    const csv = this.receptionService.exportReceptionsToCsv(this.filteredReceptions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `recepciones_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  // URL de fotos
  getPhotoUrl(fileName: string): string {
    // Construye la URL de la foto; ajusta el base path según tu API
    return `/api/photos/${fileName}`;
  }

  // Imprimir reporte
  printReport(reception: ContainerReceptionDto): void {
    this.receptionService.getReceptionById(reception.receptionId).subscribe({
      next: (detail) => {
        const report = this.receptionService.generateReceptionReport(detail);
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head><title>Reporte Recepción ${reception.receptionId}</title></head>
              <body><pre>${report}</pre></body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
        }
      }
    });
  }
}