import { Component, OnDestroy, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import * as XLSX from 'xlsx';
import saveAs from 'file-saver';
import { OilService, PedidoOilDetail } from 'src/app/services/oil.service';
import { ReloadService } from 'src/app/services/reload.service';
import { AuthService } from 'src/app/services/auth.service';
import { Usuario } from 'src/app/models/usuario';

export interface GroupedPedido {
  key: string;
  fechaPedido?: Date;
  nombreProveedor?: string;
  estadoPedido?: string;
  nombreUsuarioSolicitante?: string;
  nombreAgencia?: string;
  items: PedidoOilDetail[];
  idPedido?: number;
  totalItems?: number;
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
  selector: 'app-oil-list',
  templateUrl: './oil-list.component.html',
  styleUrls: ['./oil-list.component.css'],
  // FIX LENTITUD: Usar OnPush para que Angular solo renderice cuando cambien referencias
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OilListComponent implements OnInit, OnDestroy {
  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 0;
  lista: GroupedPedido[] = [];
  allData: PedidoOilDetail[] = [];
  groupedData: GroupedPedido[] = [];
  filteredData: GroupedPedido[] = [];
  loading = false;
  private subscription = new Subscription();

  startDate: string = '';
  endDate: string = '';
  totalItems: number = 0;
  paginaActual: string = '';
  errorMessage: string = '';

  showDetailsModal: boolean = false;
  selectedGroupedPedidoForDetails: GroupedPedido | null = null;

  showExportMenu: boolean = false;
  id: number = 0;
  usuario: Usuario | null = null;
  usrol = '';

  selectedPedido: PedidoOilDetail | null = null;
  observacionesModalVisible: boolean = false;

  constructor(
    private router: Router,
    private oilService: OilService,
    private reloadService: ReloadService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef  // FIX LENTITUD: necesario con OnPush
  ) { }

  ngOnInit(): void {
    this.paginaActual = 'pendiente';

    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      if (this.usuario != null) {
        this.id = this.usuario.id;
        this.usrol = this.usuario.rol;
        this.loadOils();
      }
    });

    this.subscription.add(
      this.reloadService.reload$.subscribe(() => {
        this.loadOils();
      })
    );

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    this.startDate = this.formatDateForInput(firstDayOfMonth);
    this.endDate = this.formatDateForInput(lastDayOfMonth);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  // ─── FIX CARD ESTADO: método genérico que centraliza la carga ───────────────

  private loadByEstado(estado: string, serviceCall: () => any): void {
    this.paginaActual = estado;  // Se asigna ANTES de llamar al servicio
    this.loading = true;
    this.errorMessage = '';
    // FIX LENTITUD: limpiar lista de inmediato para que el spinner aparezca rápido
    this.lista = [];
    this.cdr.markForCheck();

    serviceCall().subscribe({
      next: (data: PedidoOilDetail[]) => {
        this.allData = data || [];
        // FIX LENTITUD: agrupación O(n) en lugar de O(n²)
        this.groupedData = this.groupPedidosByDateSupplierUserAgency(this.allData);
        this.applyFiltersAndSearch();
        this.loading = false;
        this.cdr.markForCheck();  // FIX LENTITUD: notificar a Angular que actualice la vista
      },
      error: (error: any) => {
        console.error('Error al cargar pedidos:', error);
        this.errorMessage = 'Error al cargar la lista de pedidos. Por favor, intente nuevamente.';
        this.allData = [];
        this.groupedData = [];
        this.filteredData = [];
        this.lista = [];
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ─── FIX CARD ESTADO: cada método ahora asigna correctamente paginaActual ──

  loadOils(): void {
    // FIX: pendiente también debe setear paginaActual
    this.loadByEstado('pendiente', () => this.oilService.getAllOilPedidos());
  }

  loadOilsA(): void {
    this.loadByEstado('asignado', () => this.oilService.getAllOilPedidosA());
  }

  loadOilsP(): void {
    this.loadByEstado('proceso', () => this.oilService.getAllOilPedidosP());
  }

  loadOilsE(): void {
    this.loadByEstado('revisados', () => this.oilService.getAllOilPedidosEn());
  }

  // FIX CARD ESTADO: CANCELADO ahora carga datos reales en lugar de solo cambiar paginaActual
  loadOilsCancelado(): void {
    this.loadByEstado('error', () => this.oilService.getAllOilPedidos());
    // Si no existe ese método en el servicio, usar el genérico y filtrar:
    // this.loadByEstado('error', () => this.oilService.getAllOilPedidos());
  }

  // Mantener error() por compatibilidad, pero ahora carga datos
  error(): void {
    this.loadOilsCancelado();
  }

  changeGroupingCriteria(criteria: string[]): void {
    this.groupedData = this.groupByCustomCriteria(criteria);
    this.applyFiltersAndSearch();
  }

  openObservacionesModal(pedido: any): void {
    this.selectedPedido = pedido;
    this.observacionesModalVisible = true;
  }

  closeObservacionesModal(): void {
    this.observacionesModalVisible = false;
  }

  actualizarEstadoPedido(group: any) {
    if (!group.items || !Array.isArray(group.items)) {
      console.error('No se encontraron items para actualizar');
      return;
    }

    group.items.forEach((item: any) => {
      this.oilService.updateOilRequestStatus(item.idPedido, group.estadoPedido)
        .subscribe({
          next: (response: any) => {
            console.log(`Estado actualizado para item ${item.idPedido}:`, response);
          },
          error: (error: any) => {
            console.error(`Error al actualizar item ${item.idPedido}:`, error);
          }
        });
    });

    // Recargar respetando el estado activo actual
    this.recargarEstadoActual();
  }

  // FIX: recargar siempre el estado activo actual, no siempre "pendiente"
  private recargarEstadoActual(): void {
    switch (this.paginaActual) {
      case 'pendiente': this.loadOils(); break;
      case 'asignado': this.loadOilsA(); break;
      case 'proceso': this.loadOilsP(); break;
      case 'revisados': this.loadOilsE(); break;
      case 'error': this.loadOilsCancelado(); break;
    }
  }

  // ─── FIX LENTITUD: agrupación O(n) — eliminado el data.filter() interno ────

  private groupPedidosByDateSupplierUserAgency(data: PedidoOilDetail[]): GroupedPedido[] {
    const groupedMap = new Map<string, GroupedPedido>();

    // PASO 1: un solo recorrido para construir los grupos (antes era O(n²))
    data.forEach(item => {
      const dateKey = item.fechaPedido
        ? new Date(item.fechaPedido).toISOString().split('T')[0]
        : 'sin-fecha';
      const supplierKey = item.nombreProveedor?.trim() || 'sin-proveedor';
      const userKey = item.nombreUsuarioSolicitante?.trim() || 'sin-usuario';
      const agencyKey = item.agencia?.trim() || 'sin-agencia';
      const groupKey = `${dateKey}|${supplierKey}|${userKey}|${agencyKey}`;

      if (!groupedMap.has(groupKey)) {
        groupedMap.set(groupKey, {
          key: groupKey,
          fechaPedido: item.fechaPedido,
          nombreProveedor: item.nombreProveedor,
          estadoPedido: item.estadoPedido?.toUpperCase().trim() || 'PENDIENTE',
          nombreUsuarioSolicitante: item.nombreUsuarioSolicitante,
          nombreAgencia: item.agencia,
          items: [],
          idPedido: item.idPedido,
          totalItems: 0
        });
      }

      const group = groupedMap.get(groupKey)!;
      group.items.push(item);
      group.totalItems = group.items.length;
    });

    // PASO 2: determinar estado del grupo una vez que ya están todos los items
    groupedMap.forEach(group => {
      group.estadoPedido = this.determineGroupStatus(group.items);
    });

    // PASO 3: ordenar
    return Array.from(groupedMap.values()).sort((a, b) => {
      const dateA = a.fechaPedido ? new Date(a.fechaPedido).getTime() : 0;
      const dateB = b.fechaPedido ? new Date(b.fechaPedido).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;

      const agencyCompare = (a.nombreAgencia || '').localeCompare(b.nombreAgencia || '');
      if (agencyCompare !== 0) return agencyCompare;

      const providerCompare = (a.nombreProveedor || '').localeCompare(b.nombreProveedor || '');
      if (providerCompare !== 0) return providerCompare;

      return (a.nombreUsuarioSolicitante || '').localeCompare(b.nombreUsuarioSolicitante || '');
    });
  }

  private determineGroupStatus(items: PedidoOilDetail[]): string {
    if (!items || items.length === 0) return 'DESCONOCIDO';

    const statuses = items.map(item => item.estadoPedido?.toUpperCase().trim() || 'PENDIENTE');
    const uniqueStatuses = [...new Set(statuses)];

    if (uniqueStatuses.length === 1) return uniqueStatuses[0];

    const statusPriority = [
      'ERROR', 'INFORMACION ERRONEA', 'RECHAZADO', 'CANCELADO',
      'EN PROCESO', 'PROCESO', 'ASIGNADO',
      'REVISADO', 'APROBADO', 'FINALIZADO', 'COMPLETADO', 'PENDIENTE'
    ];

    for (const priorityStatus of statusPriority) {
      if (statuses.includes(priorityStatus)) {
        if (['ERROR', 'INFORMACION ERRONEA', 'RECHAZADO'].includes(priorityStatus)) {
          return priorityStatus;
        }
        if (['EN PROCESO', 'PROCESO', 'ASIGNADO'].includes(priorityStatus)) {
          return 'EN PROCESO';
        }
        return priorityStatus;
      }
    }

    return 'ESTADO MIXTO';
  }

  applyFiltersAndSearch(): void {
    let tempFilteredData = [...this.groupedData];

    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);

      tempFilteredData = tempFilteredData.filter(group => {
        if (!group.fechaPedido) return false;
        const groupDate = new Date(group.fechaPedido);
        return groupDate >= start && groupDate <= end;
      });
    }

    if (this.searchTerm.trim() !== '') {
      const searchTermLower = this.searchTerm.toLowerCase().trim();
      tempFilteredData = tempFilteredData.filter(group =>
        (group.nombreProveedor?.toLowerCase().includes(searchTermLower)) ||
        (group.estadoPedido?.toLowerCase().includes(searchTermLower)) ||
        (group.nombreUsuarioSolicitante?.toLowerCase().includes(searchTermLower)) ||
        (group.nombreAgencia?.toLowerCase().includes(searchTermLower)) ||
        group.items.some(item =>
          (item.codigoOil?.toLowerCase().includes(searchTermLower)) ||
          (item.descripcionOil?.toLowerCase().includes(searchTermLower)) ||
          (item.presentacionOil?.toLowerCase().includes(searchTermLower)) ||
          (item.estadoPedido?.toLowerCase().includes(searchTermLower))
        )
      );
    }

    this.filteredData = tempFilteredData;
    this.totalItems = this.filteredData.length;
    this.calculateTotalPages();
    this.currentPage = 1;
    this.updatePageData();
  }

  getGroupStatistics(): { [key: string]: number } {
    const stats = { total: this.filteredData.length, pendientes: 0, enProceso: 0, finalizados: 0, errores: 0 };
    this.filteredData.forEach(group => {
      const estado = group.estadoPedido?.toUpperCase() || 'PENDIENTE';
      if (estado.includes('PENDIENTE')) stats.pendientes++;
      else if (estado.includes('PROCESO') || estado.includes('ASIGNADO')) stats.enProceso++;
      else if (estado.includes('FINALIZADO') || estado.includes('COMPLETADO') || estado.includes('APROBADO')) stats.finalizados++;
      else if (estado.includes('ERROR') || estado.includes('RECHAZADO')) stats.errores++;
    });
    return stats;
  }

  groupByCustomCriteria(criteria: string[]): GroupedPedido[] {
    const groupedMap = new Map<string, GroupedPedido>();

    this.allData.forEach(item => {
      const keyParts: string[] = [];
      criteria.forEach(criterion => {
        switch (criterion) {
          case 'fecha': keyParts.push(item.fechaPedido ? new Date(item.fechaPedido).toISOString().split('T')[0] : 'sin-fecha'); break;
          case 'proveedor': keyParts.push(item.nombreProveedor?.trim() || 'sin-proveedor'); break;
          case 'usuario': keyParts.push(item.nombreUsuarioSolicitante?.trim() || 'sin-usuario'); break;
          case 'agencia': keyParts.push(item.agencia?.trim() || 'sin-agencia'); break;
          case 'estado': keyParts.push(item.estadoPedido?.trim() || 'sin-estado'); break;
          default: keyParts.push('sin-criterio');
        }
      });

      const groupKey = keyParts.join('|');
      if (!groupedMap.has(groupKey)) {
        groupedMap.set(groupKey, {
          key: groupKey,
          fechaPedido: item.fechaPedido,
          nombreProveedor: item.nombreProveedor,
          estadoPedido: item.estadoPedido,
          nombreUsuarioSolicitante: item.nombreUsuarioSolicitante,
          nombreAgencia: item.agencia,
          items: [],
          idPedido: item.idPedido,
          totalItems: 0
        });
      }

      const group = groupedMap.get(groupKey)!;
      group.items.push(item);
      group.totalItems = group.items.length;
      group.estadoPedido = this.determineGroupStatus(group.items);
    });

    return Array.from(groupedMap.values());
  }

  calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    if (this.totalPages === 0) this.totalPages = 1;
  }

  updatePageData(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    this.lista = this.filteredData.slice(startIndex, startIndex + this.itemsPerPage);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePageData();
    this.cdr.markForCheck();
  }

  getPaginationArray(): number[] {
    const { totalPages, currentPage } = this;
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);

    const pages: number[] = [1];
    if (currentPage > 3) pages.push(-1);
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push(-1);
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  }

  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  resetDateFilter(): void {
    this.startDate = '';
    this.endDate = '';
    this.applyFiltersAndSearch();
  }

  toggleExportMenu(): void {
    this.showExportMenu = !this.showExportMenu;
  }

  downloadExcel(): void {
    if (this.filteredData.length === 0) { this.showToast('No hay datos para exportar', 'error'); return; }
    const flatDataForExport = this.filteredData.flatMap(group =>
      group.items.map(item => ({
        'ID Pedido': item.idPedido || '',
        'Fecha Pedido': item.fechaPedido ? new Date(item.fechaPedido).toLocaleDateString('es-ES') : '-',
        'Código Aceite': item.codigoOil || '',
        'Descripción': item.descripcionOil || '',
        'Presentación': item.presentacionOil || '-',
        'Cantidad Solicitada': item.cantidadSolicitada || '',
        'Proveedor': item.nombreProveedor || '-',
        'Estado': item.estadoPedido || '-',
        'Fecha Modificación': item.fechaModificacionPedido ? new Date(item.fechaModificacionPedido).toLocaleDateString('es-ES') : '-'
      }))
    );
    const worksheet = XLSX.utils.json_to_sheet(flatDataForExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PedidosAceite');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `PedidosAceite_${new Date().toISOString().split('T')[0]}.xlsx`);
    this.showToast('Archivo Excel descargado exitosamente', 'success');
  }

  downloadCSV(): void {
    if (this.filteredData.length === 0) { this.showToast('No hay datos para exportar', 'error'); return; }
    const flatData = this.filteredData.flatMap(group => group.items);
    let csvContent = 'ID Pedido,Código Aceite,Descripción,Presentación,Cantidad Solicitada,Proveedor,Estado,Fecha Pedido,Fecha Modificación\n';
    flatData.forEach(item => {
      const row = [
        item.idPedido || '', item.codigoOil || '', item.descripcionOil || '',
        item.presentacionOil || '-', item.cantidadSolicitada || '', item.nombreProveedor || '-',
        item.estadoPedido || '-',
        item.fechaPedido ? new Date(item.fechaPedido).toLocaleDateString('es-ES') : '-',
        item.fechaModificacionPedido ? new Date(item.fechaModificacionPedido).toLocaleDateString('es-ES') : '-'
      ].map(f => `"${String(f).replace(/"/g, '""')}"`).join(',');
      csvContent += row + '\n';
    });
    saveAs(new Blob([csvContent], { type: 'text/csv;charset=utf-8' }), `PedidosAceite_${new Date().toISOString().split('T')[0]}.csv`);
    this.showToast('Archivo CSV descargado exitosamente', 'success');
  }

  viewPedidoDetails(group: GroupedPedido): void {
    this.selectedGroupedPedidoForDetails = group;
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedGroupedPedidoForDetails = null;
  }

  downloadModalExcel(): void {
    if (!this.selectedGroupedPedidoForDetails?.items?.length) { this.showToast('No hay ítems para exportar', 'error'); return; }
    const itemsForExport = this.selectedGroupedPedidoForDetails.items.map(item => ({
      'Código': item.codigoOil || '', 'Descripción': item.descripcionOil || '',
      'Presentación': item.presentacionOil || '-', 'Cantidad': item.cantidadSolicitada || '',
      'Estado Ítem': item.estadoPedido || '-'
    }));
    const worksheet = XLSX.utils.json_to_sheet(itemsForExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DetallesPedido');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const fecha = this.selectedGroupedPedidoForDetails.fechaPedido
      ? new Date(this.selectedGroupedPedidoForDetails.fechaPedido).toISOString().split('T')[0] : 'sin_fecha';
    saveAs(new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `DetallesPedido_${fecha}_${this.selectedGroupedPedidoForDetails.nombreProveedor || 'sin_proveedor'}.xlsx`);
    this.showToast('Detalles exportados a Excel exitosamente', 'success');
  }

  downloadModalCSV(): void {
    if (!this.selectedGroupedPedidoForDetails?.items?.length) { this.showToast('No hay ítems para exportar', 'error'); return; }
    let csvContent = 'Código,Descripción,Presentación,Cantidad,Estado Ítem\n';
    this.selectedGroupedPedidoForDetails.items.forEach(item => {
      const row = [item.codigoOil || '', item.descripcionOil || '', item.presentacionOil || '-',
        item.cantidadSolicitada || '', item.estadoPedido || '-']
        .map(f => `"${String(f).replace(/"/g, '""')}"`).join(',');
      csvContent += row + '\n';
    });
    const fecha = this.selectedGroupedPedidoForDetails.fechaPedido
      ? new Date(this.selectedGroupedPedidoForDetails.fechaPedido).toISOString().split('T')[0] : 'sin_fecha';
    saveAs(new Blob([csvContent], { type: 'text/csv;charset=utf-8' }), `DetallesPedido_${fecha}_${this.selectedGroupedPedidoForDetails.nombreProveedor || 'sin_proveedor'}.csv`);
    this.showToast('Detalles exportados a CSV exitosamente', 'success');
  }

  trackByGroupKey(index: number, group: GroupedPedido): string {
    return group.key;
  }

  showToast(message: string, type: 'success' | 'error' | 'info'): void {
    console.log(`${type.toUpperCase()}: ${message}`);
    const toast = document.createElement('div');
    toast.innerText = message;
    toast.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 9999;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
      color: white; padding: 12px 24px; border-radius: 4px;
      opacity: 0; transition: opacity 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.style.opacity = '1', 50);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.parentNode?.removeChild(toast), 300);
    }, 3000);
  }

  goToCreateOil(): void { this.router.navigate(['/oil']); }
  goToCreateFilter(): void { this.router.navigate(['/filter']); }
  goToCreateInsumo(): void { this.router.navigate(['/insumo']); }

  // Métodos legacy mantenidos por compatibilidad
  revisado(): void { this.paginaActual = 'revisados'; }
  pendiente(): void { this.paginaActual = 'pendiente'; this.router.navigate(['/oillist']); }
  proceso(): void { this.paginaActual = 'proceso'; }
  asignado(): void { this.paginaActual = 'asignado'; }
  resetearEstado(): void { this.paginaActual = ''; }

  editOil(oil: Oil1): void {
    console.log('Editando aceite:', oil);
    this.router.navigate(['/oil-edit', oil.idOil]);
  }

  deleteOil(idOil: number | undefined): void {
    if (idOil === undefined) { console.error('Cannot delete oil: ID is undefined.'); return; }
    if (confirm('¿Está seguro de que desea eliminar este aceite?')) {
      this.oilService.deleteOil(idOil).subscribe({
        next: () => { this.showToast('Aceite eliminado exitosamente', 'success'); this.loadOils(); },
        error: (error) => {
          console.error('Error al eliminar aceite:', error);
          this.showToast(`Error al eliminar aceite: ${error.error || error.message}`, 'error');
        }
      });
    }
  }
}