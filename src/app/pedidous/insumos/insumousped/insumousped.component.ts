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

export interface ProveedorInsumo {
  idProveedor: number;
  nombreProveedor: string;
}

export interface InsumoItem {
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

export interface GroupedInsumoItem {
  codigo: string;
  descripcion: string;
  idProveedor: number;
  nombreProveedor: string;
  estado: string;
  presentaciones: InsumoItem[];
  presentacionesDisponibles: {
    unidad: boolean;
  };
  presentacionesMap: {
    unidad?: InsumoItem;
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
  cantidadExcedeLimite?: boolean;
}

@Component({
  selector: 'app-insumousped',
  templateUrl: './insumousped.component.html',
  styleUrls: ['./insumousped.component.css']
})
export class InsumouspedComponent implements OnInit, OnDestroy {
  pedidoForm: FormGroup;
  usuario: Usuario | null = null;
  loading = false;
  submitSuccess = false;
  errorMessage = '';

  proveedores: ProveedorInsumo[] = [];
  allOils: InsumoItem[] = [];
  filteredOils: InsumoItem[] = [];
  currentPedidoItems: PedidoItem[] = [];

  oilSearchTerm: string = '';
  selectedProveedorId: number | null = null;
  submitted = false;

  private subscriptions = new Subscription();
  groupedFilteredOils: GroupedInsumoItem[] = [];

  idus: any;
  repuestos: StockRepuesto[] = [];
  selectedOficina: string = '';
  selectedGrupo: string = 'INS';
  error: string | null = null;
  usuarioAgencia: any = null;
  Agencia: any = null;
  private stockMap: Map<string, StockRepuesto> = new Map();

  // Propiedades para manejo de permisos
  solicitudesPermiso: SolicitudPermiso[] = [];
  mostrarModalPermiso: boolean = false;
  articuloSeleccionadoPermiso: GroupedInsumoItem | null = null;
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

    this.authService.usuarioagencia(id).subscribe({
      next: (response) => {
        this.usuarioAgencia = response;
        console.log('Usuario cargado:', response);
        this.Agencia = this.usuarioAgencia.idagencia;
        console.log('Agencia del usuario:', this.Agencia);
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
        console.log('Stock de insumos cargado:', this.repuestos);

        this.stockMap.clear();
        this.repuestos.forEach(stock => {
          this.stockMap.set(stock.articulo, stock);
        });

        this.updateStockInfo();
      },
      error: (err) => {
        this.error = 'Error al cargar el inventario de insumos';
        this.loading = false;
        console.error('Error:', err);
      }
    });
  }

  /**
   * Carga las solicitudes de permiso del usuario
   */
  cargarSolicitudesPermiso(): void {
    this.oilService.getSolicitudesPermisoUsuario(this.idus).subscribe({
      next: (data: SolicitudPermiso[]) => {
        this.solicitudesPermiso = data;
        console.log('Solicitudes de permiso cargadas:', this.solicitudesPermiso);
        console.log('Solicitudes aprobadas:', this.solicitudesPermiso.filter(s => s.estado === 'aprobada'));
        
        // Forzar actualización completa del stock info
        this.updateStockInfo();
        
        // Trigger change detection forzado
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
   * Verifica si un artículo debe estar bloqueado
   */
  verificarBloqueoArticulo(groupedInsumo: GroupedInsumoItem): void {
    if (!groupedInsumo.stockInfo) {
      groupedInsumo.bloqueado = false;
      return;
    }

    const stockInfo = groupedInsumo.stockInfo;
    
    // Criterios de bloqueo:
    // 1. Stock está en nivel alto (por encima del máximo)
    // 2. La cantidad sugerida es 0 o negativa
    const debeBloquear = stockInfo.alertaStock === 'alto' && stockInfo.cantidadSugerida <= 0;

    // Normalizar el código del artículo (quitar espacios y convertir a mayúsculas)
    const codigoNormalizado = groupedInsumo.codigo?.trim().toUpperCase();
    
    // Verificar si hay una solicitud pendiente o aprobada para este artículo
    const solicitudPendiente = this.solicitudesPermiso.find(
      s => s.codigoArticulo?.trim().toUpperCase() === codigoNormalizado && s.estado === 'pendiente'
    );
    const solicitudAprobada = this.solicitudesPermiso.find(
      s => s.codigoArticulo?.trim().toUpperCase() === codigoNormalizado && s.estado === 'aprobada'
    );

    console.log('verificarBloqueoArticulo - Debug:', {
      codigo: groupedInsumo.codigo,
      codigoNormalizado: codigoNormalizado,
      debeBloquear: debeBloquear,
      solicitudPendiente: !!solicitudPendiente,
      solicitudAprobada: !!solicitudAprobada,
      todasLasSolicitudes: this.solicitudesPermiso.map(s => ({
        codigo: s.codigoArticulo,
        estado: s.estado
      }))
    });

    if (debeBloquear) {
      groupedInsumo.bloqueado = true;
      groupedInsumo.motivoBloqueo = `Stock actual (${stockInfo.stockActual}) supera el máximo recomendado (${stockInfo.stockMaximo})`;
      
      groupedInsumo.solicitudPermisoPendiente = !!solicitudPendiente;
      groupedInsumo.solicitudPermisoAprobada = !!solicitudAprobada;
      
      // Si hay aprobación, desbloquear
      if (solicitudAprobada) {
        groupedInsumo.bloqueado = false;
        console.log('Artículo desbloqueado por aprobación:', groupedInsumo.codigo);
      }
    } else {
      groupedInsumo.bloqueado = false;
      groupedInsumo.motivoBloqueo = undefined;
      // Verificar solicitudes aunque no esté bloqueado (para cantidades que exceden)
      groupedInsumo.solicitudPermisoPendiente = !!solicitudPendiente;
      groupedInsumo.solicitudPermisoAprobada = !!solicitudAprobada;
    }
  }

  /**
   * Verifica si la cantidad excede el límite disponible
   */
  verificarCantidadExcedeLimite(groupedInsumo: GroupedInsumoItem, cantidad: number): boolean {
    if (!groupedInsumo.stockInfo || cantidad <= 0) {
      return false;
    }

    // Si tiene aprobación, nunca excede el límite
    if (groupedInsumo.solicitudPermisoAprobada) {
      console.log('Tiene aprobación - No validar límites');
      return false;
    }

    const stockMaximo = groupedInsumo.stockInfo.stockMaximo;
    const stockActual = groupedInsumo.stockInfo.stockActual;
    const espacioDisponible = stockMaximo - stockActual;

    const excede = cantidad > espacioDisponible;
    
    console.log('verificarCantidadExcedeLimite:', {
      codigo: groupedInsumo.codigo,
      cantidad: cantidad,
      espacioDisponible: espacioDisponible,
      excede: excede,
      tieneAprobacion: groupedInsumo.solicitudPermisoAprobada
    });

    return excede;
  }

  /**
   * Maneja el cambio de cantidad en el input
   */
  onCantidadChange(groupedInsumo: GroupedInsumoItem, inputElement: HTMLInputElement): void {
    const cantidad = parseInt(inputElement.value, 10) || 0;
    const tieneAprobacion = groupedInsumo.solicitudPermisoAprobada;
    const tienePendiente = groupedInsumo.solicitudPermisoPendiente;
    
    // Si tiene aprobación o solicitud pendiente, no validar límites
    if (tieneAprobacion || tienePendiente) {
      groupedInsumo.cantidadExcedeLimite = false;
    } else {
      groupedInsumo.cantidadExcedeLimite = this.verificarCantidadExcedeLimite(groupedInsumo, cantidad);
    }
  }

  /**
   * Abre el modal para solicitar permiso
   */
  abrirModalSolicitudPermiso(groupedInsumo: GroupedInsumoItem): void {
    this.articuloSeleccionadoPermiso = groupedInsumo;
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
   * Maneja la solicitud de permiso cuando la cantidad excede el límite
   */
  solicitarPermisoConCantidad(groupedInsumo: GroupedInsumoItem, unidadInput: HTMLInputElement): void {
    const cantidad = parseInt(unidadInput.value, 10) || 0;
    
    if (cantidad <= 0) {
      this.showToast('Debe ingresar una cantidad válida mayor a 0.', 'error');
      return;
    }

    if (!groupedInsumo.stockInfo) {
      this.showToast('No hay información de stock disponible.', 'error');
      return;
    }

    // Pre-llenar el motivo con información de la cantidad solicitada
    const espacioDisponible = groupedInsumo.stockInfo.stockMaximo - groupedInsumo.stockInfo.stockActual;
    this.motivoSolicitud = `Se requiere ordenar ${cantidad} unidades. El espacio disponible es ${espacioDisponible} unidades. `;
    
    this.abrirModalSolicitudPermiso(groupedInsumo);
  }

  /**
   * Envía la solicitud de permiso
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
        
        // Actualizar el estado del artículo inmediatamente
        if (this.articuloSeleccionadoPermiso) {
          this.articuloSeleccionadoPermiso.solicitudPermisoPendiente = true;
          this.articuloSeleccionadoPermiso.cantidadExcedeLimite = false;
        }
        
        this.cerrarModalPermiso();
        this.cargarSolicitudesPermiso();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al crear solicitud de permiso:', error);
        this.showToast('Error al enviar la solicitud de permiso', 'error');
        this.loading = false;
      }
    });
  }

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
    this.groupedFilteredOils.forEach(groupedInsumo => {
      const stockInfo = this.getStockInfo(groupedInsumo.codigo);
      if (stockInfo) {
        groupedInsumo.stockInfo = {
          stockActual: stockInfo.stockDisponible || 0,
          stockMinimo: stockInfo.stockMinimoSugerido || 0,
          stockMaximo: stockInfo.stockMaximoSugerido || 0,
          cantidadSugerida: this.calcularCantidadSugerida(stockInfo),
          ventaUltimoMes: (stockInfo as any).cantVendidaUltMes ?? 0,
          alertaStock: this.getStockAlertLevel(stockInfo)
        };
      }
      
      // Verificar bloqueo después de actualizar stock info
      this.verificarBloqueoArticulo(groupedInsumo);
      
      // Forzar actualización del estado del botón si tiene aprobación
      if (groupedInsumo.solicitudPermisoAprobada) {
        groupedInsumo.cantidadExcedeLimite = false;
      }
    });
  }

  get f() {
    return this.pedidoForm.controls;
  }

  loadProveedores(): void {
    this.proveedorOilService.getProveedoresInsumo().subscribe({
      next: (data: ProveedorInsumo[]) => {
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
    this.oilService.getAllInsumos().subscribe({
      next: (data: InsumoItem[]) => {
        this.allOils = data;
        this.filterOils();
        this.loading = false;
      },
      error: (e) => {
        console.error('Error al cargar insumos:', e);
        this.errorMessage = 'Error al cargar la lista de insumos.';
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

  groupOilsByCode(oils: InsumoItem[]): void {
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
          presentacionesMap: {}
        };
      }
      acc[key].presentaciones.push(oil);

      const presentacion = oil.presentacion?.toLowerCase() || '';
      if (presentacion.includes('unidad')) {
        acc[key].presentacionesDisponibles.unidad = true;
        acc[key].presentacionesMap.unidad = oil;
      }

      return acc;
    }, {} as { [key: string]: GroupedInsumoItem });

    this.groupedFilteredOils = Object.values(grouped);
    this.updateStockInfo();
  }

  aplicarCantidadSugerida(
    groupedInsumo: GroupedInsumoItem,
    unidadInput: HTMLInputElement
  ): void {
    if (!groupedInsumo.stockInfo) {
      this.showToast('No hay información de stock disponible', 'error');
      return;
    }

    const cantidadSugerida = groupedInsumo.stockInfo.cantidadSugerida;

    if (groupedInsumo.presentacionesDisponibles.unidad && unidadInput) {
      unidadInput.value = cantidadSugerida.toString();
      // Trigger el cambio para actualizar el estado del botón
      this.onCantidadChange(groupedInsumo, unidadInput);
    }

    this.showToast(`Cantidad sugerida aplicada: ${cantidadSugerida}`, 'info');
  }

  addOilToPedidoMultiple(
    groupedInsumo: GroupedInsumoItem,
    unidadInput: HTMLInputElement
  ): void {
    const unidadQuantity = parseInt(unidadInput.value, 10) || 0;

    if (unidadQuantity <= 0) {
      this.showToast('Debe ingresar una cantidad válida mayor a 0.', 'error');
      return;
    }

    // Verificar si tiene solicitud aprobada PRIMERO
    const tieneAprobacion = groupedInsumo.solicitudPermisoAprobada;

    console.log('addOilToPedidoMultiple - Debug:', {
      codigo: groupedInsumo.codigo,
      cantidad: unidadQuantity,
      tieneAprobacion: tieneAprobacion,
      bloqueado: groupedInsumo.bloqueado,
      cantidadExcedeLimite: groupedInsumo.cantidadExcedeLimite
    });

    // Si NO tiene aprobación, aplicar validaciones normales
    if (!tieneAprobacion) {
      // Si está bloqueado y NO tiene aprobación, no permitir
      if (groupedInsumo.bloqueado) {
        this.showToast('Este artículo está bloqueado. Debe solicitar permiso primero.', 'error');
        return;
      }

      // Verificar si excede el límite y no tiene aprobación
      if (this.verificarCantidadExcedeLimite(groupedInsumo, unidadQuantity)) {
        const espacioDisponible = groupedInsumo.stockInfo!.stockMaximo - groupedInsumo.stockInfo!.stockActual;
        this.showToast(
          `La cantidad ingresada (${unidadQuantity}) excede el espacio disponible (${espacioDisponible}). Debe solicitar permiso.`,
          'error'
        );
        return;
      }
    }

    // Si tiene aprobación o pasó todas las validaciones, proceder a agregar
    const oilForUnidad = groupedInsumo.presentacionesMap.unidad;

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

      const mensajeBase = `Insumo "${groupedInsumo.codigo}" agregado al pedido.`;
      const mensajeAprobacion = tieneAprobacion ? ' (Con permiso aprobado)' : '';
      this.showToast(mensajeBase + mensajeAprobacion, 'success');
      unidadInput.value = '0';
      groupedInsumo.cantidadExcedeLimite = false;
      
      console.log('Item agregado exitosamente');
    } else {
      console.error('No se encontró el oil para unidad', oilForUnidad);
      this.showToast('Error: No se pudo agregar el insumo', 'error');
    }
  }

  removeOilFromPedido(index: number): void {
    const removedItem = this.currentPedidoItems.splice(index, 1);
    this.showToast(`"${removedItem[0].codigo}" removido del pedido.`, 'info');
  }

  submitPedido(): void {
    this.submitted = true;
    this.submitSuccess = false;
    this.errorMessage = '';

    if (this.currentPedidoItems.length === 0) {
      this.errorMessage = 'El pedido está vacío. Agregue al menos un insumo.';
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
      this.errorMessage = 'Todos los insumos deben tener una cantidad válida mayor a 0.';
      return;
    }

    this.loading = true;
    const apiCalls: Observable<any>[] = [];

    this.currentPedidoItems.forEach(item => {
      const insumoDataForApi = {
        idInsumo: item.oilId,
        cantidad: item.cantidad,
        idusuario: this.idus,
      };

      if (insumoDataForApi.idInsumo && insumoDataForApi.cantidad > 0) {
        apiCalls.push(this.oilService.createInsumoRequest(insumoDataForApi));
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
        this.handleSuccess('Pedido de insumos creado exitosamente.');
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
    this.router.navigate(['/insumouslist']);
  }

  /**
   * Método de depuración para verificar el estado de un artículo
   */
  debugArticuloEstado(groupedInsumo: GroupedInsumoItem): void {
    console.log('=== DEBUG ARTÍCULO ===');
    console.log('Código:', groupedInsumo.codigo);
    console.log('Código Normalizado:', groupedInsumo.codigo?.trim().toUpperCase());
    console.log('Bloqueado:', groupedInsumo.bloqueado);
    console.log('Solicitud Pendiente:', groupedInsumo.solicitudPermisoPendiente);
    console.log('Solicitud Aprobada:', groupedInsumo.solicitudPermisoAprobada);
    console.log('Cantidad Excede Límite:', groupedInsumo.cantidadExcedeLimite);
    console.log('Stock Info:', groupedInsumo.stockInfo);
    console.log('---');
    console.log('Todas las solicitudes:', this.solicitudesPermiso);
    console.log('Solicitudes para este código:');
    const codigoNorm = groupedInsumo.codigo?.trim().toUpperCase();
    this.solicitudesPermiso.forEach(s => {
      const match = s.codigoArticulo?.trim().toUpperCase() === codigoNorm;
      console.log(`  - ${s.codigoArticulo} [${s.estado}] ${match ? '✓ MATCH' : '✗ NO MATCH'}`);
    });
    console.log('=====================');
  }

    refreshData(): void {
    if (this.loading) {
      this.showToast('Actualización en curso. Espere un momento.', 'info');
      return;
    }
    
    this.loading = true;
    this.showToast('Actualizando datos de stock y permisos...', 'info');

    // 1. Cargar stock y actualizar info de stock.
    this.loadStockWithFilters(); 

    // 2. Cargar solicitudes de permiso.
    // Esto asegura que los estados de aprobación se actualicen.
    this.cargarSolicitudesPermiso(); 

    // 3. Forzar el re-filtrado y renderizado de la lista usando el método correcto.
    // CORRECCIÓN: Usamos filterOils() tal como está definido en su código.
    this.filterOils(); 

    // Asegurar que el indicador de carga se desactive.
    setTimeout(() => {
        this.loading = false;
        this.showToast('Datos de insumos actualizados.', 'success');
    }, 1500); 
  }
}