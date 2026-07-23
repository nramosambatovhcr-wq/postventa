import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import * as XLSX from 'xlsx';
import saveAs from 'file-saver';

import { AuthService } from 'src/app/services/auth.service';
import { ReloadService } from 'src/app/services/reload.service';
import { Usuario } from 'src/app/models/usuario';
import { OilService, PedidoFilterDetail, PedidoInsumoDetail, PedidoOilDetail } from 'src/app/services/oil.service';

// Define la interfaz para el pedido agrupado
export interface GroupedPedido {
  key: string; // Clave única para la agrupación (fecha-proveedor)
  fechaPedido: Date;
  nombreProveedor: string;
  estadoPedido: string; // Estado general del grupo (puedes definir la lógica para esto)
  items: PedidoInsumoDetail[]; // Array de los ítems individuales que componen este pedido agrupado
  idPedido?: number; // Referencia a un ID de pedido original para el título del modal, si se desea
  tiposIncluidos?: string[]; // Added for consistency, though not used in insumo list logic currently
}


@Component({
  selector: 'app-insumouslist',
  templateUrl: './insumouslist.component.html',
  styleUrls: ['./insumouslist.component.css']
})
export class InsumouslistComponent implements OnInit, OnDestroy {
  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 0;
  lista: GroupedPedido[] = []; // Ahora la lista es de pedidos agrupados
  allData: PedidoInsumoDetail[] = []; // Todos los datos individuales de la API
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

  paginaActual: any;
  observacionesModalVisible: boolean = false;
  selectedPedido: PedidoOilDetail | null = null; // Changed to PedidoOilDetail, assuming a common interface or need for it here. Consider if this should be PedidoInsumoDetail or a more generic type.
  id = 0;

  constructor(
    private router: Router,
    private pedidosOilService: OilService,
    private reloadService: ReloadService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    // Suscribirse a los cambios del usuario para obtener el ID
    this.subscription.add(
      this.authService.usuarioActual$.subscribe(usuario => {
        this.usuario = usuario;
        if (this.usuario && this.usuario.id) {
          this.id = this.usuario.id;
          this.loadPedidosInsumo(this.usuario.id);
        } else {
          console.warn('No se pudo obtener el ID del usuario. No se cargarán los pedidos.');
          this.errorMessage = 'No se pudo cargar los pedidos: Usuario no autenticado o ID no disponible.';
        }
      })
    );

    // Suscribirse a eventos de recarga
    this.subscription.add(
      this.reloadService.reload$.subscribe(() => {
        if (this.usuario && this.usuario.id) {
          this.loadPedidosInsumo(this.usuario.id);
        }
      })
    );

    // Inicializar filtros de fecha con el mes actual
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    this.startDate = this.formatDateForInput(firstDayOfMonth);
    this.endDate = this.formatDateForInput(lastDayOfMonth);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  /**
   * Loads insumo orders for the current user from the API.
   * @param userId The ID of the user to fetch orders for.
   */
  loadPedidosInsumo(userId: number): void {
    this.loading = true;
    this.errorMessage = null;

    this.pedidosOilService.getInsumoPedidosByUserId(userId).subscribe({
      next: (data: PedidoInsumoDetail[]) => {
        this.allData = data || []; // Almacena todos los datos individuales
        this.groupedData = this.groupPedidosByDateAndSupplier(this.allData); // Agrupa los datos
        this.applyFiltersAndSearch(); // Aplica filtros y búsqueda a los datos agrupados
        this.loading = false;
      },
      error: (e) => {
        console.error('Error al cargar pedidos de insumo:', e);
        this.errorMessage = 'Error al cargar la lista de pedidos de insumo.';
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

    // Recargar conteos de observaciones
  }

  /**
   * Groups individual PedidoInsumoDetail items by Fecha Pedido and Nombre Proveedor.
   * @param data The array of individual PedidoInsumoDetail items.
   * @returns An array of GroupedPedido objects.
   */
  private groupPedidosByDateAndSupplier(data: PedidoInsumoDetail[]): GroupedPedido[] {
    const groupedMap = new Map<string, GroupedPedido>();

    data.forEach(item => {
      // Formato de fecha para la clave de agrupación (YYYY-MM-DD)
      const dateKey = item.fechaPedido ? new Date(item.fechaPedido).toISOString().split('T')[0] : 'no-date';
      const supplierKey = item.nombreProveedor || 'no-supplier';
      const groupKey = `${dateKey}-${supplierKey}`;

      if (!groupedMap.has(groupKey)) {
        groupedMap.set(groupKey, {
          key: groupKey,
          fechaPedido: item.fechaPedido,
          nombreProveedor: item.nombreProveedor,
          estadoPedido: item.estadoPedido, // Puedes definir una lógica más compleja para el estado general si es necesario
          items: [],
          idPedido: item.idPedido, // Guarda una referencia a un ID de pedido para el título del modal
          tiposIncluidos: [] // Initialize new property for consistency
        });
      }
      const currentGroup = groupedMap.get(groupKey);
      if (currentGroup) {
        currentGroup.items.push(item);
        // Add logic to determine included types if needed for Insumo components later
        // Example: if (item.someProperty.includes('insumoType')) { currentGroup.tiposIncluidos?.push('insumoType'); }
      }
    });

    // Convierte el mapa a un array y ordénalo
    const sortedGroupedPedidos = Array.from(groupedMap.values()).sort((a, b) => {
      const dateA = a.fechaPedido ? new Date(a.fechaPedido).getTime() : 0;
      const dateB = b.fechaPedido ? new Date(b.fechaPedido).getTime() : 0;
      return dateB - dateA; // Ordenar por fecha descendente
    });

    return sortedGroupedPedidos;
  }


  /**
   * Applies search term and date filters to the grouped data.
   */
  applyFiltersAndSearch(): void {
    let tempFilteredData = [...this.groupedData]; // Ahora filtra sobre los datos agrupados

    // Aplicar filtro de fecha
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

    // Aplicar filtro de búsqueda (busca dentro de los ítems de cada grupo)
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const searchTermLower = this.searchTerm.toLowerCase();
      tempFilteredData = tempFilteredData.filter(group =>
        group.items.some(item => // Verifica si ALGÚN ítem dentro del grupo coincide
          (item.codigoInsumo && item.codigoInsumo.toLowerCase().includes(searchTermLower)) ||
          (item.descripcionInsumo && item.descripcionInsumo.toLowerCase().includes(searchTermLower)) ||
          (item.presentacionInsumo && item.presentacionInsumo.toLowerCase().includes(searchTermLower)) ||
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
    this.currentPage = 1; // Reiniciar a la primera página
    this.updatePageData();
  }

  /**
   * Calculates total pages based on filtered data
   */
  calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    if (this.totalPages === 0) this.totalPages = 1; // Mínimo 1 página
  }

  /**
   * Updates the 'lista' array based on current page and items per page.
   */
  updatePageData(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.lista = this.filteredData.slice(startIndex, endIndex);
  }

  /**
   * Changes the current page.
   * @param page The page number to navigate to.
   */
  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePageData();
  }

  /**
   * Generates an array of page numbers for pagination, including ellipsis.
   * @returns An array of page numbers or -1 for ellipsis.
   */
  getPaginationArray(): number[] {
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;

    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      const pages: number[] = [];
      pages.push(1);

      if (currentPage > 3) {
        pages.push(-1); // Ellipsis
      }

      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push(-1); // Ellipsis
      }

      if (totalPages > 1) {
        pages.push(totalPages);
      }
      return pages;
    }
  }

  /**
   * Helper method to format Date objects for input fields (YYYY-MM-DD).
   * @param date The Date object to format.
   * @returns A formatted date string.
   */
  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Resets the date filters and reloads data.
   */
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

    // Para la exportación, podemos aplanar los datos agrupados si se desea exportar cada ítem individualmente
    const flatDataForExport = this.filteredData.flatMap(group => group.items);

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(flatDataForExport);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PedidosInsumos');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `PedidosInsumos_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  downloadCSV(): void {
    if (this.filteredData.length === 0) {
      console.warn('No hay datos para exportar');
      return;
    }

    // Para la exportación CSV, también aplanamos los datos
    const flatDataForExport = this.filteredData.flatMap(group => group.items);

    let csvContent = 'ID Pedido,Código Insumo,Descripción Insumo,Presentación,Cantidad Solicitada,Proveedor,Estado,Fecha Pedido,Fecha Modificación\n';
    flatDataForExport.forEach(item => {
      const row = [
        item.idPedido || '',
        item.codigoInsumo || '',
        item.descripcionInsumo || '',
        item.presentacionInsumo || '-',
        item.cantidadSolicitada || '',
        item.nombreProveedor || '-',
        item.estadoPedido || '-',
        item.fechaPedido ? new Date(item.fechaPedido).toLocaleDateString() : '-',
        item.fechaModificacionPedido ? new Date(item.fechaModificacionPedido).toLocaleDateString() : '-'
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
      csvContent += row + '\n';
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `PedidosInsumo_${new Date().toISOString().split('T')[0]}.csv`);
  }

  individual(): void {
    this.router.navigate(['/insumouscreate']);
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
  cancelado(): void { // Renamed from 'error' for clarity, assuming it maps to 'CANCELADO'
    this.filterByStatus('CANCELADO');
  }
  clearStatusFilter(): void { // New method to clear the status filter
    this.selectedStatusFilter = null;
    this.applyFiltersAndSearch();
  }

  /**
   * TrackBy function for ngFor to improve performance when iterating over grouped data
   */
  trackByGroupKey(index: number, group: GroupedPedido): string {
    return group.key; // Usar la clave de agrupación como trackBy
  }

  /**
   * Opens the modal and displays the details for the selected grouped pedido.
   * @param group The GroupedPedido object to display details for.
   */
  viewPedidoDetails(group: GroupedPedido): void {
    this.selectedGroupedPedidoForDetails = group;
    this.showDetailsModal = true;
    this.errorMessage = null; // Limpiar cualquier mensaje de error previo
    // No se necesita cargar los detalles del pedido de la API, ya están en group.items
  }

  /**
   * Closes the pedido details modal.
   */
  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedGroupedPedidoForDetails = null;
    this.errorMessage = null; // Limpiar mensaje de error al cerrar el modal
  }

  /**
   * Exports the detailed items of the currently selected grouped pedido to an Excel file,
   * matching the columns displayed in the modal.
   */
  downloadModalExcel(): void {
    if (!this.selectedGroupedPedidoForDetails || !this.selectedGroupedPedidoForDetails.items || this.selectedGroupedPedidoForDetails.items.length === 0) {
      console.warn('No hay ítems en el pedido seleccionado para exportar.');
      return;
    }

    // Map the items to a new array with only the desired columns and their headers
    const itemsForExport = this.selectedGroupedPedidoForDetails.items.map(item => ({

      'Código': item.codigoInsumo,
      'Descripción': item.descripcionInsumo,
      'Presentación': item.presentacionInsumo || '-',
      'Cantidad': item.cantidadSolicitada,
      'Proveedor': item.nombreProveedor,
      'Estado Ítem': item.estadoPedido || '-', // Assuming you want this column as well
      'Usuario': this.usuario?.nombreUsuario
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(itemsForExport);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DetallesPedidoInsumos');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    const fechaPedidoFormatted = this.selectedGroupedPedidoForDetails.fechaPedido ?
      new Date(this.selectedGroupedPedidoForDetails.fechaPedido).toISOString().split('T')[0] : 'sin_fecha';

    const filename = `DetallesPedidoInsumos_${fechaPedidoFormatted}_${this.selectedGroupedPedidoForDetails.nombreProveedor || 'sin_proveedor'}.xlsx`;
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, filename);
  }

  /**
   * Exports the detailed items of the currently selected grouped pedido to a CSV file,
   * matching the columns displayed in the modal.
   */
  downloadModalCSV(): void {
    if (!this.selectedGroupedPedidoForDetails || !this.selectedGroupedPedidoForDetails.items || this.selectedGroupedPedidoForDetails.items.length === 0) {
      console.warn('No hay ítems en el pedido seleccionado para exportar.');
      return;
    }

    let csvContent = 'Código,Descripción,Presentación,Cantidad,Estado Ítem\n'; // CSV headers

    this.selectedGroupedPedidoForDetails.items.forEach(item => {
      const row = [
        item.codigoInsumo || '',
        item.descripcionInsumo || '',
        item.presentacionInsumo || '-',
        item.cantidadSolicitada || '',
        item.estadoPedido || '-'
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','); // Handle commas and quotes
      csvContent += row + '\n';
    });

    const fechaPedidoFormatted = this.selectedGroupedPedidoForDetails.fechaPedido ?
      new Date(this.selectedGroupedPedidoForDetails.fechaPedido).toISOString().split('T')[0] : 'sin_fecha';

    const filename = `DetallesPedidoInsumos_${fechaPedidoFormatted}_${this.selectedGroupedPedidoForDetails.nombreProveedor || 'sin_proveedor'}.csv`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, filename);
  }
}