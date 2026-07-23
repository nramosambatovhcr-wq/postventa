import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import saveAs from 'file-saver';
import { Subscription } from 'rxjs';
import { Usuario } from '../../models/usuario';
import { AuthService } from '../../services/auth.service';
import { PedidobodegaService } from '../../services/pedidobodega.service';
import { ReloadService } from '../../services/reload.service';
import * as XLSX from 'xlsx';

// Interfaz para pedidos (agregada para mejor tipado)
export interface Pedido {
  id_pedido?: number;
  codigo: string;
  descripcion: string;
  cantidad: number;
  observaciones?: string;
  estado?: string;
  idUsuarioCreacion?: number;
  idUsuarioModificacion?: number;
  modelo?: string;
  cliente?: string;
  ot?: string;
  nombre?: string;
  apellido?: string;
  fecha_creacion?: Date; // Changed to Date type
  imagenes?: string[];
  comentarios?: Comment[]; // Optional array of comments
}

export interface Comment {
  usuario: string;
  texto: string;
  fecha: string;
  id?: number;
}

// Interface for dashboard statistics
export interface DashboardStats {
  totalRevisados: number;
  informacionErronea: number;
  enProceso: number;
  enviados: number;
  revisadosChange?: number; // Example for percentage change
  informacionErroneaChange?: number;
  // Add other stats as needed
}

@Component({
  selector: 'app-bodegaimporenv',
  templateUrl: './bodegaimporenv.component.html',
  styleUrls: ['./bodegaimporenv.component.css']
})
export class BodegaimporenvComponent implements OnInit, OnDestroy  {
  stats: DashboardStats = { // Initialize with default values
    totalRevisados: 0,
    informacionErronea: 0,
    enProceso: 0,
    enviados: 0,
     
  };

  selectedPedido: Pedido | null = null;
  observacionesModalVisible: boolean = false;

  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 0;
  lista: Pedido[] = []; // Use Pedido interface
  allData: Pedido[] = []; // All data without pagination
  filteredData: Pedido[] = []; // Data filtered by date and search
  id: number = 0;
  usuario: Usuario | null = null;
  loading = false;
  usrol: string = '';
  
  private subscription = new Subscription();

  startDate: string = '';
  endDate: string = '';

  showObservacionesModal1: boolean = false;
  selectedPedidoId: number | null = null;

  selectedImageUrl: string = '';
  isModalOpen: boolean = false;

  showExportMenu: boolean = false;


  constructor(
    private router: Router,
    private tutorialService: PedidobodegaService,
    private reloadService: ReloadService,
    private authService: AuthService,
  ) { }

  ngOnInit(): void {
     this.usuario = this.authService.getUsuarioActual();
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      console.log(this.usuario);
      if(this.usuario != null){
        this.id = this.usuario.id;
        console.log(this.id);
        this.usrol = this.usuario.rol;
        this.loadImportaciones();
        
      }
    });
    

    this.subscription.add(
      this.reloadService.reload$.subscribe(() => {
        this.loadImportaciones();
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  // New function to open the observations modal
  verObservaciones(idPedido: number | undefined): void { // idPedido can be undefined
    if (idPedido) {
      this.selectedPedidoId = idPedido;
      this.showObservacionesModal1 = true;
      console.log('Abriendo observaciones para pedido:', idPedido);
    }
  }

  // New function to close the observations modal
  closeObservacionesModal1(): void {
    this.showObservacionesModal1 = false;
    this.selectedPedidoId = null;
  }

  // Modal de observaciones
  openObservacionesModal(pedido: Pedido): void {
    this.selectedPedido = pedido;
    this.observacionesModalVisible = true;
  }

  closeObservacionesModal(): void {
    this.observacionesModalVisible = false;
    // Recargar datos por si hubo cambios en las observaciones
    this.loadImportaciones();
  }

  // Add this method to the class
  openImageModal(imageUrl: string): void {
    this.selectedImageUrl = imageUrl;
    this.isModalOpen = true;
  }

  // Add this method to the class
  closeImageModal(): void {
    this.isModalOpen = false;
  }

  totalItems: number = 0;

  loadImportaciones() {
    this.loading = true;
    this.tutorialService.pedidosenviado().subscribe({
      next: (data: Pedido[]) => { // Type data as Pedido[]
        this.allData = data;
        this.allData.forEach(item => {
          // Convert fecha_creacion to Date object for proper date filtering
          if (typeof item.fecha_creacion === 'string') {
            item.fecha_creacion = new Date(item.fecha_creacion);
          }
        });

        // Apply role-based filtering
        if (this.usrol === 'repuestoslv') {
          this.filteredData = this.allData.filter(item => item && item.modelo === 'sl');
        } else if (this.usrol === 'repuestoslk') {
          this.filteredData = this.allData.filter(item => item && item.modelo === 'lc');
        } else if (this.usrol === 'repuestoslsc') {
          this.filteredData = this.allData.filter(item => item && item.modelo === 'sc');
        } else if (this.usrol === 'repuestos') {
          this.filteredData = this.allData.filter(item => item && item.modelo === 'sp');
        } else {
          this.filteredData = [...this.allData]; // Create a shallow copy
        }

        // Apply date filter immediately after role filtering
        this.applyDateFilter();
        this.updateStatistics(); // Update dashboard stats

        this.loading = false;
      },
      error: (e) => {
        console.error(e);
        this.loading = false;
        this.showNotification('Error al cargar pedidos', 'error');
      }
    });
  }

  updateStatistics(): void {
    this.stats.totalRevisados = this.allData.filter(item => item.estado === 'REVISADO').length; // Assuming a 'REVISADO' state
    this.stats.informacionErronea = this.allData.filter(item => item.estado === 'ERRONEO').length; // Assuming an 'ERRONEO' state
    this.stats.enProceso = this.allData.filter(item => item.estado === 'PROCESO').length;
    this.stats.enviados = this.allData.filter(item => item.estado === 'ENVIADO').length;
    // You can add logic for percentage changes if you have historical data
  }


  actualizarEstado(item: Pedido): void {
    console.log(`Actualizando estado: ${item.codigo} - ${item.estado}`);

    // Ensure all fields are explicitly converted to their expected types
    const pedidoActualizado = {
      id_pedido: item.id_pedido || 0,
      Cantidad: item.cantidad || 0,
      Codigo: item.codigo || "",
      Descripcion: item.descripcion || "",
      Observaciones: item.observaciones || "",
      Estado: item.estado || "",
      IdUsuarioCreacion: this.id,
      IdUsuarioModificacion: this.id || 0,
      Modelo: item.modelo || "",
      Cliente: item.cliente || "",
      Ot: item.ot || ""
    };

    if (item.id_pedido === undefined) {
      console.error("ID del pedido no está definido. No se puede actualizar el estado.");
      this.showNotification("Error: ID del pedido no definido.", 'error');
      return;
    }

    this.tutorialService.actualizarEstadoPedido(item.id_pedido, pedidoActualizado).subscribe({
      next: () => {
        this.showNotification("Pedido actualizado exitosamente", 'success');
        this.loadImportaciones(); // Refresh data
      },
      error: (err) => {
        const errorMessage = err.error?.message || 'Error desconocido';
        this.showNotification(`Error al actualizar pedido: ${errorMessage}`, 'error');
        console.error("Error al actualizar estado", err);
      }
    });
  }

  getImageUrl(relativePath: string): string {
    // Convert backslashes to forward slashes for web URLs
    const formattedPath = relativePath.replace(/\\/g, '/');
    // Combine with your API base URL
    // Ensure this URL is correct and accessible
    return `https://bodega.vehicentro.com:1830/api/api/${formattedPath}`;
  }

  updatePageData() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.lista = this.filteredData.slice(startIndex, endIndex);
  }

  changePage(page: any) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePageData();
  }

  // Helper method to format date for input fields
  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  applyDateFilter() {
    let tempFilteredData = [...this.allData]; // Start with all data for date filtering

    // Apply role-based filtering first if the user role demands it
    if (this.usrol === 'repuestoslv') {
      tempFilteredData = tempFilteredData.filter(item => item && item.modelo === 'sl');
    } else if (this.usrol === 'repuestoslk') {
      tempFilteredData = tempFilteredData.filter(item => item && item.modelo === 'lc');
    } else if (this.usrol === 'repuestoslsc') {
      tempFilteredData = tempFilteredData.filter(item => item && item.modelo === 'sc');
    } else if (this.usrol === 'repuestos') {
      tempFilteredData = tempFilteredData.filter(item => item && item.modelo === 'sp');
    }

    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999); // Set to end of day for the end date

      tempFilteredData = tempFilteredData.filter(item => {
        // Ensure item.fecha_creacion is a Date object before comparison
        const itemDate = item.fecha_creacion instanceof Date ? item.fecha_creacion : new Date(item.fecha_creacion || '');
        return itemDate >= start && itemDate <= end;
      });
    }

    // Now apply the search term to the date-filtered data
    if (this.searchTerm.trim() !== '') {
      const searchTermLower = this.searchTerm.toLowerCase();
      tempFilteredData = tempFilteredData.filter(item =>
        (item.codigo && item.codigo.toLowerCase().includes(searchTermLower)) ||
        (item.descripcion && item.descripcion.toLowerCase().includes(searchTermLower)) ||
        (item.observaciones && item.observaciones.toLowerCase().includes(searchTermLower)) ||
        (item.cliente && item.cliente.toLowerCase().includes(searchTermLower)) ||
        (item.nombre && item.nombre.toLowerCase().includes(searchTermLower)) ||
        (item.apellido && item.apellido.toLowerCase().includes(searchTermLower))
      );
    }

    this.filteredData = tempFilteredData;
    this.totalItems = this.filteredData.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    this.currentPage = 1; // Reset to first page when filter is applied
    this.updatePageData();
  }

  resetDateFilter() {
    this.startDate = '';
    this.endDate = '';
    this.searchTerm = ''; // Also clear search term on reset
    this.applyDateFilter(); // Re-apply all filters which will effectively show all role-filtered data
  }

  searchImports(): void {
    this.applyDateFilter(); // Re-apply all filters, including the search term
    console.log('Buscando:', this.searchTerm);
  }

  filterData(): void {
    // This button is now redundant if applyDateFilter() is called on (change) and searchImports() handles search.
    // If you plan to implement a more complex filter dialog, this method would be used for that.
    console.log('Filtrar datos - (Currently handled by date and search inputs)');
  }

    asignado(){
    this.router.navigate(['/dashboardbodimp']);
  }

  enviado(){
    this.router.navigate(['/dashboardbodenvia']);
  }

  toggleExportMenu(): void {
    this.showExportMenu = !this.showExportMenu;
  }

  getPaginationArray(): (number | string)[] { // Use string for ellipsis
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;

    if (totalPages <= 7) { // Increased to show more pages directly
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      const pages: (number | string)[] = [];

      pages.push(1);

      if (currentPage > 3) {
        pages.push('...'); // Represents ellipsis
      }

      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        if (i !== 1 && i !== totalPages) { // Avoid duplicating first and last page
          pages.push(i);
        }
      }

      if (currentPage < totalPages - 2) {
        pages.push('...'); // Represents ellipsis
      }

      if (totalPages > 1) {
        pages.push(totalPages);
      }

      // Remove consecutive ellipses and ensure unique numbers
      const uniquePages = pages.filter((value, index, self) =>
        self.indexOf(value) === index && !(value === '...' && self[index - 1] === '...')
      );

      return uniquePages;
    }
  }

  downloadExcel(): void {
    // Map data to a format suitable for Excel, possibly including user full name
    const dataForExcel = this.filteredData.map(item => ({
      'Código': item.codigo,
      'Descripción': item.descripcion,
      'Cantidad': item.cantidad,
      'Cliente': item.cliente,
      'OT': item.ot,
      'Usuario': `${item.nombre || ''} ${item.apellido || ''}`.trim(),
      'Fecha Creación': item.fecha_creacion ? new Date(item.fecha_creacion).toLocaleDateString() : '-',
      'Estado': item.estado,
      'Observaciones': item.observaciones || '-'
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pedidos');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Pedidos_${new Date().toISOString().split('T')[0]}.xlsx`);
    this.showExportMenu = false; // Close menu after download
  }

  downloadCSV(): void {
    let csvContent = 'Código,Descripción,Cantidad,Cliente,OT,Usuario,Fecha Creación,Estado,Observaciones\n';

    this.filteredData.forEach(item => {
      const row = [
        `"${item.codigo || ''}"`,
        `"${item.descripcion || ''}"`,
        `"${item.cantidad || ''}"`,
        `"${item.cliente || ''}"`,
        `"${item.ot || ''}"`,
        `"${`${item.nombre || ''} ${item.apellido || ''}`.trim()}"`,
        `"${item.fecha_creacion ? new Date(item.fecha_creacion).toLocaleDateString() : '-'}"`,
        `"${item.estado || ''}"`,
        `"${item.observaciones || ''}"`
      ].join(',');
      csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `Pedidos_${new Date().toISOString().split('T')[0]}.csv`);
    this.showExportMenu = false; // Close menu after download
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    const toast = document.createElement('div');
    toast.innerText = message;
    toast.classList.add('notificacion', type);
    document.body.appendChild(toast);

    // Trigger reflow to enable transition
    void toast.offsetWidth;

    toast.classList.add('visible');

    setTimeout(() => {
      toast.classList.remove('visible');
      toast.addEventListener('transitionend', () => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, { once: true });
    }, 3000);
  }
}