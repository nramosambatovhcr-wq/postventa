import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import saveAs from 'file-saver';
import { Subscription } from 'rxjs';
import { Usuario } from '../models/usuario';
import { AuthService } from '../services/auth.service';
import { PedidobodegaService } from '../services/pedidobodega.service';
import { ReloadService } from '../services/reload.service';
import * as XLSX from 'xlsx';

// Define the interface for a single vehicle, based on your API response
export interface Vehiculo {
  id: number;
  fecha: string;
  motor: string;
  chasis: string;
  frontal: string;
  caja: string;
  drive: string;
  modelo: string;
  linea: string;
  diferencial: string;
  // Add any other properties returned by your API
}

@Component({
  selector: 'app-laboratoriovehis',
  templateUrl: './laboratoriovehis.component.html',
  styleUrls: ['./laboratoriovehis.component.css']
})
export class LaboratoriovehisComponent implements OnInit, OnDestroy  {
  stats = {
    totalImportaciones: 7,
    enTransito: 24,
    pendientesLiquidacion: 18,
    tiempoPromedio: 28
  };

  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 0;

  lista: Vehiculo[] = [];
  allData: Vehiculo[] = [];
  filteredData: Vehiculo[] = [];

  id: number = 0;
  usuario: Usuario | null = null;
  rolusuario: any;
  loading = false;
  private subscription = new Subscription();

  // Date filter variables
  startDate: string = '';
  endDate: string = '';

  // Advanced filters
  showFilters: boolean = false;
  filters = {
    linea: '',
    modelo: '',
    motor: '',
    chasis: '',
    frontal: '',
    caja: '',
    drive: '',
    diferencial: ''
  };

  constructor(
    private router: Router, 
    private tutorialService: PedidobodegaService, 
    private reloadService: ReloadService, 
    private authService: AuthService,
  ) { }

  ngOnInit(): void {
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      console.log(this.usuario);
      if(this.usuario != null){
        this.id = this.usuario.id;
        this.rolusuario = this.usuario.rol;
        if(this.rolusuario === 'admin' || this.rolusuario === 'laboratorio1' || this.rolusuario === 'laboratorio2'|| this.rolusuario === 'bodegaimpor'){
          this.loadimportaciones(); 
        }
       else if(this.rolusuario === 'repuestoslv'){
          this.loadimportacionesid('liv'); 
        } 
        if(this.rolusuario === 'repuestoslsc'){
          this.loadimportacionesid('sc'); 
        } 
        if(this.rolusuario === 'repuestoslk'){
          this.loadimportacionesid('lk'); 
        } 
         if(this.rolusuario === 'repuestos'){
          this.loadimportacionesid('pesa'); 
        } 
        
      }
    });

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    this.startDate = this.formatDateForInput(firstDayOfMonth);
    this.endDate = this.formatDateForInput(lastDayOfMonth);
  }

  selectedImageUrl: string = '';
  isModalOpen: boolean = false;

  openImageModal(imageUrl: string): void {
    this.selectedImageUrl = imageUrl;
    this.isModalOpen = true;
  }

  closeImageModal(): void {
    this.isModalOpen = false;
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  totalItems: number = 0;
  
  loadimportaciones() {
    this.loading = true; 
    this.tutorialService.laboratoriovehi().subscribe({
      next: (data: Vehiculo[]) => { 
        console.log(`Received ${data.length} items from loadimportaciones`);
        
        this.allData = data;
        this.applyAllFilters(); // Aplicar todos los filtros al cargar
        console.log('Todos los datos (loadimportaciones):', this.allData);
        this.loading = false; 
      },
      error: (e) => {
        console.error('Error loading importaciones:', e);
        this.loading = false; 
      }
    });
  }

  loadimportacionesid(userId: any) { 
    this.loading = true; 
    this.allData = [];
    this.filteredData = [];
    this.lista = [];   
    this.totalItems = 0;
    this.totalPages = 0;

    this.tutorialService.laboratoriovehiid(userId).subscribe({ 
      next: (data: Vehiculo[]) => {
        if (data) {
          this.allData = data;
        } else {
          this.allData = [];
        }
        
        this.applyAllFilters(); // Aplicar todos los filtros al cargar
        
        console.log('Total de elementos:', this.totalItems);
        console.log('Páginas totales:', this.totalPages);
        console.log('Datos de la página actual (lista):', this.lista);
        console.log('Todos los datos (allData para repuestoslv):', this.allData);
        this.loading = false; 
      },
      error: (e) => {
        console.error('Error al cargar datos del vehículo para repuestoslv:', e);
        this.loading = false; 
      }
    });
  }

  calculateStats(): void {
    this.stats = {
      totalImportaciones: Number(this.totalItems), 
      enTransito: this.filteredData.filter(item => (item as any).estado === 'Revisado').length, 
      pendientesLiquidacion: this.filteredData.filter(item => (item as any).liquidacion === 'Pendiente').length, 
      tiempoPromedio: 28 
    };
    console.log(this.stats);
  }

  getImageUrl(relativePath: string): string {
    const formattedPath = relativePath.replace(/\\/g, '/');
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

  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  applyDateFilter() {
    this.applyAllFilters();
  }

  resetDateFilter() {
    this.startDate = '';
    this.endDate = '';
    this.applyAllFilters();
  }

  // Nueva función para aplicar búsqueda en tiempo real
  searchImports(): void {
    this.applyAllFilters();
  }

  // Nueva función para mostrar/ocultar filtros
  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  // Nueva función para aplicar filtros por columna
  applyFilters(): void {
    this.applyAllFilters();
  }

  // Nueva función para limpiar todos los filtros
  clearAllFilters(): void {
    this.filters = {
      linea: '',
      modelo: '',
      motor: '',
      chasis: '',
      frontal: '',
      caja: '',
      drive: '',
      diferencial: ''
    };
    this.searchTerm = '';
    this.applyAllFilters();
  }

  // Función maestra que aplica todos los filtros
  applyAllFilters(): void {
    let dataToFilter = [...this.allData];

    // 1. Aplicar filtro de fechas
    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);
      
      dataToFilter = dataToFilter.filter(item => {
        const itemDate = new Date(item.fecha);
        return itemDate >= start && itemDate <= end;
      });
    }

    // 2. Aplicar búsqueda general
    if (this.searchTerm.trim()) {
      const searchTermLower = this.searchTerm.trim().toLowerCase();
      dataToFilter = dataToFilter.filter(item => 
        (item.chasis && item.chasis.toLowerCase().includes(searchTermLower)) || 
        (item.motor && item.motor.toLowerCase().includes(searchTermLower)) ||   
        (item.linea && item.linea.toLowerCase().includes(searchTermLower)) ||   
        (item.modelo && item.modelo.toLowerCase().includes(searchTermLower))
      );
    }

    // 3. Aplicar filtros por columna
    if (this.filters.linea) {
      dataToFilter = dataToFilter.filter(item => 
        item.linea && item.linea === this.filters.linea
      );
    }

    if (this.filters.modelo) {
      dataToFilter = dataToFilter.filter(item => 
        item.modelo && item.modelo === this.filters.modelo
      );
    }

    if (this.filters.motor) {
      const motorLower = this.filters.motor.toLowerCase();
      dataToFilter = dataToFilter.filter(item => 
        item.motor && item.motor.toLowerCase().includes(motorLower)
      );
    }

    if (this.filters.chasis) {
      const chasisLower = this.filters.chasis.toLowerCase();
      dataToFilter = dataToFilter.filter(item => 
        item.chasis && item.chasis.toLowerCase().includes(chasisLower)
      );
    }

    if (this.filters.frontal) {
      const frontalLower = this.filters.frontal.toLowerCase();
      dataToFilter = dataToFilter.filter(item => 
        item.frontal && item.frontal.toLowerCase().includes(frontalLower)
      );
    }

    if (this.filters.caja) {
      const cajaLower = this.filters.caja.toLowerCase();
      dataToFilter = dataToFilter.filter(item => 
        item.caja && item.caja.toLowerCase().includes(cajaLower)
      );
    }

    if (this.filters.drive) {
      dataToFilter = dataToFilter.filter(item => 
        item.drive && item.drive === this.filters.drive
      );
    }

    if (this.filters.diferencial) {
      const diferencialLower = this.filters.diferencial.toLowerCase();
      dataToFilter = dataToFilter.filter(item => 
        item.diferencial && item.diferencial.toLowerCase().includes(diferencialLower)
      );
    }

    // Actualizar datos filtrados
    this.filteredData = dataToFilter;
    this.totalItems = this.filteredData.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    this.currentPage = 1;
    this.updatePageData();
    this.calculateStats();
  }

  // Obtener valores únicos para dropdowns
  getUniqueValues(field: keyof Vehiculo): any[] {
    const values = this.allData
      .map(item => item[field])
      .filter(value => value && value.toString().trim() !== '');
    return Array.from(new Set(values)).sort();
  }

  filterData(): void {
    console.log('Filtrar datos');
  }

  revisado(){
    this.router.navigate(['/laboratoriorev']);
  }
   vehis(){
    this.router.navigate(['/laboratoriovehi']);
  }
  
  pendiente(){
    this.router.navigate(['/laboratorio']);
  }

  asignado(){
    this.router.navigate(['/asignarvehi']);
  }

  ver(id: any){ 
    this.router.navigate(['/laboratoriovehidetail', id]);
  }
 
  showExportMenu: boolean = false;

  toggleExportMenu(): void {
    this.showExportMenu = !this.showExportMenu;
  }

  getPaginationArray(): number[] {
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      const pages: number[] = [];
      pages.push(1);
      if (currentPage > 3) {
        pages.push(-1); 
      }
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push(-1); 
      }
      if (totalPages > 1) {
        pages.push(totalPages);
      }
      return pages;
    }
  }

  downloadExcel(): void {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredData);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Vehiculos'); 
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Vehiculos_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  downloadCSV(): void {
    let csvContent = 'Fecha,Linea,Modelo,Chasis,Motor,Frontal,Caja,Drive,Diferencial\n'; 
    
    this.filteredData.forEach(item => {
      const row = [
        item.fecha ? new Date(item.fecha).toLocaleDateString() : '-',
        item.linea || '-',
        item.modelo || '-',
        item.chasis || '-',
        item.motor || '-',
        item.frontal || '-',
        item.caja || '-',
        item.drive || '-',
        item.diferencial || '-'
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','); 
      csvContent += row + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `Vehiculos_${new Date().toISOString().split('T')[0]}.csv`); 
  }
}