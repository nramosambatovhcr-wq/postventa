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
  VentaTallerDetalle,
  ApiResponseVentasTallerDetalle
} from 'src/app/services/ots-facturas.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-otgrtfactdetalle',
  templateUrl: './otgrtfactdetalle.component.html',
  styleUrls: ['./otgrtfactdetalle.component.css'],
  // ✅ FIX 1: OnPush — Angular sólo actualiza la vista cuando
  //    se llama markForCheck(), evitando revisiones constantes.
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OtgrtfactdetalleComponent implements OnInit, OnDestroy {

  // ─── Datos ──────────────────────────────────────────────────
  lineas: VentaTallerDetalle[]          = [];
  lineasFiltradas: VentaTallerDetalle[] = [];
  // Lo que realmente se pagina/muestra en la tabla inferior.
  // Es lineasFiltradas, opcionalmente acotado al artículo seleccionado.
  lineasTabla: VentaTallerDetalle[]     = [];
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
  totalConIvaApi    = 0;
  totalRegistrosApi = 0;
  tiempoSegundos    = 0;

  // ─── Filtros locales ────────────────────────────────────────
  filtroOficina   = '';
  filtroTipoOt    = '';
  filtroCliente   = '';
  filtroArticulo  = '';
  filtroClase     = '';
  filtroGrupo     = '';

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
  clasesUnicas:   string[]                    = [];
  gruposUnicos:   string[]                    = [];

  // KPIs
  totalCostoFiltrado     = 0;
  totalPrecioFiltrado    = 0;
  totalDescuentoFiltrado = 0;
  totalCantidad          = 0;
  margenGlobalPct        = 0;
  facturasUnicas         = 0;
  otUnicas               = 0;
  articulosUnicos        = 0;

  // Resúmenes
  resumenPorTipoOt:  any[] = [];
  resumenPorOficina: any[] = [];
  topArticulos:      any[] = [];   // (se conserva sólo para el Excel)
  resumenPorClase:   any[] = [];
  resumenPorMes:     any[] = [];

  // ─── Artículos por clase (panel interactivo) ────────────────
  // Cuántos artículos se muestran por clase (0 = todos).
  limiteArtClase = 50;
  // Opciones del selector de cantidad a mostrar.
  opcionesLimiteArtClase = [50, 100, 200, 500, 0];
  // Clase actualmente seleccionada en el panel "Por Clase".
  claseSeleccionada = '';
  // Artículos (ya ordenados y recortados) de la clase seleccionada.
  articulosClaseSeleccionada: any[] = [];
  // Total de artículos que tiene la clase (antes de recortar).
  totalArticulosClase = 0;
  // Ordenamiento del panel de artículos de la clase.
  ordenArtClaseCol: 'precio' | 'cantidad' | 'margen' = 'precio';
  ordenArtClaseAsc = false;   // false = descendente (precio desc por defecto)
  // Mapa clase -> artículos completos ordenados desc por precio.
  private _articulosPorClase = new Map<string, any[]>();

  // ─── Drill-down: artículo seleccionado para la tabla inferior ─
  articuloSeleccionadoCod: string | null    = null;
  articuloSeleccionadoNombre: string | null = null;

  // ─── Totales de la TABLA inferior (respetan el drill-down) ───
  totalCostoTabla     = 0;
  totalPrecioTabla    = 0;
  totalDescuentoTabla = 0;
  margenTabla         = 0;

  // Máximos para barras
  maxPrecioOficina       = 1;
  maxPrecioMes           = 1;
  maxPrecioArticulo      = 1;
  maxPrecioClase         = 1;
  maxPrecioArticuloClase = 1;

  // Paginación cacheada
  lineasPaginadas: VentaTallerDetalle[] = [];
  totalPaginas    = 0;
  paginasArray:   number[] = [];

  // ✅ FIX 3: Subject para cancelar suscripción al destruir el componente
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
      ? this.otsService.getVentasDetalleAnoActual()
      : this.otsService.getVentasDetalle({
          fechaInicio: this.formatFechaParaApi(this.fechaInicio),
          fechaFin:    this.formatFechaParaApi(this.fechaFin)
        });

    obs$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: ApiResponseVentasTallerDetalle) => {
        this.lineas            = res.datos          ?? [];
        this.totalSinIvaApi    = res.totalSinIva    ?? 0;
        this.totalConIvaApi    = res.totalConIva    ?? 0;
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
        this.error   = 'Error al cargar el detalle de facturas. Intente nuevamente.';
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
    const art = this.filtroArticulo.toLowerCase();
    const cla = this.filtroClase.toLowerCase();
    const grp = this.filtroGrupo.toLowerCase();

    this.lineasFiltradas = this.lineas.filter(l =>
      (!ofi || l.oficina?.toLowerCase().includes(ofi))          &&
      (!tot || l.tipoOt?.toLowerCase().includes(tot))           &&
      (!cli || l.cliente?.toLowerCase().includes(cli))          &&
      (!art || l.nombreArticulo?.toLowerCase().includes(art) ||
               l.codArticulo?.toLowerCase().includes(art))      &&
      (!cla || l.clase?.toLowerCase().includes(cla))            &&
      (!grp || l.grupo?.toLowerCase().includes(grp))
    );
    this.paginaActual = 1;
    // Al cambiar filtros se descarta el artículo seleccionado.
    this.articuloSeleccionadoCod    = null;
    this.articuloSeleccionadoNombre = null;
    this._recalcularEstadisticas();
    this._recomputarLineasTabla();
    this.cdr.markForCheck();
  }

  limpiarFiltros(): void {
    this.filtroOficina  = '';
    this.filtroTipoOt   = '';
    this.filtroCliente  = '';
    this.filtroArticulo = '';
    this.filtroClase    = '';
    this.filtroGrupo    = '';
    this.aplicarFiltros();
  }

  // ─── Recálculo de selects (solo cuando cambia lineas base) ─
  private _recalcularSelects(): void {
    this.oficinasUnicas = [
      ...new Set(this.lineas.map(l => l.oficina).filter(Boolean))
    ].sort() as string[];

    const mapTipo = new Map<string, string>();
    this.lineas.forEach(l => { if (l.tipoOtId) mapTipo.set(l.tipoOtId, l.tipoOt); });
    this.tiposOtUnicos = [...mapTipo.entries()]
      .map(([id, desc]) => ({ id, desc }))
      .sort((a, b) => a.id.localeCompare(b.id));

    this.clasesUnicas = [
      ...new Set(this.lineas.map(l => l.clase).filter(Boolean))
    ].sort() as string[];

    this.gruposUnicos = [
      ...new Set(this.lineas.map(l => l.grupo).filter(Boolean))
    ].sort() as string[];
  }

  // ✅ FIX 2 (núcleo): Un solo recorrido del arreglo calcula
  //    TODOS los resúmenes y KPIs en lugar de N pasadas separadas.
  private _recalcularEstadisticas(): void {
    const lf = this.lineasFiltradas;

    let costo = 0, precio = 0, descuento = 0, cantidad = 0;
    const setFacturas  = new Set<string>();
    const setOts       = new Set<string>();
    const setArticulos = new Set<string>();

    const mapTipoOt  = new Map<string, any>();
    const mapOficina = new Map<string, any>();
    const mapArticulo= new Map<string, any>();
    const mapClase   = new Map<string, any>();
    const mapMes     = new Map<string, any>();

    for (const l of lf) {
      // ── KPIs globales ──────────────────────────────────────
      costo     += l.costoTotal     || 0;
      precio    += l.precioTotal    || 0;
      descuento += l.valorDescuento || 0;
      cantidad  += l.cantidad       || 0;
      if (l.numDocumento) setFacturas.add(l.numDocumento);
      if (l.ordenTrabajo) setOts.add(l.ordenTrabajo);
      if (l.codArticulo)  setArticulos.add(l.codArticulo);

      // ── Por Tipo OT ────────────────────────────────────────
      if (!mapTipoOt.has(l.tipoOtId)) {
        mapTipoOt.set(l.tipoOtId, {
          tipoOtId: l.tipoOtId, tipoOt: l.tipoOt,
          ots: new Set(), facturas: new Set(), lineas: 0, costo: 0, precio: 0
        });
      }
      const gt = mapTipoOt.get(l.tipoOtId);
      gt.ots.add(l.ordenTrabajo); gt.facturas.add(l.numDocumento);
      gt.lineas++; gt.costo += l.costoTotal || 0; gt.precio += l.precioTotal || 0;

      // ── Por Oficina ────────────────────────────────────────
      if (!mapOficina.has(l.oficina)) {
        mapOficina.set(l.oficina, {
          oficina: l.oficina, ots: new Set(), facturas: new Set(), precio: 0, costo: 0
        });
      }
      const go = mapOficina.get(l.oficina);
      go.ots.add(l.ordenTrabajo); go.facturas.add(l.numDocumento);
      go.precio += l.precioTotal || 0; go.costo += l.costoTotal || 0;

      // ── Por Artículo ───────────────────────────────────────
      if (!mapArticulo.has(l.codArticulo)) {
        mapArticulo.set(l.codArticulo, {
          codArticulo: l.codArticulo, nombre: l.nombreArticulo,
          clase: l.clase, grupo: l.grupo, cantidad: 0, precio: 0, costo: 0
        });
      }
      const ga = mapArticulo.get(l.codArticulo);
      ga.cantidad += l.cantidad || 0;
      ga.precio   += l.precioTotal || 0;
      ga.costo    += l.costoTotal  || 0;

      // ── Por Clase ──────────────────────────────────────────
      const kc = l.clase || 'SIN CLASE';
      if (!mapClase.has(kc)) mapClase.set(kc, { clase: kc, lineas: 0, precio: 0, costo: 0 });
      const gc = mapClase.get(kc);
      gc.lineas++; gc.precio += l.precioTotal || 0; gc.costo += l.costoTotal || 0;

      // ── Por Mes ────────────────────────────────────────────
      if (l.fecha) {
        const d     = new Date(l.fecha);
        const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!mapMes.has(clave)) {
          const etiq = d.toLocaleDateString('es-EC', { year: 'numeric', month: 'short' });
          mapMes.set(clave, { clave, etiqueta: etiq, precio: 0, costo: 0, facturas: new Set() });
        }
        const gm = mapMes.get(clave);
        gm.precio += l.precioTotal || 0;
        gm.costo  += l.costoTotal  || 0;
        gm.facturas.add(l.numDocumento);
      }
    }

    // ── Asignar KPIs ──────────────────────────────────────────
    this.totalCostoFiltrado     = costo;
    this.totalPrecioFiltrado    = precio;
    this.totalDescuentoFiltrado = descuento;
    this.totalCantidad          = cantidad;
    this.margenGlobalPct        = precio > 0
      ? Math.round(((precio - costo) / precio) * 10000) / 100 : 0;
    this.facturasUnicas  = setFacturas.size;
    this.otUnicas        = setOts.size;
    this.articulosUnicos = setArticulos.size;

    // ── Asignar resúmenes ─────────────────────────────────────
    this.resumenPorTipoOt = [...mapTipoOt.values()].map(g => ({
      tipoOtId: g.tipoOtId, tipoOt: g.tipoOt,
      cantOt: g.ots.size, cantFacturas: g.facturas.size, cantLineas: g.lineas,
      totalCosto: g.costo, totalPrecio: g.precio,
      margenPct: g.precio > 0
        ? Math.round(((g.precio - g.costo) / g.precio) * 10000) / 100 : 0
    })).sort((a, b) => b.totalPrecio - a.totalPrecio);

    this.resumenPorOficina = [...mapOficina.values()].map(g => ({
      oficina: g.oficina, cantOt: g.ots.size, cantFacturas: g.facturas.size,
      totalPrecio: g.precio, totalCosto: g.costo,
      margenPct: g.precio > 0
        ? Math.round(((g.precio - g.costo) / g.precio) * 10000) / 100 : 0
    })).sort((a, b) => b.totalPrecio - a.totalPrecio);

    this.topArticulos = [...mapArticulo.values()].map(g => ({
      codArticulo: g.codArticulo, nombre: g.nombre,
      clase: g.clase, grupo: g.grupo, cantidad: g.cantidad,
      totalPrecio: g.precio, totalCosto: g.costo,
      margenPct: g.precio > 0
        ? Math.round(((g.precio - g.costo) / g.precio) * 10000) / 100 : 0
    })).sort((a, b) => b.totalPrecio - a.totalPrecio).slice(0, 10);

    this.resumenPorClase = [...mapClase.values()].map(g => ({
      clase: g.clase, cantLineas: g.lineas,
      totalPrecio: g.precio, totalCosto: g.costo,
      margenPct: g.precio > 0
        ? Math.round(((g.precio - g.costo) / g.precio) * 10000) / 100 : 0
    })).sort((a, b) => b.totalPrecio - a.totalPrecio);

    this.resumenPorMes = [...mapMes.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({
        clave: v.clave, etiqueta: v.etiqueta,
        totalPrecio: v.precio, totalCosto: v.costo, cantFacturas: v.facturas.size
      }));

    // ── Máximos para barras ───────────────────────────────────
    this.maxPrecioOficina  = Math.max(...this.resumenPorOficina.map(o => o.totalPrecio), 1);
    this.maxPrecioMes      = Math.max(...this.resumenPorMes.map(m => m.totalPrecio), 1);
    this.maxPrecioArticulo = Math.max(...this.topArticulos.map(a => a.totalPrecio), 1);
    this.maxPrecioClase    = Math.max(...this.resumenPorClase.map(c => c.totalPrecio), 1);

    // ── Artículos agrupados por clase + selección por defecto ──
    this._recalcularArticulosPorClase(mapArticulo);
    const claseSigueExistiendo =
      this.resumenPorClase.some(c => c.clase === this.claseSeleccionada);
    const claseInicial = claseSigueExistiendo
      ? this.claseSeleccionada
      : (this.resumenPorClase[0]?.clase ?? '');
    this.seleccionarClase(claseInicial);
  }

  // ── Agrupa todos los artículos por clase, ordenados desc por
  //    precio. Se conservan completos; el recorte a 50 se aplica
  //    al seleccionar la clase. ──────────────────────────────────
  private _recalcularArticulosPorClase(mapArticulo: Map<string, any>): void {
    const porClase = new Map<string, any[]>();

    for (const a of mapArticulo.values()) {
      const kc  = a.clase || 'SIN CLASE';
      const arr = porClase.get(kc) ?? [];
      arr.push({
        codArticulo: a.codArticulo,
        nombre:      a.nombre,
        clase:       kc,
        grupo:       a.grupo,
        cantidad:    a.cantidad,
        totalPrecio: a.precio,
        totalCosto:  a.costo,
        margenPct:   a.precio > 0
          ? Math.round(((a.precio - a.costo) / a.precio) * 10000) / 100 : 0
      });
      porClase.set(kc, arr);
    }

    for (const [, arr] of porClase) {
      arr.sort((x, y) => y.totalPrecio - x.totalPrecio);
    }

    this._articulosPorClase = porClase;
  }

  // ── Selecciona una clase y carga sus artículos ───────────────
  seleccionarClase(clase: string): void {
    this.claseSeleccionada   = clase;
    this.totalArticulosClase = (this._articulosPorClase.get(clase) ?? []).length;
    this._aplicarOrdenArticulosClase();
    this.cdr.markForCheck();
  }

  // ── Drill-down: al clic en un artículo, la tabla inferior
  //    muestra sólo los documentos de ese artículo (toggle). ─────
  seleccionarArticulo(a: any): void {
    if (this.articuloSeleccionadoCod === a.codArticulo) {
      this.articuloSeleccionadoCod    = null;
      this.articuloSeleccionadoNombre = null;
    } else {
      this.articuloSeleccionadoCod    = a.codArticulo;
      this.articuloSeleccionadoNombre = a.nombre;
    }
    this._recomputarLineasTabla();
    this.cdr.markForCheck();

    if (this.articuloSeleccionadoCod) {
      setTimeout(() => {
        document.getElementById('tablaDetalle')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  }

  limpiarArticuloSeleccionado(): void {
    this.articuloSeleccionadoCod    = null;
    this.articuloSeleccionadoNombre = null;
    this._recomputarLineasTabla();
    this.cdr.markForCheck();
  }

  // ── Selección de agencia desde el panel de barras (toggle):
  //    filtra TODO por esa agencia; al re-seleccionar, ve todo. ──
  seleccionarAgencia(oficina: string): void {
    this.filtroOficina = (this.filtroOficina === oficina) ? '' : oficina;
    this.aplicarFiltros();
  }

  // ── Reconstruye lineasTabla (filtrado + drill-down de artículo),
  //    recalcula totales de la tabla, aplica orden y pagina. ─────
  private _recomputarLineasTabla(): void {
    const base = this.articuloSeleccionadoCod
      ? this.lineasFiltradas.filter(l => l.codArticulo === this.articuloSeleccionadoCod)
      : this.lineasFiltradas.slice();

    let costo = 0, precio = 0, descuento = 0;
    for (const l of base) {
      costo     += l.costoTotal     || 0;
      precio    += l.precioTotal    || 0;
      descuento += l.valorDescuento || 0;
    }
    this.totalCostoTabla     = costo;
    this.totalPrecioTabla    = precio;
    this.totalDescuentoTabla = descuento;
    this.margenTabla         = precio > 0
      ? Math.round(((precio - costo) / precio) * 10000) / 100 : 0;

    this.lineasTabla = base;
    this._ordenarLineas(this.lineasTabla);
    this.paginaActual = 1;
    this._recalcularPaginacion();
  }

  // ── Exporta a Excel los artículos de la clase actualmente vista ─
  exportarArticulosClase(): void {
    if (!this.articulosClaseSeleccionada.length) return;
    try {
      const rows = this.articulosClaseSeleccionada.map((a, i) => ({
        '#':              i + 1,
        'Cód. Artículo':  a.codArticulo,
        'Artículo':       a.nombre,
        'Clase':          a.clase,
        'Grupo':          a.grupo,
        'Cantidad':       a.cantidad,
        'Costo Total':    a.totalCosto,
        'Precio Total':   a.totalPrecio,
        'Margen %':       a.margenPct
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = Array(9).fill({ wch: 16 });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Artículos Clase');
      const fecha     = new Date().toISOString().split('T')[0];
      const claseSafe = (this.claseSeleccionada || 'CLASE').replace(/[^\w-]/g, '_');
      XLSX.writeFile(wb, `Articulos_${claseSafe}_${fecha}.xlsx`);
    } catch (err) {
      console.error('Error exportando artículos de clase:', err);
      alert('Error al exportar. Intente nuevamente.');
    }
  }

  // ── Ordena el panel de artículos de la clase por columna.
  //    Recalcula el Top 50 según el criterio elegido (no sólo
  //    reordena los 50 que ya estaban). ─────────────────────────
  ordenarArticulosClase(columna: 'precio' | 'cantidad' | 'margen'): void {
    if (this.ordenArtClaseCol === columna) {
      this.ordenArtClaseAsc = !this.ordenArtClaseAsc;
    } else {
      this.ordenArtClaseCol = columna;
      this.ordenArtClaseAsc = false;   // primer clic siempre descendente
    }
    this._aplicarOrdenArticulosClase();
    this.cdr.markForCheck();
  }

  iconoOrdenArtClase(columna: string): string {
    if (this.ordenArtClaseCol !== columna) return 'fas fa-sort';
    return this.ordenArtClaseAsc ? 'fas fa-sort-up' : 'fas fa-sort-down';
  }

  // Ordena la lista COMPLETA de la clase y recorta a los 50 primeros.
  private _aplicarOrdenArticulosClase(): void {
    const full = [...(this._articulosPorClase.get(this.claseSeleccionada) ?? [])];
    const dir  = this.ordenArtClaseAsc ? 1 : -1;

    full.sort((a, b) => {
      let va: number, vb: number;
      switch (this.ordenArtClaseCol) {
        case 'cantidad': va = a.cantidad   ?? 0; vb = b.cantidad   ?? 0; break;
        case 'margen':   va = a.margenPct  ?? 0; vb = b.margenPct  ?? 0; break;
        default:         va = a.totalPrecio ?? 0; vb = b.totalPrecio ?? 0; break;
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return  1 * dir;
      return 0;
    });

    this.articulosClaseSeleccionada = this.limiteArtClase > 0
      ? full.slice(0, this.limiteArtClase)
      : full;
    this.maxPrecioArticuloClase     =
      Math.max(...this.articulosClaseSeleccionada.map(a => a.totalPrecio), 1);
  }

  // Cambia la cantidad de artículos a mostrar por clase.
  cambiarLimiteArtClase(): void {
    this._aplicarOrdenArticulosClase();
    this.cdr.markForCheck();
  }

  // ── Paginación ───────────────────────────────────────────────
  private _recalcularPaginacion(): void {
    this.totalPaginas = Math.ceil(this.lineasTabla.length / this.itemsPorPagina);
    this._actualizarPaginaActual();
  }

  private _actualizarPaginaActual(): void {
    const ini = (this.paginaActual - 1) * this.itemsPorPagina;
    this.lineasPaginadas = this.lineasTabla.slice(ini, ini + this.itemsPorPagina);

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
    this._ordenarLineas(this.lineasTabla);
    this._actualizarPaginaActual();
    this.cdr.markForCheck();
  }

  // Ordena un arreglo de líneas según el estado actual de orden.
  private _ordenarLineas(arr: VentaTallerDetalle[]): void {
    const columna = this.columnaOrden;
    arr.sort((a, b) => {
      let va: any, vb: any;
      switch (columna) {
        case 'fecha':          va = a.fecha    ? new Date(a.fecha).getTime()    : 0;
                               vb = b.fecha    ? new Date(b.fecha).getTime()    : 0; break;
        case 'fechaOt':        va = a.fechaOt  ? new Date(a.fechaOt).getTime()  : 0;
                               vb = b.fechaOt  ? new Date(b.fechaOt).getTime()  : 0; break;
        case 'oficina':        va = a.oficina        ?? ''; vb = b.oficina        ?? ''; break;
        case 'tipoOt':         va = a.tipoOt         ?? ''; vb = b.tipoOt         ?? ''; break;
        case 'cliente':        va = a.cliente        ?? ''; vb = b.cliente        ?? ''; break;
        case 'nombreArticulo': va = a.nombreArticulo ?? ''; vb = b.nombreArticulo ?? ''; break;
        case 'clase':          va = a.clase          ?? ''; vb = b.clase          ?? ''; break;
        case 'grupo':          va = a.grupo          ?? ''; vb = b.grupo          ?? ''; break;
        case 'cantidad':       va = a.cantidad       ?? 0;  vb = b.cantidad       ?? 0;  break;
        case 'costoTotal':     va = a.costoTotal     ?? 0;  vb = b.costoTotal     ?? 0;  break;
        case 'precioTotal':    va = a.precioTotal    ?? 0;  vb = b.precioTotal    ?? 0;  break;
        case 'margen':
          va = a.precioTotal > 0 ? (a.precioTotal - a.costoTotal) / a.precioTotal : 0;
          vb = b.precioTotal > 0 ? (b.precioTotal - b.costoTotal) / b.precioTotal : 0; break;
        default: return 0;
      }
      if (va < vb) return this.ordenAscendente ? -1 : 1;
      if (va > vb) return this.ordenAscendente ? 1 : -1;
      return 0;
    });
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
  trackByLinea(index: number, l: VentaTallerDetalle): string {
    return (l.numDocumento ?? '') + '_' + (l.codArticulo ?? '') + '_' + index;
  }

  trackByNum(_index: number, n: number): number {
    return n;
  }

  trackByClase(_index: number, c: any): string {
    return c.clase;
  }

  trackByArticuloClase(_index: number, a: any): string {
    return a.codArticulo;
  }

  porcentajeBarra(valor: number, max: number): number {
    return max > 0 ? Math.round((valor / max) * 100) : 0;
  }

  claseMargen(pct: number): string {
    if (pct >= 30) return 'text-success fw-bold';
    if (pct >= 15) return 'text-warning fw-semibold';
    return 'text-danger fw-semibold';
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
  //  EXPORTAR EXCEL  (6 hojas)
  // ═══════════════════════════════════════════════════════════

  exportarExcel(): void {
    try {
      const detalle = this.lineasFiltradas.map(l => ({
        'Oficina':          l.oficina,
        'Tipo OT':          l.tipoOt,
        'Orden Trabajo':    l.ordenTrabajo,
        'Fecha OT':         this.formatearFecha(l.fechaOt),
        'Cliente':          l.cliente,
        'ID Cliente':       l.idCliente,
        'Nº Documento':     l.numDocumento,
        'Fecha Factura':    this.formatearFecha(l.fecha),
        'Clase':            l.clase,
        'Grupo':            l.grupo,
        'Cód. Artículo':    l.codArticulo,
        'Artículo':         l.nombreArticulo,
        'Cantidad':         l.cantidad,
        'Costo Unitario':   l.costoUnitario,
        'Costo Total':      l.costoTotal,
        'Precio Unitario':  l.precioUnitario,
        'Precio Total':     l.precioTotal,
        'Desc. %':          l.porcDescuento,
        'Desc. Valor':      l.valorDescuento,
        'Total S/IVA Doc':  l.valorTotalSinIva,
        'IVA Doc':          l.valorIva,
        'Total Doc':        l.total,
        'Usuario OT':       l.usuarioCrearOt,
        'Usuario Factura':  l.usuarioCrearFactura
      }));
      const ws1 = XLSX.utils.json_to_sheet(detalle);
      ws1['!cols'] = Array(24).fill({ wch: 16 });

      const ws2 = XLSX.utils.json_to_sheet(this.resumenPorTipoOt.map(r => ({
        'Tipo OT': r.tipoOt, 'OTs': r.cantOt, 'Facturas': r.cantFacturas,
        'Líneas': r.cantLineas, 'Total Costo': r.totalCosto,
        'Total Precio': r.totalPrecio, 'Margen %': r.margenPct
      })));

      const ws3 = XLSX.utils.json_to_sheet(this.resumenPorOficina.map(r => ({
        'Agencia': r.oficina, 'OTs': r.cantOt, 'Facturas': r.cantFacturas,
        'Total Costo': r.totalCosto, 'Total Precio': r.totalPrecio, 'Margen %': r.margenPct
      })));

      const ws4 = XLSX.utils.json_to_sheet(this.topArticulos.map(a => ({
        'Cód. Artículo': a.codArticulo, 'Artículo': a.nombre,
        'Clase': a.clase, 'Grupo': a.grupo, 'Cantidad': a.cantidad,
        'Total Costo': a.totalCosto, 'Total Precio': a.totalPrecio, 'Margen %': a.margenPct
      })));

      const ws5 = XLSX.utils.json_to_sheet(this.resumenPorClase.map(c => ({
        'Clase': c.clase, 'Líneas': c.cantLineas,
        'Total Costo': c.totalCosto, 'Total Precio': c.totalPrecio, 'Margen %': c.margenPct
      })));

      const ws6 = XLSX.utils.json_to_sheet(this.resumenPorMes.map(m => ({
        'Mes': m.etiqueta, 'Facturas': m.cantFacturas,
        'Total Costo': m.totalCosto, 'Total Precio': m.totalPrecio
      })));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, 'Detalle Líneas');
      XLSX.utils.book_append_sheet(wb, ws2, 'Por Tipo OT');
      XLSX.utils.book_append_sheet(wb, ws3, 'Por Agencia');
      XLSX.utils.book_append_sheet(wb, ws4, 'Top Artículos');
      XLSX.utils.book_append_sheet(wb, ws5, 'Por Clase');
      XLSX.utils.book_append_sheet(wb, ws6, 'Evolución Mensual');

      const fecha = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Facturas_Detalle_Talleres_${fecha}.xlsx`);
    } catch (err) {
      console.error('Error exportando Excel:', err);
      alert('Error al exportar. Intente nuevamente.');
    }
  }

  imprimirReporte(): void {
    window.print();
  }
}