// bldetalle.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { BlService } from '../../services/bl.service';
import { BlDetailItemForConteo } from '../../bodegaimport/conteo/conteo.component';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-bldetalle',
  templateUrl: './bldetalle.component.html',
  styleUrls: ['./bldetalle.component.css']
})
export class BldetalleComponent implements OnInit {
  blId: number | undefined;
  blnombre: any;

  currentBlDetails: BlDetailItemForConteo[] = [];
  filteredBlDetails: BlDetailItemForConteo[] = [];
  isLoadingDetails: boolean = false;
  errorMessage: string | null = null;

  searchTerm: string = '';

  // Filtro: mostrar solo filas con algún código (CODIGO, CODE NEW o CÓD. VHCR)
  // no encontrado en el maestro de partes de Oracle (VW_MAESTRO_PARTES),
  // o con algún problema contra la orden de compra original.
  soloNoReconocidos: boolean = false;

  // Filtros específicos contra la orden de compra original. Se pueden activar
  // junto con soloNoReconocidos u otros filtros; si hay más de uno activo,
  // se combinan con OR (se muestra la fila si cumple cualquiera).
  soloNoEnOrden: boolean = false;
  soloExcedeCantidad: boolean = false;
  soloConsolidados: boolean = false;

  // ── Resumen de totales del BL (estilo "Detalles de Orden") ──────────────
  // Se calculan UNA sola vez tras cargar los detalles (no en el template,
  // para no recalcular en cada ciclo de change detection). Siempre sobre
  // currentBlDetails (el universo completo), no sobre el set filtrado.
  totalUnidades: number = 0;
  totalFacturado: number = 0;
  resumenPorInvoice: { invoice: string; items: number; unidades: number; total: number }[] = [];

  // Sorting
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private route: ActivatedRoute,
    private blService: BlService
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        this.blId = +idParam;
        this.loadBlDetails(this.blId);
        this.loadBl(this.blId);
      } else {
        this.errorMessage = 'No se proporcionó un ID de BL.';
      }
    });
  }

  loadBl(blId: number): void {
    this.blService.getBlById(blId).subscribe((response: any) => {
      this.blnombre = response.nombre;
    });
  }

  loadBlDetails(blId: number): void {
    this.isLoadingDetails = true;
    this.errorMessage = null;

    this.blService.getDetalleCompleto(blId)
      .pipe(
        finalize(() => { this.isLoadingDetails = false; }),
        catchError(error => {
          console.error('Error al obtener los detalles del BL:', error);
          this.errorMessage = 'Error al cargar los detalles del BL. Intente nuevamente más tarde.';
          return of([]);
        })
      )
      .subscribe((details: any) => {
        // Detectar respuesta de error del backend ({ success: false, message: "..." })
        if (!Array.isArray(details)) {
          if (details?.success === false) {
            this.errorMessage = details.message || 'Error desconocido del servidor.';
          } else {
            this.errorMessage = 'Respuesta inesperada del servidor.';
          }
          this.currentBlDetails = [];
          this.filteredBlDetails = [];
          this.calcularResumen();
          return;
        }

        this.currentBlDetails = details.map((d: any, index: number) => ({
          ...d,
          cantidadContada:    d.cantidadContada    || d.cantidad,
          cantidadLiquidada:  d.cantidadLiquidada  ?? 0,
          cantidadPendiente:  d.cantidadPendiente  ?? d.cantidad,
          estaLiquidado:      d.estaLiquidado      ?? false,
          unidadSeleccionada: d.unidadSeleccionada || 'unidad',
          estado:             d.estado             || 'bueno',
          observacion:        d.comentarios        || '',
          photos:             d.photos             || [],
          liquidacionId:      d.estaLiquidado ? d.id : undefined,
          isSaving:           false,
          id:                 d.id || index + 1,
          foto:               d.foto        || null,
          ubicacion:          d.ubicacion   || '',
          caracteristica:     d.caracteristica || '',
          dactualizada:       d.dactualizada   || '',
          // ── Campos de códigos ─────────────────────────────────
          codeNew:            d.codeNew           ?? null,
          codigoVhcrInvoice:  d.codigoVhcrInvoice ?? null,
          equivalentCode:     d.equivalentCode    ?? null,
          codigoVhcrOrden:    d.codigoVhcrOrden   ?? null,
          // ── Validación contra el maestro de partes (Oracle) ───
          // Solo aplica a los valores que vienen de detalleinvoicebl
          // (codigo, codeNew, codigoVhcrInvoice). Los de fallback que
          // vienen de detalleordencompra (equivalentCode, codigoVhcrOrden)
          // no tienen validación propia.
          codigoValidado:      d.codigoValidado      ?? false,
          codeNewValidado:     d.codeNewValidado     ?? false,
          codigoVhcrValidado:  d.codigoVhcrValidado  ?? false,
          // ── FOB unitario de cada fuente ───────────────────────
          unitFobInvoice:     d.unitFobInvoice ?? d.precioUnitario ?? 0,
          unitFobOrden:       d.unitFobOrden   ?? null,   // null si no hay match en detalleordencompra
          // ── Validación contra la orden de compra original ─────
          // noPerteneceOrden: el código nunca existió en detalleordencompra
          // para esta orden (LEFT JOIN sin match).
          // cantidadOrden: lo solicitado originalmente (null si no pertenece).
          // cantidadRecibidaTotal: suma de lo recibido en TODOS los invoices
          // asociados a esa orden+código (no solo el BL actual).
          // excedeLoSolicitado: cantidadRecibidaTotal > cantidadOrden.
          noPerteneceOrden:      d.noPerteneceOrden      ?? false,
          cantidadOrden:         d.cantidadOrden         ?? null,
          cantidadRecibidaTotal: d.cantidadRecibidaTotal ?? d.cantidad,
          excedeLoSolicitado:    d.excedeLoSolicitado    ?? false,
          // ── Consolidación ─────────────────────────────────────────────
          esConsolidadoExcel:    d.esConsolidado         ?? false,
        }));
        this.calcularResumen();
        this.applyFilter();
      });
  }

  // ── Resumen de totales ───────────────────────────────────────────────────
  // Total facturado = Σ (cantidad del invoice × FOB unitario del invoice).
  // Se usa d.cantidad (lo facturado en el BL) y NO cantidadContada, porque el
  // objetivo es reflejar el valor de la(s) factura(s), igual que el panel
  // "ECONÓMICO" de Detalles de Orden. El desglose agrupa por invoiceN, ya que
  // un BL puede contener líneas de más de un invoice.
  private calcularResumen(): void {
    this.totalUnidades = 0;
    this.totalFacturado = 0;

    const porInvoice = new Map<string, { invoice: string; items: number; unidades: number; total: number }>();

    for (const d of this.currentBlDetails as any[]) {
      const cantidad = Number(d.cantidad) || 0;
      const fob      = Number(d.unitFobInvoice) || 0;
      const subtotal = cantidad * fob;

      this.totalUnidades  += cantidad;
      this.totalFacturado += subtotal;

      const key = d.invoiceN || 'SIN INVOICE';
      if (!porInvoice.has(key)) {
        porInvoice.set(key, { invoice: key, items: 0, unidades: 0, total: 0 });
      }
      const r = porInvoice.get(key)!;
      r.items    += 1;
      r.unidades += cantidad;
      r.total    += subtotal;
    }

    this.resumenPorInvoice = Array.from(porInvoice.values())
      .sort((a, b) => a.invoice.localeCompare(b.invoice));
  }

  applyFilter(): void {
    let result = [...this.currentBlDetails];

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(d =>
        d.codigo.toLowerCase().includes(term) ||
        d.descripcionEspanol.toLowerCase().includes(term)
      );
    }

    if (this.soloNoReconocidos || this.soloNoEnOrden || this.soloExcedeCantidad || this.soloConsolidados) {
      result = result.filter((d: any) => {
        const cumpleGeneral     = this.soloNoReconocidos  && this.tieneCodigoNoReconocido(d);
        const cumpleNoEnOrden   = this.soloNoEnOrden      && this.esNoPerteneceOrden(d);
        const cumpleExcede      = this.soloExcedeCantidad && this.esExcedeLoSolicitado(d);
        const cumpleConsolidado = this.soloConsolidados   && this.esConsolidado(d);
        return cumpleGeneral || cumpleNoEnOrden || cumpleExcede || cumpleConsolidado;
      });
    }

    if (this.sortColumn) {
      result.sort((a: any, b: any) => {
        const valA = a[this.sortColumn] ?? '';
        const valB = b[this.sortColumn] ?? '';
        const cmp = typeof valA === 'number'
          ? valA - valB
          : String(valA).localeCompare(String(valB));
        return this.sortDirection === 'asc' ? cmp : -cmp;
      });
    }

    this.filteredBlDetails = result;
  }

  toggleSoloNoReconocidos(): void {
    this.soloNoReconocidos = !this.soloNoReconocidos;
    this.applyFilter();
  }

  toggleSoloNoEnOrden(): void {
    this.soloNoEnOrden = !this.soloNoEnOrden;
    this.applyFilter();
  }

  toggleSoloExcedeCantidad(): void {
    this.soloExcedeCantidad = !this.soloExcedeCantidad;
    this.applyFilter();
  }

  toggleSoloConsolidados(): void {
    this.soloConsolidados = !this.soloConsolidados;
    this.applyFilter();
  }

  esConsolidado(d: any): boolean {
    return !!d.esConsolidadoExcel;
  }

  getConsolidados(): number {
    return this.currentBlDetails.filter((d: any) => this.esConsolidado(d)).length;
  }

  // Una fila se considera "no reconocida" si CUALQUIERA de sus tres códigos
  // presentes (CODIGO, CODE NEW, CÓD. VHCR) no fue encontrado en el maestro
  // de partes de Oracle, O si tiene algún problema contra la orden de compra
  // original (no pertenece a la orden / excede lo solicitado). Reutiliza los
  // mismos helpers usados para los iconos de la tabla, así el toggle, el
  // filtro y el resaltado visual siempre quedan en sync.
  tieneCodigoNoReconocido(d: any): boolean {
    const codigoFalla = !this.esCodigoValidado(d);
    const codeNewFalla = !!d.codeNew && !this.esCodeNewValidado(d);
    const vhcrFalla = !!d.codigoVhcrInvoice && !this.esCodigoVhcrValidado(d);
    return codigoFalla || codeNewFalla || vhcrFalla || this.tieneProblemaOrden(d);
  }

  // ── Helpers de validación contra la orden de compra original ────────────
  // noPerteneceOrden: el código del item nunca existió en la orden de compra.
  // excedeLoSolicitado: la suma de lo recibido en todos los invoices de esa
  // orden+código superó la cantidad solicitada originalmente.
  esNoPerteneceOrden(d: any): boolean {
    return !!d.noPerteneceOrden;
  }

  esExcedeLoSolicitado(d: any): boolean {
    return !!d.excedeLoSolicitado;
  }

  tieneProblemaOrden(d: any): boolean {
    return this.esNoPerteneceOrden(d) || this.esExcedeLoSolicitado(d);
  }

  // Cantidad de filas con algún código no reconocido, sobre el set completo
  // (no el filtrado), para mostrar el contador junto al toggle.
  getNoReconocidos(): number {
    return this.currentBlDetails.filter((d: any) => this.tieneCodigoNoReconocido(d)).length;
  }

  // Contadores específicos para los toggles de orden de compra, sobre el
  // set completo (no el filtrado), para mostrar el badge junto a cada toggle.
  getNoEnOrden(): number {
    return this.currentBlDetails.filter((d: any) => this.esNoPerteneceOrden(d)).length;
  }

  getExcedeCantidad(): number {
    return this.currentBlDetails.filter((d: any) => this.esExcedeLoSolicitado(d)).length;
  }

  sortBy(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applyFilter();
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return 'fa-sort';
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  getContados(): number {
    return this.currentBlDetails.filter((d: any) => d.estaLiquidado).length;
  }

  getPendientes(): number {
    return this.currentBlDetails.filter((d: any) => !d.estaLiquidado).length;
  }

  // ── Helpers de validación contra el maestro de partes (Oracle) ──────────
  // Se usan en el template para mostrar el icono ✓/✗ y resaltar la celda.
  // Solo tiene sentido evaluarlos cuando hay un valor de invoice presente;
  // si la celda muestra el fallback de orden (equivalentCode/codigoVhcrOrden)
  // no hay información de validación para esa fuente.
  esCodigoValidado(d: any): boolean {
    return !!d.codigoValidado;
  }

  esCodeNewValidado(d: any): boolean {
    // Solo se valida cuando el valor mostrado viene de codeNew (invoice).
    // Si se está mostrando el fallback equivalentCode, no aplica.
    if (!d.codeNew) return true; // sin codeNew propio → no se marca como inválido
    return !!d.codeNewValidado;
  }

  esCodigoVhcrValidado(d: any): boolean {
    // Igual que arriba: solo aplica cuando el valor mostrado viene de
    // codigoVhcrInvoice. Si se muestra el fallback codigoVhcrOrden, no aplica.
    if (!d.codigoVhcrInvoice) return true;
    return !!d.codigoVhcrValidado;
  }

  exportToExcel(): void {
    if (this.filteredBlDetails.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }

    const dataForExport = this.filteredBlDetails.map((detail: any, i: number) => ({
      '#':                      i + 1,
      'CÓDIGO':                 detail.codigo,
      'DESCRIPCIÓN ESPAÑOL':    detail.descripcionEspanol,
      'CANTIDAD BL':            detail.cantidad,
      'UNIDAD BL':              detail.unidad,
      'CANTIDAD LIQUIDADA':     detail.cantidadLiquidada,
      'CANTIDAD PENDIENTE':     detail.cantidadPendiente,
      'CANTIDAD CONTADA':       detail.cantidadContada,
      'UNIDAD SELECCIONADA':    detail.unidadSeleccionada,
      'ESTADO 1':               detail.estado,
      'ESTADO 2':               detail.estado2,
      'COMENTARIOS':            detail.comentarios,
      'INVOICE':                detail.invoiceN,
      'INVOICE BL':             detail.invoiceBl,
      'BL':                     detail.blNombre,
      'CODE NEW':               detail.codeNew || detail.equivalentCode || '',
      'CÓD. VHCR':              detail.codigoVhcrInvoice || detail.codigoVhcrOrden || '',
      'FOB UNIT INVOICE':       detail.unitFobInvoice,
      'FOB UNIT ORDEN':         detail.unitFobOrden ?? '',
      'NO PERTENECE A ORDEN':   this.esNoPerteneceOrden(detail) ? 'SÍ' : 'NO',
      'CANTIDAD ORDEN':         detail.cantidadOrden ?? 'N/A',
      'CANTIDAD RECIBIDA TOTAL': detail.cantidadRecibidaTotal,
      'EXCEDE LO SOLICITADO':   this.esExcedeLoSolicitado(detail) ? 'SÍ' : 'NO',
      'CONSOLIDADO':             this.esConsolidado(detail) ? 'SÍ' : 'NO',
      'UBICACIÓN':              detail.ubicacion,
      'CARACTERÍSTICA':         detail.caracteristica,
      'DESCRIPCIÓN ACTUALIZADA': detail.dactualizada,
      'PRECIO UNITARIO':        detail.precioUnitario,
      'ESTADO LIQUIDACIÓN':     detail.estaLiquidado ? 'LIQUIDADO' : 'PENDIENTE',
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataForExport);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Detalles de Conteo');

    const filename = `Conteo_BL_${this.blnombre || this.blId}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  // Reporte de items con problemas (no reconocidos en el maestro de partes,
  // no pertenecen a la orden, o exceden lo solicitado). Si el usuario tiene
  // activo alguno de los toggles específicos (soloNoEnOrden / soloExcedeCantidad),
  // el reporte exportado respeta ese filtro para poder analizar cada caso por
  // separado. Si no hay ningún toggle activo, exporta el universo completo de
  // problemas (comportamiento original).
  exportNoReconocidosToExcel(): void {
    const hayFiltroEspecificoActivo = this.soloNoEnOrden || this.soloExcedeCantidad || this.soloNoReconocidos;

    const itemsAExportar = hayFiltroEspecificoActivo
      ? this.filteredBlDetails
      : this.currentBlDetails.filter((d: any) => this.tieneCodigoNoReconocido(d));

    if (itemsAExportar.length === 0) {
      alert('No hay items que coincidan con el filtro actual para exportar.');
      return;
    }

    const dataForExport = itemsAExportar.map((detail: any, i: number) => {
      const fallasDetectadas: string[] = [];
      if (!this.esCodigoValidado(detail)) fallasDetectadas.push('CODIGO');
      if (detail.codeNew && !this.esCodeNewValidado(detail)) fallasDetectadas.push('CODE NEW');
      if (detail.codigoVhcrInvoice && !this.esCodigoVhcrValidado(detail)) fallasDetectadas.push('CÓD. VHCR');
      if (this.esNoPerteneceOrden(detail)) fallasDetectadas.push('NO PERTENECE A ORDEN');
      if (this.esExcedeLoSolicitado(detail)) fallasDetectadas.push('EXCEDE LO SOLICITADO');
      if (this.esConsolidado(detail)) fallasDetectadas.push('CONSOLIDADO');

      return {
        '#':                   i + 1,
        'CÓDIGO':              detail.codigo,
        'CÓDIGO VALIDADO':     this.esCodigoValidado(detail) ? 'SÍ' : 'NO',
        'CODE NEW':            detail.codeNew || '',
        'CODE NEW VALIDADO':   detail.codeNew ? (this.esCodeNewValidado(detail) ? 'SÍ' : 'NO') : 'N/A',
        'CÓD. VHCR':           detail.codigoVhcrInvoice || '',
        'CÓD. VHCR VALIDADO':  detail.codigoVhcrInvoice ? (this.esCodigoVhcrValidado(detail) ? 'SÍ' : 'NO') : 'N/A',
        'NO PERTENECE A ORDEN': this.esNoPerteneceOrden(detail) ? 'SÍ' : 'NO',
        'CANTIDAD ORDEN':       detail.cantidadOrden ?? 'N/A',
        'CANTIDAD RECIBIDA TOTAL': detail.cantidadRecibidaTotal,
        'EXCEDE LO SOLICITADO': this.esExcedeLoSolicitado(detail) ? 'SÍ' : 'NO',
        'CONSOLIDADO':          this.esConsolidado(detail) ? 'SÍ' : 'NO',
        'PROBLEMAS DETECTADOS': fallasDetectadas.join(', '),
        'DESCRIPCIÓN ESPAÑOL': detail.descripcionEspanol,
        'CANTIDAD BL':         detail.cantidad,
        'INVOICE':             detail.invoiceN,
        'BL':                  detail.blNombre,
        'FOB UNIT INVOICE':    detail.unitFobInvoice,
      };
    });

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataForExport);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Items con Problemas');

    const filename = `BL_${this.blnombre || this.blId}_items_con_problemas_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
  }
}