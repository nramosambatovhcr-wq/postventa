import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import saveAs from 'file-saver';
import { Subscription } from 'rxjs';
import { Usuario } from '../../models/usuario';
import { AuthService } from '../../services/auth.service';
import { PedidobodegaService } from '../../services/pedidobodega.service';
import { ReloadService } from '../../services/reload.service';
import * as XLSX from 'xlsx';


@Component({
  selector: 'app-sugeridoslabrev',
  templateUrl: './sugeridoslabrev.component.html',
  styleUrls: ['./sugeridoslabrev.component.css']
})
export class SugeridoslabrevComponent implements OnInit, OnDestroy  {
  stats = {
    totalImportaciones: 7,
    enTransito: 24,
    pendientesLiquidacion: 18,
    tiempoPromedio: 28
  };

  paginaActual: string = '';

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
  cantidades:number=0;
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
    this.paginaActual = 'revisados';
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
      })
    );

    // Initialize date filters with current month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    this.startDate = this.formatDateForInput(firstDayOfMonth);
    this.endDate = this.formatDateForInput(lastDayOfMonth);
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
    this.tutorialService.sugeridoslabbyuser(this.id).subscribe({
      next: (data: any) => {
        console.log(data.length);
        
        this.allData = data;
        this.filteredData = this.allData; // Initialize filtered data with all data
        this.totalItems = this.filteredData.length;
        this.cantidades=this.totalItems;
        console.log(this.totalItems);
        
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        this.updatePageData();
        console.log('Todos los datos:', this.allData);
        
        // Apply date filter if dates are set
        if (this.startDate && this.endDate) {
          this.applyDateFilter();
        }
        
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
    // const formattedPath = relativePath.split(/[\\\/]/).pop();
    
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
          const itemDate = new Date(item.fecha_creacion);
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
    this.paginaActual = 'pendiente';
    this.router.navigate(['/dashboardsugelab']);
  }
  revisado(){
    this.paginaActual = 'revisados';
    this.router.navigate(['/sugeridoslabrev']);
  }
resetearEstado() {
    this.paginaActual = '';
  }

  // Método para verificar si una tarjeta está activa (opcional)
  esTarjetaActiva(tipo: string): boolean {
    return this.paginaActual === tipo;
  }

individual(){
   this.paginaActual = 'crear';
  this.router.navigate(['/sugelabcrear']);
}
sugerido(){
  this.router.navigate(['/pedidosbodinser']);
}
excel(){
   this.paginaActual = 'excel';
this.router.navigate(['/sugelabexcel']);
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