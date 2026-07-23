import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import saveAs from 'file-saver';
import { Subscription } from 'rxjs';
import { Usuario } from '../../models/usuario';
import { AuthService } from '../../services/auth.service';
import { PedidobodegaService } from '../../services/pedidobodega.service';
import { ReloadService } from '../../services/reload.service';
import * as XLSX from 'xlsx';
import { EquivalentesService } from 'src/app/services/equivalentes.service';
import { OracleService } from 'src/app/services/oracle.service';
import { PedidosoracleService } from 'src/app/services/pedidosoracle.service';

// Interfaz para pedidos (agregada para mejor tipado)
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
  cliente?: string; // Hacemos 'cliente' opcional para que sea compatible
  ot?: string;
  nombre?: string;
  apellido?: string;
  fecha_creacion?: Date;
  imagenes?: string[];
}

export interface Pedido1 {
   id_pedido: number;
  codigo: string;
  descripcion: string;
  cantidad: number;
  observaciones: string;
  estado: string;
  idUsuarioCreacion: number;
  idUsuarioModificacion: number;
  modelo: string;
  cliente: string;
  ot: string;
  nombre: string; // User's first name
  apellido: string; // User's last name
  fecha_creacion: string; // Or Date type if parsed
  imagenes: string[]; // Array of image paths
  comentarios?: Comment[]; // Optional array of comments
}

export interface Comment {
  usuario: string;
  texto: string;
  fecha: string;
  id?: number; // Or Date type
  // Add other comment properties if applicable (e.g., userId)
}
export interface BusquedaHistorial {
  termino: string;
  fecha: string;
  resultadosCount?: number;
}


@Component({
  selector: 'app-pedidobod',
  templateUrl: './pedidobod.component.html',
  styleUrls: ['./pedidobod.component.css']
})

export class PedidobodComponent implements OnInit, OnDestroy {
  stats = {
    totalImportaciones: 7,
    enTransito: 24,
    pendientesLiquidacion: 18,
    tiempoPromedio: 28
  };

  selectedPedido: Pedido | null = null;
  observacionesModalVisible = false;
  showSearchModal = false;

  paginaActual = '';
  searchTerm = '';
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  lista: any[] = [];
  allData: any[] = [];
  filteredData: any[] = [];
  id = 0;
  usuario: Usuario | null = null;
  loading = false;
  usrol = '';
  allData1: any[] = [];
  private subscription = new Subscription();

  startDate = '';
  endDate = '';

  // MODAL STOCK
  stockModalVisible = false;
  stockArticulo = '';
  stockMaster: any = null;
  stockAgencias: any[] = [];
  equivCodes: string[] = [];
  equivStockMap: { [codigo: string]: number } = {};
  equivAgenciasMap: { [codigo: string]: { oficina: string; stock: number }[] } = {};
  activeTab: 'stock' | 'buscar' | 'equivalentes' = 'stock';

  // ========== HISTORIAL DE BÚSQUEDAS ==========
  historialBusquedas: BusquedaHistorial[] = [];
  private readonly MAX_HISTORIAL = 20;
  terminoBusquedaModal: string = '';

  constructor(
    private router: Router,
    private tutorialService: PedidobodegaService,
    private reloadService: ReloadService,
    private authService: AuthService,
    public oracleService: OracleService,
    private equivService: EquivalentesService,
  private pedidosOracle: PedidosoracleService 
  ) {}

  ngOnInit(): void {
    this.resetDateFilter();
    this.paginaActual = 'pendiente';

    // ── 1) Arranque inmediato si el usuario YA está disponible ────────────
    // Esto cubre el caso "primera entrada navegando": cuando este componente
    // se suscribe, el usuario puede haber sido emitido ANTES (suscriptor tardío).
    // Si tu AuthService expone un getter síncrono del usuario actual, descoméntalo
    // y ajusta el nombre real (p.ej. usuarioActualValue / currentUser /
    // usuarioActual$.value si es un BehaviorSubject). Es la solución más robusta:
    //
    // const userActual = this.authService.usuarioActualValue;
    // if (userActual != null) {
    //   this.aplicarUsuario(userActual);
    // }

    // ── 2) Escuchar cambios de usuario (login/logout/cambio de cuenta) ────
    this.subscription.add(
      this.authService.usuarioActual$.subscribe(usuario => {
        if (usuario != null) {
          this.aplicarUsuario(usuario);
        }
      })
    );

    this.subscription.add(
      this.reloadService.reload$.subscribe(() => {
        this.loadimportaciones();
      })
    );
  }

  /** Aplica el usuario y dispara la carga inicial, evitando recargas duplicadas. */
  private aplicarUsuario(usuario: Usuario): void {
    // Si ya cargamos para este mismo usuario, solo refrescamos la referencia.
    if (this.usuario?.id === usuario.id && this.allData.length > 0) {
      this.usuario = usuario;
      return;
    }
    this.usuario = usuario;
    this.id = usuario.id;
    this.usrol = usuario.rol;
    this.cargarHistorialBusquedas();
    this.loadimportaciones();
  }

  // ========== MÉTODOS PARA HISTORIAL DE BÚSQUEDAS ==========

  private getHistorialKey(): string {
    return `historial_busquedas_pedidobod_${this.id}`;
  }

  cargarHistorialBusquedas(): void {
    try {
      const key = this.getHistorialKey();
      const stored = localStorage.getItem(key);
      if (stored) {
        this.historialBusquedas = JSON.parse(stored);
      } else {
        this.historialBusquedas = [];
      }
    } catch (error) {
      console.error('Error al cargar historial:', error);
      this.historialBusquedas = [];
    }
  }

  private guardarHistorialBusquedas(): void {
    try {
      const key = this.getHistorialKey();
      localStorage.setItem(key, JSON.stringify(this.historialBusquedas));
    } catch (error) {
      console.error('Error al guardar historial:', error);
    }
  }

  agregarAlHistorial(termino: string, resultadosCount?: number): void {
    if (!termino || termino.trim() === '') return;

    const nuevaBusqueda: BusquedaHistorial = {
      termino: termino.trim(),
      fecha: new Date().toISOString(),
      resultadosCount: resultadosCount
    };

    // Eliminar duplicados
    this.historialBusquedas = this.historialBusquedas.filter(
      b => b.termino.toLowerCase() !== nuevaBusqueda.termino.toLowerCase()
    );

    // Agregar al inicio
    this.historialBusquedas.unshift(nuevaBusqueda);

    // Limitar tamaño
    if (this.historialBusquedas.length > this.MAX_HISTORIAL) {
      this.historialBusquedas = this.historialBusquedas.slice(0, this.MAX_HISTORIAL);
    }

    this.guardarHistorialBusquedas();
  }

  eliminarDelHistorial(index: number): void {
    this.historialBusquedas.splice(index, 1);
    this.guardarHistorialBusquedas();
  }

  limpiarHistorial(): void {
    if (confirm('¿Está seguro de que desea limpiar todo el historial de búsquedas?')) {
      this.historialBusquedas = [];
      this.guardarHistorialBusquedas();
    }
  }

  seleccionarBusquedaHistorial(busqueda: BusquedaHistorial): void {
    this.terminoBusquedaModal = busqueda.termino;
    // Emitir el término al componente hijo si es necesario
    // this.buscarEnModal(busqueda.termino);
  }

  formatearFechaHistorial(fechaISO: string): string {
    const fecha = new Date(fechaISO);
    const ahora = new Date();
    const diffMs = ahora.getTime() - fecha.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Hace un momento';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHoras < 24) return `Hace ${diffHoras} h`;
    if (diffDias === 1) return 'Ayer';
    if (diffDias < 7) return `Hace ${diffDias} días`;
    
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: fecha.getFullYear() !== ahora.getFullYear() ? 'numeric' : undefined
    });
  }

  // ========== MÉTODOS MODAL BÚSQUEDA ==========

  onBusquedaRealizada(event: { termino: string, resultados: number }): void {
    this.agregarAlHistorial(event.termino, event.resultados);
  }

  // MODAL STOCK - Propiedades
  infoStockModalVisible = false;
  totalUnidadesDisponibles = 0;
  mensajeSinStock = '';
  busquedaCodigo = '';
  busquedaResultados: any[] = [];
  busquedaTotal = 0;

  cargarEquivalentesModal(codigo: string): void {
    const term = codigo.trim().toUpperCase();

    this.equivService.getAll().subscribe((list: any[]) => {
      const matches = list.filter((eq: any) =>
        eq.codsistema.trim().toUpperCase() === term ||
        eq.codoriginal.trim().toUpperCase() === term ||
        [eq.codigo1, eq.codigo2, eq.codigo3, eq.codigo4, eq.codigo5]
          .some(c => c && c.trim().toUpperCase() === term)
      );

      const codeSet = new Set<string>();
      matches.forEach((eq: any) => {
        const fields = [eq.codsistema, eq.codoriginal, eq.codigo1, eq.codigo2, eq.codigo3, eq.codigo4, eq.codigo5];
        fields.forEach(c => {
          if (c && c.trim().toUpperCase() !== term) {
            codeSet.add(c.trim());
          }
        });
      });

      const codesArr = Array.from(codeSet);
      this.equivCodes = codesArr;

      codesArr.forEach(code => {
  this.pedidosOracle.getStockConAgencias(code).subscribe(res => {
    this.equivStockMap[code] = res?.total ?? 0;
    this.equivAgenciasMap[code] = res?.agencias ?? [];
  });
});
    });
  }

  abrirModalInfoStock(codigo: string): void {
    this.busquedaCodigo = codigo;
    this.activeTab = 'stock';
    this.cargarStock(codigo);
    this.openSearchModalConCodigo(codigo);
    this.infoStockModalVisible = true;
  }

  cerrarModalInfoStock(): void {
    this.infoStockModalVisible = false;
    this.activeTab = 'stock';
    this.busquedaCodigo = '';
    this.stockMaster = null;
    this.stockAgencias = [];
    this.totalUnidadesDisponibles = 0;
    this.mensajeSinStock = '';
    this.closeSearchModal();
  }

  openSearchModalConCodigo(codigo: string): void {
    this.showSearchModal = true;
    document.body.classList.add('modal-open');
  }

  private cargarStock(codigo: string): void {
  this.pedidosOracle.getStockTodasAgenciasDatos(codigo).subscribe({
    next: ({ articulo, nombre, agencias }) => {
      // Armar stockMaster con los campos que el template necesita
      this.stockMaster = {
        articulo,
        nombre,
        clase:             '',   // el nuevo endpoint no devuelve clase/grupo;
        grupo:             '',   // si los necesitás podés llamar a oracleService
        lineaCompetencia:  null  // en paralelo como hacías antes
      };

      // El nuevo endpoint ya trae stock = 0 en agencias sin existencia,
      // filtramos igual que antes para mostrar solo las que tienen disponible
      this.stockAgencias = agencias.filter(a => a.stockDisponible > 0);

      this.totalUnidadesDisponibles = this.stockAgencias
        .reduce((sum, a) => sum + a.stockDisponible, 0);

      this.mensajeSinStock = this.totalUnidadesDisponibles === 0
        ? 'Sin stock disponible en ninguna agencia'
        : '';
    },
    error: () => {
      this.stockMaster = null;
      this.stockAgencias = [];
      this.totalUnidadesDisponibles = 0;
      this.mensajeSinStock = 'Sin información de inventario';
    }
  });
}

  private cargarStock1(codigo: string): void {
    this.oracleService.getInventarioArticuloTotalDatos(codigo).subscribe({
      next: ({ master, inventario }) => {
        this.stockMaster = master;
        this.stockAgencias = inventario.filter(l => l.stockDisponible > 0);
        this.totalUnidadesDisponibles = this.stockAgencias.reduce((s, r) => s + r.stockDisponible, 0);
        this.mensajeSinStock = this.totalUnidadesDisponibles === 0 ? 'Sin stock disponible en ninguna agencia' : '';
      },
      error: () => {
        this.stockMaster = null;
        this.stockAgencias = [];
        this.totalUnidadesDisponibles = 0;
        this.mensajeSinStock = 'Sin información de inventario';
      }
    });
  }

  private cargarBusqueda(codigo: string): void {
    this.oracleService.getInventarioBasicoPorArticulo(codigo).subscribe({
      next: (resultados: any) => {
        this.busquedaResultados = resultados;
        this.busquedaTotal = resultados.length;
      },
      error: () => {
        this.busquedaResultados = [];
        this.busquedaTotal = 0;
      }
    });
  }

  showNuevoBuscador = false;
  openNuevoBuscador(): void {
    this.showNuevoBuscador = true;
    this.terminoBusquedaModal = '';
    this.cargarHistorialBusquedas(); // Recargar historial al abrir
    document.body.classList.add('modal-open');
  }

  cerrarNuevoBuscador(): void {
    this.showNuevoBuscador = false;
    document.body.classList.remove('modal-open');
  }

  openSearchModal(): void {
    this.showSearchModal = true;
    document.body.classList.add('modal-open');
  }

  closeSearchModal(): void {
    this.showSearchModal = false;
    document.body.classList.remove('modal-open');
  }

  showObservacionesModal1 = false;
  selectedPedidoId: number | null = null;

  verObservaciones(idPedido: number): void {
    this.selectedPedidoId = idPedido;
    this.showObservacionesModal1 = true;
  }

  closeObservacionesModal1(): void {
    this.showObservacionesModal1 = false;
    this.selectedPedidoId = null;
  }

  openObservacionesModal(pedido: Pedido): void {
    this.selectedPedido = pedido;
    this.observacionesModalVisible = true;
  }

  closeObservacionesModal(): void {
    this.observacionesModalVisible = false;
    this.loadimportaciones();
  }

  selectedImageUrl = '';
  isModalOpen = false;

  openImageModal(imageUrl: string): void {
    this.selectedImageUrl = imageUrl;
    this.isModalOpen = true;
  }

  closeImageModal(): void {
    this.isModalOpen = false;
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  totalItems = 0;

  loadimportaciones() {
    this.loading = true;
    this.tutorialService.pedidos().subscribe({
      next: (data: any) => {
        this.allData = data;
        if (this.usrol == 'repuestoslv') {
          this.filteredData = this.allData.filter(item => item && item.modelo === 'sl');
          this.allData1 = this.filteredData;
          this.resetDateFilter();
        } else if (this.usrol == 'repuestoslk') {
          this.filteredData = this.allData.filter(item => item && item.modelo === 'lc');
          this.allData1 = this.filteredData;
          this.resetDateFilter();
        } else if (this.usrol == 'repuestoslsc') {
          this.filteredData = this.allData.filter(item => item && item.modelo === 'sc');
          this.allData1 = this.filteredData;
          this.resetDateFilter();
        } else if (this.usrol == 'repuestos') {
          this.filteredData = this.allData.filter(item => item && item.modelo === 'sp');
          this.allData1 = this.filteredData;
          this.resetDateFilter();
        } else {
          this.filteredData = this.allData;
          this.allData1 = this.filteredData;
          this.resetDateFilter();
        }
        this.totalItems = this.filteredData.length;
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        this.currentPage = 1;
        this.updatePageData();
        this.loading = false;
      },
      error: (e) => {
        console.error(e);
        this.loading = false;
      }
    });
  }

  toggleCompraLocal(item: any): void {
    item.compra_local = !item.compra_local;
    const pedidoActualizado = {
      ...item,
      Observaciones: item.observaciones || "",
      compra_local: item.compra_local
    };
    this.tutorialService.actualizarEstadoPedido2(item.id_pedido, pedidoActualizado).subscribe({
      next: (response) => {
        this.showToast("Compra local actualizada.", 'success');
      },
      error: (error) => {
        this.showToast("Error al actualizar.", 'error');
        item.compra_local = !item.compra_local;
      }
    });
  }

  confirmarPedido(id_pedido: number): void {
    const pedidoAActualizar = this.filteredData.find(p => p.id_pedido === id_pedido);
    if (pedidoAActualizar) {
      const pedidoActualizado = {
        ...pedidoAActualizar,
        estado: 'PENDIENTE',
        id_pedido: pedidoAActualizar.id_pedido,
        Cantidad: pedidoAActualizar.cantidad,
        Codigo: pedidoAActualizar.codigo,
        Descripcion: pedidoAActualizar.descripcion,
        Observaciones: pedidoAActualizar.observaciones || "",
        Estado: 'PENDIENTE',
        IdUsuarioCreacion: pedidoAActualizar.idUsuarioCreacion,
        IdUsuarioModificacion: this.id,
        Modelo: pedidoAActualizar.modelo,
        Cliente: pedidoAActualizar.cliente,
        Ot: pedidoAActualizar.ot,
        compra_local: true
      };
      this.tutorialService.actualizarEstadoPedido2(id_pedido, pedidoActualizado).subscribe({
        next: (response) => {
          this.loadimportaciones();
          this.showToast("Pedido actualizado exitosamente.", 'success');
        },
        error: (error) => {
          this.showToast("Error al actualizar el pedido.", 'error');
        }
      });
    }
  }

  actualizarEstado(item: any): void {
    const pedidoActualizado = {
      id_pedido: parseInt(item.id_pedido) || 0,
      Cantidad: parseInt(item.cantidad) || 0,
      Codigo: String(item.codigo || ""),
      Descripcion: String(item.descripcion || ""),
      Observaciones: String(item.observaciones || ""),
      Estado: String(item.estado || ""),
      IdUsuarioCreacion: parseInt(item.idUsuarioCreacion) || 0,
      IdUsuarioModificacion: parseInt(item.idUsuarioModificacion) || 0,
      Modelo: String(item.modelo || ""),
      Cliente: String(item.cliente || ""),
      Ot: String(item.ot || "")
    };
    this.tutorialService.actualizarEstadoPedido(item.id_pedido, pedidoActualizado).subscribe({
      next: () => {
        this.showToast("Pedido actualizado exitosamente", 'success');
        this.loadimportaciones();
      },
      error: (err) => {
        this.showToast(`Error al actualizar pedido: ${err.error?.message || 'Error desconocido'}`, 'error');
      }
    });
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    const toast = document.createElement('div');
    toast.innerText = message;
    toast.classList.add('notificacion', type);
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('visible'), 100);
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  getImageUrl(relativePath: string): string {
    const formattedPath = relativePath.replace(/\\/g, '/');
    return `https://bodega.vehicentro.com:1830/api/api/${formattedPath}`;
  }

  updatePageData() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.lista = this.filteredData.slice(startIndex, endIndex);
  }

  changePage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePageData();
  }

  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  applyDateFilter() {
    if (!this.startDate || !this.endDate) {
      this.filteredData = this.allData1;
    } else {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);
      this.filteredData = this.allData1.filter(item => {
        const itemDate = new Date(item.fecha_creacion);
        return itemDate >= start && itemDate <= end;
      });
    }
    this.totalItems = this.filteredData.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    this.currentPage = 1;
    this.updatePageData();
  }

  resetDateFilter() {
    this.startDate = '';
    this.endDate = '';
    this.filteredData = this.allData1;
    this.totalItems = this.filteredData.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    this.currentPage = 1;
    this.updatePageData();
  }

  // ========== ORDENAMIENTO ==========
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  sortBy(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applySort();
  }

  private applySort(): void {
    if (!this.sortColumn) return;
    this.filteredData = [...this.filteredData].sort((a, b) => {
      let valA = a[this.sortColumn];
      let valB = b[this.sortColumn];

      // Fechas
      if (this.sortColumn === 'fecha_creacion') {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
      } else if (typeof valA === 'string') {
        valA = valA?.toLowerCase() ?? '';
        valB = valB?.toLowerCase() ?? '';
      } else {
        valA = valA ?? 0;
        valB = valB ?? 0;
      }

      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    this.currentPage = 1;
    this.updatePageData();
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return 'fa-sort';
    return this.sortDirection === 'asc' ? 'fa-sort-asc' : 'fa-sort-desc';
  }
  // ========== FIN ORDENAMIENTO ==========

  searchImports(): void {
    if (this.searchTerm.trim() === '') {
      this.applyDateFilter();
    } else {
      this.resetDateFilter();
      const searchTermLower = this.searchTerm.toLowerCase();
      this.filteredData = this.allData1.filter(item => {
        const usuarioCompleto = `${item.nombre ?? ''} ${item.apellido ?? ''}`.toLowerCase();
        return (
          (item.codigo        && item.codigo.toLowerCase().includes(searchTermLower)) ||
          (item.descripcion   && item.descripcion.toLowerCase().includes(searchTermLower)) ||
          (item.observaciones && item.observaciones.toLowerCase().includes(searchTermLower)) ||
          (item.cliente       && item.cliente.toLowerCase().includes(searchTermLower)) ||
          (item.ot            && item.ot.toLowerCase().includes(searchTermLower)) ||
          usuarioCompleto.includes(searchTermLower)
        );
      });
      this.totalItems = this.filteredData.length;
      this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
      this.currentPage = 1;
      this.updatePageData();
    }
  }

  filterData(): void {
    console.log('Filtrar datos');
  }

  revisado() {
    this.paginaActual = 'revisado';
    this.router.navigate(['/pedidobodrev']);
  }

  pendiente() {
    this.paginaActual = 'pendiente';
    this.router.navigate(['/pedidobod']);
  }

  clocal() {
    this.paginaActual = 'clocal';
    this.router.navigate(['/clocal']);
  }

  proceso() {
    this.paginaActual = 'proceso';
    this.router.navigate(['/pedidobodpro']);
  }

  asignado() {
    this.paginaActual = 'asignado';
    this.router.navigate(['/pedidobodasig']);
  }

  error() {
    this.paginaActual = 'error';
    this.router.navigate(['/pedidoboderror']);
  }

  resetearEstado() {
    this.paginaActual = '';
  }

  esTarjetaActiva(tipo: string): boolean {
    return this.paginaActual === tipo;
  }

  showExportMenu = false;

  toggleExportMenu(): void {
    this.showExportMenu = !this.showExportMenu;
  }

  getPaginationArray(): number[] {
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      const pages: number[] = [];
      pages.push(1);
      if (currentPage > 3) pages.push(-1);
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push(-1);
      if (totalPages > 1) pages.push(totalPages);
      return pages;
    }
  }

  downloadExcel(): void {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredData);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pedidos');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Pedidos_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  downloadCSV(): void {
    let csvContent = 'Codigo,Descripcion,Cantidad,Observacion,Fecha,Estado\n';
    this.filteredData.forEach(item => {
      const row = [
        item.codigo,
        item.descripcion,
        item.cantidad,
        item.observaciones || '-',
        item.fecha_creacion ? new Date(item.fecha_creacion).toLocaleDateString() : '-',
        item.estado || '-'
      ].join(',');
      csvContent += row + '\n';
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `Pedidos_${new Date().toISOString().split('T')[0]}.csv`);
  }
}