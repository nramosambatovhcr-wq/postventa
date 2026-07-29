import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { Oil } from '../pedidovhcr/oil/oil-create/oil-create.component';
import { OilItem } from '../pedidous/oil/oilusped/oilusped.component';
import { Filter } from '../pedidovhcr/oil/filter-create/filter-create.component';
import { Insumo } from '../pedidovhcr/oil/insumo-create/insumo-create.component';
import { FilterItem } from '../pedidous/filter/filterusped/filterusped.component';
import { InsumoItem } from '../pedidous/insumos/insumousped/insumousped.component';
import { Vidrio } from '../pedidovhcr/oil/vidrios-create/vidrios-create.component';
 

export interface PedidoOilDetail {
  idPedido: number;
  idOil: number;
  codigoOil: string;
  descripcionOil: string;
  presentacionOil?: string; // Optional, as it can be null in DB
  cantidadSolicitada: number;
  idProveedor: number;
  nombreProveedor: string;
  fechaPedido: Date;
  fechaModificacionPedido: Date;
  estadoPedido: string;
  idUsuarioSolicitante: number;
  nombreUsuarioSolicitante: string;
  agencia?:string;
  tipoItem?: 'lubricantes' | 'filtros' | 'insumos'| 'vidrios';
}

export interface PedidoFilterDetail {
  idPedido: number;
  idFilter: number;
  codigoFilter: string;
  descripcionFilter: string;
  presentacionFilter?: string; // Optional, as it can be null in DB
  cantidadSolicitada: number;
  idProveedor: number;
  nombreProveedor: string;
  fechaPedido: Date;
  fechaModificacionPedido: Date;
  estadoPedido: string;
  idUsuarioSolicitante: number;
  nombreUsuarioSolicitante: string;
  agencia?: string;
}

export interface PedidoInsumoDetail {
  idPedido: number;
  idInsumo: number;
  codigoInsumo: string;
  descripcionInsumo: string;
  presentacionInsumo?: string; // Optional, as it can be null in DB
  cantidadSolicitada: number;
  idProveedor: number;
  nombreProveedor: string;
  fechaPedido: Date;
  fechaModificacionPedido: Date;
  estadoPedido: string;
  idUsuarioSolicitante: number;
  nombreUsuarioSolicitante: string;
  agencia?: string;
}

export interface PedidoVidrioDetail {
  idPedido: number;
  idVidrio: number;
  codigoVidrio: string;
  descripcionVidrio: string;
  presentacionVidrio?: string; // Optional, as it can be null in DB
  cantidadSolicitada: number;
  idProveedor: number;
  nombreProveedor: string;
  fechaPedido: Date;
  fechaModificacionPedido: Date;
  estadoPedido: string;
  idUsuarioSolicitante: number;
  nombreUsuarioSolicitante: string;
  agencia?: string;
}

export interface StockRepuestosApiResponse {
  success: boolean;
  message: string;
  filtros: {
    oficina: string;
    grupo: string;
  };
  tiempoEjecucionSegundos: number;
  data: StockRepuesto[];
}

// Interface para cada item de repuesto
export interface StockRepuesto {
  oficinaId: string;
  oficina: string;
  bodegaId: string;
  bodega: string;
  claseId: string;
  clase: string;
  grupoId: string;
  grupo: string;
  articulo: string;
  nombre: string;
  ubicacion: string;
  lineaCompId: string;
  lineaCompetencia: string;
  stock: number;
  stockReservado: number;
  stockDisponible: number;
  fob: number;
  costoUni: number;
  costoTotal: number;
  costoPromedio: number;
  precioSinIva: number;
  descuentoMaximo: number;
  primeraFechaCompra: string | null;
  ultimaFechaCompra: string | null;
  ultimaFechaVenta: string | null;
  cantVendidaUltMes: number;
  numeroDeTransferencias: number;
  cantVendida3Meses: number;
  cantVendida6Meses: number;
  cantVendida12Meses: number;
  promVentaMensual3M: number;
  promVentaMensual6M: number;
  promVentaMensual12M: number;
  stockMinimoSugerido: number;
  stockMaximoSugerido: number;
  puntoReorden: number;
  estadoStock: string;
  mesesInventarioDisponible: number | null;
  rotacionAnual: number;
}

// Interface para los filtros
export interface StockRepuestosFilters {
  oficina?: string;
  grupo?: string;
}

// src/app/models/vidrio.dto.ts
export interface VidrioDto {
  id: number;
  codigoVidrio: string;
  descripcion: string;
  idProveedor: number;
  nombreProveedor: string;
  dimensiones: string;
  grosorMM: number;
  tipoVidrio: string;
  fechaCreacion: string;
  fechaModificacion: string;
  estado: string;
}

@Injectable({
  providedIn: 'root'
})
export class OilService {

  private baseUrl = 'https://bodega.vehicentro.com:1830/api/api/PedidosWeb';
   private baseUrl2 = 'https://bodega.vehicentro.com:1830/api/api/SolicitudesPermiso';

  private apiUrl = `${this.baseUrl}/oil`; // Para crear aceites
  private apiUrlPed = `${this.baseUrl2}`;

  private apiUrl2 = `${this.baseUrl}/filter`; 
  private apiUrl3 = `${this.baseUrl}/insumo`; 
  private apiUrl4 = `${this.baseUrl}/vidrio`;

  private oilRequestUrl = `${this.baseUrl}/oil-pedido-request`; // Para crear solicitudes de aceite
  private filterRequestUrl = `${this.baseUrl}/filter-pedido-request`;
  private insumoRequestUrl = `${this.baseUrl}/insumo-pedido-request`;
  private vidrioRequestUrl = `${this.baseUrl}/vidrio-pedido-request`;
  private allOilsApiUrl = `${this.baseUrl}/all-oils`; // Endpoint para obtener todos los aceites
  private allFiltersApiUrl = `${this.baseUrl}/all-filters`; 
  private allInsumosApiUrl = `${this.baseUrl}/all-insumos`; 
  private allVidriosApiUrl = `${this.baseUrl}/all-vidrios`; 

  private pedidosOilByUserUrl = `${this.baseUrl}/pedidos-oil-by-user`;
  private pedidosFilterByUserUrl = `${this.baseUrl}/pedidos-filter-by-user`;
  private pedidosInsumoByUserUrl = `${this.baseUrl}/pedidos-insumo-by-user`;
  private pedidosVidrioByUserUrl = `${this.baseUrl}/pedidos-vidrios-by-user`;
  private pedidoItemsByIdUrl = `${this.baseUrl}/pedido-items`; // New endpoint for getting detailed items of a specific pedido
  private pedidosOilAllUrl = `${this.baseUrl}/pedidos-oil-all`;
  private pedidosOilAllUrlA = `${this.baseUrl}/pedidos-oil-all-asignado`;
  private pedidosOilAllUrlP = `${this.baseUrl}/pedidos-oil-all-proceso`; 
  private pedidosOilAllUrlE = `${this.baseUrl}/pedidos-oil-all-enviado`; 
  private pedidosFilterAllUrl = `${this.baseUrl}/pedidos-filter-all`;
  private pedidosFilterAllUrlA = `${this.baseUrl}/pedidos-filter-all-asignado`;
  private pedidosFilterAllUrlP = `${this.baseUrl}/pedidos-filter-all-proceso`;
  private pedidosFilterAllUrlE = `${this.baseUrl}/pedidos-filter-all-enviado`;
  private pedidosInsumosAllUrl = `${this.baseUrl}/pedidos-insumos-all`;
  private pedidosInsumosAllUrlA = `${this.baseUrl}/pedidos-insumos-all-asignado`;
  private pedidosInsumosAllUrlP = `${this.baseUrl}/pedidos-insumos-all-proceso`;
  private pedidosInsumosAllUrlE = `${this.baseUrl}/pedidos-insumos-all-enviado`;

    private pedidosVidriosAllUrl = `${this.baseUrl}/pedidos-vidrios-all`;
  private pedidosVidriosAllUrlA = `${this.baseUrl}/pedidos-vidrios-all-asignado`;
  private pedidosVidriosAllUrlP = `${this.baseUrl}/pedidos-vidrios-all-proceso`;
  private pedidosVidriosAllUrlE = `${this.baseUrl}/pedidos-vidrios-all-enviado`;

  private pedidosOilAllUrlProA = `${this.baseUrl}/pedidos-oil-all-asignadoPro1`; 
  private pedidosFilterAllUrlProA = `${this.baseUrl}/pedidos-filter-all-asignadoPro1`; 
  private pedidosInsumoAllUrlProA = `${this.baseUrl}/pedidos-insumos-all-asignadoPro1`; 
  private pedidosVidrioAllUrlProA = `${this.baseUrl}/pedidos-vidrios-all-asignadoPro1`; 
  apiUrlOr = 'https://bodega.vehicentro.com:1830/api/api/InventarioOracle/stock-repuestos'; 




  constructor(private http: HttpClient) { }

  // Método para crear un aceite nuevo
  createOil(oilData: Oil): Observable<any> {
    return this.http.post(this.apiUrl, oilData);
  }

  createFilter(oilFilter: Filter): Observable<any> {
    return this.http.post(this.apiUrl2, oilFilter);
  }

  createInsumo(oilInsumo: Insumo): Observable<any> {
    return this.http.post(this.apiUrl3, oilInsumo);
  }
   createVidrio(oilVidrio: Vidrio): Observable<any> {
    return this.http.post(this.apiUrl4, oilVidrio);
  }

getAllStockRepuestos(): Observable<StockRepuesto[]> {
    return this.http.get<StockRepuestosApiResponse>(this.apiUrlOr).pipe(
      map(response => response.data)
    );
  }

  getStockRepuestos(filters?: StockRepuestosFilters): Observable<StockRepuesto[]> {
    let params = new HttpParams();

    if (filters?.oficina) {
      params = params.set('oficina', filters.oficina);
    }

    if (filters?.grupo) {
      params = params.set('grupo', filters.grupo);
    }

    return this.http.get<StockRepuestosApiResponse>(this.apiUrlOr, { params }).pipe(
      map(response => response.data)
    );
  }

// Agregar estos métodos a tu OilService existente

/**
 * Obtiene las solicitudes de permiso de un usuario
 */
getSolicitudesPermisoUsuario(idUsuario: number): Observable<any[]> {
  return this.http.get<any[]>(
    `${this.apiUrlPed}/usuario/${idUsuario}`
  );
}

/**
 * Obtiene todas las solicitudes de permiso (para administradores)
 */
getAllSolicitudesPermiso(): Observable<any[]> {
  return this.http.get<any[]>(
    `${this.apiUrlPed}`
  );
}

/**
 * Crea una nueva solicitud de permiso
 */
crearSolicitudPermiso(solicitud: any): Observable<any> {
  return this.http.post<any>(
    `${this.apiUrlPed}`,
    solicitud
  );
}

/**
 * Aprueba una solicitud de permiso
 */
aprobarSolicitudPermiso(
  idSolicitud: number, 
  idAprobador: number, 
  observaciones?: string
): Observable<any> {
  return this.http.put<any>(
    `${this.apiUrlPed}/${idSolicitud}/aprobar`,
    {
      idUsuarioAprobador: idAprobador,
      observaciones: observaciones
    }
  );
}

/**
 * Rechaza una solicitud de permiso
 */
rechazarSolicitudPermiso(
  idSolicitud: number, 
  idAprobador: number, 
  observaciones: string
): Observable<any> {
  return this.http.put<any>(
    `${this.apiUrlPed}/solicitudes-permiso/${idSolicitud}/rechazar`,
    {
      idUsuarioAprobador: idAprobador,
      observaciones: observaciones
    }
  );
}

/**
 * Obtiene el estado de bloqueo de un artículo
 */
verificarBloqueoArticulo(codigoArticulo: string): Observable<{
  bloqueado: boolean;
  motivo?: string;
  solicitudPendiente?: boolean;
  solicitudAprobada?: boolean;
}> {
  return this.http.get<any>(
    `${this.apiUrl}/articulos/${codigoArticulo}/bloqueo`
  );
}

  // Método para obtener todos los aceites
  getAllOils(): Observable<OilItem[]> {
    return this.http.get<OilItem[]>(this.allOilsApiUrl);
  }

  getAllFilters(): Observable<FilterItem[]> {
    return this.http.get<FilterItem[]>(this.allFiltersApiUrl);
  }

   getAllInsumos(): Observable<InsumoItem[]> {
    return this.http.get<InsumoItem[]>(this.allInsumosApiUrl);
  }

  /*  getAllVidrios1(): Observable<VidrioItem[]> {
    return this.http.get<VidrioItem[]>(this.allVidriosApiUrl);
  }*/

  getAllVidrios(): Observable<VidrioDto[]> {
  return this.http.get<VidrioDto[]>(`${this.allVidriosApiUrl}`);
}

  // Método para actualizar un aceite
  updateOil(id: number, oilData: Oil): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, oilData);
  }

  // Método para eliminar un aceite
  deleteOil(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // Método corregido para crear una solicitud de aceite
  createOilRequest(oilRequestData: { idOil: number; cantidad: number; idusuario: number; }): Observable<any> {
    // Usar la URL correcta para las solicitudes de aceite
    return this.http.post(this.oilRequestUrl, oilRequestData);
  }

  createFilterRequest(filterRequestData: { idFilter: number; cantidad: number; idusuario: number; }): Observable<any> {
    // Usar la URL correcta para las solicitudes de aceite
    return this.http.post(this.filterRequestUrl, filterRequestData);
  }

  createInsumoRequest(insumoRequestData: { idInsumo: number; cantidad: number; idusuario: number; }): Observable<any> {
    // Usar la URL correcta para las solicitudes de aceite
    return this.http.post(this.insumoRequestUrl, insumoRequestData);
  }

  createVidrioRequest(vidrioRequestData: { idVidrio: number; cantidad: number; idusuario: number; }): Observable<any> {
    // Usar la URL correcta para las solicitudes de aceite
    return this.http.post(this.vidrioRequestUrl, vidrioRequestData);
  }

  updateRequestStatus(
  tipo: 'lubricantes' | 'filtros' | 'insumos' | 'vidrios',
  id: number,
  estado: string
): Observable<any> {
  switch (tipo) {
    case 'lubricantes':
      return this.updateOilRequestStatus(id, estado);
    case 'filtros':
      return this.updateFilterRequestStatus(id, estado);
    case 'insumos':
      return this.updateInsumoRequestStatus(id, estado);
    case 'vidrios':
      return this.updateVidrioRequestStatus(id, estado);
    default:
      // Si el tipo no es reconocido, no hace nada, retorna un observable vacío
      return of(null);
  }
}

updateOilRequestStatus(id: number, estado: string): Observable<any> {
  // Construir la URL con el ID del pedido
  const updateUrl = `${this.oilRequestUrl}/${id}`;
  // El backend espera un objeto con la propiedad 'estado'
  const statusData = { estado: estado };
  return this.http.put(updateUrl, statusData);
}

updateFilterRequestStatus(id: number, estado: string): Observable<any> {
  // Construir la URL con el ID del pedido
  const updateUrl = `${this.filterRequestUrl}/${id}`;
  // El backend espera un objeto con la propiedad 'estado'
  const statusData = { estado: estado };
  return this.http.put(updateUrl, statusData);
}

updateInsumoRequestStatus(id: number, estado: string): Observable<any> {
  // Construir la URL con el ID del pedido
  const updateUrl = `${this.insumoRequestUrl}/${id}`;
  // El backend espera un objeto con la propiedad 'estado'
  const statusData = { estado: estado };
  return this.http.put(updateUrl, statusData);
}

updateVidrioRequestStatus(id: number, estado: string): Observable<any> {
  // Construir la URL con el ID del pedido
  const updateUrl = `${this.vidrioRequestUrl}/${id}`;
  // El backend espera un objeto con la propiedad 'estado'
  const statusData = { estado: estado };
  return this.http.put(updateUrl, statusData);
}
 
  getOilPedidosByUserId(idUsuario: number): Observable<PedidoOilDetail[]> {
    return this.http.get<PedidoOilDetail[]>(`${this.pedidosOilByUserUrl}/${idUsuario}`);
  }

  getAllOilPedidos(): Observable<PedidoOilDetail[]> {
    return this.http.get<PedidoOilDetail[]>(this.pedidosOilAllUrl);
  }

  getAllOilPedidosA(): Observable<PedidoOilDetail[]> {
    return this.http.get<PedidoOilDetail[]>(this.pedidosOilAllUrlA);
  }

  getAllOilPedidosP(): Observable<PedidoOilDetail[]> {
    return this.http.get<PedidoOilDetail[]>(this.pedidosOilAllUrlP);
  }

   getAllOilPedidosEn(): Observable<PedidoOilDetail[]> {
    return this.http.get<PedidoOilDetail[]>(this.pedidosOilAllUrlE);
  }

  getAllFilterPedidos(marca?: string): Observable<PedidoFilterDetail[]> {
  let params = new HttpParams();

  if (marca && marca.trim() !== '') {
    params = params.set('marca', marca.trim());
  }

  return this.http.get<PedidoFilterDetail[]>(this.pedidosFilterAllUrl, { params });
}


 getAllFilterPedidosA(marca?: string): Observable<PedidoFilterDetail[]> {
  let params = new HttpParams();
  if (marca && marca.trim() !== '') {
    params = params.set('marca', marca.trim());
  }
  return this.http.get<PedidoFilterDetail[]>(this.pedidosFilterAllUrlA, { params });
}

getAllFilterPedidosP(marca?: string): Observable<PedidoFilterDetail[]> {
  let params = new HttpParams();
  if (marca && marca.trim() !== '') {
    params = params.set('marca', marca.trim());
  }
  return this.http.get<PedidoFilterDetail[]>(this.pedidosFilterAllUrlP, { params });
}

getAllFilterPedidosEn(marca?: string): Observable<PedidoFilterDetail[]> {
  let params = new HttpParams();
  if (marca && marca.trim() !== '') {
    params = params.set('marca', marca.trim());
  }
  return this.http.get<PedidoFilterDetail[]>(this.pedidosFilterAllUrlE, { params });
}
  getAllInsumoPedidos(): Observable<PedidoInsumoDetail[]> {
    return this.http.get<PedidoInsumoDetail[]>(this.pedidosInsumosAllUrl);
  }
  getAllInsumoPedidosA(): Observable<PedidoInsumoDetail[]> {
    return this.http.get<PedidoInsumoDetail[]>(this.pedidosInsumosAllUrlA);
  }
  getAllInsumoPedidosP(): Observable<PedidoInsumoDetail[]> {
    return this.http.get<PedidoInsumoDetail[]>(this.pedidosInsumosAllUrlP);
  }
  getAllInsumoPedidosEn(): Observable<PedidoInsumoDetail[]> {
    return this.http.get<PedidoInsumoDetail[]>(this.pedidosInsumosAllUrlE);
  }
  getAllVidrioPedidos(): Observable<PedidoVidrioDetail[]> {
    return this.http.get<PedidoVidrioDetail[]>(this.pedidosVidriosAllUrl);
  }
  getAllVidrioPedidosA(): Observable<PedidoVidrioDetail[]> {
    return this.http.get<PedidoVidrioDetail[]>(this.pedidosVidriosAllUrlA);
  }
  getAllVidrioPedidosP(): Observable<PedidoVidrioDetail[]> {
    return this.http.get<PedidoVidrioDetail[]>(this.pedidosVidriosAllUrlP);
  }
  getAllVidrioPedidosEn(): Observable<PedidoVidrioDetail[]> {
    return this.http.get<PedidoVidrioDetail[]>(this.pedidosVidriosAllUrlE);
  }
   getFilterPedidosByUserId(idUsuario: number): Observable<PedidoFilterDetail[]> {
    return this.http.get<PedidoFilterDetail[]>(`${this.pedidosFilterByUserUrl}/${idUsuario}`);
  }
   
   getInsumoPedidosByUserId(idUsuario: number): Observable<PedidoInsumoDetail[]> {
    return this.http.get<PedidoInsumoDetail[]>(`${this.pedidosInsumoByUserUrl}/${idUsuario}`);
  }

  getVidriosPedidosByUserId(idUsuario: number): Observable<PedidoVidrioDetail[]> {
    return this.http.get<PedidoVidrioDetail[]>(`${this.pedidosVidrioByUserUrl}/${idUsuario}`);
  }

 getAllOilPedidosProA(): Observable<PedidoOilDetail[]> {
    return this.http.get<PedidoOilDetail[]>(this.pedidosOilAllUrlProA);
  }
  getAllOilPedidosProAComplete(nombreProveedor?: string): Observable<any> {
  let params = new HttpParams();
  if (nombreProveedor && nombreProveedor.trim() !== '') {
    params = params.set('nombreProveedor', nombreProveedor);
  }
  return this.http.get<any>(this.pedidosOilAllUrlProA, { params });
}
 getAllFilterPedidosProAComplete(nombreProveedor?: string): Observable<any> {
  let params = new HttpParams();
  if (nombreProveedor && nombreProveedor.trim() !== '') {
    params = params.set('nombreProveedor', nombreProveedor);
  }
  return this.http.get<any>(this.pedidosFilterAllUrlProA, { params });
}
 getAllInsumoPedidosProAComplete(nombreProveedor?: string): Observable<any> {
  let params = new HttpParams();
  if (nombreProveedor && nombreProveedor.trim() !== '') {
    params = params.set('nombreProveedor', nombreProveedor);
  }
  return this.http.get<any>(this.pedidosInsumoAllUrlProA, { params });
}
getAllVidrioPedidosProAComplete(nombreProveedor?: string): Observable<any> {
  let params = new HttpParams();
  if (nombreProveedor && nombreProveedor.trim() !== '') {
    params = params.set('nombreProveedor', nombreProveedor);
  }
  return this.http.get<any>(this.pedidosVidrioAllUrlProA, { params });
}
getAgenciaByIdusimport(idusimport: number): Observable<any> {
  const url = `${this.baseUrl}/agencia/user=${idusimport}`;
  return this.http.get<any>(url);
}

// Función para obtener usuario completo por idusimport
getUsuarioCompletoByIdusimport(idusimport: number): Observable<any> {
  const url = `${this.baseUrl}/usuario-completo/user=${idusimport}`;
  return this.http.get<any>(url);
}
}