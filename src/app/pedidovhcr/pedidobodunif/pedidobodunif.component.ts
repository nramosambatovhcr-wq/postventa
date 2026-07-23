import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import saveAs from 'file-saver';
import { forkJoin, Subscription } from 'rxjs';
import { Usuario } from '../../models/usuario';
import { AuthService } from '../../services/auth.service';
import { PedidobodegaService } from '../../services/pedidobodega.service';
import { ReloadService } from '../../services/reload.service';
import * as XLSX from 'xlsx';
import { EquivalentesService } from 'src/app/services/equivalentes.service';
import { OracleService } from 'src/app/services/oracle.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Proveedor, ProveedorService } from 'src/app/services/proveedor.service';

export interface Pedido {
  id_pedido?: number;
  codigo: string;
  descripcion: string;
  cantidad: number;
  observaciones?: string;
  estado?: string;
  idUsuarioCreacion?: number;
  idUsuarioModificacion?: number;
  modelo?: string;
  cliente?: string;
  ot?: string;
  nombre?: string;
  apellido?: string;
  fecha_creacion?: Date;
  imagenes?: string[];
  compra_local?: boolean;
  proveedor?: string;
  fecha_entrega?: string;
}

export interface BusquedaHistorial {
  termino: string;
  fecha: string;
  resultadosCount?: number;
}

// Pestañas de navegación visibles
type PaginaActual = 'todos' | 'clocal' | 'asignado' | 'estadisticas';

@Component({
  selector: 'app-pedidobodunif',
  templateUrl: './pedidobodunif.component.html',
  styleUrls: ['./pedidobodunif.component.css']
})
export class PedidobodunifComponent implements OnInit, OnDestroy {

  // ── Estado de navegación ──────────────────────────────────────────────────
  paginaActual: PaginaActual = 'todos';

  // ── Datos ─────────────────────────────────────────────────────────────────
  lista: any[]        = [];
  allData: any[]      = [];   // bruto del backend (sin filtros)
  allData1: any[]     = [];   // filtrado por rol
  filteredData: any[] = [];   // filtrado por fecha + texto + estado

  // ── Usuario ───────────────────────────────────────────────────────────────
  id = 0;
  usuario: Usuario | null = null;
  usrol = '';

  // ── Paginación ────────────────────────────────────────────────────────────
  currentPage  = 1;
  itemsPerPage = 100;
  totalPages   = 0;
  totalItems   = 0;

  // ── Búsqueda y filtros ────────────────────────────────────────────────────
  searchTerm     = '';
  startDate      = '';
  endDate        = '';
  filtroEstado   = '';      // ← select de filtro por estado (NUEVO)
  showExportMenu = false;
  loading        = false;

  // ── Ordenamiento de tabla (NUEVO) ─────────────────────────────────────────
  sortColumn    = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // ── Contadores estadísticos (NUEVO) ───────────────────────────────────────
  cntTotal     = 0;
  cntPendiente = 0;
  cntClocal    = 0;
  cntProceso   = 0;
  cntAsignado  = 0;
  cntRevisado  = 0;
  cntError     = 0;

  // ── Modales generales ─────────────────────────────────────────────────────
  selectedImageUrl          = '';
  isModalOpen               = false;
  selectedPedido: Pedido | null = null;
  observacionesModalVisible = false;
  showSearchModal           = false;
  showNuevoBuscador         = false;
  showObservacionesModal1   = false;
  selectedPedidoId: number | null = null;

  // ── Modal de Stock ────────────────────────────────────────────────────────
  infoStockModalVisible    = false;
  busquedaCodigo           = '';
  stockMaster: any         = null;
  stockAgencias: any[]     = [];
  totalUnidadesDisponibles = 0;
  mensajeSinStock          = '';
  activeTab: 'stock' | 'buscar' | 'equivalentes' = 'stock';
  equivCodes: string[]     = [];
  equivStockMap: { [codigo: string]: number } = {};
  equivAgenciasMap: { [codigo: string]: { oficina: string; stock: number }[] } = {};

  // ── Modal Proveedor (NUEVO) ───────────────────────────────────────────────
  proveedores: Proveedor[]                 = [];
  proveedorForm: FormGroup;
  showProveedorModal                        = false;
  selectedPedidoForProveedor: Pedido | null = null;
  selectedFile: File | null                 = null;

  // ── Historial de búsquedas ────────────────────────────────────────────────
  historialBusquedas: BusquedaHistorial[] = [];
  private readonly MAX_HISTORIAL = 20;
  terminoBusquedaModal = '';

  // ── Stats (vista revisado – preservado del original) ──────────────────────
  stats = { totalImportaciones: 0, enTransito: 0, pendientesLiquidacion: 0, tiempoPromedio: 28 };

  private subscription = new Subscription();

  // ── Títulos por pestaña ───────────────────────────────────────────────────
  readonly CONFIG_PAGINA: Record<PaginaActual, { titulo: string; subtitulo: string }> = {
    todos:        { titulo: 'Dashboard General – Todos los Pedidos',    subtitulo: 'Vista completa de todos los pedidos' },
    clocal:       { titulo: 'Dashboard de Pedidos Compra Local',         subtitulo: 'Monitoreo de pedidos marcados como compra local' },
    asignado:     { titulo: 'Dashboard de Pedidos Asignados de Bodega', subtitulo: 'Monitoreo en tiempo real de los pedidos asignados' },
    estadisticas: { titulo: 'Estadísticas de Pedidos',                  subtitulo: 'Resumen y métricas de todos los estados' }
  };

  constructor(
    private router: Router,
    private tutorialService: PedidobodegaService,
    private reloadService: ReloadService,
    private authService: AuthService,
    public oracleService: OracleService,
    private equivService: EquivalentesService,
    private fb: FormBuilder,
    private proveedorService: ProveedorService
  ) {
    this.proveedorForm = this.fb.group({
      id_proveedor:     ['', Validators.required],
      fecha_cotizacion: [new Date().toISOString().split('T')[0], Validators.required],
      fecha_entrega:    ['', Validators.required],
      numero_factura:   ['', Validators.required],
      factura_archivo:  [null]
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  //  CICLO DE VIDA
  // ════════════════════════════════════════════════════════════════════════

  ngOnInit(): void {
    this.initDateFilter();

    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      if (this.usuario) {
        this.id    = this.usuario.id;
        this.usrol = this.usuario.rol;
        this.cargarHistorialBusquedas();
        this.cargarDatos();
        this.proveedorService.getProveedores().subscribe(data => this.proveedores = data);
      }
    });

    this.subscription.add(
      this.reloadService.reload$.subscribe(() => this.cargarDatos())
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  NAVEGACIÓN ENTRE PESTAÑAS (sin cambiar de ruta)
  // ════════════════════════════════════════════════════════════════════════

  irA(pagina: PaginaActual): void {
    if (this.paginaActual === pagina) return;
    this.paginaActual  = pagina;
    this.currentPage   = 1;
    this.searchTerm    = '';
    this.filtroEstado  = '';
    this.sortColumn    = '';
    this.sortDirection = 'asc';
    this.initDateFilter();
    this.cargarDatos();
  }

  get tituloPagina(): string    { return this.CONFIG_PAGINA[this.paginaActual].titulo; }
  get subtituloPagina(): string { return this.CONFIG_PAGINA[this.paginaActual].subtitulo; }

  // ════════════════════════════════════════════════════════════════════════
  //  CARGA DE DATOS
  // ════════════════════════════════════════════════════════════════════════

  cargarDatos(): void {
    this.loading = true;

    if (this.paginaActual === 'clocal') {
      // Vista COMPRA LOCAL: endpoint propio, filtra solo compra_local = true
      this.tutorialService.clocal().subscribe({
        next: (data: any) => {
          const arr = Array.isArray(data) ? data : [];
          this.allData = arr.filter((item: any) => item?.compra_local === true);
          this.procesarDatos();
        },
        error: (err: any) => { console.error('Error al cargar datos:', err); this.loading = false; }
      });
    } else if (this.paginaActual === 'asignado') {
      // Vista ASIGNADO: endpoint específico (igual que el original)
      this.tutorialService.pedidosasignado().subscribe({
        next: (data: any) => {
          this.allData = Array.isArray(data) ? data : [];
          this.procesarDatos();
        },
        error: (err: any) => { console.error('Error al cargar datos:', err); this.loading = false; }
      });
    } else {
      // TODOS y ESTADÍSTICAS: todos los endpoints en paralelo + deduplicación
      forkJoin([
        this.tutorialService.pedidos(),
        this.tutorialService.clocal(),
        this.tutorialService.pedidosprocesado(),
        this.tutorialService.pedidosasignado(),
        this.tutorialService.revisados(),
        this.tutorialService.erroneos()
      ]).subscribe({
        next: (results: any[]) => {
          const todo = results.reduce(
            (acc: any[], arr: any) => acc.concat(Array.isArray(arr) ? arr : []), []
          );
          const seen = new Set<number>();
          this.allData = todo.filter((item: any) => {
            if (seen.has(item.id_pedido)) return false;
            seen.add(item.id_pedido); return true;
          });
          this.procesarDatos();
        },
        error: (err: any) => { console.error('Error al cargar datos:', err); this.loading = false; }
      });
    }
  }

  /**
   * Lógica común post-carga: aplica filtro de rol, recalcula estadísticas,
   * aplica filtros activos y actualiza la paginación.
   * Preserva calcularStats() para compatibilidad con la vista revisado.
   */
  private procesarDatos(): void {
    this.allData1     = this.filtrarPorRol(this.allData);
    this.filteredData = [...this.allData1];
    this.totalItems   = this.filteredData.length;

    // Preservado del original: stats para vista revisado
    this.calcularStats();
    // NUEVO: contadores por estado para la barra superior
    this.recalcularContadores();

    if (this.startDate && this.endDate) {
      this.applyDateFilter();
    } else {
      this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
      this.updatePageData();
    }

    this.loading = false;
  }

  /**
   * resolverPeticion: conservado del original con todos los 6 estados.
   * Se usa internamente cuando se necesita un endpoint específico.
   */
  private resolverPeticion(estado: string = this.paginaActual) {
    switch (estado) {
      case 'pendiente': return this.tutorialService.pedidos();
      case 'clocal':    return this.tutorialService.clocal();
      case 'proceso':   return this.tutorialService.pedidosprocesado();
      case 'asignado':  return this.tutorialService.pedidosasignado();
      case 'revisado':  return this.tutorialService.revisados();
      case 'error':     return this.tutorialService.erroneos();
      default:          return this.tutorialService.pedidos();
    }
  }

  /** Filtra el dataset completo según el rol del usuario (preservado del original) */
  private filtrarPorRol(data: any[]): any[] {
    const filtros: Record<string, string> = {
      repuestoslv:  'sl',
      repuestoslk:  'lc',
      repuestoslsc: 'sw',
      repuestos:    'sp'
    };
    const modelo = filtros[this.usrol];
    return modelo ? data.filter(item => item?.modelo === modelo) : data;
  }

  /** Preservado del original: calcula el objeto stats para la vista revisado */
  private calcularStats(): void {
    this.stats = {
      totalImportaciones:    this.allData.length,
      enTransito:            this.allData.filter(i => i.estado === 'Revisado').length,
      pendientesLiquidacion: this.allData.filter(i => i.liquidacion === 'Pendiente').length,
      tiempoPromedio: 28
    };
  }

  // ════════════════════════════════════════════════════════════════════════
  //  ESTADÍSTICAS (NUEVO)
  // ════════════════════════════════════════════════════════════════════════

  /** Recalcula los contadores de la barra superior siempre sobre allData1 */
  private recalcularContadores(): void {
    this.cntTotal     = this.allData1.length;
    this.cntPendiente = this.allData1.filter(i => i.estado === 'PENDIENTE' && !i.compra_local).length;
    this.cntClocal    = this.allData1.filter(i => i.compra_local === true).length;
    this.cntProceso   = this.allData1.filter(i => i.estado === 'PROCESO').length;
    this.cntAsignado  = this.allData1.filter(i => i.estado === 'ASIGNADO').length;
    this.cntRevisado  = this.allData1.filter(i => i.estado === 'REVISADO').length;
    this.cntError     = this.allData1.filter(i => i.estado === 'ERRONEO').length;
  }

  /** Datos para la vista de estadísticas (barras + tarjetas) */
  get estadisticasPorEstado(): { estado: string; total: number; porcentaje: number; color: string }[] {
    const grupos = [
      { estado: 'PENDIENTE',    total: this.cntPendiente, color: '#e17055' },
      { estado: 'COMPRA LOCAL', total: this.cntClocal,    color: '#fdcb6e' },
      { estado: 'EN PROCESO',   total: this.cntProceso,   color: '#0984e3' },
      { estado: 'ASIGNADO',     total: this.cntAsignado,  color: '#6c5ce7' },
      { estado: 'FINALIZADO',   total: this.cntRevisado,  color: '#00b894' },
      { estado: 'ERRÓNEO',      total: this.cntError,     color: '#d63031' },
    ];
    return grupos.map(g => ({
      ...g,
      porcentaje: this.cntTotal > 0 ? Math.round((g.total / this.cntTotal) * 100) : 0
    }));
  }

  // ════════════════════════════════════════════════════════════════════════
  //  ORDENAMIENTO DE TABLA (NUEVO)
  // ════════════════════════════════════════════════════════════════════════

  sortBy(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column; this.sortDirection = 'asc';
    }
    this.filteredData = [...this.filteredData].sort((a, b) => {
      let vA: any = a[column] ?? '';
      let vB: any = b[column] ?? '';
      if (column === 'fecha_creacion') { vA = new Date(vA).getTime(); vB = new Date(vB).getTime(); }
      if (column === 'cantidad')       { vA = Number(vA); vB = Number(vB); }
      if (typeof vA === 'string') vA = vA.toLowerCase();
      if (typeof vB === 'string') vB = vB.toLowerCase();
      if (vA < vB) return this.sortDirection === 'asc' ? -1 : 1;
      if (vA > vB) return this.sortDirection === 'asc' ?  1 : -1;
      return 0;
    });
    this.currentPage = 1; this.updatePageData();
  }

  sortIcon(column: string): string {
    if (this.sortColumn !== column) return ' ↕';
    return this.sortDirection === 'asc' ? ' ↑' : ' ↓';
  }

  // ════════════════════════════════════════════════════════════════════════
  //  PAGINACIÓN
  // ════════════════════════════════════════════════════════════════════════

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
    const { totalPages, currentPage } = this;
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);

    const pages: number[] = [1];
    if (currentPage > 3) pages.push(-1);
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push(-1);
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  }

  // ════════════════════════════════════════════════════════════════════════
  //  FILTROS (combinados: fecha + texto + estado)
  // ════════════════════════════════════════════════════════════════════════

  private initDateFilter(): void {
    const now = new Date();
    this.startDate = this.formatDateForInput(new Date(now.getFullYear(), now.getMonth(), 1));
    this.endDate   = this.formatDateForInput(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  }

  /** Aplica todos los filtros activos (fecha + texto + estado) sobre allData1 */
  private aplicarTodosFiltros(): void {
    let base = [...this.allData1];

    // Filtro de fechas
    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end   = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);
      base = base.filter(item => {
        const d = new Date(item.fecha_creacion);
        return d >= start && d <= end;
      });
    }

    // Filtro de texto
    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      base = base.filter(item =>
        (item.codigo        && item.codigo.toLowerCase().includes(term)) ||
        (item.descripcion   && item.descripcion.toLowerCase().includes(term)) ||
        (item.observaciones && item.observaciones.toLowerCase().includes(term))
      );
    }

    // Filtro por estado (select)
    if (this.filtroEstado) {
      if (this.filtroEstado === 'CLOCAL') {
        base = base.filter(item => item.compra_local === true);
      } else {
        base = base.filter(item => item.estado === this.filtroEstado);
      }
    }

    this.filteredData = base;
    this.totalItems   = base.length;
    this.totalPages   = Math.ceil(this.totalItems / this.itemsPerPage);
    this.updatePageData();
  }

  applyDateFilter(): void {
    this.currentPage = 1;
    this.aplicarTodosFiltros();
  }

  resetDateFilter(): void {
    this.startDate   = '';
    this.endDate     = '';
    this.searchTerm  = '';
    this.filtroEstado = '';
    this.filteredData = [...this.allData1];
    this.totalItems   = this.filteredData.length;
    this.totalPages   = Math.ceil(this.totalItems / this.itemsPerPage);
    this.currentPage  = 1;
    this.updatePageData();
  }

  /** Preservado del original con la firma exacta, agrega al historial con count */
  searchImports(): void {
    const term = this.searchTerm.trim().toLowerCase();

    let base = [...this.allData1];

    // Aplicar filtro de fechas si existen
    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end   = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);
      base = base.filter(item => {
        const d = new Date(item.fecha_creacion);
        return d >= start && d <= end;
      });
    }

    // Aplicar búsqueda de texto si existe
    if (term) {
      base = base.filter(item => {
        const usuarioCompleto = `${item.nombre ?? ''} ${item.apellido ?? ''}`.toLowerCase();
        return (
          (item.codigo        && item.codigo.toLowerCase().includes(term)) ||
          (item.descripcion   && item.descripcion.toLowerCase().includes(term)) ||
          (item.observaciones && item.observaciones.toLowerCase().includes(term)) ||
          (item.cliente       && item.cliente.toLowerCase().includes(term)) ||
          (item.ot            && item.ot.toLowerCase().includes(term)) ||
          usuarioCompleto.includes(term)
        );
      });
      this.agregarAlHistorial(this.searchTerm, base.length);
    }

    // Aplicar filtro de estado si existe
    if (this.filtroEstado) {
      if (this.filtroEstado === 'CLOCAL') {
        base = base.filter(item => item.compra_local === true);
      } else {
        base = base.filter(item => item.estado === this.filtroEstado);
      }
    }

    this.filteredData = base;
    this.totalItems   = base.length;
    this.totalPages   = Math.ceil(this.totalItems / this.itemsPerPage);
    this.currentPage  = 1;
    this.updatePageData();
  }

  /** Nuevo: disparado por el select de estado */
  aplicarFiltroEstado(): void {
    this.currentPage = 1;
    this.aplicarTodosFiltros();
  }

  /** Preservado del original */
  filterData(): void {
    console.log('Filtrar datos avanzado');
  }

  // ════════════════════════════════════════════════════════════════════════
  //  ACCIONES SOBRE PEDIDOS
  // ════════════════════════════════════════════════════════════════════════

  actualizarEstado(item: any): void {
    const payload = {
      id_pedido:             parseInt(item.id_pedido) || 0,
      Cantidad:              parseInt(item.cantidad)  || 0,
      Codigo:                String(item.codigo        || ''),
      Descripcion:           String(item.descripcion   || ''),
      Observaciones:         String(item.observaciones || ''),
      Estado:                String(item.estado        || ''),
      IdUsuarioCreacion:     parseInt(item.idUsuarioCreacion)    || 0,
      IdUsuarioModificacion: parseInt(item.idUsuarioModificacion) || 0,
      Modelo:                String(item.modelo   || ''),
      Cliente:               String(item.cliente  || ''),
      Ot:                    String(item.ot       || '')
    };
    this.tutorialService.actualizarEstadoPedido(item.id_pedido, payload).subscribe({
      next: () => {
        this.showToast('Pedido actualizado exitosamente', 'success');
        this.cargarDatos();
      },
      error: (err: any) => this.showToast(`Error al actualizar: ${err.error?.message || 'desconocido'}`, 'error')
    });
  }

  /** Preservado del original (activa/desactiva flag compra_local) */
  toggleCompraLocal(item: any): void {
    item.compra_local = !item.compra_local;
    const payload = { ...item, Observaciones: item.observaciones || '', compra_local: item.compra_local };
    this.tutorialService.actualizarEstadoPedido2(item.id_pedido, payload).subscribe({
      next: () => {
        this.showToast('Compra local actualizada.', 'success');
        this.cargarDatos();
      },
      error: () => {
        this.showToast('Error al actualizar.', 'error');
        item.compra_local = !item.compra_local;
      }
    });
  }

  /** Nuevo: quita el flag y saca el pedido de la lista clocal */
  quitarCompraLocal(item: Pedido): void {
    item.observaciones = '';
    item.compra_local  = false;
    this.tutorialService.actualizarEstadoPedido2(Number(item.id_pedido), item).subscribe({
      next: () => {
        this.showToast('Compra local quitada', 'success');
        this.cargarDatos();
      },
      error: () => {
        item.compra_local = true;
        this.showToast('Error al actualizar la compra local', 'error');
      }
    });
  }

  /** Preservado del original con todos los mapeos */
  getEstadoDisplay(estado: string): string {
    const map: Record<string, string> = {
      REVISADO:   'FINALIZADO',
      ENVIADO:    'ENVIADO',
      PENDIENTE:  'PENDIENTE',
      PROCESO:    'EN PROCESO',
      EN_PROCESO: 'EN PROCESO',
      ASIGNADO:   'ASIGNADO',
      CANCELADO:  'CANCELADO',
      RECHAZADO:  'RECHAZADO',
      ERRONEO:    'MAL PEDIDO'
    };
    return map[estado] || estado;
  }

  // ════════════════════════════════════════════════════════════════════════
  //  MODAL PROVEEDOR (NUEVO)
  // ════════════════════════════════════════════════════════════════════════

  openProveedorModal(pedido: Pedido): void {
    this.selectedPedidoForProveedor = pedido;
    this.showProveedorModal = true;
  }

  closeProveedorModal(): void {
    this.showProveedorModal = false;
    this.proveedorForm.reset({ fecha_cotizacion: new Date().toISOString().split('T')[0] });
    this.selectedFile = null;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.proveedorForm.patchValue({ factura_archivo: file });
    }
  }

  submitProveedorForm(): void {
    if (this.proveedorForm.valid && this.selectedPedidoForProveedor) {
      const fd = new FormData();
      fd.append('id_pedido',        this.selectedPedidoForProveedor.id_pedido!.toString());
      fd.append('id_proveedor',     this.proveedorForm.get('id_proveedor')?.value);
      fd.append('fecha_cotizacion', this.proveedorForm.get('fecha_cotizacion')?.value);
      fd.append('fecha_entrega',    this.proveedorForm.get('fecha_entrega')?.value);
      fd.append('numero_factura',   this.proveedorForm.get('numero_factura')?.value);
      if (this.selectedFile) fd.append('factura_archivo', this.selectedFile, this.selectedFile.name);

      this.tutorialService.asignarProveedor(fd).subscribe({
        next: () => {
          this.showToast('Proveedor asignado exitosamente.', 'success');
          this.closeProveedorModal();
          this.cargarDatos();
        },
        error: (err: any) => {
          console.error('Error al asignar proveedor:', err);
          this.showToast('Error al asignar proveedor.', 'error');
        }
      });
    } else {
      this.showToast('Por favor, complete todos los campos requeridos.', 'error');
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  //  MODALES GENERALES (preservados del original)
  // ════════════════════════════════════════════════════════════════════════

  // -- Imagen
  openImageModal(url: string): void  { this.selectedImageUrl = url; this.isModalOpen = true; }
  closeImageModal(): void            { this.isModalOpen = false; }

  // -- Observaciones (comentarios)
  openObservacionesModal(pedido: Pedido): void {
    this.selectedPedido = pedido;
    this.observacionesModalVisible = true;
  }
  closeObservacionesModal(): void {
    this.observacionesModalVisible = false;
    this.cargarDatos();
  }

  // -- Detalles del pedido
  verObservaciones(idPedido: number): void {
    this.selectedPedidoId = idPedido;
    this.showObservacionesModal1 = true;
  }
  closeObservacionesModal1(): void {
    this.showObservacionesModal1 = false;
    this.selectedPedidoId = null;
  }

  // -- Búsqueda general
  openSearchModal(): void    { this.showSearchModal = true; }
  closeSearchModal(): void   { this.showSearchModal = false; }
  openNuevoBuscador(): void  { this.showNuevoBuscador = true; }

  // ── Modal de Stock (disponible en TODAS las vistas – preservado del original) ─

  abrirModalInfoStock(codigo: string): void {
    this.busquedaCodigo = codigo;
    this.activeTab      = 'stock';
    this.stockMaster    = null;
    this.stockAgencias  = [];
    this.totalUnidadesDisponibles = 0;
    this.mensajeSinStock = '';
    this.infoStockModalVisible = true;
    this.cargarStockModal(codigo);
  }

  cerrarModalInfoStock(): void { this.infoStockModalVisible = false; }

  /** Preservado del original como método privado separado */
  private cargarStockModal(codigo: string): void {
    this.oracleService.getInventarioArticuloTotalDatos(codigo).subscribe({
      next: ({ master, inventario }: { master: any; inventario: any[] }) => {
        this.stockMaster   = master;
        this.stockAgencias = inventario.filter((l: any) => l.stockDisponible > 0);
        this.totalUnidadesDisponibles = this.stockAgencias.reduce((s: number, r: any) => s + r.stockDisponible, 0);
        this.mensajeSinStock = this.totalUnidadesDisponibles === 0 ? 'Sin stock disponible en ninguna agencia' : '';
      },
      error: () => {
        this.stockMaster   = null;
        this.stockAgencias = [];
        this.totalUnidadesDisponibles = 0;
        this.mensajeSinStock = 'Sin información de inventario';
      }
    });
  }

  /** Preservado del original */
  cargarEquivalentesModal(codigo: string): void {
    const term = codigo.trim().toUpperCase();
    this.equivCodes      = [];
    this.equivStockMap   = {};
    this.equivAgenciasMap = {};

    this.equivService.getAll().subscribe((list: any[]) => {
      const matches = list.filter((eq: any) =>
        [eq.codsistema, eq.codoriginal, eq.codigo1, eq.codigo2, eq.codigo3, eq.codigo4, eq.codigo5]
          .some((c: string) => c?.trim().toUpperCase() === term)
      );

      const codigos = new Set<string>();
      matches.forEach((eq: any) => {
        [eq.codsistema, eq.codoriginal, eq.codigo1, eq.codigo2, eq.codigo3, eq.codigo4, eq.codigo5]
          .forEach((c: string) => {
            if (c?.trim() && c.trim().toUpperCase() !== term) codigos.add(c.trim());
          });
      });

      this.equivCodes = Array.from(codigos);
      // Usa getStockConAgencias igual que el componente original
      this.equivCodes.forEach(c => {
        this.oracleService.getStockConAgencias(c).subscribe({
          next: (res: any) => {
            this.equivStockMap[c]    = res?.total ?? 0;
            this.equivAgenciasMap[c] = res?.agencias ?? [];
          },
          error: () => { this.equivStockMap[c] = 0; }
        });
      });
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  //  HISTORIAL DE BÚSQUEDAS (preservado del original)
  // ════════════════════════════════════════════════════════════════════════

  private getHistorialKey(): string { return `historial_busquedas_pedidobod_${this.id}`; }

  cargarHistorialBusquedas(): void {
    try {
      const stored = localStorage.getItem(this.getHistorialKey());
      this.historialBusquedas = stored ? JSON.parse(stored) : [];
    } catch { this.historialBusquedas = []; }
  }

  private guardarHistorialBusquedas(): void {
    try { localStorage.setItem(this.getHistorialKey(), JSON.stringify(this.historialBusquedas)); }
    catch { /* ignorar */ }
  }

  agregarAlHistorial(termino: string, count?: number): void {
    if (!termino?.trim()) return;
    const nueva: BusquedaHistorial = { termino: termino.trim(), fecha: new Date().toISOString(), resultadosCount: count };
    this.historialBusquedas = [
      nueva,
      ...this.historialBusquedas.filter(b => b.termino.toLowerCase() !== nueva.termino.toLowerCase())
    ].slice(0, this.MAX_HISTORIAL);
    this.guardarHistorialBusquedas();
  }

  /** Preservado del original con la firma exacta */
  onBusquedaRealizada(event: { termino: string; resultados: number }): void {
    this.agregarAlHistorial(event.termino, event.resultados);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  EXPORTACIÓN (preservada del original)
  // ════════════════════════════════════════════════════════════════════════

  toggleExportMenu(): void { this.showExportMenu = !this.showExportMenu; }

  downloadExcel(): void {
    const ws  = XLSX.utils.json_to_sheet(this.filteredData);
    const wb  = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(
      new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `Pedidos_${this.paginaActual}_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  }

  downloadCSV(): void {
    let csv = 'Codigo,Descripcion,Cantidad,Observacion,Fecha,Estado\n';
    this.filteredData.forEach(item => {
      csv += [
        item.codigo, item.descripcion, item.cantidad,
        item.observaciones || '-',
        item.fecha_creacion ? new Date(item.fecha_creacion).toLocaleDateString() : '-',
        item.estado || '-'
      ].join(',') + '\n';
    });
    saveAs(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
      `Pedidos_${this.paginaActual}_${new Date().toISOString().split('T')[0]}.csv`
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  //  UTILIDADES (preservadas del original)
  // ════════════════════════════════════════════════════════════════════════

  getImageUrl(relativePath: string): string {
    return `https://bodega.vehicentro.com:1830/api/api/${relativePath.replace(/\\/g, '/')}`;
  }

  formatDateForInput(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    const toast = document.createElement('div');
    toast.innerText = message;
    toast.classList.add('notificacion', type);
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('visible'), 100);
    setTimeout(() => { toast.classList.remove('visible'); setTimeout(() => toast.remove(), 300); }, 3000);
  }

  // ── Helpers para template (preservados del original + nuevos) ─────────────

  /** Preservado del original */
  get esVistaPendiente(): boolean { return this.paginaActual === 'todos'; }

  /** Preservado del original – ahora true en todas las vistas */
  get esPaginaConStock(): boolean { return true; }

  /** Nuevo: true cuando la vista activa es Compra Local */
  get esVistaCompraLocal(): boolean { return this.paginaActual === 'clocal'; }

  /** Nuevo */
  get esVistaTodos(): boolean { return this.paginaActual === 'todos'; }

  /** Preservado del original */
  get esAdmin(): boolean {
    return ['admin','repuestos','repuestoslv','repuestoslk','repuestosc','laboratorio1','laboratorio2'].includes(this.usrol);
  }
}