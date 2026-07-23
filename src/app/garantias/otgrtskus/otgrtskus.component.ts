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
  FiltrosTalleres,
  SkuGarantiaConStock,
  VentaTallerDetalleConStock,
  ApiResponseSkusGarantia,
  ApiResponseVentasTallerDetalleConStock
} from 'src/app/services/ots-facturas.service';
import * as XLSX from 'xlsx';

type Vista = 'skus' | 'detalle';

@Component({
  selector: 'app-otgrtskus',
  templateUrl: './otgrtskus.component.html',
  styleUrls: ['./otgrtskus.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OtgrtskusComponent implements OnInit, OnDestroy {

  Math = Math;

  // ─── Vista activa ────────────────────────────────────────────
  vistaActiva: Vista = 'skus';

  // ─── Modo de consulta ───────────────────────────────────────
  modoConsulta: 'rango' = 'rango';
  fechaInicio = '';
  fechaFin    = '';

  // ─── Estado general ─────────────────────────────────────────
  loading  = false;
  error: string | null = null;
  tiempoSegundos = 0;

  // ═══════════════════════════════════════════════════════════
  //  VISTA 1 — SKUs GARANTÍA  (endpoint 6)
  // ═══════════════════════════════════════════════════════════

  skus:          SkuGarantiaConStock[] = [];
  skusFiltrados: SkuGarantiaConStock[] = [];
  skusPaginados: SkuGarantiaConStock[] = [];

  // KPIs
  totalSkusApi          = 0;
  totalUnidadesGarantia = 0;
  totalSkusInsuficiente = 0;
  totalStockDisponible  = 0;

  // Filtros locales (skus)
  filtroSkuArticulo = '';
  filtroSkuClase    = '';
  filtroSkuGrupo    = '';
  filtroSkuStock: 'todos' | 'insuficiente' | 'ok' = 'todos';

  // Selects (skus)
  clasesSkuUnicas: string[] = [];
  gruposSkuUnicos: string[] = [];

  // Orden (skus)
  columnaOrdenSku    = 'totalGarantia';
  ordenAscendenteSku = false;

  // Paginación (skus)
  paginaActualSku   = 1;
  itemsPorPaginaSku = 30;
  totalPaginasSku   = 0;
  paginasArraySku:  number[] = [];

  // ═══════════════════════════════════════════════════════════
  //  VISTA 2 — DETALLE COMPLETO CON STOCK  (endpoint 5)
  // ═══════════════════════════════════════════════════════════

  lineas:          VentaTallerDetalleConStock[] = [];
  lineasFiltradas: VentaTallerDetalleConStock[] = [];
  lineasPaginadas: VentaTallerDetalleConStock[] = [];

  // KPIs
  totalRegistrosApi  = 0;
  totalSinIvaApi     = 0;
  totalConIvaApi     = 0;
  totalCostoFiltrado    = 0;
  totalPrecioFiltrado   = 0;
  totalDescuentoFiltrado = 0;
  totalCantidadFiltrado = 0;
  margenGlobalPct       = 0;
  facturasUnicas        = 0;
  articulosUnicos       = 0;

  // Resúmenes
  resumenPorTipoOt:  any[] = [];
  resumenPorOficina: any[] = [];
  maxPrecioOficina   = 1;

  // Filtros locales (detalle)
  filtroOficina  = '';
  filtroTipoOt   = '';
  filtroCliente  = '';
  filtroArticulo = '';
  filtroClase    = '';
  filtroGrupo    = '';

  // Selects (detalle)
  oficinasUnicas: string[]                       = [];
  tiposOtUnicos:  { id: string; desc: string }[] = [];
  clasesUnicas:   string[]                       = [];
  gruposUnicos:   string[]                       = [];

  // Orden (detalle)
  columnaOrden    = 'fecha';
  ordenAscendente = false;

  // Paginación (detalle)
  paginaActual   = 1;
  itemsPorPagina = 30;
  totalPaginas   = 0;
  paginasArray:  number[] = [];

  // ─── Destroy ────────────────────────────────────────────────
  private destroy$ = new Subject<void>();

  constructor(
    private otsService: OtsFacturasService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ═══════════════════════════════════════════════════════════
  //  NAVEGACIÓN
  // ═══════════════════════════════════════════════════════════

  cambiarVista(v: Vista): void {
    this.vistaActiva = v;
    this.cdr.markForCheck();
  }

  // ═══════════════════════════════════════════════════════════
  //  CARGA DE DATOS
  // ═══════════════════════════════════════════════════════════

  buscar(): void {
    if (!this.fechaInicio || !this.fechaFin) {
      this.error = 'Debe ingresar fecha de inicio y fecha de fin.';
      this.cdr.markForCheck();
      return;
    }
    const filtros: FiltrosTalleres = {
      fechaInicio: this._formatFechaApi(this.fechaInicio),
      fechaFin:    this._formatFechaApi(this.fechaFin)
    };
    this._cargarSkus(filtros);
    this._cargarDetalle(filtros);
  }

  private _cargarSkus(filtros: FiltrosTalleres): void {
    this.loading = true;
    this.error   = null;
    this.cdr.markForCheck();

    this.otsService.getSkusGarantia(filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: ApiResponseSkusGarantia) => {
          this.skus                 = res.datos          ?? [];
          this.totalSkusApi         = res.totalSkus       ?? 0;
          this.totalUnidadesGarantia = res.totalUnidadesGarantia ?? 0;
          this.tiempoSegundos        = res.tiempoSegundos ?? 0;
          this.paginaActualSku       = 1;
          this.columnaOrdenSku       = 'totalGarantia';
          this.ordenAscendenteSku    = false;
          this._recalcularSelectsSkus();
          this._aplicarFiltrosSkus();
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.error   = 'Error al cargar los SKUs de garantía.';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  private _cargarDetalle(filtros: FiltrosTalleres): void {
    this.otsService.getVentasDetalleConStock(filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: ApiResponseVentasTallerDetalleConStock) => {
          this.lineas            = res.datos          ?? [];
          this.totalSinIvaApi    = res.totalSinIva    ?? 0;
          this.totalConIvaApi    = res.totalConIva    ?? 0;
          this.totalRegistrosApi = res.totalRegistros ?? 0;
          this.tiempoSegundos    = res.tiempoSegundos ?? 0;
          this.paginaActual      = 1;
          this.columnaOrden      = 'fecha';
          this.ordenAscendente   = false;
          this._recalcularSelectsDetalle();
          this._aplicarFiltrosDetalle();
          this.cdr.markForCheck();
        },
        error: () => {
          this.error = 'Error al cargar el detalle de ventas con stock.';
          this.cdr.markForCheck();
        }
      });
  }

  // ═══════════════════════════════════════════════════════════
  //  FILTROS — VISTA SKUs
  // ═══════════════════════════════════════════════════════════

  private _recalcularSelectsSkus(): void {
    this.clasesSkuUnicas = [...new Set(this.skus.map(s => s.clase).filter(Boolean))].sort() as string[];
    this.gruposSkuUnicos = [...new Set(this.skus.map(s => s.grupo).filter(Boolean))].sort() as string[];
  }

  _aplicarFiltrosSkus(): void {
    const art = this.filtroSkuArticulo.toLowerCase();
    const cla = this.filtroSkuClase.toLowerCase();
    const grp = this.filtroSkuGrupo.toLowerCase();

    this.skusFiltrados = this.skus.filter(s => {
      const pasaStock =
        this.filtroSkuStock === 'todos'       ? true :
        this.filtroSkuStock === 'insuficiente' ? s.stockActual < s.totalGarantia :
                                                 s.stockActual >= s.totalGarantia;
      return (
        (!art || s.nombreArticulo?.toLowerCase().includes(art) || s.codArticulo?.toLowerCase().includes(art)) &&
        (!cla || s.clase?.toLowerCase().includes(cla)) &&
        (!grp || s.grupo?.toLowerCase().includes(grp)) &&
        pasaStock
      );
    });

    this.totalSkusInsuficiente = this.skus.filter(s => s.stockActual < s.totalGarantia).length;
    this.totalStockDisponible  = this.skusFiltrados.reduce((a, s) => a + s.stockActual, 0);
    this.paginaActualSku = 1;
    this._recalcularPaginacionSku();
    this.cdr.markForCheck();
  }

  limpiarFiltrosSkus(): void {
    this.filtroSkuArticulo = '';
    this.filtroSkuClase    = '';
    this.filtroSkuGrupo    = '';
    this.filtroSkuStock    = 'todos';
    this._aplicarFiltrosSkus();
  }

  // ═══════════════════════════════════════════════════════════
  //  FILTROS — VISTA DETALLE
  // ═══════════════════════════════════════════════════════════

  private _recalcularSelectsDetalle(): void {
    this.oficinasUnicas = [...new Set(this.lineas.map(l => l.oficina).filter(Boolean))].sort() as string[];
    const mapTipo = new Map<string, string>();
    this.lineas.forEach(l => { if (l.tipoOtId) mapTipo.set(l.tipoOtId, l.tipoOt); });
    this.tiposOtUnicos  = [...mapTipo.entries()].map(([id, desc]) => ({ id, desc })).sort((a, b) => a.id.localeCompare(b.id));
    this.clasesUnicas   = [...new Set(this.lineas.map(l => l.clase).filter(Boolean))].sort() as string[];
    this.gruposUnicos   = [...new Set(this.lineas.map(l => l.grupo).filter(Boolean))].sort() as string[];
  }

  _aplicarFiltrosDetalle(): void {
    const ofi = this.filtroOficina.toLowerCase();
    const tot = this.filtroTipoOt.toLowerCase();
    const cli = this.filtroCliente.toLowerCase();
    const art = this.filtroArticulo.toLowerCase();
    const cla = this.filtroClase.toLowerCase();
    const grp = this.filtroGrupo.toLowerCase();

    this.lineasFiltradas = this.lineas.filter(l =>
      (!ofi || l.oficina?.toLowerCase().includes(ofi))          &&
      (!tot || l.tipoOt?.toLowerCase().includes(tot))           &&
      (!cli || l.cliente?.toLowerCase().includes(cli))          &&
      (!art || l.nombreArticulo?.toLowerCase().includes(art) || l.codArticulo?.toLowerCase().includes(art)) &&
      (!cla || l.clase?.toLowerCase().includes(cla))            &&
      (!grp || l.grupo?.toLowerCase().includes(grp))
    );

    this.paginaActual = 1;
    this._recalcularKpisDetalle();
    this._recalcularPaginacionDetalle();
    this.cdr.markForCheck();
  }

  limpiarFiltrosDetalle(): void {
    this.filtroOficina  = '';
    this.filtroTipoOt   = '';
    this.filtroCliente  = '';
    this.filtroArticulo = '';
    this.filtroClase    = '';
    this.filtroGrupo    = '';
    this._aplicarFiltrosDetalle();
  }

  private _recalcularKpisDetalle(): void {
    let costo = 0, precio = 0, desc = 0, cant = 0;
    const facturas = new Set<string>();
    const articulos = new Set<string>();
    const mapaOficina = new Map<string, { oficina: string; facturas: Set<string>; precio: number; costo: number; ots: Set<string> }>();
    const mapaTipoOt  = new Map<string, { tipoOtId: string; tipoOt: string; facturas: Set<string>; precio: number; costo: number; ots: Set<string> }>();

    for (const l of this.lineasFiltradas) {
      costo  += l.costoTotal     ?? 0;
      precio += l.precioTotal    ?? 0;
      desc   += l.valorDescuento ?? 0;
      cant   += l.cantidad       ?? 0;
      if (l.numDocumento) facturas.add(l.numDocumento);
      if (l.codArticulo)  articulos.add(l.codArticulo);

      // por oficina
      if (!mapaOficina.has(l.oficina)) {
        mapaOficina.set(l.oficina, { oficina: l.oficina, facturas: new Set(), precio: 0, costo: 0, ots: new Set() });
      }
      const go = mapaOficina.get(l.oficina)!;
      go.facturas.add(l.numDocumento);
      go.ots.add(l.ordenTrabajo);
      go.precio += l.precioTotal ?? 0;
      go.costo  += l.costoTotal  ?? 0;

      // por tipo OT
      if (!mapaTipoOt.has(l.tipoOtId)) {
        mapaTipoOt.set(l.tipoOtId, { tipoOtId: l.tipoOtId, tipoOt: l.tipoOt, facturas: new Set(), precio: 0, costo: 0, ots: new Set() });
      }
      const gt = mapaTipoOt.get(l.tipoOtId)!;
      gt.facturas.add(l.numDocumento);
      gt.ots.add(l.ordenTrabajo);
      gt.precio += l.precioTotal ?? 0;
      gt.costo  += l.costoTotal  ?? 0;
    }

    this.totalCostoFiltrado     = Math.round(costo  * 100) / 100;
    this.totalPrecioFiltrado    = Math.round(precio * 100) / 100;
    this.totalDescuentoFiltrado = Math.round(desc   * 100) / 100;
    this.totalCantidadFiltrado  = cant;
    this.margenGlobalPct        = precio > 0 ? Math.round(((precio - costo) / precio) * 10000) / 100 : 0;
    this.facturasUnicas         = facturas.size;
    this.articulosUnicos        = articulos.size;

    this.resumenPorOficina = [...mapaOficina.values()]
      .map(o => ({
        oficina:      o.oficina,
        cantFacturas: o.facturas.size,
        cantOt:       o.ots.size,
        totalPrecio:  Math.round(o.precio * 100) / 100,
        totalCosto:   Math.round(o.costo  * 100) / 100,
        margenPct:    o.precio > 0 ? Math.round(((o.precio - o.costo) / o.precio) * 10000) / 100 : 0
      }))
      .sort((a, b) => b.totalPrecio - a.totalPrecio);

    this.resumenPorTipoOt = [...mapaTipoOt.values()]
      .map(t => ({
        tipoOtId:     t.tipoOtId,
        tipoOt:       t.tipoOt,
        cantFacturas: t.facturas.size,
        cantOt:       t.ots.size,
        totalPrecio:  Math.round(t.precio * 100) / 100,
        totalCosto:   Math.round(t.costo  * 100) / 100,
        margenPct:    t.precio > 0 ? Math.round(((t.precio - t.costo) / t.precio) * 10000) / 100 : 0
      }));

    this.maxPrecioOficina = Math.max(...this.resumenPorOficina.map(o => o.totalPrecio), 1);
  }

  // ═══════════════════════════════════════════════════════════
  //  ORDENAMIENTO — SKUs
  // ═══════════════════════════════════════════════════════════

  ordenarSkuPor(columna: string): void {
    if (this.columnaOrdenSku === columna) {
      this.ordenAscendenteSku = !this.ordenAscendenteSku;
    } else {
      this.columnaOrdenSku    = columna;
      this.ordenAscendenteSku = true;
    }
    this.skusFiltrados.sort((a, b) => {
      let va: any, vb: any;
      switch (columna) {
        case 'codArticulo':    va = a.codArticulo    ?? ''; vb = b.codArticulo    ?? ''; break;
        case 'nombreArticulo': va = a.nombreArticulo ?? ''; vb = b.nombreArticulo ?? ''; break;
        case 'clase':          va = a.clase          ?? ''; vb = b.clase          ?? ''; break;
        case 'grupo':          va = a.grupo          ?? ''; vb = b.grupo          ?? ''; break;
        case 'totalGarantia':  va = a.totalGarantia  ?? 0;  vb = b.totalGarantia  ?? 0;  break;
        case 'stockActual':    va = a.stockActual     ?? 0;  vb = b.stockActual     ?? 0;  break;
        case 'diferencia':
          va = (a.stockActual ?? 0) - (a.totalGarantia ?? 0);
          vb = (b.stockActual ?? 0) - (b.totalGarantia ?? 0); break;
        default: return 0;
      }
      if (va < vb) return this.ordenAscendenteSku ? -1 : 1;
      if (va > vb) return this.ordenAscendenteSku ? 1 : -1;
      return 0;
    });
    this._actualizarPaginaSkus();
    this.cdr.markForCheck();
  }

  iconoOrdenSku(columna: string): string {
    if (this.columnaOrdenSku !== columna) return 'fas fa-sort';
    return this.ordenAscendenteSku ? 'fas fa-sort-up' : 'fas fa-sort-down';
  }

  // ═══════════════════════════════════════════════════════════
  //  ORDENAMIENTO — Detalle
  // ═══════════════════════════════════════════════════════════

  ordenarPor(columna: string): void {
    if (this.columnaOrden === columna) {
      this.ordenAscendente = !this.ordenAscendente;
    } else {
      this.columnaOrden    = columna;
      this.ordenAscendente = true;
    }
    this.lineasFiltradas.sort((a, b) => {
      let va: any, vb: any;
      switch (columna) {
        case 'fecha':          va = a.fecha    ? new Date(a.fecha).getTime()   : 0; vb = b.fecha    ? new Date(b.fecha).getTime()   : 0; break;
        case 'fechaOt':        va = a.fechaOt  ? new Date(a.fechaOt).getTime() : 0; vb = b.fechaOt  ? new Date(b.fechaOt).getTime() : 0; break;
        case 'oficina':        va = a.oficina        ?? ''; vb = b.oficina        ?? ''; break;
        case 'tipoOt':         va = a.tipoOt         ?? ''; vb = b.tipoOt         ?? ''; break;
        case 'cliente':        va = a.cliente        ?? ''; vb = b.cliente        ?? ''; break;
        case 'nombreArticulo': va = a.nombreArticulo ?? ''; vb = b.nombreArticulo ?? ''; break;
        case 'cantidad':       va = a.cantidad       ?? 0;  vb = b.cantidad       ?? 0;  break;
        case 'costoTotal':     va = a.costoTotal     ?? 0;  vb = b.costoTotal     ?? 0;  break;
        case 'precioTotal':    va = a.precioTotal    ?? 0;  vb = b.precioTotal    ?? 0;  break;
        case 'stockActual':    va = a.stockActual    ?? 0;  vb = b.stockActual    ?? 0;  break;
        case 'margen':
          va = a.precioTotal > 0 ? (a.precioTotal - a.costoTotal) / a.precioTotal : 0;
          vb = b.precioTotal > 0 ? (b.precioTotal - b.costoTotal) / b.precioTotal : 0; break;
        default: return 0;
      }
      if (va < vb) return this.ordenAscendente ? -1 : 1;
      if (va > vb) return this.ordenAscendente ? 1 : -1;
      return 0;
    });
    this._actualizarPaginaDetalle();
    this.cdr.markForCheck();
  }

  iconoOrden(columna: string): string {
    if (this.columnaOrden !== columna) return 'fas fa-sort';
    return this.ordenAscendente ? 'fas fa-sort-up' : 'fas fa-sort-down';
  }

  // ═══════════════════════════════════════════════════════════
  //  PAGINACIÓN — SKUs
  // ═══════════════════════════════════════════════════════════

  private _recalcularPaginacionSku(): void {
    this.totalPaginasSku = Math.ceil(this.skusFiltrados.length / this.itemsPorPaginaSku);
    this._actualizarPaginaSkus();
  }

  private _actualizarPaginaSkus(): void {
    const ini = (this.paginaActualSku - 1) * this.itemsPorPaginaSku;
    this.skusPaginados = this.skusFiltrados.slice(ini, ini + this.itemsPorPaginaSku);
    this.paginasArraySku = this._calcularPaginasArray(this.paginaActualSku, this.totalPaginasSku);
  }

  cambiarPaginaSku(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginasSku) {
      this.paginaActualSku = pagina;
      this._actualizarPaginaSkus();
      this.cdr.markForCheck();
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  PAGINACIÓN — Detalle
  // ═══════════════════════════════════════════════════════════

  private _recalcularPaginacionDetalle(): void {
    this.totalPaginas = Math.ceil(this.lineasFiltradas.length / this.itemsPorPagina);
    this._actualizarPaginaDetalle();
  }

  private _actualizarPaginaDetalle(): void {
    const ini = (this.paginaActual - 1) * this.itemsPorPagina;
    this.lineasPaginadas = this.lineasFiltradas.slice(ini, ini + this.itemsPorPagina);
    this.paginasArray    = this._calcularPaginasArray(this.paginaActual, this.totalPaginas);
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
      this._actualizarPaginaDetalle();
      this.cdr.markForCheck();
    }
  }

  private _calcularPaginasArray(actual: number, total: number): number[] {
    const max = 5;
    let ini = Math.max(1, actual - Math.floor(max / 2));
    let fin = Math.min(total, ini + max - 1);
    if (fin - ini < max - 1) ini = Math.max(1, fin - max + 1);
    return Array.from({ length: fin - ini + 1 }, (_, i) => ini + i);
  }

  // ═══════════════════════════════════════════════════════════
  //  HELPERS DE PRESENTACIÓN
  // ═══════════════════════════════════════════════════════════

  trackBySku(_i: number, s: SkuGarantiaConStock): string {
    return s.codArticulo ?? _i.toString();
  }

  trackByLinea(_i: number, l: VentaTallerDetalleConStock): string {
    return (l.numDocumento ?? '') + '_' + (l.codArticulo ?? '') + '_' + _i;
  }

  trackByNum(_i: number, n: number): number { return n; }

  diferencia(s: SkuGarantiaConStock): number {
    return (s.stockActual ?? 0) - (s.totalGarantia ?? 0);
  }

  claseDiferencia(s: SkuGarantiaConStock): string {
    const d = this.diferencia(s);
    if (d < 0)  return 'text-danger fw-bold';
    if (d === 0) return 'text-warning fw-semibold';
    return 'text-success';
  }

  claseStockActual(s: SkuGarantiaConStock): string {
    if (s.stockActual <= 0) return 'text-danger fw-bold';
    if (s.stockActual < s.totalGarantia) return 'text-warning fw-semibold';
    return 'text-success';
  }

  claseMargen(pct: number): string {
    if (pct >= 30) return 'text-success fw-bold';
    if (pct >= 15) return 'text-warning fw-semibold';
    return 'text-danger fw-semibold';
  }

  badgeTipoOt(tipoOtId: string): string {
    switch (tipoOtId) {
      case 'GRT': return 'bg-success';
      case 'AUT': return 'bg-primary';
      case 'PDI': return 'bg-warning text-dark';
      default:    return 'bg-secondary';
    }
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

  private _formatFechaApi(fecha: string): string {
    if (!fecha) return '';
    const [y, m, d] = fecha.split('-');
    return `${d}/${m}/${y}`;
  }

  // ═══════════════════════════════════════════════════════════
  //  EXPORTAR EXCEL
  // ═══════════════════════════════════════════════════════════

  exportarExcel(): void {
    try {
      // Hoja 1 — SKUs Garantía
      const wsSkus = XLSX.utils.json_to_sheet(
        this.skusFiltrados.map(s => ({
          'Clase':          s.clase,
          'Grupo':          s.grupo,
          'Cód. Artículo':  s.codArticulo,
          'Artículo':       s.nombreArticulo,
          'Total Garantía': s.totalGarantia,
          'Stock Actual':   s.stockActual,
          'Diferencia':     this.diferencia(s),
          'Estado':         this.diferencia(s) < 0 ? 'INSUFICIENTE' : 'OK'
        }))
      );
      wsSkus['!cols'] = Array(8).fill({ wch: 20 });

      // Hoja 2 — Detalle con stock
      const wsDetalle = XLSX.utils.json_to_sheet(
        this.lineasFiltradas.map(l => ({
          'Agencia':         l.oficina,
          'Tipo OT':         l.tipoOt,
          'Orden Trabajo':   l.ordenTrabajo,
          'Fecha OT':        this.formatearFecha(l.fechaOt),
          'Cliente':         l.cliente,
          'ID Cliente':      l.idCliente,
          'Nº Documento':    l.numDocumento,
          'Fecha Factura':   this.formatearFecha(l.fecha),
          'Clase':           l.clase,
          'Grupo':           l.grupo,
          'Cód. Artículo':   l.codArticulo,
          'Artículo':        l.nombreArticulo,
          'Cantidad':        l.cantidad,
          'Costo Unitario':  l.costoUnitario,
          'Costo Total':     l.costoTotal,
          'Precio Unitario': l.precioUnitario,
          'Precio Total':    l.precioTotal,
          'Desc. %':         l.porcDescuento,
          'Desc. Valor':     l.valorDescuento,
          'Stock Actual':    l.stockActual,
          'Usuario OT':      l.usuarioCrearOt,
          'Usuario Factura': l.usuarioCrearFactura
        }))
      );
      wsDetalle['!cols'] = Array(22).fill({ wch: 16 });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsSkus,   'SKUs Garantía');
      XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle con Stock');

      const fecha = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `GRT_SKUs_Stock_${fecha}.xlsx`);
    } catch (err) {
      console.error('Error exportando Excel:', err);
      alert('Error al exportar. Intente nuevamente.');
    }
  }

  imprimirReporte(): void {
    window.print();
  }
}