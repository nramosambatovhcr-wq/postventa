import { Component, OnInit } from '@angular/core';
import { saveAs } from 'file-saver';
import { Usuario } from 'src/app/models/usuario';
import { AuthService } from 'src/app/services/auth.service';
import { BlService } from 'src/app/services/bl.service';
import * as XLSX from 'xlsx';

// Nueva interfaz para los datos que devuelve tu API
export interface DetalleCompleto {
  id: number;
  invoiceblid: number;
  producto_id: number;
  codigo: string;
  descripcion: string;
  chino: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  invoicebl_nombre: string;
  invoicebl_estado: string;
  bl_nombre: string;
  bl_estado: string;
  liquidacionbl_id?: number | null;
  liquidacionbl_cantidad?: number | null;
  liquidacionbl_estado?: string | null;
  liquidacionbl_ubicacion?: string | null;
  liquidacionbl_observacion?: string | null;
  liquidacionbl_fecha?: Date | null;
}

@Component({
  selector: 'app-buscarcod',
  templateUrl: './buscarcod.component.html',
  styleUrls: ['./buscarcod.component.css']
})
export class BuscarcodComponent implements OnInit {
  searchTerm: string = '';
  // searchResults ahora es un array del nuevo tipo de datos
  searchResults: DetalleCompleto[] | null = null;
  loading: boolean = false;
  error: string = '';
  usuario: Usuario | null = null;
  
  // Variables para las pestañas
  activeTab: 'summary' | 'details' = 'summary';
  
  // Variables para paginación
  currentPage: number = 1;
  itemsPerPage: number = 10;
  
  // Histórico de búsquedas
  searchHistory: { codigo: string; fecha: Date; totalRecords: number }[] = [];

  constructor(
    private blService: BlService, // He renombrado el servicio para que coincida con el nombre que usamos antes
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
    });
    
    this.loadSearchHistory();
  }

  // Método principal de búsqueda
  noResultsMessage: string | null = null;

  searchByCode(): void {
    if (!this.searchTerm.trim()) {
      this.error = 'Por favor ingrese un código para buscar';
      return;
    }

    this.loading = true;
    this.error = '';
    this.noResultsMessage = null;
    this.searchResults = null;

    this.blService.getcodigoliquidacion(this.searchTerm.trim()).subscribe({
      next: (data: DetalleCompleto[]) => {
        this.searchResults = data;
        this.loading = false;
        this.error = '';
        
        if (!data || data.length === 0) {
          this.noResultsMessage = `No se encontró el código '${this.searchTerm.trim()}' en ninguna de las tablas de detalle.`;
          this.activeTab = 'summary';
          this.addToSearchHistory(this.searchTerm.trim(), 0);
          return;
        }
        
        this.noResultsMessage = null;
        this.activeTab = 'details'; // Cambia a la pestaña de detalles automáticamente
        this.addToSearchHistory(this.searchTerm.trim(), data.length);
        this.currentPage = 1; // Resetea la paginación
      },
      error: (error) => {
        this.loading = false;
        this.noResultsMessage = null;
        
        const errorMessage = error.error || 'Error desconocido';
        
        if (errorMessage.includes('No se encontró el código') || 
            errorMessage.includes('no se encontró') ||
            errorMessage.includes('ninguna de las tablas')) {
          this.noResultsMessage = errorMessage;
          this.error = '';
          this.addToSearchHistory(this.searchTerm.trim(), 0);
        } else {
          this.error = 'Error al buscar: ' + errorMessage;
        }
        
        console.error('Error en búsqueda:', error);
      }
    });
  }

  setActiveTab(tab: 'summary' | 'details'): void {
    this.activeTab = tab;
    this.currentPage = 1;
  }

  getPaginatedData(): DetalleCompleto[] {
    if (!this.searchResults) return [];
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.searchResults.slice(startIndex, endIndex);
  }

  getTotalPages(): number {
    if (!this.searchResults) return 0;
    return Math.ceil(this.searchResults.length / this.itemsPerPage);
  }

  changePage(page: number): void {
    const totalPages = this.getTotalPages();
    
    if (page >= 1 && page <= totalPages && page !== this.currentPage) {
      this.currentPage = page;
    }
  }

  onPageClick(event: Event, page: number): void {
    event.preventDefault();
    event.stopPropagation();
    this.changePage(page);
  }

  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    const pages: number[] = [];
    
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  getTotalCantidad(): number {
    if (!this.searchResults) return 0;
    return this.searchResults.reduce((total, item) => total + (item.cantidad || 0), 0);
  }

  formatNumber(number: number): string {
    return new Intl.NumberFormat('es-EC').format(number);
  }

  addToSearchHistory(codigo: string, totalRecords: number): void {
    const existingIndex = this.searchHistory.findIndex(item => item.codigo === codigo);
    
    if (existingIndex !== -1) {
      this.searchHistory[existingIndex] = { codigo, fecha: new Date(), totalRecords };
    } else {
      this.searchHistory.unshift({ codigo, fecha: new Date(), totalRecords });
    }
    
    if (this.searchHistory.length > 10) {
      this.searchHistory = this.searchHistory.slice(0, 10);
    }
    
    this.saveSearchHistory();
  }

  saveSearchHistory(): void {
    localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
  }

  loadSearchHistory(): void {
    const saved = localStorage.getItem('searchHistory');
    if (saved) {
      this.searchHistory = JSON.parse(saved);
    }
  }

  searchFromHistory(codigo: string): void {
    this.searchTerm = codigo;
    this.searchByCode();
  }

  clearSearchHistory(): void {
    this.searchHistory = [];
    localStorage.removeItem('searchHistory');
  }

  exportToExcel(): void {
    if (!this.searchResults || this.searchResults.length === 0) return;

    const workbook = XLSX.utils.book_new();
    
    const exportData = this.searchResults.map(item => ({
        'ID': item.id,
        'Código': item.codigo,
        'Descripción': item.descripcion,
        'Descripción China': item.chino,
        'Cantidad': item.cantidad,
        'Precio Unitario': item.precio_unitario,
        'Total': item.total,
        'Invoice BL': item.invoicebl_nombre,
        'Estado Invoice BL': item.invoicebl_estado,
        'BL Nombre': item.bl_nombre,
        'BL Estado': item.bl_estado,
        'ID Liquidación': item.liquidacionbl_id,
        'Cantidad Liquidación': item.liquidacionbl_cantidad,
        'Estado Liquidación': item.liquidacionbl_estado,
        'Fecha Liquidación': item.liquidacionbl_fecha,
        'Observación Liquidación': item.liquidacionbl_observacion
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Detalles de Búsqueda');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Busqueda_${this.searchTerm}_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  clearResults(): void {
    this.searchResults = null;
    this.searchTerm = '';
    this.error = '';
    this.activeTab = 'summary';
    this.currentPage = 1;
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.searchByCode();
    }
  }

  formatDate(date: any): string {
    return date ? new Intl.DateTimeFormat('es-EC').format(new Date(date)) : 'N/A';
  }
}