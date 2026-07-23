import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { TutorialService } from '../services/tutorial.service';
import { AuthService } from '../services/auth.service';
import { Usuario } from '../models/usuario';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { EquivalentesService } from '../services/equivalentes.service';


interface SearchResult {
  codigo: string;
  totalRecordsFound: number;
  foundInInvoiceBl: boolean;
  foundInCotizacion: boolean;
  foundInOrdenCompra: boolean;
  invoiceBlDetails?: InvoiceBlDetail[];
  cotizacionDetails?: CotizacionDetail[];
  ordenCompraDetails?: OrdenCompraDetail[];
  invoiceBlCount?: number;
  cotizacionCount?: number;
  ordenCompraCount?: number;
  searchSummary: {
    codigo: string;
    invoiceBlRecords: number;
    cotizacionRecords: number;
    ordenCompraRecords: number;
    totalRecords: number;
  };
}

interface InvoiceBlDetail {
  id: number;
  invoiceblid: number;
  codigo: string;
  descripcion: string;
  chino: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  invoicebl_nombre: string;
  bl_nombre: string;
  bl_info: {
    codigo_serial: string;
    invoice: string;
    dcotizacion: number;
    estado: string;
    liquidacion: string;
    conexion: string;
    idbl: number;
  };
}

interface CotizacionDetail {
  id: number;
  cotizacionid: number;
  codigo: string;
  descripcion: string;
  chinese: string;
  cantidad: number;
  unidad: string;
  precio: number;
  cotizacion_nombre: string;
}

interface OrdenCompraDetail {
  id: number;
  orden_id: number;
  codigo: string;
  descripcion: string;
  chino: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  impuesto: number;
  total: number;
  orden_nombre: string;
}
@Component({
  selector: 'app-search-dashboard',
  templateUrl: './search-dashboard.component.html',
  styleUrls: ['./search-dashboard.component.css']
})
export class SearchDashboardComponent implements OnInit {
  @Input() codigo: string = '';
  searchTerm: string = '';
  searchResults: SearchResult | null = null;
  loading: boolean = false;
  error: string = '';
  usuario: Usuario | null = null;
  
  // Variables para las pestañas
  activeTab: 'invoicebl' | 'cotizacion' | 'ordencompra' | 'summary' = 'summary';
  
  // Variables para paginación
  currentPage: number = 1;
  itemsPerPage: number = 10;
  usrol:String='';
  
  // Histórico de búsquedas
  searchHistory: { codigo: string; fecha: Date; totalRecords: number }[] = [];

  constructor(
    private tutorialService: TutorialService,
    private authService: AuthService,
     private equivalentesService: EquivalentesService
  ) { }

  ngOnInit(): void {
    this.authService.usuarioActual$.subscribe((usuario:any) => {
      this.usuario = usuario;
      this.usrol = usuario.rol;
      console.log(this.usrol);
      
    });
    
    this.loadSearchHistory();
  }

  ngOnChanges(changes: SimpleChanges): void {
  if (changes['codigo'] && this.codigo) {
    this.searchTerm = this.codigo;
    this.searchByCode(); // tu lógica actual
  }
}

  // Método principal de búsqueda
 // Agregar esta propiedad en tu componente
noResultsMessage: string | null = null;

searchByCode(): void {
  if (!this.searchTerm.trim()) {
    this.error = 'Por favor ingrese un código para buscar';
    return;
  }

  this.loading = true;
  this.error = '';
  this.noResultsMessage = null; // Limpiar mensaje previo
  this.searchResults = null;

  this.tutorialService.searchDetailByCodigo(this.searchTerm.trim()).subscribe({
    next: (data: SearchResult) => {
      this.searchResults = data;
      this.loading = false;
      this.error = ''; // Limpiar errores previos
      
      // Verificar si no hay resultados
      if (data.totalRecordsFound === 0) {
        this.noResultsMessage = `No se encontró el código '${this.searchTerm.trim()}' en ninguna de las tablas de detalle.`;
        this.activeTab = 'summary';
        this.addToSearchHistory(this.searchTerm.trim(), 0);
        return;
      }
      
      // Si hay resultados, limpiar el mensaje de sin resultados
      this.noResultsMessage = null;
      this.activeTab = 'summary';
      this.addToSearchHistory(this.searchTerm.trim(), data.totalRecordsFound);
      
      // Auto-seleccionar la pestaña con más resultados
      if (data.invoiceBlCount && data.invoiceBlCount > 0) {
        this.activeTab = 'invoicebl';
      }/* else if (data.cotizacionCount && data.cotizacionCount > 0) {
        this.activeTab = 'cotizacion';
      }*/ else if (data.ordenCompraCount && data.ordenCompraCount > 0) {
        this.activeTab = 'ordencompra';
      }
    },
    error: (error) => {
      this.loading = false;
      this.noResultsMessage = null; // Limpiar mensaje de sin resultados
      
      // Verificar si el error contiene el mensaje de "no se encontró"
      const errorMessage = error.error || 'Error desconocido';
      
      if (errorMessage.includes('No se encontró el código') || 
          errorMessage.includes('no se encontró') ||
          errorMessage.includes('ninguna de las tablas')) {
        this.noResultsMessage = errorMessage;
        this.error = ''; // No mostrar como error
        this.addToSearchHistory(this.searchTerm.trim(), 0);
      } else {
        this.error = 'Error al buscar: ' + errorMessage;
      }
      
      console.error('Error en búsqueda:', error);
    }
  });
}

verConsultaRapida(codigo: string): void {
  this.searchTerm = codigo;          // llena el input
  this.currentPage = 1;              // reinicia paginación
  this.searchByCode();               // ejecuta la búsqueda en la misma vista
}

  // Cambiar pestaña activa
  setActiveTab(tab: 'invoicebl' | 'cotizacion' | 'ordencompra' | 'summary'): void {
    this.activeTab = tab;
    this.currentPage = 1;
  }

  // Obtener datos paginados según la pestaña activa
  getPaginatedData(): any[] {
    if (!this.searchResults) return [];
    
    let data: any[] = [];
    
    switch (this.activeTab) {
      case 'invoicebl':
        data = this.searchResults.invoiceBlDetails || [];
        break;
      case 'cotizacion':
        data = this.searchResults.cotizacionDetails || [];
        break;
      case 'ordencompra':
        data = this.searchResults.ordenCompraDetails || [];
        break;
      default:
        return [];
    }
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return data.slice(startIndex, endIndex);
  }

  // Obtener total de páginas
  getTotalPages(): number {
    if (!this.searchResults) return 0;
    
    let totalItems = 0;
    switch (this.activeTab) {
      case 'invoicebl':
        totalItems = this.searchResults.invoiceBlCount || 0;
        break;
      case 'cotizacion':
        totalItems = this.searchResults.cotizacionCount || 0;
        break;
      case 'ordencompra':
        totalItems = this.searchResults.ordenCompraCount || 0;
        break;
    }
    
    return Math.ceil(totalItems / this.itemsPerPage);
  }

  // Cambiar página
changePage(page: number): void {
  const totalPages = this.getTotalPages();
  
  // Validar que la página esté dentro del rango válido
  if (page >= 1 && page <= totalPages && page !== this.currentPage) {
    this.currentPage = page;
  }
}

// Método adicional para mejorar la navegación
onPageClick(event: Event, page: number): void {
  event.preventDefault();
  event.stopPropagation();
  this.changePage(page);
}

// Método para obtener array de páginas (opcional - para mejorar performance)
getPageNumbers(): number[] {
  const totalPages = this.getTotalPages();
  const pages: number[] = [];
  
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }
  
  return pages;
}

getTotalCantidadInvoiceBl(): number {
  if (!this.searchResults?.invoiceBlDetails) return 0;
  return this.searchResults.invoiceBlDetails.reduce((total, item) => total + (item.cantidad || 0), 0);
}

// Calcular total de cantidad para Cotización
getTotalCantidadCotizacion(): number {
  if (!this.searchResults?.cotizacionDetails) return 0;
  return this.searchResults.cotizacionDetails.reduce((total, item) => total + (item.cantidad || 0), 0);
}

// Calcular total de cantidad para Orden Compra
getTotalCantidadOrdenCompra(): number {
  if (!this.searchResults?.ordenCompraDetails) return 0;
  return this.searchResults.ordenCompraDetails.reduce((total, item) => total + (item.cantidad || 0), 0);
}

// Formatear número con separadores de miles
formatNumber(number: number): string {
  return new Intl.NumberFormat('es-EC').format(number);
}

  // Agregar al historial de búsquedas
  addToSearchHistory(codigo: string, totalRecords: number): void {
    const existingIndex = this.searchHistory.findIndex(item => item.codigo === codigo);
    
    if (existingIndex !== -1) {
      this.searchHistory[existingIndex] = { codigo, fecha: new Date(), totalRecords };
    } else {
      this.searchHistory.unshift({ codigo, fecha: new Date(), totalRecords });
    }
    
    // Mantener solo los últimos 10 búsquedas
    if (this.searchHistory.length > 10) {
      this.searchHistory = this.searchHistory.slice(0, 10);
    }
    
    this.saveSearchHistory();
  }

  // Guardar historial en localStorage
  saveSearchHistory(): void {
    localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
  }

  // Cargar historial desde localStorage
  loadSearchHistory(): void {
    const saved = localStorage.getItem('searchHistory');
    if (saved) {
      this.searchHistory = JSON.parse(saved);
    }
  }

  // Buscar desde el historial
  searchFromHistory(codigo: string): void {
    this.searchTerm = codigo;
    this.searchByCode();
  }

  // Limpiar historial
  clearSearchHistory(): void {
    this.searchHistory = [];
    localStorage.removeItem('searchHistory');
  }

  // Exportar resultados a Excel
  exportToExcel(): void {
    if (!this.searchResults) return;

    const workbook = XLSX.utils.book_new();
    
    // Hoja de resumen
    const summaryData = [{
      'Código Buscado': this.searchResults.codigo,
      'Total Registros': this.searchResults.totalRecordsFound,
      'Registros en Invoice BL': this.searchResults.invoiceBlCount || 0,
      'Registros en Cotización': this.searchResults.cotizacionCount || 0,
      'Registros en Orden Compra': this.searchResults.ordenCompraCount || 0,
      'Fecha Búsqueda': new Date().toLocaleString()
    }];
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

    // Hoja de Invoice BL
    if (this.searchResults.invoiceBlDetails && this.searchResults.invoiceBlDetails.length > 0) {
      const invoiceBlData = this.searchResults.invoiceBlDetails.map(item => ({
        'ID': item.id,
        'Código': item.codigo,
        'Descripción': item.descripcion,
        'Chino': item.chino,
        'Cantidad': item.cantidad,
        'Precio Unitario': item.precio_unitario,
        'Total': item.total,
        'Invoice BL': item.invoicebl_nombre,
        'BL': item.bl_nombre,
        'BL Código Serial': item.bl_info?.codigo_serial || '',
        'BL Invoice': item.bl_info?.invoice || '',
        'BL Estado': item.bl_info?.estado || '',
        'BL Liquidación': item.bl_info?.liquidacion || '',
        'BL Conexión': item.bl_info?.conexion || ''
      }));
      
      const invoiceBlSheet = XLSX.utils.json_to_sheet(invoiceBlData);
      XLSX.utils.book_append_sheet(workbook, invoiceBlSheet, 'Invoice BL');
    }

    // Hoja de Cotización
    if (this.searchResults.cotizacionDetails && this.searchResults.cotizacionDetails.length > 0) {
      const cotizacionData = this.searchResults.cotizacionDetails.map(item => ({
        'ID': item.id,
        'Código': item.codigo,
        'Descripción': item.descripcion,
        'Chino': item.chinese,
        'Cantidad': item.cantidad,
        'Unidad': item.unidad,
        'Precio': item.precio,
        'Cotización': item.cotizacion_nombre
      }));
      
      const cotizacionSheet = XLSX.utils.json_to_sheet(cotizacionData);
      XLSX.utils.book_append_sheet(workbook, cotizacionSheet, 'Cotización');
    }

    // Hoja de Orden Compra
    if (this.searchResults.ordenCompraDetails && this.searchResults.ordenCompraDetails.length > 0) {
      const ordenCompraData = this.searchResults.ordenCompraDetails.map(item => ({
        'ID': item.id,
        'Código': item.codigo,
        'Descripción': item.descripcion,
        'Chino': item.chino,
        'Cantidad': item.cantidad,
        'Precio Unitario': item.precio_unitario,
        'Subtotal': item.subtotal,
        'Impuesto': item.impuesto,
        'Total': item.total,
        'Orden': item.orden_nombre
      }));
      
      const ordenCompraSheet = XLSX.utils.json_to_sheet(ordenCompraData);
      XLSX.utils.book_append_sheet(workbook, ordenCompraSheet, 'Orden Compra');
    }

    // Generar y descargar archivo
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Busqueda_${this.searchResults.codigo}_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  // Limpiar resultados
  clearResults(): void {
    this.searchResults = null;
    this.searchTerm = '';
    this.error = '';
    this.activeTab = 'summary';
    this.currentPage = 1;
  }

  // Búsqueda rápida al presionar Enter
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.searchByCode();
    }
  }

  // Formatear moneda
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  // Formatear fecha
  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-EC').format(new Date(date));
  }
}