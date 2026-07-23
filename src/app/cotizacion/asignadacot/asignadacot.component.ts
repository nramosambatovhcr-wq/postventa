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
  selector: 'app-asignadacot',
  templateUrl: './asignadacot.component.html',
  styleUrls: ['./asignadacot.component.css']
})
export class AsignadacotComponent implements OnInit, OnDestroy {
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

  // New filter variables
  showFilterPanel: boolean = false;
  selectedProveedor: string = '';
  selectedEstado: string = '';
  selectedCotiGeneral: string = '';
  uniqueProveedores: string[] = [];
  uniqueEstados: string[] = [];
  uniqueCotiGenerales: string[] = [];

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
        if (this.usuario.rol == 'admin') {
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
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  verDetalle(id: number): void {
    this.router.navigate(['/detallescot', id]);
  }

  // ─── Regresar cotización a estado Solicitada ──────────────────────────────
  regresarASolicitada(item: any): void {
    if (item._procesando) return;
    const confirmado = confirm(
      `¿Regresar "${item.codigoCot}" a estado "Solicitada"?\n\nEl proveedor ya no la verá como asignada.`
    );
    if (!confirmado) return;

    item._procesando = true;
    this.tutorialService.cambiarEstadoCotizacion(item.cotizacionId, 'Solicitada').subscribe({
      next: (res) => {
        item.estadoCotizacion = res.estadoNuevo;
        item._procesando = false;
        alert(`✅ ${res.mensaje}`);
        this.router.navigate(['/dashboardcot']);
      },
      error: (err) => {
        item._procesando = false;
        alert(`❌ No se pudo cambiar el estado: ${err.message}`);
      }
    });
  }

  // ─── Rechazar cotización (cambia estado a Rechazada) ─────────────────────
  rechazarCotizacion(item: any): void {
    if (item._procesando) return;
    const confirmado = confirm(
      `¿Rechazar la cotización "${item.codigoCot}"?\n\nCambiará su estado a "Rechazada".`
    );
    if (!confirmado) return;

    item._procesando = true;
    this.tutorialService.cambiarEstadoCotizacion(item.cotizacionId, 'Rechazada').subscribe({
      next: (res) => {
        item.estadoCotizacion = res.estadoNuevo;
        item._procesando = false;
        alert(`✅ ${res.mensaje}`);
      },
      error: (err) => {
        item._procesando = false;
        alert(`❌ No se pudo ANULAR: ${err.message}`);
      }
    });
  }

  // ─── Eliminar cotización y todos sus detalles ─────────────────────────────
  eliminarCotizacion(item: any): void {
    if (item._procesando) return;
    const confirmado = confirm(
      `⚠️ ¿Eliminar permanentemente "${item.codigoCot}"?\n\nSe eliminarán también todos sus detalles. Esta acción NO se puede deshacer.`
    );
    if (!confirmado) return;

    item._procesando = true;
    this.tutorialService.eliminarCotizacion(item.cotizacionId).subscribe({
      next: (res) => {
        this.allData = this.allData.filter(c => c.cotizacionId !== item.cotizacionId);
        this.applyFilters();
        alert(`✅ ${res.mensaje}\n${res.detallesEliminados} detalle(s) eliminados.`);
      },
      error: (err) => {
        item._procesando = false;
        alert(`❌ No se pudo eliminar: ${err.message}`);
      }
    });
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
    this.tutorialService.getCotizacionByUserAsig(this.id).subscribe({
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
    this.uniqueProveedores = [...new Set(this.allData.map(item => item.nombreProveedor))].filter(Boolean).sort();
    this.uniqueEstados = [...new Set(this.allData.map(item => item.estadoCotizacion))].filter(Boolean).sort();
    this.uniqueCotiGenerales = [...new Set(this.allData.map(item => item.cotigeneral))].filter(Boolean).sort();
  }

  // Apply all filters
  applyFilters() {
    let result = [...this.allData];

    // Filter by search term
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const searchTermLower = this.searchTerm.toLowerCase().trim();
      result = result.filter(item =>
        (item.codigoCot && item.codigoCot.toLowerCase().includes(searchTermLower)) ||
        (item.nombreProveedor && item.nombreProveedor.toLowerCase().includes(searchTermLower)) ||
        (item.estadoCotizacion && item.estadoCotizacion.toLowerCase().includes(searchTermLower)) ||
        (item.cotigeneral && item.cotigeneral.toLowerCase().includes(searchTermLower))
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
      result = result.filter(item => item.nombreProveedor === this.selectedProveedor);
    }

    // Filter by estado
    if (this.selectedEstado) {
      result = result.filter(item => item.estadoCotizacion === this.selectedEstado);
    }

    // Filter by cotización general
    if (this.selectedCotiGeneral) {
      result = result.filter(item => item.cotigeneral === this.selectedCotiGeneral);
    }

    this.filteredData = result;
    this.totalItems = this.filteredData.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    this.currentPage = 1;
    this.updatePageData();
  }

  // Search with improved functionality
  searchImports(): void {
    this.applyFilters();
    console.log('Buscando:', this.searchTerm);
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
    if (this.selectedCotiGeneral) count++;
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

  clearCotiGeneralFilter(): void {
    this.selectedCotiGeneral = '';
    this.applyFilters();
  }

  // Clear all filters
  clearAllFilters(): void {
    this.searchTerm = '';
    this.startDate = '';
    this.endDate = '';
    this.selectedProveedor = '';
    this.selectedEstado = '';
    this.selectedCotiGeneral = '';
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

  verDetallesmm(cotigeneralId: string): void {
    this.router.navigate(['/consolidar', cotigeneralId]);
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

  verDetalles(codigoId: any) {
    this.router.navigate(['/detallescot', codigoId]);
  }

  responder(codigoId: any) {
    this.router.navigate(['/respuestacot', codigoId]);
  }

  addDetalles(codigoId: any) {
    this.router.navigate(['/detallexcelcot', codigoId]);
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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cotizacion');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Cotizacion_${new Date().toISOString().split('T')[0]}.xlsx`);
    this.showExportMenu = false;
  }

  downloadCSV(): void {
    let csvContent = 'CotiGeneral,Codigo,Proveedor,Fecha,Estado\n';

    this.filteredData.forEach(item => {
      const row = [
        item.cotigeneral || '-',
        item.codigoCot || item.cotizacionId || '-',
        item.nombreProveedor || 'N/A',
        item.fechaSolicitud ? new Date(item.fechaSolicitud).toLocaleDateString() : '-',
        item.estadoCotizacion || 'Pendiente'
      ].map(field => `"${field}"`).join(',');
      csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `Cotizacion_${new Date().toISOString().split('T')[0]}.csv`);
    this.showExportMenu = false;
  }
}