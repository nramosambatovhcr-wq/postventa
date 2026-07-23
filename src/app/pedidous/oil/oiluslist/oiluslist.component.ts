import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import * as XLSX from 'xlsx';
import saveAs from 'file-saver';

import { AuthService } from 'src/app/services/auth.service';
import { ReloadService } from 'src/app/services/reload.service';
import { Usuario } from 'src/app/models/usuario';
import { OilService, PedidoOilDetail } from 'src/app/services/oil.service';

// Define la interfaz para el pedido agrupado
export interface GroupedPedido {
  key: string; // Clave única para la agrupación (fecha-proveedor)
  fechaPedido: Date;
  nombreProveedor: string;
  estadoPedido: string; // Estado general del grupo (puedes definir la lógica para esto)
  items: PedidoOilDetail[]; // Array de los ítems individuales que componen este pedido agrupado
  idPedido?: number; // Referencia a un ID de pedido original para el título del modal, si se desea
  tiposIncluidos?: string[]; // Add this property to GroupedPedido interface
}

@Component({
  selector: 'app-oiluslist',
  templateUrl: './oiluslist.component.html',
  styleUrls: ['./oiluslist.component.css']
})
export class OiluslistComponent implements OnInit, OnDestroy {
  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 0;
  lista: GroupedPedido[] = []; // Ahora la lista es de pedidos agrupados
  allData: PedidoOilDetail[] = []; // Todos los datos individuales de la API
  groupedData: GroupedPedido[] = []; // Datos agrupados
  filteredData: GroupedPedido[] = []; // Datos agrupados y filtrados
  loading = false;
  private subscription = new Subscription();
  usuario: Usuario | null = null;

  // Date filter variables
  startDate: string = '';
  endDate: string = '';
  totalItems: number = 0;
  errorMessage: any;
  showExportMenu: boolean = false;

  // Modal properties
  showDetailsModal: boolean = false;
  selectedGroupedPedidoForDetails: GroupedPedido | null = null; // El pedido agrupado seleccionado para el modal

  // New property for status filtering
  selectedStatusFilter: string | any; // Stores the currently selected status

  paginaActual: any; // Keep this if you use it for other purposes, but selectedStatusFilter will handle the filtering.
  observacionesModalVisible: boolean = false;
  selectedPedido: PedidoOilDetail | null = null;
  id = 0;

  constructor(
    private router: Router,
    private pedidosOilService: OilService,
    private reloadService: ReloadService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.subscription.add(
      this.authService.usuarioActual$.subscribe(usuario => {
        this.usuario = usuario;
        if (this.usuario && this.usuario.id) {
          this.id = this.usuario.id;
          this.loadPedidosOil(this.usuario.id);
        } else {
          console.warn('No se pudo obtener el ID del usuario. No se cargarán los pedidos.');
          this.errorMessage = 'No se pudo cargar los pedidos: Usuario no autenticado o ID no disponible.';
        }
      })
    );

    this.subscription.add(
      this.reloadService.reload$.subscribe(() => {
        if (this.usuario && this.usuario.id) {
          this.loadPedidosOil(this.usuario.id);
        }
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

  loadPedidosOil(userId: number): void {
    this.loading = true;
    this.errorMessage = null;

    this.pedidosOilService.getOilPedidosByUserId(userId).subscribe({
      next: (data: PedidoOilDetail[]) => {
        this.allData = data || [];
        this.groupedData = this.groupPedidosByDateAndSupplier(this.allData);
        this.applyFiltersAndSearch(); // Call after data is loaded and grouped
        this.loading = false;
      },
      error: (e) => {
        console.error('Error al cargar pedidos de aceite:', e);
        this.errorMessage = 'Error al cargar la lista de pedidos de aceite.';
        this.allData = [];
        this.groupedData = [];
        this.filteredData = [];
        this.lista = [];
        this.loading = false;
      }
    });
  }

  openObservacionesModal(pedido: any): void {
    this.selectedPedido = pedido;
    this.observacionesModalVisible = true;
  }

  closeObservacionesModal(): void {
    this.observacionesModalVisible = false;
    this.selectedPedido = null;
  }

  private groupPedidosByDateAndSupplier(data: PedidoOilDetail[]): GroupedPedido[] {
    const groupedMap = new Map<string, GroupedPedido>();

    data.forEach(item => {
      const dateKey = item.fechaPedido ? new Date(item.fechaPedido).toISOString().split('T')[0] : 'no-date';
      const supplierKey = item.nombreProveedor || 'no-supplier';
      const groupKey = `${dateKey}-${supplierKey}`;

      if (!groupedMap.has(groupKey)) {
        groupedMap.set(groupKey, {
          key: groupKey,
          fechaPedido: item.fechaPedido,
          nombreProveedor: item.nombreProveedor,
          estadoPedido: item.estadoPedido,
          items: [],
          idPedido: item.idPedido,
          tiposIncluidos: [] // Initialize new property
        });
      }
      const currentGroup = groupedMap.get(groupKey);
      if (currentGroup) {
        currentGroup.items.push(item);

        // Logic to determine included types
        // You'll need to define how 'lubricantes', 'filtros', 'insumos' are identified from PedidoOilDetail
        // This is a placeholder; adjust based on your PedidoOilDetail structure
        if (item.descripcionOil && item.descripcionOil.toLowerCase().includes('lubricante') && !currentGroup.tiposIncluidos?.includes('lubricantes')) {
            currentGroup.tiposIncluidos?.push('lubricantes');
        }
        if (item.descripcionOil && item.descripcionOil.toLowerCase().includes('filtro') && !currentGroup.tiposIncluidos?.includes('filtros')) {
            currentGroup.tiposIncluidos?.push('filtros');
        }
        if (item.descripcionOil && item.descripcionOil.toLowerCase().includes('insumo') && !currentGroup.tiposIncluidos?.includes('insumos')) {
            currentGroup.tiposIncluidos?.push('insumos');
        }
      }
    });

    const sortedGroupedPedidos = Array.from(groupedMap.values()).sort((a, b) => {
      const dateA = a.fechaPedido ? new Date(a.fechaPedido).getTime() : 0;
      const dateB = b.fechaPedido ? new Date(b.fechaPedido).getTime() : 0;
      return dateB - dateA;
    });

    return sortedGroupedPedidos;
  }

  applyFiltersAndSearch(): void {
    let tempFilteredData = [...this.groupedData];

    // Apply date filter
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

    // Apply search term filter
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const searchTermLower = this.searchTerm.toLowerCase();
      tempFilteredData = tempFilteredData.filter(group =>
        group.items.some(item =>
          (item.codigoOil && item.codigoOil.toLowerCase().includes(searchTermLower)) ||
          (item.descripcionOil && item.descripcionOil.toLowerCase().includes(searchTermLower)) ||
          (item.presentacionOil && item.presentacionOil.toLowerCase().includes(searchTermLower)) ||
          (item.nombreProveedor && item.nombreProveedor.toLowerCase().includes(searchTermLower)) ||
          (item.estadoPedido && item.estadoPedido.toLowerCase().includes(searchTermLower))
        )
      );
    }

    // Apply status filter
    if (this.selectedStatusFilter) {
      tempFilteredData = tempFilteredData.filter(group =>
        group.estadoPedido && group.estadoPedido.toUpperCase() === this.selectedStatusFilter.toUpperCase()
      );
    }

    this.filteredData = tempFilteredData;
    this.totalItems = this.filteredData.length;
    this.calculateTotalPages();
    this.currentPage = 1;
    this.updatePageData();
  }

  calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    if (this.totalPages === 0) this.totalPages = 1;
  }

  updatePageData(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.lista = this.filteredData.slice(startIndex, endIndex);
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
    } else {
      const pages: number[] = [];
      pages.push(1);

      if (currentPage > 3) {
        pages.push(-1);
      }

      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push(-1);
      }

      if (totalPages > 1) {
        pages.push(totalPages);
      }
      return pages;
    }
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
    if (this.filteredData.length === 0) {
      console.warn('No hay datos para exportar');
      return;
    }

    const flatDataForExport = this.filteredData.flatMap(group => group.items);

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(flatDataForExport);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PedidosAceite');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `PedidosAceite_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  downloadCSV(): void {
    if (this.filteredData.length === 0) {
      console.warn('No hay datos para exportar');
      return;
    }

    const flatDataForExport = this.filteredData.flatMap(group => group.items);

    let csvContent = 'ID Pedido,Código Aceite,Descripción Aceite,Presentación,Cantidad Solicitada,Proveedor,Estado,Fecha Pedido,Fecha Modificación\n';
    flatDataForExport.forEach(item => {
      const row = [
        item.idPedido || '',
        item.codigoOil || '',
        item.descripcionOil || '',
        item.presentacionOil || '-',
        item.cantidadSolicitada || '',
        item.nombreProveedor || '-',
        item.estadoPedido || '-',
        item.fechaPedido ? new Date(item.fechaPedido).toLocaleDateString() : '-',
        item.fechaModificacionPedido ? new Date(item.fechaModificacionPedido).toLocaleDateString() : '-'
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
      csvContent += row + '\n';
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `PedidosAceite_${new Date().toISOString().split('T')[0]}.csv`);
  }

  individual(): void {
    this.router.navigate(['/oiluscreate']);
  }

  // Modified status filter methods
  filterByStatus(status: string | null): void {
    this.selectedStatusFilter = status;
    this.applyFiltersAndSearch();
  }

  // You can keep these individual methods or refactor to directly call filterByStatus in HTML
  pendiente(): void {
    this.filterByStatus('PENDIENTE');
  }
  asignado(): void {
    this.filterByStatus('ASIGNADO');
  }
  proceso(): void {
    this.filterByStatus('PROCESO');
  }
  enviado(): void {
    this.filterByStatus('ENVIADO'); // Assuming 'ENVIADOS' in HTML maps to 'ENVIADO' in data
  }
  error(): void {
    this.filterByStatus('CANCELADO'); // Assuming 'CANCELADO' in HTML maps to 'CANCELADO' or 'ERROR' in data
  }
  clearStatusFilter(): void { // New method to clear the status filter
    this.selectedStatusFilter = null;
    this.applyFiltersAndSearch();
  }


  trackByGroupKey(index: number, group: GroupedPedido): string {
    return group.key;
  }

  viewPedidoDetails(group: GroupedPedido): void {
    this.selectedGroupedPedidoForDetails = group;
    this.showDetailsModal = true;
    this.errorMessage = null;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedGroupedPedidoForDetails = null;
    this.errorMessage = null;
  }

  downloadModalExcel(): void {
    if (!this.selectedGroupedPedidoForDetails || !this.selectedGroupedPedidoForDetails.items || this.selectedGroupedPedidoForDetails.items.length === 0) {
      console.warn('No hay ítems en el pedido seleccionado para exportar.');
      return;
    }

    const itemsForExport = this.selectedGroupedPedidoForDetails.items.map(item => ({
      'Código': item.codigoOil,
      'Descripción': item.descripcionOil,
      'Presentación': item.presentacionOil || '-',
      'Cantidad': item.cantidadSolicitada,
      'Proveedor': item.nombreProveedor,
      'Estado Ítem': item.estadoPedido || '-',
      'Usuario': this.usuario?.nombreUsuario
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(itemsForExport);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DetallesPedidoAceite');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    const fechaPedidoFormatted = this.selectedGroupedPedidoForDetails.fechaPedido ?
      new Date(this.selectedGroupedPedidoForDetails.fechaPedido).toISOString().split('T')[0] : 'sin_fecha';

    const filename = `DetallesPedidoAceite_${fechaPedidoFormatted}_${this.selectedGroupedPedidoForDetails.nombreProveedor || 'sin_proveedor'}.xlsx`;
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, filename);
  }

  downloadModalCSV(): void {
    if (!this.selectedGroupedPedidoForDetails || !this.selectedGroupedPedidoForDetails.items || this.selectedGroupedPedidoForDetails.items.length === 0) {
      console.warn('No hay ítems en el pedido seleccionado para exportar.');
      return;
    }

    let csvContent = 'Código,Descripción,Presentación,Cantidad,Estado Ítem\n';

    this.selectedGroupedPedidoForDetails.items.forEach(item => {
      const row = [
        item.codigoOil || '',
        item.descripcionOil || '',
        item.presentacionOil || '-',
        item.cantidadSolicitada || '',
        item.estadoPedido || '-'
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
      csvContent += row + '\n';
    });

    const fechaPedidoFormatted = this.selectedGroupedPedidoForDetails.fechaPedido ?
      new Date(this.selectedGroupedPedidoForDetails.fechaPedido).toISOString().split('T')[0] : 'sin_fecha';

    const filename = `DetallesPedidoAceite_${fechaPedidoFormatted}_${this.selectedGroupedPedidoForDetails.nombreProveedor || 'sin_proveedor'}.csv`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, filename);
  }

  // Placeholder methods for viewing details of specific types
  viewLubricantesDetails(group: GroupedPedido): void {
      console.log('Viewing Lubricantes Details for group:', group);
      // Implement specific logic to show lubricantes details
      this.viewPedidoDetails(group); // For now, just open the general details modal
  }

  viewFiltrosDetails(group: GroupedPedido): void {
      console.log('Viewing Filtros Details for group:', group);
      // Implement specific logic to show filtros details
      this.viewPedidoDetails(group); // For now, just open the general details modal
  }

  viewInsumosDetails(group: GroupedPedido): void {
      console.log('Viewing Insumos Details for group:', group);
      // Implement specific logic to show insumos details
      this.viewPedidoDetails(group); // For now, just open the general details modal
  }
}