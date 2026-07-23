import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, forkJoin, Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Usuario } from 'src/app/models/usuario';
import { AuthService } from 'src/app/services/auth.service';
import { OilService, StockRepuesto, StockRepuestosFilters } from 'src/app/services/oil.service';
import { ProveedoroilService } from 'src/app/services/proveedoroil.service';
import { ReloadService } from 'src/app/services/reload.service';

export interface ProveedorOil {
  idProveedor: number;
  nombreProveedor: string;
}

export interface OilItem {
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

// Nueva interfaz para solicitudes de permiso
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

export interface GroupedOilItem {
  codigo: string;
  descripcion: string;
  idProveedor: number;
  nombreProveedor: string;
  estado: string;
  presentaciones: OilItem[];
  presentacionesDisponibles: {
    litros: boolean;
    galones: boolean;
    canecas: boolean;
    tanques: boolean;
  };
  presentacionesMap: {
    litros?: OilItem;
    galones?: OilItem;
    canecas?: OilItem;
    tanques?: OilItem;
  };
  stockInfo?: {
    stockActual: number;
    stockDisponible: number;
    stockMinimo: number;
    stockMaximo: number;
    cantidadSugerida: number;
    ventaUltimoMes: number;
    alertaStock: 'bajo' | 'normal' | 'alto' | 'critico';
  };
  // Propiedades para control de permisos y límite de cantidad
  bloqueado?: boolean;
  motivoBloqueo?: string;
  solicitudPermisoPendiente?: boolean;
  solicitudPermisoAprobada?: boolean;
  cantidadExcedeLimite?: boolean; // AÑADIDO
}


@Component({
  selector: 'app-oilusped',
  templateUrl: './oilusped.component.html',
  styleUrls: ['./oilusped.component.css']
})
export class OiluspedComponent implements OnInit, OnDestroy {
  pedidoForm: FormGroup;
  usuario: Usuario | null = null;
  loading = false;
  submitSuccess = false;
  errorMessage = '';

  proveedores: ProveedorOil[] = [];
  allOils: OilItem[] = [];
  filteredOils: OilItem[] = [];
  currentPedidoItems: PedidoItem[] = [];

  oilSearchTerm: string = '';
  selectedProveedorId: number | null = null;
  submitted = false;

  private subscriptions = new Subscription();
  groupedFilteredOils: GroupedOilItem[] = [];

  idus: any;
  repuestos: StockRepuesto[] = [];
  selectedOficina: string = '008';
  selectedGrupo: string = 'LUB';
  error: string | null = null;
  usuarioAgencia: any = null;
  Agencia: any = null;

  // Mapa para búsqueda rápida de stock
  private stockMap: Map<string, StockRepuesto> = new Map();
  
  // Nuevas propiedades para manejo de permisos
  solicitudesPermiso: SolicitudPermiso[] = [];
  mostrarModalPermiso: boolean = false;
  articuloSeleccionadoPermiso: GroupedOilItem | null = null;
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
        console.log('Stock cargado:', this.repuestos);

        this.stockMap.clear();
        this.repuestos.forEach(stock => {
          this.stockMap.set(stock.articulo, stock);
        });

        this.updateStockInfo();
      },
      error: (err) => {
        this.error = 'Error al cargar el inventario';
        this.loading = false;
        console.error('Error:', err);
      }
    });
  }

  /**
   * Carga las solicitudes de permiso del usuario
   */
  cargarSolicitudesPermiso(): void {
    if (!this.idus) return;
    this.oilService.getSolicitudesPermisoUsuario(this.idus).subscribe({
      next: (data: SolicitudPermiso[]) => {
        this.solicitudesPermiso = data;
        console.log('Solicitudes de permiso cargadas:', this.solicitudesPermiso);
        this.updateStockInfo(); // Actualizar info después de cargar solicitudes
      },
      error: (error) => {
        console.error('Error al cargar solicitudes de permiso:', error);
      }
    });
  }

  /**
   * Verifica si un artículo debe estar bloqueado y actualiza los estados de permiso.
   * Se normaliza el código y se inicializa la nueva propiedad `cantidadExcedeLimite`.
   */
  verificarBloqueoArticulo(groupedOil: GroupedOilItem): void {
  if (!groupedOil.stockInfo) {
    groupedOil.bloqueado = false;
    groupedOil.solicitudPermisoPendiente = false;
    groupedOil.solicitudPermisoAprobada = false;
    groupedOil.cantidadExcedeLimite = false;
    return;
  }

  const stockInfo = groupedOil.stockInfo;
  
  const debeBloquear = stockInfo.alertaStock === 'alto' && stockInfo.cantidadSugerida <= 0;

  const codigoNormalizado = groupedOil.codigo?.trim().toUpperCase(); 

  const solicitudPendiente = this.solicitudesPermiso.find(
    s => s.codigoArticulo?.trim().toUpperCase() === codigoNormalizado && s.estado === 'pendiente'
  );
  const solicitudAprobada = this.solicitudesPermiso.find(
    s => s.codigoArticulo?.trim().toUpperCase() === codigoNormalizado && s.estado === 'aprobada'
  );
  
  groupedOil.solicitudPermisoPendiente = !!solicitudPendiente;
  groupedOil.solicitudPermisoAprobada = !!solicitudAprobada;
  groupedOil.cantidadExcedeLimite = false;

  if (debeBloquear) {
    groupedOil.bloqueado = true;
    // CAMBIO: Mensaje actualizado para mostrar stock disponible
    groupedOil.motivoBloqueo = `Stock disponible (${stockInfo.stockDisponible}) supera el máximo recomendado (${stockInfo.stockMaximo}). Stock actual: ${stockInfo.stockActual}`;
    
    if (solicitudAprobada) {
      groupedOil.bloqueado = false;
      groupedOil.motivoBloqueo = `Pedido permitido por aprobación de solicitud.`;
    }
  } else {
    groupedOil.bloqueado = false;
    groupedOil.motivoBloqueo = undefined;
  }
}
  
  /**
   * Verifica si la cantidad total excede el límite disponible (Stock Máximo - Stock Actual).
   */
  verificarCantidadExcedeLimite(groupedOil: GroupedOilItem, totalCantidad: number): boolean { 
  if (!groupedOil.stockInfo || totalCantidad <= 0) {
    return false;
  }

  if (groupedOil.solicitudPermisoAprobada) {
    return false;
  }

  const stockMaximo = groupedOil.stockInfo.stockMaximo;
  const stockDisponible = groupedOil.stockInfo.stockDisponible; // USAR STOCK DISPONIBLE
  
  // CAMBIO CLAVE: Calcular espacio basándose en stock disponible
  const espacioDisponible = stockMaximo - stockDisponible;

  const excede = totalCantidad > espacioDisponible;
  
  return excede;
}

  /**
   * Calcula la cantidad total de unidades a partir de los inputs de las 4 presentaciones.
   */
  calculateTotalQuantity(
    litrosInput: HTMLInputElement, 
    galonesInput: HTMLInputElement, 
    canecasInput: HTMLInputElement, 
    tanquesInput: HTMLInputElement
  ): number {
    const litrosQuantity = parseInt(litrosInput.value, 10) || 0;
    const galonesQuantity = parseInt(galonesInput.value, 10) || 0;
    const canecasQuantity = parseInt(canecasInput.value, 10) || 0;
    const tanquesQuantity = parseInt(tanquesInput.value, 10) || 0;
    
    return litrosQuantity + galonesQuantity + canecasQuantity + tanquesQuantity;
  }

  /**
   * Maneja el cambio de cantidad en los inputs y valida el exceso de límite.
   */
  onOilQuantityChange(
    groupedOil: GroupedOilItem, 
    litrosInput: HTMLInputElement, 
    galonesInput: HTMLInputElement, 
    canecasInput: HTMLInputElement, 
    tanquesInput: HTMLInputElement
  ): void {
    const totalCantidad = this.calculateTotalQuantity(litrosInput, galonesInput, canecasInput, tanquesInput);
    
    if (totalCantidad === 0) {
      groupedOil.cantidadExcedeLimite = false;
      return;
    }

    const tieneAprobacion = groupedOil.solicitudPermisoAprobada;
    const tienePendiente = groupedOil.solicitudPermisoPendiente;
    
    // Si tiene aprobación o solicitud pendiente, no validar límites y desmarcar exceso.
    if (tieneAprobacion || tienePendiente) {
      groupedOil.cantidadExcedeLimite = false;
    } else {
      groupedOil.cantidadExcedeLimite = this.verificarCantidadExcedeLimite(groupedOil, totalCantidad);
    }
  }

  /**
   * Maneja la solicitud de permiso cuando la cantidad excede el límite.
   */
solicitarPermisoConCantidad(
  groupedOil: GroupedOilItem, 
  litrosInput: HTMLInputElement, 
  galonesInput: HTMLInputElement, 
  canecasInput: HTMLInputElement, 
  tanquesInput: HTMLInputElement
): void { 
  const cantidad = this.calculateTotalQuantity(litrosInput, galonesInput, canecasInput, tanquesInput);
  
  if (cantidad <= 0) {
    this.showToast('Debe ingresar una cantidad válida mayor a 0.', 'error');
    return;
  }

  if (!groupedOil.stockInfo) {
    this.showToast('No hay información de stock disponible.', 'error');
    return;
  }

  const stockMaximo = groupedOil.stockInfo.stockMaximo;
  const stockDisponible = groupedOil.stockInfo.stockDisponible; // USAR STOCK DISPONIBLE
  const stockActual = groupedOil.stockInfo.stockActual;
  const espacioDisponible = stockMaximo - stockDisponible;

  // CAMBIO: Mensaje más detallado con stock disponible
  this.motivoSolicitud = `Solicitud de pedido por exceso de cantidad. Se necesitan ${cantidad} unidades, pero el espacio disponible es ${espacioDisponible} unidades (Stock Máximo: ${stockMaximo}, Stock Disponible: ${stockDisponible}, Stock Actual: ${stockActual}).`;
  
  this.abrirModalSolicitudPermiso(groupedOil);
}

  /**
   * Abre el modal para solicitar permiso
   */
  abrirModalSolicitudPermiso(groupedOil: GroupedOilItem): void {
    this.articuloSeleccionadoPermiso = groupedOil;
    
    if (!this.motivoSolicitud) { // Usar motivo de bloqueo si no se pre-llenó por exceso de cantidad
        this.motivoSolicitud = groupedOil.motivoBloqueo || ''; 
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
            this.articuloSeleccionadoPermiso.cantidadExcedeLimite = false; // Se limpia el estado de exceso
        }
        
        this.cerrarModalPermiso();
        this.cargarSolicitudesPermiso(); // Recargar solicitudes
        this.updateStockInfo(); // Actualizar vista
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

  /**
   * Añade el aceite al pedido, manejando las múltiples presentaciones.
   * Se añade la cantidad total de cada presentación que tenga un valor > 0.
   */
 addOilToPedidoMultiple(
  groupedOil: GroupedOilItem,
  litrosInput: HTMLInputElement,
  galonesInput: HTMLInputElement,
  canecasInput: HTMLInputElement,
  tanquesInput: HTMLInputElement
): void {
  if (groupedOil.bloqueado && !groupedOil.solicitudPermisoAprobada) {
    this.showToast(`El artículo "${groupedOil.codigo}" está bloqueado por exceso de stock. Solicite permiso.`, 'error');
    return;
  }

  const quantities = {
    litros: parseInt(litrosInput.value, 10) || 0,
    galones: parseInt(galonesInput.value, 10) || 0,
    canecas: parseInt(canecasInput.value, 10) || 0,
    tanques: parseInt(tanquesInput.value, 10) || 0
  };
  
  let totalCantidad = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);

  if (totalCantidad <= 0) {
    this.showToast('Debe ingresar al menos una unidad para agregar al pedido.', 'error');
    return;
  }
  
  const tieneAprobacion = groupedOil.solicitudPermisoAprobada;
  
  // VALIDACIÓN usando stock disponible
  const isExceeding = this.verificarCantidadExcedeLimite(groupedOil, totalCantidad);

  if (isExceeding && !tieneAprobacion) {
    // CAMBIO: Mensaje con información de stock disponible
    const espacioDisponible = groupedOil.stockInfo 
      ? groupedOil.stockInfo.stockMaximo - groupedOil.stockInfo.stockDisponible 
      : 0;
    this.showToast(
      `La cantidad solicitada (${totalCantidad}) excede el espacio disponible (${espacioDisponible}). Stock disponible: ${groupedOil.stockInfo?.stockDisponible}. Por favor, solicite permiso.`, 
      'error'
    );
    groupedOil.cantidadExcedeLimite = true;
    return;
  }
  
  if (groupedOil.cantidadExcedeLimite) {
    groupedOil.cantidadExcedeLimite = false;
  }

  // Resto del código para agregar items...
  let hasValidQuantity = false;
  let addedPresentations: string[] = [];

  Object.entries(quantities).forEach(([presentationType, quantity]) => {
    if (quantity > 0) {
      const presentationKey = presentationType as keyof typeof groupedOil.presentacionesMap;
      const oilForPresentation = groupedOil.presentacionesMap[presentationKey];
      if (oilForPresentation && oilForPresentation.id) {
        const existingItemIndex = this.currentPedidoItems.findIndex(
          item => item.oilId === oilForPresentation.id && item.presentacion === oilForPresentation.presentacion
        );
        if (existingItemIndex > -1) {
          this.currentPedidoItems[existingItemIndex].cantidad += quantity;
        } else {
          this.currentPedidoItems.push({
            oilId: oilForPresentation.id,
            codigo: oilForPresentation.codigo,
            descripcion: oilForPresentation.descripcion,
            presentacion: oilForPresentation.presentacion || presentationType.charAt(0).toUpperCase() + presentationType.slice(1),
            cantidad: quantity,
            idProveedor: oilForPresentation.idProveedor,
            nombreProveedor: oilForPresentation.nombreProveedor || 'Desconocido'
          });
        }
        addedPresentations.push(`${quantity} ${presentationType.charAt(0).toUpperCase() + presentationType.slice(1)}`);
        hasValidQuantity = true;
      }
    }
  });

  if (hasValidQuantity) {
    const mensajeBase = `Aceite "${groupedOil.codigo}" agregado al pedido: ${addedPresentations.join(', ')}.`;
    const mensajeAprobacion = tieneAprobacion ? ' (Con permiso aprobado)' : '';
    this.showToast(mensajeBase + mensajeAprobacion, 'success');
    
    litrosInput.value = '0';
    galonesInput.value = '0';
    canecasInput.value = '0';
    tanquesInput.value = '0';
  } else {
    this.showToast('No se ingresó ninguna cantidad válida para agregar.', 'error');
  }
}

  // Conveniencia para acceder a los controles del formulario
  get f() {
    return this.pedidoForm.controls;
  }

  loadProveedores(): void {
    this.proveedorOilService.getProveedoresOil().subscribe({
      next: (data) => {
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
    this.oilService.getAllOils().subscribe({
      next: (data: OilItem[]) => {
        this.allOils = data;
        this.filterOils();
        this.loading = false;
      },
      error: (e) => {
        console.error('Error al cargar aceites:', e);
        this.errorMessage = 'Error al cargar la lista de aceites.';
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

  refreshData(): void {
    if (this.loading) {
      this.showToast('Ya se está realizando una operación...', 'info');
      return;
    }
    
    this.loading = true;
    this.errorMessage = '';
    this.showToast('Actualizando stock y permisos...', 'info');

    // 1. Crear el observable para la carga de Stock
    const stockFilters: StockRepuestosFilters = {};
    if (this.Agencia) { stockFilters.oficina = this.Agencia; }
    if (this.selectedGrupo) { stockFilters.grupo = this.selectedGrupo; }
    const stock$ = this.oilService.getStockRepuestos(stockFilters);

    // 2. Crear el observable para la carga de Solicitudes (asegurar que idus existe)
    const solicitudes$ = this.idus 
      ? this.oilService.getSolicitudesPermisoUsuario(this.idus) 
      : new Observable<SolicitudPermiso[]>(observer => observer.next([])); 

    this.subscriptions.add(
      forkJoin([stock$, solicitudes$]).pipe(
        finalize(() => {
          this.loading = false;
        })
      ).subscribe({
        next: ([stockData, solicitudesData]) => {
          // A. Actualizar Stock
          this.repuestos = stockData;
          this.stockMap.clear();
          this.repuestos.forEach(stock => {
            this.stockMap.set(stock.articulo, stock);
          });

          // B. Actualizar Solicitudes de Permiso
          this.solicitudesPermiso = solicitudesData;
          
          // C. Re-filtrar/Re-agrupar/Re-verificar (llama a updateStockInfo al final)
          this.filterOils(); 
          this.showToast('Datos de stock y permisos actualizados.', 'success');
        },
        error: (err) => {
          this.errorMessage = 'Error al actualizar el stock o los permisos.';
          console.error('Error durante la actualización:', err);
          this.showToast(this.errorMessage, 'error');
        }
      })
    );
  }

  onProveedorChange(): void {
    this.selectedProveedorId = this.pedidoForm.get('idProveedor')?.value;
    this.oilSearchTerm = '';
    this.filterOils();
  }

  groupOilsByCode(oils: OilItem[]): void {
    const grouped: { [key: string]: GroupedOilItem } = oils.reduce((acc, oil) => {
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
            litros: false,
            galones: false,
            canecas: false,
            tanques: false,
          },
          presentacionesMap: {},
          bloqueado: false, // Inicialización de propiedades de control
          motivoBloqueo: undefined,
          solicitudPermisoPendiente: false,
          solicitudPermisoAprobada: false,
          cantidadExcedeLimite: false,
        };
      }

      acc[key].presentaciones.push(oil);
      const presentacion = oil.presentacion?.toLowerCase() || '';

      if (presentacion.includes('litro')) {
        acc[key].presentacionesDisponibles.litros = true;
        acc[key].presentacionesMap.litros = oil;
      } else if (presentacion.includes('galon')) {
        acc[key].presentacionesDisponibles.galones = true;
        acc[key].presentacionesMap.galones = oil;
      } else if (presentacion.includes('caneca')) {
        acc[key].presentacionesDisponibles.canecas = true;
        acc[key].presentacionesMap.canecas = oil;
      } else if (presentacion.includes('tanque')) {
        acc[key].presentacionesDisponibles.tanques = true;
        acc[key].presentacionesMap.tanques = oil;
      }
      
      return acc;
    }, {} as { [key: string]: GroupedOilItem });

    // Convert map to array and apply stock info and blockage checks
    const groupedArray = Object.values(grouped);
    groupedArray.forEach(groupedOil => {
      groupedOil.stockInfo = this.getOilStockInfo(groupedOil.codigo);
      this.verificarBloqueoArticulo(groupedOil);
    });
    
    // Filtro final para mostrar solo los que tienen al menos 1 presentación
    this.groupedFilteredOils = groupedArray.filter(g => 
      g.presentacionesDisponibles.litros || 
      g.presentacionesDisponibles.galones || 
      g.presentacionesDisponibles.canecas || 
      g.presentacionesDisponibles.tanques
    );
  }
  
  /**
   * Obtiene la información de stock para un código de aceite (usando el mapa de stock)
   */
  getOilStockInfo(codigo: string): {
  stockActual: number;
  stockDisponible: number; // NUEVO campo
  stockMinimo: number;
  stockMaximo: number;
  cantidadSugerida: number;
  ventaUltimoMes: number;
  alertaStock: 'bajo' | 'normal' | 'alto' | 'critico';
} | undefined {
  const stockData = this.stockMap.get(codigo?.trim().toUpperCase() || '');
  
  if (stockData) {
    const stockActual = stockData.stockDisponible;
    const stockDisponible = stockData.stockDisponible; // USAR STOCK DISPONIBLE
    const stockMinimo = stockData.stockMinimoSugerido;
    const stockMaximo = stockData.stockMaximoSugerido;
    // Venta del último mes (viene del endpoint stock-repuestos como cantVendidaUltMes)
    const ventaUltimoMes = (stockData as any).cantVendidaUltMes ?? 0;
    
    // CAMBIO CLAVE: Usar stockDisponible para alertas y cálculos
    const alertaStock = this.getStockAlertLevel(stockDisponible, stockMinimo, stockMaximo);
    const cantidadSugerida = this.calcularCantidadSugerida(stockDisponible, stockMinimo, stockMaximo);
    
    return {
      stockActual,        // Mantener para referencia
      stockDisponible,    // NUEVO: Stock real disponible
      stockMinimo,
      stockMaximo,
      cantidadSugerida,
      ventaUltimoMes,     // NUEVO: venta del último mes
      alertaStock
    };
  }
  return undefined;
}

  /**
   * Calcula la cantidad sugerida de pedido.
   * Si el stock actual está por debajo del mínimo, sugiere hasta el máximo.
   */
  calcularCantidadSugerida(stockActual: number, stockMinimo: number, stockMaximo: number): number {
    if (stockActual < stockMinimo) {
      // Sugerir la cantidad necesaria para llegar al máximo
      return Math.max(0, stockMaximo - stockActual);
    }
    return 0;
  }

  /**
   * Determina el nivel de alerta de stock.
   */
  getStockAlertLevel(stockActual: number, stockMinimo: number, stockMaximo: number): 'bajo' | 'normal' | 'alto' | 'critico' {
    if (stockActual === 0) {
      return 'critico';
    } else if (stockActual < stockMinimo) {
      return 'bajo';
    } else if (stockActual > stockMaximo) {
      return 'alto';
    } else {
      return 'normal';
    }
  }

  /**
   * Actualiza la información de stock y bloqueo para los aceites ya cargados.
   */
  updateStockInfo(): void {
    this.groupedFilteredOils.forEach(groupedOil => {
      groupedOil.stockInfo = this.getOilStockInfo(groupedOil.codigo);
      this.verificarBloqueoArticulo(groupedOil);
      // Se debe limpiar el estado de exceso de límite si el stock/permisos cambian.
      if (!groupedOil.solicitudPermisoPendiente && !groupedOil.solicitudPermisoAprobada) {
         groupedOil.cantidadExcedeLimite = false;
      }
    });
  }
  
  /**
   * Aplica la cantidad sugerida en el input de litros y limpia los demás.
   */
  aplicarCantidadSugerida(
    groupedOil: GroupedOilItem, 
    litrosInput: HTMLInputElement, 
    galonesInput: HTMLInputElement, 
    canecasInput: HTMLInputElement, 
    tanquesInput: HTMLInputElement
  ): void {
    if (groupedOil.stockInfo && groupedOil.stockInfo.cantidadSugerida > 0) {
      const cantidad = groupedOil.stockInfo.cantidadSugerida;
      
      // Aplicar al input de litros y limpiar los demás
      if (groupedOil.presentacionesDisponibles.litros) {
        litrosInput.value = cantidad.toString();
        galonesInput.value = '0';
        canecasInput.value = '0';
        tanquesInput.value = '0';
        
        // Forzar el evento de cambio para validar el límite
        this.onOilQuantityChange(groupedOil, litrosInput, galonesInput, canecasInput, tanquesInput);

        this.showToast(`Cantidad sugerida (${cantidad} Litros) aplicada para ${groupedOil.codigo}`, 'info');
      } else {
         this.showToast('La presentación en Litros no está disponible para aplicar la cantidad sugerida.', 'error');
      }
    }
  }

  removeOilFromPedido(index: number): void {
    this.currentPedidoItems.splice(index, 1);
    this.showToast('Aceite eliminado del pedido', 'info');
  }

  submitPedido(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.submitSuccess = false;

    if (this.pedidoForm.invalid) {
      this.errorMessage = 'Por favor, seleccione un proveedor válido.';
      return;
    }

    const invalidItems = this.currentPedidoItems.filter(item => !item.cantidad || item.cantidad <= 0 || !item.oilId);
    if (invalidItems.length > 0) {
      this.errorMessage = 'Todos los aceites deben tener una cantidad válida mayor a 0.';
      return;
    }

    this.loading = true;
    const apiCalls: Observable<any>[] = [];

    this.currentPedidoItems.forEach(item => {
      const oilDataForApi = {
        idOil: item.oilId,
        cantidad: item.cantidad,
        idusuario: this.idus,
      };

      if (oilDataForApi.idOil && oilDataForApi.cantidad > 0) {
        apiCalls.push(this.oilService.createOilRequest(oilDataForApi));
      }
    });

    if (apiCalls.length === 0) {
      this.errorMessage = 'No hay aceites válidos para enviar en el pedido.';
      this.loading = false;
      return;
    }

    forkJoin(apiCalls).subscribe({
      next: (responses) => {
        console.log('Todas las peticiones de aceite completadas:', responses);
        this.handleSuccess('Pedido de aceites enviado con éxito.');
      },
      error: (error) => {
        console.error('Error al crear uno o más ítems del pedido:', error);
        let errorMsg = 'Error desconocido';
        
        // Intento de extraer un mensaje de error más útil
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
        this.loading = false;
        this.showToast(this.errorMessage, 'error');
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
    this.solicitudesPermiso = []; // Limpiar/re-cargar solicitudes también

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
    this.router.navigate(['/listado-pedidos']);
  }
}