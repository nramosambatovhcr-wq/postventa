import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import saveAs from 'file-saver';
import { Subscription } from 'rxjs';
import { Usuario } from '../../models/usuario';
import { AuthService } from '../../services/auth.service';
import { PedidobodegaService } from '../../services/pedidobodega.service';
import { ReloadService } from '../../services/reload.service';
import * as XLSX from 'xlsx';

interface Pedido {
  id_pedido?: number;
  codigo: string;
  descripcion: string;
  observaciones?: string;
  cantidad: number;
  modelo?: string;
  cliente?: string;
  ot?: string;
  estado?: string;
  fecha_creacion?: string;
  imagenes?: string[];
  idUsuarioCreacion?: number;
  idUsuarioModificacion?: number;
  observacionesCount?: number; // Para trackear el número de observaciones
}

@Component({
  selector: 'app-pedidosbodasig',
  templateUrl: './pedidosbodasig.component.html',
  styleUrls: ['./pedidosbodasig.component.css']
})
export class PedidosbodasigComponent implements OnInit, OnDestroy  {
  stats = {
    totalImportaciones: 7,
    enTransito: 24,
    pendientesLiquidacion: 18,
    tiempoPromedio: 28
  };

  paginaActual:string ='';
  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 0;
  lista: Pedido[] = [];
  allData: Pedido[] = []; // Todos los datos sin paginar
  filteredData: Pedido[] = []; // Datos filtrados por fecha
  id: number = 0;
  usuario: Usuario | null = null;
  loading = false;
  private subscription = new Subscription();

  // Date filter variables
  startDate: string = '';
  endDate: string = '';

  // Modal de imagen
  selectedImageUrl: string = '';
  isModalOpen: boolean = false;

  // Modal de observaciones
  observacionesModalVisible: boolean = false;
  selectedPedido: Pedido | null = null;

  // Cache para contar observaciones
  private observacionesCache: Map<number, number> = new Map();

  constructor(
    private router: Router, 
    private tutorialService: PedidobodegaService, 
    private reloadService: ReloadService, 
    private authService: AuthService,
  ) { }

  ngOnInit(): void {
    this.paginaActual='asignado';
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      console.log(this.usuario);
      if(this.usuario != null){
        this.id = this.usuario.id;
        console.log(this.id);
        this.loadimportaciones();
      }
    });

    this.subscription.add(
      this.reloadService.reload$.subscribe(() => {
        this.loadimportaciones();
        this.loadObservacionesCounts();
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
  
  loadimportaciones() {
    this.loading = true;
    this.tutorialService.asignadop(this.id).subscribe({
      next: (data: any[]) => {
        console.log(data.length);
        
        this.allData = data;
        this.filteredData = this.allData; // Initialize filtered data with all data
        this.totalItems = this.filteredData.length;
        console.log(this.totalItems);
        
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        this.updatePageData();
        console.log('Todos los datos:', this.allData);
        
        // Apply date filter if dates are set
      /*  if (this.startDate && this.endDate) {
          this.applyDateFilter();
        }
        */
        // Load observaciones counts
        this.loadObservacionesCounts();
        
        this.loading = false;
      },
      error: (e) => {
        console.error(e);
        this.loading = false;
      }
    });
  }

  // Cargar el conteo de observaciones para cada pedido
  loadObservacionesCounts(): void {
    this.allData.forEach(pedido => {
      if (pedido.id_pedido) {
        this.tutorialService.getObservacionesPedido(pedido.id_pedido).subscribe({
          next: (observaciones: any[]) => {
            if (pedido.id_pedido) {
              this.observacionesCache.set(pedido.id_pedido, observaciones.length);
            }
          },
          error: (err) => {
            console.error('Error cargando observaciones para pedido:', pedido.id_pedido, err);
          }
        });
      }
    });
  }

  // Obtener el número de observaciones para un pedido
  getObservacionesCount(pedido: Pedido): number {
    if (!pedido.id_pedido) return 0;
    return this.observacionesCache.get(pedido.id_pedido) || 0;
  }

  // Abrir modal de observaciones
  openObservacionesModal(pedido: Pedido): void {
    this.selectedPedido = pedido;
    this.observacionesModalVisible = true;
  }

  // Cerrar modal de observaciones
  closeObservacionesModal(): void {
    this.observacionesModalVisible = false;
    this.selectedPedido = null;
    
    // Recargar conteos de observaciones
    this.loadObservacionesCounts();
  }

  // Editar pedido (puedes implementar esta función según tus necesidades)
  editarPedido(pedido: Pedido): void {
    console.log('Editar pedido:', pedido);
    // Implementar lógica de edición
    // Por ejemplo, redirigir a una página de edición:
    // this.router.navigate(['/pedidos/editar', pedido.id_pedido]);
  }

  // Agregar este método a la clase
  openImageModal(imageUrl: string): void {
    this.selectedImageUrl = imageUrl;
    this.isModalOpen = true;
  }

  // Agregar este método a la clase
  closeImageModal(): void {
    this.isModalOpen = false;
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
        this.showToast("Pedido actualizado exitosamente", 'success');
        this.loadimportaciones();
        console.log("Estado actualizado");
      },
      error: (err) => {
        this.showToast(`Error al actualizar pedido: ${err.error?.message || 'Error desconocido'}`, 'error');
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
      this.filteredData = this.allData;
    } else {
      const start = new Date(this.startDate);
      // Set to end of day for the end date
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);

      this.filteredData = this.allData.filter(item => {
        const itemDate = new Date(item.fecha_creacion || '');
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
    this.filteredData = this.allData;
    this.totalItems = this.filteredData.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    this.currentPage = 1;
    this.updatePageData();
  }

  searchImports(): void {
    if (this.searchTerm.trim() === '') {
      // If search term is empty, apply only date filter
      this.applyDateFilter();
    } else {
      // Apply both search and date filters
      const searchTermLower = this.searchTerm.toLowerCase();
      
      // First, filter by date
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
      
      // Then, filter by search term
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
    console.log('Buscando:', this.searchTerm);
  }

  filterData(): void {
    // Show a more advanced filter modal/dialog
    console.log('Filtrar datos');
  }
pendiente(){
    this.router.navigate(['/pedidosbod']);
  }
  revisado(){
    this.router.navigate(['/pedidosbodrev']);
  }

  proceso(){
    this.router.navigate(['/pedidosbodproce']);
  }
  //pedidosbodasig
  asignado(){
    this.router.navigate(['/pedidosbodasig']);
  }

  error(){
    this.router.navigate(['/pedidosboderror']);
  }

  individual(){
    this.router.navigate(['/pedidosbodinser']);
  }

  sugerido(){
    this.router.navigate(['/pedidosbodinser']);
  }

  excel(){
    this.router.navigate(['/pedidosbodexcel']);
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

  // Método para mostrar notificaciones toast
  private showToast(message: string, type: 'success' | 'error' | 'warning'): void {
    const toast = document.createElement('div');
    toast.innerText = message;
    toast.className = `toast toast-${type}`;
    
    // Estilos del toast
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
    
    // Remover el toast después de 4 segundos
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