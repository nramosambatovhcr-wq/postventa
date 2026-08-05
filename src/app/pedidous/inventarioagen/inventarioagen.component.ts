import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { InventarioService } from 'src/app/services/inventario.service';
import * as XLSX from 'xlsx-js-style';
import { Usuario } from 'src/app/models/usuario';
import { AuthService } from 'src/app/services/auth.service';
import { LogarithmicScale } from 'chart.js';

/**
 * ✅ Item normalizado del inventario que devuelve el endpoint de Oracle.
 * Se normaliza a minúsculas para no depender de cómo el serializador
 * (System.Text.Json) exponga las propiedades del DTO (UPPERCASE / camelCase / snake_case).
 */
interface InventarioAgenItem {
  oficina_id: string;
  oficina: string;
  bodega_id: string;
  bodega: string;
  clase_id: string;
  clase: string;
  grupo_id: string;
  grupo: string;
  articulo: string;
  nombre: string;
  ubicacion: string;
  linea_competencia: string;
  stock: number;
  stock_reservado: number;
  stock_disponible: number;
  fob: number;
  costo_uni: number;
  costo_total: number;
  costo_promedio: number;
  precio_sin_iva: number;
  /** ✅ Calculado en el cliente: stock_disponible × costo_uni */
  valor_disponible: number;
}

/** Mapa: ID numérico de agencia → código de bodega y nombre (solo para mostrar). */
const BODEGAS_MAP: Record<number, { codigo: string; nombre: string }> = {
   1: { codigo: 'B001', nombre: 'MATRIZ' },
   2: { codigo: 'B002', nombre: 'FICOA' },
   3: { codigo: 'B005', nombre: 'RIOBAMBA' },
   4: { codigo: 'B007', nombre: 'QUITO NORTE' },
   5: { codigo: 'B008', nombre: 'GUAYAQUIL SAMBORONDON' },
   6: { codigo: 'B009', nombre: 'MACHALA' },
   7: { codigo: 'B010', nombre: 'CUENCA' },
   8: { codigo: 'B011', nombre: 'QUITO SUR' },
   9: { codigo: 'B012', nombre: 'GUAYAQUIL SUR' },
  10: { codigo: 'B013', nombre: 'MANTA' },
  11: { codigo: 'B014', nombre: 'QUITO PIFO' },
  12: { codigo: 'B015', nombre: 'QUITO COLIBRI' },
  13: { codigo: 'B017', nombre: 'IBARRA' },
  14: { codigo: 'B018', nombre: 'CUENCA HUAYNA CAPAC' },
  15: { codigo: 'B019', nombre: 'QUITO GRANADOS' },
  16: { codigo: 'B021', nombre: 'CUENCA TALLERES' },
  17: { codigo: 'B022', nombre: 'GUAYAQUIL JUAN TANCA' },
  18: { codigo: 'B023', nombre: 'YANTZAZA' },
  19: { codigo: 'B024', nombre: 'QUITO NACIONES UNIDAS' },
  20: { codigo: 'B025', nombre: 'FICOA LYNC & CO' },
};

@Component({
  selector: 'app-inventarioagen',
  templateUrl: './inventarioagen.component.html',
  styleUrls: ['./inventarioagen.component.css']
})
export class InventarioagenComponent implements OnInit, OnDestroy {

  /** Opcional: id numérico de agencia (para resolver el nombre y prellenar el código). */
  @Input() agenciaId: number = 0;
  /** Opcional: código de agencia (OFICINA_ID en Oracle) para cargar directo. */
  @Input() codigoAgencia: string = '';

  // Datos
  items: InventarioAgenItem[] = [];
  itemsFiltrados: InventarioAgenItem[] = [];
  itemsPaginados: InventarioAgenItem[] = [];

  // Info de agencia (solo visual)
  agenciaNombre: string = '';

  // Filtros
  busquedaTexto: string = '';
  private busquedaTexto$ = new Subject<string>();
  private busquedaSub?: Subscription;
  filtroClaseId: string = 'todas';
  filtroGrupoId: string = 'todos';
  ordenCosto: string = 'ninguno';
  clasesDisponibles: string[] = [];
  gruposDisponibles: string[] = [];
  filtrosActivosCount: number = 0;

  // Ordenamiento por cabeceras
  columnaOrden: string = '';
  direccionOrden: 'asc' | 'desc' = 'asc';

  // Estadísticas
  totalArticulos: number = 0;
  totalUnidadesDisponibles: number = 0;
  valorTotalInventario: number = 0;

  // Estado de carga
  cargando: boolean = false;
  errorMensaje: string = '';

  // Acordeones
  filtrosAbiertos: boolean = true;
  estadisticasAbiertas: boolean = true;

  // Paginación
  paginaActual: number = 1;
  itemsPorPagina: number = 100;
  totalPaginas: number = 0;
  readonly opcionesItemsPorPagina: number[] = [50, 100, 200, 500, 1000, 2000];
  private paginasArrayCache: number[] = [];

  // Para usar Math en el template
  Math = Math;

  usuario: Usuario | null = null;
  id: number = 0;
  rol: any;
  agen: string = '';
  private authSub?: Subscription;

  constructor(
    private inventarioService: InventarioService,
    private authService: AuthService,
    private route: ActivatedRoute
  ) {}

 ngOnInit(): void {
    // Resolver agenciaId desde el input o la ruta (para el nombre a mostrar)
    if (!this.agenciaId) {
      const paramId = this.route.snapshot.paramMap.get('id');
      this.agenciaId = paramId ? Number(paramId) : 0;
    }

    // Si ya llegó por @Input, usar el mapa para el nombre
    this.setNombreAgencia();

    // Acordeones: cerrados en móvil, abiertos en escritorio
    this.filtrosAbiertos = window.innerWidth > 768;
    this.estadisticasAbiertas = window.innerWidth > 768;

    // Búsqueda con debounce (no filtra en cada tecla)
    this.busquedaSub = this.busquedaTexto$.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => this.aplicarFiltros());

    // ✅ Sacar la agencia del usuario logueado (igual que en conteoglobal)
    this.authSub = this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      console.log(this.usuario);
      
      if (this.usuario != null) {
        this.id  = this.usuario.id;
        this.rol = this.usuario.rol;
        this.agen = this.usuario.agencia;

        // Si NO vino un código por @Input, tomamos el de la agencia del usuario.
        if (!this.codigoAgencia || this.codigoAgencia.trim() === '') {
          this.codigoAgencia = this.resolverCodigoAgencia(this.usuario);
          console.log(this.codigoAgencia);
          
        }

        this.setNombreAgencia();

        // Cargar una sola vez (usuarioActual$ puede emitir varias veces)
        if (this.codigoAgencia && this.codigoAgencia.trim() !== ''
            && this.items.length === 0 && !this.cargando) {
          this.cargarInventario();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
    this.busquedaSub?.unsubscribe();
    this.busquedaTexto$.complete();
  }
  /** Pone el nombre de la agencia a partir del agenciaId (solo visual). */
 /** Pone el nombre de la agencia (solo visual). */
  private setNombreAgencia(): void {
    const codigo = (this.codigoAgencia || '').trim();

    // 1) Por código de oficina: "008" → busca "B008" en el mapa
    if (codigo) {
      const objetivo = ('B' + codigo).toUpperCase();
      const entry = Object.values(BODEGAS_MAP).find(b => b.codigo.toUpperCase() === objetivo);
      if (entry) { this.agenciaNombre = entry.nombre; return; }
    }

    // 2) Si vino agenciaId (1..20) por @Input o ruta
    if (this.agenciaId && BODEGAS_MAP[this.agenciaId]) {
      this.agenciaNombre = BODEGAS_MAP[this.agenciaId].nombre;
      return;
    }

    // 3) Fallback: el nombre que ya trae el usuario
    if (this.usuario?.agencia) {
      this.agenciaNombre = this.usuario.agencia;
    }
  }

  /**
   * Resuelve el código de oficina (OFICINA_ID de Oracle, ej. "002") a partir
   * del usuario. Ajusta este método según el valor real de tu `usuario.agencia`.
   */
  private resolverCodigoAgencia(usuario: any): string {
    return String(usuario?.idAgencia ?? '').trim();
  }

  /** trackBy para no recrear todas las filas al filtrar/ordenar. */
  trackByArticulo(index: number, item: InventarioAgenItem): string {
    return item.articulo || String(index);
  }

  // ══════════════════════════════════════════════════════════════
  //  CARGA DE DATOS
  // ══════════════════════════════════════════════════════════════

  cargarInventario(): void {
    const codigo = (this.codigoAgencia || '').trim();
    if (!codigo) {
      this.errorMensaje = 'Ingrese el código de la agencia';
      return;
    }

    this.cargando = true;
    this.errorMensaje = '';
    this.items = [];
    this.itemsFiltrados = [];
    this.itemsPaginados = [];

    this.inventarioService.obtenerInventarioOracle(codigo).subscribe({
      next: (resp) => {
        // El endpoint devuelve { Mensaje, Agencia, Total, Inventario } o (si se cambió) el array plano.
        const lista: any[] = Array.isArray(resp)
          ? resp
          : (resp?.Inventario ?? resp?.inventario ?? resp?.datos ?? resp?.data ?? []);

        this.items = (lista || []).map(raw => this.normalizarItem(raw));

        // Extraer clases y grupos únicos para los filtros
        const clasesSet = new Set<string>();
        const gruposSet = new Set<string>();
        this.items.forEach(it => {
          if (it.clase_id) clasesSet.add(it.clase_id);
          if (it.grupo_id) gruposSet.add(it.grupo_id);
        });
        this.clasesDisponibles = Array.from(clasesSet).sort((a, b) => a.localeCompare(b));
        this.gruposDisponibles = Array.from(gruposSet).sort((a, b) => a.localeCompare(b));

        this.totalArticulos = this.items.length;
        this.paginaActual = 1;
        this.aplicarFiltros();
        this.actualizarEstadisticas();
        this.cargando = false;

        if (this.items.length === 0) {
          this.errorMensaje = 'No se encontraron datos en Oracle para la agencia especificada';
        }
      },
      error: (error) => {
        this.errorMensaje = 'Error al cargar: ' + (error?.message || 'Error desconocido');
        this.cargando = false;
      }
    });
  }

  refrescar(): void {
    this.cargarInventario();
  }

  /** Lee el primer valor presente entre varias posibles claves (distintas capitalizaciones). */
  private pick(obj: any, ...keys: string[]): any {
    for (const k of keys) {
      if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return undefined;
  }

  private toNum(v: any): number {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }

  private toStr(v: any): string {
    return v === undefined || v === null ? '' : String(v).trim();
  }

  /** Normaliza un registro crudo de Oracle a la forma interna en minúsculas. */
  private normalizarItem(raw: any): InventarioAgenItem {
    const stockDisponible = this.toNum(this.pick(raw, 'STOCK_DISPONIBLE', 'stock_disponible', 'sTOCK_DISPONIBLE', 'stockDisponible'));
    const costoUni = this.toNum(this.pick(raw, 'COSTO_UNI', 'costo_uni', 'cOSTO_UNI', 'costoUni'));

    return {
      oficina_id: this.toStr(this.pick(raw, 'OFICINA_ID', 'oficina_id', 'oFICINA_ID', 'oficinaId')),
      oficina: this.toStr(this.pick(raw, 'OFICINA', 'oficina')),
      bodega_id: this.toStr(this.pick(raw, 'BODEGA_ID', 'bodega_id', 'bODEGA_ID', 'bodegaId')),
      bodega: this.toStr(this.pick(raw, 'BODEGA', 'bodega')),
      clase_id: this.toStr(this.pick(raw, 'CLASE_ID', 'clase_id', 'cLASE_ID', 'claseId', 'clasE_ID')),
      clase: this.toStr(this.pick(raw, 'CLASE', 'clase')),
      grupo_id: this.toStr(this.pick(raw, 'GRUPO_ID', 'grupo_id', 'gRUPO_ID', 'grupoId','grupO_ID')),
      grupo: this.toStr(this.pick(raw, 'GRUPO', 'grupo')),
      articulo: this.toStr(this.pick(raw, 'ARTICULO', 'articulo', 'aRTICULO')),
      nombre: this.toStr(this.pick(raw, 'NOMBRE', 'nombre')),
      ubicacion: this.toStr(this.pick(raw, 'UBICACION', 'ubicacion', 'uBICACION')),
      linea_competencia: this.toStr(this.pick(raw, 'LINEA_COMPETENCIA', 'linea_competencia', 'lINEA_COMPETENCIA', 'lineaCompetencia')),
      stock: this.toNum(this.pick(raw, 'STOCK', 'stock')),
      stock_reservado: this.toNum(this.pick(raw, 'STOCK_RESERVADO', 'stock_reservado', 'sTOCK_RESERVADO', 'stockReservado')),
      stock_disponible: stockDisponible,
      fob: this.toNum(this.pick(raw, 'FOB', 'fob')),
      costo_uni: costoUni,
      costo_total: this.toNum(this.pick(raw, 'COSTO_TOTAL', 'costo_total', 'cOSTO_TOTAL', 'costoTotal')),
      costo_promedio: this.toNum(this.pick(raw, 'COSTO_PROMEDIO', 'costo_promedio', 'cOSTO_PROMEDIO', 'costoPromedio')),
      precio_sin_iva: this.toNum(this.pick(raw, 'PRECIO_SIN_IVA', 'precio_sin_iva', 'pRECIO_SIN_IVA', 'precioSinIva')),
      valor_disponible: parseFloat((stockDisponible * costoUni).toFixed(2))
    };
  }

  // ══════════════════════════════════════════════════════════════
  //  FILTROS / ORDEN / PAGINACIÓN
  // ══════════════════════════════════════════════════════════════

  onBusquedaTextoChange(valor: string): void {
    this.busquedaTexto$.next(valor);
  }

  aplicarFiltros(): void {
    // Contador de filtros activos
    let activos = 0;
    if (this.busquedaTexto && this.busquedaTexto.trim() !== '') activos++;
    if (this.filtroClaseId !== 'todas') activos++;
    if (this.filtroGrupoId !== 'todos') activos++;
    if (this.ordenCosto !== 'ninguno') activos++;
    this.filtrosActivosCount = activos;

    let resultados = [...this.items];

    if (this.busquedaTexto && this.busquedaTexto.trim() !== '') {
      const texto = this.busquedaTexto.toLowerCase().trim();
      resultados = resultados.filter(it =>
        it.articulo.toLowerCase().includes(texto) ||
        it.nombre.toLowerCase().includes(texto)
      );
    }

    if (this.filtroClaseId !== 'todas') {
      resultados = resultados.filter(it => it.clase_id === this.filtroClaseId);
    }

    if (this.filtroGrupoId !== 'todos') {
      resultados = resultados.filter(it => it.grupo_id === this.filtroGrupoId);
    }

    if (this.ordenCosto === 'mayor') {
      resultados.sort((a, b) => b.costo_uni - a.costo_uni);
    } else if (this.ordenCosto === 'menor') {
      resultados.sort((a, b) => a.costo_uni - b.costo_uni);
    }

    if (this.columnaOrden) {
      const dir = this.direccionOrden === 'asc' ? 1 : -1;
      resultados.sort((a, b) => {
        let valA: any;
        let valB: any;
        switch (this.columnaOrden) {
          case 'articulo':    valA = a.articulo; valB = b.articulo; break;
          case 'nombre':      valA = a.nombre; valB = b.nombre; break;
          case 'clase_id':    valA = a.clase_id; valB = b.clase_id; break;
          case 'grupo_id':    valA = a.grupo_id; valB = b.grupo_id; break;
          case 'ubicacion':   valA = a.ubicacion; valB = b.ubicacion; break;
          case 'stock':       valA = a.stock; valB = b.stock; break;
          case 'reserva':     valA = a.stock_reservado; valB = b.stock_reservado; break;
          case 'disponible':  valA = a.stock_disponible; valB = b.stock_disponible; break;
          case 'costo':       valA = a.costo_uni; valB = b.costo_uni; break;
          case 'precio':      valA = a.precio_sin_iva; valB = b.precio_sin_iva; break;
          case 'valor':       valA = a.valor_disponible; valB = b.valor_disponible; break;
          default: return 0;
        }
        if (typeof valA === 'string') return valA.localeCompare(valB) * dir;
        return (valA - valB) * dir;
      });
    }

    this.itemsFiltrados = resultados;
    this.totalPaginas = Math.ceil(this.itemsFiltrados.length / this.itemsPorPagina);

    if (this.paginaActual > this.totalPaginas && this.totalPaginas > 0) {
      this.paginaActual = 1;
    }

    this.recalcularPagina();
  }

  private recalcularPagina(): void {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    this.itemsPaginados = this.itemsFiltrados.slice(inicio, fin);
    this.paginasArrayCache = this.construirVentanaPaginas();
  }

  private construirVentanaPaginas(): number[] {
    const total = this.totalPaginas;
    const actual = this.paginaActual;

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const vecinos = 1;
    const inicio = Math.max(2, actual - vecinos);
    const fin = Math.min(total - 1, actual + vecinos);

    const paginas: number[] = [1];
    if (inicio > 2) paginas.push(-1);
    for (let i = inicio; i <= fin; i++) paginas.push(i);
    if (fin < total - 1) paginas.push(-1);
    paginas.push(total);
    return paginas;
  }

  getPaginasArray(): number[] {
    return this.paginasArrayCache;
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
      this.recalcularPagina();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  cambiarItemsPorPagina(): void {
    this.paginaActual = 1;
    this.aplicarFiltros();
  }

  ordenarPor(columna: string): void {
    if (this.columnaOrden === columna) {
      this.direccionOrden = this.direccionOrden === 'asc' ? 'desc' : 'asc';
    } else {
      this.columnaOrden = columna;
      this.direccionOrden = 'asc';
    }
    this.aplicarFiltros();
  }

  getSortClass(columna: string): string {
    if (this.columnaOrden !== columna) return 'sort-neutral';
    return this.direccionOrden === 'asc' ? 'sort-asc' : 'sort-desc';
  }

  limpiarFiltros(): void {
    this.busquedaTexto = '';
    this.filtroClaseId = 'todas';
    this.filtroGrupoId = 'todos';
    this.ordenCosto = 'ninguno';
    this.columnaOrden = '';
    this.aplicarFiltros();
  }

  toggleFiltros(): void {
    this.filtrosAbiertos = !this.filtrosAbiertos;
  }

  toggleEstadisticas(): void {
    this.estadisticasAbiertas = !this.estadisticasAbiertas;
  }

  actualizarEstadisticas(): void {
    let unidades = 0;
    let valor = 0;
    for (const it of this.items) {
      unidades += it.stock_disponible;
      valor += it.valor_disponible;
    }
    this.totalUnidadesDisponibles = unidades;
    this.valorTotalInventario = parseFloat(valor.toFixed(2));
  }

  // ══════════════════════════════════════════════════════════════
  //  EXPORTAR A EXCEL (xlsx-js-style)
  // ══════════════════════════════════════════════════════════════

  exportarExcel(): void {
    if (this.items.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    // Se exporta lo que está filtrado (si no hay filtros, es todo).
    const fuente = this.itemsFiltrados.length > 0 ? this.itemsFiltrados : this.items;

    const encabezados = [
      'Artículo', 'Nombre', 'Ubicación', 'Clase', 'Grupo',
      'Stock', 'Reservado', 'Disponible',
      'Costo Unit.', 'Costo Total', 'Costo Prom.', 'Precio s/IVA', 'FOB',
      'Valor Disponible'
    ];

    const filas = fuente.map(it => ([
      it.articulo,
      it.nombre,
      it.ubicacion,
      it.clase_id || it.clase,
      it.grupo_id || it.grupo,
      it.stock,
      it.stock_reservado,
      it.stock_disponible,
      it.costo_uni,
      it.costo_total,
      it.costo_promedio,
      it.precio_sin_iva,
      it.fob,
      it.valor_disponible
    ]));

    // Fila de totales
    const totalDisp = fuente.reduce((s, it) => s + it.stock_disponible, 0);
    const totalValor = fuente.reduce((s, it) => s + it.valor_disponible, 0);
    const filaTotales = [
      'TOTALES', '', '', '', '', '', '', totalDisp, '', '', '', '', '',
      parseFloat(totalValor.toFixed(2))
    ];

    const aoa = [encabezados, ...filas, filaTotales];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Estilo del encabezado
    const estiloHeader = {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
      fill: { fgColor: { rgb: '2563EB' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin', color: { rgb: 'CBD5E1' } },
        bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
        left: { style: 'thin', color: { rgb: 'CBD5E1' } },
        right: { style: 'thin', color: { rgb: 'CBD5E1' } }
      }
    };

    const bordeFino = {
      top: { style: 'thin', color: { rgb: 'E5E7EB' } },
      bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
      left: { style: 'thin', color: { rgb: 'E5E7EB' } },
      right: { style: 'thin', color: { rgb: 'E5E7EB' } }
    };

    const range = XLSX.utils.decode_range(ws['!ref'] as string);
    const numColsMoneda = new Set([8, 9, 10, 11, 12, 13]); // costos, precio, fob, valor
    const numColsEntero = new Set([5, 6, 7]);               // stock, reservado, disponible

    for (let R = range.s.r; R <= range.e.r; R++) {
      const esHeader = R === 0;
      const esTotales = R === range.e.r;
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[addr];
        if (!cell) continue;

        if (esHeader) {
          cell.s = estiloHeader;
          continue;
        }

        const s: any = {
          border: bordeFino,
          alignment: { vertical: 'center' },
          font: { sz: 10 }
        };

        // Filas alternas (cebra)
        if (!esTotales && R % 2 === 0) {
          s.fill = { fgColor: { rgb: 'F1F5F9' } };
        }

        // Formato numérico
        if (numColsMoneda.has(C)) {
          cell.z = '#,##0.00';
          s.alignment = { horizontal: 'right', vertical: 'center' };
        } else if (numColsEntero.has(C)) {
          cell.z = '#,##0';
          s.alignment = { horizontal: 'right', vertical: 'center' };
        }

        // Fila de totales resaltada
        if (esTotales) {
          s.font = { bold: true, sz: 10 };
          s.fill = { fgColor: { rgb: 'DBEAFE' } };
        }

        cell.s = s;
      }
    }

    // Anchos de columna
    ws['!cols'] = [
      { wch: 12 }, // Artículo
      { wch: 40 }, // Nombre
      { wch: 12 }, // Ubicación
      { wch: 10 }, // Clase
      { wch: 10 }, // Grupo
      { wch: 9 },  // Stock
      { wch: 10 }, // Reservado
      { wch: 11 }, // Disponible
      { wch: 12 }, // Costo Unit.
      { wch: 13 }, // Costo Total
      { wch: 12 }, // Costo Prom.
      { wch: 12 }, // Precio s/IVA
      { wch: 11 }, // FOB
      { wch: 15 }  // Valor Disponible
    ];

    // Congelar encabezado
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

    const fecha = new Date().toISOString().split('T')[0];
    const hora = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const nombreArchivo = `inventario_${this.codigoAgencia || 'agencia'}_${fecha}_${hora}.xlsx`;

    XLSX.writeFile(wb, nombreArchivo);
  }
}