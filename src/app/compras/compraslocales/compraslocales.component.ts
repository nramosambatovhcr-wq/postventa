import { Component, OnInit, OnDestroy } from '@angular/core';
import { ComprasService, CompraDetalle, FiltrosCompras } from '../../services/compras.service';
import * as XLSX from 'xlsx';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

type ColumnaOrden = 'fechaEmision' | 'proveedor' | 'numero' | 'articulo' | 'cantidad' | 'valor';

interface EstadisticasCompras {
  totalRegistros: number;
  totalCompras: number;
  totalArticulos: number;
}

// ── Interfaces para el panel de análisis ───────────────────────────
interface ArticuloTop {
  codigo: string;
  nombre: string;
  cantidad: number;
  valor: number;
  veces: number;         // número de órdenes distintas
  porcentaje: number;    // % sobre el total de cantidad
}

interface ProveedorTop {
  nombre: string;
  ruc: string;
  valor: number;
  cantidad: number;
  veces: number;
  porcentaje: number;    // % sobre el total de valor
}

interface MesActividad {
  mes: string;           // 'Ene 2024'
  key: string;           // 'YYYY-MM' para ordenar
  valor: number;
  cantidad: number;
  registros: number;
  porcentaje: number;    // % sobre el mes más alto
}

interface ClaseAgrupada {
  clase: string;
  valor: number;
  cantidad: number;
  registros: number;
  articulos: number;     // nº de códigos de artículo distintos
  proveedores: number;   // nº de proveedores distintos
  porcentaje: number;    // % sobre la clase de mayor valor
}

@Component({
  selector: 'app-compraslocales',
  templateUrl: './compraslocales.component.html',
  styleUrls: ['./compraslocales.component.css']
})
export class CompraslocalesComponent implements OnInit, OnDestroy {

  // ── Datos ──────────────────────────────────────────────────────────
  compras: CompraDetalle[] = [];
  comprasBase: CompraDetalle[] = [];        // tras filtros de texto/fecha, ANTES de la clase
  comprasFiltradas: CompraDetalle[] = [];

  // ── Análisis por clase ────────────────────────────────────────────
  topLimit = 50;                            // top de artículos / proveedores
  claseSeleccionada: string | null = null;
  topClases: ClaseAgrupada[] = [];
  totalValorBase = 0;                       // valor total de comprasBase (fila "Todas")

  // ── Estados ───────────────────────────────────────────────────────
  loading = false;
  error: string | null = null;
  fechaActual: string = '';
  mostrarAnalisis = true;   // panel colapsable

  // ── Filtros ───────────────────────────────────────────────────────
  usuarioBusqueda = 'JCATOTA';
  filtroProveedor = '';
  filtroArticulo = '';
  filtroNumero = '';
  filtroFechaDesde: string = '';
  filtroFechaHasta: string = '';

  // ── Paginación ────────────────────────────────────────────────────
  paginaActual = 1;
  itemsPorPagina = 500;

  // ── Ordenamiento ──────────────────────────────────────────────────
  columnaOrden: ColumnaOrden = 'fechaEmision';
  ordenAscendente = false;

  // ── Modal detalle ─────────────────────────────────────────────────
  mostrarDetalleModal = false;
  compraSeleccionada: CompraDetalle | any;

  // ── Estadísticas rápidas ──────────────────────────────────────────
  estadisticas: EstadisticasCompras = {
    totalRegistros: 0,
    totalCompras: 0,
    totalArticulos: 0
  };

  // ── Utilidades ────────────────────────────────────────────────────
  readonly Math = Math;

  private destroy$ = new Subject<void>();
  private filtroChange$ = new Subject<number>();
  private filtroCounter = 0;

  constructor(private comprasService: ComprasService) { }

  ngOnInit(): void {
    this.fechaActual = this.formatearFecha(new Date());
    this.cargarCompras();
    this.setupFiltroDebounce();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ══════════════════════════════════════════════════════════════════
  //  ANÁLISIS COMPUTADOS (getters)
  // ══════════════════════════════════════════════════════════════════

  /** Top de artículos por cantidad total comprada (hasta topLimit) */
  get topArticulos(): ArticuloTop[] {
    if (!this.comprasFiltradas.length) return [];

    const mapa = new Map<string, ArticuloTop>();

    for (const c of this.comprasFiltradas) {
      const key = c.articulo || 'SIN_CODIGO';
      if (!mapa.has(key)) {
        mapa.set(key, {
          codigo: c.articulo || '',
          nombre: c.articuloNombre || c.descripcion || 'Sin nombre',
          cantidad: 0,
          valor: 0,
          veces: 0,
          porcentaje: 0
        });
      }
      const item = mapa.get(key)!;
      item.cantidad += c.cantidad || 0;
      item.valor += c.valor || 0;
      item.veces += 1;
    }

    const lista = Array.from(mapa.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, this.topLimit);

    const maxCantidad = lista[0]?.cantidad || 1;
    lista.forEach(a => a.porcentaje = Math.round((a.cantidad / maxCantidad) * 100));

    return lista;
  }

  /** Top de proveedores por valor total comprado (hasta topLimit) */
  get topProveedores(): ProveedorTop[] {
    if (!this.comprasFiltradas.length) return [];

    const mapa = new Map<string, ProveedorTop>();

    for (const c of this.comprasFiltradas) {
      const key = c.provCeduruc || c.proveedorNombre || 'SIN_RUC';
      if (!mapa.has(key)) {
        mapa.set(key, {
          nombre: c.proveedorNombre || 'Sin nombre',
          ruc: c.provCeduruc || '',
          valor: 0,
          cantidad: 0,
          veces: 0,
          porcentaje: 0
        });
      }
      const item = mapa.get(key)!;
      item.valor += c.valor || 0;
      item.cantidad += c.cantidad || 0;
      item.veces += 1;
    }

    const lista = Array.from(mapa.values())
      .sort((a, b) => b.valor - a.valor)
      .slice(0, this.topLimit);

    const maxValor = lista[0]?.valor || 1;
    lista.forEach(p => p.porcentaje = Math.round((p.valor / maxValor) * 100));

    return lista;
  }

  /** Actividad mensual ordenada cronológicamente */
  get actividadMensual(): MesActividad[] {
    if (!this.comprasFiltradas.length) return [];

    const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const mapa = new Map<string, MesActividad>();

    for (const c of this.comprasFiltradas) {
      if (!c.fechaEmision) continue;
      const d = new Date(c.fechaEmision);
      if (isNaN(d.getTime())) continue;

      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!mapa.has(key)) {
        mapa.set(key, {
          mes: `${MESES[d.getMonth()]} ${d.getFullYear()}`,
          key,
          valor: 0,
          cantidad: 0,
          registros: 0,
          porcentaje: 0
        });
      }
      const item = mapa.get(key)!;
      item.valor += c.valor || 0;
      item.cantidad += c.cantidad || 0;
      item.registros += 1;
    }

    const lista = Array.from(mapa.values()).sort((a, b) => a.key.localeCompare(b.key));
    const maxValor = Math.max(...lista.map(m => m.valor)) || 1;
    lista.forEach(m => m.porcentaje = Math.round((m.valor / maxValor) * 100));

    return lista;
  }

  /** Resumen ejecutivo calculado desde comprasFiltradas */
  get resumenEjecutivo() {
    if (!this.comprasFiltradas.length) {
      return { promedioPorOrden: 0, articulosUnicos: 0, proveedoresUnicos: 0, mesesActivos: 0, mesTop: 'N/A', articuloTop: 'N/A', proveedorTop: 'N/A' };
    }

    const articulosUnicos = new Set(this.comprasFiltradas.map(c => c.articulo)).size;
    const proveedoresUnicos = new Set(this.comprasFiltradas.map(c => c.provCeduruc || c.proveedorNombre)).size;
    const ordenesUnicas = new Set(this.comprasFiltradas.map(c => `${c.serie}-${c.numero}`)).size;
    const promedioPorOrden = ordenesUnicas > 0 ? this.estadisticas.totalCompras / ordenesUnicas : 0;

    const mesesActivos = this.actividadMensual.length;
    const mesTop = this.actividadMensual.length
      ? [...this.actividadMensual].sort((a, b) => b.valor - a.valor)[0].mes
      : 'N/A';

    const articuloTop = this.topArticulos[0]?.nombre || 'N/A';
    const proveedorTop = this.topProveedores[0]?.nombre || 'N/A';

    return { promedioPorOrden, articulosUnicos, proveedoresUnicos, mesesActivos, mesTop, articuloTop, proveedorTop };
  }

  // ══════════════════════════════════════════════════════════════════
  //  CARGA Y FILTROS
  // ══════════════════════════════════════════════════════════════════

  private setupFiltroDebounce(): void {
    this.filtroChange$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.aplicarFiltrosInterno());
  }

  cargarCompras(): void {
    if (!this.usuarioBusqueda?.trim()) {
      this.error = 'Por favor ingrese un usuario válido';
      return;
    }

    this.loading = true;
    this.error = null;

    this.comprasService.getComprasPorUsuario(this.usuarioBusqueda.trim())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.compras = response.data || [];
          this.aplicarFiltrosInterno();
          this.loading = false;
          console.log(`✓ Compras cargadas: ${response.total}`);
        },
        error: (err) => {
          this.error = 'Error al cargar las compras. Por favor, intente nuevamente.';
          console.error('Error al cargar compras:', err);
          this.loading = false;
          this.compras = [];
          this.comprasFiltradas = [];
          this.calcularEstadisticas();
        }
      });
  }

  buscarPorUsuario(): void {
    const usuario = this.usuarioBusqueda?.trim();
    if (!usuario) { this.error = 'Por favor ingrese un usuario'; return; }
    if (usuario.length < 3) { this.error = 'El usuario debe tener al menos 3 caracteres'; return; }
    this.cargarCompras();
  }

  aplicarFiltros(): void {
    this.filtroChange$.next(++this.filtroCounter);
  }

  private aplicarFiltrosInterno(): void {
    // (a) Base: filtros de texto/fecha, SIN aplicar la clase todavía
    this.comprasBase = this.compras.filter(compra => {
      const cumpleProveedor = !this.filtroProveedor ||
        this.normalizarTexto(compra.proveedorNombre).includes(this.normalizarTexto(this.filtroProveedor));

      const cumpleArticulo = !this.filtroArticulo ||
        this.normalizarTexto(compra.articuloNombre).includes(this.normalizarTexto(this.filtroArticulo)) ||
        this.normalizarTexto(compra.descripcion).includes(this.normalizarTexto(this.filtroArticulo)) ||
        this.normalizarTexto(compra.articulo).includes(this.normalizarTexto(this.filtroArticulo));

      const cumpleNumero = !this.filtroNumero ||
        this.normalizarTexto(compra.numero).includes(this.normalizarTexto(this.filtroNumero)) ||
        this.normalizarTexto(compra.serie).includes(this.normalizarTexto(this.filtroNumero));

      let cumpleFechaDesde = true;
      if (this.filtroFechaDesde && compra.fechaEmision) {
        cumpleFechaDesde = this.toDateString(compra.fechaEmision) >= this.filtroFechaDesde;
      }

      let cumpleFechaHasta = true;
      if (this.filtroFechaHasta && compra.fechaEmision) {
        cumpleFechaHasta = this.toDateString(compra.fechaEmision) <= this.filtroFechaHasta;
      }

      return cumpleProveedor && cumpleArticulo && cumpleNumero && cumpleFechaDesde && cumpleFechaHasta;
    });

    // (b) Tabla de clases sobre la base (así se puede cambiar de clase)
    this.calcularClases();

    // (c) Si la clase activa ya no existe en la base, se limpia
    if (this.claseSeleccionada && !this.topClases.some(x => x.clase === this.claseSeleccionada)) {
      this.claseSeleccionada = null;
    }

    // (d) Set final filtrado por la clase seleccionada -> alimenta tabla,
    //     paginación, exportación y todos los getters de análisis
    this.comprasFiltradas = this.claseSeleccionada
      ? this.comprasBase.filter(c => this.claseDe(c) === this.claseSeleccionada)
      : [...this.comprasBase];

    this.paginaActual = 1;
    this.calcularEstadisticas();
  }

  /** Construye la tabla de clases sobre comprasBase (no filtra por clase). */
  private calcularClases(): void {
    const mapa = new Map<string, {
      valor: number; cantidad: number; registros: number;
      articulos: Set<string>; proveedores: Set<string>;
    }>();

    this.totalValorBase = 0;

    for (const c of this.comprasBase) {
      const clave = this.claseDe(c);
      const valor = c.valor || 0;
      const cant = c.cantidad || 0;
      this.totalValorBase += valor;

      let agg = mapa.get(clave);
      if (!agg) {
        agg = { valor: 0, cantidad: 0, registros: 0, articulos: new Set(), proveedores: new Set() };
        mapa.set(clave, agg);
      }
      agg.valor += valor;
      agg.cantidad += cant;
      agg.registros += 1;
      if (c.articulo) agg.articulos.add(c.articulo);
      if (c.provCeduruc) agg.proveedores.add(c.provCeduruc);
    }

    const lista: ClaseAgrupada[] = Array.from(mapa.entries()).map(([clase, a]) => ({
      clase,
      valor: a.valor,
      cantidad: a.cantidad,
      registros: a.registros,
      articulos: a.articulos.size,
      proveedores: a.proveedores.size,
      porcentaje: 0
    }));

    const maxValor = Math.max(...lista.map(x => x.valor), 1);
    lista.forEach(x => x.porcentaje = Math.round((x.valor / maxValor) * 100));
    lista.sort((a, b) => b.valor - a.valor);

    this.topClases = lista;
  }

  /** Campo que define la clase del artículo (centralizado por si cambia). */
  private claseDe(c: CompraDetalle): string {
    const v = ((c as any)?.grarClase ?? '').toString().trim();
    return v || 'SIN CLASE';
  }

  /** Selecciona/deselecciona una clase y recalcula TODO el análisis. */
  seleccionarClase(clase: string): void {
    this.claseSeleccionada = (this.claseSeleccionada === clase) ? null : clase;
    this.aplicarFiltrosInterno();
  }

  /** Quita el filtro por clase y vuelve a "Todas". */
  limpiarClase(): void {
    if (!this.claseSeleccionada) return;
    this.claseSeleccionada = null;
    this.aplicarFiltrosInterno();
  }

  private toDateString(fecha: Date | string): string {
    try {
      const d = new Date(fecha);
      if (isNaN(d.getTime())) return '';
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    } catch { return ''; }
  }

  private normalizarTexto(texto: string | undefined): string {
    if (!texto) return '';
    return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  limpiarFiltros(): void {
    this.filtroProveedor = '';
    this.filtroArticulo = '';
    this.filtroNumero = '';
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.aplicarFiltrosInterno();
  }

  // ══════════════════════════════════════════════════════════════════
  //  ORDENAMIENTO / PAGINACIÓN
  // ══════════════════════════════════════════════════════════════════

  ordenarPor(columna: ColumnaOrden): void {
    if (this.columnaOrden === columna) {
      this.ordenAscendente = !this.ordenAscendente;
    } else {
      this.columnaOrden = columna;
      this.ordenAscendente = true;
    }

    this.comprasFiltradas.sort((a, b) => {
      const vA = this.obtenerValorOrden(a, columna);
      const vB = this.obtenerValorOrden(b, columna);
      if (vA < vB) return this.ordenAscendente ? -1 : 1;
      if (vA > vB) return this.ordenAscendente ? 1 : -1;
      return 0;
    });
  }

  private obtenerValorOrden(compra: CompraDetalle, columna: string): any {
    switch(columna) {
      case 'fechaEmision': return compra.fechaEmision ? new Date(compra.fechaEmision).getTime() : 0;
      case 'proveedor':    return compra.proveedorNombre || '';
      case 'numero':       return compra.numero || '';
      case 'articulo':     return compra.articuloNombre || '';
      case 'cantidad':     return compra.cantidad || 0;
      case 'valor':        return compra.valor || 0;
      default:             return '';
    }
  }

  private calcularEstadisticas(): void {
    this.estadisticas = {
      totalRegistros: this.comprasFiltradas.length,
      totalCompras: this.comprasFiltradas.reduce((s, c) => s + (c.valor || 0), 0),
      totalArticulos: this.comprasFiltradas.reduce((s, c) => s + (c.cantidad || 0), 0)
    };
  }

  get comprasPaginadas(): CompraDetalle[] {
    const ipp = +this.itemsPorPagina;
    const inicio = (this.paginaActual - 1) * ipp;
    return this.comprasFiltradas.slice(inicio, inicio + ipp);
  }

  get totalPaginas(): number {
    return Math.ceil(this.comprasFiltradas.length / +this.itemsPorPagina);
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  get paginasArray(): number[] {
    const paginas: number[] = [];
    const maxPaginas = 5;
    let inicio = Math.max(1, this.paginaActual - Math.floor(maxPaginas / 2));
    let fin = Math.min(this.totalPaginas, inicio + maxPaginas - 1);
    if (fin - inicio < maxPaginas - 1) inicio = Math.max(1, fin - maxPaginas + 1);
    for (let i = inicio; i <= fin; i++) paginas.push(i);
    return paginas;
  }

  get hayFiltrosActivos(): boolean {
    return !!(this.filtroProveedor || this.filtroArticulo || this.filtroNumero || this.filtroFechaDesde || this.filtroFechaHasta);
  }

  // ══════════════════════════════════════════════════════════════════
  //  MODAL DETALLE
  // ══════════════════════════════════════════════════════════════════

  verDetalle(compra: CompraDetalle): void {
    this.compraSeleccionada = compra;
    this.mostrarDetalleModal = true;
    document.body.style.overflow = 'hidden';
  }

  cerrarDetalle(): void {
    this.mostrarDetalleModal = false;
    this.compraSeleccionada = null;
    document.body.style.overflow = '';
  }

  // ══════════════════════════════════════════════════════════════════
  //  UTILIDADES
  // ══════════════════════════════════════════════════════════════════

  formatearFecha(fecha: Date | string | undefined): string {
    if (!fecha) return 'N/A';
    try {
      return new Date(fecha).toLocaleDateString('es-EC', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch { return 'Fecha inválida'; }
  }

  formatearMoneda(valor: number | undefined | null): string {
    if (valor === undefined || valor === null || isNaN(valor)) return '$0.00';
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(valor);
  }

  getIconoOrden(columna: string): string {
    if (this.columnaOrden !== columna) return 'fa-sort';
    return this.ordenAscendente ? 'fa-sort-up' : 'fa-sort-down';
  }

  // ══════════════════════════════════════════════════════════════════
  //  EXPORTAR / IMPRIMIR
  // ══════════════════════════════════════════════════════════════════

  exportarExcel(): void {
    if (!this.comprasFiltradas.length) { alert('No hay datos para exportar'); return; }

    try {
      const datosExportar = this.comprasFiltradas.map(compra => ({
        'Fecha Emisión': this.formatearFecha(compra.fechaEmision),
        'Serie': compra.serie || '',
        'Número': compra.numero || '',
        'Proveedor': compra.proveedorNombre || '',
        'Ciudad': compra.proveedorCiudad || '',
        'RUC': compra.provCeduruc || '',
        'Artículo': compra.articulo || '',
        'Descripción': compra.articuloNombre || '',
        'Clase': compra.artlClase || '',
        'Grupo': compra.grarCodigrup || '',
        'Cantidad': compra.cantidad || 0,
        'Precio Unitario': compra.precioUnitario || 0,
        'Costo Unitario': compra.costoUnitario || 0,
        'Valor Total': compra.valor || 0,
        'Entrada/Salida': compra.entrSali || '',
        'Fecha Creación': this.formatearFecha(compra.fechaCreacion)
      }));

      const ws = XLSX.utils.json_to_sheet(datosExportar);
      ws['!cols'] = [
        {wch:12},{wch:10},{wch:12},{wch:30},{wch:15},
        {wch:15},{wch:15},{wch:40},{wch:12},{wch:15},
        {wch:10},{wch:12},{wch:12},{wch:12},{wch:10},{wch:12}
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Compras Locales');

      // Hoja de análisis en el Excel
      const analisisArticulos = this.topArticulos.map((a, i) => ({
        '#': i + 1, 'Código': a.codigo, 'Artículo': a.nombre,
        'Cantidad Total': a.cantidad, 'Valor Total': a.valor, 'Nº Órdenes': a.veces
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analisisArticulos), 'Top Artículos');

      const analisisProveedores = this.topProveedores.map((p, i) => ({
        '#': i + 1, 'Proveedor': p.nombre, 'RUC': p.ruc,
        'Valor Total': p.valor, 'Cantidad': p.cantidad, 'Nº Compras': p.veces
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analisisProveedores), 'Top Proveedores');

      const analisisMeses = this.actividadMensual.map(m => ({
        'Mes': m.mes, 'Registros': m.registros, 'Cantidad': m.cantidad, 'Valor': m.valor
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analisisMeses), 'Por Mes');

      const resumen = [
        { Indicador: 'Usuario', Valor: this.usuarioBusqueda },
        { Indicador: 'Total Registros', Valor: this.estadisticas.totalRegistros },
        { Indicador: 'Total Artículos (qty)', Valor: this.estadisticas.totalArticulos },
        { Indicador: 'Total Compras', Valor: this.formatearMoneda(this.estadisticas.totalCompras) },
        { Indicador: 'Artículos Únicos', Valor: this.resumenEjecutivo.articulosUnicos },
        { Indicador: 'Proveedores Únicos', Valor: this.resumenEjecutivo.proveedoresUnicos },
        { Indicador: 'Meses Activos', Valor: this.resumenEjecutivo.mesesActivos },
        { Indicador: 'Mes con Mayor Compra', Valor: this.resumenEjecutivo.mesTop },
        { Indicador: 'Artículo Más Comprado', Valor: this.resumenEjecutivo.articuloTop },
        { Indicador: 'Proveedor Principal', Valor: this.resumenEjecutivo.proveedorTop },
        { Indicador: 'Fecha Exportación', Valor: new Date().toLocaleString('es-EC') }
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen), 'Resumen');

      XLSX.writeFile(wb, `Compras_Locales_${this.usuarioBusqueda}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      alert('Error al exportar el archivo Excel.');
    }
  }

  imprimirReporte(): void {
    if (!this.comprasFiltradas.length) { alert('No hay datos para imprimir'); return; }
    window.print();
  }

  private obtenerFiltrosActivos(): string {
    const filtros: string[] = [];
    if (this.filtroProveedor) filtros.push(`Proveedor: ${this.filtroProveedor}`);
    if (this.filtroArticulo)  filtros.push(`Artículo: ${this.filtroArticulo}`);
    if (this.filtroNumero)    filtros.push(`Serie/Número: ${this.filtroNumero}`);
    if (this.filtroFechaDesde) filtros.push(`Desde: ${this.filtroFechaDesde}`);
    if (this.filtroFechaHasta) filtros.push(`Hasta: ${this.filtroFechaHasta}`);
    return filtros.length ? filtros.join(', ') : 'Sin filtros';
  }
}