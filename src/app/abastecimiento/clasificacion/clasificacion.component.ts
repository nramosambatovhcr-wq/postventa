import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { InventarioSncaMultLubr, AbastecimientoService } from 'src/app/services/abastecimiento.service';
import * as XLSX from 'xlsx';


// ═══════════════════════════════════════════════════════════════
//  INTERFACES
// ═══════════════════════════════════════════════════════════════

export type ClasificacionFinal = 'AAA' | 'AA' | 'A' | 'B' | 'C' | 'D';
export type ClasificacionDimension = 'A' | 'B' | 'C' | 'D';

export interface ArticuloClasificado extends InventarioSncaMultLubr {
  // Clasificación por dimensión
  clasificacionPorPrecio: ClasificacionDimension;
  pesoPorPrecio: number;
  clasificacionPorMU: ClasificacionDimension;
  pesoPorMU: number;
  clasificacionPorQty: ClasificacionDimension;
  pesoPorQty: number;
  // Resultado
  resultadoFinal: number;
  clasificacionFinal: ClasificacionFinal;
  // % acumulados calculados
  pctAcumPrecio: number;
  pctAcumMU: number;
  pctAcumQty: number;
  // Margen utilidad
  margenUtilidad: number;
}

export interface ResumenClasificacion {
  clasificacion: ClasificacionFinal;
  cantidad: number;
  totalPrecio: number;
  totalMU: number;
  totalQty: number;
  pctPrecio: number;
  pctMU: number;
  pctQty: number;
}

export interface FiltrosClasificacion {
  busqueda: string;
  clasificacion: ClasificacionFinal | '';
  clase: string;
  grupo: string;
}

// ═══════════════════════════════════════════════════════════════
//  CONSTANTES DE CLASIFICACIÓN ABC
//  Pesos: PRECIO = 0.4 | MU = 0.4 | QTY = 0.2
//  Umbrales acumulado: A<=70% | B<=85% | C<=95.5% | D>95.5%
// ═══════════════════════════════════════════════════════════════
const PESO_PRECIO = 0.4;
const PESO_MU     = 0.4;
const PESO_QTY    = 0.2;

const PESO_DIM: Record<ClasificacionDimension, number> = { A: 1.0, B: 0.8, C: 0.4, D: 0.2 };

// Umbral acumulado → clase (se aplica igual a las 3 dimensiones)
function clasificarDimension(pctAcum: number): ClasificacionDimension {
  if (pctAcum <= 0.70) return 'A';
  if (pctAcum <= 0.85) return 'B';
  if (pctAcum <= 0.95) return 'C';
  return 'D';
}

// Replica la fórmula exacta del Excel con inequalidades estrictas:
//   IF(RF=1,"AAA", IF(RF>0.9,"AA", IF(RF>0.8,"A", IF(RF>0.5,"B", IF(RF>0.3,"C","D")))))
// IMPORTANTE: el valor RF=0.80 exacto queda en "D" (no en "B") igual que el Excel.
// Los valores posibles son múltiplos de 0.04 (0.20 … 1.00), por lo que los rangos
// con > ó >= producen el mismo resultado excepto en 0.80 exacto.
function clasificarResultadoFinal(resultado: number): ClasificacionFinal {
  if (resultado >= 1.00) return 'AAA'; // 1.00
  if (resultado >  0.90) return 'AA';  // 0.92, 0.96
  if (resultado >  0.80) return 'A';   // 0.84, 0.88
  if (resultado >  0.50) return 'B';   // 0.52 → 0.76  (0.80 exacto NO entra aquí → D)
  if (resultado >  0.30) return 'C';   // 0.32 → 0.48
  return 'D';                           // 0.20, 0.24, 0.28 y 0.80 exacto
}

@Component({
  selector: 'app-clasificacion',
  templateUrl: './clasificacion.component.html',
  styleUrls: ['./clasificacion.component.css']
})
export class ClasificacionComponent implements OnInit, OnDestroy {

  // ── Estado ────────────────────────────────────────────────────
  cargando        = false;
  error           = '';
  descargandoExcel = false;
  articulos       : ArticuloClasificado[] = [];
  articulosFiltrados: ArticuloClasificado[] = [];
  totalRegistros  = 0;
  tiempoCarga     = 0;

  // ── Paginación ────────────────────────────────────────────────
  paginaActual    = 1;
  itemsPorPagina  = 50;
  get totalPaginas(): number { return Math.ceil(this.articulosFiltrados.length / this.itemsPorPagina); }
  get articulosPagina(): ArticuloClasificado[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.articulosFiltrados.slice(inicio, inicio + this.itemsPorPagina);
  }

  // ── Filtros ───────────────────────────────────────────────────
  filtros: FiltrosClasificacion = { busqueda: '', clasificacion: '', clase: '', grupo: '' };
  clasesDisponibles : string[] = [];
  gruposDisponibles : string[] = [];

  // ── Ordenamiento ──────────────────────────────────────────────
  columnaOrden : keyof ArticuloClasificado = 'resultadoFinal';
  ordenAsc     = false;

  // ── Visibilidad columnas opcionales ───────────────────────────
  mostrarColumnas = { precio: true, mu: true, qty: true, inventario: true };

  // ── Artículo seleccionado (detalle) ───────────────────────────
  articuloSeleccionado: ArticuloClasificado | null = null;

  // ── Totales globales ──────────────────────────────────────────
  get totalPrecioGlobal()  { return this.articulos.reduce((s, a) => s + a.precioTotalVendido, 0); }
  get totalMUGlobal()      { return this.articulos.reduce((s, a) => s + a.margenUtilidad, 0); }
  get totalQtyGlobal()     { return this.articulos.reduce((s, a) => s + a.undVendidasTotal, 0); }
  get totalInvGlobal()     { return this.articulos.reduce((s, a) => s + a.valorInventarioTotal, 0); }

  readonly CLASIFICACIONES: ClasificacionFinal[] = ['AAA', 'AA', 'A', 'B', 'C', 'D'];

  private destroy$ = new Subject<void>();

  // ── Totales FILTRADOS (solo cuando hay filtro activo) ─────────
get hayFiltroActivo(): boolean {
  return !!(this.filtros.clasificacion || this.filtros.clase || this.filtros.grupo);
}

get etiquetaFiltroActivo(): string {
  const partes: string[] = [];
  if (this.filtros.clasificacion) partes.push(`Clase ABC: ${this.filtros.clasificacion}`);
  if (this.filtros.clase)         partes.push(`Clase: ${this.filtros.clase}`);
  if (this.filtros.grupo)         partes.push(`Grupo: ${this.filtros.grupo}`);
  return partes.join(' · ');
}

get totalPrecioFiltrado()  { return this.articulosFiltrados.reduce((s, a) => s + a.precioTotalVendido, 0); }
get totalMUFiltrado()      { return this.articulosFiltrados.reduce((s, a) => s + a.margenUtilidad, 0); }
get totalQtyFiltrado()     { return this.articulosFiltrados.reduce((s, a) => s + a.undVendidasTotal, 0); }
get totalInvFiltrado()     { return this.articulosFiltrados.reduce((s, a) => s + a.valorInventarioTotal, 0); }

get pctPrecioFiltrado()  { return this.totalPrecioGlobal  ? this.totalPrecioFiltrado  / this.totalPrecioGlobal  : 0; }
get pctMUFiltrado()      { return this.totalMUGlobal      ? this.totalMUFiltrado      / this.totalMUGlobal      : 0; }
get pctQtyFiltrado()     { return this.totalQtyGlobal     ? this.totalQtyFiltrado     / this.totalQtyGlobal     : 0; }
get pctInvFiltrado()     { return this.totalInvGlobal     ? this.totalInvFiltrado     / this.totalInvGlobal     : 0; }

  constructor(private abastecimientoSvc: AbastecimientoService) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─────────────────────────────────────────────────────────────
  //  CARGA Y CLASIFICACIÓN
  // ─────────────────────────────────────────────────────────────
  cargarDatos(): void {
    this.cargando = true;
    this.error    = '';
    const t0      = Date.now();

    this.abastecimientoSvc.getInventarioSncaMultLubr()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.tiempoCarga = (Date.now() - t0) / 1000;
          if (!res.success || !res.datos?.length) {
            this.error   = 'No se obtuvieron datos del servidor.';
            this.cargando = false;
            return;
          }
          this.articulos = this.calcularClasificacionABC(res.datos);
          this.totalRegistros = this.articulos.length;
          this.poblarFiltros();
          this.aplicarFiltros();
          this.cargando = false;
        },
        error: err => {
          this.error    = 'Error al conectar con el servidor. Intente nuevamente.';
          this.cargando = false;
          console.error('ClasificacionComponent error:', err);
        }
      });
  }
min(a: number, b: number): number {
  return Math.min(a, b);
}
  // ─────────────────────────────────────────────────────────────
  //  CONSOLIDACIÓN DE DUPLICADOS
  //  El API puede devolver el mismo codigoArticulo en varias filas
  //  (p.ej. diferentes bodegas). Las sumamos antes de clasificar
  //  para que el acumulado ABC sea coherente con el Excel.
  // ─────────────────────────────────────────────────────────────
  private consolidarDuplicados(datos: InventarioSncaMultLubr[]): InventarioSncaMultLubr[] {
    const mapa = new Map<string, InventarioSncaMultLubr>();

    for (const d of datos) {
      const existente = mapa.get(d.codigoArticulo);
      if (existente) {
        // Acumular los campos numéricos vendidos / inventario
        existente.precioTotalVendido   = (existente.precioTotalVendido   || 0) + (d.precioTotalVendido   || 0);
        existente.costoTotalVendido    = (existente.costoTotalVendido    || 0) + (d.costoTotalVendido    || 0);
        existente.undVendidasTotal     = (existente.undVendidasTotal     || 0) + (d.undVendidasTotal     || 0);
        existente.valorInventarioTotal = (existente.valorInventarioTotal || 0) + (d.valorInventarioTotal || 0);
        existente.stockDisponibleTotal = (existente.stockDisponibleTotal || 0) + (d.stockDisponibleTotal || 0);
        // vendidoUltimoMes también es acumulable si existe
        if (d.vendidoUltimoMes != null) {
          existente.vendidoUltimoMes = (existente.vendidoUltimoMes || 0) + d.vendidoUltimoMes;
        }
        // Costo promedio: recalcular como promedio ponderado por stock
        if ((existente.stockDisponibleTotal || 0) > 0) {
          existente.costoPromedio = existente.valorInventarioTotal / existente.stockDisponibleTotal;
        }
      } else {
        mapa.set(d.codigoArticulo, { ...d });
      }
    }

    return [...mapa.values()];
  }

  // ─────────────────────────────────────────────────────────────
  //  ALGORITMO ABC
  //  1. Ordenar por PRECIO DESC → acumulado → clasificar → peso
  //  2. Ordenar por MU DESC     → acumulado → clasificar → peso
  //  3. Ordenar por QTY DESC    → acumulado → clasificar → peso
  //  4. Resultado = pesoPrecio*0.4 + pesoMU*0.4 + pesoQty*0.2
  //  5. Clasificación final por resultado
  // ─────────────────────────────────────────────────────────────
  //  ALGORITMO ABC — clasificación DENTRO DE CADA CLASE
  //  Cada clase tiene su propio ranking independiente, por lo que
  //  un artículo "A" significa que es top dentro de su clase,
  //  no necesariamente en el catálogo global.
  // ─────────────────────────────────────────────────────────────
  private calcularClasificacionABC(datos: InventarioSncaMultLubr[]): ArticuloClasificado[] {
    // ── Paso 0: consolidar registros duplicados por codigoArticulo ──
    const datosConsolidados = this.consolidarDuplicados(datos);

    // ── Paso 1: inicializar todos los artículos enriquecidos ──
    const mapa = new Map<string, ArticuloClasificado>();
    datosConsolidados.forEach(d => {
      mapa.set(d.codigoArticulo, {
        ...d,
        margenUtilidad: (d.precioTotalVendido || 0) - (d.costoTotalVendido || 0),
        clasificacionPorPrecio: 'D',
        pesoPorPrecio: PESO_DIM['D'],
        clasificacionPorMU: 'D',
        pesoPorMU: PESO_DIM['D'],
        clasificacionPorQty: 'D',
        pesoPorQty: PESO_DIM['D'],
        resultadoFinal: 0,
        clasificacionFinal: 'D',
        pctAcumPrecio: 0,
        pctAcumMU: 0,
        pctAcumQty: 0
      });
    });

    // ── Paso 2: agrupar artículos por clase ──
    const porClase = new Map<string, ArticuloClasificado[]>();
    mapa.forEach(art => {
      const clave = art.clase?.trim() || '__SIN_CLASE__';
      if (!porClase.has(clave)) porClase.set(clave, []);
      porClase.get(clave)!.push(art);
    });

    // ── Paso 3: ejecutar el ABC independientemente en cada clase ──
    porClase.forEach(articulos => {
      const totalPrecio = articulos.reduce((s, d) => s + (d.precioTotalVendido || 0), 0);
      const totalMU     = articulos.reduce((s, d) => s + Math.max(0, d.margenUtilidad || 0), 0);
      const totalQty    = articulos.reduce((s, d) => s + (d.undVendidasTotal    || 0), 0);

      // — Dimensión PRECIO —
      if (totalPrecio > 0) {
        const ordenPrecio = [...articulos].sort((a, b) => b.precioTotalVendido - a.precioTotalVendido);
        let acum = 0;
        for (const art of ordenPrecio) {
          acum += (art.precioTotalVendido || 0) / totalPrecio;
          const cls = clasificarDimension(acum);
          art.pctAcumPrecio        = acum;
          art.clasificacionPorPrecio = cls;
          art.pesoPorPrecio         = PESO_DIM[cls];
        }
      }

      // — Dimensión MARGEN UTILIDAD —
      if (totalMU > 0) {
        const ordenMU = [...articulos].sort((a, b) => b.margenUtilidad - a.margenUtilidad);
        let acum = 0;
        for (const art of ordenMU) {
          acum += Math.max(0, art.margenUtilidad) / totalMU;
          const cls = clasificarDimension(acum);
          art.pctAcumMU        = acum;
          art.clasificacionPorMU = cls;
          art.pesoPorMU         = PESO_DIM[cls];
        }
      }

      // — Dimensión QTY —
      if (totalQty > 0) {
        const ordenQty = [...articulos].sort((a, b) => b.undVendidasTotal - a.undVendidasTotal);
        let acum = 0;
        for (const art of ordenQty) {
          acum += (art.undVendidasTotal || 0) / totalQty;
          const cls = clasificarDimension(acum);
          art.pctAcumQty        = acum;
          art.clasificacionPorQty = cls;
          art.pesoPorQty         = PESO_DIM[cls];
        }
      }

      // — Resultado final dentro de la clase —
      articulos.forEach(art => {
        art.resultadoFinal    = parseFloat(
          (art.pesoPorPrecio * PESO_PRECIO + art.pesoPorMU * PESO_MU + art.pesoPorQty * PESO_QTY).toFixed(2)
        );
        art.clasificacionFinal = clasificarResultadoFinal(art.resultadoFinal);
      });
    });

    return [...mapa.values()];
  }

  // ─────────────────────────────────────────────────────────────
  //  RESUMEN POR CLASIFICACIÓN — reactivo al filtro activo
  //  articulosBase: aplica clase + grupo + búsqueda pero NO
  //  clasificacion, para que las 6 tarjetas ABC siempre se vean.
  // ─────────────────────────────────────────────────────────────
  get articulosBase(): ArticuloClasificado[] {
    let base = [...this.articulos];
    if (this.filtros.busqueda) {
      const q = this.filtros.busqueda.toLowerCase();
      base = base.filter(a =>
        a.codigoArticulo.toLowerCase().includes(q) ||
        a.descripcion.toLowerCase().includes(q)
      );
    }
    if (this.filtros.clase)  base = base.filter(a => a.clase  === this.filtros.clase);
    if (this.filtros.grupo)  base = base.filter(a => a.grupo  === this.filtros.grupo);
    return base;
  }

  get resumen(): ResumenClasificacion[] {
    const base     = this.articulosBase;
    const tPrecio  = base.reduce((s, a) => s + a.precioTotalVendido, 0) || 1;
    const tMU      = base.reduce((s, a) => s + a.margenUtilidad,     0) || 1;
    const tQty     = base.reduce((s, a) => s + a.undVendidasTotal,   0) || 1;

    return this.CLASIFICACIONES.map(cls => {
      const grupo  = base.filter(a => a.clasificacionFinal === cls);
      const totalP = grupo.reduce((s, a) => s + a.precioTotalVendido, 0);
      const totalM = grupo.reduce((s, a) => s + a.margenUtilidad,     0);
      const totalQ = grupo.reduce((s, a) => s + a.undVendidasTotal,   0);
      return {
        clasificacion: cls,
        cantidad:   grupo.length,
        totalPrecio: totalP,
        totalMU:     totalM,
        totalQty:    totalQ,
        pctPrecio:   totalP / tPrecio,
        pctMU:       totalM / tMU,
        pctQty:      totalQ / tQty
      };
    });
  }

  // ─────────────────────────────────────────────────────────────
  //  FILTROS Y ORDENAMIENTO
  // ─────────────────────────────────────────────────────────────
  private poblarFiltros(): void {
    this.clasesDisponibles = [...new Set(this.articulos.map(a => a.clase).filter(Boolean))].sort();
    this.gruposDisponibles = [...new Set(this.articulos.map(a => a.grupo).filter(Boolean))].sort();
  }

  aplicarFiltros(): void {
    let resultado = [...this.articulos];

    if (this.filtros.busqueda) {
      const q = this.filtros.busqueda.toLowerCase();
      resultado = resultado.filter(a =>
        a.codigoArticulo.toLowerCase().includes(q) ||
        a.descripcion.toLowerCase().includes(q)
      );
    }
    if (this.filtros.clasificacion) {
      resultado = resultado.filter(a => a.clasificacionFinal === this.filtros.clasificacion);
    }
    if (this.filtros.clase) {
      resultado = resultado.filter(a => a.clase === this.filtros.clase);
    }
    if (this.filtros.grupo) {
      resultado = resultado.filter(a => a.grupo === this.filtros.grupo);
    }

    // Aplicar orden
    resultado.sort((a, b) => {
      const va = a[this.columnaOrden];
      const vb = b[this.columnaOrden];
      if (typeof va === 'number' && typeof vb === 'number') {
        return this.ordenAsc ? va - vb : vb - va;
      }
      return this.ordenAsc
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });

    this.articulosFiltrados = resultado;
    this.paginaActual = 1;
  }

  ordenarPor(col: keyof ArticuloClasificado): void {
    if (this.columnaOrden === col) {
      this.ordenAsc = !this.ordenAsc;
    } else {
      this.columnaOrden = col;
      this.ordenAsc = false;
    }
    this.aplicarFiltros();
  }

  limpiarFiltros(): void {
    this.filtros = { busqueda: '', clasificacion: '', clase: '', grupo: '' };
    this.aplicarFiltros();
  }

  // ─────────────────────────────────────────────────────────────
  //  HELPERS DE VISTA
  // ─────────────────────────────────────────────────────────────
  badgeColor(cls: ClasificacionFinal): string {
    const map: Record<ClasificacionFinal, string> = {
      AAA: 'badge-aaa', AA: 'badge-aa', A: 'badge-a',
      B: 'badge-b', C: 'badge-c', D: 'badge-d'
    };
    return map[cls];
  }

  formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(valor);
  }

  formatearNumero(valor: number, decimales = 0): string {
    return new Intl.NumberFormat('es-EC', { maximumFractionDigits: decimales }).format(valor);
  }

  formatearFecha(fecha: string | null): string {
    if (!fecha) return '—';
    try { return new Date(fecha).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return '—'; }
  }

  abrirDetalle(art: ArticuloClasificado): void  { this.articuloSeleccionado = art; }
  cerrarDetalle(): void                          { this.articuloSeleccionado = null; }

  irAPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) this.paginaActual = pagina;
  }

  get paginas(): number[] {
    const total = this.totalPaginas;
    const actual = this.paginaActual;
    const rango = 2;
    const inicio = Math.max(1, actual - rango);
    const fin    = Math.min(total, actual + rango);
    return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
  }

  // Icono de orden
  iconoOrden(col: keyof ArticuloClasificado): string {
    if (this.columnaOrden !== col) return '↕';
    return this.ordenAsc ? '↑' : '↓';
  }

  // ─────────────────────────────────────────────────────────────
  //  EXPORTAR EXCEL
  //  Exporta exactamente los artículos visibles en pantalla
  //  (respetando filtros y orden activos) en dos hojas:
  //    1. "Artículos" — tabla principal (todos los filtrados)
  //    2. "Resumen ABC" — distribución por clasificación
  // ─────────────────────────────────────────────────────────────
  descargarExcel(): void {
    if (this.descargandoExcel) return;
    this.descargandoExcel = true;

    try {
      const wb = XLSX.utils.book_new();

      // ── Hoja 1: Artículos filtrados ──────────────────────────
      const filas = this.articulosFiltrados.map(a => ({
        'Código':            a.codigoArticulo,
        'Descripción':       a.descripcion,
        'Clase':             a.clase,
        'Grupo':             a.grupo,
        'Precio Venta ($)':  a.precioTotalVendido,
        'Margen Utilidad ($)': a.margenUtilidad,
        'Qty Vendida':       a.undVendidasTotal,
        'Valor Inventario ($)': a.valorInventarioTotal,
        'Stock Disponible':  a.stockDisponibleTotal,
        'Cls. Precio':       a.clasificacionPorPrecio,
        'Cls. MU':           a.clasificacionPorMU,
        'Cls. Qty':          a.clasificacionPorQty,
        'Resultado Final':   a.resultadoFinal,
        'ABC Final':         a.clasificacionFinal,
        '% Acum. Precio':    parseFloat((a.pctAcumPrecio * 100).toFixed(2)),
        '% Acum. MU':        parseFloat((a.pctAcumMU     * 100).toFixed(2)),
        '% Acum. Qty':       parseFloat((a.pctAcumQty    * 100).toFixed(2)),
      }));

      const wsArticulos = XLSX.utils.json_to_sheet(filas);

      // Ancho de columnas
      wsArticulos['!cols'] = [
        { wch: 14 }, { wch: 40 }, { wch: 10 }, { wch: 12 },
        { wch: 16 }, { wch: 18 }, { wch: 12 }, { wch: 18 },
        { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
        { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
      ];

      XLSX.utils.book_append_sheet(wb, wsArticulos, 'Artículos');

      // ── Hoja 2: Resumen ABC ──────────────────────────────────
      const filasResumen = this.resumen.map(r => ({
        'Clasificación':        r.clasificacion,
        'Cantidad Artículos':   r.cantidad,
        'Total Precio ($)':     r.totalPrecio,
        'Total MU ($)':         r.totalMU,
        'Total Qty':            r.totalQty,
        '% Precio':             parseFloat((r.pctPrecio * 100).toFixed(2)),
        '% MU':                 parseFloat((r.pctMU     * 100).toFixed(2)),
        '% Qty':                parseFloat((r.pctQty    * 100).toFixed(2)),
      }));

      const wsResumen = XLSX.utils.json_to_sheet(filasResumen);
      wsResumen['!cols'] = [
        { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 14 },
        { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      ];

      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen ABC');

      // ── Nombre del archivo con fecha y filtros activos ───────
      const fecha  = new Date().toISOString().slice(0, 10);
      const sufijo = [
        this.filtros.clasificacion,
        this.filtros.clase,
        this.filtros.grupo,
      ].filter(Boolean).join('_');
      const nombre = `ClasificacionABC${sufijo ? '_' + sufijo : ''}_${fecha}.xlsx`;

      XLSX.writeFile(wb, nombre);

    } finally {
      this.descargandoExcel = false;
    }
  }
}