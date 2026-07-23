import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { saveAs } from 'file-saver';
import { Subscription } from 'rxjs';
import { Usuario } from '../../models/usuario';
import { AuthService } from '../../services/auth.service';
import { PedidobodegaService } from '../../services/pedidobodega.service';
import { ReloadService } from '../../services/reload.service';
import * as XLSX from 'xlsx';
import { CotizacionService } from 'src/app/services/cotizacion.service';
 


@Component({
  selector: 'app-aprobadas',
  templateUrl: './aprobadas.component.html',
  styleUrls: ['./aprobadas.component.css']
})
export class AprobadasComponent implements OnInit, OnDestroy {
  stats = {
    totalImportaciones: 7,
    enTransito: 24,
    pendientesLiquidacion: 18,
    tiempoPromedio: 28
  };

  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 20;
  totalPages: number = 0;
  lista: any[] = [];
  allData: any[] = [];
  filteredData: any[] = [];
  id: number = 0;
  usuario: Usuario | null = null;
  loading = false;
  private subscription = new Subscription();

  // Date filter variables
  startDate: string = '';
  endDate: string = '';
  pro: any;

  // New filter variables
  showFilterPanel: boolean = false;
  selectedProveedor: string = '';
  selectedEstado: string = '';
  uniqueProveedores: string[] = [];
  uniqueEstados: string[] = [];

  selectedImageUrl: string = '';
  isModalOpen: boolean = false;
  totalItems: number = 0;
  showExportMenu: boolean = false;

  constructor(
    private router: Router,
    private tutorialService: CotizacionService,
    private reloadService: ReloadService,
    private authService: AuthService,
  ) { }

  ngOnInit(): void {
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      console.log(this.usuario);
      if (this.usuario != null) {
        if (this.usuario.rol == 'proveedor') {
          this.pro = this.usuario.agencia;
          console.log(this.pro);
          this.loadimportacionespro();
        }
        else if (this.usuario.rol == 'admin') {
          this.loadimportaciones();
        }
        else {
          this.id = this.usuario.id;
          console.log(this.id);
          this.loadimportacionesus();
        }
      }
    });

    this.subscription.add(
      this.reloadService.reload$.subscribe(() => {
        this.loadimportaciones();
      })
    );

    // Initialize date filters with current month
   /* const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    this.startDate = this.formatDateForInput(firstDayOfMonth);
    this.endDate = this.formatDateForInput(lastDayOfMonth);*/
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  loadimportaciones() {
    this.loading = true;
    this.tutorialService.getCotizaciones().subscribe({
      next: (data: any) => {
        console.log(data.length);
        this.allData = data;
        this.extractUniqueValues();
        this.applyFilters();
        this.loading = false;
      },
      error: (e) => {
        console.error(e);
        this.loading = false;
      }
    });
  }

  loadimportacionesus() {
    this.loading = true;
    this.tutorialService.getCotizacionByUserAp(this.id).subscribe({
      next: (data: any) => {
        console.log(data.length);
        this.allData = data;
        this.extractUniqueValues();
        this.applyFilters();
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
    this.tutorialService.getCotizacionByUserPro(this.pro).subscribe({
      next: (data: any) => {
        console.log(data.length);
        this.allData = data;
        this.extractUniqueValues();
        this.applyFilters();
        this.loading = false;
      },
      error: (e) => {
        console.error(e);
        this.loading = false;
      }
    });
  }

  // Extract unique values for filters
  extractUniqueValues() {
    this.uniqueProveedores = [...new Set(this.allData.map(item => item.proveedor))].filter(Boolean).sort();
    this.uniqueEstados = [...new Set(this.allData.map(item => item.estadoCotizacion))].filter(Boolean).sort();
  }

  // Apply all filters
  applyFilters() {
    let result = [...this.allData];

    // Filter by search term
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const searchTermLower = this.searchTerm.toLowerCase().trim();
      result = result.filter(item =>
        (item.codigoCot && item.codigoCot.toLowerCase().includes(searchTermLower)) ||
        (item.proveedor && item.proveedor.toLowerCase().includes(searchTermLower)) ||
        (item.estadoCotizacion && item.estadoCotizacion.toLowerCase().includes(searchTermLower))
      );
    }

    // Filter by date range
    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);

      result = result.filter(item => {
        const itemDate = new Date(item.fechaSolicitud);
        return itemDate >= start && itemDate <= end;
      });
    }

    // Filter by proveedor
    if (this.selectedProveedor) {
      result = result.filter(item => item.proveedor === this.selectedProveedor);
    }

    // Filter by estado
    if (this.selectedEstado) {
      result = result.filter(item => item.estadoCotizacion === this.selectedEstado);
    }

    // Ordenar por ID de cotización de mayor a menor
    result.sort((a, b) => (b.cotizacionId ?? 0) - (a.cotizacionId ?? 0));
    this.filteredData = result;
    this.totalItems = this.filteredData.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    this.currentPage = 1;
    this.updatePageData();
  }

  // Search with improved functionality
  searchImports(): void {
    this.applyFilters();
  }

  // Clear search
  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  // Toggle filter panel
  toggleFilterPanel(): void {
    this.showFilterPanel = !this.showFilterPanel;
  }

  // Get count of active filters
  getActiveFiltersCount(): number {
    let count = 0;
    if (this.startDate || this.endDate) count++;
    if (this.selectedProveedor) count++;
    if (this.selectedEstado) count++;
    if (this.searchTerm) count++;
    return count;
  }

  // Check if any filter is active
  isFiltering(): boolean {
    return this.getActiveFiltersCount() > 0;
  }

  // Clear specific filters
  clearDateFilter(): void {
    this.startDate = '';
    this.endDate = '';
    this.applyFilters();
  }

  clearProveedorFilter(): void {
    this.selectedProveedor = '';
    this.applyFilters();
  }

  clearEstadoFilter(): void {
    this.selectedEstado = '';
    this.applyFilters();
  }

  // Clear all filters
  clearAllFilters(): void {
    this.searchTerm = '';
    this.startDate = '';
    this.endDate = '';
    this.selectedProveedor = '';
    this.selectedEstado = '';
    this.applyFilters();
  }

  // Reset date filter (deprecated, replaced by clearDateFilter)
  resetDateFilter() {
    this.clearDateFilter();
  }

  // Apply date filter (deprecated, replaced by applyFilters)
  applyDateFilter() {
    this.applyFilters();
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

  // Image modal methods
  openImageModal(imageUrl: string): void {
    this.selectedImageUrl = imageUrl;
    this.isModalOpen = true;
  }

  closeImageModal(): void {
    this.isModalOpen = false;
  }

  // Navigation methods
  filterData(): void {
    this.toggleFilterPanel();
  }

  revisado() {
    this.router.navigate(['/pedidobodrev']);
  }

  error() {
    this.router.navigate(['/detallexcelcot']);
  }

  revi() {
    this.router.navigate(['/asignadacot']);
  }

  crear() {
    this.router.navigate(['/crearcot']);
  }

  crearm() {
    this.router.navigate(['/crearcotmult']);
  }

  excelm() {
    this.router.navigate(['/detallexcelcotmult']);
  }

  coti() {
    this.router.navigate(['/dashboardcot']);
  }

  aprobada() {
    this.router.navigate(['/cotaprobada']);
  }

  rechazada() {
    this.router.navigate(['/cotrechazada']);
  }

  verDetalle(id: number): void {
    this.router.navigate(['/detallescot', id]);
  }

  // Export menu
  toggleExportMenu(): void {
    this.showExportMenu = !this.showExportMenu;
  }

  // Pagination
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

  // Export methods
  downloadExcel(): void {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredData);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'CotizacionAprobada');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `CotizacionApro_${new Date().toISOString().split('T')[0]}.xlsx`);
    this.showExportMenu = false;
  }

  downloadCSV(): void {
    let csvContent = 'Codigo,Proveedor,Fecha,Estado\n';

    this.filteredData.forEach(item => {
      const row = [
        item.codigoCot || '-',
        item.nombreProveedor || '-',
        item.fechaSolicitud ? new Date(item.fechaSolicitud).toLocaleDateString() : '-',
        item.estadoCotizacion || '-'
      ].map(field => `"${field}"`).join(',');
      csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `CotizacionApro_${new Date().toISOString().split('T')[0]}.csv`);
    this.showExportMenu = false;
  }
}