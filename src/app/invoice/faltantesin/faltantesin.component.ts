import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import saveAs from 'file-saver';
import { Subscription } from 'rxjs';
import { Usuario } from '../../models/usuario';
import { AuthService } from '../../services/auth.service';
import { PedidobodegaService } from '../../services/pedidobodega.service';
import { ReloadService } from '../../services/reload.service';
import * as XLSX from 'xlsx';
import { CotizacionService, OrdenDetalle, OrdenDetalleResponse } from 'src/app/services/cotizacion.service';

// ─── Interfaces alineadas con el nuevo endpoint ───────────────────────────────

interface EstadisticasCantidades {
  totalSolicitado: number;
  totalFacturado: number;
  porcentajeCumplimiento: number;
  itemsPendientes: number;
  itemsCompletos: number;
  itemsSobrefacturados: number;
}

interface EstadisticasEconomicas {
  totalMontoSolicitado: number;
  totalMontoFacturado: number;
  diferenciaPendiente: number;
  porcentajeCumplimientoEconomico: number;
}

interface ResumenOrden {
  ordenId: number;
  ordenInvoicen?: string;
  totalItems: number;
  itemsConInvoice: number;   // antes: itemsAmbos
  itemsSinInvoice: number;   // antes: itemsOrdenCompra
  estadisticasCantidades: EstadisticasCantidades;
  estadisticasEconomicas: EstadisticasEconomicas;
  invoicesAsociadas: string[];
  codigosRepetidos: {
    codigo: string;
    veces: number;
    totalSolicitado: number;
    totalFacturado: number;
    totalMontoSolicitado: number;
    totalMontoFacturado: number;
  }[];
}

@Component({
  selector: 'app-faltantesin',
  templateUrl: './faltantesin.component.html',
  styleUrls: ['./faltantesin.component.css']
})
export class FaltantesinComponent implements OnInit, OnDestroy {

  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 20;
  totalPages: number = 0;
  lista: OrdenDetalle[] = [];
  allData: OrdenDetalle[] = [];
  filteredData: OrdenDetalle[] = [];
  id: number = 0;
  usuario: Usuario | null = null;
  loading = false;
  private subscription = new Subscription();

  startDate: string = '';
  endDate: string = '';
  codigoCot: number = 0;

  resumenOrden: ResumenOrden | null = null;

  filtroOrigen: string = '';
  filtroEstado: string = '';

  showExportMenu: boolean = false;
  totalItems: number = 0;

  selectedImageUrl: string = '';
  isModalOpen: boolean = false;

  constructor(
    private router: Router,
    private tutorialService: CotizacionService,
    private reloadService: ReloadService,
    private authService: AuthService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    const idString: string | null = this.route.snapshot.paramMap.get('id');
    if (idString) {
      this.codigoCot = Number(idString);
    } else {
      console.warn('El parámetro de código de orden no fue encontrado en la ruta.');
    }

    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      if (this.usuario != null) {
        this.id = this.usuario.id;
        this.loadOrdenDetalles();
      }
    });

    this.subscription.add(
      this.reloadService.reload$.subscribe(() => this.loadOrdenDetalles())
    );

    const now = new Date();
    this.startDate = this.formatDateForInput(new Date(now.getFullYear(), now.getMonth(), 1));
    this.endDate   = this.formatDateForInput(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  // ─── Carga principal ────────────────────────────────────────────────────────

  loadOrdenDetalles(): void {
    this.loading = true;
    this.tutorialService.getOrdenDetalleCo().subscribe({
      next: (response: OrdenDetalleResponse) => {
        if (response.success) {
          this.allData      = response.detalles;
          this.resumenOrden = response.resumen as ResumenOrden;
          this.filteredData = this.allData;
          this.totalItems   = this.filteredData.length;
          this.totalPages   = Math.ceil(this.totalItems / this.itemsPerPage);
          this.updatePageData();
        } else {
          console.error('Error en la respuesta:', response);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar detalles de orden:', error);
        this.loading = false;
        if (error.message?.includes('404')) {
          alert(`No se encontraron detalles para la orden ${this.codigoCot}`);
        } else {
          alert('Error al cargar los detalles. Por favor, inténtelo nuevamente.');
        }
      }
    });
  }

  // ─── Paginación ─────────────────────────────────────────────────────────────

  updatePageData(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.lista  = this.filteredData.slice(start, start + this.itemsPerPage);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePageData();
  }

  getPaginationArray(): number[] {
    const totalPages  = this.totalPages;
    const currentPage = this.currentPage;
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);

    const pages: number[] = [1];
    if (currentPage > 3) pages.push(-1);
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push(-1);
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  }

  // ─── Filtros ────────────────────────────────────────────────────────────────

  aplicarFiltros(): void {
    let data = this.allData;

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      data = data.filter(item =>
        item.codigo?.toLowerCase().includes(term) ||
        item.descripcion?.toLowerCase().includes(term) ||
        item.ordenInvoicen?.toLowerCase().includes(term) ||
        item.origenDatos?.toLowerCase().includes(term) ||
        item.invoicesAsociadas?.toLowerCase().includes(term)
      );
    }

    if (this.filtroOrigen) {
      data = data.filter(item => item.origenDatos === this.filtroOrigen);
    }

    if (this.filtroEstado) {
      data = data.filter(item => {
        const sol = item.cantidadSolicitada || 0;
        const fac = item.cantidadFacturada  || 0;
        switch (this.filtroEstado) {
          case 'COMPLETO':      return sol > 0 && fac >= sol;
          case 'PENDIENTE':     return sol > fac;
          case 'SIN_SOLICITUD': return sol === 0;
          default:              return true;
        }
      });
    }

    this.filteredData = data;
    this.totalItems   = data.length;
    this.totalPages   = Math.ceil(this.totalItems / this.itemsPerPage);
    this.currentPage  = 1;
    this.updatePageData();
  }

  searchImports():       void { this.aplicarFiltros(); }
  aplicarFiltroOrigen(): void { this.aplicarFiltros(); }
  aplicarFiltroEstado(): void { this.aplicarFiltros(); }
  filterData():          void { this.aplicarFiltros(); }

  applyDateFilter(): void {
    this.filteredData = this.allData;
    this.totalItems   = this.filteredData.length;
    this.totalPages   = Math.ceil(this.totalItems / this.itemsPerPage);
    this.currentPage  = 1;
    this.updatePageData();
  }

  resetDateFilter(): void {
    this.startDate    = '';
    this.endDate      = '';
    this.filteredData = this.allData;
    this.totalItems   = this.filteredData.length;
    this.totalPages   = Math.ceil(this.totalItems / this.itemsPerPage);
    this.currentPage  = 1;
    this.updatePageData();
  }

  // ─── Estado / color ─────────────────────────────────────────────────────────

  getEstadoItem(item: OrdenDetalle): string {
    const sol = item.cantidadSolicitada || 0;
    const fac = item.cantidadFacturada  || 0;
    if (sol === 0)   return 'SIN_SOLICITUD';
    if (fac >= sol)  return 'COMPLETO';
    return 'PENDIENTE';
  }

  getEstadoColor(item: OrdenDetalle): string {
    switch (this.getEstadoItem(item)) {
      case 'COMPLETO':      return '#28a745';
      case 'PENDIENTE':     return '#ffc107';
      case 'SIN_SOLICITUD': return '#6c757d';
      default:              return '#007bff';
    }
  }

  // ─── Estadísticas auxiliares ────────────────────────────────────────────────

  getPorcentajeCumplimientoGeneral(): number {
    return this.resumenOrden?.estadisticasCantidades?.porcentajeCumplimiento || 0;
  }

  getCantidadPendienteTotal(): number {
    const s = this.resumenOrden?.estadisticasCantidades;
    return s ? Math.max(0, (s.totalSolicitado || 0) - (s.totalFacturado || 0)) : 0;
  }

  getPorcentajeCumplimientoEconomico(): number {
    return this.resumenOrden?.estadisticasEconomicas?.porcentajeCumplimientoEconomico || 0;
  }

  getMontosPendienteTotal(): number {
    const e = this.resumenOrden?.estadisticasEconomicas;
    return e ? Math.max(0, e.diferenciaPendiente) : 0;
  }

  // ─── Modal imagen ───────────────────────────────────────────────────────────

  openImageModal(imageUrl: string): void {
    this.selectedImageUrl = imageUrl;
    this.isModalOpen = true;
  }

  closeImageModal(): void {
    this.isModalOpen = false;
  }

  getImageUrl(relativePath: string): string {
    return `https://bodega.vehicentro.com:1830/api/api/${relativePath.replace(/\\/g, '/')}`;
  }

  // ─── Exportación ────────────────────────────────────────────────────────────

  toggleExportMenu(): void {
    this.showExportMenu = !this.showExportMenu;
  }

  downloadExcel(): void {
    const excelData = this.filteredData.map(item => ({
      'Código':                  item.codigo || '',
      'Descripción':             item.descripcion || '',
      'Cant. Solicitada':        item.cantidadSolicitada || 0,
      'Cant. Facturada':         item.cantidadFacturada  || 0,
      'Cant. Pendiente':         Math.max(0, (item.cantidadSolicitada || 0) - (item.cantidadFacturada || 0)),
      '% Cumplimiento':          (item.cantidadSolicitada || 0) > 0
                                   ? Math.round((item.cantidadFacturada || 0) / (item.cantidadSolicitada || 1) * 100) + '%'
                                   : 'N/A',
      // Económicos
      'P.U. Orden (USD)':        item.precioUnitarioOrden   || 0,
      'Subtotal Orden (USD)':    item.subtotalOrden          || 0,
      'Impuesto Orden (USD)':    item.impuestoOrden          || 0,
      'Total Orden (USD)':       item.totalOrden             || 0,
      'P.U. Invoice (USD)':      item.precioUnitarioInvoice  || 0,
      'Total Facturado (USD)':   item.totalFacturado         || 0,
      'Diferencia Econ. (USD)':  item.diferenciaEconomica    || 0,
      'Estado':                  this.getEstadoItem(item),
      'Orden Invoice':           item.ordenInvoicen || '',
      'Invoices Asociadas':      item.invoicesAsociadas || 'N/A',
      'Origen de Datos':         item.origenDatos || ''
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excelData);
    const wb: XLSX.WorkBook  = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orden Detalles');
    const buf  = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Faltantes_${this.codigoCot}_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  downloadCSV(): void {
    const headers = [
      'Codigo', 'Descripcion', 'Cant. Solicitada', 'Cant. Facturada', 'Cant. Pendiente',
      '% Cumplimiento',
      'P.U. Orden (USD)', 'Subtotal Orden (USD)', 'Impuesto Orden (USD)', 'Total Orden (USD)',
      'P.U. Invoice (USD)', 'Total Facturado (USD)', 'Diferencia Econ. (USD)',
      'Estado', 'Orden Invoice', 'Invoices Asociadas', 'Origen de Datos'
    ].join(',');

    const rows = this.filteredData.map(item => {
      const sol = item.cantidadSolicitada || 0;
      const fac = item.cantidadFacturada  || 0;
      return [
        item.codigo || '',
        `"${item.descripcion || ''}"`,
        sol, fac,
        Math.max(0, sol - fac),
        sol > 0 ? Math.round(fac / sol * 100) + '%' : 'N/A',
        item.precioUnitarioOrden   || 0,
        item.subtotalOrden         || 0,
        item.impuestoOrden         || 0,
        item.totalOrden            || 0,
        item.precioUnitarioInvoice || 0,
        item.totalFacturado        || 0,
        item.diferenciaEconomica   || 0,
        this.getEstadoItem(item),
        item.ordenInvoicen || '',
        `"${item.invoicesAsociadas || 'N/A'}"`,
        item.origenDatos || ''
      ].join(',');
    });

    const blob = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `Faltantes_${this.codigoCot}_${new Date().toISOString().split('T')[0]}.csv`);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  formatDateForInput(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  revisado()  { this.router.navigate(['/pedidobodrev']); }
  error()     { this.router.navigate(['/detallexcelcot']); }
  crear()     { this.router.navigate(['/crearcot']); }
  coti()      { this.router.navigate(['/dashboardcot']); }
  aprobada()  { this.router.navigate(['/cotaprobada']); }
  rechazada() { this.router.navigate(['/cotrechazada']); }
}