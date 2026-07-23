import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { saveAs } from 'file-saver';
import { catchError, finalize, forkJoin, of, Subscription } from 'rxjs';
import { Usuario } from '../../models/usuario';
import { AuthService } from '../../services/auth.service';
import { PedidobodegaService } from '../../services/pedidobodega.service';
import { ReloadService } from '../../services/reload.service';
import * as XLSX from 'xlsx';
import { ApiResponse, BlActivoOracle, BlService, ImportRowDetail } from 'src/app/services/bl.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface InvoiceBlItem {
  id: number;
  ordenid?: number;       // ← orden de compra asociada
  invoiceNumber: string;
  blNumber: string;
  creationDate: string;
  description: string;
  status: string;
  faduana?: string;
  fpreliquidacion?: string;
  farribob?: string;
  farrivop?: string;
  valorInvoice?: number;  // ← FOB total del invoice (Σ detalleinvoicebl)
}

interface BlRawResponse {
  id: number;
  nombre: string;
  invoice: string;
  invoicebl: string;
  idinvoicebl: number;
  ordenid?: number;       // ← orden de compra asociada al invoicebl
  estado: string;
  fecha_creacion?: string;
  descripcion?: string;
  proveedor?: string; // ✅ Agregado
  faduana?: string;
  fpreliquidacion?: string;
  farribob?: string;
  farrivop?: string;
  // ── Valores económicos del endpoint GetDataByUsuario ──
  valorInvoice?: number;  // FOB total del invoice de esta fila
  valorBl?: number;       // FOB total de TODOS los invoices del BL (repetido por fila)
  itemsBl?: number;
  unidadesBl?: number;
}

interface BlResponse {
  id: number;
  nombre: string;
  invoice: string;
  invoicebl: string;
  idinvoicebl: number;
  ordenid?: number;       // ← orden de compra asociada al invoicebl
  estado: string;
  fecha_creacion?: string;
  proveedor?: string; // ✅ Asegurado
  proveedorId?: string; // ✅ id del proveedor desde Oracle (CEDURUC)
  descripcion?: string;
  invoiceBlItems: InvoiceBlItem[];
  fechaArribo?: string;
  porCargar?: boolean;       // ← true si viene de Oracle pero aún no está registrado
  fechaEmbarque?: string;    // ← fechas desde Oracle para BLs por cargar
  valorBl?: number;          // ← FOB total del BL (Σ de todos sus invoices)
  itemsBl?: number;          // ← total de líneas en detalleinvoicebl del BL
  unidadesBl?: number;       // ← total de unidades facturadas del BL
}

export interface BlDetailExcelDto {
  codigo: string;
  chino: string;
  descripcionEspanol: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  blNombre: string;
}

@Component({
  selector: 'app-dashboardbl',
  templateUrl: './dashboardbl.component.html',
  styleUrls: ['./dashboardbl.component.css']
})
export class DashboardblComponent implements OnInit, OnDestroy {
  stats = {
    totalImportaciones: 7,
    enTransito: 24,
    pendientesLiquidacion: 18,
    tiempoPromedio: 28
  };

  activeAccordion: number | null = null;

  // 🔥 NUEVOS FILTROS MEJORADOS
  searchTerm: string = '';
  filterBl: string = '';
  filterProveedor: string = '';
  filterEstado: string = '';
  filterInvoice: string = '';
  
  currentPage: number = 1;
  itemsPerPage: number = 30;
  totalPages: number = 0;
  lista: any[] = [];
  allData: BlResponse[] = [];
  filteredData: BlResponse[] = [];
  id: number = 0;
  usuario: Usuario | null = null;
  rolusuario:any;
  loading = false;
  private subscription = new Subscription();

  // Variables para filtros de fecha
  startDate: string = '';
  endDate: string = '';

  // Variables para modal de imagen
  isModalOpen: boolean = false;
  currentImageUrl: string = '';

  bls: BlResponse[] = [];
  selectedBl: BlResponse | null = null;

  // Modal
  isModalOpen1: boolean = false;

  // ─── Modal carga Excel para BL por cargar ────────────────────────────────
  modalCargarExcel: boolean = false;
  blParaCargar: BlResponse | null = null;
  excelCargarFile: File | null = null;
  excelCargarNombre: string = '';
  excelCargarStep: number = 1;
  excelCargarPreview: any[] = [];
  excelCargarErrores: string[] = [];
  excelCargarFilasInvalidas: number[] = [];
  excelCargarImportando: boolean = false;
  excelCargarProgreso: number = 0;
  excelCargarCompletado: boolean = false;
  excelCargarFallado: boolean = false;
  excelCargarMensaje: string = '';
  // Detalle fila por fila devuelto por el backend, incluye validación de
  // códigos contra el maestro de partes de Oracle (codigoValidado, etc.)
  excelCargarResultados: ImportRowDetail[] = [];
  excelCargarSoloNoValidados: boolean = false;
  modal = false;
  currentModalDataIndex: number | null = null;
  currentBlDetails: BlDetailExcelDto[] | any;
  isLoadingDetails: boolean = false;

  // ── Modal Pagos / Anticipos ──────────────────────────────────────────────
  modalPagos: boolean = false;
  blPagoSeleccionado: BlResponse | null = null;
  pagosCargando: boolean = false;
  pagosData: any = null;
  guardandoPago: boolean = false;
  subiendoDoc: boolean = false;
  pagoSeleccionadoId: number | null = null;

  pagoForm = {
    invoiceBlId:   null as number | null,
    ordenId:       null as number | null,
    blId:          null as number | null,
    monto:         null as number | null,
    moneda:        'USD',
    tipoPago:      'ANTICIPO',
    fechaPago:     new Date().toISOString().split('T')[0],
    referencia:    '',
    observaciones: '',
  };

  docFile: File | null = null;
  docTipo: string = 'COMPROBANTE';
  readonly API = 'https://bodega.vehicentro.com:1830/api/api';

  expandedInvoicesByBl: { [blIndex: number]: boolean } = {};

  // 🔥 LISTAS ÚNICAS PARA DROPDOWNS
  uniqueEstados: string[] = [];
  uniqueProveedores: string[] = [];

  // 🔥 NUEVA PROPIEDAD: Para controlar qué tarjeta está activa
  currentRoute: string = 'dashboardbl';

  constructor(
    private blService: BlService,
    private router: Router,
    private authService: AuthService,
    private pedidobodegaService: PedidobodegaService,
    private reloadService: ReloadService
  ) {
    // Detectar la ruta actual para marcar la tarjeta activa
    this.currentRoute = this.router.url.split('/')[1] || 'dashboardbl';
  }

  ngOnInit(): void {
    this.usuario = this.authService.getUsuarioActual();
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      console.log(this.usuario);
      if (this.usuario != null) {
        this.id = this.usuario.id;
         this.rolusuario=this.usuario.rol;
        console.log(this.id);
         if(this.rolusuario === 'admin' || this.rolusuario === 'laboratorio1' || this.rolusuario === 'laboratorio2'|| this.rolusuario === 'paqtana'){
          console.log(this.id);
        this.loadAllBls();
        }
        else{
          console.log(this.id);
        this.loadAllBlsid(this.id);
        }
        
      }
    });

    this.subscription.add(
      this.reloadService.reload$.subscribe(() => {
        this.loadAllBls();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  verBl(blId: number) {
    this.router.navigate(['/detailsbl', blId]);
  }

  openDetailsModal(blId: number): void {

     this.router.navigate(['/bldetalle', blId]);
   /* this.modal = true;
    this.isModalOpen1 = true;
    this.isLoadingDetails = true;
    this.currentBlDetails = [];

    this.blService.getAllDetailsCom(blId)
      .pipe(
        finalize(() => {
          this.isLoadingDetails = false;
        }),
        catchError(error => {
          console.error('Error al obtener los detalles del BL:', error);
          return [];
        })
      )
      .subscribe((details: BlDetailExcelDto[]) => {
        this.currentBlDetails = details;
      });*/
  }

  closeDetailsModal(): void {
    this.modal = false;
    this.isModalOpen1 = false;
    this.currentModalDataIndex = null;
  }

  downloadExcelDetails(): void {
    if (!this.currentBlDetails || this.currentBlDetails.length === 0) {
      console.warn('No hay detalles para descargar.');
      return;
    }

    const dataForExcel = this.currentBlDetails.map((item: any) => ({
      'Código': item.codigo,
      'Chino': item.chino,
      'Descripción': item.descripcionEspanol,
      'Cantidad': item.cantidad,
      'Unidad': item.unidad,
      'Precio Unitario': item.precioUnitario,
      'BL Nombre': item.blNombre
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook: XLSX.WorkBook = { Sheets: { 'Detalles': worksheet }, SheetNames: ['Detalles'] };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    const filename = `detalles_${this.selectedBl?.nombre || 'export'}_${new Date().toISOString().split('T')[0]}.xlsx`;

    saveAs(blob, filename);
  }

  // ✅ MÉTODO MEJORADO: Agrupar datos incluyendo proveedor
  private groupBlData(rawData: BlRawResponse[]): BlResponse[] {
    const blMap = new Map<string, BlResponse>();

    rawData.forEach(item => {
      const blNumber = item.nombre;

      if (blMap.has(blNumber)) {
        const existingBl = blMap.get(blNumber)!;

        const invoiceBlItem: InvoiceBlItem = {
          id: item.idinvoicebl,
          ordenid: item.ordenid,
          invoiceNumber: item.invoice || '',
          blNumber: item.nombre,
          creationDate: item.fecha_creacion || '',
          description: item.invoicebl || '',
          status: item.estado || '',
          faduana: item.faduana,
          fpreliquidacion: item.fpreliquidacion,
          farribob: item.farribob,
          farrivop: item.farrivop,
          valorInvoice: Number(item.valorInvoice) || 0
        };

        const isDuplicate = existingBl.invoiceBlItems.some(existing =>
          existing.id === invoiceBlItem.id &&
          existing.invoiceNumber === invoiceBlItem.invoiceNumber
        );

        if (!isDuplicate) {
          existingBl.invoiceBlItems.push(invoiceBlItem);
        }

        // valorBl viene repetido en cada fila del mismo BL (pre-agregado en
        // el backend), así que basta con asignarlo una vez. NO sumar.
        if (existingBl.valorBl == null && item.valorBl != null) {
          existingBl.valorBl     = Number(item.valorBl) || 0;
          existingBl.itemsBl     = Number(item.itemsBl) || 0;
          existingBl.unidadesBl  = Number(item.unidadesBl) || 0;
        }

        const fechaArribo = this.determinarFechaArribo(item);
        if (fechaArribo && (!existingBl.fechaArribo || new Date(fechaArribo) > new Date(existingBl.fechaArribo))) {
          existingBl.fechaArribo = fechaArribo;
        }

        // ✅ Actualizar proveedor si no existe
        if (!existingBl.proveedor && item.proveedor) {
          existingBl.proveedor = item.proveedor;
        }
      } else {
        const newBl: BlResponse = {
          id: item.id,
          nombre: item.nombre,
          invoice: item.invoice,
          invoicebl: item.invoicebl,
          idinvoicebl: item.idinvoicebl,
          ordenid: item.ordenid,
          estado: item.estado,
          fecha_creacion: item.fecha_creacion,
          proveedor: item.proveedor, // ✅ AGREGADO
          descripcion: item.descripcion,
          invoiceBlItems: [],
          fechaArribo: this.determinarFechaArribo(item),
          valorBl:     item.valorBl    != null ? Number(item.valorBl)    || 0 : undefined,
          itemsBl:     item.itemsBl    != null ? Number(item.itemsBl)    || 0 : undefined,
          unidadesBl:  item.unidadesBl != null ? Number(item.unidadesBl) || 0 : undefined
        };

        const invoiceBlItem: InvoiceBlItem = {
          id: item.idinvoicebl,
          ordenid: item.ordenid,
          invoiceNumber: item.invoice || '',
          blNumber: item.nombre,
          creationDate: item.fecha_creacion || '',
          description: item.descripcion || '',
          status: item.estado || '',
          faduana: item.faduana,
          fpreliquidacion: item.fpreliquidacion,
          farribob: item.farribob,
          farrivop: item.farrivop,
          valorInvoice: Number(item.valorInvoice) || 0
        };

        newBl.invoiceBlItems.push(invoiceBlItem);
        blMap.set(blNumber, newBl);
      }
    });

    return Array.from(blMap.values());
  }

  loadAllBls(): void {
    this.loading = true;

    // ── Cargar en paralelo: BLs registrados + BLs activos desde Oracle ──────
    forkJoin({
      registrados: this.blService.getAllBl(),
      oracleActivos: this.blService.getBlActivosOracle()
    }).subscribe({
      next: ({ registrados, oracleActivos }) => {
        console.log('BLs registrados:', registrados);
        console.log('BLs activos Oracle:', oracleActivos);

        // 1. Agrupar los BLs ya registrados (lógica original)
        const groupedData = this.groupBlData(registrados as BlRawResponse[]);

        // 2. Detectar BLs de Oracle que NO existen en los registrados
        //    Comparación por nombre (trim + uppercase para ser robusta)
        const nombresRegistrados = new Set(
          groupedData.map(bl => bl.nombre.trim().toUpperCase())
        );

        const blsPorCargar: BlResponse[] = oracleActivos
          .filter(ora => !nombresRegistrados.has((ora.bl ?? '').trim().toUpperCase()))
          .map(ora => ({
            id: 0,
            nombre:         ora.bl ?? '',
            invoice:        '',
            invoicebl:      '',
            idinvoicebl:    0,
            estado:         'POR CARGAR',
            invoiceBlItems: [],
            proveedor:      ora.proveedor ?? '',
            proveedorId:    ora.proveedorId ?? '',
            fechaArribo:    ora.fechaArribo   ? new Date(ora.fechaArribo).toISOString()   : undefined,
            fechaEmbarque:  ora.fechaEmbarque ? new Date(ora.fechaEmbarque).toISOString() : undefined,
            porCargar:      true
          }));

        console.log(`BLs por cargar (en Oracle pero no registrados): ${blsPorCargar.length}`);

        // 3. Combinar: registrados primero, luego los por cargar al final
        this.allData = [...groupedData, ...blsPorCargar];

        this.extractUniqueValues();
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar los BLs:', error);
        // Si Oracle falla, cargar solo los registrados (fallback)
        this.blService.getAllBl().subscribe({
          next: (data: BlRawResponse[]) => {
            this.allData = this.groupBlData(data);
            this.extractUniqueValues();
            this.applyFilters();
            this.loading = false;
          },
          error: () => { this.loading = false; }
        });
      }
    });
  }

  loadAllBlsid(id: any): void {
    this.loading = true;

    forkJoin({
      registrados:   this.blService.getAllBlid(id).pipe(catchError(() => of([]))),
      oracleActivos: this.blService.getBlActivosOracle().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ registrados, oracleActivos }) => {
        console.log('BLs registrados (usuario):', registrados);
        console.log('BLs activos Oracle:', oracleActivos);

        const groupedData = this.groupBlData(registrados as BlRawResponse[]);

        const nombresRegistrados = new Set(
          groupedData.map(bl => bl.nombre.trim().toUpperCase())
        );

        const blsPorCargar: BlResponse[] = (oracleActivos as BlActivoOracle[])
          .filter(ora => !nombresRegistrados.has((ora.bl ?? '').trim().toUpperCase()))
          .map(ora => ({
            id: 0,
            nombre:         ora.bl ?? '',
            invoice:        '',
            invoicebl:      '',
            idinvoicebl:    0,
            estado:         'POR CARGAR',
            invoiceBlItems: [],
            proveedor:      ora.proveedor ?? '',
            proveedorId:    ora.proveedorId ?? '',
            fechaArribo:    ora.fechaArribo   ? new Date(ora.fechaArribo).toISOString()   : undefined,
            fechaEmbarque:  ora.fechaEmbarque ? new Date(ora.fechaEmbarque).toISOString() : undefined,
            porCargar:      true
          }));

        console.log(`BLs por cargar: ${blsPorCargar.length}`);

        this.allData = [...groupedData, ...blsPorCargar];
        this.extractUniqueValues();
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar los BLs:', error);
        this.loading = false;
      }
    });
  }

  // 🔥 NUEVO: Extraer valores únicos para dropdowns
  private extractUniqueValues(): void {
    const estados = new Set<string>();
    const proveedores = new Set<string>();

    this.allData.forEach(bl => {
      if (bl.estado) estados.add(bl.estado);
      if (bl.proveedor) proveedores.add(bl.proveedor);
    });

    this.uniqueEstados = Array.from(estados).sort();
    this.uniqueProveedores = Array.from(proveedores).sort();
  }

  // 🔥 MÉTODO MEJORADO: Aplicar todos los filtros
  applyFilters(): void {
    let tempFilteredData = this.allData;

    // Filtro por rango de fechas
    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate).setHours(0, 0, 0, 0);
      const end = new Date(this.endDate).setHours(23, 59, 59, 999);

      tempFilteredData = tempFilteredData.filter(item => {
        const itemDate = new Date(item.fecha_creacion || '').getTime();
        const arriboDate = item.fechaArribo ? new Date(item.fechaArribo).getTime() : null;

        return (itemDate >= start && itemDate <= end) ||
          (arriboDate && arriboDate >= start && arriboDate <= end);
      });
    }

    // 🔥 Filtro por BL
    if (this.filterBl) {
      const blFilter = this.filterBl.toLowerCase();
      tempFilteredData = tempFilteredData.filter(item =>
        item.nombre && item.nombre.toLowerCase().includes(blFilter)
      );
    }

    // 🔥 Filtro por Proveedor
    if (this.filterProveedor) {
      tempFilteredData = tempFilteredData.filter(item =>
        item.proveedor === this.filterProveedor
      );
    }

    // 🔥 Filtro por Estado
    if (this.filterEstado) {
      tempFilteredData = tempFilteredData.filter(item =>
        item.estado === this.filterEstado
      );
    }

    // 🔥 Filtro por Invoice
    if (this.filterInvoice) {
      const invoiceFilter = this.filterInvoice.toLowerCase();
      tempFilteredData = tempFilteredData.filter(item =>
        (item.invoice && item.invoice.toLowerCase().includes(invoiceFilter)) ||
        (item.invoiceBlItems && item.invoiceBlItems.some(inv =>
          inv.invoiceNumber.toLowerCase().includes(invoiceFilter)
        ))
      );
    }

    // Búsqueda general (searchTerm)
    if (this.searchTerm) {
      const lowerCaseSearchTerm = this.searchTerm.toLowerCase();
      tempFilteredData = tempFilteredData.filter(item =>
        (item.nombre && item.nombre.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (item.invoice && item.invoice.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (item.invoicebl && item.invoicebl.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (item.estado && item.estado.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (item.proveedor && item.proveedor.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (item.descripcion && item.descripcion.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (item.fechaArribo && item.fechaArribo.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (item.invoiceBlItems && item.invoiceBlItems.some((invoiceBl: InvoiceBlItem) =>
          invoiceBl.invoiceNumber.toLowerCase().includes(lowerCaseSearchTerm) ||
          invoiceBl.description.toLowerCase().includes(lowerCaseSearchTerm) ||
          invoiceBl.status.toLowerCase().includes(lowerCaseSearchTerm)
        ))
      );
    }

    // BLs "POR CARGAR" siempre al inicio
    this.filteredData = [
      ...tempFilteredData.filter(bl => (bl as any).porCargar),
      ...tempFilteredData.filter(bl => !(bl as any).porCargar)
    ];

    this.totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
    this.currentPage = 1;
    this.updatePaginationInfo();

    this.closeAllAccordions();
  }

  // 🔥 NUEVO: Limpiar todos los filtros
  clearAllFilters(): void {
    this.searchTerm = '';
    this.filterBl = '';
    this.filterProveedor = '';
    this.filterEstado = '';
    this.filterInvoice = '';
    this.startDate = '';
    this.endDate = '';
    this.applyFilters();
  }

  searchImports(): void {
    this.applyFilters();
  }

  updatePaginationInfo(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.lista = this.filteredData.slice(startIndex, endIndex);
    this.bls = this.lista; // ← tabla usa bls, paginación usa lista
  }

  changePage(page: any): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginationInfo();
    }
  }

  getPaginationArray(): (number | string)[] {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 5;
    const startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push('...');
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < this.totalPages) {
      if (endPage < this.totalPages - 1) {
        pages.push('...');
      }
      pages.push(this.totalPages);
    }
    return pages;
  }

  bl(): void {
    this.router.navigate(['/dashboardbl']);
  }

  invoicebl(): void {
    this.router.navigate(['/dashboardblinvoice']);
  }

  crear(): void {
    this.router.navigate(['/dashboardblcreate']);
  }

  excel(): void {
    this.router.navigate(['/dashboardblexcel']);
  }

  revi(): void {
    // Busca el valor exacto como viene del backend (ignora mayúsculas y tildes)
    const transitoValue = this.uniqueEstados.find(e =>
      e.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === 'transito'
    ) || 'TRANSITO';

    if (this.filterEstado === transitoValue) {
      this.filterEstado = '';
    } else {
      this.filterEstado = transitoValue;
    }
    this.applyFilters();
  }

  editarInvoice(invoiceId: number): void {
    console.log('Editando invoice:', invoiceId);
    this.router.navigate(['/edit-invoice', invoiceId]);
  }

  eliminarInvoice(invoiceId: number): void {
    if (confirm('¿Está seguro de eliminar este Invoice?')) {
      console.log('Eliminando invoice:', invoiceId);
    }
  }

  verDetallesInvoice(invoiceId: number): void {
    console.log('Ver detalles del invoice:', invoiceId);
    this.router.navigate(['/dashboardbldetail', invoiceId]);
  }

  eliminar(id: number): void {
    if (confirm('¿Está seguro de eliminar este BL?')) {
      this.pedidobodegaService.deletePedido(id).subscribe({
        next: () => {
          this.reloadService.triggerReload();
          this.showNotification('BL eliminado correctamente.', 'success');
        },
        error: (err) => {
          console.error('Error deleting BL:', err);
          this.showNotification('Error al eliminar el BL.', 'error');
        }
      });
    }
  }

  navigate1(): void { }

  navigate2(orden: any): void {
    console.log(orden);
    this.router.navigate(['/dashboardblexcel', orden]);
  }

  verDetalles(orden: any): void {
    console.log(orden);
    this.router.navigate(['/dashboardbldetail', orden]);
  }

  openModal(imageUrl: string): void {
    this.currentImageUrl = imageUrl;
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.currentImageUrl = '';
  }

  showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    alert(message);
  }

  expandAllInvoices(blIndex: number): void {
    this.expandedInvoicesByBl[blIndex] = !this.expandedInvoicesByBl[blIndex];
  }

  areInvoicesExpanded(blIndex: number): boolean {
    return this.expandedInvoicesByBl[blIndex] || false;
  }

  expandAllBls(): void {
    this.bls.forEach((_, index) => {
      this.expandedInvoicesByBl[index] = true;
    });
  }

  collapseAllBls(): void {
    this.expandedInvoicesByBl = {};
  }

  toggleAccordion(index: number): void {
    if (this.activeAccordion === index) {
      this.activeAccordion = null;
      delete this.expandedInvoicesByBl[index];
    } else {
      this.activeAccordion = index;
    }
  }

  closeAllAccordions(): void {
    this.activeAccordion = null;
    this.expandedInvoicesByBl = {};
  }

  getExpandButtonText(blIndex: number): string {
    return this.areInvoicesExpanded(blIndex) ? 'Contraer todo' : 'Expandir todo';
  }

  getExpandButtonIcon(blIndex: number): string {
    return this.areInvoicesExpanded(blIndex) ? 'bi-arrows-collapse' : 'bi-arrows-expand';
  }

  private determinarFechaArribo(item: BlRawResponse): string | undefined {
    if (item.fpreliquidacion && item.fpreliquidacion !== 'null') {
      return item.fpreliquidacion;
    }
    if (item.faduana && item.faduana !== 'null') {
      return item.faduana;
    }
    if (item.farrivop && item.farrivop !== 'null') {
      return item.farrivop;
    }
    if (item.farribob && item.farribob !== 'null') {
      return item.farribob;
    }
    return undefined;
  }

  downloadExcel(): void {
    const dataToExport = this.filteredData.map(item => ({
      id: item.id,
      nombre: item.nombre,
      proveedor: item.proveedor || 'N/A',
      invoice_principal: item.invoice,
      invoice_bl_summary: item.invoicebl,
      estado: item.estado,
      fecha_creacion: item.fecha_creacion,
      fecha_arribo: item.fechaArribo,
      descripcion_bl: item.descripcion,
      invoice_bl_associated: item.invoiceBlItems && item.invoiceBlItems.length > 0
        ? item.invoiceBlItems.map(ib => `${ib.invoiceNumber} (${ib.status})`).join('; ')
        : 'N/A',
      total_invoices: item.invoiceBlItems ? item.invoiceBlItems.length : 0,
      valor_bl_usd: item.valorBl ?? ''
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BL_Dashboard_Data');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `BL_Dashboard_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  downloadCSV(): void {
    let csvContent = 'Cod,BL,Proveedor,Invoice Principal,InvoiceBL Summary,Estado,Fecha Creacion,Fecha Arribo,Descripcion BL,Total Invoices,Valor BL USD,InvoiceBL Asociados\n';

    this.filteredData.forEach(item => {
      const invoiceBlAssociated = item.invoiceBlItems && item.invoiceBlItems.length > 0
        ? item.invoiceBlItems.map(ib => `${ib.invoiceNumber} (${ib.status})`).join('; ')
        : 'N/A';

      const row = [
        item.id || '',
        item.nombre || '',
        item.proveedor || 'N/A',
        item.invoice || '',
        item.invoicebl || '',
        item.estado || '',
        item.fecha_creacion ? new Date(item.fecha_creacion).toLocaleDateString() : '',
        item.fechaArribo ? new Date(item.fechaArribo).toLocaleDateString() : '',
        item.descripcion || '',
        item.invoiceBlItems ? item.invoiceBlItems.length : 0,
        item.valorBl ?? '',
        invoiceBlAssociated
      ].map(e => `"${e}"`).join(',');
      csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `BL_Dashboard_${new Date().toISOString().split('T')[0]}.csv`);
  }

  formatFechaArribo(fecha: string | undefined): string {
    if (!fecha || fecha === 'null') {
      return 'Pendiente';
    }

    try {
      return new Date(fecha).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  }

  getArriboStatus(fecha: string | undefined): string {
    if (!fecha || fecha === 'null') {
      return 'pendiente';
    }

    try {
      const fechaArribo = new Date(fecha);
      const hoy = new Date();

      if (fechaArribo <= hoy) {
        return 'arribado';
      } else {
        return 'programado';
      }
    } catch (error) {
      return 'error';
    }
  }
  // ─── Modal carga Excel: métodos ────────────────────────────────────────────

  descargarPlantillaCargar(): void {
    const blNombre = this.blParaCargar?.nombre || 'BL';
    const template = [
      {
        ITEM: 1,
        LINE: 'SINOTRUK',
        CODIGO: 'WG9325550800',
        CODIGOVHCR: '',
        CODE_NEW: '',
        'DESCRIPCION ESPAÑOL': 'TANQUE DE COMBUSTIBLE NUEVO C7H',
        CHINO: '800L铝合金油箱',
        QTY: 2,
        UNIT: 'PCS',
        UNIT_FOB: 463.42,
        TOTAL_FOB: 926.84,
        ORDEN: '20240906',
        'REF.': '240906',
        BL: blNombre   // ← BL precargado
      },
      {
        ITEM: 2,
        LINE: 'SINOTRUK',
        CODIGO: 'WG9725550730',
        CODIGOVHCR: '',
        CODE_NEW: '',
        'DESCRIPCION ESPAÑOL': 'TANQUE DE COMBUSTIBLE',
        CHINO: '300L铝合金油箱',
        QTY: 3,
        UNIT: 'PCS',
        UNIT_FOB: 267.95,
        TOTAL_FOB: 803.85,
        ORDEN: '20240906',
        'REF.': '240906',
        BL: blNombre   // ← BL precargado
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    ws['!cols'] = [
      { wch: 6 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 14 },
      { wch: 45 }, { wch: 30 }, { wch: 7 }, { wch: 7 },
      { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 20 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Detalle Invoice BL');
    XLSX.writeFile(wb, `plantilla_${blNombre}.xlsx`);
  }

  abrirModalCargarExcel(item: BlResponse): void {
    this.blParaCargar       = item;
    this.excelCargarFile    = null;
    this.excelCargarNombre  = '';
    this.excelCargarStep    = 1;
    this.excelCargarPreview = [];
    this.excelCargarErrores = [];
    this.excelCargarFilasInvalidas = [];
    this.excelCargarImportando = false;
    this.excelCargarCompletado = false;
    this.excelCargarFallado    = false;
    this.excelCargarMensaje    = '';
    this.excelCargarResultados = [];
    this.excelCargarSoloNoValidados = false;
    this.modalCargarExcel      = true;
  }

  cerrarModalCargarExcel(): void {
    this.modalCargarExcel = false;
    this.blParaCargar     = null;
  }

  onExcelCargarSelect(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    this.excelCargarFile   = file;
    this.excelCargarNombre = file.name;
    this.excelCargarErrores = [];
    this.excelCargarMensaje = '';
    this.leerExcelParaCargar();
  }

  private leerExcelParaCargar(): void {
    if (!this.excelCargarFile) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (!data.length) { this.excelCargarErrores = ['El archivo está vacío.']; return; }
        this.excelCargarPreview = data.slice(0, 10).map(row => ({
          ...row,
          BL: row['BL'] || row['bl'] || this.blParaCargar?.nombre || ''
        }));
        this.excelCargarStep = 2;
      } catch { this.excelCargarErrores = ['Error al leer el archivo Excel.']; }
    };
    reader.readAsBinaryString(this.excelCargarFile);
  }

importarExcelCargar(): void {
  if (!this.excelCargarFile || !this.blParaCargar) return;

  this.excelCargarImportando = true;
  this.excelCargarProgreso   = 0;
  this.excelCargarResultados = [];

  const interval = setInterval(() => {
    if (this.excelCargarProgreso < 90) this.excelCargarProgreso += 3;
  }, 200);

  this.blService.uploadExcelInvoiceBlByBl(this.excelCargarFile, this.blParaCargar.nombre)
    .subscribe({
      next: (res: ApiResponse) => {
        clearInterval(interval);
        this.excelCargarProgreso   = 100;
        this.excelCargarCompletado = true;
        this.excelCargarImportando = false;
        this.excelCargarResultados = res?.details || [];

        const exitosos = this.excelCargarResultados.filter(r => r.status === 'success').length;
        const noValidados = this.contarFilasNoValidadas();
        const baseMsg = `✅ ${exitosos} registros importados para ${this.blParaCargar!.nombre}`;
        this.excelCargarMensaje = noValidados > 0
          ? `${baseMsg} (⚠️ ${noValidados} fila(s) con códigos no encontrados en el maestro de partes)`
          : baseMsg;

        this.excelCargarStep = 3;
        // No se cierra automáticamente si hay filas con códigos no validados,
        // para que el usuario pueda revisar la tabla de detalle antes de salir.
        if (noValidados === 0) {
          setTimeout(() => { this.cerrarModalCargarExcel(); this.loadAllBls(); }, 2000);
        }
      },
      error: (err: any) => {
        clearInterval(interval);
        this.excelCargarImportando = false;
        this.excelCargarFallado    = true;
        this.excelCargarMensaje    = err?.error?.message || err?.message || 'Error al importar.';
      }
    });
}

  // Cuenta cuántas filas importadas tienen al menos un código (CODIGO,
  // CODE_NEW o CODIGOVHCR) que no fue encontrado en VW_MAESTRO_PARTES.
  contarFilasNoValidadas(): number {
    return this.excelCargarResultados.filter(r => this.filaTieneCodigoNoValidado(r)).length;
  }

  // Una fila se considera "con pendiente" si algún código presente en ella
  // no pudo validarse contra el maestro de partes de Oracle.
  filaTieneCodigoNoValidado(r: ImportRowDetail): boolean {
    const tieneCodigo = !!r.codigo && r.codigoValidado === false;
    const tieneCodeNew = !!r.codeNew && r.codeNewValidado === false;
    const tieneCodigoVhcr = !!r.codigoVhcr && r.codigoVhcrValidado === false;
    return tieneCodigo || tieneCodeNew || tieneCodigoVhcr;
  }

  // Resultados a mostrar en la tabla del paso 3, según el toggle
  // "ver solo no validados".
  get excelCargarResultadosFiltrados(): ImportRowDetail[] {
    if (!this.excelCargarSoloNoValidados) return this.excelCargarResultados;
    return this.excelCargarResultados.filter(r => this.filaTieneCodigoNoValidado(r));
  }

  toggleSoloNoValidados(): void {
    this.excelCargarSoloNoValidados = !this.excelCargarSoloNoValidados;
  }

  cerrarYRecargar(): void {
    this.cerrarModalCargarExcel();
    this.loadAllBls();
  }

  importarExcelCargar1(): void {
    if (!this.excelCargarFile || !this.blParaCargar) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const dataConBl = data.map(row => ({ ...row, BL: this.blParaCargar!.nombre }));
        const wsNuevo = XLSX.utils.json_to_sheet(dataConBl);
        const wbNuevo = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wbNuevo, wsNuevo, 'Detalle Invoice BL');
        const buffer = XLSX.write(wbNuevo, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const fileConBl = new File([blob], this.excelCargarNombre, { type: blob.type });

        this.excelCargarImportando = true;
        this.excelCargarProgreso   = 0;

        const interval = setInterval(() => {
          if (this.excelCargarProgreso < 90) this.excelCargarProgreso += 3;
        }, 200);

        this.blService.uploadExcelInvoiceBl(fileConBl).subscribe({
          next: (res: any) => {
            clearInterval(interval);
            this.excelCargarProgreso   = 100;
            this.excelCargarCompletado = true;
            this.excelCargarImportando = false;
            this.excelCargarMensaje    = `✅ ${res.totalProcessed || data.length} registros importados para ${this.blParaCargar!.nombre}`;
            this.excelCargarStep       = 3;
            setTimeout(() => { this.cerrarModalCargarExcel(); this.loadAllBls(); }, 2000);
          },
          error: (err: any) => {
            clearInterval(interval);
            this.excelCargarImportando = false;
            this.excelCargarFallado    = true;
            this.excelCargarMensaje    = err?.error?.message || err?.message || 'Error al importar.';
          }
        });
      } catch { this.excelCargarErrores = ['Error al procesar el archivo.']; }
    };
    reader.readAsBinaryString(this.excelCargarFile);
  }

  // ── Modal Pagos: abrir / cerrar ─────────────────────────────────────────
  abrirModalPagos(item: BlResponse): void {
    this.blPagoSeleccionado = item;
    this.modalPagos = true;
    this.pagosData = null;
    this.pagoSeleccionadoId = null;
    this.resetPagoForm(item);

    // Cargar los pagos de la primera orden asociada al BL
    if (this.pagoForm.ordenId) this.cargarPagosPorOrden(this.pagoForm.ordenId);
  }

  cerrarModalPagos(): void {
    this.modalPagos = false;
    this.blPagoSeleccionado = null;
    this.pagosData = null;
    this.docFile = null;
  }

  /** Órdenes únicas asociadas a este BL (a partir de sus invoiceBLs) */
  get ordenesDelBl(): { ordenId: number; invoiceBlId: number; label: string }[] {
    const items = this.blPagoSeleccionado?.invoiceBlItems ?? [];
    const vistas = new Set<number>();
    const ordenes: { ordenId: number; invoiceBlId: number; label: string }[] = [];
    for (const it of items) {
      if (it.ordenid == null || vistas.has(it.ordenid)) continue;
      vistas.add(it.ordenid);
      ordenes.push({
        ordenId:     it.ordenid,
        invoiceBlId: it.id,
        label:       (it.invoiceNumber || `Orden #${it.ordenid}`) + ` (Orden #${it.ordenid})`
      });
    }
    return ordenes;
  }

  private resetPagoForm(item: BlResponse): void {
    const primeraOrden = this.ordenesDelBl[0] ?? null;
    this.pagoForm = {
      invoiceBlId:   null,                                  // pago por orden
      ordenId:       primeraOrden?.ordenId ?? (item.ordenid ?? null),
      blId:          item.id || null,                       // contexto del BL
      monto:         null,
      moneda:        'USD',
      tipoPago:      'ABONO',                           // todos menos ANTICIPO
      fechaPago:     new Date().toISOString().split('T')[0],
      referencia:    '',
      observaciones: '',
    };
  }

  // Al cambiar la orden seleccionada, recarga los pagos de esa orden
  onOrdenChange(ordenId: number | null): void {
    this.pagoForm.ordenId = ordenId;
    if (ordenId) this.cargarPagosPorOrden(ordenId);
    else this.pagosData = null;
  }

  cargarPagosPorOrden(ordenId: number): void {
    this.pagosCargando = true;
    fetch(`${this.API}/bl/pagos/orden/${ordenId}`)
      .then(r => r.json())
      .then(data => { this.pagosData = data; this.pagosCargando = false; })
      .catch(() => { this.pagosCargando = false; });
  }

  guardarPago(): void {
    if (!this.pagoForm.monto || !this.pagoForm.ordenId) {
      alert('Completa el Monto y selecciona la Orden.');
      return;
    }
    if (this.pagoForm.tipoPago === 'ANTICIPO') {
      alert('Los anticipos se registran en el dashboard de órdenes, no aquí.');
      return;
    }
    this.guardandoPago = true;
    fetch(`${this.API}/bl/pagos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceBlId:   null,                 // pago por orden
        ordenId:       this.pagoForm.ordenId,
        blId:          this.pagoForm.blId,
        monto:         Number(this.pagoForm.monto),
        moneda:        this.pagoForm.moneda,
        tipoPago:      this.pagoForm.tipoPago,
        fechaPago:     this.pagoForm.fechaPago,
        referencia:    this.pagoForm.referencia || null,
        observaciones: this.pagoForm.observaciones || null,
      })
    })
      .then(r => { if (!r.ok) return r.text().then(t => { throw new Error(t); }); return r.json(); })
      .then(data => {
        alert(`✅ Pago registrado. ID: ${data.id}`);
        this.pagoSeleccionadoId = data.id;
        this.pagoForm.monto = null;
        this.pagoForm.referencia = '';
        this.pagoForm.observaciones = '';
        this.cargarPagosPorOrden(this.pagoForm.ordenId!);
        this.guardandoPago = false;
      })
      .catch(err => { alert(`❌ ${err.message}`); this.guardandoPago = false; });
  }

  onDocFileSelect(event: any): void {
    this.docFile = event.target.files[0] ?? null;
  }

  subirDocumento(pagoId: number): void {
    if (!this.docFile) { alert('Selecciona un archivo primero.'); return; }
    this.subiendoDoc = true;
    const fd = new FormData();
    fd.append('file', this.docFile);
    fd.append('tipoDocumento', this.docTipo);
    fetch(`${this.API}/bl/pagos/${pagoId}/documentos`, { method: 'POST', body: fd })
      .then(r => { if (!r.ok) return r.text().then(t => { throw new Error(t); }); return r.json(); })
      .then(() => {
        alert('✅ Documento subido correctamente.');
        this.docFile = null;
        this.subiendoDoc = false;
        this.cargarPagosPorOrden(this.pagoForm.ordenId!);
      })
      .catch(err => { alert(`❌ ${err.message}`); this.subiendoDoc = false; });
  }

  cambiarEstadoPago(pagoId: number, estado: string): void {
    fetch(`${this.API}/bl/pagos/${pagoId}/estado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado })
    })
      .then(r => r.json())
      .then(() => { this.cargarPagosPorOrden(this.pagoForm.ordenId!); })
      .catch(err => alert(`❌ ${err.message}`));
  }

  eliminarPago(pagoId: number): void {
    if (!confirm('¿Eliminar este pago?')) return;
    fetch(`${this.API}/bl/pagos/${pagoId}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(() => { this.cargarPagosPorOrden(this.pagoForm.ordenId!); })
      .catch(err => alert(`❌ ${err.message}`));
  }

  descargarDocumento(pagoId: number, docId: number): void {
    window.open(`${this.API}/bl/pagos/${pagoId}/documentos/${docId}/download`, '_blank');
  }

  eliminarDocumento(pagoId: number, docId: number): void {
    if (!confirm('¿Eliminar este documento?')) return;
    fetch(`${this.API}/bl/pagos/${pagoId}/documentos/${docId}`, { method: 'DELETE' })
      .then(() => this.cargarPagosPorOrden(this.pagoForm.ordenId!))
      .catch(err => alert(`❌ ${err.message}`));
  }

}