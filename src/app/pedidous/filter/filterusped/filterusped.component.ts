import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, forkJoin, Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Usuario } from 'src/app/models/usuario';
import { AuthService } from 'src/app/services/auth.service';
import { OilService, StockRepuesto, StockRepuestosFilters } from 'src/app/services/oil.service';
import { ProveedoroilService } from 'src/app/services/proveedoroil.service';
import { ReloadService } from 'src/app/services/reload.service';

export interface ProveedorFilter {
  idProveedor: number;
  nombreProveedor: string;
}

export interface FilterItem {
  id?: number;
  codigo: string;
  descripcion: string;
  idProveedor: number;
  nombreProveedor?: string;
  presentacion?: string;
  estado?: string;
  fechaCreacion?: Date;
  fechaModificacion?: Date;
}

export interface PedidoItem {
  oilId: number;
  codigo: string;
  descripcion: string;
  presentacion: string;
  cantidad: number;
  idProveedor: number;
  nombreProveedor: string;
}

// Interfaz para solicitudes de permiso
export interface SolicitudPermiso {
  id?: number;
  codigoArticulo: string;
  descripcionArticulo: string;
  idUsuarioSolicitante: number;
  nombreUsuarioSolicitante?: string;
  motivo: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  fechaSolicitud: Date;
  fechaRespuesta?: Date;
  idUsuarioAprobador?: number;
  observaciones?: string;
}

export interface GroupedFilterItem {
  codigo: string;
  descripcion: string;
  idProveedor: number;
  nombreProveedor: string;
  estado: string;
  presentaciones: FilterItem[];
  presentacionesDisponibles: {
    unidad: boolean;
  };
  presentacionesMap: {
    unidad?: FilterItem;
  };
  stockInfo?: {
    stockActual: number;
    stockMinimo: number;
    stockMaximo: number;
    cantidadSugerida: number;
    ventaUltimoMes: number;
    alertaStock: 'bajo' | 'normal' | 'alto' | 'critico';
  };
  // Propiedades para control de permisos
  bloqueado?: boolean;
  motivoBloqueo?: string;
  solicitudPermisoPendiente?: boolean;
  solicitudPermisoAprobada?: boolean;
  cantidadExcedeLimite?: boolean; // <- NUEVA PROPIEDAD
}

@Component({
  selector: 'app-filterusped',
  templateUrl: './filterusped.component.html',
  styleUrls: ['./filterusped.component.css']
})
export class FilteruspedComponent implements OnInit, OnDestroy {
  pedidoForm: FormGroup;
  usuario: Usuario | null = null;
  loading = false;
  submitSuccess = false;
  errorMessage = '';

  proveedores: ProveedorFilter[] = [];
  allOils: FilterItem[] = [];
  filteredOils: FilterItem[] = [];
  currentPedidoItems: PedidoItem[] = [];

  oilSearchTerm: string = '';
  selectedProveedorId: number | null = null;
  submitted = false;

  private subscriptions = new Subscription();
  groupedFilteredOils: GroupedFilterItem[] = [];

  idus: any;
  repuestos: StockRepuesto[] = [];
  selectedOficina: string = '';
  selectedGrupo: string = 'FLT';
  error: string | null = null;
  usuarioAgencia: any = null;
  Agencia: any = null;

  private stockMap: Map<string, StockRepuesto> = new Map();
  
  // Propiedades para manejo de permisos
  solicitudesPermiso: SolicitudPermiso[] = [];
  mostrarModalPermiso: boolean = false;
  articuloSeleccionadoPermiso: GroupedFilterItem | null = null;
  motivoSolicitud: string = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private oilService: OilService,
    private proveedorOilService: ProveedoroilService,
    private reloadService: ReloadService,
    private authService: AuthService
  ) {
    this.pedidoForm = this.formBuilder.group({
      idProveedor: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      if (this.usuario != null) {
        this.idus = this.usuario.id;
        this.cargarUsuarioAgencia(this.idus);
        this.cargarSolicitudesPermiso();
      }
    });

    this.subscriptions.add(
      this.authService.usuarioActual$.subscribe(usuario => {
        this.usuario = usuario;
      })
    );

    this.loadProveedores();
    this.loadAllOils();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  cargarUsuarioAgencia(id: number): void {
    this.error = '';
    
    this.authService.usuarioagencia(id)
        .subscribe({
        next: (response) => {
          this.usuarioAgencia = response;          
          console.log('Usuario cargado:', response);
          this.Agencia = this.usuarioAgencia.idagencia;
          console.log(this.Agencia);
          this.loadStockWithFilters();
        },
        error: (error) => {
          this.error = 'Error al cargar el usuario';
          console.error('Error:', error);
        },
        complete: () => {
          console.log('Petición completada');
        }
      });
  }

  loadStockWithFilters() {
    this.loading = true;
    this.error = null;

    const filters: StockRepuestosFilters = {};

    if (this.Agencia) {
      filters.oficina = this.Agencia;
    }

    if (this.selectedGrupo) {
      filters.grupo = this.selectedGrupo;
    }

    this.oilService.getStockRepuestos(filters).subscribe({
      next: (data) => {
        this.repuestos = data;
        this.loading = false;
        console.log('Stock de filtros cargado:', this.repuestos);

        this.stockMap.clear();
        this.repuestos.forEach(stock => {
          this.stockMap.set(stock.articulo, stock);
        });

        this.updateStockInfo();
      },
      error: (err) => {
        this.error = 'Error al cargar el inventario de filtros';
        this.loading = false;
        console.error('Error:', err);
      }
    });
  }

  /**
   * Carga las solicitudes de permiso del usuario.
   * CORRECCIÓN: Se añade setTimeout para forzar la actualización de la interfaz.
   */
  cargarSolicitudesPermiso(): void {
    this.oilService.getSolicitudesPermisoUsuario(this.idus).subscribe({
      next: (data: SolicitudPermiso[]) => {
        this.solicitudesPermiso = data;
        console.log('Solicitudes de permiso cargadas:', this.solicitudesPermiso);
        this.updateStockInfo();
        
        // CORRECCIÓN: Forzar actualización completa del array para detectar cambios de estado en la UI.
        setTimeout(() => {
          this.groupedFilteredOils = [...this.groupedFilteredOils];
        }, 100); 
      },
      error: (error) => {
        console.error('Error al cargar solicitudes de permiso:', error);
      }
    });
  }

  /**
   * Verifica si el artículo debe estar bloqueado y actualiza los estados de permiso.
   * CORRECCIÓN: Se inicializa la nueva propiedad `cantidadExcedeLimite` y se usa código normalizado.
   */
  verificarBloqueoArticulo(groupedFilter: GroupedFilterItem): void {
    if (!groupedFilter.stockInfo) {
      groupedFilter.bloqueado = false;
      groupedFilter.solicitudPermisoPendiente = false;
      groupedFilter.solicitudPermisoAprobada = false;
      groupedFilter.cantidadExcedeLimite = false; // Inicialización
      return;
    }

    const stockInfo = groupedFilter.stockInfo;
    const debeBloquear = stockInfo.alertaStock === 'alto' && stockInfo.cantidadSugerida <= 0;
    
    // CORRECCIÓN: Normalizar el código del artículo
    const codigoNormalizado = groupedFilter.codigo?.trim().toUpperCase(); 

    // Buscar solicitudes con código normalizado
    const solicitudPendiente = this.solicitudesPermiso.find(
      s => s.codigoArticulo?.trim().toUpperCase() === codigoNormalizado && s.estado === 'pendiente'
    );
    const solicitudAprobada = this.solicitudesPermiso.find(
      s => s.codigoArticulo?.trim().toUpperCase() === codigoNormalizado && s.estado === 'aprobada'
    );
    
    // Inicializar estados de permiso y exceso de cantidad
    groupedFilter.solicitudPermisoPendiente = !!solicitudPendiente;
    groupedFilter.solicitudPermisoAprobada = !!solicitudAprobada;
    groupedFilter.cantidadExcedeLimite = false; // Se reinicia aquí

    if (debeBloquear) {
      groupedFilter.bloqueado = true;
      groupedFilter.motivoBloqueo = `Stock actual (${stockInfo.stockActual}) supera el máximo recomendado (${stockInfo.stockMaximo})`;
      
      // Si tiene permiso aprobado, se desbloquea
      if (solicitudAprobada) {
        groupedFilter.bloqueado = false;
        groupedFilter.motivoBloqueo = `Pedido permitido por aprobación de solicitud.`;
      }
    } else {
      groupedFilter.bloqueado = false;
      groupedFilter.motivoBloqueo = undefined;
      // Los estados de permiso se mantienen actualizados incluso si no está bloqueado
    }
  }

  /**
   * Verifica si la cantidad excede el límite disponible (Stock Máximo - Stock Actual).
   */
  verificarCantidadExcedeLimite(groupedFilter: GroupedFilterItem, cantidad: number): boolean { 
    if (!groupedFilter.stockInfo || cantidad <= 0) {
      return false;
    }

    // Si tiene aprobación, ignorar el límite
    if (groupedFilter.solicitudPermisoAprobada) {
      return false;
    }

    const stockMaximo = groupedFilter.stockInfo.stockMaximo;
    const stockActual = groupedFilter.stockInfo.stockActual;
    const espacioDisponible = stockMaximo - stockActual;

    const excede = cantidad > espacioDisponible;
    
    return excede;
  }
  
  /**
   * Maneja el cambio de cantidad en el input y valida el exceso de límite.
   */
  onCantidadChange(groupedFilter: GroupedFilterItem, inputElement: HTMLInputElement): void { 
    const cantidad = parseInt(inputElement.value, 10) || 0;
    
    if (cantidad === 0) {
      groupedFilter.cantidadExcedeLimite = false;
      return;
    }

    const tieneAprobacion = groupedFilter.solicitudPermisoAprobada;
    const tienePendiente = groupedFilter.solicitudPermisoPendiente;
    
    // Si tiene aprobación o solicitud pendiente, no validar límites.
    if (tieneAprobacion || tienePendiente) {
      groupedFilter.cantidadExcedeLimite = false;
    } else {
      groupedFilter.cantidadExcedeLimite = this.verificarCantidadExcedeLimite(groupedFilter, cantidad);
    }
  }

  /**
   * Maneja la solicitud de permiso cuando la cantidad excede el límite, pre-llenando el motivo.
   */
  solicitarPermisoConCantidad(groupedFilter: GroupedFilterItem, unidadInput: HTMLInputElement): void { 
    const cantidad = parseInt(unidadInput.value, 10) || 0;
    
    if (cantidad <= 0) {
      this.showToast('Debe ingresar una cantidad válida mayor a 0.', 'error');
      return;
    }

    if (!groupedFilter.stockInfo) {
      this.showToast('No hay información de stock disponible.', 'error');
      return;
    }

    // Pre-llenar el motivo con información de la cantidad solicitada
    const espacioDisponible = groupedFilter.stockInfo.stockMaximo - groupedFilter.stockInfo.stockActual;
    this.motivoSolicitud = `Solicitud de pedido por exceso de cantidad. Se necesitan ${cantidad} unidades, pero el espacio disponible es ${espacioDisponible} unidades. `;
    
    this.abrirModalSolicitudPermiso(groupedFilter);
  }

  /**
   * Abre el modal para solicitar permiso (común para bloqueo o exceso de cantidad).
   */
  abrirModalSolicitudPermiso(groupedFilter: GroupedFilterItem): void {
    this.articuloSeleccionadoPermiso = groupedFilter;
    if (!this.motivoSolicitud) { // No sobreescribir si ya se pre-llenó por exceso de cantidad
        this.motivoSolicitud = '';
    }
    this.mostrarModalPermiso = true;
  }

  /**
   * Cierra el modal de solicitud de permiso
   */
  cerrarModalPermiso(): void {
    this.mostrarModalPermiso = false;
    this.articuloSeleccionadoPermiso = null;
    this.motivoSolicitud = '';
  }

  /**
   * Envía la solicitud de permiso.
   * CORRECCIÓN: Se actualiza el estado del artículo localmente.
   */
  enviarSolicitudPermiso(): void {
    if (!this.articuloSeleccionadoPermiso || !this.motivoSolicitud.trim()) {
      this.showToast('Debe ingresar un motivo para la solicitud', 'error');
      return;
    }

    const solicitud: SolicitudPermiso = {
      codigoArticulo: this.articuloSeleccionadoPermiso.codigo,
      descripcionArticulo: this.articuloSeleccionadoPermiso.descripcion,
      idUsuarioSolicitante: this.idus,
      nombreUsuarioSolicitante: this.usuario?.nombreUsuario,
      motivo: this.motivoSolicitud,
      estado: 'pendiente',
      fechaSolicitud: new Date()
    };

    this.loading = true;
    this.oilService.crearSolicitudPermiso(solicitud).subscribe({
      next: (response) => {
        this.showToast('Solicitud de permiso enviada exitosamente', 'success');
        
        // CORRECCIÓN: Actualizar el estado del artículo inmediatamente
        if (this.articuloSeleccionadoPermiso) { 
          this.articuloSeleccionadoPermiso.solicitudPermisoPendiente = true; 
          this.articuloSeleccionadoPermiso.cantidadExcedeLimite = false; // Se limpia el estado de exceso
        } 

        this.cerrarModalPermiso();
        this.cargarSolicitudesPermiso();
        this.updateStockInfo();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al crear solicitud de permiso:', error);
        this.showToast('Error al enviar la solicitud de permiso', 'error');
        this.loading = false;
      }
    });
  }

  // ... (otros métodos auxiliares como getStockInfo, calcularCantidadSugerida, getStockAlertLevel, updateStockInfo, get f, loadProveedores, loadAllOils, filterOils, onProveedorChange, groupOilsByCode, aplicarCantidadSugerida) ...

  getStockInfo(codigo: string): StockRepuesto | undefined {
    return this.stockMap.get(codigo);
  }

  calcularCantidadSugerida(stock: StockRepuesto): number {
    const stockActual = stock.stock || 0;
    const stockMinimo = stock.stockMinimoSugerido || 0;
    const stockMaximo = stock.stockMaximoSugerido || 0;

    if (stockActual < stockMinimo) {
      return Math.max(0, stockMaximo - stockActual);
    }

    if (stockActual < stockMaximo) {
      return Math.max(0, stockMaximo - stockActual);
    }

    return 0;
  }

  getStockAlertLevel(stock: StockRepuesto): 'bajo' | 'normal' | 'alto' | 'critico' {
    const stockActual = stock.stock || 0;
    const stockMinimo = stock.stockMinimoSugerido || 0;
    const stockMaximo = stock.stockMaximoSugerido || 0;

    if (stockActual === 0) {
      return 'critico';
    } else if (stockActual < stockMinimo) {
      return 'bajo';
    } else if (stockActual >= stockMaximo) {
      return 'alto';
    } else {
      return 'normal';
    }
  }

  updateStockInfo(): void {
    this.groupedFilteredOils.forEach(groupedFilter => {
      const stockInfo = this.getStockInfo(groupedFilter.codigo);
      if (stockInfo) {
        groupedFilter.stockInfo = {
          stockActual: stockInfo.stockDisponible || 0,
          stockMinimo: stockInfo.stockMinimoSugerido || 0,
          stockMaximo: stockInfo.stockMaximoSugerido || 0,
          cantidadSugerida: this.calcularCantidadSugerida(stockInfo),
          ventaUltimoMes: (stockInfo as any).cantVendidaUltMes ?? 0,
          alertaStock: this.getStockAlertLevel(stockInfo)
        };
      }
      
      // Verificar bloqueo después de actualizar stock info
      this.verificarBloqueoArticulo(groupedFilter);
    });
  }

  get f() {
    return this.pedidoForm.controls;
  }

  loadProveedores(): void {
    this.proveedorOilService.getProveedoresFilter().subscribe({
      next: (data: ProveedorFilter[]) => {
        this.proveedores = data;
      },
      error: (error) => {
        console.error('Error al cargar proveedores:', error);
        this.errorMessage = 'Error al cargar la lista de proveedores.';
      }
    });
  }

  loadAllOils(): void {
    this.loading = true;
    this.oilService.getAllFilters().subscribe({
      next: (data: FilterItem[]) => {
        this.allOils = data;
        this.filterOils();
        this.loading = false;
      },
      error: (e) => {
        console.error('Error al cargar filtros:', e);
        this.errorMessage = 'Error al cargar la lista de filtros.';
        this.loading = false;
      }
    });
  }

  filterOils(): void {
    let tempOils = [...this.allOils];

    if (this.selectedProveedorId) {
      tempOils = tempOils.filter(oil => oil.idProveedor === Number(this.selectedProveedorId));
    }

    if (this.oilSearchTerm.trim() !== '') {
      const searchTermLower = this.oilSearchTerm.toLowerCase();
      tempOils = tempOils.filter(oil =>
        (oil.codigo && oil.codigo.toLowerCase().includes(searchTermLower)) ||
        (oil.descripcion && oil.descripcion.toLowerCase().includes(searchTermLower))
      );
    }

    this.filteredOils = tempOils;
    this.groupOilsByCode(tempOils);
  }

  onProveedorChange(): void {
    this.selectedProveedorId = this.pedidoForm.get('idProveedor')?.value;
    this.oilSearchTerm = '';
    this.filterOils();
  }

  groupOilsByCode(oils: FilterItem[]): void {
    const grouped = oils.reduce((acc, oil) => {
      const key = oil.codigo;
      if (!acc[key]) {
        acc[key] = {
          codigo: oil.codigo,
          descripcion: oil.descripcion,
          idProveedor: oil.idProveedor,
          nombreProveedor: oil.nombreProveedor || 'Desconocido',
          estado: oil.estado || 'activo',
          presentaciones: [],
          presentacionesDisponibles: {
            unidad: false
          },
          presentacionesMap: {},
          bloqueado: false,
          motivoBloqueo: undefined,
          solicitudPermisoPendiente: false,
          solicitudPermisoAprobada: false,
          cantidadExcedeLimite: false,
        };
      }
      acc[key].presentaciones.push(oil);

      const presentacion = oil.presentacion?.toLowerCase() || '';
      if (presentacion.includes('unidad')) {
        acc[key].presentacionesDisponibles.unidad = true;
        acc[key].presentacionesMap.unidad = oil;
      }

      return acc;
    }, {} as { [key: string]: GroupedFilterItem });

    this.groupedFilteredOils = Object.values(grouped);
    this.updateStockInfo();
  }

  aplicarCantidadSugerida(
    groupedFilter: GroupedFilterItem,
    unidadInput: HTMLInputElement
  ): void {
    if (!groupedFilter.stockInfo) {
      this.showToast('No hay información de stock disponible', 'error');
      return;
    }

    const cantidadSugerida = groupedFilter.stockInfo.cantidadSugerida;

    if (groupedFilter.presentacionesDisponibles.unidad && unidadInput) {
      unidadInput.value = cantidadSugerida.toString();
      // Llamar a onCantidadChange después de aplicar la cantidad sugerida
      this.onCantidadChange(groupedFilter, unidadInput);
    }

    this.showToast(`Cantidad sugerida aplicada: ${cantidadSugerida}`, 'info');
  }

  /**
   * Agrega el artículo al pedido múltiple.
   * CORRECCIÓN: Se actualiza la lógica para el control de exceso de cantidad.
   */
  addOilToPedidoMultiple(
    groupedFilter: GroupedFilterItem,
    unidadInput: HTMLInputElement
  ): void {
    const unidadQuantity = parseInt(unidadInput.value, 10) || 0;
    const tieneAprobacion = groupedFilter.solicitudPermisoAprobada;
    
    // 1. Validar cantidad
    if (unidadQuantity <= 0) {
      this.showToast('Debe ingresar al menos una cantidad válida.', 'error');
      return;
    }
    
    // 2. Verificar bloqueo por stock alto
    const isBlocked = groupedFilter.bloqueado && !tieneAprobacion;
    if (isBlocked) {
      this.showToast('Este artículo está bloqueado. Debe solicitar permiso primero.', 'error');
      return;
    }
    
    // 3. Verificar si excede el límite (solo si NO está bloqueado y NO tiene aprobación)
    const isExceeding = this.verificarCantidadExcedeLimite(groupedFilter, unidadQuantity);

    // 4. Si excede la cantidad Y NO tiene aprobación, activar el estado de exceso
    if (isExceeding && !tieneAprobacion) {
       this.showToast(`La cantidad solicitada (${unidadQuantity}) excede el límite disponible. Por favor, solicite permiso.`, 'error');
       groupedFilter.cantidadExcedeLimite = true;
       return;
    }
    
    // 5. Proceder a agregar el ítem
    let hasValidQuantity = false;
    const oilForUnidad = groupedFilter.presentacionesMap.unidad;

    if (oilForUnidad && oilForUnidad.id) {
      const existingItemIndex = this.currentPedidoItems.findIndex(
        item => item.oilId === oilForUnidad.id &&
          item.presentacion === (oilForUnidad.presentacion || 'Unidad')
      );

      if (existingItemIndex > -1) {
        this.currentPedidoItems[existingItemIndex].cantidad += unidadQuantity;
      } else {
        this.currentPedidoItems.push({
          oilId: oilForUnidad.id,
          codigo: oilForUnidad.codigo,
          descripcion: oilForUnidad.descripcion,
          presentacion: oilForUnidad.presentacion || 'Unidad',
          cantidad: unidadQuantity,
          idProveedor: oilForUnidad.idProveedor,
          nombreProveedor: oilForUnidad.nombreProveedor || 'Desconocido'
        });
      }
      hasValidQuantity = true;
    }


    if (hasValidQuantity) {
      const mensajeBase = `Filtro "${groupedFilter.codigo}" agregado al pedido.`;
      const mensajeAprobacion = tieneAprobacion ? ' (Con permiso aprobado)' : '';
      this.showToast(mensajeBase + mensajeAprobacion, 'success');
      unidadInput.value = '0';
      // CORRECCIÓN: Limpiar estado de exceso de cantidad
      groupedFilter.cantidadExcedeLimite = false; 
    } else {
       this.showToast('Debe ingresar al menos una cantidad válida.', 'error');
    }
  }

  removeOilFromPedido(index: number): void {
    const removedItem = this.currentPedidoItems.splice(index, 1);
    this.showToast(`"${removedItem[0].codigo}" removido del pedido.`, 'info');
  }

  // filterusped.component.ts

// ... (métodos existentes)

  /**
   * Recarga los datos de stock, solicitudes de permiso y actualiza la lista de filtros.
   */
  refreshData(): void {
    if (this.loading) {
      this.showToast('Actualización en curso. Espere un momento.', 'info');
      return;
    }
    
    this.loading = true;
    this.showToast('Actualizando datos...', 'info');

    // 1. Cargar stock y actualizar info de stock
    this.loadStockWithFilters(); 

    // 2. Cargar solicitudes de permiso (que también llama a updateStockInfo)
    // Se ejecuta después de loadStockWithFilters para asegurar que el stock esté cargado
    this.cargarSolicitudesPermiso(); 

    // 3. Re-filtrar los aceites (para asegurar que la interfaz se refresque)
    this.filterOils(); 

    // La variable 'loading' se desactiva dentro de loadStockWithFilters (y dentro de cargarSolicitudesPermiso)
    // Sin embargo, podemos asegurar un final.
    setTimeout(() => {
        this.loading = false;
        this.showToast('Datos actualizados.', 'success');
    }, 1500); 
  }

// ... (cuerpo de la clase)

  submitPedido(): void {
    this.submitted = true;
    this.submitSuccess = false;
    this.errorMessage = '';

    if (this.currentPedidoItems.length === 0) {
      this.errorMessage = 'El pedido está vacío. Agregue al menos un filtro.';
      return;
    }

    if (this.pedidoForm.invalid) {
      this.errorMessage = 'Por favor, seleccione un proveedor válido.';
      return;
    }

    const invalidItems = this.currentPedidoItems.filter(item =>
      !item.cantidad || item.cantidad <= 0 || !item.oilId
    );

    if (invalidItems.length > 0) {
      this.errorMessage = 'Todos los filtros deben tener una cantidad válida mayor a 0.';
      return;
    }

    this.loading = true;
    const apiCalls: Observable<any>[] = [];

    this.currentPedidoItems.forEach(item => {
      const filterDataForApi = {
        idFilter: item.oilId,
        cantidad: item.cantidad,
        idusuario: this.idus,
      };

      if (filterDataForApi.idFilter && filterDataForApi.cantidad > 0) {
        apiCalls.push(this.oilService.createFilterRequest(filterDataForApi));
      }
    });

    if (apiCalls.length === 0) {
      this.errorMessage = 'No hay items válidos para procesar.';
      this.loading = false;
      return;
    }

    forkJoin(apiCalls).pipe(
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: (responses: any[]) => {
        console.log('Respuestas del servidor:', responses);
        this.handleSuccess('Pedido de filtros creado exitosamente.');
        this.currentPedidoItems = [];
        this.pedidoForm.reset();
        this.submitted = false;
      },
      error: (error) => {
        console.error('Error al crear uno o más ítems del pedido:', error);

        let errorMsg = 'Error desconocido';

        if (error.error) {
          if (typeof error.error === 'string') {
            errorMsg = error.error;
          } else if (error.error.message) {
            errorMsg = error.error.message;
          } else if (error.error.title) {
            errorMsg = error.error.title;
          }
        } else if (error.message) {
          errorMsg = error.message;
        } else if (error.status) {
          switch (error.status) {
            case 400:
              errorMsg = 'Datos inválidos enviados al servidor';
              break;
            case 401:
              errorMsg = 'No autorizado';
              break;
            case 404:
              errorMsg = 'Endpoint no encontrado';
              break;
            case 500:
              errorMsg = 'Error interno del servidor';
              break;
            default:
              errorMsg = `Error HTTP ${error.status}`;
          }
        }

        this.errorMessage = `Error al procesar el pedido: ${errorMsg}`;
      }
    });
  }

  handleSuccess(message: string): void {
    this.loading = false;
    this.submitSuccess = true;
    this.reloadService.triggerReload();

    this.pedidoForm.reset();
    this.currentPedidoItems = [];
    this.oilSearchTerm = '';
    this.selectedProveedorId = null;
    this.filteredOils = [];
    this.groupedFilteredOils = [];

    this.showToast(message, 'success');
  }

  showToast(message: string, type: 'success' | 'error' | 'info'): void {
    const toast = document.createElement('div');
    toast.innerText = message;
    toast.className = `notificacion ${type} visible`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove('visible');
      toast.addEventListener('transitionend', () => toast.remove());
    }, 3000);
  }

  cancelar(): void {
    this.router.navigate(['/filteruslist']);
  }
}