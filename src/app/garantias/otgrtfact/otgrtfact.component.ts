import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  OtsFacturasService,
  VentaTaller,
  ApiResponseVentasTaller
} from 'src/app/services/ots-facturas.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-otgrtfact',
  templateUrl: './otgrtfact.component.html',
  styleUrls: ['./otgrtfact.component.css'],
  // ✅ FIX 1: OnPush — Angular sólo actualiza la vista cuando
  //    se llama markForCheck(), evitando revisiones constantes.
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OtgrtfactComponent implements OnInit, OnDestroy {

  // ─── Datos ──────────────────────────────────────────────────
  facturas: VentaTaller[]          = [];
  facturasFiltradas: VentaTaller[] = [];
  loading  = false;
  error: string | null = null;
  Math = Math;

  // ─── Modo de consulta ───────────────────────────────────────
  modoConsulta: 'ano-actual' | 'rango' = 'ano-actual';

  // ─── Rango de fechas ────────────────────────────────────────
  fechaInicio = '';
  fechaFin    = '';

  // ─── Metadatos de la respuesta ──────────────────────────────
  totalSinIvaApi    = 0;
  totalRegistrosApi = 0;
  tiempoSegundos    = 0;

  // ─── Filtros locales ────────────────────────────────────────
  filtroOficina   = '';
  filtroTipoOt    = '';
  filtroCliente   = '';
  filtroDocumento = '';

  // ─── Paginación ─────────────────────────────────────────────
  paginaActual   = 1;
  itemsPorPagina = 30;

  // ─── Ordenamiento ───────────────────────────────────────────
  columnaOrden    = 'fecha';
  ordenAscendente = false;

  // ✅ FIX 2: Propiedades cacheadas — antes eran getters que se
  //    recalculaban en CADA ciclo de change detection.
  //    Ahora se calculan UNA SOLA VEZ en _recalcularEstadisticas().

  // Selects
  oficinasUnicas: string[]                    = [];
  tiposOtUnicos:  { id: string; desc: string }[] = [];

  // KPIs
  totalSinIvaFiltrado = 0;
  facturasUnicas      = 0;
  otUnicas            = 0;
  promedioFactura     = 0;

  // Resúmenes
  resumenPorTipoOt:  { tipoOtId: string; tipoOt: string; cantOt: number; cantFacturas: number; totalSinIva: number }[] = [];
  resumenPorOficina: { oficina: string; cantOt: number; cantFacturas: number; totalSinIva: number }[]                  = [];
  resumenPorMes:     { etiqueta: string; totalSinIva: number; cantFacturas: number }[]                                 = [];

  // Máximos para barras
  maxTotalMes     = 1;
  maxTotalOficina = 1;

  // Paginación cacheada
  facturasPaginadas: VentaTaller[] = [];
  totalPaginas       = 0;
  paginasArray:      number[] = [];

  // ✅ FIX 3: Subject para cancelar la suscripción HTTP al destruir el componente,
  //    evitando que siga corriendo en segundo plano al navegar a otra hoja.
  private destroy$ = new Subject<void>();

  constructor(
    private otsService: OtsFacturasService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ═══════════════════════════════════════════════════════════
  //  CARGA DE DATOS
  // ═══════════════════════════════════════════════════════════

  cargarDatos(): void {
    this.loading = true;
    this.error   = null;
    this.cdr.markForCheck();

    const obs$ = this.modoConsulta === 'ano-actual'
      ? this.otsService.getVentasAnoActual()
      : this.otsService.getVentas({
          fechaInicio: this.formatFechaParaApi(this.fechaInicio),
          fechaFin:    this.formatFechaParaApi(this.fechaFin)
        });

    obs$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: ApiResponseVentasTaller) => {
        this.facturas          = res.datos          ?? [];
        this.totalSinIvaApi    = res.totalSinIva    ?? 0;
        this.totalRegistrosApi = res.totalRegistros ?? 0;
        this.tiempoSegundos    = res.tiempoSegundos ?? 0;
        this.paginaActual      = 1;
        this.columnaOrden      = 'fecha';
        this.ordenAscendente   = false;
        this._recalcularSelects();
        this.aplicarFiltros();   // también llama _recalcularEstadisticas
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error   = 'Error al cargar las facturas de talleres. Intente nuevamente.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  cambiarModo(modo: 'ano-actual' | 'rango'): void {
    if (this.modoConsulta !== modo) {
      this.modoConsulta = modo;
      this.limpiarFiltros();
      if (modo === 'ano-actual') this.cargarDatos();
    }
  }

  buscarRango(): void {
    if (!this.fechaInicio || !this.fechaFin) {
      this.error = 'Debe ingresar fecha de inicio y fecha de fin.';
      return;
    }
    this.cargarDatos();
  }

  // ═══════════════════════════════════════════════════════════
  //  FILTROS LOCALES
  // ═══════════════════════════════════════════════════════════

  aplicarFiltros(): void {
    const ofi = this.filtroOficina.toLowerCase();
    const tot = this.filtroTipoOt.toLowerCase();
    const cli = this.filtroCliente.toLowerCase();
    const doc = this.filtroDocumento.toLowerCase();

    this.facturasFiltradas = this.facturas.filter(f =>
      (!ofi || f.oficina?.toLowerCase().includes(ofi))      &&
      (!tot || f.tipoOt?.toLowerCase().includes(tot))       &&
      (!cli || f.cliente?.toLowerCase().includes(cli))      &&
      (!doc || f.numDocumento?.toLowerCase().includes(doc))
    );
    this.paginaActual = 1;
    this._recalcularEstadisticas();
    this._recalcularPaginacion();
    this.cdr.markForCheck();
  }

  limpiarFiltros(): void {
    this.filtroOficina   = '';
    this.filtroTipoOt    = '';
    this.filtroCliente   = '';
    this.filtroDocumento = '';
    this.aplicarFiltros();
  }

  // ─── Recálculo de selects (solo cuando cambia facturas base) ─
  private _recalcularSelects(): void {
    this.oficinasUnicas = [
      ...new Set(this.facturas.map(f => f.oficina).filter(Boolean))
    ].sort() as string[];

    const mapTipo = new Map<string, string>();
    this.facturas.forEach(f => { if (f.tipoOtId) mapTipo.set(f.tipoOtId, f.tipoOt); });
    this.tiposOtUnicos = [...mapTipo.entries()]
      .map(([id, desc]) => ({ id, desc }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  // ✅ FIX 2 (núcleo): Un solo recorrido del arreglo calcula
  //    TODOS los resúmenes y KPIs en lugar de N pasadas separadas.
  private _recalcularEstadisticas(): void {
    const ff = this.facturasFiltradas;

    let totalSinIva = 0;
    const setFacturas = new Set<string>();
    const setOts      = new Set<string>();

    const mapTipoOt  = new Map<string, { tipoOtId: string; tipoOt: string; ots: Set<string>; facturas: Set<string>; total: number }>();
    const mapOficina = new Map<string, { oficina: string; ots: Set<string>; facturas: Set<string>; total: number }>();
    const mapMes     = new Map<string, { etiqueta: string; totalSinIva: number; facturas: Set<string> }>();

    for (const f of ff) {
      // ── KPIs globales ──────────────────────────────────────
      totalSinIva += f.valorTotalSinIva || 0;
      if (f.numDocumento) setFacturas.add(f.numDocumento);
      if (f.ordenTrabajo) setOts.add(f.ordenTrabajo);

      // ── Por Tipo OT ────────────────────────────────────────
      if (!mapTipoOt.has(f.tipoOtId)) {
        mapTipoOt.set(f.tipoOtId, {
          tipoOtId: f.tipoOtId, tipoOt: f.tipoOt,
          ots: new Set(), facturas: new Set(), total: 0
        });
      }
      const gt = mapTipoOt.get(f.tipoOtId)!;
      gt.ots.add(f.ordenTrabajo);
      gt.facturas.add(f.numDocumento);
      gt.total += f.valorTotalSinIva || 0;

      // ── Por Oficina ────────────────────────────────────────
      if (!mapOficina.has(f.oficina)) {
        mapOficina.set(f.oficina, {
          oficina: f.oficina, ots: new Set(), facturas: new Set(), total: 0
        });
      }
      const go = mapOficina.get(f.oficina)!;
      go.ots.add(f.ordenTrabajo);
      go.facturas.add(f.numDocumento);
      go.total += f.valorTotalSinIva || 0;

      // ── Por Mes ────────────────────────────────────────────
      if (f.fecha) {
        const d     = new Date(f.fecha);
        const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!mapMes.has(clave)) {
          const etiq = d.toLocaleDateString('es-EC', { year: 'numeric', month: 'short' });
          mapMes.set(clave, { etiqueta: etiq, totalSinIva: 0, facturas: new Set() });
        }
        const gm = mapMes.get(clave)!;
        gm.totalSinIva += f.valorTotalSinIva || 0;
        gm.facturas.add(f.numDocumento);
      }
    }

    // ── Asignar KPIs ──────────────────────────────────────────
    this.totalSinIvaFiltrado = totalSinIva;
    this.facturasUnicas      = setFacturas.size;
    this.otUnicas            = setOts.size;
    this.promedioFactura     = setFacturas.size > 0 ? totalSinIva / setFacturas.size : 0;

    // ── Asignar resúmenes ─────────────────────────────────────
    this.resumenPorTipoOt = [...mapTipoOt.values()]
      .map(g => ({
        tipoOtId: g.tipoOtId, tipoOt: g.tipoOt,
        cantOt: g.ots.size, cantFacturas: g.facturas.size, totalSinIva: g.total
      }))
      .sort((a, b) => b.totalSinIva - a.totalSinIva);

    this.resumenPorOficina = [...mapOficina.values()]
      .map(g => ({
        oficina: g.oficina, cantOt: g.ots.size, cantFacturas: g.facturas.size, totalSinIva: g.total
      }))
      .sort((a, b) => b.totalSinIva - a.totalSinIva);

    this.resumenPorMes = [...mapMes.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({
        etiqueta: v.etiqueta, totalSinIva: v.totalSinIva, cantFacturas: v.facturas.size
      }));

    // ── Máximos para barras ───────────────────────────────────
    this.maxTotalOficina = Math.max(...this.resumenPorOficina.map(o => o.totalSinIva), 1);
    this.maxTotalMes     = Math.max(...this.resumenPorMes.map(m => m.totalSinIva), 1);
  }

  // ── Paginación ───────────────────────────────────────────────
  private _recalcularPaginacion(): void {
    this.totalPaginas = Math.ceil(this.facturasFiltradas.length / this.itemsPorPagina);
    this._actualizarPaginaActual();
  }

  private _actualizarPaginaActual(): void {
    const ini = (this.paginaActual - 1) * this.itemsPorPagina;
    this.facturasPaginadas = this.facturasFiltradas.slice(ini, ini + this.itemsPorPagina);

    const max = 5;
    let ini2 = Math.max(1, this.paginaActual - Math.floor(max / 2));
    let fin2  = Math.min(this.totalPaginas, ini2 + max - 1);
    if (fin2 - ini2 < max - 1) ini2 = Math.max(1, fin2 - max + 1);
    this.paginasArray = Array.from({ length: fin2 - ini2 + 1 }, (_, i) => ini2 + i);
  }

  // ═══════════════════════════════════════════════════════════
  //  ORDENAMIENTO
  // ═══════════════════════════════════════════════════════════

  ordenarPor(columna: string): void {
    if (this.columnaOrden === columna) {
      this.ordenAscendente = !this.ordenAscendente;
    } else {
      this.columnaOrden    = columna;
      this.ordenAscendente = true;
    }

    this.facturasFiltradas.sort((a, b) => {
      let va: any, vb: any;
      switch (columna) {
        case 'fecha':        va = a.fecha    ? new Date(a.fecha).getTime()    : 0;
                             vb = b.fecha    ? new Date(b.fecha).getTime()    : 0; break;
        case 'fechaOt':      va = a.fechaOt  ? new Date(a.fechaOt).getTime()  : 0;
                             vb = b.fechaOt  ? new Date(b.fechaOt).getTime()  : 0; break;
        case 'oficina':      va = a.oficina      ?? ''; vb = b.oficina      ?? ''; break;
        case 'cliente':      va = a.cliente      ?? ''; vb = b.cliente      ?? ''; break;
        case 'numDocumento': va = a.numDocumento ?? ''; vb = b.numDocumento ?? ''; break;
        case 'tipoOt':       va = a.tipoOt       ?? ''; vb = b.tipoOt       ?? ''; break;
        case 'valorTotal':   va = a.valorTotalSinIva ?? 0; vb = b.valorTotalSinIva ?? 0; break;
        default: return 0;
      }
      if (va < vb) return this.ordenAscendente ? -1 : 1;
      if (va > vb) return this.ordenAscendente ? 1 : -1;
      return 0;
    });

    this._actualizarPaginaActual();
    this.cdr.markForCheck();
  }

  iconoOrden(columna: string): string {
    if (this.columnaOrden !== columna) return 'fas fa-sort';
    return this.ordenAscendente ? 'fas fa-sort-up' : 'fas fa-sort-down';
  }

  // ═══════════════════════════════════════════════════════════
  //  PAGINACIÓN (pública)
  // ═══════════════════════════════════════════════════════════

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
      this._actualizarPaginaActual();
      this.cdr.markForCheck();
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════

  // ✅ FIX 4: trackBy evita recrear el DOM de toda la tabla en cada ciclo
  trackByFactura(index: number, f: VentaTaller): string {
    return (f.numDocumento ?? '') + '_' + index;
  }

  trackByNum(_index: number, n: number): number {
    return n;
  }

  trackByStr(_index: number, s: string): string {
    return s;
  }

  trackByTipoOt(_index: number, t: { id: string }): string {
    return t.id;
  }

  trackByOficina(_index: number, o: { oficina: string }): string {
    return o.oficina;
  }

  trackByMes(_index: number, m: { etiqueta: string }): string {
    return m.etiqueta;
  }

  trackByTipoOtResumen(_index: number, r: { tipoOtId: string }): string {
    return r.tipoOtId;
  }

  porcentajeBarra(valor: number, max: number): number {
    return max > 0 ? Math.round((valor / max) * 100) : 0;
  }

  formatearFecha(fecha: string | null): string {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-EC', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    });
  }

  formatearMoneda(valor: number | null | undefined): string {
    if (valor == null) return '$0.00';
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(valor);
  }

  badgeTipoOt(tipoOtId: string): string {
    switch (tipoOtId) {
      case 'GRT': return 'bg-success';
      case 'AUT': return 'bg-primary';
      case 'PDI': return 'bg-warning text-dark';
      default:    return 'bg-secondary';
    }
  }

  private formatFechaParaApi(fecha: string): string {
    if (!fecha) return '';
    const [y, m, d] = fecha.split('-');
    return `${d}/${m}/${y}`;
  }

  // ═══════════════════════════════════════════════════════════
  //  EXPORTAR EXCEL  (5 hojas)
  // ═══════════════════════════════════════════════════════════

  exportarExcel(): void {
    try {
      // Hoja 1 — Detalle de facturas
      const detalle = this.facturasFiltradas.map(f => ({
        'Oficina ID':           f.oficinaId,
        'Oficina':              f.oficina,
        'Tipo OT':              f.tipoOt,
        'Orden Trabajo':        f.ordenTrabajo,
        'Fecha OT':             this.formatearFecha(f.fechaOt),
        'Cód. Cliente':         f.codCliente,
        'ID Cliente':           f.idCliente,
        'Cliente':              f.cliente,
        'Tipo Documento':       f.tipoDocumento,
        'Nº Documento':         f.numDocumento,
        'Fecha Factura':        this.formatearFecha(f.fecha),
        'Total Sin IVA':        f.valorTotalSinIva,
        'Usuario Creó OT':      f.usuarioCrearOt,
        'Usuario Creó Factura': f.usuarioCrearFactura
      }));
      const ws1 = XLSX.utils.json_to_sheet(detalle);
      ws1['!cols'] = [
        {wch:12},{wch:20},{wch:10},{wch:14},{wch:12},{wch:12},{wch:14},{wch:30},
        {wch:14},{wch:20},{wch:14},{wch:14},{wch:18},{wch:18}
      ];

      // Hoja 2 — Por Tipo OT
      const ws2 = XLSX.utils.json_to_sheet(this.resumenPorTipoOt.map(r => ({
        'Tipo OT':       r.tipoOt,
        'OTs Únicas':    r.cantOt,
        'Facturas':      r.cantFacturas,
        'Total Sin IVA': r.totalSinIva
      })));

      // Hoja 3 — Por Oficina
      const ws3 = XLSX.utils.json_to_sheet(this.resumenPorOficina.map(r => ({
        'Oficina':       r.oficina,
        'OTs Únicas':    r.cantOt,
        'Facturas':      r.cantFacturas,
        'Total Sin IVA': r.totalSinIva
      })));

      // Hoja 4 — Por Mes
      const ws4 = XLSX.utils.json_to_sheet(this.resumenPorMes.map(r => ({
        'Mes':           r.etiqueta,
        'Facturas':      r.cantFacturas,
        'Total Sin IVA': r.totalSinIva
      })));

      // Hoja 5 — KPIs
      const ws5 = XLSX.utils.json_to_sheet([
        { 'Indicador': 'Facturas únicas',     'Valor': this.facturasUnicas },
        { 'Indicador': 'OTs únicas',           'Valor': this.otUnicas },
        { 'Indicador': 'Total Sin IVA',        'Valor': this.totalSinIvaFiltrado },
        { 'Indicador': 'Promedio por factura', 'Valor': this.promedioFactura },
        { 'Indicador': 'Fecha exportación',    'Valor': new Date().toLocaleString('es-EC') }
      ]);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, 'Facturas');
      XLSX.utils.book_append_sheet(wb, ws2, 'Por Tipo OT');
      XLSX.utils.book_append_sheet(wb, ws3, 'Por Oficina');
      XLSX.utils.book_append_sheet(wb, ws4, 'Por Mes');
      XLSX.utils.book_append_sheet(wb, ws5, 'KPIs');

      const fecha = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Facturas_Talleres_${fecha}.xlsx`);
    } catch (err) {
      console.error('Error exportando Excel:', err);
      alert('Error al exportar. Intente nuevamente.');
    }
  }

  imprimirReporte(): void {
    window.print();
  }
}