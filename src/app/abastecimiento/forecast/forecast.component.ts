import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FormControl } from '@angular/forms';
import { InventarioForecast, OrdenCompraForecast, AbastecimientoService, ApiResponseArticuloForecast, VentaAnioForecast } from 'src/app/services/abastecimiento.service';


// ─── Constantes del método Wintel ─────────────────────────────
const MESES_NOMBRE = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
const COEF_ESTACIONALES = [
  0.08474870, 0.09910519, 0.08655618, 0.07275036,
  0.06548286, 0.08172866, 0.08405346, 0.07076569,
  0.07481559, 0.09595398, 0.08525707, 0.09878226,
];

// ─── Interfaces locales ────────────────────────────────────────
export interface FilaAnioForecast {
  anio:  number;
  meses: { mes: number; cantVendida: number }[];
  total: number;
}

export interface ResultadoWintel {
  forecastAnual: number;
  crecimientoPct: number;
  forecastMensual: number[];  // [0..11]
}

export interface AjusteItem {
  mes: number;           // 1..12
  nombreMes: string;
  valorAjuste: number;   // editable
}

export interface TablaResumen {
  vtaTotalReal: number;
  vtaTotalPronos: number;
  pctCumplimiento: number;
  mape: number;
  mesActual: number;
  errorPronostico: number;
}

export type ClasificacionAAA = 'AAA' | 'AA' | 'A' | '';
export type VistaActiva = 'lista' | 'certeza';

@Component({
  selector: 'app-forecast',
  templateUrl: './forecast.component.html',
  styleUrls: ['./forecast.component.css']
})
export class ForecastComponent implements OnInit, OnDestroy {

  // ── Estado de vista ──────────────────────────────────────────
  vistaActiva: VistaActiva = 'lista';
  cargandoLista   = false;
  cargandoDetalle = false;
  errorMensaje    = '';

  // ── Lista (BASE DATO) ────────────────────────────────────────
  listaCompleta:   InventarioForecast[] = [];
  listaFiltrada:   InventarioForecast[] = [];
  paginaActual     = 1;
  itemsPorPagina   = 50;
  busqueda         = new FormControl('');
  filtroClase      = '';
  clasesDisponibles: string[] = [];

  // ── Artículo seleccionado (CERTEZA) ───────────────────────────
  articuloActual:  InventarioForecast | null = null;
  tabActiva: 'certeza' | 'wintel' | 'ordenes' | 'ajuste' = 'certeza';

  // Datos del artículo
  ventasPorAnio:     FilaAnioForecast[]   = [];
  ordenesCompra:     OrdenCompraForecast[] = [];
  wintelResultado:   ResultadoWintel | null = null;
  ajusteItems:       AjusteItem[]         = [];
  resumen:           TablaResumen | null  = null;
  clasificacion:     ClasificacionAAA     = '';

  // Año seleccionado para CERTEZA (historial mensual)
  anioSeleccionado = new Date().getFullYear();
  anioActual       = new Date().getFullYear();
  mesActual        = new Date().getMonth(); // 0-based

  private destroy$ = new Subject<void>();

  // ─────────────────────────────────────────────────────────────
  constructor(
    private svc: AbastecimientoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarLista();

    // Búsqueda con debounce
    this.busqueda.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.paginaActual = 1;
      this.aplicarFiltros();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ═══════════════════════════════════════════════════════════
  //  LISTA (BASE DATO)
  // ═══════════════════════════════════════════════════════════

  cargarLista(): void {
    this.cargandoLista = true;
    this.errorMensaje  = '';

    this.svc.getForecastInventario().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: res => {
        this.listaCompleta = res.datos;
        // Extraer clases únicas para filtro
        const claseSet = new Set(res.datos.map(d => d.claseId).filter(Boolean));
        this.clasesDisponibles = Array.from(claseSet).sort();
        this.aplicarFiltros();
        this.cargandoLista = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.errorMensaje  = 'Error al cargar el inventario: ' + (err.message ?? '');
        this.cargandoLista = false;
        this.cdr.markForCheck();
      }
    });
  }

  aplicarFiltros(): void {
    const q = (this.busqueda.value ?? '').toLowerCase().trim();
    this.listaFiltrada = this.listaCompleta.filter(item => {
      const coincideBusqueda =
        !q ||
        item.codEmpresa.toLowerCase().includes(q) ||
        item.descripcion.toLowerCase().includes(q);
      const coincideClase = !this.filtroClase || item.claseId === this.filtroClase;
      return coincideBusqueda && coincideClase;
    });
    this.paginaActual = 1;
  }

  get paginaItems(): InventarioForecast[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.listaFiltrada.slice(inicio, inicio + this.itemsPorPagina);
  }

  get totalPaginas(): number {
    return Math.ceil(this.listaFiltrada.length / this.itemsPorPagina);
  }

  cambiarPagina(p: number): void {
    if (p >= 1 && p <= this.totalPaginas) this.paginaActual = p;
  }

  get paginasVisibles(): number[] {
    const total = this.totalPaginas;
    const actual = this.paginaActual;
    const rango: number[] = [];
    const ini = Math.max(1, actual - 2);
    const fin = Math.min(total, actual + 2);
    for (let i = ini; i <= fin; i++) rango.push(i);
    return rango;
  }

  cambiarFiltroClase(c: string): void {
    this.filtroClase  = c;
    this.paginaActual = 1;
    this.aplicarFiltros();
  }

  // ═══════════════════════════════════════════════════════════
  //  ABRIR FICHA CERTEZA
  // ═══════════════════════════════════════════════════════════

  abrirArticulo(item: InventarioForecast): void {
    this.vistaActiva    = 'certeza';
    this.articuloActual = item;
    this.tabActiva      = 'certeza';
    this.cargandoDetalle = true;
    this.wintelResultado = null;
    this.resumen         = null;
    this.ventasPorAnio   = [];
    this.ordenesCompra   = [];
    this.errorMensaje    = '';

    this.svc.getForecastArticulo(item.codEmpresa).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: res => {
        this.procesarRespuestaArticulo(res);
        this.cargandoDetalle = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.errorMensaje    = 'Error al cargar ficha: ' + (err.message ?? '');
        this.cargandoDetalle = false;
        this.cdr.markForCheck();
      }
    });
  }

  private procesarRespuestaArticulo(res: ApiResponseArticuloForecast): void {
    // 1. Inventario actualizado (puede traer datos más frescos)
    if (res.inventario) this.articuloActual = res.inventario;

    // 2. Ventas por año → FilaAnioForecast
    this.ventasPorAnio = res.ventasPorAnio.map(v => ({
      anio:  v.anio,
      meses: v.meses,  // mantener como {mes, cantVendida}[]
      total: v.totalAnio
    }));

    // 3. Clasificación ABC basada en ventas
    const total2025 = this.ventasPorAnio.find(v => v.anio === 2025)?.total ?? 0;
    this.clasificacion = this.calcularClasificacion(total2025);

    // 4. Órdenes de compra
    this.ordenesCompra = res.ordenesPendientes;

    // 5. Motor Wintel
    this.wintelResultado = this.calcularWintel(res.ventasPorAnio);

    // 6. Inicializar ajustes con el pronóstico Wintel
    this.inicializarAjustes();

    // 7. Resumen (CERTEZA: VNT REAL vs PRONOSTICO)
    this.calcularResumen(res);

    // 8. Poner el año más reciente como seleccionado
    if (this.ventasPorAnio.length > 0) {
      this.anioSeleccionado = Math.max(...this.ventasPorAnio.map(v => v.anio));
    }
  }

  volverLista(): void {
    this.vistaActiva    = 'lista';
    this.articuloActual = null;
  }

  // ═══════════════════════════════════════════════════════════
  //  MOTOR WINTEL  (Holt-Winters simplificado)
  // ═══════════════════════════════════════════════════════════

  /**
   * Calcula el forecast anual y mensual usando el método Wintel:
   *  1. Toma los últimos 24 meses de ventas (2 años completos)
   *  2. Calcula promedio mensual con suavizado exponencial simple (α = 0.3)
   *  3. Aplica tendencia de crecimiento entre el último año y el anterior
   *  4. Distribuye el forecast anual por coeficientes estacionales fijos
   */
  calcularWintel(ventasPorAnio: VentaAnioForecast[]): ResultadoWintel | null {
    if (!ventasPorAnio.length) return null;

    const sorted = [...ventasPorAnio].sort((a, b) => b.anio - a.anio);
    const anioBase     = sorted[0];
    const anioAnterior = sorted[1];

    // meses es {mes, cantVendida}[] — extraemos solo las cantidades
    const cantBase     = anioBase.meses.map(m => m.cantVendida);
    const totalBase    = cantBase.reduce((s, v) => s + v, 0);

    const totalAnterior = anioAnterior
      ? anioAnterior.meses.reduce((s, m) => s + m.cantVendida, 0)
      : totalBase;

    let crecimientoPct = 0;
    if (totalAnterior > 0 && totalBase > totalAnterior) {
      crecimientoPct = (totalBase - totalAnterior) / totalAnterior;
    }

    // Suavizado exponencial simple (α = 0.3) sobre los 12 meses del año base
    const alpha = 0.3;
    let suavizado: number = cantBase[0] ?? 0;
    for (let i = 1; i < 12; i++) {
      suavizado = alpha * (cantBase[i] ?? 0) + (1 - alpha) * suavizado;
    }

    // Forecast anual = suma del año base × (1 + crecimiento)
    const forecastAnual = Math.round(totalBase * (1 + crecimientoPct));

    // Distribuir por coeficientes estacionales
    const forecastMensual = COEF_ESTACIONALES.map(c =>
      Math.round(forecastAnual * c)
    );

    return { forecastAnual, crecimientoPct, forecastMensual };
  }

  // ═══════════════════════════════════════════════════════════
  //  AJUSTES MANUALES  (hoja AJUSTE)
  // ═══════════════════════════════════════════════════════════

  inicializarAjustes(): void {
    const forecast = this.wintelResultado?.forecastMensual ?? Array(12).fill(0);
    this.ajusteItems = MESES_NOMBRE.map((nombre, i) => ({
      mes:        i + 1,
      nombreMes:  nombre,
      valorAjuste: forecast[i] ?? 0
    }));
  }

  actualizarAjuste(mes: number, valor: number): void {
    const item = this.ajusteItems.find(a => a.mes === mes);
    if (item) item.valorAjuste = +valor || 0;
  }

  get totalAjuste(): number {
    return this.ajusteItems.reduce((s, a) => s + a.valorAjuste, 0);
  }

  // ═══════════════════════════════════════════════════════════
  //  RESUMEN  (métricas CERTEZA)
  // ═══════════════════════════════════════════════════════════

  private calcularResumen(res: ApiResponseArticuloForecast): void {
    // Ventas reales del año actual (hasta el mes corriente)
    const anioActualData = res.ventasPorAnio.find(v => v.anio === this.anioActual);
    const vtaTotalReal = anioActualData
      ? anioActualData.meses
          .slice(0, this.mesActual)
          .reduce((s, m) => s + m.cantVendida, 0)
      : 0;

    // Pronóstico acumulado hasta el mes actual
    const forecastMensual = this.wintelResultado?.forecastMensual ?? [];
    const vtaTotalPronos = forecastMensual
      .slice(0, this.mesActual)
      .reduce((s, v) => s + (v ?? 0), 0);

    const pctCumplimiento = vtaTotalPronos > 0
      ? vtaTotalReal / vtaTotalPronos
      : 0;

    // MAPE: Mean Absolute Percentage Error sobre los meses con datos
    const errores: number[] = [];
    for (let i = 0; i < this.mesActual; i++) {
      const real: number = anioActualData?.meses[i]?.cantVendida ?? 0;
      const pred: number = forecastMensual[i] ?? 0;
      if (pred > 0) errores.push(Math.abs(real - pred) / pred);
    }
    const mape = errores.length
      ? errores.reduce((s, e) => s + e, 0) / errores.length
      : 0;

    const lastMes:  number = this.mesActual - 1;
    const realLast: number = anioActualData?.meses[lastMes]?.cantVendida ?? 0;
    const predLast: number = forecastMensual[lastMes] ?? 0;
    const errorPronostico = predLast > 0
      ? Math.abs(realLast - predLast) / predLast
      : 0;

    this.resumen = {
      vtaTotalReal,
      vtaTotalPronos,
      pctCumplimiento,
      mape,
      mesActual: this.mesActual,
      errorPronostico
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  HELPERS / UTILIDADES
  // ═══════════════════════════════════════════════════════════

  private calcularClasificacion(totalAnual: number): ClasificacionAAA {
    if (totalAnual >= 1000) return 'AAA';
    if (totalAnual >= 200)  return 'AA';
    if (totalAnual > 0)     return 'A';
    return '';
  }

  getMesNombre(i: number): string {
    return MESES_NOMBRE[i] ?? '';
  }

  getVentaAnio(anio: number): FilaAnioForecast | undefined {
    return this.ventasPorAnio.find(v => v.anio === anio);
  }

  getVentaMes(anio: number, mes: number): number {
    return this.getVentaAnio(anio)?.meses[mes]?.cantVendida ?? 0;
  }

  getAniosDisponibles(): number[] {
    return this.ventasPorAnio.map(v => v.anio).sort((a, b) => a - b);
  }

  getVentasRealesActuales(): number[] {
    const fila = this.getVentaAnio(this.anioActual);
    return fila
      ? fila.meses.map((m, i) => (i < this.mesActual ? (m.cantVendida ?? 0) : 0))
      : Array(12).fill(0);
  }

  getDiferencias(): number[] {
    const reales   = this.getVentasRealesActuales();
    const forecast = this.wintelResultado?.forecastMensual ?? Array(12).fill(0);
    return reales.map((r, i) => r - (forecast[i] ?? 0));
  }

  getErroresPct(): number[] {
    const reales   = this.getVentasRealesActuales();
    const forecast = this.wintelResultado?.forecastMensual ?? Array(12).fill(0);
    return reales.map((r: number, i: number) => {
      const f: number = forecast[i] ?? 0;
      return i < this.mesActual && f > 0 ? Math.abs(r - f) / f : 0;
    });
  }

  /** Formato porcentual */
  pct(v: number): string {
    return (v * 100).toFixed(1) + '%';
  }

  /** Formato número con separador de miles */
  fmt(v: number | null | undefined): string {
    if (v == null) return '—';
    return v.toLocaleString('es-EC', { maximumFractionDigits: 0 });
  }

  fmtFob(v: number): string {
    return '$' + v.toFixed(2);
  }

  fmtFecha(f: string | null): string {
    if (!f) return '—';
    return new Date(f).toLocaleDateString('es-EC');
  }

  colorClasificacion(c: ClasificacionAAA): string {
    if (c === 'AAA') return 'badge-aaa';
    if (c === 'AA')  return 'badge-aa';
    if (c === 'A')   return 'badge-a';
    return '';
  }

  colorEstadoStock(estado: string): string {
    switch (estado) {
      case 'CRÍTICO':    return 'estado-critico';
      case 'REORDEN':    return 'estado-reorden';
      case 'SOBRESTOCK': return 'estado-sobrestock';
      default:           return 'estado-normal';
    }
  }

  trackById(_: number, item: InventarioForecast): string {
    return item.codEmpresa;
  }

  // ── Helpers para reemplazar pipes en template ───────────────
  contarConStock(): number {
    return this.listaCompleta.filter(i => i.stockDisponible > 0).length;
  }

  minVal(a: number, b: number): number {
    return Math.min(a, b);
  }

  /** Devuelve forecastMensual[i] de forma segura (sin optional chain en template) */
  getForecastMes(i: number): number {
    return this.wintelResultado?.forecastMensual?.[i] ?? 0;
  }

  /** Texto de crecimiento con flecha */
  textoCrecimiento(): string {
    const c = this.wintelResultado?.crecimientoPct ?? 0;
    const arrow = c >= 0 ? '▲' : '▼';
    return `${arrow} ${Math.abs(c * 100).toFixed(1)}%`;
  }

  claseCrecimiento(): string {
    const c = this.wintelResultado?.crecimientoPct ?? 0;
    return c >= 0 ? 'crecimiento-pos' : 'crecimiento-neg';
  }

  /** Suma forecast anual de ajustes vs Wintel */
  get variacAjuste(): number {
    const fw = this.wintelResultado?.forecastAnual ?? 0;
    const fa = this.totalAjuste;
    return fw > 0 ? (fa - fw) / fw : 0;
  }
}