import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';

// Modelo Cotizacion actualizado que coincide con el backend
export interface Cotizacion {
  cotizacionId?: number;
  proveedorId: number;
  fechaSolicitud: string;
  fechaRespuesta?: string | null;
  estadoCotizacion: string;
  referenciaSolicitud?: string;
  referenciaProveedor?: string;
  observacionesSolicitud?: string;
  observacionesRespuesta?: string;
  codigoCot: string;
  Cotigeneral:string;
  usuario:number;
}

export interface EstadisticasEconomicas {
  totalMontoSolicitado: number;
  totalMontoFacturado: number;
  diferenciaPendiente: number;
  porcentajeCumplimientoEconomico: number;
}
 
export interface EstadisticasCantidades {
  totalSolicitado: number;
  totalFacturado: number;
  porcentajeCumplimiento: number;
  itemsPendientes: number;
  itemsCompletos: number;
  itemsSobrefacturados: number;
}

// Actualización del modelo OrdenDetalle en cotizacion.service.ts
export interface OrdenDetalle {
   detalleId?:            number;
  ordenId: number;
  ordenInvoicen: string;
  codigo: string;
  nuevoCodigo: string;
  descripcion: string;
  // Cantidades
  cantidadSolicitada: number;
  cantidadFacturada: number;
   totalCantidad: number;
  // Económicos orden de compra
  precioUnitarioOrden: number;
  subtotalOrden: number;
  impuestoOrden: number;
  totalOrden: number;
  // Económicos invoice
  precioUnitarioInvoice: number;
  totalFacturado: number;
  // Diferencia económica por línea
  diferenciaEconomica: number;
  // Auxiliares
  codigoVhcr: string;
  invoicesAsociadas: string;
  origenDatos: string;
  
   codigoValidado: boolean;
  codeNewValidado: boolean;
  codigoVhcrValidado: boolean;
  esDuplicadoConsolidado: boolean;
  tieneEquivalenteDuplicado: boolean;
}

export interface OrdenDetalleResponse {
  success: boolean;
  resumen: {
    ordenId: number;
    totalItems: number;
    itemsConInvoice: number;   // antes: itemsAmbos
    itemsSinInvoice: number;   // antes: itemsOrdenCompra
    estadisticasCantidades: EstadisticasCantidades;
    estadisticasEconomicas: EstadisticasEconomicas;
    invoicesAsociadas: string[];
    codigosRepetidos: {
      codigo: string;
      veces: number;
      totalSolicitado: number;
      totalFacturado: number;
      totalMontoSolicitado: number;
      totalMontoFacturado: number;
    }[];
  };
  detalles: OrdenDetalle[];
}

export interface CotiGeneral {
  cotiGeneralId?: number;
  fechaCreacion: Date;
  validoHasta?: Date;
  estadoGeneral: string;
  observaciones?: string;
  clienteId: number;
}

export interface DetalleCotizacion {
  detalleCotizacionId?: number;
  cotizacionId: number;
  productoId?: number;
  codigo?: string;
  nuevocodigo?: string;
  proveedor?: string;
  descripcion?: string;
  chinese?: string;
  cantidad: number;
  unidad?: string;
  precio: number;
  cantidadProveedor?: number;
  cantidadAprobada?: number;
}

// ─── NUEVO: interface para items adicionales cargados desde Excel ────────────
export interface ItemAdicionalExcel {
  codigoProducto: string;
  descripcion: string;
  proveedor: string;
  cantidadRequerida: number;
  cantidadOfertada: number;
  precioUnitario: number;
  unidad?: string;
  observaciones?: string;
  cotigeneral?: string;
}

// ─── Interfaces para los nuevos endpoints ────────────────────────────────────

export interface CrearOrdenCompletaDto {
  invoiceN: string;
  proveedorId: number;
  idUsuario: number;
}

export interface CrearOrdenCompletaResponse {
  mensaje: string;
  cotizacionId: number;
  ordenId: number;
  invoiceN: string;
  proveedorId: number;
}

export interface DetalleOrdenDto {
  productoId?: number;
  codigo?: string;
  descripcion?: string;
  chino?: string;
  cantidad: number;
  precioUnitario: number;
  equivalentCode?: string;
  codigoVhcr?: string;       // ← nuevo
}

export interface OracleMatchDetalle {
  codigo?: string;
  equivalent_code?: string;
  codigovhcr_input?: string;
  codigovhcr?: string;
  encontrado: boolean;
  campo_match?: string;
  valor_match?: string;
  codigo_validado?: boolean;       // ← nuevo: CODIGO existe en VW_MAESTRO_PARTES
  code_new_validado?: boolean;     // ← nuevo: EQUIVALENT_CODE existe en VW_MAESTRO_PARTES
  codigovhcr_validado?: boolean;   // ← nuevo: CODIGOVHCR existe en VW_MAESTRO_PARTES
}

// ─── NUEVO: alertas de consolidación y duplicados que devuelve el backend ────
export interface CodigoConsolidado {
  codigo?: string;
  cantidad_total: number;
  precio_promedio_ponderado: number;
  filas_originales?: number;
}

export interface EquivalenteDuplicado {
  codigo?: string;
  equivalent_code?: string;
  codigovhcr?: string;
}

export interface DuplicadoAnomalo {
  codigo?: string;
  detalle_id?: number | null;
  mensaje: string;
}

export interface AlertasImportacion {
  codigos_consolidados: {
    total: number;
    detalles: CodigoConsolidado[];
  };
  equivalentes_duplicados: {
    total: number;
    detalles: EquivalenteDuplicado[];
  };
  duplicados_anomalos: {
    total: number;
    detalles: DuplicadoAnomalo[];
  };
}

export interface AgregarDetallesResponse {
  mensaje: string;
  ordenId: number;
  cotizacionId: number;
  oracle_matches?: {
    total: number;
    encontrados: number;
    no_encontrados: number;
    detalles: OracleMatchDetalle[];
  };
  alertas?: AlertasImportacion;   // ← nuevo
}

// ─── Respuesta de eliminar cotización ────────────────────────────────────────
export interface EliminarCotizacionResponse {
  mensaje: string;
  cotizacionId: number;
  codigoCot: string;
  detallesEliminados: number;
}

// ─── Respuesta de cambiar estado de cotización ────────────────────────────────
export interface CambiarEstadoCotizacionResponse {
  cotizacionId: number;
  codigoCot: string;
  estadoAnterior: string;
  estadoNuevo: string;
  mensaje: string;
}

// ─── Dar de baja items/cantidades ────────────────────────────────────────────
export interface BajaItemRequest {
  detalleId: number;
  cantidadBaja: number;
  fobUnitario?: number;   // opcional: si no viene, el backend usa precio_unitario
  motivo?: string;
  idUsuario: number;
}

export interface BajaResultado {
  bajaId: number;
  detalleId: number;
  cantidadBaja: number;
  cantidadRestante: number;
  valorFobBaja: number;
  eliminado: boolean;
}

export interface DarDeBajaResponse {
  ok: boolean;
  bajas: BajaResultado[];
}

export interface BajaHistorial {
  bajaId: number;
  detalleId?: number | null;
  ordenId: number;
  invoicen: string;
  idProveedor?: number | null;
  proveedor: string;
  idCotizacion?: number | null;
  productoId?: number | null;
  codigo: string;
  equivalentCode: string;
  codigoVhcr: string;
  descripcion: string;
  chino: string;
  cantidadAnterior: number;
  cantidadBaja: number;
  cantidadRestante: number;
  precioUnitario: number;
  fobUnitario: number;
  valorFobBaja: number;
  subtotalBaja: number;
  motivo: string;
  idUsuario?: number | null;
  usuario: string;
  fechaBaja: string;
}
 
export interface RevertirBajaResponse {
  ok: boolean;
  bajaId: number;
  ordenId: number;
  detalleId: number;
  cantidadRevertida: number;
  recreado: boolean;
  mensaje: string;
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class CotizacionService {
  private apiUrl = `https://bodega.vehicentro.com:1830/api/api/Cotizacion`;
  private apiUrl2 = `https://bodega.vehicentro.com:1830/api/api/CotPro`;

  private apiUrl3 = `https://bodega.vehicentro.com:1830/api/api/Invoice`;
  private historicalDemandUrl = `https://bodega.vehicentro.com:1830/api/api/Paqtana/historical-demand/oracle-pivot`;
private masterInventoryUrl = `https://bodega.vehicentro.com:1830/api/api/Paqtana/master-inventory/send-by-workspace`;
  constructor(private http: HttpClient) { }

// ─── Crear cotización + orden de compra en un solo paso ──────────────────────
  crearOrdenCompleta(dto: CrearOrdenCompletaDto): Observable<CrearOrdenCompletaResponse> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<CrearOrdenCompletaResponse>(
      `${this.apiUrl3}/crear-completa`, dto, { headers }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // ─── Subir detalles masivos a una orden existente ────────────────────────────
  agregarDetallesOrden(ordenId: number, detalles: DetalleOrdenDto[]): Observable<AgregarDetallesResponse> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<AgregarDetallesResponse>(
      `${this.apiUrl3}/${ordenId}/detalles`, detalles, { headers }
    ).pipe(
      timeout(120000),
      catchError((error: HttpErrorResponse) => {
        console.error('Error al agregar detalles de orden:', error);
        const errorMsg = error.error?.message || error.error || error.message || 'Error al procesar los detalles.';
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  // PUT: actualizar invoice/estado/cotizacion completo
updateOrdenCompra(id: number, data: { invoiceN?: string; idCotizacion?: number; estado?: string }): Observable<any> {
  const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
  return this.http.put<any>(
    `${this.apiUrl3}/${id}`, data, { headers }
  ).pipe(catchError(this.handleError));
}

// PATCH: cambiar solo el estado de la orden
cambiarEstadoOrden(id: number, estado: string): Observable<any> {
  const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
  return this.http.patch<any>(
    `${this.apiUrl3}/${id}/estado`, { estado }, { headers }
  ).pipe(catchError(this.handleError));
}

// ─── Dar de baja items/cantidades de una orden ───────────────────────────────
// POST /api/Invoice/dar-de-baja
darDeBaja(items: BajaItemRequest[]): Observable<DarDeBajaResponse> {
  const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
  return this.http.post<DarDeBajaResponse>(
    `${this.apiUrl3}/dar-de-baja`, items, { headers }
  ).pipe(
    timeout(60000),
    catchError((error: HttpErrorResponse) => {
      console.error('Error al dar de baja items:', error);
      const errorMsg = error.error?.message || error.error || error.message
                       || 'Error al dar de baja los items.';
      return throwError(() => new Error(errorMsg));
    })
  );
}

getBajasPorUsuario(idUsuario: number): Observable<BajaHistorial[]> {
  return this.http.get<BajaHistorial[]>(`${this.apiUrl3}/bajas/usuario/${idUsuario}`)
    .pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error al obtener histórico de bajas:', error);
        const errorMsg = error.error?.message || error.error || error.message
                         || 'Error al obtener el histórico de bajas.';
        return throwError(() => new Error(errorMsg));
      })
    );
}
 
// GET todas las bajas (admin)
getTodasLasBajas(): Observable<BajaHistorial[]> {
  return this.http.get<BajaHistorial[]>(`${this.apiUrl3}/bajas`)
    .pipe(catchError(this.handleError));
}
 
// POST revertir una baja
revertirBaja(bajaId: number): Observable<RevertirBajaResponse> {
  const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
  return this.http.post<RevertirBajaResponse>(
    `${this.apiUrl3}/bajas/${bajaId}/revertir`, {}, { headers }
  ).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error('Error al revertir baja:', error);
      const errorMsg = error.error?.message || error.error || error.message
                       || 'Error al revertir la baja.';
      return throwError(() => new Error(errorMsg));
    })
  );
}
 

  getCotizacionesSinDetalles(): Observable<Cotizacion[]> {
    return this.http.get<any[]>(`${this.apiUrl}/sindetalles`);
  }

  importCotizacionItems2(cotizacionId: number, items: any[]): Observable<any> {
    const payload = items.map(item => ({
      code:              item.code,
      qty:               item.qty,
      cantidadProveedor: item.clientQty ?? 0,
      price:             item.price,
      equivalent_code:   item.equivalent_code ?? '',
      observations:      item.observations ?? '',
      chinese:           item.chinese ?? '',
      description:       item.description ?? '',
      cotizacionId:      cotizacionId
    }));
    return this.http.post(`${this.apiUrl}/${cotizacionId}/items`, payload);
  }

  // Obtener todas las cotizaciones
  getCotizaciones(): Observable<any> {
    return this.http.get<any>(this.apiUrl)
      .pipe(
        catchError(this.handleError)
      );
  }

  getInvoice2(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl3)
      .pipe(
        catchError(this.handleError)
      );
  }

getHistoricalDemand(batchSize: number = 20000, logPayload: boolean = false, includePayloadInResponse: boolean = false): Observable<any> {
  const params = new HttpParams()
    .set('batchSize', batchSize.toString())
    .set('logPayload', logPayload.toString())
    .set('includePayloadInResponse', includePayloadInResponse.toString());

  return this.http.post<any>(this.historicalDemandUrl, null, { params })
    .pipe(
      catchError(this.handleError)
    );
}

sendMasterInventoryByWorkspace(cleanNegatives: boolean = true): Observable<any> {
  const params = new HttpParams()
    .set('cleanNegatives', cleanNegatives.toString());

  return this.http.post<any>(this.masterInventoryUrl, null, { params })
    .pipe(
      catchError(this.handleError)
    );
}


  getInvoice(id:any): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl3}/user/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  getInvoiceAd(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl3}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  getInvoice1(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl3)
      .pipe(
        catchError(this.handleError)
      );
  }

  createInvoice(pedidoData:any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<any>(`${this.apiUrl3}`, pedidoData, { headers })
      .pipe(
        map(response => {
          return response;
        }),
        catchError(error => {
          console.error('Error al crear invoice:', error);
          
          // Si el servidor devuelve un mensaje de error específico
          if (error.error && typeof error.error === 'object') {
            return throwError(() => error);
          }
          
          // Error genérico o de red
          return throwError(() => ({
            error: 'Error al procesar el invoice. Verifique la conexión o inténtelo más tarde.'
          }));
        })
      );
  }

  // Eliminar múltiples detalles por lista de IDs
eliminarDetallesBulk(detalleIds: number[]): Observable<any> {
  return this.http.request('DELETE', `${this.apiUrl}/detalles/bulk`, {
    body: detalleIds,
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  }).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error('Error al eliminar detalles en bulk:', error);
      const errorMsg = error.error?.message || error.error || error.message
                       || 'Error al eliminar los detalles.';
      return throwError(() => new Error(errorMsg));
    })
  );
}

// Eliminar un detalle de cotización por su ID
eliminarDetalleCotizacion(detalleId: number): Observable<any> {
  return this.http.delete(`${this.apiUrl}/detalle/${detalleId}`)
    .pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error al eliminar detalle:', error);
        const errorMsg = error.error?.message || error.error || error.message
                         || 'Error al eliminar el detalle.';
        return throwError(() => new Error(errorMsg));
      })
    );
}

  getDetallesByCotiGeneral(cotiGeneralCodigo: string): Observable<DetalleCotizacion[]> {
    return this.http.get<DetalleCotizacion[]>(`${this.apiUrl}/detalles-por-generalall/${cotiGeneralCodigo}`);
  }

  asignarProveedores(cotigeneral: string, asignaciones: any[]): Observable<any> {
    const body = { cotigeneral, asignaciones };
    return this.http.post(`${this.apiUrl2}/asignar-proveedor`, body);
  }

  rechazarCotizacionesProveedor(cotizacionIds: number[]): Observable<any> {
    return this.http.patch(`${this.apiUrl}/cotizaciones/rechazar`, { cotizacionIds });
  }

  // ─── NUEVO: Guardar items adicionales cargados desde Excel en la BD ──────────
  /**
   * Envía al backend los items nuevos que el usuario cargó desde la hoja
   * "ItemsAdicionales" del Excel y que no existían en la cotización original.
   *
   * POST /api/Cotizacion/items-adicionales
   * Body: ItemAdicionalExcel[]  (cada item trae el campo cotigeneral)
   */
  guardarItemsAdicionales(items: ItemAdicionalExcel[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/items-adicionales`, items)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error al guardar items adicionales:', error);
          const errorMsg = error.error?.message || error.error || error.message
                           || 'Error al guardar los items adicionales.';
          return throwError(() => new Error(errorMsg));
        })
      );
  }

    agregarItemsADetalleCotizacion(items: {
    cotizacionId: number;
    codigo: string;
    descripcion: string;
    cantidad: number;
    unidad: string;
    precio: number;
    observaciones: string;
  }[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/agregar-item-adicional`, items);
  }
  // ─────────────────────────────────────────────────────────────────────────────

  // Obtener una cotización por ID
  getCotizacionById(id: number): Observable<Cotizacion> {
    return this.http.get<Cotizacion>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  //Cotizacion/usuario/
  getCotizacionByUser(id: number): Observable<Cotizacion> {
    return this.http.get<Cotizacion>(`${this.apiUrl}/usuario/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  getCotizacionByUserAsig(id: number): Observable<Cotizacion> {
    return this.http.get<Cotizacion>(`${this.apiUrl}/asigusuario/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  //usuarioproasig
  getCotizacionByUserAsigPro(id: number): Observable<Cotizacion> {
    return this.http.get<Cotizacion>(`${this.apiUrl}/usuarioproasig/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  getCotizacionProByUser(id: number): Observable<Cotizacion> {
    return this.http.get<Cotizacion>(`${this.apiUrl2}/usuario/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  getOrdenDetalle(ordenId: number): Observable<OrdenDetalleResponse> {
    return this.http.get<OrdenDetalleResponse>(`${this.apiUrl2}/orden-detalle-union/${ordenId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Obtener detalles de una orden (versión alternativa con COALESCE)
   * @param ordenId ID de la orden
   * @returns Observable con los detalles de la orden
   */
  getOrdenDetalleCoalesce(ordenId: number): Observable<OrdenDetalleResponse> {
    return this.http.get<OrdenDetalleResponse>(`${this.apiUrl2}/orden-detalle/${ordenId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  getOrdenDetalleCo(): Observable<OrdenDetalleResponse> {
    return this.http.get<OrdenDetalleResponse>(`${this.apiUrl2}/orden-faltantes`)
      .pipe(
        catchError(this.handleError)
      );
  }

  updateItemPriceAndQtyProveedor(detalleCotizacionId: number, precio: number, cantidadProveedor: number): Observable<any> {
    return this.http.put(`${this.apiUrl2}/update-price-qty-proveedor`, {
      detalleCotizacionId,
      precio,
      cantidadProveedor
    });
  }

updateItemsBulk(items: any[]): Observable<any> {
  const payload = items.map(item => ({
    detalleCotizacionId: item.id ?? item.detalleCotizacionId,
    precio: item.price,
    cantidadProveedor: item.qty,
    equivalent_Code: item.equivalent_code  // ← agregar esto
  }));
  return this.http.put(`${this.apiUrl2}/update-price-qty-proveedor-bulk`, payload);
}

  // Método para actualizar ítems de cotización
  updateCotizacionItems1(cotizacionId: number, items: any[]): Observable<any> {
    return this.http.put(`${this.apiUrl2}/update-items/${cotizacionId}`, items);
  }

  // Método para eliminar un ítem de cotización
  deleteCotizacionItem(cotizacionId: number, itemId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl2}/delete-item/${cotizacionId}/${itemId}`);
  }

  // Método para importar ítems desde Excel
  importCotizacionItems(cotizacionId: number, items: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl2}/import-items/${cotizacionId}`, items);
  }

  getCotizacionByUserAp(id: number): Observable<Cotizacion> {
    return this.http.get<Cotizacion>(`${this.apiUrl}/usuarioap/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  getCotizacionByUserPro(id: number): Observable<Cotizacion> {
    return this.http.get<Cotizacion>(`${this.apiUrl}/usuariopro/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  getCotizacionByUserRe(id: number): Observable<Cotizacion> {
    return this.http.get<Cotizacion>(`${this.apiUrl}/usuariore/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  //Cotizacion/detalles/
  getCotizacionDetail(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/detalles/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  getInvoiceDetail(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl3}/detalles/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  getCotizacionDetailPro(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  getCotizacionDetailProNew(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details1/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  updateCotizacionItems(codigoCot: number, items: any[]): Observable<any> {
    return this.http.put(`${this.apiUrl}/cotizaciones/actualizar/${codigoCot}`, {
      items: items
    });
  }

  // Crear nueva cotización
  createCotizacion(cotizacion: Cotizacion): Observable<Cotizacion> {
    const backendCotizacion = {
      CotizacionId: cotizacion.cotizacionId,
      ProveedorId: cotizacion.proveedorId,
      FechaSolicitud: cotizacion.fechaSolicitud,
      FechaRespuesta: cotizacion.fechaRespuesta,
      EstadoCotizacion: cotizacion.estadoCotizacion,
      ReferenciaSolicitud: cotizacion.referenciaSolicitud || null,
      ReferenciaProveedor: cotizacion.referenciaProveedor || null,
      ObservacionesSolicitud: cotizacion.observacionesSolicitud || null,
      ObservacionesRespuesta: cotizacion.observacionesRespuesta || null,
      CodigoCot: cotizacion.codigoCot,      
      Usuario: cotizacion.usuario,
      Cotigeneral: cotizacion.Cotigeneral,
    };

    return this.http.post<Cotizacion>(this.apiUrl, backendCotizacion)
      .pipe(
        catchError(this.handleError)
      );
  }

  createCotizacion1(cotizacion: Cotizacion): Observable<Cotizacion> {
    const backendCotizacion = {
      CotizacionId: cotizacion.cotizacionId,
      ProveedorId: cotizacion.proveedorId,
      FechaSolicitud: cotizacion.fechaSolicitud,
      FechaRespuesta: cotizacion.fechaRespuesta,
      EstadoCotizacion: cotizacion.estadoCotizacion,
      ReferenciaSolicitud: cotizacion.referenciaSolicitud || null,
      ReferenciaProveedor: cotizacion.referenciaProveedor || null,
      ObservacionesSolicitud: cotizacion.observacionesSolicitud || null,
      ObservacionesRespuesta: cotizacion.observacionesRespuesta || null,
      // CodigoCot: cotizacion.codigoCot,
      Usuario: cotizacion.usuario,
      Cotigeneral: cotizacion.Cotigeneral,
    };

    return this.http.post<Cotizacion>(this.apiUrl, backendCotizacion)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Actualizar una cotización existente
  updateCotizacion(id: number, cotizacion: Cotizacion): Observable<Cotizacion> {
    const backendCotizacion = {
      CotizacionId: id,
      ProveedorId: cotizacion.proveedorId,
      FechaSolicitud: cotizacion.fechaSolicitud,
      FechaRespuesta: cotizacion.fechaRespuesta,
      EstadoCotizacion: cotizacion.estadoCotizacion,
      ReferenciaSolicitud: cotizacion.referenciaSolicitud || null,
      ReferenciaProveedor: cotizacion.referenciaProveedor || null,
      ObservacionesSolicitud: cotizacion.observacionesSolicitud || null,
      ObservacionesRespuesta: cotizacion.observacionesRespuesta || null,
      CodigoCot: cotizacion.codigoCot
    };
    
    return this.http.put<Cotizacion>(`${this.apiUrl}/${id}`, backendCotizacion)
      .pipe(
        catchError(this.handleError)
      );
  }

  // DELETE: eliminar cotización completa (con sus detalles)
  // Protegido en el backend: no elimina si está Aprobada/liquidada o tiene orden vinculada
  eliminarCotizacion(id: number): Observable<EliminarCotizacionResponse> {
    return this.http.delete<EliminarCotizacionResponse>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error al eliminar cotización:', error);
          const errorMsg = error.error?.message || error.error || error.message
                           || 'Error al eliminar la cotización.';
          return throwError(() => new Error(errorMsg));
        })
      );
  }

  // PATCH: cambiar solo el estado de una cotización
  // Estados válidos: Solicitada | Asignada | Aprobada | Rechazada | En proceso | Cancelada | liquidado
  cambiarEstadoCotizacion(id: number, estado: string): Observable<CambiarEstadoCotizacionResponse> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.patch<CambiarEstadoCotizacionResponse>(
      `${this.apiUrl}/${id}/estado`, { estado }, { headers }
    ).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error al cambiar estado de cotización:', error);
        const errorMsg = error.error?.message || error.error || error.message
                         || 'Error al cambiar el estado.';
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  // Buscar cotizaciones por proveedor
  getCotizacionesByProveedor(proveedorId: number): Observable<Cotizacion[]> {
    return this.http.get<Cotizacion[]>(`${this.apiUrl}/proveedor/${proveedorId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Buscar cotizaciones por estado
  getCotizacionesByEstado(estado: string): Observable<Cotizacion[]> {
    return this.http.get<Cotizacion[]>(`${this.apiUrl}/estado/${estado}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Manejador de errores central
  private handleError(error: HttpErrorResponse) {
    console.error('Error en la API:', error);
    
    let errorMessage = 'Ha ocurrido un error en el servidor.';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      if (error.status === 409) {
        errorMessage = 'Ya existe una cotización con ese código.';
      } else if (error.status === 400 && error.error) {
        errorMessage = error.error;
      } else if (error.status === 500) {
        errorMessage = 'Error interno del servidor.';
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }

  uploadExcel(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/excel`, formData)
      .pipe(
        timeout(60000),
        catchError((error: HttpErrorResponse) => {
          console.error('Error en la carga del archivo Excel:', error);
          if (error.status === 405) {
            return throwError(() => new Error('El servidor no acepta este método en esta ruta. Verifique la configuración del backend.'));
          }
          const errorMsg = error.error?.message || error.message || 'Error al procesar el archivo';
          return throwError(() => new Error(errorMsg));
        })
      );
  }

  uploadExcelMasivo(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/excel-masivo`, formData)
      .pipe(
        timeout(120000),
        catchError((error: HttpErrorResponse) => {
          console.error('Error en la carga masiva del archivo Excel:', error);
          if (error.status === 405) {
            return throwError(() => new Error('El servidor no acepta este método en esta ruta. Verifique que el endpoint sea [HttpPost("excel-masivo")].'));
          }
          const errorMsg = error.error?.message || error.error || error.message || 'Error al procesar el archivo.';
          return throwError(() => new Error(errorMsg));
        })
      );
  }

  //excel-masivo-oracle
  uploadExcelMasivoTra(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/excel-masivo-oracle`, formData)
      .pipe(
        timeout(120000),
        catchError((error: HttpErrorResponse) => {
          console.error('Error en la carga masiva del archivo Excel:', error);
          if (error.status === 405) {
            return throwError(() => new Error('El servidor no acepta este método en esta ruta. Verifique que el endpoint sea [HttpPost("excel-masivo")].'));
          }
          const errorMsg = error.error?.message || error.error || error.message || 'Error al procesar el archivo.';
          return throwError(() => new Error(errorMsg));
        })
      );
  }

}