import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup,  Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, forkJoin, Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Usuario } from 'src/app/models/usuario';
import { AuthService } from 'src/app/services/auth.service';
import { OilService, StockRepuesto, StockRepuestosFilters, VidrioDto } from 'src/app/services/oil.service';
import { ProveedoroilService } from 'src/app/services/proveedoroil.service';
import { ReloadService } from 'src/app/services/reload.service';


export interface ProveedorVidrio {
  idProveedor: number;
  nombreProveedor: string;
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
  id: number;
  codigo: string;
  descripcion: string;
  idProveedor: number;
  nombreProveedor: string;
  estado: string;
  dimensiones: string;
  grosorMM: number;
  tipoVidrio: string;
  fechaCreacion: string;
  fechaModificacion: string;
  stockInfo?: {
    stockActual: number;
    stockMinimo: number;
    stockMaximo: number;
    cantidadSugerida: number;
    alertaStock: 'bajo' | 'normal' | 'alto' | 'critico';
  };
  bloqueado?: boolean;
  motivoBloqueo?: string;
  solicitudPermisoPendiente?: boolean;
  solicitudPermisoAprobada?: boolean;
  cantidadExcedeLimite?: boolean;
}

@Component({
  selector: 'app-vidriosusped',
  templateUrl: './vidriosusped.component.html',
  styleUrls: ['./vidriosusped.component.css']
})
export class VidriosuspedComponent implements OnInit, OnDestroy {
  pedidoForm: FormGroup;
  usuario: Usuario | null = null;
  loading = false;
  submitSuccess = false;
  errorMessage = '';

  proveedores: ProveedorVidrio[] = [];
  allOils: VidrioDto[] = [];
  filteredOils: VidrioDto[] = [];
  currentPedidoItems: PedidoItem[] = [];

  oilSearchTerm = '';
  selectedProveedorId: number | null = null;
  submitted = false;

  private subscriptions = new Subscription();
  groupedFilteredOils: GroupedFilterItem[] = [];

  idus: any;
  repuestos: StockRepuesto[] = [];
  selectedOficina = '';
  selectedGrupo = 'FLT';
  error: string | null = null;
  usuarioAgencia: any = null;
  Agencia: any = null;

  private stockMap = new Map<string, StockRepuesto>();

  solicitudesPermiso: SolicitudPermiso[] = [];
  mostrarModalPermiso = false;
  articuloSeleccionadoPermiso: GroupedFilterItem | null = null;
  motivoSolicitud = '';

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
      if (this.usuario) {
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
        this.Agencia = this.usuarioAgencia.idagencia;
        this.loadStockWithFilters();
      },
      error: (error) => {
        this.error = 'Error al cargar el usuario';
        console.error('Error:', error);
      },
      complete: () => console.log('Petición completada')
    });
  }

  loadStockWithFilters(): void {
    this.loading = true;
    this.error = null;

    const filters: StockRepuestosFilters = {};
    if (this.Agencia) filters.oficina = this.Agencia;
    if (this.selectedGrupo) filters.grupo = this.selectedGrupo;

    this.oilService.getStockRepuestos(filters).subscribe({
      next: (data) => {
        this.repuestos = data;
        this.loading = false;
        console.log('Stock de filtros cargado:', this.repuestos);

        this.stockMap.clear();
        this.repuestos.forEach(stock => this.stockMap.set(stock.articulo, stock));
        this.updateStockInfo();
      },
      error: (err) => {
        this.error = 'Error al cargar el inventario de filtros';
        this.loading = false;
        console.error('Error:', err);
      }
    });
  }

  cargarSolicitudesPermiso(): void {
    this.oilService.getSolicitudesPermisoUsuario(this.idus).subscribe({
      next: (data: SolicitudPermiso[]) => {
        this.solicitudesPermiso = data;
        console.log('Solicitudes de permiso cargadas:', this.solicitudesPermiso);
        this.updateStockInfo();
        setTimeout(() => this.groupedFilteredOils = [...this.groupedFilteredOils], 100);
      },
      error: (error) => console.error('Error al cargar solicitudes de permiso:', error)
    });
  }

  verificarBloqueoArticulo(groupedFilter: GroupedFilterItem): void {
    if (!groupedFilter.stockInfo) {
      groupedFilter.bloqueado = false;
      groupedFilter.solicitudPermisoPendiente = false;
      groupedFilter.solicitudPermisoAprobada = false;
      groupedFilter.cantidadExcedeLimite = false;
      return;
    }

    const stockInfo = groupedFilter.stockInfo;
    const debeBloquear = stockInfo.alertaStock === 'alto' && stockInfo.cantidadSugerida <= 0;
    const codigoNormalizado = groupedFilter.codigo?.trim().toUpperCase();

    const solicitudPendiente = this.solicitudesPermiso.find(
      s => s.codigoArticulo?.trim().toUpperCase() === codigoNormalizado && s.estado === 'pendiente'
    );
    const solicitudAprobada = this.solicitudesPermiso.find(
      s => s.codigoArticulo?.trim().toUpperCase() === codigoNormalizado && s.estado === 'aprobada'
    );

    groupedFilter.solicitudPermisoPendiente = !!solicitudPendiente;
    groupedFilter.solicitudPermisoAprobada = !!solicitudAprobada;
    groupedFilter.cantidadExcedeLimite = false;

    if (debeBloquear) {
      groupedFilter.bloqueado = true;
      groupedFilter.motivoBloqueo = `Stock actual (${stockInfo.stockActual}) supera el máximo recomendado (${stockInfo.stockMaximo})`;
      if (solicitudAprobada) {
        groupedFilter.bloqueado = false;
        groupedFilter.motivoBloqueo = `Pedido permitido por aprobación de solicitud.`;
      }
    } else {
      groupedFilter.bloqueado = false;
      groupedFilter.motivoBloqueo = undefined;
    }
  }

  verificarCantidadExcedeLimite(groupedFilter: GroupedFilterItem, cantidad: number): boolean {
    if (!groupedFilter.stockInfo || cantidad <= 0) return false;
    if (groupedFilter.solicitudPermisoAprobada) return false;

    const { stockMaximo, stockActual } = groupedFilter.stockInfo;
    const espacioDisponible = stockMaximo - stockActual;
    return cantidad > espacioDisponible;
  }

  onCantidadChange(groupedFilter: GroupedFilterItem, inputElement: HTMLInputElement): void {
    const cantidad = parseInt(inputElement.value, 10) || 0;
    if (cantidad === 0) {
      groupedFilter.cantidadExcedeLimite = false;
      return;
    }

    const tieneAprobacion = groupedFilter.solicitudPermisoAprobada;
    const tienePendiente = groupedFilter.solicitudPermisoPendiente;

    if (tieneAprobacion || tienePendiente) {
      groupedFilter.cantidadExcedeLimite = false;
    } else {
      groupedFilter.cantidadExcedeLimite = this.verificarCantidadExcedeLimite(groupedFilter, cantidad);
    }
  }

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

    const espacioDisponible = groupedFilter.stockInfo.stockMaximo - groupedFilter.stockInfo.stockActual;
    this.motivoSolicitud = `Solicitud de pedido por exceso de cantidad. Se necesitan ${cantidad} unidades, pero el espacio disponible es ${espacioDisponible} unidades. `;
    this.abrirModalSolicitudPermiso(groupedFilter);
  }

  abrirModalSolicitudPermiso(groupedFilter: GroupedFilterItem): void {
    this.articuloSeleccionadoPermiso = groupedFilter;
    if (!this.motivoSolicitud) this.motivoSolicitud = '';
    this.mostrarModalPermiso = true;
  }

  cerrarModalPermiso(): void {
    this.mostrarModalPermiso = false;
    this.articuloSeleccionadoPermiso = null;
    this.motivoSolicitud = '';
  }

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
      next: () => {
        this.showToast('Solicitud de permiso enviada exitosamente', 'success');
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
    this.groupedFilteredOils.forEach(groupedFilter => {
      const stockInfo = this.getStockInfo(groupedFilter.codigo);
      if (stockInfo) {
        groupedFilter.stockInfo = {
          stockActual: stockInfo.stock || 0,
          stockMinimo: stockInfo.stockMinimoSugerido || 0,
          stockMaximo: stockInfo.stockMaximoSugerido || 0,
          cantidadSugerida: this.calcularCantidadSugerida(stockInfo),
          alertaStock: this.getStockAlertLevel(stockInfo)
        };
      }
      this.verificarBloqueoArticulo(groupedFilter);
    });
  }

  get f() {
    return this.pedidoForm.controls;
  }

  loadProveedores(): void {
    this.proveedorOilService.getProveedoresVidrios().subscribe({
      next: (data: ProveedorVidrio[]) => {
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
    this.oilService.getAllVidrios().subscribe({
      next: (data: VidrioDto[]) => {
        this.allOils = data;
        this.filterOils();
        this.loading = false;
      },
      error: (e) => {
        console.error('Error al cargar vidrios:', e);
        this.errorMessage = 'Error al cargar la lista de vidrios.';
        this.loading = false;
      }
    });
  }

  filterOils(): void {
    let tempOils = [...this.allOils];

    if (this.selectedProveedorId) {
      tempOils = tempOils.filter(v => v.idProveedor === Number(this.selectedProveedorId));
    }

    if (this.oilSearchTerm.trim() !== '') {
      const searchTermLower = this.oilSearchTerm.toLowerCase();
      tempOils = tempOils.filter(v =>
        v.codigoVidrio.toLowerCase().includes(searchTermLower) ||
        v.descripcion.toLowerCase().includes(searchTermLower)
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

  groupOilsByCode(vidrios: VidrioDto[]): void {
    const grouped = vidrios.reduce((acc, v) => {
      const key = v.codigoVidrio;
      if (!acc[key]) {
        acc[key] = {
          id: v.id,
          codigo: v.codigoVidrio,
          descripcion: v.descripcion,
          idProveedor: v.idProveedor,
          nombreProveedor: v.nombreProveedor,
          estado: v.estado,
          dimensiones: v.dimensiones,
          grosorMM: v.grosorMM,
          tipoVidrio: v.tipoVidrio,
          fechaCreacion: v.fechaCreacion,
          fechaModificacion: v.fechaModificacion,
          bloqueado: false,
          motivoBloqueo: undefined,
          solicitudPermisoPendiente: false,
          solicitudPermisoAprobada: false,
          cantidadExcedeLimite: false,
        };
      }
      return acc;
    }, {} as { [key: string]: GroupedFilterItem });

    this.groupedFilteredOils = Object.values(grouped);
    this.updateStockInfo();
  }

  aplicarCantidadSugerida(groupedFilter: GroupedFilterItem, unidadInput: HTMLInputElement): void {
    if (!groupedFilter.stockInfo) {
      this.showToast('No hay información de stock disponible', 'error');
      return;
    }
    const cantidadSugerida = groupedFilter.stockInfo.cantidadSugerida;
    if (unidadInput) {
      unidadInput.value = cantidadSugerida.toString();
      this.onCantidadChange(groupedFilter, unidadInput);
    }
    this.showToast(`Cantidad sugerida aplicada: ${cantidadSugerida}`, 'info');
  }

  addOilToPedidoMultiple(groupedFilter: GroupedFilterItem, unidadInput: HTMLInputElement): void {
    const cantidad = parseInt(unidadInput.value, 10) || 0;
    const tieneAprobacion = groupedFilter.solicitudPermisoAprobada;

    if (cantidad <= 0) {
      this.showToast('Debe ingresar al menos una cantidad válida.', 'error');
      return;
    }

    const isBlocked = groupedFilter.bloqueado && !tieneAprobacion;
    if (isBlocked) {
      this.showToast('Este artículo está bloqueado. Debe solicitar permiso primero.', 'error');
      return;
    }

    const isExceeding = this.verificarCantidadExcedeLimite(groupedFilter, cantidad);
    if (isExceeding && !tieneAprobacion) {
      this.showToast(`La cantidad solicitada (${cantidad}) excede el límite disponible. Por favor, solicite permiso.`, 'error');
      groupedFilter.cantidadExcedeLimite = true;
      return;
    }

    const presentacion = 'Unidad';
    const codigo = groupedFilter.codigo;
    const descripcion = groupedFilter.descripcion;
    const idProveedor = groupedFilter.idProveedor;
    const nombreProveedor = groupedFilter.nombreProveedor;

    const existingIndex = this.currentPedidoItems.findIndex(
      item => item.codigo === codigo && item.presentacion === presentacion
    );

    if (existingIndex > -1) {
      this.currentPedidoItems[existingIndex].cantidad += cantidad;
    } else {
      this.currentPedidoItems.push({
        oilId: groupedFilter.id,
        codigo,
        descripcion,
        presentacion,
        cantidad,
        idProveedor,
        nombreProveedor
      });
    }

    this.showToast(`Vidrio "${codigo}" agregado al pedido.${tieneAprobacion ? ' (Con permiso aprobado)' : ''}`, 'success');
    unidadInput.value = '0';
    groupedFilter.cantidadExcedeLimite = false;
  }

  removeOilFromPedido(index: number): void {
    const removedItem = this.currentPedidoItems.splice(index, 1);
    this.showToast(`"${removedItem[0].codigo}" removido del pedido.`, 'info');
  }

  refreshData(): void {
    if (this.loading) {
      this.showToast('Actualización en curso. Espere un momento.', 'info');
      return;
    }
    this.loading = true;
    this.showToast('Actualizando datos...', 'info');
    this.loadStockWithFilters();
    this.cargarSolicitudesPermiso();
    this.filterOils();
    setTimeout(() => {
      this.loading = false;
      this.showToast('Datos actualizados.', 'success');
    }, 1500);
  }

  submitPedido(): void {
    this.submitted = true;
    this.submitSuccess = false;
    this.errorMessage = '';

    if (this.currentPedidoItems.length === 0) {
      this.errorMessage = 'El pedido está vacío. Agregue al menos un vidrio.';
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
      this.errorMessage = 'Todos los vidrios deben tener una cantidad válida mayor a 0.';
      return;
    }

    this.loading = true;
    const apiCalls: Observable<any>[] = [];

    this.currentPedidoItems.forEach(item => {
      const filterDataForApi = {
        idVidrio: item.oilId,
        cantidad: item.cantidad,
        idusuario: this.idus,
      };

      if (filterDataForApi.idVidrio && filterDataForApi.cantidad > 0) {
        apiCalls.push(this.oilService.createVidrioRequest(filterDataForApi));
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
        this.handleSuccess('Pedido de vidrios creado exitosamente.');
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
    this.router.navigate(['/vidriouslist']);
  }
}