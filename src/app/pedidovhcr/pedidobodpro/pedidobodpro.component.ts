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
  cliente?: string; // Hacemos 'cliente' opcional para que sea compatible
  ot?: string;
  nombre?: string;
  apellido?: string;
  fecha_creacion?: Date;
  imagenes?: string[];
}

export interface Pedido1 {
   id_pedido: number;
  codigo: string;
  descripcion: string;
  cantidad: number;
  observaciones: string;
  estado: string;
  idUsuarioCreacion: number;
  idUsuarioModificacion: number;
  modelo: string;
  cliente: string;
  ot: string;
  nombre: string; // User's first name
  apellido: string; // User's last name
  fecha_creacion: string; // Or Date type if parsed
  imagenes: string[]; // Array of image paths
  comentarios?: Comment[]; // Optional array of comments
}

export interface Comment {
  usuario: string;
  texto: string;
  fecha: string;
  id?: number; // Or Date type
  // Add other comment properties if applicable (e.g., userId)
}


@Component({
  selector: 'app-pedidobodpro',
  templateUrl: './pedidobodpro.component.html',
  styleUrls: ['./pedidobodpro.component.css']
})
export class PedidobodproComponent implements OnInit, OnDestroy  {
  stats = {
    totalImportaciones: 7,
    enTransito: 24,
    pendientesLiquidacion: 18,
    tiempoPromedio: 28
  };

  // Para el modal de observaciones
  selectedPedido: Pedido | null = null;
  
  observacionesModalVisible: boolean = false;
  showSearchModal: boolean = false; 

  paginaActual:string='';
  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 0;
  lista: any[] = [];
  allData: any[] = []; // Todos los datos sin paginar
  filteredData: any[] = []; // Datos filtrados por fecha
  id: number = 0;
  usuario: Usuario | null = null;
  loading = false;
  usrol='';
  allData1: any[] = [];
  private subscription = new Subscription();

  // Date filter variables
  startDate: string = '';
  endDate: string = '';

  constructor(
    private router: Router, 
    private tutorialService: PedidobodegaService, 
    private reloadService: ReloadService, 
    private authService: AuthService,
  
  ) { }

  ngOnInit(): void {
    this.paginaActual='proceso';
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      console.log(this.usuario);
      if(this.usuario != null){
        this.id = this.usuario.id;
        this.usrol=this.usuario.rol;
        console.log(this.id);
        this.loadimportaciones();
      }
    });

    this.subscription.add(
      this.reloadService.reload$.subscribe(() => {
        this.loadimportaciones();
      })
    );

    // Initialize date filters with current month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    this.startDate = this.formatDateForInput(firstDayOfMonth);
    this.endDate = this.formatDateForInput(lastDayOfMonth);
  }

  openSearchModal(): void {
    this.showSearchModal = true;
    document.body.classList.add('modal-open');
  }

  closeSearchModal(): void {
    this.showSearchModal = false;
    document.body.classList.remove('modal-open');
  }
   showObservacionesModal1: boolean = false;
  selectedPedidoId: number | null = null;

  // ... resto del código existente ...

  // Nueva función para abrir el modal de observaciones
  verObservaciones(idPedido: number): void {
    this.selectedPedidoId = idPedido;
    this.showObservacionesModal1 = true;
    console.log('Abriendo observaciones para pedido:', idPedido);
  }

  // Nueva función para cerrar el modal de observaciones
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
    this.loadimportaciones();
  }

  selectedImageUrl: string = '';
  isModalOpen: boolean = false;

  // Agregar este método a la clase
  openImageModal(imageUrl: string): void {
    this.selectedImageUrl = imageUrl;
    this.isModalOpen = true;
  }

  // Agregar este método a la clase
  closeImageModal(): void {
    this.isModalOpen = false;
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  totalItems: number = 0;
  
  loadimportaciones() {
    this.loading = true;
    this.tutorialService.pedidosprocesado().subscribe({
      next: (data: any) => {
        console.log(data.length);
        
        this.allData = data;
        console.log(this.allData);
        if (this.usrol == 'repuestoslv') {
          let nn= this.allData.filter(item => {
            // Filtra elementos cuyo modelo sea 'sl'
            return item && item.modelo === 'sl';
          });
          console.log(nn);
          this.filteredData=nn;
          this.allData1=this.filteredData;
        }
        else if(this.usrol == 'repuestoslk'){
          let nn= this.allData.filter(item => {
            // Filtra elementos cuyo modelo sea 'sl'
            return item && item.modelo === 'lc';
          });
          console.log(nn);
          this.filteredData=nn;
          this.allData1=this.filteredData;
        }
        else if(this.usrol == 'repuestoslsc'){
          let nn= this.allData.filter(item => {
            // Filtra elementos cuyo modelo sea 'sl'
            return item && item.modelo === 'sc';
          });
          console.log(nn);
          this.filteredData=nn;
          this.allData1=this.filteredData;
        }
        else if(this.usrol == 'repuestos'){
          let nn= this.allData.filter(item => {
            // Filtra elementos cuyo modelo sea 'sl'
            return item && item.modelo === 'sp';
          });
          console.log(nn);
          this.filteredData=nn;
          this.allData1=this.filteredData;
        }
        else{
          this.filteredData = this.allData; 
          this.allData1=this.filteredData;
        }
        console.log(this.filteredData);
        
       /* this.filteredData = this.allData.filter(item => {
          // Si el item tiene una propiedad pedido que contiene el estado
          if (item.pedido && item.pedido.estado === 'ERRONEO') {
            return true;
          }
          // O si el estado está directamente en el item
          else if (item.estado === 'ERRONEO') {
            return true;
          }
          return false;
        });*/

       // this.filteredData = this.allData; // Initialize filtered data with all data
        this.totalItems = this.filteredData.length;
        console.log(this.totalItems);
        
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        this.updatePageData();
        //console.log('Todos los datos:', this.allData);
        
        // Apply date filter if dates are set
       /*if (this.startDate && this.endDate) {
          this.applyDateFilter();
        }*/
        
        this.loading = false;
      },
      error: (e) => {
        console.error(e);
        this.loading = false;
      }
    });
  }

  actualizarEstado(item: any): void {
    console.log(`Actualizando estado: ${item.codigo} - ${item.estado}`);
    
    // Make sure all fields are explicitly converted to their expected types
    const pedidoActualizado = {
      id_pedido: parseInt(item.id_pedido) || 0,
      Cantidad: parseInt(item.cantidad) || 0,
      Codigo: String(item.codigo || ""),
      Descripcion: String(item.descripcion || ""),
      Observaciones: String(item.observaciones || ""),
      Estado: String(item.estado || ""),
      IdUsuarioCreacion: parseInt(item.idUsuarioCreacion) || 0,
      IdUsuarioModificacion: parseInt(item.idUsuarioModificacion) || 0,
      Modelo: String(item.modelo || ""),
      Cliente: String(item.cliente || ""),
      Ot: String(item.ot || "")
    };
    
    console.log("Enviando objeto:", JSON.stringify(pedidoActualizado));
    
    this.tutorialService.actualizarEstadoPedido(item.id_pedido, pedidoActualizado).subscribe({
      next: () => {
        // Create a simple toast notification div
        const toast = document.createElement('div');
        toast.innerText = "Pedido actualizado exitosamente";
        toast.style.position = 'fixed';
        toast.style.top = '20px';
        toast.style.right = '20px';
        toast.style.backgroundColor = '#4CAF50';
        toast.style.color = 'white';
        toast.style.padding = '15px 20px';
        toast.style.borderRadius = '4px';
        toast.style.zIndex = '9999';
        toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        
        // Add to document
        document.body.appendChild(toast);
        
        // Remove after 3 seconds
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 3000);
        
        // Refresh data
        this.loadimportaciones();
        console.log("Estado actualizado");
      },
      error: (err) => {
        // Create error toast
        const toast = document.createElement('div');
        toast.innerText = `Error al actualizar pedido: ${err.error?.message || 'Error desconocido'}`;
        toast.style.position = 'fixed';
        toast.style.top = '20px';
        toast.style.right = '20px';
        toast.style.backgroundColor = '#F44336';
        toast.style.color = 'white';
        toast.style.padding = '15px 20px';
        toast.style.borderRadius = '4px';
        toast.style.zIndex = '9999';
        toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        
        // Add to document
        document.body.appendChild(toast);
        
        // Remove after 3 seconds
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 3000);
        
        console.error("Error al actualizar estado", err);
        console.error("Cuerpo de la respuesta:", err.error);
      }
    });
  }

  getImageUrl(relativePath: string): string {
    // Convert backslashes to forward slashes for web URLs
    const formattedPath = relativePath.replace(/\\/g, '/');
    
    // Combine with your API base URL
    return `https://bodega.vehicentro.com:1830/api/api/${formattedPath}`;
  }
  
  updatePageData() {
    console.log(this.filteredData);
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.lista = this.filteredData.slice(startIndex, endIndex);
  }
  
  changePage(page: number) {
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

  // Date filter methods
  applyDateFilter() {
    if (!this.startDate || !this.endDate) {
      this.filteredData = this.allData1;
    } else {
      const start = new Date(this.startDate);
      // Set to end of day for the end date
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);

      this.filteredData = this.allData1.filter(item => {
        const itemDate = new Date(item.fecha_creacion);
        return itemDate >= start && itemDate <= end;
      });
    }
    
    this.totalItems = this.filteredData.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    this.currentPage = 1; // Reset to first page when filter is applied
    this.updatePageData();
  }

  resetDateFilter() {
    this.startDate = '';
    this.endDate = '';
    this.filteredData = this.allData1;
    this.totalItems = this.filteredData.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    this.currentPage = 1;
    this.updatePageData();
  }

  // ========== ORDENAMIENTO ==========
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  sortBy(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applySort();
  }

  private applySort(): void {
    if (!this.sortColumn) return;
    this.filteredData = [...this.filteredData].sort((a, b) => {
      let valA = a[this.sortColumn];
      let valB = b[this.sortColumn];

      if (this.sortColumn === 'fecha_creacion') {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
      } else if (typeof valA === 'string') {
        valA = valA?.toLowerCase() ?? '';
        valB = valB?.toLowerCase() ?? '';
      } else {
        valA = valA ?? 0;
        valB = valB ?? 0;
      }

      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    this.currentPage = 1;
    this.updatePageData();
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return 'fa-sort';
    return this.sortDirection === 'asc' ? 'fa-sort-asc' : 'fa-sort-desc';
  }
  // ========== FIN ORDENAMIENTO ==========

  searchImports(): void {
    if (this.searchTerm.trim() === '') {
      this.applyDateFilter();
    } else {
      const searchTermLower = this.searchTerm.toLowerCase();
      const usuarioCompleto = (item: any) =>
        `${item.nombre ?? ''} ${item.apellido ?? ''}`.toLowerCase();

      this.filteredData = this.allData1.filter(item =>
        (item.codigo        && item.codigo.toLowerCase().includes(searchTermLower)) ||
        (item.descripcion   && item.descripcion.toLowerCase().includes(searchTermLower)) ||
        (item.observaciones && item.observaciones.toLowerCase().includes(searchTermLower)) ||
        (item.cliente       && item.cliente.toLowerCase().includes(searchTermLower)) ||
        (item.ot            && item.ot.toLowerCase().includes(searchTermLower)) ||
        usuarioCompleto(item).includes(searchTermLower)
      );

      this.totalItems = this.filteredData.length;
      this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
      this.currentPage = 1;
      this.updatePageData();
    }
  }

  filterData(): void {
    // Show a more advanced filter modal/dialog
    console.log('Filtrar datos');
  }

revisado(){
    this.paginaActual='revisado';
    this.router.navigate(['/pedidobodrev']);
  }
    pendiente(){
    this.paginaActual='pendiente';
    this.router.navigate(['/pedidobod']);
  }
  
  clocal(){
        this.paginaActual = 'clocal';
        this.router.navigate(['/clocal']);
    }

 proceso(){
   this.paginaActual='proceso';
    this.router.navigate(['/pedidobodpro']);
  }

   asignado(){
 this.paginaActual='asignado';
    this.router.navigate(['/pedidobodasig']);
  }

  error(){
     this.paginaActual='error';
    this.router.navigate(['/pedidoboderror']);
  }

  resetearEstado() {
    this.paginaActual = '';
  }

  // Método para verificar si una tarjeta está activa (opcional)
  esTarjetaActiva(tipo: string): boolean {
    return this.paginaActual === tipo;
  }
 

  showExportMenu: boolean = false;

  toggleExportMenu(): void {
    this.showExportMenu = !this.showExportMenu;
  }

  getPaginationArray(): number[] {
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;
    
    if (totalPages <= 5) {
      // Show all pages if there are 5 or fewer
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      // Logic for showing pages with ellipsis
      const pages: number[] = [];
      
      // Always show the first page
      pages.push(1);
      
      // Add ellipsis if the start is far
      if (currentPage > 3) {
        pages.push(-1); // -1 represents ellipsis
      }
      
      // Add pages around the current one
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      
      // Add ellipsis if the end is far
      if (currentPage < totalPages - 2) {
        pages.push(-1); // -1 represents ellipsis
      }
      
      // Always show the last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
      
      return pages;
    }
  }

  downloadExcel(): void {
    // Create worksheet from filtered data
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredData);
    
    // Create workbook and add the worksheet
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pedidos');
    
    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    
    // Create a Blob from the buffer
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Save the file
    saveAs(blob, `Pedidos_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  downloadCSV(): void {
    // Convert data to CSV format
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
    
    // Create a Blob from the CSV content
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    
    // Save the file
    saveAs(blob, `Pedidos_${new Date().toISOString().split('T')[0]}.csv`);
  }
}