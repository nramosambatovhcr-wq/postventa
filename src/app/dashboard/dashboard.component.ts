import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { saveAs } from 'file-saver';
import { Subscription } from 'rxjs';
import * as XLSX from 'xlsx';
import { Usuario } from '../models/usuario';
import { AuthService } from '../services/auth.service';
import { TutorialService } from '../services/tutorial.service';
import { ReloadService } from '../services/reload.service';

interface Invoice {
  id: number;
  ordenId: number;
  invoiceBl: string;
  bl: string;
  contenedor: string;
  liquidacion: string;
  estadoBl: string;
  fechaEmbarque: Date | null;
  fechaArrivo: Date | null;
}

interface OrdenCompra {
  ordenId: number;
  invoiceN: string;
  estadoOrden: string;
  invoices: Invoice[];
  expanded?: boolean;
}

// Agrega esta nueva interfaz después de las existentes
interface Proveedor {
  id: number;
  nombre: string;
  direccion: string;
  telefono: string;
  email: string;
  codigo: string;
}

// Modifica la interfaz Cotizacion para incluir el proveedor
interface Cotizacion {
  cotizacionId: number;
  codigoCot: string;
  proveedorId: number | null;
  proveedor: Proveedor | null; // NUEVA PROPIEDAD
  fechaSolicitud: Date | null;
  fechaRespuesta: Date | null;
  estadoCotizacion: string;
  referenciaSolicitud: string;
  referenciaProveedor: string;
  observacionesSolicitud: string;
  observacionesRespuesta: string;
  usuario: number | null;
  ordenesCompra: OrdenCompra[];
  expanded?: boolean;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  stats = {
    totalCotizaciones: 0,
    totalOrdenes: 0,
    blsEnTransito: 0,
    blsLiquidados: 0
  };

  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 0;
  totalItems: number = 0;
  
  allData: Cotizacion[] = [];
  filteredData: Cotizacion[] = [];
  displayedCotizaciones: Cotizacion[] = [];
  
  usuario: Usuario | null = null;
  loading = false;
  private subscription = new Subscription();

  // Filtros
  startDate: string = '';
  endDate: string = '';
  filtersApplied: boolean = false;
  filtroActivo: string = 'todos';
  
  // Vistas
  vistaActiva: 'jerarquica' | 'tabla' = 'jerarquica';
  
  // Menú exportar
  showExportMenu: boolean = false;

  constructor(
    private router: Router,
    private tutorialService: TutorialService,
    private reloadService: ReloadService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      if (this.usuario != null) {
        if(this.usuario.rol=='admin'){
          this.loadimportaciones();
        }
        else{
          this.loadimportaciones();
        }
        
      }
    });

    this.subscription.add(
      this.reloadService.reload$.subscribe(() => {
        this.loadimportaciones();
      })
    );

    // Inicializar fechas con el mes actual
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    this.startDate = this.formatDateForInput(firstDayOfMonth);
    this.endDate = this.formatDateForInput(lastDayOfMonth);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  loadimportaciones() {
    this.loading = true;
    this.tutorialService.importaciones().subscribe({
      next: (data: Cotizacion[]) => {
        console.log('Datos cargados:', data);
        
        // Inicializar el estado expandido
        this.allData = data.map(cot => ({
          ...cot,
          expanded: false,
          ordenesCompra: cot.ordenesCompra?.map(orden => ({
            ...orden,
            expanded: false
          })) || []
        }));
        
        this.filteredData = [...this.allData];
        this.updateDisplayedData();
        this.calculateStats();
        this.loading = false;
      },
      error: (e) => {
        console.error('Error al cargar datos:', e);
        this.loading = false;
        this.showNotification('Error al cargar los datos', 'error');
      }
    });
  }

   loadimportacionesus() {
    this.loading = true;
    this.tutorialService.importacionesPorUsuario(Number(this.usuario?.id)).subscribe({
      next: (data: Cotizacion[]) => {
        console.log('Datos cargados:', data);
        
        // Inicializar el estado expandido
        this.allData = data.map(cot => ({
          ...cot,
          expanded: false,
          ordenesCompra: cot.ordenesCompra?.map(orden => ({
            ...orden,
            expanded: false
          })) || []
        }));
        
        this.filteredData = [...this.allData];
        this.updateDisplayedData();
        this.calculateStats();
        this.loading = false;
      },
      error: (e) => {
        console.error('Error al cargar datos:', e);
        this.loading = false;
        this.showNotification('Error al cargar los datos', 'error');
      }
    });
  }


  updateDisplayedData() {
    this.totalItems = this.filteredData.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = 1;
    }
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = Math.min(startIndex + this.itemsPerPage, this.totalItems);
    
    this.displayedCotizaciones = this.filteredData.slice(startIndex, endIndex);
  }

  calculateStats(): void {
    this.stats.totalCotizaciones = this.allData.length;
    
    let totalOrdenes = 0;
    let blsEnTransito = 0;
    let blsLiquidados = 0;

    this.allData.forEach(cot => {
      totalOrdenes += cot.ordenesCompra?.length || 0;
      
      cot.ordenesCompra?.forEach(orden => {
        orden.invoices?.forEach(invoice => {
          const estado = invoice.estadoBl?.toUpperCase() || '';
          if (estado.includes('TRANSITO') || estado.includes('TRÁNSITO')) {
            blsEnTransito++;
          } else if (estado.includes('LIQUIDADO')) {
            blsLiquidados++;
          }
        });
      });
    });

    this.stats.totalOrdenes = totalOrdenes;
    this.stats.blsEnTransito = blsEnTransito;
    this.stats.blsLiquidados = blsLiquidados;
  }

  // ==================== TOGGLE FUNCIONES ====================
  toggleCotizacion(cotizacionId: number) {
    const cotizacion = this.displayedCotizaciones.find(c => c.cotizacionId === cotizacionId);
    if (cotizacion) {
      cotizacion.expanded = !cotizacion.expanded;
    }
  }

  toggleOrden(cotizacionId: number, ordenId: number) {
    const cotizacion = this.displayedCotizaciones.find(c => c.cotizacionId === cotizacionId);
    if (cotizacion) {
      const orden = cotizacion.ordenesCompra.find(o => o.ordenId === ordenId);
      if (orden) {
        orden.expanded = !orden.expanded;
      }
    }
  }

  // ==================== FILTROS ====================
  aplicarFiltro(filtro: string) {
    this.filtroActivo = filtro;
    
    if (filtro === 'todos') {
      this.filteredData = [...this.allData];
    } else {
      this.filteredData = this.allData.filter(cot => {
        let cumpleFiltro = false;
        
        cot.ordenesCompra?.forEach(orden => {
          orden.invoices?.forEach(invoice => {
            const estado = invoice.estadoBl?.toUpperCase() || '';
            
            if (filtro === 'transito' && (estado.includes('TRANSITO') || estado.includes('TRÁNSITO'))) {
              cumpleFiltro = true;
            } else if (filtro === 'pendiente' && estado.includes('PENDIENTE')) {
              cumpleFiltro = true;
            } else if (filtro === 'liquidado' && estado.includes('LIQUIDADO')) {
              cumpleFiltro = true;
            }
          });
        });
        
        return cumpleFiltro;
      });
    }
    
    this.currentPage = 1;
    this.updateDisplayedData();
  }

  applyDateFilter() {
    this.filtersApplied = true;
    
    if (!this.startDate || !this.endDate) {
      this.filteredData = [...this.allData];
    } else {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);

      this.filteredData = this.allData.filter(item => {
        const itemDate = item.fechaSolicitud ? new Date(item.fechaSolicitud) : null;
        if (!itemDate) return false;
        return itemDate >= start && itemDate <= end;
      });
    }
    
    if (this.searchTerm.trim() !== '') {
      this.applySearchFilter();
    } else {
      this.currentPage = 1;
      this.updateDisplayedData();
    }
  }

  applySearchFilter() {
    this.filtersApplied = true;
    
    const searchTermLower = this.searchTerm.toLowerCase().trim();
    
    if (searchTermLower === '') {
      if (this.startDate && this.endDate) {
        this.applyDateFilter();
      } else {
        this.filteredData = [...this.allData];
        this.updateDisplayedData();
      }
      return;
    }
    
    this.filteredData = this.allData.filter(cotizacion => {
      if (cotizacion.codigoCot && cotizacion.codigoCot.toLowerCase().includes(searchTermLower)) {
        return true;
      }
      
      if (cotizacion.ordenesCompra) {
        const foundInOrden = cotizacion.ordenesCompra.some(orden => 
          (orden.invoiceN && orden.invoiceN.toLowerCase().includes(searchTermLower))
        );
        if (foundInOrden) return true;
      }
      
      if (cotizacion.ordenesCompra) {
        const foundInBL = cotizacion.ordenesCompra.some(orden =>
          orden.invoices && orden.invoices.some(invoice =>
            (invoice.bl && invoice.bl.toLowerCase().includes(searchTermLower)) ||
            (invoice.invoiceBl && invoice.invoiceBl.toLowerCase().includes(searchTermLower)) ||
            (invoice.contenedor && invoice.contenedor.toLowerCase().includes(searchTermLower))
          )
        );
        if (foundInBL) return true;
      }
      
      return false;
    });
    
    this.currentPage = 1;
    this.updateDisplayedData();
  }

  searchImports(): void {
    this.applySearchFilter();
  }

  resetDateFilter() {
    this.startDate = '';
    this.endDate = '';
    this.searchTerm = '';
    this.filtersApplied = false;
    this.filtroActivo = 'todos';
    this.filteredData = [...this.allData];
    this.currentPage = 1;
    this.updateDisplayedData();
  }

  // ==================== HELPER FUNCIONES ====================
  getEstadoBadgeClass(estado: string): string {
    if (!estado) return 'badge-secondary';
    
    const estadoUpper = estado.toUpperCase();
    
    if (estadoUpper.includes('APROBAD') || estadoUpper.includes('ACTIV') || estadoUpper.includes('LIQUIDADO') || estadoUpper.includes('COMPLETADO')) {
      return 'badge-success';
    } else if (estadoUpper.includes('TRANSIT') || estadoUpper.includes('TRÁNSIT') || estadoUpper.includes('PROCESO') || estadoUpper.includes('PENDIENTE')) {
      return 'badge-warning';
    } else if (estadoUpper.includes('RECHAZAD') || estadoUpper.includes('CANCELAD')) {
      return 'badge-danger';
    } else {
      return 'badge-info';
    }
  }

  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getTotalRows(): number {
    let count = 0;
    this.displayedCotizaciones.forEach(cot => {
      cot.ordenesCompra?.forEach(orden => {
        count += orden.invoices?.length || 0;
      });
    });
    return count;
  }

  // ==================== NAVEGACIÓN ====================
  cambiarVista(vista: 'jerarquica' | 'tabla') {
    this.vistaActiva = vista;
  }

  changePage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updateDisplayedData();
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // ==================== ACCIONES ====================
  createNewImport(): void {
    this.router.navigate(['/nueva-importacion']);
  }

  verDetalles(id: number): void {
    this.router.navigate(['/detalle', id]);
  }

  toggleExportMenu(): void {
    this.showExportMenu = !this.showExportMenu;
  }

  // ==================== EXPORTACIÓN ====================
  downloadExcel(): void {
  const dataToExport: any[] = [];
  
  this.filteredData.forEach(cot => {
    cot.ordenesCompra?.forEach(orden => {
      if (orden.invoices && orden.invoices.length > 0) {
        orden.invoices.forEach(invoice => {
          dataToExport.push({
            'Código Cotización': cot.codigoCot,
            'Estado Cotización': cot.estadoCotizacion,
            'Fecha Solicitud': cot.fechaSolicitud ? new Date(cot.fechaSolicitud).toLocaleDateString('es-ES') : '-',
            'Proveedor': cot.proveedor?.nombre || 'Sin proveedor', // CAMBIADO
            'Código Proveedor': cot.proveedor?.codigo || '-', // NUEVO
            'Orden Compra': orden.invoiceN,
            'Estado Orden': orden.estadoOrden,
            'Invoice BL': invoice.invoiceBl || '-',
            'BL': invoice.bl || '-',
            'Contenedor': invoice.contenedor || '-',
            'Liquidación': invoice.liquidacion || '-',
            'Estado BL': invoice.estadoBl || '-',
            'Fecha Embarque': invoice.fechaEmbarque ? new Date(invoice.fechaEmbarque).toLocaleDateString('es-ES') : '-',
            'Fecha Arribo': invoice.fechaArrivo ? new Date(invoice.fechaArrivo).toLocaleDateString('es-ES') : '-'
          });
        });
      } else {
        dataToExport.push({
          'Código Cotización': cot.codigoCot,
          'Estado Cotización': cot.estadoCotizacion,
          'Fecha Solicitud': cot.fechaSolicitud ? new Date(cot.fechaSolicitud).toLocaleDateString('es-ES') : '-',
          'Proveedor': cot.proveedor?.nombre || 'Sin proveedor', // CAMBIADO
          'Código Proveedor': cot.proveedor?.codigo || '-', // NUEVO
          'Orden Compra': orden.invoiceN,
          'Estado Orden': orden.estadoOrden,
          'Invoice BL': '-',
          'BL': '-',
          'Contenedor': '-',
          'Liquidación': '-',
          'Estado BL': '-',
          'Fecha Embarque': '-',
          'Fecha Arribo': '-'
        });
      }
    });
  });

  const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
  const workbook: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Importaciones');
  
  const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  saveAs(blob, `Importaciones_${new Date().toISOString().split('T')[0]}.xlsx`);
  this.showExportMenu = false;
  this.showNotification('Excel exportado exitosamente', 'success');
}

downloadCSV(): void {
  let csvContent = 'Código Cotización,Estado Cotización,Fecha Solicitud,Proveedor,Código Proveedor,Orden Compra,Estado Orden,Invoice BL,BL,Contenedor,Liquidación,Estado BL,Fecha Embarque,Fecha Arribo\n';
  
  this.filteredData.forEach(cot => {
    cot.ordenesCompra?.forEach(orden => {
      if (orden.invoices && orden.invoices.length > 0) {
        orden.invoices.forEach(invoice => {
          const row = [
            cot.codigoCot,
            cot.estadoCotizacion,
            cot.fechaSolicitud ? new Date(cot.fechaSolicitud).toLocaleDateString() : '-',
            cot.proveedor?.nombre || 'Sin proveedor', // CAMBIADO
            cot.proveedor?.codigo || '-', // NUEVO
            orden.invoiceN,
            orden.estadoOrden,
            invoice.invoiceBl || '-',
            invoice.bl || '-',
            invoice.contenedor || '-',
            invoice.liquidacion || '-',
            invoice.estadoBl || '-',
            invoice.fechaEmbarque ? new Date(invoice.fechaEmbarque).toLocaleDateString() : '-',
            invoice.fechaArrivo ? new Date(invoice.fechaArrivo).toLocaleDateString() : '-'
          ].map(field => `"${field}"`).join(','); // Agregar comillas para campos con comas
          csvContent += row + '\n';
        });
      }
    });
  });
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `Importaciones_${new Date().toISOString().split('T')[0]}.csv`);
  this.showExportMenu = false;
  this.showNotification('CSV exportado exitosamente', 'success');
}

  // ==================== NOTIFICACIONES ====================
  showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const toast = document.createElement('div');
    toast.className = `notificacion ${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
      z-index: 9999;
      animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  }

  // showExportMenu: boolean = false;
  
  // Modal
  mostrarModal: boolean = false;
detalleSeleccionado: {
  cotizacion: Cotizacion,
  orden: OrdenCompra,
  invoice: Invoice
} | null = null;

  abrirModalDetalle(cotizacion: Cotizacion, orden: OrdenCompra, invoice: Invoice): void {
  this.detalleSeleccionado = {
    cotizacion,
    orden,
    invoice
  };
  this.mostrarModal = true;
  document.body.style.overflow = 'hidden'; // Prevenir scroll del body
}

cerrarModal(): void {
  this.mostrarModal = false;
  this.detalleSeleccionado = null;
  document.body.style.overflow = 'auto'; // Restaurar scroll del body
}
}