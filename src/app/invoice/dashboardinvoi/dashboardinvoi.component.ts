// dashboardinvoi.component.ts
import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { saveAs } from 'file-saver';
import { Subscription } from 'rxjs';
import { Usuario } from '../../models/usuario';
import { AuthService } from '../../services/auth.service';
import { PedidobodegaService } from '../../services/pedidobodega.service';
import { ReloadService } from '../../services/reload.service';
import * as XLSX from 'xlsx';
import { CotizacionService } from 'src/app/services/cotizacion.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';


@Component({
  selector: 'app-dashboardinvoi',
  templateUrl: './dashboardinvoi.component.html',
  styleUrls: ['./dashboardinvoi.component.css']
})
export class DashboardinvoiComponent implements OnInit, OnDestroy {
  stats = {
    totalImportaciones: 7,
    enTransito: 24,
    pendientesLiquidacion: 18,
    tiempoPromedio: 28
  };

  totalInvoices: number = 0;
  cantidadCompleta: number = 0;
  cantidadParcial: number = 0;
  cantidadPendiente: number = 0;
  cantidadSinDatos: number = 0;
  cantidadAprobada: number = 0;

  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 20;
  totalPages: number = 0;
  lista: any[] = [];
  allData: any[] = [];
  filteredData: any[] = [];
  id: number = 0;
  usuario: Usuario | null = null;
  loading = false;
  private subscription = new Subscription();

  startDate: string = '';
  endDate: string = '';

  activeStateFilter: string = 'INCOMPLETAS'; 
  activeProviderFilter: string = 'TODOS';
  uniqueProviders: string[] = [];
  activeCard: string = 'INVOICE';

  isModalOpen: boolean = false;
  currentImageUrl: string = '';

  // Modal de resumen
  isResumenModalOpen: boolean = false;
  currentResumen: any = null;

  // ─── Modal Dar de Baja ITEMS (cantidades específicas) ───────────────────────
  isBajaItemsModalOpen: boolean = false;
  ordenParaBajaItems: any = null;
  detallesBaja: any[] = [];
  cargandoDetallesBaja: boolean = false;
  bajaItemsLoading: boolean = false;
  bajaItemsError: string = '';
  motivoGeneralBaja: string = '';

  // ─── Modal Eliminar ──────────────────────────────────────────────────────────
  isEliminarModalOpen: boolean = false;
  ordenParaEliminar: any = null;
  eliminarLoading: boolean = false;
  eliminarError: string = '';

  // ─── Modal BL ────────────────────────────────────────────────────────────────
  isBlModalOpen: boolean = false;
  currentItemBL: any = null;

  // ─── Modal Editar ────────────────────────────────────────────────────────────
  isEditarModalOpen: boolean = false;
  ordenParaEditar: any = null;
  editarForm = {
    invoiceN: '',
    estado: ''
  };
  editarLoading: boolean = false;
  editarError: string = '';
  editarEstadosDisponibles: string[] = ['Pendiente', 'En proceso', 'Completado', 'Cancelado'];

  private readonly apiUrl = 'https://bodega.vehicentro.com:1830/api/api/invoice';

  // ── Modal Pagos / Anticipos ──────────────────────────────────────────────
  readonly API = 'https://bodega.vehicentro.com:1830/api/api';
  modalPagos: boolean = false;
  ordenPagoSeleccionada: any = null;
  pagosCargando: boolean = false;
  pagosData: any = null;
  guardandoPago: boolean = false;
  subiendoDoc: boolean = false;
  pagoSeleccionadoId: number | null = null;

  pagoForm = {
    invoiceBlId:   null as number | null,
    ordenId:       null as number | null,
    blId:          null as number | null,
    monto:         null as number | null,
    moneda:        'USD',
    tipoPago:      'ANTICIPO',
    fechaPago:     new Date().toISOString().split('T')[0],
    referencia:    '',
    observaciones: '',
  };

  docFile: File | null = null;
  docTipo: string = 'COMPROBANTE';

  constructor(
    private router: Router,
    private authService: AuthService,
    private pedidobodegaService: PedidobodegaService, 
    private reloadService: ReloadService,
    private cotizacionService: CotizacionService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.usuario = this.authService.getUsuarioActual();
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      console.log(this.usuario);
      if(this.usuario != null){
        if(this.usuario.rol=='admin'){
          this.loadInitialData();
        }
        else{
          this.id = this.usuario.id;
          console.log(this.id);
          this.loadInitialDataus();
        }
      }
    });
    
    this.subscription.add(
      this.reloadService.reload$.subscribe(() => {
        this.loadInitialData();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  loadInitialData(): void {
    this.loading = true;
    this.cotizacionService.getInvoiceAd().subscribe({
      next: (data:any) => {
        this.allData = data;
        this.extractUniqueProviders();
        this.calculateStatistics();
        this.applyFilters();
      },
      error: (error) => {
        console.error('Error fetching data:', error);
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  loadInitialDataus(): void {
    this.loading = true;
    this.cotizacionService.getInvoice(this.id).subscribe({
      next: (data:any) => {
        this.allData = data;
        this.extractUniqueProviders();
        this.calculateStatistics();
        this.applyFilters();
      },
      error: (error) => {
        console.error('Error fetching data:', error);
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  calculateStatistics(): void {
    if (!this.allData || this.allData.length === 0) {
      this.resetStatistics();
      return;
    }

    this.totalInvoices = this.allData.length;
    
    this.cantidadCompleta = this.countByResumenState(['COMPLETA']);
    this.cantidadParcial = this.countByResumenState(['PARCIAL']);
    this.cantidadPendiente = this.countByResumenState(['PENDIENTE']);
    this.cantidadSinDatos = this.countByResumenState(['SIN_DATOS']);
    this.cantidadAprobada = this.allData.filter(item => 
      item.resumen && item.resumen.porcentajeCumplimiento >= 100
    ).length;

    console.log('Estadísticas calculadas:', {
      total: this.totalInvoices,
      completa: this.cantidadCompleta,
      parcial: this.cantidadParcial,
      pendiente: this.cantidadPendiente,
      sinDatos: this.cantidadSinDatos,
      aprobada: this.cantidadAprobada
    });
  }

  private countByState(states: string[]): number {
    return this.allData.filter(item => 
      item.estado && states.some(state => 
        item.estado.toUpperCase() === state.toUpperCase()
      )
    ).length;
  }

  private countByResumenState(states: string[]): number {
    return this.allData.filter(item => 
      item.resumen && item.resumen.estadoOrden && 
      states.some(state => item.resumen.estadoOrden.toUpperCase() === state.toUpperCase())
    ).length;
  }

  private resetStatistics(): void {
    this.totalInvoices = 0;
    this.cantidadCompleta = 0;
    this.cantidadParcial = 0;
    this.cantidadPendiente = 0;
    this.cantidadSinDatos = 0;
    this.cantidadAprobada = 0;
  }

  extractUniqueProviders(): void {
    if (this.allData && this.allData.length > 0) {
      const providers = new Set<string>();
      this.allData.forEach(item => {
        if (item.proveedor) { 
          providers.add(item.proveedor);
        }
      });
      this.uniqueProviders = Array.from(providers).sort();
    }
  }
 
  applyFilters(): void {
    let tempFilteredData = this.allData;

    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate).setHours(0, 0, 0, 0);
      const end = new Date(this.endDate).setHours(23, 59, 59, 999);

      tempFilteredData = tempFilteredData.filter(item => {
        const itemDate = new Date(item.fecha_creacion).getTime();
        return itemDate >= start && itemDate <= end;
      });
    }

    if (this.searchTerm) {
      const lowerCaseSearchTerm = this.searchTerm.toLowerCase();
      tempFilteredData = tempFilteredData.filter(item =>
        item.ordenid && item.ordenid.toString().toLowerCase().includes(lowerCaseSearchTerm) || 
        item.invoice && item.invoice.toLowerCase().includes(lowerCaseSearchTerm) ||           
        item.cot && item.cot.toLowerCase().includes(lowerCaseSearchTerm) ||                   
        item.estado && item.estado.toLowerCase().includes(lowerCaseSearchTerm) ||
        (item.proveedor && item.proveedor.toLowerCase().includes(lowerCaseSearchTerm)) ||
        item.codigo && item.codigo.toLowerCase().includes(lowerCaseSearchTerm) ||
        item.descripcion && item.descripcion.toLowerCase().includes(lowerCaseSearchTerm) ||
        (item.observaciones && item.observaciones.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (item.cliente && item.cliente.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (item.ot && item.ot.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (item.usuario && item.usuario.toLowerCase().includes(lowerCaseSearchTerm))
      );
    }

    if (this.activeStateFilter !== 'TODOS') {
      const filterTerm = this.activeStateFilter.toUpperCase();

      if (filterTerm === 'INCOMPLETAS') {
        // Vista por defecto: oculta COMPLETA, muestra PARCIAL + PENDIENTE + SIN_DATOS
        tempFilteredData = tempFilteredData.filter(item => {
          const estado = (item.resumen?.estadoOrden || '').toUpperCase();
          return estado !== 'COMPLETA';
        });
      } else {
        tempFilteredData = tempFilteredData.filter(item => {
          if (item.resumen && item.resumen.estadoOrden) {
            return item.resumen.estadoOrden.toUpperCase() === filterTerm;
          }
          return false;
        });
      }
    }
    
    if (this.activeProviderFilter !== 'TODOS') {
      const filterProvider = this.activeProviderFilter;
      tempFilteredData = tempFilteredData.filter(item => 
        item.proveedor && item.proveedor === filterProvider
      );
    }

    this.filteredData = tempFilteredData;
    this.totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
    this.currentPage = 1;
    this.updatePagination();
  }
 
  searchImports(): void {
    this.applyFilters();
  }

  quickFilter(estado: string): void {
    this.activeStateFilter = estado;
    this.applyFilters();
  }

  updatePagination(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.lista = this.filteredData.slice(startIndex, endIndex);
  }

  changePage(page: any): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  getPaginationArray(): (number | string)[] {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 5;
    const startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push('...');
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < this.totalPages) {
      if (endPage < this.totalPages - 1) {
        pages.push('...');
      }
      pages.push(this.totalPages);
    }
    return pages;
  }

  openResumenModal(item: any): void {
    this.currentResumen = item;
    this.isResumenModalOpen = true;
  }

  closeResumenModal(): void {
    this.isResumenModalOpen = false;
    this.currentResumen = null;
  }

  getEstadoOrden(item: any): string {
    const estadoBD = (item.estado || '').toLowerCase();
    if (estadoBD === 'cancelado')  return 'CANCELADO';
    if (estadoBD === 'liquidado')  return 'LIQUIDADO';
    return item.resumen?.estadoOrden || 'N/A';
  }

  getBadgeClass(item: any): object {
    const estado = this.getEstadoOrden(item);
    return {
      'badge-pendiente':  estado === 'PENDIENTE',
      'badge-aprobada':   estado === 'COMPLETA',
      'badge-revision':   estado === 'PARCIAL',
      'badge-detalle':    estado === 'SIN_DATOS',
      'badge-cancelado':  estado === 'CANCELADO',
      'badge-liquidado':  estado === 'LIQUIDADO',
    };
  }

  puedecambiarEstado(item: any): boolean {
    const estado = (item.estado || '').toLowerCase();
    return estado !== 'cancelado' && estado !== 'liquidado';
  }

  puedeEliminar(item: any): boolean {
    const estado        = (item.estado || '').toLowerCase();
    const estadoResumen = (item.resumen?.estadoOrden || '').toUpperCase();
    if (estado === 'cancelado' || estado === 'liquidado') return false;
    if (estadoResumen === 'COMPLETA' || estadoResumen === 'PARCIAL') return false;
    return true;
  }

  getProgressClass(porcentaje: number): string {
    if (porcentaje >= 100) return 'progress-complete';
    if (porcentaje >= 75)  return 'progress-high';
    if (porcentaje >= 50)  return 'progress-medium';
    if (porcentaje > 0)    return 'progress-low';
    return 'progress-none';
  }

  // ─── Modal Dar de Baja ITEMS (POST /dar-de-baja) ────────────────────────────

  openBajaModal(item: any): void {
    const estado = (item.estado || '').toLowerCase();

    if (estado === 'liquidado') {
      this.showNotification(
        `La orden #${item.ordenid} está liquidada y no se pueden dar de baja items.`, 'error'
      );
      return;
    }

    this.ordenParaBajaItems   = item;
    this.detallesBaja         = [];
    this.motivoGeneralBaja    = '';
    this.bajaItemsError       = '';
    this.isBajaItemsModalOpen = true;
    this.cargandoDetallesBaja = true;

    // Cargar el cruce solicitado-vs-facturado (mismo endpoint del dashboard de revisión).
    // Solo se puede dar de baja lo PENDIENTE = solicitada - facturada (lo que aún no llegó).
    this.cotizacionService.getOrdenDetalleCoalesce(item.ordenid).subscribe({
      next: (resp: any) => {
        const detalles: any[] = resp?.detalles || [];

        this.detallesBaja = detalles
          .map(d => {
            const solicitada = d.cantidadSolicitada || 0;
            const facturada  = d.cantidadFacturada  || 0;
            const pendiente  = Math.max(0, solicitada - facturada);
            return {
              detalleId:      d.detalleId,
              codigo:         d.codigo,
              descripcion:    d.descripcion,
              precioUnitario: d.precioUnitarioOrden || 0,   // FOB unitario de la orden
              cantidadSolicitada: solicitada,
              cantidadFacturada:  facturada,
              cantidadPendiente:  pendiente,
              seleccionado: true,            // seleccionado por defecto
              cantidadBaja: pendiente,       // pendiente precargado como valor a dar de baja
              motivo: ''
            };
          })
          // Solo items con algo pendiente y con detalleId real (no se pueden dar de baja líneas ya completas)
          .filter(d => d.cantidadPendiente > 0 && d.detalleId != null);

        this.cargandoDetallesBaja = false;
      },
      error: (err) => {
        this.cargandoDetallesBaja = false;
        this.bajaItemsError = err.error || err.message || 'Error al cargar el cruce de la orden.';
      }
    });
  }

  closeBajaModal(): void {
    this.isBajaItemsModalOpen = false;
    this.ordenParaBajaItems   = null;
    this.detallesBaja         = [];
    this.motivoGeneralBaja    = '';
    this.bajaItemsError       = '';
  }

  // Al marcar/desmarcar el checkbox
  toggleSeleccionBaja(d: any): void {
    if (d.seleccionado && (!d.cantidadBaja || d.cantidadBaja <= 0)) {
      // Por defecto, al seleccionar se pone toda la cantidad PENDIENTE (no la solicitada)
      d.cantidadBaja = d.cantidadPendiente;
    }
    if (!d.seleccionado) {
      d.cantidadBaja = 0;
    }
  }

  // ── Seleccionar / deseleccionar TODOS los items ──
  get todosSeleccionados(): boolean {
    return this.detallesBaja.length > 0 && this.detallesBaja.every(d => d.seleccionado);
  }

  toggleSeleccionarTodos(): void {
    const marcarTodos = !this.todosSeleccionados;
    this.detallesBaja.forEach(d => {
      d.seleccionado = marcarTodos;
      d.cantidadBaja = marcarTodos ? d.cantidadPendiente : 0;
    });
  }

  // Validar que la cantidad no exceda lo PENDIENTE (no lo solicitado)
  validarCantidadBaja(d: any): void {
    if (d.cantidadBaja < 0) d.cantidadBaja = 0;
    if (d.cantidadBaja > d.cantidadPendiente) d.cantidadBaja = d.cantidadPendiente;
    d.seleccionado = d.cantidadBaja > 0;
  }

  // Valor FOB de la baja por línea (precio_unitario × cantidadBaja)
  getValorFobBajaLinea(d: any): number {
    return (d.precioUnitario || 0) * (d.cantidadBaja || 0);
  }

  get itemsSeleccionadosBaja(): any[] {
    return this.detallesBaja.filter(d => d.seleccionado && d.cantidadBaja > 0);
  }

  get totalCantidadBaja(): number {
    return this.itemsSeleccionadosBaja.reduce((acc, d) => acc + (d.cantidadBaja || 0), 0);
  }

  get totalValorFobBaja(): number {
    return this.itemsSeleccionadosBaja.reduce((acc, d) => acc + this.getValorFobBajaLinea(d), 0);
  }

  confirmarBaja(): void {
    if (!this.ordenParaBajaItems) return;

    const seleccionados = this.itemsSeleccionadosBaja;
    if (seleccionados.length === 0) {
      this.bajaItemsError = 'Selecciona al menos un item con cantidad mayor a 0.';
      return;
    }

    this.bajaItemsLoading = true;
    this.bajaItemsError   = '';

    // No se envía fobUnitario: el backend lo toma de precio_unitario en detalleordencompra
    const payload = seleccionados.map(d => ({
      detalleId:    d.detalleId,
      cantidadBaja: d.cantidadBaja,
      motivo:       d.motivo?.trim() || this.motivoGeneralBaja?.trim() || null,
      idUsuario:    this.usuario?.id ?? 0
    }));

    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    this.http.post(`${this.apiUrl}/dar-de-baja`, payload, { headers }).subscribe({
      next: (res: any) => {
        this.bajaItemsLoading = false;
        const totalBajas = res?.bajas?.length ?? seleccionados.length;
        const ordenId    = this.ordenParaBajaItems?.ordenid;
        this.closeBajaModal();
        this.showNotification(
          `Baja registrada: ${totalBajas} item(s) de la orden #${ordenId}.`, 'success'
        );
        this.recargarDatos();
      },
      error: (err) => {
        this.bajaItemsLoading = false;
        this.bajaItemsError   = err.error || err.message || 'Error al dar de baja los items.';
      }
    });
  }

  // Recarga según el rol (igual que en ngOnInit)
  private recargarDatos(): void {
    if (this.usuario?.rol === 'admin') {
      this.loadInitialData();
    } else {
      this.loadInitialDataus();
    }
  }

  // ─── Modal Eliminar (DELETE) ─────────────────────────────────────────────────

  openEliminarModal(item: any): void {
    const estado          = (item.estado || '').toLowerCase();
    const estadoResumen   = (item.resumen?.estadoOrden || '').toUpperCase();

    if (estado === 'cancelado' || estado === 'liquidado') {
      this.showNotification(
        `La orden #${item.ordenid} está ${item.estado} y no puede eliminarse.`, 'error'
      );
      return;
    }
    if (estadoResumen === 'COMPLETA' || estadoResumen === 'PARCIAL') {
      this.showNotification(
        `La orden #${item.ordenid} tiene estado de cumplimiento ${estadoResumen} y no puede eliminarse.`, 'error'
      );
      return;
    }

    this.ordenParaEliminar  = item;
    this.eliminarError      = '';
    this.isEliminarModalOpen = true;
  }

  closeEliminarModal(): void {
    this.isEliminarModalOpen  = false;
    this.ordenParaEliminar    = null;
    this.eliminarError        = '';
  }

  confirmarEliminar(): void {
    if (!this.ordenParaEliminar) return;
    this.eliminarLoading = true;
    this.eliminarError   = '';

    this.http.delete(`${this.apiUrl}/${this.ordenParaEliminar.ordenid}`)
      .subscribe({
        next: (res: any) => {
          this.eliminarLoading = false;
          const id = this.ordenParaEliminar?.ordenid;
          this.closeEliminarModal();
          this.showNotification(
            `Orden #${id} eliminada. ${res.detallesEliminados} detalle(s) removidos.`, 'success'
          );
          this.allData = this.allData.filter(d => d.ordenid !== id);
          this.applyFilters();
        },
        error: (err) => {
          this.eliminarLoading = false;
          this.eliminarError   = err.error || err.message || 'Error al eliminar la orden.';
        }
      });
  }

  // ─── Modal Editar (PUT /{id}) ────────────────────────────────────────────────

  openEditarModal(item: any): void {
    const estado = (item.estado || '').toLowerCase();
    if (estado === 'liquidado') {
      this.showNotification(
        `La orden #${item.ordenid} está liquidada y no puede editarse.`, 'error'
      );
      return;
    }
    this.ordenParaEditar = item;
    this.editarForm = {
      invoiceN: item.invoice || '',
      estado:   item.estado  || 'Pendiente'
    };
    this.editarError      = '';
    this.isEditarModalOpen = true;
  }

  closeEditarModal(): void {
    this.isEditarModalOpen = false;
    this.ordenParaEditar   = null;
    this.editarError       = '';
  }

  confirmarEditar(): void {
    if (!this.ordenParaEditar) return;
    if (!this.editarForm.invoiceN?.trim()) {
      this.editarError = 'El número de orden (Invoice N) no puede estar vacío.';
      return;
    }

    this.editarLoading = true;
    this.editarError   = '';

    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const body = {
      invoiceN:      this.editarForm.invoiceN.trim(),
      idCotizacion:  this.ordenParaEditar.idcot,   // se mantiene el mismo
      estado:        this.editarForm.estado
    };

    this.http.put(
      `${this.apiUrl}/${this.ordenParaEditar.ordenid}`,
      body,
      { headers }
    ).subscribe({
      next: (res: any) => {
        this.editarLoading = false;

        // Actualizar lista local sin recargar
        const idx = this.allData.findIndex(d => d.ordenid === this.ordenParaEditar?.ordenid);
        if (idx !== -1) {
          this.allData[idx].invoice = this.editarForm.invoiceN.trim();
          this.allData[idx].estado  = this.editarForm.estado;
        }

        this.closeEditarModal();
        this.applyFilters();
        this.showNotification(
          `Orden #${this.ordenParaEditar?.ordenid} actualizada correctamente.`, 'success'
        );
      },
      error: (err) => {
        this.editarLoading = false;
        this.editarError   = err.error || err.message || 'Error al actualizar la orden.';
      }
    });
  }

  // ─── Modal BL ────────────────────────────────────────────────────────────────

  openBlModal(item: any): void {
    this.currentItemBL = item;
    this.isBlModalOpen = true;
  }

  closeBlModal(): void {
    this.isBlModalOpen  = false;
    this.currentItemBL  = null;
  }

  getBlEstadoClass(estado: string): object {
    const e = (estado || '').toLowerCase();
    return {
      'bl-badge-transito':    e.includes('tránsito') || e.includes('transito'),
      'bl-badge-llegado':     e.includes('llegado') || e.includes('puerto'),
      'bl-badge-liquidado':   e.includes('liquidado'),
      'bl-badge-proceso':     e.includes('proceso'),
      'bl-badge-default':     !e.includes('tránsito') && !e.includes('transito')
                            && !e.includes('llegado') && !e.includes('puerto')
                            && !e.includes('liquidado') && !e.includes('proceso')
    };
  }

  getInvoiceBLEstadoClass(estado: string): object {
    const e = (estado || '').toLowerCase();
    return {
      'bl-badge-llegado':   e.includes('activo') || e.includes('llegado'),
      'bl-badge-transito':  e.includes('tránsito') || e.includes('transito'),
      'bl-badge-liquidado': e.includes('liquidado'),
      'bl-badge-default':   !e.includes('activo') && !e.includes('llegado')
                          && !e.includes('tránsito') && !e.includes('transito')
                          && !e.includes('liquidado')
    };
  }

  tieneBLs(item: any): boolean {
    return item.bls && item.bls.length > 0;
  }

  // ─── Helpers económicos ──────────────────────────────────────────────────────

  getTotalMontoInvoiceBL(item: any): number {
    return (item.invoicesBL || []).reduce((acc: number, ibl: any) => acc + (ibl.totalMonto || 0), 0);
  }

  getTotalItemsInvoiceBL(item: any): number {
    return (item.invoicesBL || []).reduce((acc: number, ibl: any) => acc + (ibl.totalItems || 0), 0);
  }

  getTotalCantidadInvoiceBL(item: any): number {
    return (item.invoicesBL || []).reduce((acc: number, ibl: any) => acc + (ibl.totalCantidad || 0), 0);
  }

  // ─── Navegación ─────────────────────────────────────────────────────────────

  navigate1(): void { }

  navigate2(orden: any): void {
    this.router.navigate(['/detailinvoi', orden]);
  }

  navigate3(orden: any): void {
    this.router.navigate(['/dashinvorev', orden]);
  }

  openModal(imageUrl: string): void {
    this.currentImageUrl = imageUrl;
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.currentImageUrl = '';
  }

  downloadExcel(): void {
    const dataToExport = this.filteredData.map(item => ({
      Codigo: item.ordenid || '',
      Proveedor: item.proveedor || '',
      Orden_Compra: item.invoice || '',
      Cotizacion: item.cot || '',
      Estado: item.resumen?.estadoOrden || '',
      PorcentajeCumplimiento: item.resumen?.porcentajeCumplimiento || 0,
      TotalSolicitado: item.resumen?.totalSolicitado || 0,
      TotalFacturado: item.resumen?.totalFacturado || 0,
      ValorOrden: item.valorOrden || 0,
      ItemsPendientes: item.resumen?.itemsPendientes || 0,
      ItemsCompletos: item.resumen?.itemsCompletos || 0
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'OrdenCompra');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Pedidos_OrdenCompra_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  downloadCSV(): void {
    let csvContent = 'Codigo,Proveedor,Invoice,Cotizacion,Estado,Porcentaje,TotalSolicitado,TotalFacturado\n';

    this.filteredData.forEach(item => {
      const row = [
        item.ordenid || '',
        item.proveedor || '',
        item.invoice || '',
        item.cot || '',
        item.resumen?.estadoOrden || '',
        item.resumen?.porcentajeCumplimiento || 0,
        item.resumen?.totalSolicitado || 0,
        item.resumen?.totalFacturado || 0
      ].map(e => `"${e}"`).join(',');
      csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `Pedidos_Invoice_${new Date().toISOString().split('T')[0]}.csv`);
  }

  coti(): void {
    this.activeCard = 'INVOICE'; 
    this.router.navigate(['/dashboardcot']); 
  }

  crear(): void {
    this.activeCard = 'CREAR'; 
    this.router.navigate(['/crear-orden-completa']);
  }

  error(): void {
    this.activeCard = 'DETALLE'; 
    this.router.navigate(['/subir-detalle']);
  }

  revi(): void {
    this.activeCard = 'REVISION'; 
    this.router.navigate(['/faltantesin']);
  }

  aprobada(): void {
    this.activeCard = 'APROBADA'; 
    this.router.navigate(['/dashboardapro']);
  }

  entregada(): void {
    this.activeCard = 'ENTREGADA'; 
    this.router.navigate(['/dashboardentre']);
  }

  anulada(): void {
    this.activeCard = 'FALTANTES'; 
    this.router.navigate(['/faltantesin']);
  }

  invoice(): void {
    this.activeCard = 'INVOICE'; 
    this.router.navigate(['/dashboardinvoi']); 
  }

  // Navegar al histórico de bajas
  irAHistorialBajas(): void {
    this.router.navigate(['/historialbajas']);
  }

  eliminar(id: number): void {
    if (confirm('¿Está seguro de eliminar este pedido?')) {
      this.pedidobodegaService.deletePedido(id).subscribe({
        next: () => {
          this.reloadService.triggerReload();
          this.showNotification('Pedido eliminado correctamente.', 'success');
        },
        error: (err) => {
          console.error('Error deleting pedido:', err);
          this.showNotification('Error al eliminar el pedido.', 'error');
        }
      });
    }
  }

  showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    alert(message);
  }

  // ─── Navegar al detalle del BL ───────────────────────────────────────────────
  verDetalleBl(blId: number): void {
    this.router.navigate(['/bldetalle', blId]);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Pagos / Anticipos (portado desde dashboardbl)
  // ══════════════════════════════════════════════════════════════════════════

  abrirModalPagos(item: any): void {
    this.ordenPagoSeleccionada = item;
    this.modalPagos = true;
    this.pagosData = null;
    this.pagoSeleccionadoId = null;
    this.resetPagoForm(item);

    // Cargar los anticipos registrados de esta orden
    if (item.ordenid) this.cargarPagosPorOrden(item.ordenid);
  }

  cerrarModalPagos(): void {
    this.modalPagos = false;
    this.ordenPagoSeleccionada = null;
    this.pagosData = null;
    this.docFile = null;
  }

  private resetPagoForm(item: any): void {
    this.pagoForm = {
      invoiceBlId:   null,            // el anticipo es por orden, no por invoiceBL
      ordenId:       item.ordenid ?? null,
      blId:          null,
      monto:         null,
      moneda:        'USD',
      tipoPago:      'ANTICIPO',      // solo anticipos
      fechaPago:     new Date().toISOString().split('T')[0],
      referencia:    '',
      observaciones: '',
    };
  }

  // Cargar anticipos por orden de compra
  cargarPagosPorOrden(ordenId: number): void {
    this.pagosCargando = true;
    fetch(`${this.API}/bl/pagos/orden/${ordenId}`)
      .then(r => r.json())
      .then(data => { this.pagosData = data; this.pagosCargando = false; })
      .catch(() => { this.pagosCargando = false; });
  }

  guardarPago(): void {
    if (!this.pagoForm.monto || !this.pagoForm.ordenId) {
      alert('Completa el Monto del anticipo.');
      return;
    }
    this.guardandoPago = true;
    fetch(`${this.API}/bl/pagos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceBlId:   null,                 // anticipo por orden
        ordenId:       this.pagoForm.ordenId,
        blId:          null,
        monto:         Number(this.pagoForm.monto),
        moneda:        this.pagoForm.moneda,
        tipoPago:      'ANTICIPO',
        fechaPago:     this.pagoForm.fechaPago,
        referencia:    this.pagoForm.referencia || null,
        observaciones: this.pagoForm.observaciones || null,
      })
    })
      .then(r => { if (!r.ok) return r.text().then(t => { throw new Error(t); }); return r.json(); })
      .then(data => {
        alert(`✅ Anticipo registrado. ID: ${data.id}`);
        this.pagoSeleccionadoId = data.id;
        this.pagoForm.monto = null;
        this.pagoForm.referencia = '';
        this.pagoForm.observaciones = '';
        this.cargarPagosPorOrden(this.pagoForm.ordenId!);
        this.guardandoPago = false;
      })
      .catch(err => { alert(`❌ ${err.message}`); this.guardandoPago = false; });
  }

  onDocFileSelect(event: any): void {
    this.docFile = event.target.files[0] ?? null;
  }

 subirDocumento(pagoId: number): void {
    if (!this.docFile) { alert('Selecciona un archivo primero.'); return; }
    this.subiendoDoc = true;
    const fd = new FormData();
    fd.append('archivo', this.docFile, this.docFile.name);   // ← 'file' cambiado a 'archivo' + nombre
    fd.append('tipoDocumento', this.docTipo);
    fetch(`${this.API}/bl/pagos/${pagoId}/documentos`, { method: 'POST', body: fd })
      .then(r => { if (!r.ok) return r.text().then(t => { throw new Error(t); }); return r.json(); })
      .then(() => {
        alert('✅ Documento subido correctamente.');
        this.docFile = null;
        this.subiendoDoc = false;
        this.cargarPagosPorOrden(this.pagoForm.ordenId!);
      })
      .catch(err => { alert(`❌ ${err.message}`); this.subiendoDoc = false; });
  }

  cambiarEstadoPago(pagoId: number, estado: string): void {
    fetch(`${this.API}/bl/pagos/${pagoId}/estado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado })
    })
      .then(r => r.json())
      .then(() => { this.cargarPagosPorOrden(this.pagoForm.ordenId!); })
      .catch(err => alert(`❌ ${err.message}`));
  }

  eliminarPago(pagoId: number): void {
    if (!confirm('¿Eliminar este pago?')) return;
    fetch(`${this.API}/bl/pagos/${pagoId}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(() => { this.cargarPagosPorOrden(this.pagoForm.ordenId!); })
      .catch(err => alert(`❌ ${err.message}`));
  }

  descargarDocumento(pagoId: number, docId: number): void {
    window.open(`${this.API}/bl/pagos/${pagoId}/documentos/${docId}/download`, '_blank');
  }

  eliminarDocumento(pagoId: number, docId: number): void {
    if (!confirm('¿Eliminar este documento?')) return;
    fetch(`${this.API}/bl/pagos/${pagoId}/documentos/${docId}`, { method: 'DELETE' })
      .then(() => this.cargarPagosPorOrden(this.pagoForm.ordenId!))
      .catch(err => alert(`❌ ${err.message}`));
  }

}