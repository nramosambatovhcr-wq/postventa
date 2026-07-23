import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { OilService, PedidoOilDetail } from 'src/app/services/oil.service';
import { ReloadService } from 'src/app/services/reload.service';
import { AuthService } from 'src/app/services/auth.service';
import { Usuario } from 'src/app/models/usuario';


interface GroupedPedidoNew {
  id: string;
  tipo: string;
  fecha: string;
  usuario: string;
  proveedor: string;
  detalles: PedidoOilDetail[];
  totalItems: number;
  totalMonto: number;
  estados: string[];
  estadoPrincipal: string;
  isExpanded: boolean;
  fechaOriginal: string | Date;
  tiposIncluidos?: string[];
  agencia?: string;
}

export interface Oil1 {
  idOil?: number;
  nombreOil: string;
  cantidad: number;
  unidadMedida?: string;
  tipoAceite?: string;
  idProveedor: number;
  nombreProveedor?: string;
  fechaCreacion?: Date;
}

@Component({
  selector: 'app-dashboardprovped',
  templateUrl: './dashboardprovped.component.html',
  styleUrls: ['./dashboardprovped.component.css']
})
export class DashboardprovpedComponent implements OnInit, OnDestroy {
  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 20;
  totalPages: number = 0;

  allData: PedidoOilDetail[] = [];
  groupedData: GroupedPedidoNew[] = [];
  lubricantesFiltered: GroupedPedidoNew[] = [];
  filtrosFiltered: GroupedPedidoNew[] = [];
  insumosFiltered: GroupedPedidoNew[] = [];
  vidriosFiltered: GroupedPedidoNew[] = [];
  filteredData: GroupedPedidoNew[] = [];
  lista: GroupedPedidoNew[] = [];
  loading = false;

  lubricantesData: GroupedPedidoNew[] = [];
  filtrosData: GroupedPedidoNew[] = [];
  insumosData: GroupedPedidoNew[] = [];
  vidriosData: GroupedPedidoNew[] = [];

  private subscription = new Subscription();

  startDate: string = '';
  endDate: string = '';
  totalItems: number = 0;
  paginaActual: string = '';

  errorMessage: string = '';

  showDetailsModal: boolean = false;
  selectedGroupedPedidoForDetails: GroupedPedidoNew | null = null;

  showExportMenu: boolean = false;
  id: number = 0;
  usuario: Usuario | null = null;
  usrol = '';
  agencia = '';
  nombreProveedor = '';

  tiposProveedor: string[] = [];
  selectedTipo: string = 'todos';

  lubricantesRawData: PedidoOilDetail[] = [];
  filtrosRawData: PedidoOilDetail[] = [];
  insumosRawData: PedidoOilDetail[] = [];
  vidriosRawData: PedidoOilDetail[] = [];

  expandedGroups: Set<string> = new Set();
  currentView: string = 'todos';

  showConfirmModal: boolean = false;
  confirmAction: (() => void) | null = null;
  confirmMessage: string = '';
  confirmTitle: string = 'Confirmar Acción';

  observacionesModalVisible: boolean = false;
  selectedPedido: PedidoOilDetail | null = null;

  observacionesModalVisibleF: boolean = false;
  selectedPedidoF: PedidoOilDetail | null = null;

  observacionesModalVisibleI: boolean = false;
  selectedPedidoI: PedidoOilDetail | null = null;

  observacionesModalVisibleV: boolean = false;
  selectedPedidoV: PedidoOilDetail | null = null;

  constructor(
    private router: Router,
    private oilService: OilService,
    private reloadService: ReloadService,
    private authService: AuthService,
  ) { }

  ngOnInit(): void {
    this.paginaActual = 'asignado';

    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      if (this.usuario != null) {
        this.id = this.usuario.id;
        this.usrol = this.usuario.rol;
        this.oilService.getAgenciaByIdusimport(this.id).subscribe(response => {
          this.agencia = response.agencia;
          this.tiposProveedor = response.tipos || [];
          this.nombreProveedor = response.agencia || '';
          this.loadAllPedidoData();
        });
      }
    });

    this.subscription.add(
      this.reloadService.reload$.subscribe(() => {
        this.loadAllPedidoData();
      })
    );

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    this.startDate = this.formatDateForInput(firstDayOfMonth);
    this.endDate = this.formatDateForInput(lastDayOfMonth);
  }

  /**
 * Devuelve el icono de “check” según el tipo activo.
 * Así cada pestaña muestra su propio icono cuando está seleccionada.
 */
getCheckIcon(): string {
  switch (this.selectedTipo) {
    case 'lubricantes':
      return 'fas fa-oil-can check-icon';
    case 'filtros':
      return 'fas fa-filter check-icon';
    case 'insumos':
      return 'fas fa-box check-icon';
    case 'vidrios':
      return 'fas fa-window-maximize check-icon';
    default: // 'todos'
      return 'fas fa-check-circle check-icon';
  }
}

/**
 * Devuelve la clase Font Awesome del logo según el tipo activo
 */
getLogoIcon(): string {
  switch (this.selectedTipo) {
    case 'lubricantes':
      return 'fas fa-oil-can logo-icon';
    case 'filtros':
      return 'fas fa-filter logo-icon';
    case 'insumos':
      return 'fas fa-box logo-icon';
    case 'vidrios':
      return 'fas fa-window-maximize logo-icon';
    default: // 'todos'
      return 'fas fa-truck logo-icon';
  }
}

/**
 * Devuelve el texto del logo según el tipo activo
 */
getLogoText(): string {
  switch (this.selectedTipo) {
    case 'lubricantes':
      return 'Gestión de Lubricantes';
    case 'filtros':
      return 'Gestión de Filtros';
    case 'insumos':
      return 'Gestión de Insumos';
    case 'vidrios':
      return 'Gestión de Vidrios';
    default: // 'todos'
      return 'Gestión de Pedidos VEHICENTRO';
  }
}

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  trackByGroupKey(index: number, item: GroupedPedidoNew): string {
    return item.id;
  }

  openObservacionesModal(pedido: any): void {
    this.selectedPedido = pedido.detalles[0];
    this.observacionesModalVisible = true;
  }
  closeObservacionesModal(): void {
    this.observacionesModalVisible = false;
    this.selectedPedido = null;
  }

  openObservacionesModalF(pedido: any): void {
    this.selectedPedidoF = pedido.detalles[0];
    this.observacionesModalVisibleF = true;
  }
  closeObservacionesModalF(): void {
    this.observacionesModalVisibleF = false;
    this.selectedPedidoF = null;
  }

  openObservacionesModalI(pedido: any): void {
    this.selectedPedidoI = pedido.detalles[0];
    this.observacionesModalVisibleI = true;
  }
  closeObservacionesModalI(): void {
    this.observacionesModalVisibleI = false;
    this.selectedPedidoI = null;
  }

  openObservacionesModalV(pedido: any): void {
    this.selectedPedidoV = pedido.detalles[0];
    this.observacionesModalVisibleV = true;
  }
  closeObservacionesModalV(): void {
    this.observacionesModalVisibleV = false;
    this.selectedPedidoV = null;
  }

  loadAllPedidoData(): void {
    this.loading = true;
    this.errorMessage = '';

    const observables: { [key: string]: any } = {};

    if (this.tiposProveedor.includes('lubricantes')) {
      observables['lubricantes'] = this.oilService.getAllOilPedidosProAComplete(this.nombreProveedor).pipe(
        catchError(() => of({ pedidos: [] }))
      );
    }
    if (this.tiposProveedor.includes('filtros')) {
      observables['filtros'] = this.oilService.getAllFilterPedidosProAComplete(this.nombreProveedor).pipe(
        catchError(() => of({ pedidos: [] }))
      );
    }
    if (this.tiposProveedor.includes('insumos')) {
      observables['insumos'] = this.oilService.getAllInsumoPedidosProAComplete(this.nombreProveedor).pipe(
        catchError(() => of({ pedidos: [] }))
      );
    }
    if (this.tiposProveedor.includes('vidrios')) {
      observables['vidrios'] = this.oilService.getAllVidrioPedidosProAComplete(this.nombreProveedor).pipe(
        catchError(() => of({ pedidos: [] }))
      );
    }

    if (Object.keys(observables).length === 0) {
      this.errorMessage = 'No hay tipos de proveedor configurados para cargar pedidos.';
      this.loading = false;
      this.clearAllData();
      return;
    }

    forkJoin(observables).subscribe({
      next: (results: any) => {
        this.clearAllData();

        if (results['lubricantes']?.pedidos) {
          this.lubricantesRawData = this.processRawData(results['lubricantes'].pedidos, 'lubricantes');
          this.lubricantesData = this.groupPedidosByTypeUserAndDate(this.lubricantesRawData, 'lubricantes');
        }
        if (results['filtros']?.pedidos) {
          this.filtrosRawData = this.processRawData(results['filtros'].pedidos, 'filtros');
          this.filtrosData = this.groupPedidosByTypeUserAndDate(this.filtrosRawData, 'filtros');
        }
        if (results['insumos']?.pedidos) {
          this.insumosRawData = this.processRawData(results['insumos'].pedidos, 'insumos');
          this.insumosData = this.groupPedidosByTypeUserAndDate(this.insumosRawData, 'insumos');
        }
        if (results['vidrios']?.pedidos) {
          this.vidriosRawData = this.processRawData(results['vidrios'].pedidos, 'vidrios');
          this.vidriosData = this.groupPedidosByTypeUserAndDate(this.vidriosRawData, 'vidrios');
        }

        this.allData = [
          ...this.lubricantesRawData,
          ...this.filtrosRawData,
          ...this.insumosRawData,
          ...this.vidriosRawData
        ];

        this.groupedData = this.createCombinedGroups();
        this.applyFiltersAndSearch();
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Error al cargar la lista de pedidos. Por favor, intente nuevamente.';
        this.clearAllData();
        this.loading = false;
      }
    });
  }

  clearAllData(): void {
    this.allData = [];
    this.groupedData = [];
    this.lista = [];
    this.lubricantesRawData = [];
    this.filtrosRawData = [];
    this.insumosRawData = [];
    this.vidriosRawData = [];
    this.lubricantesData = [];
    this.filtrosData = [];
    this.insumosData = [];
    this.vidriosData = [];
    this.lubricantesFiltered = [];
    this.filtrosFiltered = [];
    this.insumosFiltered = [];
    this.vidriosFiltered = [];
    this.filteredData = [];
  }

  processRawData(rawData: any[], tipo: string): PedidoOilDetail[] {
    return rawData.map(item => {
      let processedItem: PedidoOilDetail = {
        ...item,
        fechaPedido: item.fechaPedido ? this.parseDate(item.fechaPedido) : null,
        fechaModificacionPedido: item.fechaModificacionPedido ? this.parseDate(item.fechaModificacionPedido) : null,
        tipoItem: tipo
      };

      if (tipo === 'filtros') {
        processedItem.codigoOil = item.codigoFilter;
        processedItem.descripcionOil = item.descripcionFilter;
        processedItem.presentacionOil = item.presentacionFilter;
      } else if (tipo === 'insumos') {
        processedItem.codigoOil = item.codigoInsumo;
        processedItem.descripcionOil = item.descripcionInsumo;
        processedItem.presentacionOil = item.presentacionInsumo;
      } else if (tipo === 'vidrios') {
        processedItem.codigoOil = item.codigoVidrio;
        processedItem.descripcionOil = item.descripcionVidrio;
        processedItem.presentacionOil = item.dimensiones;
      }

      return processedItem;
    });
  }

  parseDate(dateValue: any): Date | null {
    if (!dateValue) return null;
    if (dateValue instanceof Date) return dateValue;
    if (typeof dateValue === 'string') {
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? null : date;
    }
    if (typeof dateValue === 'number') {
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  }

  groupPedidosByTypeUserAndDate(pedidos: PedidoOilDetail[], tipo: string): GroupedPedidoNew[] {
    if (!pedidos || pedidos.length === 0) return [];

    const groupMap = new Map<string, GroupedPedidoNew>();

    pedidos.forEach(pedido => {
      const fecha = this.formatDate(pedido.fechaPedido || new Date());
      const usuario = pedido.nombreUsuarioSolicitante || 'Sin usuario';
      const agencia = pedido.agencia || 'Sin agencia';
      const groupKey = `${fecha}-${usuario}-${agencia}`;

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          id: `${tipo}-${groupKey}`,
          tipo: tipo,
          fecha: fecha,
          usuario: usuario,
          proveedor: pedido.nombreProveedor || this.nombreProveedor,
          detalles: [],
          totalItems: 0,
          totalMonto: 0,
          estados: [],
          estadoPrincipal: 'pendiente',
          isExpanded: false,
          fechaOriginal: pedido.fechaPedido || new Date(),
          agencia: agencia
        });
      }

      const grupo = groupMap.get(groupKey);
      if (grupo) {
        grupo.detalles.push(pedido);
        grupo.totalItems += pedido.cantidadSolicitada || 1;
        if (pedido.estadoPedido && !grupo.estados.includes(pedido.estadoPedido)) {
          grupo.estados.push(pedido.estadoPedido);
        }
      }
    });

    const grupos = Array.from(groupMap.values()).map(grupo => ({
      ...grupo,
      estadoPrincipal: this.determineMainStatus(grupo.estados)
    }));

    return grupos.sort((a, b) =>
      new Date(b.fechaOriginal).getTime() - new Date(a.fechaOriginal).getTime()
    );
  }

  createCombinedGroups(): GroupedPedidoNew[] {
    const allGroups = [
      ...this.lubricantesData,
      ...this.filtrosData,
      ...this.insumosData,
      ...this.vidriosData
    ];

    const combinedGroupMap = new Map<string, GroupedPedidoNew>();

    allGroups.forEach(grupo => {
      const groupKey = `${grupo.fecha}-${grupo.usuario}-${grupo.agencia}`;

      if (!combinedGroupMap.has(groupKey)) {
        combinedGroupMap.set(groupKey, {
          id: `combined-${groupKey}`,
          tipo: 'todos',
          fecha: grupo.fecha,
          usuario: grupo.usuario,
          proveedor: grupo.proveedor,
          detalles: [],
          totalItems: 0,
          totalMonto: 0,
          estados: [],
          estadoPrincipal: 'pendiente',
          isExpanded: false,
          fechaOriginal: grupo.fechaOriginal,
          tiposIncluidos: [],
          agencia: grupo.agencia
        });
      }

      const combinedGroup = combinedGroupMap.get(groupKey);
      if (combinedGroup) {
        combinedGroup.detalles.push(...grupo.detalles);
        combinedGroup.totalItems += grupo.totalItems;
        combinedGroup.totalMonto += grupo.totalMonto;
        grupo.estados.forEach(estado => {
          if (!combinedGroup.estados.includes(estado)) {
            combinedGroup.estados.push(estado);
          }
        });
        if (!combinedGroup.tiposIncluidos!.includes(grupo.tipo)) {
          combinedGroup.tiposIncluidos!.push(grupo.tipo);
        }
      }
    });

    const combinedGroups = Array.from(combinedGroupMap.values()).map(grupo => ({
      ...grupo,
      estadoPrincipal: this.determineMainStatus(grupo.estados)
    }));

    return combinedGroups.sort((a, b) =>
      new Date(b.fechaOriginal).getTime() - new Date(a.fechaOriginal).getTime()
    );
  }

  determineMainStatus(estados: string[]): string {
    if (!estados || estados.length === 0) return 'pendiente';

    const prioridad: { [key: string]: number } = {
      'completado': 4,
      'finalizados': 4,
      'enviado': 4,
      'revisados': 4,
      'en_proceso': 3,
      'proceso': 3,
      'asignado': 2,
      'pendiente': 1,
      'cancelado': 0
    };

    return estados.reduce((prev, current) => {
      const prevPriority = prioridad[prev.toLowerCase()] || 0;
      const currentPriority = prioridad[current.toLowerCase()] || 0;
      return currentPriority > prevPriority ? current : prev;
    }, estados[0] || 'pendiente');
  }

  formatDate(fecha: string | Date): string {
    if (!fecha) return 'Sin fecha';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getTypeIcon(tipo: string): string {
    const icons: { [key: string]: string } = {
      'lubricantes': 'fas fa-oil-can',
      'filtros': 'fas fa-filter',
      'insumos': 'fas fa-box',
      'vidrios': 'fas fa-window-maximize',
      'todos': 'fas fa-list'
    };
    return icons[tipo] || 'fas fa-box';
  }

  getStatusColor(estado: string): string {
    const colors: { [key: string]: string } = {
      'completado': 'success',
      'finalizados': 'success',
      'enviado': 'success',
      'revisados': 'success',
      'en_proceso': 'warning',
      'proceso': 'warning',
      'asignado': 'info',
      'pendiente': 'info',
      'cancelado': 'danger'
    };
    return colors[estado.toLowerCase()] || 'secondary';
  }

  getItemTipo(item: any): string {
    if (item.tipoItem) return item.tipoItem;
    const codigo = item.codigoOil?.toLowerCase() || '';
    const descripcion = item.descripcionOil?.toLowerCase() || '';

    if (codigo.includes('lub') || descripcion.includes('lubricante') || codigo.includes('aceite') || descripcion.includes('oil') || descripcion.includes('motor') || codigo.includes('sae')) {
      return 'lubricantes';
    } else if (codigo.includes('filt') || descripcion.includes('filtro') || descripcion.includes('filter')) {
      return 'filtros';
    } else if (codigo.includes('ins') || descripcion.includes('insumo') || descripcion.includes('repuesto') || descripcion.includes('accesorio') || descripcion.includes('herramienta') || descripcion.includes('pieza')) {
      return 'insumos';
    } else if (codigo.includes('vid') || descripcion.includes('vidrios') || descripcion.includes('cristal')) {
      return 'vidrios';
    }
    return 'desconocido';
  }

  changeTipo(tipo: string): void {
    this.selectedTipo = tipo;
    this.currentPage = 1;
    this.applyFiltersAndSearch();
  }

  getDataByTipo(): GroupedPedidoNew[] {
    switch (this.selectedTipo) {
      case 'lubricantes':
        return this.lubricantesFiltered;
      case 'filtros':
        return this.filtrosFiltered;
      case 'insumos':
        return this.insumosFiltered;
      case 'vidrios':
        return this.vidriosFiltered;
      case 'todos':
      default:
        return this.filteredData;
    }
  }

  shouldShowTipo(tipo: string): boolean {
    return this.tiposProveedor.includes(tipo);
  }

  getCountByTipo(tipo: string): number {
    switch (tipo) {
      case 'lubricantes':
        return this.lubricantesData.length;
      case 'filtros':
        return this.filtrosData.length;
      case 'insumos':
        return this.insumosData.length;
      case 'vidrios':
        return this.vidriosData.length;
      case 'todos':
        return this.groupedData.length;
      default:
        return 0;
    }
  }

  actualizarEstadoPedido(group: GroupedPedidoNew): void {
    if (!group || !group.detalles || group.detalles.length === 0) {
      this.showToast('Error: No hay detalles en el grupo para actualizar el estado.', 'error');
      return;
    }

    const newStatus = group.estadoPrincipal;
    const updateObservables = group.detalles.map(detail => {
      if (detail.idPedido === undefined) return of(null);

      let updateServiceCall;
      switch (detail.tipoItem) {
        case 'lubricantes':
          updateServiceCall = this.oilService.updateOilRequestStatus(detail.idPedido, newStatus);
          break;
        case 'filtros':
          updateServiceCall = this.oilService.updateFilterRequestStatus(detail.idPedido, newStatus);
          break;
        case 'insumos':
          updateServiceCall = this.oilService.updateInsumoRequestStatus(detail.idPedido, newStatus);
          break;
        case 'vidrios':
          updateServiceCall = this.oilService.updateVidrioRequestStatus(detail.idPedido, newStatus);
          break;
        default:
          return of(null);
      }

      detail.estadoPedido = newStatus;
      return updateServiceCall.pipe(catchError(() => of(null)));
    });

    forkJoin(updateObservables).subscribe(results => {
      const allSuccessful = results.every(res => res !== null);
      if (allSuccessful) {
        this.showToast('Estado de todos los ítems del pedido actualizado exitosamente.', 'success');
      } else {
        this.showToast('Algunos ítems del pedido no pudieron ser actualizados.', 'warning');
      }
      this.loadAllPedidoData();
    });
  }

  applyFiltersAndSearch(): void {
    this.applyFiltersToType('lubricantes');
    this.applyFiltersToType('filtros');
    this.applyFiltersToType('insumos');
    this.applyFiltersToType('vidrios');
    this.applyFiltersToType('todos');

    this.totalItems = this.getDataByTipo().length;
    this.calculateTotalPages();
    this.currentPage = 1;
    this.updatePageData();
  }

  applyFiltersToType(tipo: string): void {
    let sourceData: GroupedPedidoNew[] = [];

    switch (tipo) {
      case 'lubricantes':
        sourceData = this.lubricantesData;
        break;
      case 'filtros':
        sourceData = this.filtrosData;
        break;
      case 'insumos':
        sourceData = this.insumosData;
        break;
      case 'vidrios':
        sourceData = this.vidriosData;
        break;
      case 'todos':
        sourceData = this.groupedData;
        break;
      default:
        return;
    }

    let tempFilteredData = sourceData.filter(group => {
      const matchesSearchTerm = this.searchTerm === '' ||
        (group.proveedor && group.proveedor.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (group.usuario && group.usuario.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (group.agencia && group.agencia.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        group.detalles.some(item =>
          (item.codigoOil && item.codigoOil.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
          (item.descripcionOil && item.descripcionOil.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
          (item.presentacionOil && item.presentacionOil.toLowerCase().includes(this.searchTerm.toLowerCase()))
        );
      return matchesSearchTerm;
    });

    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);

      tempFilteredData = tempFilteredData.filter(group => {
        if (!group.fechaOriginal) return false;
        const pedidoDate = new Date(group.fechaOriginal);
        pedidoDate.setHours(0, 0, 0, 0);
        return pedidoDate >= start && pedidoDate <= end;
      });
    }

    if (this.paginaActual && this.paginaActual !== 'todos' && this.paginaActual !== 'reset') {
      tempFilteredData = tempFilteredData.filter(group => {
        const estadoGrupo = group.estadoPrincipal.toLowerCase().replace(/\s/g, '');
        const targetEstado = this.paginaActual.toLowerCase();

        if (targetEstado === 'proceso') {
          return estadoGrupo === 'enproceso' || estadoGrupo === 'proceso';
        } else if (targetEstado === 'error') {
          return estadoGrupo === 'error' || estadoGrupo === 'informacionerronea';
        } else if (targetEstado === 'revisados') {
          return estadoGrupo === 'enviado' || estadoGrupo === 'finalizados' || estadoGrupo === 'revisados';
        }
        return estadoGrupo === targetEstado;
      });
    }

    switch (tipo) {
      case 'lubricantes':
        this.lubricantesFiltered = tempFilteredData;
        break;
      case 'filtros':
        this.filtrosFiltered = tempFilteredData;
        break;
      case 'insumos':
        this.insumosFiltered = tempFilteredData;
        break;
      case 'vidrios':
        this.vidriosFiltered = tempFilteredData;
        break;
      case 'todos':
        this.filteredData = tempFilteredData;
        break;
    }
  }

  pendiente(): void {
    this.paginaActual = 'pendiente';
    this.applyFiltersAndSearch();
  }

  asignado(): void {
    this.paginaActual = 'asignado';
    this.applyFiltersAndSearch();
  }

  proceso(): void {
    this.paginaActual = 'proceso';
    this.applyFiltersAndSearch();
  }

  revisado(): void {
    this.paginaActual = 'revisados';
    this.applyFiltersAndSearch();
  }

  error(): void {
    this.paginaActual = 'error';
    this.applyFiltersAndSearch();
  }

  resetearEstado(): void {
    this.paginaActual = '';
    this.applyFiltersAndSearch();
  }

  resetDateFilter(): void {
    this.startDate = '';
    this.endDate = '';
    this.applyFiltersAndSearch();
  }

  calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    if (this.totalPages === 0) this.totalPages = 1;
  }

  updatePageData(): void {
    const currentData = this.getDataByTipo();
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.lista = currentData.slice(startIndex, endIndex);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePageData();
  }

  getPaginationArray(): number[] {
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
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

  toggleExportMenu(): void {
    this.showExportMenu = !this.showExportMenu;
  }

  downloadExcel(): void {
    const currentData = this.getDataByTipo();
    if (currentData.length === 0) {
      this.showToast('No hay datos para exportar', 'error');
      return;
    }

    const flatDataForExport = currentData.flatMap(group =>
      group.detalles.map(item => ({
        'ID Pedido (Grupo)': item.idPedido || '',
        'Fecha Pedido (Grupo)': group.fechaOriginal ? new Date(group.fechaOriginal).toLocaleDateString('es-ES') : '-',
        'Proveedor (Grupo)': group.proveedor || '-',
        'Estado General (Grupo)': group.estadoPrincipal || '-',
        'Solicitante (Grupo)': group.usuario || '-',
        'Agencia (Grupo)': group.agencia || '-',
        'Código Ítem': item.codigoOil || '',
        'Descripción Ítem': item.descripcionOil || '',
        'Presentación Ítem': item.presentacionOil || '-',
        'Cantidad Solicitada Ítem': item.cantidadSolicitada || '',
        'Estado Ítem Individual': item.estadoPedido || '-',
        'Tipo Ítem': group.tipo || this.getItemTipo(item),
        'Fecha Modificación Ítem': item.fechaModificacionPedido ? new Date(item.fechaModificacionPedido).toLocaleDateString('es-ES') : '-'
      }))
    );

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(flatDataForExport);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Pedidos_${this.selectedTipo}`);
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const filename = `Pedidos_${this.selectedTipo}_${new Date().toISOString().split('T')[0]}.xlsx`;
    saveAs(blob, filename);
    this.showToast('Archivo Excel descargado exitosamente', 'success');
  }

  downloadCSV(): void {
    const currentData = this.getDataByTipo();
    if (currentData.length === 0) {
      this.showToast('No hay datos para exportar', 'error');
      return;
    }

    const flatDataForExport = currentData.flatMap(group =>
      group.detalles.map(item => ({
        idPedidoGrupo: item.idPedido || '',
        fechaPedidoGrupo: group.fechaOriginal ? new Date(group.fechaOriginal).toLocaleDateString('es-ES') : '-',
        proveedorGrupo: group.proveedor || '-',
        estadoGeneralGrupo: group.estadoPrincipal || '-',
        solicitanteGrupo: group.usuario || '-',
        agenciaGrupo: group.agencia || '-',
        codigoItem: item.codigoOil || '',
        descripcionItem: item.descripcionOil || '',
        presentacionItem: item.presentacionOil || '-',
        cantidadSolicitadaItem: item.cantidadSolicitada || '',
        estadoItemIndividual: item.estadoPedido || '-',
        tipoItem: group.tipo || this.getItemTipo(item),
        fechaModificacionItem: item.fechaModificacionPedido ? new Date(item.fechaModificacionPedido).toLocaleDateString('es-ES') : '-'
      }))
    );

    const headers = [
      'ID Pedido (Grupo)', 'Fecha Pedido (Grupo)', 'Proveedor (Grupo)', 'Estado General (Grupo)', 'Solicitante (Grupo)', 'Agencia (Grupo)',
      'Código Ítem', 'Descripción Ítem', 'Presentación Ítem', 'Cantidad Solicitada Ítem', 'Estado Ítem Individual',
      'Tipo Ítem', 'Fecha Modificación Ítem'
    ];
    let csvContent = headers.map(header => `"${header}"`).join(',') + '\n';

    flatDataForExport.forEach(rowObject => {
      const row = headers.map(header => {
        let value: any;
        switch (header) {
          case 'ID Pedido (Grupo)': value = rowObject.idPedidoGrupo; break;
          case 'Fecha Pedido (Grupo)': value = rowObject.fechaPedidoGrupo; break;
          case 'Proveedor (Grupo)': value = rowObject.proveedorGrupo; break;
          case 'Estado General (Grupo)': value = rowObject.estadoGeneralGrupo; break;
          case 'Solicitante (Grupo)': value = rowObject.solicitanteGrupo; break;
          case 'Agencia (Grupo)': value = rowObject.agenciaGrupo; break;
          case 'Código Ítem': value = rowObject.codigoItem; break;
          case 'Descripción Ítem': value = rowObject.descripcionItem; break;
          case 'Presentación Ítem': value = rowObject.presentacionItem; break;
          case 'Cantidad Solicitada Ítem': value = rowObject.cantidadSolicitadaItem; break;
          case 'Estado Ítem Individual': value = rowObject.estadoItemIndividual; break;
          case 'Tipo Ítem': value = rowObject.tipoItem; break;
          case 'Fecha Modificación Ítem': value = rowObject.fechaModificacionItem; break;
          default: value = '';
        }
        const stringValue = String(value || '').replace(/"/g, '""');
        return `"${stringValue}"`;
      }).join(',');
      csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = `Pedidos_${this.selectedTipo}_${new Date().toISOString().split('T')[0]}.csv`;
    saveAs(blob, filename);
    this.showToast('Archivo CSV descargado exitosamente', 'success');
  }

  viewPedidoDetails(group: GroupedPedidoNew): void {
    this.selectedGroupedPedidoForDetails = group;
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedGroupedPedidoForDetails = null;
  }

  downloadModalExcel(): void {
    if (!this.selectedGroupedPedidoForDetails || this.selectedGroupedPedidoForDetails.detalles.length === 0) {
      this.showToast('No hay datos en el pedido seleccionado para exportar a Excel.', 'error');
      return;
    }

    const group = this.selectedGroupedPedidoForDetails;
    const flatDataForExport = group.detalles.map(item => ({
      'ID Pedido (Grupo)': item.idPedido || '',
      'Fecha Pedido (Grupo)': group.fechaOriginal ? new Date(group.fechaOriginal).toLocaleDateString('es-ES') : '-',
      'Proveedor (Grupo)': group.proveedor || '-',
      'Estado General (Grupo)': group.estadoPrincipal || '-',
      'Solicitante (Grupo)': group.usuario || '-',
      'Agencia (Grupo)': group.agencia || '-',
      'Código Ítem': item.codigoOil || '',
      'Descripción Ítem': item.descripcionOil || '',
      'Presentación Ítem': item.presentacionOil || '-',
      'Cantidad Solicitada Ítem': item.cantidadSolicitada || '',
      'Estado Ítem Individual': item.estadoPedido || '-',
      'Tipo Ítem': group.tipo || this.getItemTipo(item),
      'Fecha Modificación Ítem': item.fechaModificacionPedido ? new Date(item.fechaModificacionPedido).toLocaleDateString('es-ES') : '-'
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(flatDataForExport);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    const cleanId = group.id.toString().replace(/[:\\\/\?\*\[\]]/g, '_');
    const baseSheetName = `DetallesPedido_${cleanId}`;
    const sheetName = baseSheetName.length > 31 ? baseSheetName.substring(0, 31) : baseSheetName;
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const filename = `DetallesPedido_${group.id}_${new Date().toISOString().split('T')[0]}.xlsx`;
    saveAs(blob, filename);
    this.showToast('Archivo Excel de detalles descargado exitosamente', 'success');
  }

  downloadModalCSV(): void {
    if (!this.selectedGroupedPedidoForDetails || this.selectedGroupedPedidoForDetails.detalles.length === 0) {
      this.showToast('No hay datos en el pedido seleccionado para exportar a CSV.', 'error');
      return;
    }

    const group = this.selectedGroupedPedidoForDetails;
    const flatDataForExport = group.detalles.map(item => ({
      idPedidoGrupo: item.idPedido || '',
      fechaPedidoGrupo: group.fechaOriginal ? new Date(group.fechaOriginal).toLocaleDateString('es-ES') : '-',
      proveedorGrupo: group.proveedor || '-',
      estadoGeneralGrupo: group.estadoPrincipal || '-',
      solicitanteGrupo: group.usuario || '-',
      agenciaGrupo: group.agencia || '-',
      codigoItem: item.codigoOil || '',
      descripcionItem: item.descripcionOil || '',
      presentacionItem: item.presentacionOil || '-',
      cantidadSolicitadaItem: item.cantidadSolicitada || '',
      estadoItemIndividual: item.estadoPedido || '-',
      tipoItem: group.tipo || this.getItemTipo(item),
      fechaModificacionItem: item.fechaModificacionPedido ? new Date(item.fechaModificacionPedido).toLocaleDateString('es-ES') : '-'
    }));

    const headers = [
      'ID Pedido (Grupo)', 'Fecha Pedido (Grupo)', 'Proveedor (Grupo)', 'Estado General (Grupo)', 'Solicitante (Grupo)', 'Agencia (Grupo)',
      'Código Ítem', 'Descripción Ítem', 'Presentación Ítem', 'Cantidad Solicitada Ítem', 'Estado Ítem Individual',
      'Tipo Ítem', 'Fecha Modificación Ítem'
    ];
    let csvContent = headers.map(header => `"${header}"`).join(',') + '\n';

    flatDataForExport.forEach(rowObject => {
      const row = headers.map(header => {
        let value: any;
        switch (header) {
          case 'ID Pedido (Grupo)': value = rowObject.idPedidoGrupo; break;
          case 'Fecha Pedido (Grupo)': value = rowObject.fechaPedidoGrupo; break;
          case 'Proveedor (Grupo)': value = rowObject.proveedorGrupo; break;
          case 'Estado General (Grupo)': value = rowObject.estadoGeneralGrupo; break;
          case 'Solicitante (Grupo)': value = rowObject.solicitanteGrupo; break;
          case 'Agencia (Grupo)': value = rowObject.agenciaGrupo; break;
          case 'Código Ítem': value = rowObject.codigoItem; break;
          case 'Descripción Ítem': value = rowObject.descripcionItem; break;
          case 'Presentación Ítem': value = rowObject.presentacionItem; break;
          case 'Cantidad Solicitada Ítem': value = rowObject.cantidadSolicitadaItem; break;
          case 'Estado Ítem Individual': value = rowObject.estadoItemIndividual; break;
          case 'Tipo Ítem': value = rowObject.tipoItem; break;
          case 'Fecha Modificación Ítem': value = rowObject.fechaModificacionItem; break;
          default: value = '';
        }
        const stringValue = String(value || '').replace(/"/g, '""');
        return `"${stringValue}"`;
      }).join(',');
      csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = `DetallesPedido_${group.id}_${new Date().toISOString().split('T')[0]}.csv`;
    saveAs(blob, filename);
    this.showToast('Archivo CSV de detalles descargado exitosamente', 'success');
  }

  showToast(message: string, type: 'success' | 'error' | 'info' | 'warning'): void {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196F3'};
      color: white;
      padding: 12px 24px;
      border-radius: 4px;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.style.opacity = '1', 100);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  openConfirmModal(message: string, action: () => void, title: string = 'Confirmar Acción'): void {
    this.confirmMessage = message;
    this.confirmAction = action;
    this.confirmTitle = title;
    this.showConfirmModal = true;
  }

  closeConfirmModal(): void {
    this.showConfirmModal = false;
    this.confirmAction = null;
    this.confirmMessage = '';
    this.confirmTitle = 'Confirmar Acción';
  }

  executeConfirmAction(): void {
    if (this.confirmAction) {
      this.confirmAction();
    }
    this.closeConfirmModal();
  }

  toggleGroup(key: string): void {
    if (this.expandedGroups.has(key)) {
      this.expandedGroups.delete(key);
    } else {
      this.expandedGroups.add(key);
    }
  }

  isGroupExpanded(key: string): boolean {
    return this.expandedGroups.has(key);
  }

  editOil(oil: Oil1): void {
    this.router.navigate(['/oil-edit', oil.idOil]);
  }

  deleteOil(idOil: number | undefined): void {
    if (idOil === undefined) {
      this.showToast('Error: ID de aceite no disponible para eliminar.', 'error');
      return;
    }

    this.openConfirmModal('¿Está seguro de que desea eliminar este aceite?', () => {
      this.oilService.deleteOil(idOil).subscribe({
        next: () => {
          this.showToast('Aceite eliminado exitosamente.', 'success');
          this.reloadService.triggerReload();
        },
        error: (error) => {
          this.showToast(`Error al eliminar aceite: ${error.error?.message || error.message}`, 'error');
        }
      });
    }, 'Confirmar Eliminación');
  }
}