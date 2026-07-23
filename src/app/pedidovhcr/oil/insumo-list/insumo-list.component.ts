import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
// Removed unused imports: PedidoFilterDetail, PedidoOilDetail
import { OilService, PedidoInsumoDetail, PedidoOilDetail } from 'src/app/services/oil.service'; 
import { ReloadService } from 'src/app/services/reload.service';
import { AuthService } from 'src/app/services/auth.service';
import { Usuario } from 'src/app/models/usuario';

// Define GroupedPedido interface locally
export interface GroupedPedido {
  key: string;
  fechaPedido?: Date;
  nombreProveedor?: string;
  estadoPedido?: string;
  nombreUsuarioSolicitante?: string;
  nombreAgencia?: string; // New property for consistency with OilListComponent
  items: PedidoInsumoDetail[];
  idPedido?: number;
  totalItems?: number; // To show the total number of items in the group
}

// Keep Insumo1 interface for compatibility if needed elsewhere
export interface Insumo1 {
  idInsumo?: number;
  nombreInsumo: string;
  cantidad: number;
  unidadMedida?: string;
  tipoInsumo?: string;
  idProveedor: number;
  nombreProveedor?: string;
  fechaCreacion?: Date;
}

@Component({
  selector: 'app-insumo-list',
  templateUrl: './insumo-list.component.html',
  styleUrls: ['./insumo-list.component.css']
})
export class InsumoListComponent implements OnInit, OnDestroy {
  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 0;
  lista: GroupedPedido[] = [];
  allData: PedidoInsumoDetail[] = [];
  groupedData: GroupedPedido[] = [];
  filteredData: GroupedPedido[] = [];
  loading = false;
  private subscription = new Subscription();

  // Date filter variables
  startDate: string = '';
  endDate: string = '';
  totalItems: number = 0;
  paginaActual: string = '';
  errorMessage: string = '';

  // Modal properties
  showDetailsModal: boolean = false;
  selectedGroupedPedidoForDetails: GroupedPedido | null = null;

  // Export menu
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
  ) { }

  ngOnInit(): void {
    this.paginaActual = 'pendiente';

    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      console.log(this.usuario);
      if (this.usuario != null) {
        this.id = this.usuario.id;
        this.usrol = this.usuario.rol;
        console.log(this.id);
        this.loadInsumos(); // Changed to loadInsumos for clarity
      }
    });

    this.subscription.add(
      this.reloadService.reload$.subscribe(() => {
        this.loadInsumos(); // Changed to loadInsumos
      })
    );

    // Initialize date filters to current month
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
   * Loads all insumo records (pedidos) from the API
   */
  loadInsumos(): void { // Renamed from loadOils
    this.loading = true;
    this.errorMessage = '';

    this.oilService.getAllInsumoPedidos().subscribe({ // Use appropriate service method
      next: (data: PedidoInsumoDetail[]) => {
        console.log('Datos recibidos (insumos):', data);
        this.allData = data || [];
        // Usar el método mejorado de agrupación
        this.groupedData = this.groupPedidosByDateSupplierUserAgency(this.allData);
        this.applyFiltersAndSearch();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar pedidos de insumos:', error);
        this.errorMessage = 'Error al cargar la lista de pedidos de insumos. Por favor, intente nuevamente.';
        this.allData = [];
        this.groupedData = [];
        this.filteredData = [];
        this.lista = [];
        this.loading = false;
      }
    });
  }

  // Método para cambiar criterios de agrupación dinámicamente
  changeGroupingCriteria(criteria: string[]): void {
    this.groupedData = this.groupByCustomCriteria(criteria);
    this.applyFiltersAndSearch();
  }

   openObservacionesModal(pedido: any): void {
    console.log(pedido);
    
     
    this.selectedPedido = pedido;
      this.observacionesModalVisible = true;
      
    }

     closeObservacionesModal(): void {
    this.observacionesModalVisible = false;
    // Recargar datos por si hubo cambios en las observaciones
   // this.loadInsumos();
  }

  // Assuming these methods exist in OilService for insumos or can be simulated
  loadInsumosA(): void { // For 'Aprobado' or similar status
    this.loading = true;
    this.errorMessage = '';

    // Replace with actual API call if available, otherwise filter this.allData
    this.oilService.getAllInsumoPedidosA().subscribe({ // Placeholder for specific API call
      next: (data: PedidoInsumoDetail[]) => {
        this.allData = data || [];
        const filteredByStatus = this.allData.filter(item => item.estadoPedido?.toUpperCase() === 'ASIGNADO'); // Example filtering
        this.groupedData = this.groupPedidosByDateSupplierUserAgency(filteredByStatus);
        this.applyFiltersAndSearch();
        this.loading = false;
      },
      error: (error) => this.handleLoadError(error)
    });
  }

  loadInsumosP(): void { // For 'Pendiente' or similar status
    this.loading = true;
    this.errorMessage = '';

    this.oilService.getAllInsumoPedidosP().subscribe({ // Placeholder for specific API call
      next: (data: PedidoInsumoDetail[]) => {
        this.allData = data || [];
        const filteredByStatus = this.allData.filter(item => item.estadoPedido?.toUpperCase() === 'PROCESO'); // Example filtering
        this.groupedData = this.groupPedidosByDateSupplierUserAgency(filteredByStatus);
        this.applyFiltersAndSearch();
        this.loading = false;
      },
      error: (error) => this.handleLoadError(error)
    });
  }

  loadInsumosEn(): void { // For 'En Proceso' or similar status
    this.loading = true;
    this.errorMessage = '';

    this.oilService.getAllInsumoPedidosEn().subscribe({ // Placeholder for specific API call
      next: (data: PedidoInsumoDetail[]) => {
        this.allData = data || [];
         const filteredByStatus = this.allData.filter(item => item.estadoPedido?.toUpperCase() === 'ENVIADO'); // Example filtering
        this.groupedData = this.groupPedidosByDateSupplierUserAgency(filteredByStatus);
        this.applyFiltersAndSearch();
        this.loading = false;
      },
      error: (error) => this.handleLoadError(error)
    });
  }

  loadInsumosError(): void { // For 'Error' or similar status
    this.loading = true;
    this.errorMessage = '';

    this.oilService.getAllInsumoPedidos().subscribe({ // Placeholder for specific API call
      next: (data: PedidoInsumoDetail[]) => {
        this.allData = data || [];
        const filteredByStatus = this.allData.filter(item => ['ERROR', 'INFORMACION ERRONEA', 'RECHAZADO'].includes(item.estadoPedido?.toUpperCase() || '')); // Example filtering
        this.groupedData = this.groupPedidosByDateSupplierUserAgency(filteredByStatus);
        this.applyFiltersAndSearch();
        this.loading = false;
      },
      error: (error) => this.handleLoadError(error)
    });
  }

  private handleLoadError(error: any): void {
    console.error('Error al cargar pedidos de insumos:', error);
    this.errorMessage = 'Error al cargar la lista de pedidos de insumos. Por favor, intente nuevamente.';
    this.allData = [];
    this.groupedData = [];
    this.filteredData = [];
    this.lista = [];
    this.loading = false;
  }

  actualizarEstadoPedido(group: GroupedPedido): void {
    if (!group.items || !Array.isArray(group.items)) {
      console.error('No se encontraron items para actualizar en el grupo:', group);
      return;
    }

    // Assuming updateInsumoRequestStatus takes an item ID and new status:
    group.items.forEach((item: PedidoInsumoDetail) => {
      if (item.idPedido) { // Ensure item.idPedido exists
        console.log('Actualizando estado para item de insumo:', item.idPedido, 'Estado:', group.estadoPedido);
        this.oilService.updateInsumoRequestStatus(item.idPedido, group.estadoPedido || 'PENDIENTE') // Provide a default status if group.estadoPedido is undefined
          .subscribe({
            next: (response) => {
              console.log(`Estado actualizado para item de insumo ${item.idPedido}:`, response);
              // You might want to update the specific item's status in the local data here
            },
            error: (error) => {
              console.error(`Error al actualizar item de insumo ${item.idPedido}:`, error);
              this.showToast(`Error al actualizar item ${item.idPedido}: ${error.error || error.message}`, 'error');
            }
          });
      } else {
        console.warn('Item de insumo sin idPedido, no se puede actualizar:', item);
      }
    });

    // Recargar la lista completa después de procesar todos los items
    this.loadInsumos(); // Reload all data to reflect changes
  }

  /**
   * Groups individual PedidoInsumoDetail items by Date, Supplier, User, and Agency
   */
  private groupPedidosByDateSupplierUserAgency(data: PedidoInsumoDetail[]): GroupedPedido[] {
    const groupedMap = new Map<string, GroupedPedido>();

    data.forEach(item => {
      // Crear claves más robustas para la agrupación
      const dateKey = item.fechaPedido ?
        new Date(item.fechaPedido).toISOString().split('T')[0] : 'sin-fecha';
      const supplierKey = item.nombreProveedor?.trim() || 'sin-proveedor';
      const userKey = item.nombreUsuarioSolicitante?.trim() || 'sin-usuario';
      const agencyKey = (item as any).agencia?.trim() || 'sin-agencia'; // Assuming 'nombreAgencia' might be present

      // Crear una clave única combinando todos los criterios
      const groupKey = `${dateKey}|${supplierKey}|${userKey}|${agencyKey}`;

      if (!groupedMap.has(groupKey)) {
        // Determinar el estado general del grupo
        const itemsDelGrupo = data.filter(d =>
          (d.fechaPedido ? new Date(d.fechaPedido).toISOString().split('T')[0] : 'sin-fecha') === dateKey &&
          (d.nombreProveedor?.trim() || 'sin-proveedor') === supplierKey &&
          (d.nombreUsuarioSolicitante?.trim() || 'sin-usuario') === userKey &&
          ((d as any).agencia?.trim() || 'sin-agencia') === agencyKey
        );

        const estadoGeneral = this.determineGroupStatus(itemsDelGrupo);

        groupedMap.set(groupKey, {
          key: groupKey,
          fechaPedido: item.fechaPedido,
          nombreProveedor: item.nombreProveedor,
          estadoPedido: estadoGeneral,
          nombreUsuarioSolicitante: item.nombreUsuarioSolicitante,
          nombreAgencia: (item as any).agencia, // Assign agency
          items: [],
          idPedido: item.idPedido,
          totalItems: 0
        });
      }

      const group = groupedMap.get(groupKey);
      if (group) {
        group.items.push(item);
        group.totalItems = group.items.length;
      }
    });

    // Ordenar los grupos de manera más inteligente
    const sortedGroupedPedidos = Array.from(groupedMap.values()).sort((a, b) => {
      // 1. Primero por fecha (más reciente primero)
      const dateA = a.fechaPedido ? new Date(a.fechaPedido).getTime() : 0;
      const dateB = b.fechaPedido ? new Date(b.fechaPedido).getTime() : 0;
      if (dateB !== dateA) {
        return dateB - dateA;
      }

      // 2. Luego por agencia
      const agencyA = a.nombreAgencia || '';
      const agencyB = b.nombreAgencia || '';
      if (agencyA !== agencyB) {
        return agencyA.localeCompare(agencyB);
      }

      // 3. Luego por proveedor
      const providerA = a.nombreProveedor || '';
      const providerB = b.nombreProveedor || '';
      if (providerA !== providerB) {
        return providerA.localeCompare(providerB);
      }

      // 4. Finalmente por usuario
      const userA = a.nombreUsuarioSolicitante || '';
      const userB = b.nombreUsuarioSolicitante || '';
      return userA.localeCompare(userB);
    });

    return sortedGroupedPedidos;
  }

  /**
   * Determines the general status of a group based on individual item statuses
   */
  private determineGroupStatus(items: PedidoInsumoDetail[]): string {
    if (!items || items.length === 0) return 'DESCONOCIDO';

    const statuses = items.map(item => item.estadoPedido?.toUpperCase().trim() || 'PENDIENTE');
    const uniqueStatuses = [...new Set(statuses)];

    // Si todos los items tienen el mismo estado
    if (uniqueStatuses.length === 1) {
      return uniqueStatuses[0];
    }

    // Estados con prioridad (del más crítico al menos crítico)
    const statusPriority = [
      'ERROR',
      'INFORMACION ERRONEA',
      'RECHAZADO',
      'CANCELADO',
      'EN PROCESO',
      'PROCESO',
      'ASIGNADO',
      'REVISADO',
      'APROBADO',
      'FINALIZADO',
      'COMPLETADO',
      'PENDIENTE'
    ];

    // Encontrar el estado de mayor prioridad
    for (const priorityStatus of statusPriority) {
      if (statuses.includes(priorityStatus)) {
        // Si hay estados mixtos y uno es crítico, devolver el crítico
        if (['ERROR', 'INFORMACION ERRONEA', 'RECHAZADO'].includes(priorityStatus)) {
          return priorityStatus;
        }
        // Si hay estados en proceso, devolver "EN PROCESO"
        if (['EN PROCESO', 'PROCESO', 'ASIGNADO'].includes(priorityStatus)) {
          return 'EN PROCESO';
        }
        return priorityStatus;
      }
    }

    return 'ESTADO MIXTO';
  }

  /**
   * Applies search term and date filters
   */
  applyFiltersAndSearch(): void {
    let tempFilteredData = [...this.groupedData];

    // Filtro por fecha
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

    // Filtro por búsqueda mejorado
    if (this.searchTerm.trim() !== '') {
      const searchTermLower = this.searchTerm.toLowerCase().trim();
      tempFilteredData = tempFilteredData.filter(group =>
        // Búsqueda en datos del grupo
        (group.nombreProveedor?.toLowerCase().includes(searchTermLower)) ||
        (group.estadoPedido?.toLowerCase().includes(searchTermLower)) ||
        (group.nombreUsuarioSolicitante?.toLowerCase().includes(searchTermLower)) ||
        (group.nombreAgencia?.toLowerCase().includes(searchTermLower)) || // Added agency search
        // Búsqueda en datos de los items
        group.items.some(item =>
          (item.codigoInsumo?.toLowerCase().includes(searchTermLower)) ||
          (item.descripcionInsumo?.toLowerCase().includes(searchTermLower)) ||
          (item.presentacionInsumo?.toLowerCase().includes(searchTermLower)) ||
          (item.estadoPedido?.toLowerCase().includes(searchTermLower)) // Search by item status too
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
    const stats = {
      total: this.filteredData.length,
      pendientes: 0,
      enProceso: 0,
      finalizados: 0,
      errores: 0
    };

    this.filteredData.forEach(group => {
      const estado = group.estadoPedido?.toUpperCase() || 'PENDIENTE';

      if (estado.includes('PENDIENTE')) {
        stats.pendientes++;
      } else if (estado.includes('PROCESO') || estado.includes('ASIGNADO')) {
        stats.enProceso++;
      } else if (estado.includes('FINALIZADO') || estado.includes('COMPLETADO') || estado.includes('APROBADO')) {
        stats.finalizados++;
      } else if (estado.includes('ERROR') || estado.includes('RECHAZADO') || estado.includes('INFORMACION ERRONEA')) {
        stats.errores++;
      }
    });

    return stats;
  }

  // Método para agrupar por diferentes criterios dinámicamente
  groupByCustomCriteria(criteria: string[]): GroupedPedido[] {
    const groupedMap = new Map<string, GroupedPedido>();

    this.allData.forEach(item => {
      const keyParts: string[] = [];

      criteria.forEach(criterion => {
        switch (criterion) {
          case 'fecha':
            keyParts.push(item.fechaPedido ?
              new Date(item.fechaPedido).toISOString().split('T')[0] : 'sin-fecha');
            break;
          case 'proveedor':
            keyParts.push(item.nombreProveedor?.trim() || 'sin-proveedor');
            break;
          case 'usuario':
            keyParts.push(item.nombreUsuarioSolicitante?.trim() || 'sin-usuario');
            break;
          case 'agencia':
            keyParts.push((item as any).agencia?.trim() || 'sin-agencia'); // Cast to any
            break;
          case 'estado':
            keyParts.push(item.estadoPedido?.trim() || 'sin-estado');
            break;
          default:
            keyParts.push('sin-criterio');
        }
      });

      const groupKey = keyParts.join('|');

      if (!groupedMap.has(groupKey)) {
        groupedMap.set(groupKey, {
          key: groupKey,
          fechaPedido: item.fechaPedido,
          nombreProveedor: item.nombreProveedor,
          estadoPedido: item.estadoPedido, // Initial state, will be re-determined
          nombreUsuarioSolicitante: item.nombreUsuarioSolicitante,
          nombreAgencia: (item as any).agencia, // Assign agency
          items: [],
          idPedido: item.idPedido,
          totalItems: 0
        });
      }

      const group = groupedMap.get(groupKey);
      if (group) {
        group.items.push(item);
        group.totalItems = group.items.length;
        // Actualizar el estado del grupo basado en los ítems acumulados
        group.estadoPedido = this.determineGroupStatus(group.items);
      }
    });

    return Array.from(groupedMap.values());
  }

  /**
   * Calculates total pages based on filtered data
   */
  calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    if (this.totalPages === 0) this.totalPages = 1;
  }

  /**
   * Updates the 'lista' array based on current page
   */
  updatePageData(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.lista = this.filteredData.slice(startIndex, endIndex);
  }

  /**
   * Changes the current page
   */
  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePageData();
  }

  /**
   * Generates pagination array with ellipsis
   */
  getPaginationArray(): number[] {
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;

    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

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

  /**
   * Formats Date for input fields (YYYY-MM-DD)
   */
  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Resets date filters
   */
  resetDateFilter(): void {
    this.startDate = '';
    this.endDate = '';
    this.applyFiltersAndSearch();
  }

  /**
   * Navigation methods
   */
  goToCreateOil(): void {
    this.router.navigate(['/oil']);
  }

  goToCreateFilter(): void {
    this.router.navigate(['/filter']);
  }

  goToCreateInsumo(): void {
    this.router.navigate(['/insumo']);
  }

  // Navigation and data loading for specific statuses
  revisado(): void {
    this.paginaActual = 'revisados';
    this.loadInsumosEn(); // Load approved/reviewed insumos
  }

  pendiente(): void {
    this.paginaActual = 'pendiente';
    this.loadInsumos(); // Load pending insumos
  }

  proceso(): void {
    this.paginaActual = 'proceso';
    this.loadInsumosP(); // Load in-process insumos
  }

  asignado(): void {
    this.paginaActual = 'asignado';
    this.loadInsumosA(); // Assuming 'asignado' is also 'en proceso' or similar
  }

  error(): void {
    this.paginaActual = 'error';
    this.loadInsumosError(); // Load error/rejected insumos
  }

  resetearEstado(): void {
    this.paginaActual = '';
    this.loadInsumos(); // Load all insumos
  }

  /**
   * Export functionality
   */
  toggleExportMenu(): void {
    this.showExportMenu = !this.showExportMenu;
  }

  downloadExcel(): void {
    if (this.filteredData.length === 0) {
      this.showToast('No hay datos para exportar', 'error');
      return;
    }

    const flatDataForExport = this.filteredData.flatMap(group =>
      group.items.map(item => ({
        'ID Pedido': item.idPedido || '',
        'Fecha Pedido': item.fechaPedido ? new Date(item.fechaPedido).toLocaleDateString('es-ES') : '-',
        'Código Insumo': item.codigoInsumo || '',
        'Descripción': item.descripcionInsumo || '',
        'Presentación': item.presentacionInsumo || '-',
        'Cantidad Solicitada': item.cantidadSolicitada || '',
        'Proveedor': item.nombreProveedor || '-',
        'Usuario Solicitante': item.nombreUsuarioSolicitante || '-', // Added
        'Agencia': (item as any).agencia || '-', // Added
        'Estado': item.estadoPedido || '-',
        'Fecha Modificación': item.fechaModificacionPedido ?
          new Date(item.fechaModificacionPedido).toLocaleDateString('es-ES') : '-'
      }))
    );

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(flatDataForExport);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PedidosInsumo');
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    const filename = `PedidosInsumo_${new Date().toISOString().split('T')[0]}.xlsx`; // Renamed filename
    saveAs(blob, filename);
    
    this.showToast('Archivo Excel descargado exitosamente', 'success');
  }

  downloadCSV(): void {
    if (this.filteredData.length === 0) {
      this.showToast('No hay datos para exportar', 'error');
      return;
    }

    const flatDataForExport = this.filteredData.flatMap(group => group.items);

    // Corrected header from "Código Aceite" to "Código Insumo" and added "Usuario Solicitante", "Agencia"
    let csvContent = 'ID Pedido,Código Insumo,Descripción,Presentación,Cantidad Solicitada,Proveedor,Usuario Solicitante,Agencia,Estado,Fecha Pedido,Fecha Modificación\n';
    
    flatDataForExport.forEach(item => {
      const row = [
        item.idPedido || '',
        item.codigoInsumo || '',
        item.descripcionInsumo || '',
        item.presentacionInsumo || '-',
        item.cantidadSolicitada || '',
        item.nombreProveedor || '-',
        item.nombreUsuarioSolicitante || '-', // Added
        (item as any).agencia || '-', // Added
        item.estadoPedido || '-',
        item.fechaPedido ? new Date(item.fechaPedido).toLocaleDateString('es-ES') : '-',
        item.fechaModificacionPedido ?
          new Date(item.fechaModificacionPedido).toLocaleDateString('es-ES') : '-'
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
      csvContent += row + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const filename = `PedidosInsumo_${new Date().toISOString().split('T')[0]}.csv`; // Renamed filename
    saveAs(blob, filename);
    
    this.showToast('Archivo CSV descargado exitosamente', 'success');
  }

  /**
   * Modal functionality
   */
  viewPedidoDetails(group: GroupedPedido): void {
    this.selectedGroupedPedidoForDetails = group;
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedGroupedPedidoForDetails = null;
  }

  downloadModalExcel(): void {
    if (!this.selectedGroupedPedidoForDetails?.items?.length) {
      this.showToast('No hay ítems para exportar', 'error');
      return;
    }

    const itemsForExport = this.selectedGroupedPedidoForDetails.items.map(item => ({
      'Código': item.codigoInsumo || '',
      'Descripción': item.descripcionInsumo || '',
      'Presentación': item.presentacionInsumo || '-',
      'Cantidad': item.cantidadSolicitada || '',
      'Estado Ítem': item.estadoPedido || '-'
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(itemsForExport);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DetallesPedidoInsumo'); // Renamed sheet
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    
    const fechaFormatted = this.selectedGroupedPedidoForDetails.fechaPedido ?
      new Date(this.selectedGroupedPedidoForDetails.fechaPedido).toISOString().split('T')[0] : 'sin_fecha';
    
    const filename = `DetallesPedidoInsumo_${fechaFormatted}_${this.selectedGroupedPedidoForDetails.nombreProveedor || 'sin_proveedor'}.xlsx`; // Renamed filename
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    saveAs(blob, filename);
    this.showToast('Detalles exportados a Excel exitosamente', 'success');
  }

  downloadModalCSV(): void {
    if (!this.selectedGroupedPedidoForDetails?.items?.length) {
      this.showToast('No hay ítems para exportar', 'error');
      return;
    }

    let csvContent = 'Código,Descripción,Presentación,Cantidad,Estado Ítem\n';

    this.selectedGroupedPedidoForDetails.items.forEach(item => {
      const row = [
        item.codigoInsumo || '',
        item.descripcionInsumo || '',
        item.presentacionInsumo || '-',
        item.cantidadSolicitada || '',
        item.estadoPedido || '-'
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
      csvContent += row + '\n';
    });

    const fechaFormatted = this.selectedGroupedPedidoForDetails.fechaPedido ?
      new Date(this.selectedGroupedPedidoForDetails.fechaPedido).toISOString().split('T')[0] : 'sin_fecha';

    const filename = `DetallesPedidoInsumo_${fechaFormatted}_${this.selectedGroupedPedidoForDetails.nombreProveedor || 'sin_proveedor'}.csv`; // Renamed filename
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    
    saveAs(blob, filename);
    this.showToast('Detalles exportados a CSV exitosamente', 'success');
  }

  /**
   * Utility methods
   */
  trackByGroupKey(index: number, group: GroupedPedido): string {
    return group.key;
  }

  showToast(message: string, type: 'success' | 'error' | 'info'): void {
    // Simple toast implementation (as in your original code)
    console.log(`${type.toUpperCase()}: ${message}`);

    const toast = document.createElement('div');
    toast.innerText = message;
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
      color: white;
      padding: 12px 24px;
      border-radius: 4px;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '1';
    }, 100);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  // Legacy methods for backward compatibility
  editInsumo(insumo: Insumo1): void { // Renamed parameter to insumo
    console.log('Editando insumo:', insumo);
    this.router.navigate(['/insumo-edit', insumo.idInsumo]); // Changed route and ID
  }

  deleteInsumo(idInsumo: number | undefined): void { // Renamed parameter to idInsumo
    if (idInsumo === undefined) {
      console.error('Cannot delete insumo: ID is undefined.');
      return;
    }

   
  }
}