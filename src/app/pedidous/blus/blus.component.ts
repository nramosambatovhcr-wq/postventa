import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import saveAs from 'file-saver';
import { catchError, finalize, Subscription } from 'rxjs';
import { Usuario } from '../../models/usuario';
import { AuthService } from '../../services/auth.service';
import { PedidobodegaService } from '../../services/pedidobodega.service';
import { ReloadService } from '../../services/reload.service';
import * as XLSX from 'xlsx';
import { BlService } from 'src/app/services/bl.service';

// ... interfaces existentes (mantener como están)
interface InvoiceBlItem {
  id: number;
  invoiceNumber: string;
  blNumber: string;
  creationDate: string;
  description: string;
  status: string;
}

interface BlRawResponse {
  id: number;
  nombre: string;
  invoice: string;
  invoicebl: string;
  idinvoicebl: number;
  estado: string;
  fecha_creacion?: string;
  descripcion?: string;
}

interface BlResponse {
  id: number;
  nombre: string;
  invoice: string;
  invoicebl: string;
  idinvoicebl: number;
  estado: string;
  fecha_creacion?: string;
  descripcion?: string;
  invoiceBlItems: InvoiceBlItem[];
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

export interface BlDetailExcelDto1 {
  codigo: string;
  chino: string;
  descripcionEspanol: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  blNombre: string;
  invoiceN: string;
  invoiceBl: string;
}


@Component({
  selector: 'app-blus',
  templateUrl: './blus.component.html',
  styleUrls: ['./blus.component.css']
})
export class BlusComponent implements OnInit, OnDestroy {
  stats = {
    totalImportaciones: 7,
    enTransito: 24,
    pendientesLiquidacion: 18,
    tiempoPromedio: 28
  };

  activeAccordion: number | null = null;

  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 20;
  totalPages: number = 0;
  lista: any[] = []; // Para información de paginación
  allData: BlResponse[] = [];
  filteredData: BlResponse[] = [];
  id: number = 0;
  usuario: Usuario | null = null;
  loading = false;
  private subscription = new Subscription();

  // Variables para filtros de fecha
  startDate: string = '';
  endDate: string = '';

  // Variables para modal de imagen
  isModalOpen: boolean = false;
  currentImageUrl: string = '';

  // CAMBIO PRINCIPAL: Separar los datos de visualización de los de paginación
  bls: BlResponse[] = []; // Datos para mostrar en la tabla (filtrados, no paginados)
  selectedBl: BlResponse | null = null;

  constructor(
    private blService: BlService,
    private router: Router,
    private authService: AuthService,
    private pedidobodegaService: PedidobodegaService,
    private reloadService: ReloadService
  ) { }

  ngOnInit(): void {
    this.usuario = this.authService.getUsuarioActual();
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      console.log(this.usuario);
      if(this.usuario != null){
        this.id = this.usuario.id;
        console.log(this.id);
        this.loadAllBls();
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
 
  isModalOpen1: boolean = false;
  modal=false;
  currentModalDataIndex: number | null = null;

  // Datos de ejemplo para el modal (reemplaza con tus datos reales)
  detailsData = [
    { id: 1, name: 'Item A', description: 'Description for Item A' },
    { id: 2, name: 'Item B', description: 'Description for Item B' },
    { id: 3, name: 'Item C', description: 'Description for Item C' },
  ];

   currentBlDetails: BlDetailExcelDto[] | any ; // Array para almacenar los detalles del BL
  isLoadingDetails: boolean = false;

verBl(blId: number){
 this.router.navigate(['/blpedidous', blId]);
}

openDetailsModal(blId: number): void {
  this.modal=true;
  this.isModalOpen1 = true; // CAMBIO AQUÍ: Usa 'isModalOpen' para el *ngIf
  this.isLoadingDetails = true; // Establece la bandera de carga
  this.currentBlDetails = []; // Limpia los detalles anteriores

  // Llama al servicio para obtener los detalles del BL
  this.blService.getAllDetails(blId)
    .pipe(
      finalize(() => {
        this.isLoadingDetails = false; // Desactiva la bandera de carga al finalizar (éxito o error)
      }),
      catchError(error => {
        console.error('Error al obtener los detalles del BL:', error);
        // Puedes mostrar un mensaje de error en el modal si lo deseas
        return []; // Retorna un array vacío para que el subscribe no falle
      })
    )
    .subscribe((details: BlDetailExcelDto[]) => {
      this.currentBlDetails = details; // Asigna los detalles recibidos
    });
}


  closeDetailsModal(): void {
     this.modal=false;
    this.isModalOpen1 = false;
    this.currentModalDataIndex = null;
  }

/*
  toggleAccordion(index: number): void {
    if (this.activeAccordion === index) {
      this.activeAccordion = null;
    } else {
      this.activeAccordion = index;
    }
  }

  closeAllAccordions(): void {
    this.activeAccordion = null;
  }*/

  // Mantener el método de agrupación como está
  private groupBlData(rawData: BlRawResponse[]): BlResponse[] {
    const blMap = new Map<string, BlResponse>();

    rawData.forEach(item => {
      const blNumber = item.nombre;
      
      if (blMap.has(blNumber)) {
        const existingBl = blMap.get(blNumber)!;
        
        const invoiceBlItem: InvoiceBlItem = {
          id: item.idinvoicebl,
          invoiceNumber: item.invoice || '',
          blNumber: item.nombre,
          creationDate: item.fecha_creacion || '',
          description: item.invoicebl || '',
          status: item.estado || ''
        };

        const isDuplicate = existingBl.invoiceBlItems.some(existing => 
          existing.id === invoiceBlItem.id && 
          existing.invoiceNumber === invoiceBlItem.invoiceNumber
        );

        if (!isDuplicate) {
          existingBl.invoiceBlItems.push(invoiceBlItem);
        }
      } else {
        const newBl: BlResponse = {
          id: item.id,
          nombre: item.nombre,
          invoice: item.invoice,
          invoicebl: item.invoicebl,
          idinvoicebl: item.idinvoicebl,
          estado: item.estado,
          fecha_creacion: item.fecha_creacion,
          descripcion: item.descripcion,
          invoiceBlItems: []
        };

        const invoiceBlItem: InvoiceBlItem = {
          id: item.idinvoicebl,
          invoiceNumber: item.invoice || '',
          blNumber: item.nombre,
          creationDate: item.fecha_creacion || '',
          description: item.descripcion || '',
          status: item.estado || ''
        };

        newBl.invoiceBlItems.push(invoiceBlItem);
        blMap.set(blNumber, newBl);
      }
    });

    return Array.from(blMap.values());
  }

  loadAllBls(): void {
    this.loading = true;
    this.blService.getAllBl().subscribe({
      next: (data: BlRawResponse[]) => {
        console.log('Datos recibidos del backend:', data);
        
        // Agrupar los datos por BL número
        const groupedData = this.groupBlData(data);
        this.allData = groupedData;
        
        console.log('Datos agrupados:', groupedData);
        
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar los BLs:', error);
        this.loading = false;
      }
    });
  }

  // CAMBIO PRINCIPAL: Modificar applyFilters para no afectar la visualización completa
  /*applyFilters(): void {
    let tempFilteredData = this.allData;

    // Apply date filter
    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate).setHours(0, 0, 0, 0);
      const end = new Date(this.endDate).setHours(23, 59, 59, 999);

      tempFilteredData = tempFilteredData.filter(item => {
        const itemDate = new Date(item.fecha_creacion || '').getTime();
        return itemDate >= start && itemDate <= end;
      });
    }

    // Apply search filter
    if (this.searchTerm) {
      const lowerCaseSearchTerm = this.searchTerm.toLowerCase();
      tempFilteredData = tempFilteredData.filter(item =>
        (item.nombre && item.nombre.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (item.invoice && item.invoice.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (item.invoicebl && item.invoicebl.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (item.estado && item.estado.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (item.descripcion && item.descripcion.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (item.invoiceBlItems && item.invoiceBlItems.some((invoiceBl: InvoiceBlItem) =>
          invoiceBl.invoiceNumber.toLowerCase().includes(lowerCaseSearchTerm) ||
          invoiceBl.description.toLowerCase().includes(lowerCaseSearchTerm) ||
          invoiceBl.status.toLowerCase().includes(lowerCaseSearchTerm)
        ))
      );
    }

    this.filteredData = tempFilteredData;
    
    // CAMBIO CRÍTICO: Asignar todos los datos filtrados a bls para mostrar
    this.bls = [...this.filteredData]; // Mostrar TODOS los datos filtrados
    
    // Calcular paginación solo para la información de pie de página
    this.totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
    this.currentPage = 1;
    this.updatePaginationInfo(); // Solo actualizar info, no los datos mostrados

    this.closeAllAccordions();
  }*/

  searchImports(): void {
    this.applyFilters();
  }

  // NUEVO MÉTODO: Solo actualizar información de paginación, no los datos mostrados
  updatePaginationInfo(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.lista = this.filteredData.slice(startIndex, endIndex);
    // NO cambiar this.bls aquí - mantener todos los datos visibles
  }

  // CAMBIO: Modificar changePage para solo actualizar info de paginación
  /*changePage(page: any): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginationInfo(); // Solo actualizar info
      this.closeAllAccordions();
    }
  }
*/
  // OPCIÓN ALTERNATIVA: Si quieres mantener la paginación tradicional, 
  // puedes agregar este método para alternar entre modos
  togglePaginationMode(): void {
    // Implementar si quieres permitir al usuario alternar entre ver todo o paginado
  }

  // Mantener el resto de métodos como están...
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

  // Navigation methods (mantener como están)
  bl(): void {
    this.router.navigate(['/dashboardblbod']);
  }

  revision(): void {
    this.router.navigate(['/dashboardblrevision']);
  }

  asignar(): void {
    this.router.navigate(['/asignar']);
  }

  usuarios(): void {
    this.router.navigate(['/usuariosbi']);
  }

  reportes(): void {
    this.router.navigate(['/reportes']);
  }

  // CRUD operations (mantener como están)
  editarInvoice(invoiceId: number): void {
    console.log('Editando invoice:', invoiceId);
    this.router.navigate(['/edit-invoice', invoiceId]);
  }

  eliminarInvoice(invoiceId: number): void {
    if (confirm('¿Está seguro de eliminar este Invoice?')) {
      console.log('Eliminando invoice:', invoiceId);
      // Implementar llamada al servicio
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

  navigate1(): void {
    // Implement navigation for editing a BL
  }

  navigate4(orden: any): void {
    console.log(orden);
    //this.router.navigate(['/blpedidous', orden]);
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

  // Download methods (mantener como están)
  downloadExcel(): void {
    const dataToExport = this.filteredData.map(item => ({
        id: item.id,
        nombre: item.nombre,
        invoice_principal: item.invoice,
        invoice_bl_summary: item.invoicebl,
        estado: item.estado,
        fecha_creacion: item.fecha_creacion,
        descripcion_bl: item.descripcion,
        invoice_bl_associated: item.invoiceBlItems && item.invoiceBlItems.length > 0
            ? item.invoiceBlItems.map(ib => `${ib.invoiceNumber} (${ib.status})`).join('; ')
            : 'N/A',
        total_invoices: item.invoiceBlItems ? item.invoiceBlItems.length : 0
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BL_Dashboard_Data');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `BL_Dashboard_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  downloadCSV(): void {
    let csvContent = 'Cod,BL,Invoice Principal,InvoiceBL Summary,Estado,Fecha Creacion,Descripcion BL,Total Invoices,InvoiceBL Asociados\n';

    this.filteredData.forEach(item => {
      const invoiceBlAssociated = item.invoiceBlItems && item.invoiceBlItems.length > 0
          ? item.invoiceBlItems.map(ib => `${ib.invoiceNumber} (${ib.status})`).join('; ')
          : 'N/A';

      const row = [
        item.id || '',
        item.nombre || '',
        item.invoice || '',
        item.invoicebl || '',
        item.estado || '',
        item.fecha_creacion ? new Date(item.fecha_creacion).toLocaleDateString() : '',
        item.descripcion || '',
        item.invoiceBlItems ? item.invoiceBlItems.length : 0,
        invoiceBlAssociated
      ].map(e => `"${e}"`).join(',');
      csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `BL_Dashboard_${new Date().toISOString().split('T')[0]}.csv`);
  }

  showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    alert(message);
  }


  // Agregar estas propiedades a la clase DashboardblComponent
 
  
  // NUEVA PROPIEDAD: Para controlar el estado de expansión de invoices por BL
  expandedInvoicesByBl: { [blIndex: number]: boolean } = {};

  // ... resto del código existente ...

  // NUEVA FUNCIÓN: expandAllInvoices
  expandAllInvoices(blIndex: number): void {
    // Alternar el estado de expansión para este BL
    this.expandedInvoicesByBl[blIndex] = !this.expandedInvoicesByBl[blIndex];
    
    // Log para debugging
    console.log(`Toggling expansion for BL at index ${blIndex}:`, this.expandedInvoicesByBl[blIndex]);
    
    // Opcional: Mostrar notificación al usuario
    const isExpanded = this.expandedInvoicesByBl[blIndex];
    const blName = this.bls[blIndex]?.nombre || `BL ${blIndex + 1}`;
    
    if (isExpanded) {
      console.log(`Expandiendo todos los invoices del BL: ${blName}`);
    } else {
      console.log(`Contrayendo todos los invoices del BL: ${blName}`);
    }
  }

  // FUNCIÓN AUXILIAR: Verificar si los invoices están expandidos
  areInvoicesExpanded(blIndex: number): boolean {
    return this.expandedInvoicesByBl[blIndex] || false;
  }

  // FUNCIÓN AUXILIAR: Expandir todos los BLs
  expandAllBls(): void {
    this.bls.forEach((_, index) => {
      this.expandedInvoicesByBl[index] = true;
    });
    console.log('Expandiendo todos los BLs');
  }

  // FUNCIÓN AUXILIAR: Contraer todos los BLs
  collapseAllBls(): void {
    this.expandedInvoicesByBl = {};
    console.log('Contrayendo todos los BLs');
  }

  // MODIFICAR: toggleAccordion para resetear el estado de expansión de invoices
  toggleAccordion(index: number): void {
    if (this.activeAccordion === index) {
      this.activeAccordion = null;
      // Resetear el estado de expansión de invoices cuando se cierra el acordeón
      delete this.expandedInvoicesByBl[index];
    } else {
      this.activeAccordion = index;
    }
  }

  // MODIFICAR: closeAllAccordions para limpiar estados
  closeAllAccordions(): void {
    this.activeAccordion = null;
    this.expandedInvoicesByBl = {};
  }

  // MODIFICAR: applyFilters para resetear estados de expansión
  applyFilters(): void {
    let tempFilteredData = this.allData;

    // Apply date filter
    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate).setHours(0, 0, 0, 0);
      const end = new Date(this.endDate).setHours(23, 59, 59, 999);

      tempFilteredData = tempFilteredData.filter(item => {
        const itemDate = new Date(item.fecha_creacion || '').getTime();
        return itemDate >= start && itemDate <= end;
      });
    }

    // Apply search filter
    if (this.searchTerm) {
      const lowerCaseSearchTerm = this.searchTerm.toLowerCase();
      tempFilteredData = tempFilteredData.filter(item =>
        (item.nombre && item.nombre.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (item.invoice && item.invoice.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (item.invoicebl && item.invoicebl.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (item.estado && item.estado.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (item.descripcion && item.descripcion.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (item.invoiceBlItems && item.invoiceBlItems.some((invoiceBl: InvoiceBlItem) =>
          invoiceBl.invoiceNumber.toLowerCase().includes(lowerCaseSearchTerm) ||
          invoiceBl.description.toLowerCase().includes(lowerCaseSearchTerm) ||
          invoiceBl.status.toLowerCase().includes(lowerCaseSearchTerm)
        ))
      );
    }

    this.filteredData = tempFilteredData;
    this.bls = [...this.filteredData];
    
    // Calcular paginación
    this.totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
    this.currentPage = 1;
    this.updatePaginationInfo();

    // NUEVO: Resetear estados de expansión después de aplicar filtros
    this.closeAllAccordions();
  }

  // MODIFICAR: changePage para mantener estados de expansión
  changePage(page: any): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginationInfo();
      // No cerrar acordeones al cambiar página para mejor UX
      // this.closeAllAccordions();
    }
  }

  // NUEVA FUNCIÓN: Obtener el texto del botón de expansión
  getExpandButtonText(blIndex: number): string {
    return this.areInvoicesExpanded(blIndex) ? 'Contraer todo' : 'Expandir todo';
  }

  // NUEVA FUNCIÓN: Obtener el ícono del botón de expansión
  getExpandButtonIcon(blIndex: number): string {
    return this.areInvoicesExpanded(blIndex) ? 'bi-arrows-collapse' : 'bi-arrows-expand';
  }
}