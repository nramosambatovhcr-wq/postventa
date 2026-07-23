import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import saveAs from 'file-saver';
import { finalize, Subscription } from 'rxjs';
import { Usuario } from '../../models/usuario';
import { AuthService } from '../../services/auth.service';
import { PedidobodegaService } from '../../services/pedidobodega.service';
import { ReloadService } from '../../services/reload.service';
import * as XLSX from 'xlsx-js-style';
import { CotizacionService, OrdenDetalle, OrdenDetalleResponse } from 'src/app/services/cotizacion.service';
import { Language } from 'src/app/services/translation.service';
import { TranslationinvorevService } from 'src/app/services/translationinvorev.service';

// ─── Interfaces locales alineadas con el nuevo endpoint ───────────────────────

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
  itemsConInvoice: number;
  itemsSinInvoice: number;
  estadisticasCantidades: EstadisticasCantidades;
  estadisticasEconomicas: EstadisticasEconomicas;
  invoicesAsociadas: string[];
  blsAsociados?: string[];
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
  selector: 'app-dashboardrev',
  templateUrl: './dashboardrev.component.html',
  styleUrls: ['./dashboardrev.component.css']
})
export class DashboardrevComponent implements OnInit, OnDestroy {

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

  // Filtros
  filtroOrigen: string = '';
  filtroEstado: string = '';

  // Traducción
  currentLanguage: Language = 'es';
  isProveedorUser: boolean = false;

  // Modal imagen
  selectedImageUrl: string = '';
  isModalOpen: boolean = false;

  // Menú export
  showExportMenu: boolean = false;

  // ── Modal Agregar / Actualizar ítem ──
  modalItemAbierto: boolean = false;
  guardandoItem:    boolean = false;
  buscandoCodigo:   boolean = false;
  itemExistente:    OrdenDetalle | null = null;
  private _busquedaTimeout: any = null;

  itemForm = {
    codigo:      '',
    nuevoCodigo: '',
    codigoVhcr:  '',
    descripcion: '',
    cantidad:    null as number | null,
    fob:         null as number | null,
  };

  avisoModalItem: string = '';

  totalItems: number = 0;

  // ── Edición masiva de tabla (código, cantidad y FOB por fila) ──
  modoEdicionTabla: boolean = false;
  guardandoTabla:   boolean = false;
  private edicionesTabla = new Map<number, { codigo: string; cantidad: number; fob: number }>();

  constructor(
    private router: Router,
    private tutorialService: CotizacionService,
    private reloadService: ReloadService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private translationService: TranslationinvorevService
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
        if (this.usuario.rol === 'proveedor') {
          this.isProveedorUser = true;
        }
        if (!this.isProveedorUser) {
          this.translationService.setLanguage('es');
        }
        this.loadOrdenDetalles();
      }
    });

    this.subscription.add(
      this.reloadService.reload$.subscribe(() => this.loadOrdenDetalles())
    );

    this.subscription.add(
      this.translationService.currentLanguage$.subscribe((lang: any) => {
        this.currentLanguage = lang;
      })
    );

    const now = new Date();
    this.startDate = this.formatDateForInput(new Date(now.getFullYear(), now.getMonth(), 1));
    this.endDate   = this.formatDateForInput(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    clearTimeout(this._busquedaTimeout);
  }

  // ─── Carga principal ────────────────────────────────────────────────────────

  loadOrdenDetalles(): void {
    this.loading = true;
    this.tutorialService.getOrdenDetalleCoalesce(this.codigoCot).subscribe({
      next: (response: OrdenDetalleResponse) => {
        if (response.success) {
          this.allData      = response.detalles;
          this.resumenOrden = response.resumen as ResumenOrden;

          if (this.resumenOrden && this.allData.length > 0) {
            this.resumenOrden.ordenInvoicen = this.allData[0].ordenInvoicen || 'N/A';
          }

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
    const totalPages   = this.totalPages;
    const currentPage  = this.currentPage;
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

  // ─── Helpers de severidad y problemas ───────────────────────────────────────

  getRowSeverityClass(item: OrdenDetalle): string {
    const problemas = this.contarProblemas(item);
    if (problemas >= 3) return 'fila-severidad-critica';
    if (problemas >= 1) return 'fila-severidad-advertencia';
    return '';
  }

  contarProblemas(item: OrdenDetalle): number {
    let count = 0;
    if (!item.codigoValidado) count++;
    if (item.nuevoCodigo && !item.codeNewValidado) count++;
    if (item.codigoVhcr && !item.codigoVhcrValidado) count++;
    if (item.esDuplicadoConsolidado) count++;
    if (item.tieneEquivalenteDuplicado) count++;
    return count;
  }

  getNombresProblemas(item: OrdenDetalle): string[] {
    const problemas: string[] = [];
    if (!item.codigoValidado) problemas.push('❌ Código no existe en ERP');
    if (item.nuevoCodigo && !item.codeNewValidado) problemas.push('❌ Code New no existe en ERP');
    if (item.codigoVhcr && !item.codigoVhcrValidado) problemas.push('❌ VHCR no existe en ERP');
    if (item.esDuplicadoConsolidado) problemas.push('🔗 Consolidado desde múltiples líneas');
    if (item.tieneEquivalenteDuplicado) problemas.push('🔄 Equivalente duplicado');
    return problemas;
  }

  getProblemasTooltip(item: OrdenDetalle): string {
    const problemas = this.getNombresProblemas(item);
    if (problemas.length === 0) return '✅ Sin problemas detectados';
    return problemas.join(' | ');
  }

  getPorcentajeProblemas(): number {
    if (!this.filteredData || this.filteredData.length === 0) return 0;
    const conProblemas = this.filteredData.filter(d => this.contarProblemas(d) > 0).length;
    return Math.round((conProblemas / this.filteredData.length) * 100);
  }

  getTotalProblemas(): number {
    return this.filteredData.filter(d => this.contarProblemas(d) > 0).length;
  }

  getRowClass(item: OrdenDetalle): string {
    const classes: string[] = [];

    const severidad = this.getRowSeverityClass(item);
    if (severidad) classes.push(severidad);

    if (this.isExceso(item)) {
      classes.push('fila-exceso');
    } else {
      const origen = (item.origenDatos || '').toLowerCase().replace('_', '-');
      if (origen === 'invoice-bl') classes.push('fila-invoice-bl');
      else if (origen === 'orden-compra') classes.push('fila-orden-compra');
      else if (origen === 'ambos') classes.push('fila-ambos');
    }

    if (item.esDuplicadoConsolidado) classes.push('fila-consolidada');
    if (item.tieneEquivalenteDuplicado) classes.push('fila-duplicado');

    return classes.join(' ');
  }

  getCantidadPendiente(item: OrdenDetalle): number {
    const sol = item.cantidadSolicitada || 0;
    const fac = item.cantidadFacturada || 0;
    return Math.max(0, sol - fac);
  }

  getEstadoClassName(item: OrdenDetalle): string {
    return this.getEstadoItem(item).toLowerCase().replace('_', '-');
  }

  getPorcentajeItem(item: OrdenDetalle): number | null {
    const sol = item.cantidadSolicitada || 0;
    const fac = item.cantidadFacturada || 0;
    return sol > 0 ? (fac / sol * 100) : null;
  }

  showBadgeOk(item: OrdenDetalle): boolean {
    const codigoOk = item.codigoValidado;
    const codeNewOk = !item.nuevoCodigo || item.codeNewValidado;
    const vhcrOk = !item.codigoVhcr || item.codigoVhcrValidado;

    return !item.esDuplicadoConsolidado &&
           !item.tieneEquivalenteDuplicado &&
           codigoOk && codeNewOk && vhcrOk;
  }

  showBadgePendiente(item: OrdenDetalle): boolean {
    const tieneProblema = !item.codigoValidado ||
                          (!!item.nuevoCodigo && !item.codeNewValidado) ||
                          (!!item.codigoVhcr && !item.codigoVhcrValidado);

    return !item.esDuplicadoConsolidado &&
           !item.tieneEquivalenteDuplicado &&
           tieneProblema;
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
          case 'EXCESO':        return sol > 0 && fac > sol;
          case 'COMPLETO':      return sol > 0 && Math.abs(fac - sol) < 0.0001;
          case 'PENDIENTE':     return sol > fac;
          case 'SIN_SOLICITUD': return sol === 0;
          case 'SIN_VALIDAR':   return !item.codigoValidado ||
                                       (!!item.nuevoCodigo && !item.codeNewValidado) ||
                                       (!!item.codigoVhcr  && !item.codigoVhcrValidado);
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

  // ─── Estado / color por ítem ────────────────────────────────────────────────

  getEstadoItem(item: OrdenDetalle): string {
    const sol = item.cantidadSolicitada || 0;
    const fac = item.cantidadFacturada  || 0;
    if (sol === 0)    return 'SIN_SOLICITUD';
    if (fac > sol)    return 'EXCESO';
    if (Math.abs(fac - sol) < 0.0001) return 'COMPLETO';
    return 'PENDIENTE';
  }

  getEstadoColor(item: OrdenDetalle): string {
    switch (this.getEstadoItem(item)) {
      case 'EXCESO':        return '#e65100';
      case 'COMPLETO':      return '#28a745';
      case 'PENDIENTE':     return '#ffc107';
      case 'SIN_SOLICITUD': return '#6c757d';
      default:              return '#007bff';
    }
  }

  isExceso(item: OrdenDetalle): boolean {
    return (item.cantidadFacturada || 0) > (item.cantidadSolicitada || 0);
  }

  // ─── Estadísticas auxiliares ────────────────────────────────────────────────

  getPorcentajeCumplimientoGeneral(): number {
    return this.resumenOrden?.estadisticasCantidades?.porcentajeCumplimiento || 0;
  }

  getPorcentajeCumplimientoEconomico(): number {
    return this.resumenOrden?.estadisticasEconomicas?.porcentajeCumplimientoEconomico || 0;
  }

  getCantidadPendienteTotal(): number {
    const s = this.resumenOrden?.estadisticasCantidades;
    return s ? Math.max(0, (s.totalSolicitado || 0) - (s.totalFacturado || 0)) : 0;
  }

  getMontosPendienteTotal(): number {
    const e = this.resumenOrden?.estadisticasEconomicas;
    return e ? Math.max(0, e.diferenciaPendiente) : 0;
  }

  // ─── Traducciones / idioma ──────────────────────────────────────────────────

  translate(key: string): string {
    return this.translationService.translate(key);
  }

  changeLanguage(lang: Language): void {
    this.translationService.setLanguage(lang);
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
    const kCode    = this.translate('code');
    const kDesc    = this.translate('description');
    const kReq     = this.translate('requestedQty');
    const kInv     = this.translate('invoicedQty');
    const kPend    = this.translate('pendingQty');
    const kStatus  = this.translate('status');
    const kInvs    = this.translate('invoices');
    const kOrigin  = this.translate('origin');

    const excelData = this.filteredData.map(item => {
      const sol       = item.cantidadSolicitada    || 0;
      const fac       = item.cantidadFacturada     || 0;
      const puOrden   = item.precioUnitarioOrden   || 0;
      const puInvoice = item.precioUnitarioInvoice || 0;
      const cumplimiento = sol > 0 ? Math.round((fac / sol) * 100) + '%' : 'N/A';

      return {
        [kCode]:   item.codigo      || '',
        'Cód. VHCR':       item.codigoVhcr  || '',
        'Código Nuevo':    item.nuevoCodigo  || '',
        [kDesc]:   item.descripcion  || '',
        [kReq]:    sol,
        [kInv]:    fac,
        [kPend]:   Math.max(0, sol - fac),
        '% Cumplimiento Cant.': cumplimiento,
        'P.U. Orden (USD)':       puOrden,
        'Total Orden (USD)':      Math.round(sol * puOrden   * 100) / 100,
        'P.U. Invoice (USD)':     puInvoice,
        'Total Facturado (USD)':  Math.round(fac * puInvoice * 100) / 100,
        'Diferencia Econ. (USD)': Math.round((sol * puOrden - fac * puInvoice) * 100) / 100,
        [kStatus]: this.getEstadoItem(item),
        'Orden Invoice':          item.ordenInvoicen     || '',
        [kInvs]:   item.invoicesAsociadas || 'N/A',
        [kOrigin]: item.origenDatos       || ''
      };
    });

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excelData);
    const range = XLSX.utils.decode_range(ws['!ref']!);

    const colIdx: Record<string, number> = {};
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c: C })];
      if (cell?.v != null) colIdx[String(cell.v)] = C;
    }
    const cCod    = colIdx[kCode];
    const cVhcr   = colIdx['Cód. VHCR'];
    const cNuevo  = colIdx['Código Nuevo'];

    const fill = (rgb: string) => ({ patternType: 'solid' as const, fgColor: { rgb } });

    const hdrNeutro = {
      font:      { bold: true, color: { rgb: '1C1C1E' } },
      fill:      fill('F2F2F7'),
      alignment: { horizontal: 'center' as const }
    };

    const cellError = {
      font: { bold: true, color: { rgb: 'B3362A' } },
      fill: fill('FDECEA')
    };

    const applyS = (addr: string, s: object) => {
      if (ws[addr]) ws[addr] = { ...ws[addr], s };
    };

    for (let C = range.s.c; C <= range.e.c; C++) {
      applyS(XLSX.utils.encode_cell({ r: 0, c: C }), hdrNeutro);
    }

    this.filteredData.forEach((item, i) => {
      const r = i + 1;

      if (!item.codigoValidado) {
        applyS(XLSX.utils.encode_cell({ r, c: cCod }), cellError);
      }

      if (item.codigoVhcr && !item.codigoVhcrValidado) {
        applyS(XLSX.utils.encode_cell({ r, c: cVhcr }), cellError);
      }

      if (item.nuevoCodigo && !item.codeNewValidado) {
        applyS(XLSX.utils.encode_cell({ r, c: cNuevo }), cellError);
      }
    });

    ws['!cols'] = Array.from({ length: range.e.c + 1 }, (_, c) =>
      [cCod, cNuevo, cVhcr].includes(c) ? { wch: 22 } : { wch: 16 }
    );

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orden Detalles');
    const buf  = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Orden_Detalles_${this.codigoCot}_${new Date().toISOString().split('T')[0]}.xlsx`);
    this.showExportMenu = false;
  }

  downloadCSV(): void {
    const headers = [
      this.translate('code'), 'Cód. VHCR', 'Código Nuevo', this.translate('description'),
      this.translate('requestedQty'), this.translate('invoicedQty'), this.translate('pendingQty'),
      '% Cumplimiento',
      'P.U. Orden (USD)', 'Total Orden (USD)',
      'P.U. Invoice (USD)', 'Total Facturado (USD)', 'Diferencia Econ. (USD)',
      this.translate('status'), 'Orden Invoice', this.translate('invoices'), this.translate('origin')
    ].join(',');

    const rows = this.filteredData.map(item => {
      const sol     = item.cantidadSolicitada    || 0;
      const fac     = item.cantidadFacturada     || 0;
      const puOrden = item.precioUnitarioOrden   || 0;
      const puInv   = item.precioUnitarioInvoice || 0;
      return [
        item.codigo || '',
        item.nuevoCodigo || '',
        `"${item.descripcion || ''}"`,
        sol, fac,
        Math.max(0, sol - fac),
        sol > 0 ? Math.round(fac / sol * 100) + '%' : 'N/A',
        puOrden,
        Math.round(sol * puOrden * 100) / 100,
        puInv,
        Math.round(fac * puInv   * 100) / 100,
        Math.round((sol * puOrden - fac * puInv) * 100) / 100,
        this.getEstadoItem(item),
        item.ordenInvoicen || '',
        `"${item.invoicesAsociadas || 'N/A'}"`,
        item.origenDatos || ''
      ].join(',');
    });

    const blob = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `Orden_Detalles_${this.codigoCot}_${new Date().toISOString().split('T')[0]}.csv`);
  }

  downloadExcelNoValidados(): void {
    const noValidados = this.allData.filter(item =>
      !item.codigoValidado ||
      (!!item.nuevoCodigo && !item.codeNewValidado) ||
      (!!item.codigoVhcr  && !item.codigoVhcrValidado)
    );

    if (noValidados.length === 0) {
      alert('✅ No hay ítems sin validar en esta orden.');
      this.showExportMenu = false;
      return;
    }

    const excelData = noValidados.map(item => {
      const sol     = item.cantidadSolicitada   || 0;
      const fac     = item.cantidadFacturada    || 0;
      const puOrden = item.precioUnitarioOrden  || 0;
      return {
        'Código':       item.codigo      || '',
        'Cód. VHCR':   item.codigoVhcr   || '',
        'Código Nuevo': item.nuevoCodigo  || '',
        'Descripción':           item.descripcion  || '',
        'Cant. Solicitada':      sol,
        'Cant. Facturada':       fac,
        'Cant. Pendiente':       Math.max(0, sol - fac),
        'P.U. Orden (USD)':      puOrden,
        'Total Orden (USD)':     Math.round(sol * puOrden * 100) / 100,
        'Estado':                this.getEstadoItem(item),
        'Invoices':              item.invoicesAsociadas || '',
        'Problemas':             this.getNombresProblemas(item).join(' | '),
      };
    });

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excelData);
    const range = XLSX.utils.decode_range(ws['!ref']!);

    const colIdx: Record<string, number> = {};
    for (let C = range.s.c; C <= range.e.c; C++) {
      const c = ws[XLSX.utils.encode_cell({ r: 0, c: C })];
      if (c?.v != null) colIdx[String(c.v)] = C;
    }
    const cCod   = colIdx['Código'];
    const cVhcr  = colIdx['Cód. VHCR'];
    const cNuevo = colIdx['Código Nuevo'];

    const fill = (rgb: string) => ({ patternType: 'solid' as const, fgColor: { rgb } });

    const hdrNeutro = {
      font:      { bold: true, color: { rgb: '1C1C1E' } },
      fill:      fill('F2F2F7'),
      alignment: { horizontal: 'center' as const }
    };

    const cellError = {
      font: { bold: true, color: { rgb: 'B3362A' } },
      fill: fill('FDECEA')
    };

    const applyS = (addr: string, s: object) => {
      if (ws[addr]) ws[addr] = { ...ws[addr], s };
    };

    for (let C = range.s.c; C <= range.e.c; C++) {
      applyS(XLSX.utils.encode_cell({ r: 0, c: C }), hdrNeutro);
    }

    noValidados.forEach((item, i) => {
      const r = i + 1;

      if (!item.codigoValidado) {
        applyS(XLSX.utils.encode_cell({ r, c: cCod }), cellError);
      }

      if (item.codigoVhcr && !item.codigoVhcrValidado) {
        applyS(XLSX.utils.encode_cell({ r, c: cVhcr }), cellError);
      }

      if (item.nuevoCodigo && !item.codeNewValidado) {
        applyS(XLSX.utils.encode_cell({ r, c: cNuevo }), cellError);
      }
    });

    ws['!cols'] = Array.from({ length: range.e.c + 1 }, (_, c) =>
      [cCod, cNuevo, cVhcr].includes(c)  ? { wch: 22 } :
      c === colIdx['Descripción']         ? { wch: 30 } :
      c === colIdx['Problemas']           ? { wch: 40 } :
                                            { wch: 16 }
    );

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sin Validar');
    const buf  = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `NoValidados_Orden_${this.codigoCot}_${new Date().toISOString().split('T')[0]}.xlsx`);
    this.showExportMenu = false;
  }

  // ─── Modal Agregar ítem (solo creación) ─────────────────────────────────────

  abrirModalItem(): void {
    this.itemForm       = { codigo: '', nuevoCodigo: '', codigoVhcr: '', descripcion: '', cantidad: null, fob: null };
    this.itemExistente  = null;
    this.avisoModalItem = '';
    this.buscandoCodigo = false;
    this.modalItemAbierto = true;
  }

  cerrarModalItem(): void {
    if (this.guardandoItem) return;
    this.modalItemAbierto = false;
    this.itemExistente    = null;
    this.avisoModalItem   = '';
    clearTimeout(this._busquedaTimeout);
  }

  itemFormValido(): boolean {
    return (
      !!this.itemForm.codigo?.trim() &&
      !!this.itemForm.descripcion?.trim() &&
      (this.itemForm.cantidad ?? 0) > 0 &&
      !this.itemExistente
    );
  }

  onCodigoInput(): void {
    clearTimeout(this._busquedaTimeout);
    this.itemExistente  = null;
    this.buscandoCodigo = false;

    const codigo = this.itemForm.codigo?.trim();
    if (!codigo) return;

    this.buscandoCodigo = true;
    this._busquedaTimeout = setTimeout(() => {
      this.itemExistente  = this.allData.find(
        i => i.codigo?.trim().toLowerCase() === codigo.toLowerCase()
      ) ?? null;
      this.buscandoCodigo = false;
    }, 350);
  }

  guardarItem(): void {
    if (this.guardandoItem) return;

    if (this.itemExistente) {
      this.avisoModalItem =
        `Ya existe un ítem con este código en la orden. ` +
        `Para modificarlo usa el botón "Editar tabla".`;
      return;
    }

    if (!this.itemFormValido()) return;
    this.avisoModalItem = '';

    this.guardandoItem = true;

    const payload = [{
      detalleId:      null,
      productoid:     null,
      codigo:         this.itemForm.codigo!.trim(),
      descripcion:    this.itemForm.descripcion!.trim(),
      chino:          '',
      cantidad:       Number(this.itemForm.cantidad),
      precioUnitario: Number(this.itemForm.fob) || 0,
      equivalentCode: this.itemForm.nuevoCodigo?.trim() || null,
      codigoVhcr:     this.itemForm.codigoVhcr?.trim() || null,
    }];

    const url = `https://bodega.vehicentro.com:1830/api/api/invoice/${this.codigoCot}/detalles/sync`;

    fetch(url, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
      .then(res => {
        if (!res.ok) return res.text().then(t => { throw new Error(t); });
        return res.json();
      })
      .then(data => {
        alert(`✅ Ítem agregado correctamente.\n${data.mensaje ?? ''}`);
        this.guardandoItem = false;
        this.cerrarModalItem();
        this.loadOrdenDetalles();
      })
      .catch(err => {
        console.error('Error al guardar ítem:', err);
        alert(`❌ Error al guardar: ${err.message}`);
      })
      .finally(() => {
        this.guardandoItem = false;
      });
  }

  // ─── Edición masiva de tabla (código, cantidad, FOB) ───────────────────────

  activarEdicionTabla(): void {
    this.edicionesTabla.clear();
    this.modoEdicionTabla = true;
  }

  cancelarEdicionTabla(): void {
    if (this.guardandoTabla) return;
    this.edicionesTabla.clear();
    this.modoEdicionTabla = false;
  }

  getValorEdicion(item: OrdenDetalle, campo: 'codigo' | 'cantidad' | 'fob'): any {
    const id = (item as any).detalleId;
    const edicion = this.edicionesTabla.get(id);
    if (edicion) return edicion[campo];

    if (campo === 'codigo')   return item.codigo || '';
    if (campo === 'cantidad') return item.cantidadSolicitada ?? 0;
    return item.precioUnitarioOrden ?? 0;
  }

  onEdicionTablaInput(item: OrdenDetalle, campo: 'codigo' | 'cantidad' | 'fob', valor: any): void {
    const id = (item as any).detalleId;
    if (id == null) return;

    const edicion = this.edicionesTabla.get(id) ?? {
      codigo:   item.codigo || '',
      cantidad: item.cantidadSolicitada ?? 0,
      fob:      item.precioUnitarioOrden ?? 0,
    };

    if (campo === 'codigo') edicion.codigo = (valor ?? '').toString();
    else edicion[campo] = Number(valor) || 0;

    this.edicionesTabla.set(id, edicion);
  }

  getSubtotalEdicion(item: OrdenDetalle): number {
    const cantidad = Number(this.getValorEdicion(item, 'cantidad')) || 0;
    const fob      = Number(this.getValorEdicion(item, 'fob')) || 0;
    return cantidad * fob;
  }

  filaTieneCambios(item: OrdenDetalle): boolean {
    const id = (item as any).detalleId;
    const edicion = this.edicionesTabla.get(id);
    if (!edicion) return false;
    return this.esEdicionDistinta(edicion, item);
  }

  private esEdicionDistinta(
    edicion: { codigo: string; cantidad: number; fob: number },
    original: OrdenDetalle
  ): boolean {
    const cambioCodigo   = edicion.codigo.trim() !== (original.codigo || '').trim();
    const cambioCantidad = Number(edicion.cantidad) !== Number(original.cantidadSolicitada ?? 0);
    const cambioFob      = Number(edicion.fob)      !== Number(original.precioUnitarioOrden ?? 0);
    return cambioCodigo || cambioCantidad || cambioFob;
  }

  get cantidadFilasModificadas(): number {
    let count = 0;
    this.edicionesTabla.forEach((edicion, id) => {
      const original = this.allData.find(i => (i as any).detalleId === id);
      if (original && this.esEdicionDistinta(edicion, original)) count++;
    });
    return count;
  }

  /** Guarda todos los cambios pendientes de la edición masiva de tabla */
  guardarEdicionTabla(): void {
    if (this.guardandoTabla) return;

    if (this.cantidadFilasModificadas === 0) {
      return;
    }

    const payload: any[] = [];
    this.edicionesTabla.forEach((edicion, id) => {
      const original = this.allData.find(i => (i as any).detalleId === id);
      if (!original || !this.esEdicionDistinta(edicion, original)) return;
      if (!edicion.codigo.trim() || Number(edicion.cantidad) <= 0) return;

      payload.push({
        detalleId:      id,
        productoid:     null,
        codigo:         edicion.codigo.trim(),
        descripcion:    original.descripcion || '',
        chino:          '',
        cantidad:       Number(edicion.cantidad),
        precioUnitario: Number(edicion.fob) || 0,
        equivalentCode: (original as any).nuevoCodigo || null,
        codigoVhcr:     original.codigoVhcr || null,
      });
    });

    if (payload.length === 0) {
      return;
    }

    this.guardandoTabla = true;

    const url = `https://bodega.vehicentro.com:1830/api/api/invoice/${this.codigoCot}/detalles/sync`;

    fetch(url, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
      .then(res => {
        if (!res.ok) return res.text().then(t => { throw new Error(t); });
        return res.json();
      })
      .then(data => {
        alert(`✅ ${payload.length} ítem(s) actualizado(s) correctamente.\n${data.mensaje ?? ''}`);
        this.edicionesTabla.clear();
        this.modoEdicionTabla = false;
        this.loadOrdenDetalles();
      })
      .catch(err => {
        console.error('Error al guardar edición de tabla:', err);
        alert(`❌ Error al guardar: ${err.message}`);
      })
      .finally(() => {
        this.guardandoTabla = false;
      });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  formatDateForInput(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Rutas de navegación
  revisado()  { this.router.navigate(['/pedidobodrev']); }
  error()     { this.router.navigate(['/detallexcelcot']); }
  crear()     { this.router.navigate(['/crearcot']); }
  coti()      { this.router.navigate(['/dashboardcot']); }
  aprobada()  { this.router.navigate(['/cotaprobada']); }
  rechazada() { this.router.navigate(['/cotrechazada']); }
}