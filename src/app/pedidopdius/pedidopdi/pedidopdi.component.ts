import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import saveAs from 'file-saver';
import { Subscription } from 'rxjs';
import { Usuario } from '../../models/usuario'; // Adjust path if necessary
import { AuthService } from '../../services/auth.service'; // Adjust path if necessary
// Import the new PDI service
import { PedidobodegaService } from '../../services/pedidobodega.service'; // Still needed for generic observations
import { ReloadService } from '../../services/reload.service'; // Adjust path if necessary
import * as XLSX from 'xlsx';
import { PedidoPdiData, PedidosPdiService } from 'src/app/services/pedidos-pdi.service';

// Interface to represent the data structure for display in the table
interface PedidoPdiDisplay {
  id_pedido?: number;
  codigo: string;
  descripcion: string;
  observaciones?: string; // This will be the 'ultimo_mensaje' from the API
  cantidad: number;
  modelo?: string;
  cliente?: string;
  ot?: string;
  chasis?: string;
  estado?: string;
  fecha_creacion?: string;
  imagenes?: string[]; // Array of image URLs
  idUsuarioCreacion?: number;
  idUsuarioModificacion?: number;
  nombre_usuario?: string; // From join
  apellido_usuario?: string; // From join
  ultimo_mensaje?: string; // From LATERAL JOIN
  fecha_ultimo_mensaje?: string; // From LATERAL JOIN
  usuario_ultimo_mensaje?: string; // From LATERAL JOIN
  observacionesCount?: number; // For tracking the number of observations
}
@Component({
  selector: 'app-pedidopdi',
  templateUrl: './pedidopdi.component.html',
  styleUrls: ['./pedidopdi.component.css']
})
export class PedidopdiComponent implements OnInit, OnDestroy {
  // Placeholder for statistics (data will need to be fetched from PDI specific APIs)
  stats = {
    totalPdi: 0,
    enProceso: 0,
    finalizados: 0,
    error: 0
  };

  paginaActual: string = 'pendiente'; // Default page state
  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 0;
  lista: PedidoPdiDisplay[] = []; // Data for the current page
  allData: PedidoPdiDisplay[] = []; // All fetched data
  filteredData: PedidoPdiDisplay[] = []; // Data filtered by search/date
  id: number = 0; // Current user ID
  usuario: Usuario | null = null; // Current user object
  loading = false;
  private subscription = new Subscription();

  // Date filter variables
  startDate: string = '';
  endDate: string = '';

  // Image modal variables
  selectedImageUrl: string = '';
  isModalOpen: boolean = false;

  // Observations modal variables
  observacionesModalVisible: boolean = false;
  selectedPedido: PedidoPdiDisplay | null = null;

  // Cache for observation counts (assuming generic observations table)
  private observacionesCache: Map<number, number> = new Map();

  constructor(
    private router: Router,
    private pedidosPdiService: PedidosPdiService, // Inject the new PDI service
    private pedidobodegaService: PedidobodegaService, // Still needed for generic observation counts
    private reloadService: ReloadService,
    private authService: AuthService,
  ) { }

  ngOnInit(): void {
    this.paginaActual = 'pendiente'; // Set initial active state
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      if (this.usuario != null) {
        this.id = this.usuario.id;
        this.loadPedidosPdi(); // Load PDI orders
      }
    });

    this.subscription.add(
      this.reloadService.reload$.subscribe(() => {
        this.loadPedidosPdi();
        this.loadObservacionesCounts(); // Reload observation counts
      })
    );

    // Initialize date filters with current month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    this.startDate = this.formatDateForInput(firstDayOfMonth);
    this.endDate = this.formatDateForInput(lastDayOfMonth);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  totalItems: number = 0;

  /**
   * Loads PDI orders from the backend.
   */
  loadPedidosPdi() {
    this.loading = true;
    this.pedidosPdiService.getPedidosPdiByUser(this.id).subscribe({ // Use the PDI service
      next: (data: PedidoPdiDisplay[]) => {
        this.allData = data;
        this.filteredData = this.allData; // Initialize filtered data
        this.totalItems = this.filteredData.length;
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        this.updatePageData();
        this.loadObservacionesCounts(); // Load observation counts for each PDI order
        this.loading = false;
      },
      error: (e) => {
        console.error('Error al cargar pedidos PDI:', e);
        this.loading = false;
        this.showToast(`Error al cargar pedidos PDI: ${e.message || 'Error desconocido'}`, 'error');
      }
    });
  }

    loadPedidosPdiPro() {
    this.loading = true;
    this.pedidosPdiService.procesop(this.id).subscribe({ // Use the PDI service
      next: (data: PedidoPdiDisplay[]) => {
        this.allData = data;
        this.filteredData = this.allData; // Initialize filtered data
        this.totalItems = this.filteredData.length;
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        this.updatePageData();
        this.loadObservacionesCounts(); // Load observation counts for each PDI order
        this.loading = false;
      },
      error: (e) => {
        console.error('Error al cargar pedidos PDI:', e);
        this.loading = false;
        this.showToast(`Error al cargar pedidos PDI: ${e.message || 'Error desconocido'}`, 'error');
      }
    });
  }

   loadPedidosPdiAsig() {
    this.loading = true;
    this.pedidosPdiService.asignadop(this.id).subscribe({ // Use the PDI service
      next: (data: PedidoPdiDisplay[]) => {
        this.allData = data;
        this.filteredData = this.allData; // Initialize filtered data
        this.totalItems = this.filteredData.length;
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        this.updatePageData();
        this.loadObservacionesCounts(); // Load observation counts for each PDI order
        this.loading = false;
      },
      error: (e) => {
        console.error('Error al cargar pedidos PDI:', e);
        this.loading = false;
        this.showToast(`Error al cargar pedidos PDI: ${e.message || 'Error desconocido'}`, 'error');
      }
    });
  }

   loadPedidosPdiRev() {
    this.loading = true;
    this.pedidosPdiService.revisadop(this.id).subscribe({ // Use the PDI service
      next: (data: PedidoPdiDisplay[]) => {
        this.allData = data;
        this.filteredData = this.allData; // Initialize filtered data
        this.totalItems = this.filteredData.length;
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        this.updatePageData();
        this.loadObservacionesCounts(); // Load observation counts for each PDI order
        this.loading = false;
      },
      error: (e) => {
        console.error('Error al cargar pedidos PDI:', e);
        this.loading = false;
        this.showToast(`Error al cargar pedidos PDI: ${e.message || 'Error desconocido'}`, 'error');
      }
    });
  }

  loadPedidosPdiError() {
    this.loading = true;
    this.pedidosPdiService.errorp(this.id).subscribe({ // Use the PDI service
      next: (data: PedidoPdiDisplay[]) => {
        this.allData = data;
        this.filteredData = this.allData; // Initialize filtered data
        this.totalItems = this.filteredData.length;
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        this.updatePageData();
        this.loadObservacionesCounts(); // Load observation counts for each PDI order
        this.loading = false;
      },
      error: (e) => {
        console.error('Error al cargar pedidos PDI:', e);
        this.loading = false;
        this.showToast(`Error al cargar pedidos PDI: ${e.message || 'Error desconocido'}`, 'error');
      }
    });
  }
  /**
   * Loads observation counts for each PDI order.
   * Assumes observations are in a generic 'pedidos_observaciones' table.
   */
  loadObservacionesCounts(): void {
    this.allData.forEach(pedido => {
      if (pedido.id_pedido) {
        // Using pedidobodegaService for generic observations
        this.pedidobodegaService.getObservacionesPedido(pedido.id_pedido).subscribe({
          next: (observaciones: any[]) => {
            if (pedido.id_pedido) {
              this.observacionesCache.set(pedido.id_pedido, observaciones.length);
            }
          },
          error: (err) => {
            console.error('Error cargando observaciones para pedido PDI:', pedido.id_pedido, err);
          }
        });
      }
    });
  }

  /**
   * Gets the number of observations for a PDI order.
   * @param pedido The PDI order object.
   * @returns The count of observations.
   */
  getObservacionesCount(pedido: PedidoPdiDisplay): number {
    if (!pedido.id_pedido) return 0;
    return this.observacionesCache.get(pedido.id_pedido) || 0;
  }

  /**
   * Opens the observations modal for a selected PDI order.
   * @param pedido The PDI order to view observations for.
   */
  openObservacionesModal(pedido: PedidoPdiDisplay): void {
    this.selectedPedido = pedido;
    this.observacionesModalVisible = true;
  }

  /**
   * Closes the observations modal.
   */
  closeObservacionesModal(): void {
    this.observacionesModalVisible = false;
    this.selectedPedido = null;
    this.loadObservacionesCounts(); // Reload counts after closing modal
  }

  /**
   * Opens the image modal to display a larger image.
   * @param imageUrl The URL of the image to display.
   */
  openImageModal(imageUrl: string): void {
    this.selectedImageUrl = imageUrl;
    this.isModalOpen = true;
  }

  /**
   * Closes the image modal.
   */
  closeImageModal(): void {
    this.isModalOpen = false;
  }

  /**
   * Updates the status of a PDI order.
   * @param item The PDI order to update.
   */
  actualizarEstado(item: PedidoPdiDisplay): void {
    console.log(`Actualizando estado de pedido PDI: ${item.codigo} - ${item.estado}`);

    if (!item.id_pedido) {
      this.showToast('ID de pedido PDI no encontrado para actualizar.', 'error');
      return;
    }

    const pedidoActualizado: PedidoPdiData = {
      Codigo: String(item.codigo || ""),
      Descripcion: String(item.descripcion || ""),
      Observaciones: String(item.observaciones || ""),
      Cantidad: parseInt(item.cantidad as any) || 0, // Ensure number type
      Modelo: String(item.modelo || ""),
      Cliente: String(item.cliente || ""),
      Ot: String(item.ot || ""),
      Estado: String(item.estado || ""),
      IdUsuarioCreacion: parseInt(item.idUsuarioCreacion as any) || 0, // Ensure number type
      IdUsuarioModificacion: parseInt(item.idUsuarioModificacion as any) || 0 // Ensure number type
    };

    this.pedidosPdiService.updatePedidoPdi(item.id_pedido, pedidoActualizado).subscribe({
      next: () => {
        this.showToast("Pedido PDI actualizado exitosamente", 'success');
        this.loadPedidosPdi(); // Reload data after update
      },
      error: (err:any) => {
        this.showToast(`Error al actualizar pedido PDI: ${err.message || 'Error desconocido'}`, 'error');
        console.error("Error al actualizar estado de pedido PDI", err);
      }
    });
  }

  /**
   * Constructs the full URL for an image from its relative path.
   * @param relativePath The relative path of the image from the API.
   * @returns The full URL of the image.
   */
  getImageUrl(relativePath: string): string {
    // Replace backslashes with forward slashes for web URLs
    const formattedPath = relativePath.replace(/\\/g, '/');
    // Combine with your API base URL and the specific image endpoint for PDI
    // Assuming your API serves images from /api/PedidosPdi/images/{filename}
    // You might need to adjust this based on your PedidosPdiController's GetImagePdi route
    const baseUrl = this.pedidosPdiService.url; // Use the service's base URL
    const filename = formattedPath.split('/').pop(); // Extract filename from path
    return `${baseUrl}/api/PedidosPdi/images/${filename}`;
  }

  /**
   * Updates the data displayed on the current page based on pagination.
   */
  updatePageData() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.lista = this.filteredData.slice(startIndex, endIndex);
  }

  /**
   * Changes the current page of the table.
   * @param page The page number to navigate to.
   */
  changePage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePageData();
  }

  /**
   * Formats a Date object into a 'YYYY-MM-DD' string for input fields.
   * @param date The Date object to format.
   * @returns The formatted date string.
   */
  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Applies date filtering to the PDI orders.
   */
  applyDateFilter() {
    if (!this.startDate || !this.endDate) {
      this.filteredData = this.allData;
    } else {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999); // Set to end of day

      this.filteredData = this.allData.filter(item => {
        const itemDate = new Date(item.fecha_creacion || '');
        return itemDate >= start && itemDate <= end;
      });
    }

    this.totalItems = this.filteredData.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    this.currentPage = 1; // Reset to first page
    this.updatePageData();
  }

  /**
   * Resets the date filters and reloads all data.
   */
  resetDateFilter() {
    this.startDate = '';
    this.endDate = '';
    this.filteredData = this.allData;
    this.totalItems = this.filteredData.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    this.currentPage = 1;
    this.updatePageData();
  }

  /**
   * Searches PDI orders based on the search term and applied date filters.
   */
  searchImports(): void {
    if (this.searchTerm.trim() === '') {
      this.applyDateFilter(); // If search term is empty, apply only date filter
    } else {
      const searchTermLower = this.searchTerm.toLowerCase();

      let dateFilteredData = this.allData;
      if (this.startDate && this.endDate) {
        const start = new Date(this.startDate);
        const end = new Date(this.endDate);
        end.setHours(23, 59, 59, 999);

        dateFilteredData = this.allData.filter(item => {
          const itemDate = new Date(item.fecha_creacion || '');
          return itemDate >= start && itemDate <= end;
        });
      }

      this.filteredData = dateFilteredData.filter(item =>
        (item.codigo && item.codigo.toLowerCase().includes(searchTermLower)) ||
        (item.descripcion && item.descripcion.toLowerCase().includes(searchTermLower)) ||
        (item.observaciones && item.observaciones.toLowerCase().includes(searchTermLower))
      );

      this.totalItems = this.filteredData.length;
      this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
      this.currentPage = 1;
      this.updatePageData();
    }
  }

  /**
   * Placeholder for advanced filter functionality.
   */
  filterData(): void {
    // Implement advanced filter modal/dialog
    console.log('Filtrar datos PDI');
  }

  // --- Navigation methods (placeholders for PDI specific routes) ---
  pendiente() {
    // Navigate to PDI pending orders (current view)
    this.router.navigate(['/pedidospdius']);
    this.paginaActual = 'pendiente';
    this.loadPedidosPdi(); // Reload data for pending state
  }

  revisado() {
    // Placeholder: Navigate to PDI reviewed orders
    console.log('Navegar a pedidos PDI finalizados');
    this.paginaActual = 'revisado';
    this.loadPedidosPdiRev();
    // You would call a new API endpoint here: this.pedidosPdiService.getReviewedPedidosPdi();
  }
  //pederror

  proceso() {
    // Placeholder: Navigate to PDI in-process orders
    console.log('Navegar a pedidos PDI en proceso');
    this.paginaActual = 'proceso';
    this.loadPedidosPdiPro();
    // You would call a new API endpoint here: this.pedidosPdiService.getInProcessPedidosPdi();
  }

  asignado() {
    // Placeholder: Navigate to PDI assigned orders
    console.log('Navegar a pedidos PDI asignados');
    this.paginaActual = 'asignado';
    this.loadPedidosPdiAsig();
    // You would call a new API endpoint here: this.pedidosPdiService.getAssignedPedidosPdi();
  }

  error() {
    // Placeholder: Navigate to PDI error orders
    console.log('Navegar a pedidos PDI con información errónea');
    this.paginaActual = 'error';
    // You would call a new API endpoint here: this.pedidosPdiService.getErrorPedidosPdi();
  }

  individual() {
    // Placeholder: Navigate to PDI individual order creation
    console.log('Navegar a crear pedido PDI individual');
    this.paginaActual = 'individual';
    this.router.navigate(['/pedidospdiuscreate']); // Example route
  }

  excel() {
    // Placeholder: Navigate to PDI Excel upload
    console.log('Navegar a subir Excel para pedidos PDI');
    this.paginaActual = 'excel';
    // this.router.navigate(['/pedidospdius/excel-upload']); // Example route
  }
  // --- End Navigation methods ---

  showExportMenu: boolean = false;

  /**
   * Toggles the visibility of the export menu.
   */
  toggleExportMenu(): void {
    this.showExportMenu = !this.showExportMenu;
  }

  /**
   * Generates an array for pagination buttons.
   * @returns An array of page numbers or -1 for ellipsis.
   */
  getPaginationArray(): number[] {
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;

    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      const pages: number[] = [];
      pages.push(1);
      if (currentPage > 3) {
        pages.push(-1); // Ellipsis
      }
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push(-1); // Ellipsis
      }
      if (totalPages > 1) {
        pages.push(totalPages);
      }
      return pages;
    }
  }

  /**
   * Downloads the filtered PDI data as an Excel file.
   */
  downloadExcel(): void {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredData);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PedidosPDI');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `PedidosPDI_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  /**
   * Downloads the filtered PDI data as a CSV file.
   */
  downloadCSV(): void {
    let csvContent = 'Codigo,Descripcion,Cantidad,Observacion,Fecha,Estado\n';
    this.filteredData.forEach(item => {
      const row = [
        item.codigo,
        item.descripcion,
        item.cantidad,
        item.observaciones || '-',
        item.fecha_creacion ? new Date(item.fecha_creacion).toLocaleDateString() : '-',
        item.estado || '-'
      ].join(',');
      csvContent += row + '\n';
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `PedidosPDI_${new Date().toISOString().split('T')[0]}.csv`);
  }

  /**
   * Displays a toast notification.
   * @param message The message to display.
   * @param type The type of toast (success, error, warning).
   */
  private showToast(message: string, type: 'success' | 'error' | 'warning'): void {
    const toast = document.createElement('div');
    toast.innerText = message;
    toast.className = `toast toast-${type}`;

    Object.assign(toast.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: this.getToastColor(type),
      color: 'white',
      padding: '12px 20px',
      borderRadius: '8px',
      zIndex: '10000',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      fontSize: '14px',
      fontWeight: '500',
      maxWidth: '350px',
      wordWrap: 'break-word',
      animation: 'slideInRight 0.3s ease-out',
      transition: 'all 0.3s ease'
    });

    document.body.appendChild(toast);

    setTimeout(() => {
      if (document.body.contains(toast)) {
        toast.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 300);
      }
    }, 4000);
  }

  /**
   * Gets the background color for a toast notification based on its type.
   * @param type The type of toast.
   * @returns The corresponding CSS color string.
   */
  private getToastColor(type: 'success' | 'error' | 'warning'): string {
    switch (type) {
      case 'success':
        return '#28a745';
      case 'error':
        return '#dc3545';
      case 'warning':
        return '#ffc107';
      default:
        return '#6c757d';
    }
  }
}
