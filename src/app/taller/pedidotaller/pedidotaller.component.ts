import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import saveAs from 'file-saver';
import { Subscription, forkJoin } from 'rxjs';
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
  nombre?: string;
  apellido?: string;
  ot?: string;
  estado?: string;
  fecha_creacion?: string;
  imagenes?: string[];
  idUsuarioCreacion?: number;
  idUsuarioModificacion?: number;
  observacionesCount?: number; // Para trackear el número de observaciones
}

@Component({
  selector: 'app-pedidotaller',
  templateUrl: './pedidotaller.component.html',
  styleUrls: ['./pedidotaller.component.css']
})

export class PedidotallerComponent implements OnInit, OnDestroy  {
 
showSearchModal: boolean = false; 
  paginaActual:string ='';
  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 0;
  lista: Pedido[] = [];
  allData: Pedido[] = []; // Todos los datos sin paginar
  filteredData: Pedido[] = []; // Datos filtrados por fecha
  id: number = 0;
  agencia:string='';
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
    this.paginaActual='pendiente';
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      console.log(this.usuario);
      if(this.usuario != null){
        this.id = this.usuario.id;
        this.agencia=this.usuario.agencia;
        console.log(this.id);
        this.loadCombinedData();
      }
    });

    this.subscription.add(
      this.reloadService.reload$.subscribe(() => {
        this.loadCombinedData();
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

  openSearchModal(): void {
    this.showSearchModal = true;
    document.body.classList.add('modal-open');
  }

  closeSearchModal(): void {
    this.showSearchModal = false;
    document.body.classList.remove('modal-open');
  }

  totalItems: number = 0;

   
  loadCombinedData() {
    this.loading = true;
    
    // Usar forkJoin para ejecutar ambas peticiones en paralelo
    forkJoin({
      agencyData: this.tutorialService.pedidosbyagencia(this.agencia),
      userData: this.tutorialService.pedidosbyuser(this.id)
    }).subscribe({
      next: (results) => {
        // Combinar los datos de ambas fuentes
        const combinedData = [...results.agencyData, ...results.userData];
        
        // Eliminar duplicados basándose en id_pedido
        this.allData = this.removeDuplicates(combinedData, 'id_pedido');
        
        this.filteredData = this.allData;
        this.totalItems = this.filteredData.length;
        
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        this.updatePageData();
        
        console.log('Datos combinados:', this.allData);
        console.log('Total items:', this.totalItems);
        
        // Load observaciones counts
        this.loadObservacionesCounts();
        
        this.loading = false;
      },
      error: (e) => {
        console.error('Error cargando datos:', e);
        this.loading = false;
      }
    });
  }

 

  // Función para eliminar duplicados
  private removeDuplicates(array: any[], key: string): any[] {
    const seen = new Set();
    return array.filter(item => {
      const value = item[key];
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }
  
  // Mantener las funciones individuales para casos específicos
  loadimportacionesUs() {
    this.loading = true;
    this.tutorialService.pedidosbyuser(this.id).subscribe({
      next: (data: any[]) => {
        console.log(data.length);
        
        this.allData = data;
        this.filteredData = this.allData;
        this.totalItems = this.filteredData.length;
        console.log(this.totalItems);
        
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        this.updatePageData();
        console.log('Datos de usuario:', this.allData);
        
        this.loadObservacionesCounts();
        
        this.loading = false;
      },
      error: (e) => {
        console.error(e);
        this.loading = false;
      }
    });
  }

  loadimportacionesUspro() {
    this.loading = true;
    
    // Combinar datos de proceso por usuario y por agencia
    forkJoin({
      userProcess: this.tutorialService.procesop(this.id),
      agencyProcess: this.tutorialService.pedidosbyagenciapro(this.agencia)
    }).subscribe({
      next: (results) => {
        // Combinar ambos arrays
        const combinedData = [...results.userProcess, ...results.agencyProcess];
        
        // Eliminar duplicados
        this.allData = this.removeDuplicates(combinedData, 'id_pedido');
        
        this.filteredData = this.allData;
        this.totalItems = this.filteredData.length;
        
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        this.updatePageData();
        
        console.log('Datos de proceso combinados:', this.allData);
        
        this.loadObservacionesCounts();
        
        this.loading = false;
      },
      error: (e) => {
        console.error(e);
        this.loading = false;
      }
    });
  }

  loadimportaciones() {
    this.loading = true;
    this.tutorialService.pedidosbyagencia(this.agencia).subscribe({
      next: (data: any[]) => {
        console.log(data.length);
        
        this.allData = data;
        this.filteredData = this.allData;
        this.totalItems = this.filteredData.length;
        console.log(this.totalItems);
        
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        this.updatePageData();
        console.log('Datos de agencia:', this.allData);
        
        this.loadObservacionesCounts();
        
        this.loading = false;
      },
      error: (e) => {
        console.error(e);
        this.loading = false;
      }
    });
  }

   loadimportacionespro() {
    this.loading = true;
    this.tutorialService.pedidosbyagenciapro(this.agencia).subscribe({
      next: (data: any[]) => {
        console.log(data.length);
        
        this.allData = data;
        this.filteredData = this.allData;
        this.totalItems = this.filteredData.length;
        console.log(this.totalItems);
        
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        this.updatePageData();
        console.log('Todos los datos:', this.allData);
        
        this.loadObservacionesCounts();
        
        this.loading = false;
      },
      error: (e) => {
        console.error(e);
        this.loading = false;
      }
    });
  }

  loadimportacionesasig() {
    this.loading = true;
    
    // Combinar datos de proceso por usuario y por agencia
    forkJoin({
      userProcess: this.tutorialService.asignadop(this.id),
      agencyProcess: this.tutorialService.pedidosbyagenciaasig(this.agencia)
    }).subscribe({
      next: (results) => {
        // Combinar ambos arrays
        const combinedData = [...results.userProcess, ...results.agencyProcess];
        
        // Eliminar duplicados
        this.allData = this.removeDuplicates(combinedData, 'id_pedido');
        
        this.filteredData = this.allData;
        this.totalItems = this.filteredData.length;
        
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        this.updatePageData();
        
        console.log('Datos de proceso combinados:', this.allData);
        
        this.loadObservacionesCounts();
        
        this.loading = false;
      },
      error: (e) => {
        console.error(e);
        this.loading = false;
      }
    });
  }

  loadimportacionesrev() {
     this.loading = true;
    
    // Combinar datos de proceso por usuario y por agencia
    forkJoin({
      userProcess: this.tutorialService.revisadop(this.id),
      agencyProcess: this.tutorialService.pedidosbyagenciarev(this.agencia)
    }).subscribe({
      next: (results) => {
        // Combinar ambos arrays
        const combinedData = [...results.userProcess, ...results.agencyProcess];
        
        // Eliminar duplicados
        this.allData = this.removeDuplicates(combinedData, 'id_pedido');
        
        this.filteredData = this.allData;
        this.totalItems = this.filteredData.length;
        
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        this.updatePageData();
        
        console.log('Datos de proceso combinados:', this.allData);
        
        this.loadObservacionesCounts();
        
        this.loading = false;
      },
      error: (e) => {
        console.error(e);
        this.loading = false;
      }
    });
  }

    loadimportacioneserror() {
    this.loading = true;
    this.tutorialService.pedidosbyagenciaerror(this.agencia).subscribe({
      next: (data: any[]) => {
        console.log(data.length);
        
        this.allData = data;
        this.filteredData = this.allData;
        this.totalItems = this.filteredData.length;
        console.log(this.totalItems);
        
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        this.updatePageData();
        console.log('Todos los datos:', this.allData);
        
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

  // Agregar este método a la clase
  openImageModal(imageUrl: string): void {
    this.selectedImageUrl = imageUrl;
    this.isModalOpen = true;
  }

  // Agregar este método a la clase
  closeImageModal(): void {
    this.isModalOpen = false;
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
    this.paginaActual = 'pendiente';
    this.loadCombinedData(); // Usar la función combinada
  }
  
  revisado(){
    this.paginaActual = 'revisado';
    this.loadimportacionesrev();
  }
  
 proceso(){
  this.paginaActual = 'proceso';
    this.loadimportacionesUspro(); // Esta ya combina los datos
  }
  
  //pedidosbodasig
  asignado(){
    this.paginaActual = 'asignado';
    this.loadimportacionesasig();
  }

  error(){
    this.paginaActual = 'error';
     this.loadimportacioneserror(); 
  }

  individual(){
    this.router.navigate(['/pedidotaller']);
  }

  sugerido(){
    this.router.navigate(['/pedidosbodinser']);
  }

  excel(){
    this.router.navigate(['/pedidotallerexcel']);
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