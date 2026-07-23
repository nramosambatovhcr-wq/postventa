import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import {
  InvoicesVehiService,
  InvoiceVehiDto,
  InvoiceDetailVehiDto,
  InvoiceWithDetailsVehiDto,
  CreateInvoiceVehiDto,
  UpdateInvoiceVehiDto,
  InvoiceVehiStatsDto
} from '../../services/invoices-vehi.service';
import * as XLSX from 'xlsx';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// ============================================
// INTERFACES LOCALES
// ============================================

interface InvoiceFormData {
  invoiceNumber: string;
  invoiceDate: string;
  blId: number | undefined;
  customerId: number | undefined;
  currency: string;
  status: 'issued' | 'paid' | 'pending' | 'cancelled';
  totalAmount: number;
  paymentTerms: string;
  dueDate: string;
  notes: string;
}

interface BlOption {
  id: number;
  blNumber: string;
  vesselName?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
}

@Component({
  selector: 'app-invoicevehi',
  templateUrl: './invoicevehi.component.html',
  styleUrls: ['./invoicevehi.component.css']
})
export class InvoicevehiComponent implements OnInit, OnDestroy {

  // ============================================
  // STATE
  // ============================================

  invoices: InvoiceVehiDto[] = [];
  stats: InvoiceVehiStatsDto | null = null;
  loading = false;
  error: string | null = null;
  isSubmitting = false;

  // Filtros
  searchTerm = '';
  selectedBlId: number | null = null;

  // Control de modales
  showCreateModal = false;
  showEditModal = false;
  showUploadModal = false;
  showDetailModal = false;

  // Formularios
  newInvoice: InvoiceFormData = this.getInitialForm();
  editInvoiceData: Partial<InvoiceFormData> = {};
  selectedInvoice: InvoiceVehiDto | null = null;

  // Detalle completo (invoice + líneas)
  invoiceWithDetails: InvoiceWithDetailsVehiDto | null = null;
  loadingDetails = false;

  // Excel upload
  excelFile: File | null = null;
  excelPreview: any[] = [];
  uploadErrors: string[] = [];

  // Lista auxiliar de BLs (se puede conectar a otro servicio si existe)
  blList: BlOption[] = [];

  private destroy$ = new Subject<void>();

  readonly statusOptions = [
    { value: 'issued'    as const, label: 'Emitida'    },
    { value: 'paid'      as const, label: 'Pagada'     },
    { value: 'pending'   as const, label: 'Pendiente'  },
    { value: 'cancelled' as const, label: 'Cancelada'  }
  ];

  readonly currencyOptions = ['USD', 'EUR', 'CNY', 'GBP'];

  constructor(
    private invoicesService: InvoicesVehiService,
    private router: Router
  ) {}

  // ============================================
  // LIFECYCLE
  // ============================================

  ngOnInit(): void {
    this.loadInvoices();
    this.loadStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================
  // FORM INITIALIZER
  // ============================================

  private getInitialForm(): InvoiceFormData {
    return {
      invoiceNumber: '',
      invoiceDate:   new Date().toISOString().split('T')[0],
      blId:          undefined,
      customerId:    undefined,
      currency:      'USD',
      status:        'issued',
      totalAmount:   0,
      paymentTerms:  '',
      dueDate:       '',
      notes:         ''
    };
  }

  // ============================================
  // DATA LOADING
  // ============================================

  loadInvoices(): void {
    this.loading = true;
    this.error = null;

    this.invoicesService.getAllInvoices(
      this.selectedBlId  ?? undefined,
      undefined,                          // customerId
      undefined,                          // status
      this.searchTerm || undefined        // invoiceNumber
    )
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (data) => {
        this.invoices = this.invoicesService.sortByDate(data);
        this.loading  = false;
      },
      error: (err) => {
        this.error   = 'Error al cargar invoices: ' + (err.message ?? err);
        this.loading = false;
        console.error('loadInvoices error:', err);
      }
    });
  }

  loadStats(): void {
    this.invoicesService.getInvoiceStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  (s)   => { this.stats = s; },
        error: (err) => { console.error('loadStats error:', err); }
      });
  }

  // ============================================
  // COMPUTED / FILTERS
  // ============================================

  get filteredInvoices(): InvoiceVehiDto[] {
    return this.invoicesService.searchInList(this.invoices, this.searchTerm);
  }

  clearFilters(): void {
    this.searchTerm  = '';
    this.selectedBlId = null;
    this.loadInvoices();
  }

  // ============================================
  // STATUS HELPERS — INVOICE
  // ============================================

  getStatusClass(status: string | undefined): string {
    const map: Record<string, string> = {
      issued:    'primary',
      paid:      'success',
      pending:   'warning',
      cancelled: 'danger'
    };
    return map[status ?? 'issued'] ?? 'secondary';
  }

  getStatusLabel(status: string | undefined): string {
    const map: Record<string, string> = {
      issued:    'Emitida',
      paid:      'Pagada',
      pending:   'Pendiente',
      cancelled: 'Cancelada'
    };
    return map[status ?? 'issued'] ?? status ?? 'Desconocido';
  }

  // ============================================
  // CALCULATION HELPERS
  // ============================================

  getAverageWeight(invoice: InvoiceVehiDto): number {
    if (!invoice.containerCount || invoice.containerCount === 0) return 0;
    return +(invoice.totalGrossWeight / invoice.containerCount).toFixed(2);
  }

  calcDetailTotal(details: InvoiceDetailVehiDto[]): number {
    return this.invoicesService.calcInvoiceTotal(details);
  }

  // ============================================
  // MODAL CONTROLS
  // ============================================

  openCreateModal(): void {
    this.newInvoice = this.getInitialForm();
    this.error = null;
    this.showCreateModal = true;
    this.lockBodyScroll();
  }

  openEditModal(invoice: InvoiceVehiDto): void {
    this.selectedInvoice = invoice;
    this.editInvoiceData = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate:   invoice.invoiceDate,
      blId:          invoice.blId,
      customerId:    invoice.customerId,
      currency:      invoice.currency,
      status:        (invoice.status as any) ?? 'issued',
      totalAmount:   invoice.totalAmount,
      paymentTerms:  invoice.paymentTerms ?? '',
      dueDate:       invoice.dueDate ?? '',
      notes:         invoice.notes ?? ''
    };
    this.error = null;
    this.showEditModal = true;
    this.lockBodyScroll();
  }

  openDetailModal(invoice: InvoiceVehiDto): void {
    this.selectedInvoice    = invoice;
    this.invoiceWithDetails = null;
    this.loadingDetails     = true;
    this.showDetailModal    = true;
    this.lockBodyScroll();

    this.invoicesService.getInvoiceWithDetails(invoice.invoiceId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.invoiceWithDetails = data;
          this.selectedInvoice    = data.invoice;
          this.loadingDetails     = false;
        },
        error: (err) => {
          this.loadingDetails = false;
          console.error('Error cargando detalle de invoice:', err);
        }
      });
  }

  openUploadModal(): void {
    this.excelFile    = null;
    this.excelPreview = [];
    this.uploadErrors = [];
    this.showUploadModal = true;
    this.lockBodyScroll();
  }

  closeModal(): void {
    this.showCreateModal = false;
    this.showEditModal   = false;
    this.showUploadModal = false;
    this.showDetailModal = false;
    this.isSubmitting    = false;
    this.unlockBodyScroll();
  }

  closeModalOnOverlay(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  private lockBodyScroll():   void { document.body.style.overflow = 'hidden'; }
  private unlockBodyScroll(): void { document.body.style.overflow = '';       }

  // ============================================
  // CRUD — CREATE
  // ============================================

  createInvoice(): void {
    const validation = this.invoicesService.validateInvoice(this.newInvoice as CreateInvoiceVehiDto);
    if (!validation.valid) {
      this.error = validation.errors.join(' | ');
      return;
    }

    this.isSubmitting = true;
    this.error = null;

    const dto: CreateInvoiceVehiDto = {
      invoiceNumber: this.newInvoice.invoiceNumber,
      invoiceDate:   this.newInvoice.invoiceDate   || undefined,
      blId:          this.newInvoice.blId          || undefined,
      customerId:    this.newInvoice.customerId    || undefined,
      currency:      this.newInvoice.currency      || undefined,
      status:        this.newInvoice.status        || undefined,
      totalAmount:   this.newInvoice.totalAmount,
      paymentTerms:  this.newInvoice.paymentTerms  || undefined,
      dueDate:       this.newInvoice.dueDate       || undefined,
      notes:         this.newInvoice.notes         || undefined
    };

    this.invoicesService.createInvoice(dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          console.log('Invoice creada:', res);
          this.closeModal();
          this.loadInvoices();
          this.loadStats();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.error = 'Error al crear invoice: ' + (err.message ?? err);
          console.error('createInvoice error:', err);
        }
      });
  }

  // ============================================
  // CRUD — UPDATE
  // ============================================

  updateInvoice(): void {
    const id = this.selectedInvoice?.invoiceId;
    if (!id) { this.error = 'ID de invoice no encontrado'; return; }

    this.isSubmitting = true;
    this.error = null;

    const dto: UpdateInvoiceVehiDto = {
      invoiceNumber: this.editInvoiceData.invoiceNumber,
      invoiceDate:   this.editInvoiceData.invoiceDate   || undefined,
      blId:          this.editInvoiceData.blId          || undefined,
      customerId:    this.editInvoiceData.customerId    || undefined,
      currency:      this.editInvoiceData.currency      || undefined,
      status:        this.editInvoiceData.status        || undefined,
      totalAmount:   this.editInvoiceData.totalAmount,
      paymentTerms:  this.editInvoiceData.paymentTerms  || undefined,
      dueDate:       this.editInvoiceData.dueDate       || undefined,
      notes:         this.editInvoiceData.notes         || undefined
    };

    this.invoicesService.updateInvoice(id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          console.log('Invoice actualizada:', res);
          this.closeModal();
          this.loadInvoices();
          this.loadStats();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.error = 'Error al actualizar invoice: ' + (err.message ?? err);
          console.error('updateInvoice error:', err);
        }
      });
  }

  // ============================================
  // CRUD — DELETE
  // ============================================

  deleteInvoice(invoice: InvoiceVehiDto): void {
    if (!confirm(`¿Eliminar la invoice ${invoice.invoiceNumber}? Esta acción no se puede deshacer.`)) return;

    this.invoicesService.deleteInvoice(invoice.invoiceId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          console.log('Invoice eliminada:', res);
          this.loadInvoices();
          this.loadStats();
        },
        error: (err) => {
          this.error = 'Error al eliminar invoice: ' + (err.message ?? err);
          console.error('deleteInvoice error:', err);
        }
      });
  }

  // ============================================
  // EXCEL UPLOAD
  // ============================================

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    this.excelFile    = file;
    this.uploadErrors = [];

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const data      = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook  = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData  = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[];
      this.processExcelData(jsonData);
    };
    reader.readAsArrayBuffer(file);
  }

  private processExcelData(data: any[]): void {
    if (data.length === 0) { this.uploadErrors.push('El archivo está vacío'); return; }

    const headers = data[0] as string[];
    const required = ['invoiceNumber', 'totalAmount'];
    const missing  = required.filter(c => !headers.includes(c));
    if (missing.length > 0) {
      this.uploadErrors.push(`Columnas faltantes: ${missing.join(', ')}`);
    }

    this.excelPreview = data.slice(1, 6).map((row, i) => {
      const obj: any = { '#': i + 2 };
      headers.forEach((h, idx) => { obj[h] = row[idx]; });
      return obj;
    });
  }

  uploadExcel(): void {
    if (!this.excelFile || this.uploadErrors.length > 0) return;

    this.isSubmitting = true;
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      const data      = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook  = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows      = XLSX.utils.sheet_to_json(firstSheet) as any[];

      // Crear invoices secuencialmente usando el servicio
      const dtos: CreateInvoiceVehiDto[] = rows
        .filter(r => r.invoiceNumber)
        .map(r => ({
          invoiceNumber: r.invoiceNumber ?? r.InvoiceNumber,
          invoiceDate:   r.invoiceDate   ?? r.InvoiceDate,
          blId:          r.blId          ?? r.BlId,
          customerId:    r.customerId    ?? r.CustomerId,
          currency:      r.currency      ?? r.Currency ?? 'USD',
          totalAmount:   +(r.totalAmount ?? r.TotalAmount ?? 0),
          status:        r.status        ?? r.Status,
          notes:         r.notes         ?? r.Notes
        }));

      // Crear una por una (si se necesita bulk, se puede adaptar)
      let created = 0;
      const createNext = (index: number) => {
        if (index >= dtos.length) {
          this.isSubmitting = false;
          this.closeModal();
          this.loadInvoices();
          this.loadStats();
          alert(`✅ ${created} invoices cargadas correctamente.`);
          return;
        }
        this.invoicesService.createInvoice(dtos[index])
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next:  ()  => { created++; createNext(index + 1); },
            error: (err) => {
              this.isSubmitting = false;
              this.error = `Error en fila ${index + 2}: ${err.message ?? err}`;
            }
          });
      };
      createNext(0);
    };

    reader.readAsArrayBuffer(this.excelFile);
  }

  // ============================================
  // NAVIGATION
  // ============================================

  goToBlDetail(blId: number | undefined): void {
    if (blId) this.router.navigate(['/bl-vehi', blId]);
  }

  // ============================================
  // HELPERS
  // ============================================

  getObjectKeys(obj: Record<string, any> | null | undefined): string[] {
    return obj ? Object.keys(obj) : [];
  }
}