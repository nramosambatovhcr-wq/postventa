import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import saveAs from 'file-saver';
import { Subscription } from 'rxjs';
import { Usuario } from '../models/usuario';
import { AuthService } from '../services/auth.service';
import { PedidobodegaService } from '../services/pedidobodega.service';
import { ReloadService } from '../services/reload.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-sugeridosaderror',
  templateUrl: './sugeridosaderror.component.html',
  styleUrls: ['./sugeridosaderror.component.css']
})
export class SugeridosaderrorComponent implements OnInit, OnDestroy  {
  stats = {
    totalImportaciones: 0,
    enTransito: 0,
    pendientesLiquidacion: 0,
    tiempoPromedio: 28
  };

  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 0;
  lista: any[] = []; // Datos mostrados en la vista
  allData: any[] = []; // Todos los datos sin filtrar
  allData1: any[] = [];
  filteredData: any[] = []; // Datos filtrados 
  id: number = 0;
  usuario: Usuario | null = null;
  loading = false;
  private subscription = new Subscription();

  // Date filter variables
  startDate: string = '';
  endDate: string = '';
  filtersApplied: boolean = false; // Flag to track if filters are applied

  selectedImageUrl: string = '';
  isModalOpen: boolean = false;
  totalItems: number = 0;
  showExportMenu: boolean = false;
    usrol='';

  constructor(
    private router: Router, 
    private tutorialService: PedidobodegaService, 
    private reloadService: ReloadService, 
    private authService: AuthService,
  ) { }

  ngOnInit(): void {
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      if(this.usuario != null){
        this.id = this.usuario.id;
        this.usrol=this.usuario.rol;
        this.loadimportaciones();
      }
    });

    this.subscription.add(
      this.reloadService.reload$.subscribe(() => {
        this.loadimportaciones();
      })
    );

    // Inicializar con el mes actual pero no aplicar filtros todavía
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    this.startDate = this.formatDateForInput(firstDayOfMonth);
    this.endDate = this.formatDateForInput(lastDayOfMonth);
  }

  // Método para abrir la modal de imagen
  openImageModal(imageUrl: string): void {
    this.selectedImageUrl = imageUrl;
    this.isModalOpen = true;
  }

  // Método para cerrar la modal de imagen
  closeImageModal(): void {
    this.isModalOpen = false;
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
  
  loadimportaciones() {
    this.loading = true;
    this.tutorialService.revisado().subscribe({
      next: (data: any) => {
        console.log('Total registros cargados:', data.length);
        console.log(data);
        
        // Almacenar todos los datos originales
        this.allData = data;
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
            return item && item.modelo === 'sw';
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
        
        // Inicialmente mostrar todos los datos sin filtrar
        this.filteredData = [...this.allData]; 
        this.totalItems = this.filteredData.length;
        this.updateDisplayedData();
        
        this.calculateStats();
        this.loading = false;
      },
      error: (e) => {
        console.error('Error al cargar datos:', e);
        this.loading = false;
      }
    });
  }
  
  // Actualiza los datos mostrados después de aplicar filtros
  updateDisplayedData() {
    this.totalItems = this.filteredData.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    
    // Asegurar que la página actual sea válida
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = 1;
    }
    
    // Calcular los índices para la paginación
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = Math.min(startIndex + this.itemsPerPage, this.totalItems);
    
    // Actualizar la lista que se muestra en la vista
    this.lista = this.filteredData.slice(startIndex, endIndex);
    
    console.log(`Mostrando ${this.lista.length} registros (de ${this.totalItems} filtrados)`);
  }
  
  calculateStats(): void {
    this.stats = {
      totalImportaciones: this.allData.length,
      enTransito: this.allData.filter(item => item.estado === 'Revisado').length,
      pendientesLiquidacion: this.allData.filter(item => item.liquidacion === 'Pendiente').length,
      tiempoPromedio: 28
    };
    console.log('Estadísticas calculadas:', this.stats);
  }

  // Método para actualizar el estado de un pedido
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
  
  changePage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updateDisplayedData();
  }

  // Helper method to format date for input fields
  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Aplicar filtro por fechas
  applyDateFilter() {
    // Empezamos desde todos los datos originales
    this.filteredData = [...this.allData1];
    
    // Aplicar filtro de fechas si ambas están definidas
    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      start.setHours(0, 0, 0, 0); // Inicio del día
      
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999); // Fin del día
      
      this.filteredData = this.filteredData.filter(item => {
        if (!item.fecha) return false;
        
        const itemDate = new Date(item.fecha);
        return itemDate >= start && itemDate <= end;
      });
      
      this.filtersApplied = true;
    }
    
    // Si hay un término de búsqueda, aplicarlo sobre los datos ya filtrados por fecha
    if (this.searchTerm.trim() !== '') {
      this.applySearchFilter(false); // No resetear filteredData porque ya aplicamos el filtro de fecha
    } else {
      // Si no hay término de búsqueda, actualizar la vista con los datos filtrados por fecha
      this.currentPage = 1;
      this.updateDisplayedData();
    }
  }

  // Aplicar filtro por término de búsqueda
  // El parámetro resetData determina si empezamos desde allData (true) o desde filteredData actual (false)
  applySearchFilter(resetData: boolean = true) {
    const searchTermLower = this.searchTerm.toLowerCase().trim();
    
    if (searchTermLower === '') {
      if (resetData) {
        // Si no hay término de búsqueda y estamos reseteando, volver a los datos originales
        this.filteredData = [...this.allData];
        
        // Volver a aplicar filtro de fechas si está activo
        if (this.startDate && this.endDate) {
          this.applyDateFilter();
          return; // applyDateFilter ya actualiza la vista
        }
      }
      // En cualquier otro caso, mantener los datos actuales sin aplicar filtro de búsqueda
    } else {
      // Si hay un término de búsqueda, determinar desde qué conjunto de datos filtrar
      const dataToFilter = resetData ? [...this.allData] : this.filteredData;
      
      // Aplicar el filtro de búsqueda
      this.filteredData = dataToFilter.filter(item => 
        (item.codigo && item.codigo.toLowerCase().includes(searchTermLower)) ||
        (item.descripcion && item.descripcion.toLowerCase().includes(searchTermLower)) ||
        (item.observacion && item.observacion.toLowerCase().includes(searchTermLower))
      );
      
      this.filtersApplied = true;
    }
    
    // Actualizar la vista con los resultados del filtro
    this.currentPage = 1;
    this.updateDisplayedData();
  }

  // Buscar importaciones (llamado al presionar Enter o hacer clic en el botón Buscar)
  searchImports(): void {
    if (this.startDate && this.endDate) {
      // Si hay fechas definidas, aplicar primero el filtro de fechas y luego el de búsqueda
      this.applyDateFilter();
    } else if (this.searchTerm.trim() !== '') {
      // Si no hay fechas pero sí hay un término de búsqueda, aplicar solo el filtro de búsqueda
      this.applySearchFilter(true);
    } else {
      // Si no hay filtros, mostrar todos los datos
      this.filteredData = [...this.allData];
      this.filtersApplied = false;
      this.currentPage = 1;
      this.updateDisplayedData();
    }
  }

  // Resetear filtro de fechas y búsqueda
  resetDateFilter() {
    this.startDate = '';
    this.endDate = '';
    this.searchTerm = '';
    this.filtersApplied = false;
    this.filteredData = [...this.allData];
    this.currentPage = 1;
    this.updateDisplayedData();
  }

  filterData(): void {
    // Show a more advanced filter modal/dialog
    console.log('Filtrar datos');
  }

  revisado() {
    this.router.navigate(['/sugeridosad']);
  }
  
  vehis() {
    this.router.navigate(['/sugeridosaderror']);
  }

  toggleExportMenu(): void {
    this.showExportMenu = !this.showExportMenu;
  }
  
  getPaginationArray(): number[] {
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;
    
    if (totalPages <= 5) {
      // Mostrar todas las páginas si son 5 o menos
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      // Lógica para mostrar páginas con elipsis
      const pages: number[] = [];
      
      // Siempre mostrar la primera página
      pages.push(1);
      
      // Añadir elipsis si el inicio está lejos
      if (currentPage > 3) {
        pages.push(-1); // -1 representa elipsis
      }
      
      // Añadir páginas alrededor de la actual
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      
      // Añadir elipsis si el final está lejos
      if (currentPage < totalPages - 2) {
        pages.push(-1); // -1 representa elipsis
      }
      
      // Siempre mostrar la última página
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
        item.observacion || '-',
        item.fecha ? new Date(item.fecha).toLocaleDateString() : '-',
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