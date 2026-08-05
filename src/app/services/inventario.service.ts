import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, retry, throwError, timer } from 'rxjs';



export interface RepuestoInventario {
  inventario_repuestos?: string;
  oficina_id?: string;
  oficina?: string;
  bodega_id?: string;
  bodega?: string;
  clase_id?: string;
  clase?: string;
  grupo_id?: string;
  grupo?: string;
  articulo?: string;
  nombre?: string;
  ubicacion?: string;
  linea_comp_id?: string;
  linea_competencia?: string;
  stock?: number;
  stock_reservado?: number;
  stock_disponible?: number;
  fob_numerico?: number;
  costo_uni?: number;
  costo_total?: number;
  costo_promedio?: number;
  precio_sin_iva?: number;
  descuento_maximo?: number;
  ultima_fecha_compra?: string;
  csm_vendidos_ult_mes?: number;
  numero_de_transferencias?: number;
}

export interface RespuestaBodega {
  bodega_id: string;
  total_repuestos: number;
  repuestos: RepuestoInventario[];
}

export interface RespuestaArticulo {
  filtro_articulo: string;
  total_encontrados: number;
  repuestos: RepuestoInventario[];
}

@Injectable({
  providedIn: 'root'
})
export class InventarioService {
  // La URL base de tu API. Asegúrate de que coincida con la configuración de tu backend.
  private baseUrl1 = 'https://bodega.vehicentro.com:1830/api/api/Inventario';
  private baseUrl2 = 'https://bodega.vehicentro.com:1830/api/api/Inventario';
  private baseUrl = 'https://bodega.vehicentro.com:1830/api/api/Inventario/agencia';

  constructor(private http: HttpClient) { }


  getRepuestosByBodega(bodegaId: string): Observable<RespuestaBodega> {
    return this.http.get<RespuestaBodega>(
      `${this.baseUrl1}/bodega/${bodegaId}`
    );
  }
  
  guardarConteoGlobal(datosConteo: any[]): Observable<any> {
  return this.http.post(`${this.baseUrl1}/inventario/guardar-conteo-global`, {
    fecha_conteo: new Date().toISOString(),
    conteos: datosConteo,
    total_repuestos: datosConteo.length
  }).pipe(
    catchError(this.handleError)
  );
}

eliminarConteo(conteoId: number): Observable<any> {
  return this.http.delete<any>(`${this.baseUrl2}/conteo/${conteoId}`);
}

private handleError(error: HttpErrorResponse): Observable<never> {
  let errorMessage = 'Ocurrió un error desconocido';
  
  if (error.error instanceof ErrorEvent) {
    // Error del lado del cliente
    errorMessage = `Error: ${error.error.message}`;
  } else {
    // Error del lado del servidor
    errorMessage = `Código de error: ${error.status}\nMensaje: ${error.message}`;
  }
  
  console.error(errorMessage);
  return throwError(() => new Error(errorMessage));
}


  getAgencias(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}`);
  }

  /**
   * Obtiene una agencia específica por su código.
   * @param codigo El código de la agencia.
   * @returns Un Observable con los datos de la agencia.
   */
  getAgenciaByCodigo(codigo: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${codigo}`);
  }

  /**
   * Crea una nueva agencia.
   * @param agencia Los datos de la nueva agencia.
   * @returns Un Observable con la respuesta de la API.
   */
  createAgencia(agencia: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}`, agencia);
  }

  /**
   * Actualiza una agencia existente.
   * @param codigo El código de la agencia a actualizar.
   * @param agencia Los datos actualizados de la agencia.
   * @returns Un Observable con la respuesta de la API.
   */
  updateAgencia(codigo: string, agencia: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${codigo}`, agencia);
  }

  /**
   * Elimina una agencia por su código.
   * @param codigo El código de la agencia a eliminar.
   * @returns Un Observable con la respuesta de la API.
   */
  deleteAgencia(codigo: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl1}/${codigo}`);
  }
  
  getEquipos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl1}/equipos`);
  }

  /**
   * Obtiene una lista de todos los registros de sincronización.
   * @returns Un Observable con la lista de sincronizaciones.
   */
  getSincronizaciones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl1}/sincronizaciones`);
  }

  /**
   * Registra un nuevo equipo.
   * @param equipoDto El objeto DTO con los datos del nuevo equipo.
   * @returns Un Observable con la respuesta de la API.
   */
  registrarEquipo(equipoDto: EquiposConteoDto): Observable<any> {
    return this.http.post<any>(`${this.baseUrl1}/registrar-equipo`, equipoDto);
  }

  /**
   * Registra un nuevo evento de sincronización.
   * @param sincronizacionDto El objeto DTO con los datos del evento de sincronización.
   * @returns Un Observable con la respuesta de la API.
   */
  registrarSincronizacion(sincronizacionDto: SincronizacionDto): Observable<any> {
    return this.http.post<any>(`${this.baseUrl1}/registrar-sincronizacion`, sincronizacionDto);
  }

  /**
 * Sincroniza el inventario desde Oracle para una agencia específica
 * @param codigoAgencia El código de la agencia a sincronizar
 * @returns Un Observable con el resultado de la sincronización
 */
sincronizarInventarioDesdeOracle(codigoAgencia: string): Observable<any> {
  return this.http.post<any>(
    `${this.baseUrl1}/sincronizar-inventario-oracle/${codigoAgencia}`,
    {}
  ).pipe(
    catchError(this.handleError)
  );
}

obtenerInventarioOracle(codigoAgencia: string): Observable<any> {
  return this.http.get<any>(
    `${this.baseUrl1}/inventario-oracle/${codigoAgencia}`
  ).pipe(
    catchError(this.handleError)
  );
}

  getCampanas(): Observable<CampanaInventarioDto[]> {
    return this.http.get<CampanaInventarioDto[]>(`${this.baseUrl2}/campanas`);
  }

  /**
   * Obtiene una campaña de inventario específica por su ID.
   * @param id El ID de la campaña.
   * @returns Un Observable con los datos de la campaña.
   */
  getCampanaById(id: number): Observable<CampanaInventarioDto> {
    return this.http.get<CampanaInventarioDto>(`${this.baseUrl2}/campanas/${id}`);
  }

  getInventarioReservadoPorOficina(oficinaId: string): Observable<RepuestoReservadoDto[]> {
    // La URL debe coincidir con el endpoint que creamos en C#: "inventario-reservado/{oficinaId}"
    return this.http.get<RepuestoReservadoDto[]>(`${this.baseUrl2}/inventario-reservado1/${oficinaId}`);
}
  /**
   * Crea una nueva campaña de inventario.
   * @param campana Los datos de la nueva campaña.
   * @returns Un Observable con la respuesta de la API.
   */
  createCampana(campana: CampanaInventarioDto): Observable<any> {
    return this.http.post<any>(`${this.baseUrl2}/campanas`, campana);
  }

  /**
   * Actualiza una campaña de inventario existente.
   * @param id El ID de la campaña a actualizar.
   * @param campana Los datos actualizados de la campaña.
   * @returns Un Observable con la respuesta de la API.
   */
  updateCampana(id: number, campana: CampanaInventarioDto): Observable<any> {
    return this.http.put<any>(`${this.baseUrl2}/campanas/${id}`, campana);
  }

  
  deleteCampana(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl2}/campanas/${id}`);
  }

  /**
   * Obtiene la campaña actualmente activa (estado = 'activa').
   * Conecta con GET campanas/activa. Devuelve 404 si no hay ninguna activa.
   */
  getCampanaActiva(): Observable<CampanaActivaDto> {
    return this.http.get<CampanaActivaDto>(`${this.baseUrl2}/campanas/activa`);
  }

  /**
   * Activa una campaña por su ID. El backend desactiva automáticamente
   * cualquier otra campaña que estuviera activa (solo una activa a la vez).
   * Conecta con PUT campanas/{id}/activar.
   */
  activarCampana(id: number): Observable<any> {
    return this.http.put<any>(`${this.baseUrl2}/campanas/${id}/activar`, {});
  }

  /**
   * Cierra (finaliza) una campaña por su ID, cambiando su estado a 'cerrada'.
   * Conecta con PUT campanas/{id}/cerrar.
   * ⚠️ Requiere agregar este endpoint en InventarioController.cs (ver conversación),
   * ya que el backend actual no lo tiene todavía.
   */
  cerrarCampana(id: number): Observable<any> {
    return this.http.put<any>(`${this.baseUrl2}/campanas/${id}/cerrar`, {});
  }

  getConteos(): Observable<ConteoInventarioDto[]> {
    return this.http.get<ConteoInventarioDto[]>(`${this.baseUrl2}/conteos`);
  }

  /**
   * Obtiene los conteos unificados con información del inventario del sistema
   * @returns Un Observable con la lista de conteos unificados con datos de inventario
   */
  getConteosUnificados(): Observable<ConteoUnificadoDto[]> {
    return this.http.get<ConteoUnificadoDto[]>(`${this.baseUrl2}/conteosunif`);
  }

  getConteosUnificadosPorAgencia(agenciaId: number): Observable<ConteoUnificadoDto[]> {
  return this.http.get<ConteoUnificadoDto[]>(`${this.baseUrl2}/conteosunif8`, {
    params: { agenciaId: agenciaId.toString() }
  });
}



getsUnificadosPorAgenciaAll(agenciaId: number, campanaId?: number): Observable<ConteoUnificadoResponse> {
  let params: any = { agenciaId: agenciaId.toString() };
  
  if (campanaId !== undefined && campanaId !== null) {
    params.campanaId = campanaId.toString();
  }
  
  return this.http.get<ConteoUnificadoResponse>(`${this.baseUrl2}/conteosunif8`, { params });
}
 
   getTotalItemsPorAgencia(oficinaId: string): Observable<TotalItemsDto> {
    return this.http.get<TotalItemsDto>(`${this.baseUrl2}/conteos/total/${oficinaId}`);
  }

 getConteosFueraInventario(agenciaId: number): Observable<any[]> {
  return this.http.get<any[]>(`${this.baseUrl2}/conteos-fuera-inventario?agenciaId=${agenciaId}`);
}



  // En tu servicio (inventarioService)
 
createConteo(formData: FormData): Observable<any> {
  return this.http.post(`${this.baseUrl2}/conteo`, formData, {
    observe: 'response',
    responseType: 'text' as 'json'
  }).pipe(
    // ✅ Reintento AUTOMÁTICO de fallos transitorios (red caída, 5xx, timeout, 429).
    //    Seguro porque el FormData incluye clientOpId y el backend es idempotente:
    //    reintentar NUNCA duplica el conteo. Un 4xx (ej. 400 agencia inválida) NO
    //    se reintenta porque nunca va a tener éxito.
    retry({
      count: 3,
      delay: (error: HttpErrorResponse, retryCount: number) => {
        const status = error?.status ?? 0;
        const esTransitorio = status === 0 || status === 408 || status === 429 || status >= 500;
        if (!esTransitorio) {
          return throwError(() => error);
        }
        const espera = Math.min(1000 * Math.pow(2, retryCount - 1), 8000); // 1s, 2s, 4s
        console.warn(`createConteo: reintento ${retryCount} en ${espera}ms (status ${status})`);
        return timer(espera);
      }
    }),
    map((response: any) => {
      return {
        success: true,
        message: response.body,
        status: response.status
      };
    }),
    catchError(error => {
      console.error('Error en createConteo (agotados los reintentos):', error);
      return throwError(() => error);
    })
  );
}


  createReconteo(formData: FormData): Observable<any> {
    // La URL apunta al nuevo endpoint del controlador: /reconteo
    return this.http.post(`${this.baseUrl2}/reconteo`, formData, {
      observe: 'response',
      // Se mantiene responseType: 'text' as 'json' para manejar respuestas JSON/texto del backend sin error de parseo
      responseType: 'text' as 'json'
    }).pipe(
      map(response => {
        // Mapea la respuesta para estandarizar el objeto de éxito
        return {
          success: true,
          message: response.body, // El mensaje de éxito del backend
          status: response.status
        };
      }),
      catchError(error => {
        // Manejo de errores
        console.error('Error en createReconteo:', error);
        // Puedes personalizar el manejo del error aquí antes de relanzarlo
        throw error;
      })
    );
  }
 
  /** ✅ Actualiza un conteo existente (PUT conteo/{id}).
   *  Usado por la edición inline del modal "Detalle de Conteos por Ubicación":
   *  el backend valida en el WHERE que usuario_contador coincida, así solo
   *  el usuario que realizó el conteo puede modificarlo. */
  updateConteo(id: number, conteo: ConteoInventarioDto): Observable<any> {
    return this.http.put<any>(`${this.baseUrl2}/conteo/${id}`, conteo);
  }

  
  deleteConteo(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl2}/conteo/${id}`);
  }

 
  getImagenesByConteoId(conteoId: number): Observable<ImagenesConteoDto[]> {
    return this.http.get<ImagenesConteoDto[]>(`${this.baseUrl2}/conteo/${conteoId}/imagenes`);
  }

   
  deleteImagen(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl2}/imagen/${id}`);
  }

  // ⚠️ NOTA: cerrarInventario(agenciaId) es DISTINTO de cerrarCampana(id).
  // Este método cierra/finaliza el conteo de UNA agencia puntual (ajusta
  // stock en inventario_repuestos según lo contado), no cambia el estado
  // de la campaña completa. Usado por finalizarConteo() en invbodage.component.ts.
  // Requiere el endpoint POST finalizar-conteo/{agenciaId} en el backend
  // (ver InventarioController.cs — aún no implementado, propuesta abajo).
  cerrarInventario(agenciaId: number, campanaId?: number): Observable<FinalizarConteoResponse> {
    let params = new HttpParams();
    if (campanaId !== undefined && campanaId !== null) {
      params = params.set('campanaId', campanaId.toString());
    }
    return this.http.post<FinalizarConteoResponse>(
      `${this.baseUrl2}/finalizar-conteo/${agenciaId}`,
      {},
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

getConteosPorUsuario(agenciaId?: number): Observable<ConteoUsuarioResponse> {
    let params = new HttpParams();
    
    if (agenciaId) {
      params = params.set('agenciaId', agenciaId.toString());
    }

    return this.http.get<ConteoUsuarioResponse>(
      `${this.baseUrl2}/conteos-por-usuario`,
      { params }
    );
  }


getConteosInventario(agenciaId: number, requiereReconteo?: boolean): Observable<any[]> {
    let params = new HttpParams();
    
    params = params.set('agenciaId', agenciaId.toString());
    
    if (requiereReconteo !== undefined && requiereReconteo !== null) {
      params = params.set('requiereReconteo', requiereReconteo.toString());
    }

    return this.http.get<any[]>(
      `${this.baseUrl2}/conteos-inventario`,
      { params }
    );
  }

  getConteosInventario1(agenciaId: number, campanaId: number, requiereReconteo?: boolean): Observable<any[]> {
    let params = new HttpParams();
    
    params = params.set('agenciaId', agenciaId.toString());
    params = params.set('campanaId', campanaId.toString()); // ✅ AGREGADO

    if (requiereReconteo !== undefined && requiereReconteo !== null) {
      params = params.set('requiereReconteo', requiereReconteo.toString());
    }

    return this.http.get<any[]>(
      `${this.baseUrl2}/conteos-inventario`,
      { params }
    );
  }

  getEstadisticasConteosPorAgencia(agenciaId: number): Observable<any> {
    return new Observable(observer => {
      this.getConteosPorUsuario(agenciaId).subscribe({
        next: (response) => {
          const estadisticas = {
            total_usuarios: response.total_usuarios,
            total_items_contados: response.datos.reduce(
              (sum, item) => sum + item.total_items_contados, 
              0
            ),
            cantidad_total: response.datos.reduce(
              (sum, item) => sum + item.cantidad_total_contada, 
              0
            ),
            usuarios: response.datos.map(u => ({
              nombre: u.nombre_usuario || u.usuario_contador,
              items: u.total_items_contados,
              cantidad: u.cantidad_total_contada
            }))
          };
          observer.next(estadisticas);
          observer.complete();
        },
        error: (error) => observer.error(error)
      });
    });
  }

  // En tu servicio de Angular (inventory.service.ts o similar)

getConteosInconsistencias(agenciaId?: number): Observable<ConteosInconsistenciasResponse> {
  // Construir la URL con el query parameter si existe
  const url = agenciaId 
    ? `${this.baseUrl2}/conteos-inconsistencias9?agenciaId=${agenciaId}`
    : `${this.baseUrl2}/conteos-inconsistencias`;
  
  return this.http.get<ConteosInconsistenciasResponse>(url);
}

 getReconteosPendientes(agenciaId?: number): Observable<ReconteosPendientesResponse> {
    // Construir la URL con el query parameter si existe
    const url = agenciaId 
      ? `${this.baseUrl2}/reconteo-pendientes?agenciaId=${agenciaId}`
      : `${this.baseUrl2}/reconteo-pendientes`;
    
    // El método HTTP GET se suscribe al tipo de respuesta que definimos
    return this.http.get<ReconteosPendientesResponse>(url);
  }

}

// interfaces/conteos-inconsistencias.interface.ts

export interface ReconteoPendiente {
  conteo_id_individual: number;
  agencia_id: number;
  nombre_agencia: string;
  codigo_articulo: string;
  nombre_articulo: string | null;
  cantidad_contada_inicial: number;
  requiere_reconteo: boolean;
  motivo_reconteo_actual: string | null;
  fecha_conteo: Date;
  usuario_contador: string | null;
  ubicacion: string | null;
  descripcion: string | null;
  unidad: string | null;
  campana_id: number | null;
  cantidad_reconteo: number | null;
}

// Interfaz para la respuesta completa de la API
export interface ReconteosPendientesResponse {
  agencia_filtrada: number | null;
  total_pendientes: number;
  data: ReconteoPendiente[];
}

export interface ImagenConteo {
  nombre_archivo: string;
  ruta_archivo: string;
  tamano_bytes: number;
  fecha_subida: string;
  conteo_id: number;
}

export interface Inconsistencia {
  // IDENTIFICACIÓN
  agencia_id: number;
  codigo_articulo: string | null;
  nombre_agencia: string | null;
  codigo_agencia: string | null;
  nombre_articulo: string | null;
  descripcion_conteo: string | null;

  // CLASIFICACIÓN
  clasificacion: 'FUERA DE INVENTARIO' | 'FALTANTE' | 'SOBRANTE' | 'ERROR';
  detalle_faltante: 'NO CONTADO - EXISTE EN SISTEMA' | 'CONTADO PARCIAL - FALTA FÍSICAMENTE' | null;
  prioridad_accion: 'CRÍTICA - VERIFICAR' | 'ALTA - GRAN PÉRDIDA' | 'ALTA - GRAN GANANCIA' | 'MEDIA' | 'BAJA' | 'NINGUNA';

  // CANTIDADES
  cantidad_contada: number;
  cantidad_sistema: number;
  stock_reservado: number;
  stock_disponible: number;
  diferencia: number;
  diferencia_absoluta: number;

  // VALORES MONETARIOS
  valor_contado: number;
  valor_sistema: number;
  diferencia_valor: number;
  costo_promedio: number | null;
  impacto_financiero: number;

  // PORCENTAJES
  porcentaje_diferencia: number | null;

  // DETALLES DEL CONTEO
  veces_contado: number | null;
  primera_fecha_conteo: string | null;
  ultima_fecha_conteo: string | null;
  usuarios_nombres: string | null;
  ubicaciones_conteo: string | null;
  ids_conteos: number[];

  // DETALLES DEL SISTEMA
  ubicacion_sistema: string | null;
  clase: string | null;
  grupo: string | null;
  linea_competencia: string | null;
  costo_unitario: number | null;
  precio_sin_iva: number | null;
  ultima_fecha_compra: string | null;
  ultima_fecha_venta: string | null;
  cant_vendida_ult_mes: number;
  requiere_reconteo:boolean;

  // CAMPAÑA
  campana_id: number | null;

  // IMÁGENES
  imagenes: ImagenConteo[];
}

export interface ResumenInconsistencias {
  total_inconsistencias: number;
  fuera_de_inventario: number;
  faltantes: number;
  sobrantes: number;
  impacto_financiero_total: number;
  impacto_perdida: number;
  impacto_ganancia: number;
  impacto_neto: number;
}

export interface ConteosInconsistenciasResponse {
  agencia_filtrada: number;
  resumen: ResumenInconsistencias;
  datos: Inconsistencia[];
}

// Respuesta principal
export interface InconsistenciasResponse {
  agencia_filtrada: number;
  resumen: ResumenInconsistencias;
  datos: Inconsistencia[];
}

export interface ConteoUsuarioResponse {
  agencia_filtrada: number | null;
  total_usuarios: number;
  datos: ConteoUsuario[];
}

export interface ConteoUsuario {
  usuario_contador: string;
  nombre_usuario: string;
  agencia_id: number;
  nombre_agencia: string;
  codigo_agencia: string;
  total_items_contados: number;
  cantidad_total_contada: number;
  primera_fecha_conteo: Date | null;
  ultima_fecha_conteo: Date | null;
}

// Interfaces DTO para tipado
export interface EquiposConteoDto {
    codigo_equipo: string;
    tipo_equipo: string;
    marca: string;
    modelo: string;
    numero_serie: string;
    sistema_operativo: string;
    version_app: string;
    agencia_id: string;
    usuario_asignado_id: number;
    fecha_ultima_sincronizacion: string; // O Date, dependiendo de cómo manejes las fechas
    estado: string;
    observaciones: string;
    fecha_asignacion: string; // O Date
}

export interface SincronizacionDto {
    equipo_id: number;
    usuario_id: number;
    tipo_operacion: string;
    tabla_afectada: string;
    registros_procesados: number;
    registros_exitosos: number;
    registros_con_error: number;
    estado: string;
    mensaje_error: string | null;
    fecha_inicio: string; // O Date
    fecha_fin: string; // O Date
}

// ✅ NUEVO: respuesta de POST finalizar-conteo/{agenciaId}
// (cierre de conteo + ajuste de stock para una agencia).
export interface FinalizarConteoResponse {
  mensaje: string;
  agencia_id: number;
  campana_id: number;
  articulos_actualizados: number;
}

export interface CampanaInventarioDto {
  id?: number;                    // ✅ presente en las respuestas de listado/detalle, ausente al crear
  nombre: string;
  descripcion: string;
  fecha_inicio: string; // Usar string para fechas para compatibilidad con JSON
  fecha_fin: string;
  estado: string;
  tipo_inventario: string;
  agencias_incluidas: number[];
  categorias_incluidas: number[];
  observaciones: string;
  usuario_creacion: string;
  fecha_creacion?: string;        // ✅ solo en respuestas del backend
  fecha_actualizacion?: string;   // ✅ solo en respuestas del backend
}

// ✅ NUEVO: respuesta de GET campanas/activa.
// Igual que CampanaInventarioDto pero con "id" (el backend sí lo devuelve
// para este endpoint) y sin los campos de creación que no trae la consulta.
export interface CampanaActivaDto {
  id: number;
  nombre: string;
  descripcion: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string;
  tipo_inventario: string;
}

// ✅ MODIFICADO: interfaz alineada con el ConteoInventarioDto del backend
// (usado por createConteo y por updateConteo en la edición de conteos propios).
// Cambios:
//  - agenciaId ahora acepta string, porque el backend recibe el código "024"
//    y lo resuelve internamente contra la tabla agencias.
//  - Se agregan ubicacion / descripcion / unidad, que el backend ya soporta
//    y son necesarios para editar la ubicación de un conteo.
//  - cantidadReconteo acepta null para poder limpiarlo en la edición.
export interface ConteoInventarioDto {
    campanaId?: number;
    agenciaId?: number | string;          // ✅ acepta código de agencia "024"
    repuestoId?: number;
    ubicacionFisicaId?: number;
    CodigoInternoAgencia: string;
    cantidadContada: number;
    precioUnitario: number;
    valorTotal: number;
    EstadoProducto: string;
    observaciones: string;
    usuarioContador: string;
    ubicacion?: string;                   // ✅ NUEVO: ubicación física del conteo
    descripcion?: string;                 // ✅ NUEVO
    unidad?: string;                      // ✅ NUEVO
    latitud?: number;
    longitud?: number;
    requiereReconteo: boolean;
    motivoReconteo: string;
    usuarioReconteo: string;
    cantidadReconteo?: number | null;     // ✅ acepta null en la edición
}

export interface ImagenesConteoDto {
    nombreArchivo: string;
    rutaArchivo: string;
    tipoImagen: string;
    tamanoBytes: number;
    formato: string;
    resolucion: string;
    esPrincipal: boolean;
    descripcion: string;
    usuarioSubida: string;
    marcaCamara: string;
    modeloCamara: string;
    fechaFoto: string;
    coordenadasGps: string;
}

/**
 * Interface mejorada para conteos unificados con información del inventario del sistema
 */
export interface ConteoUnificadoDto {
    // Datos básicos del conteo
    agencia_id: number;
    repuesto_id: number;
    codigo_interno_agencia: string;
    campana_id?: number;
    
    // Datos del conteo físico
    cantidad_total: number;
    precio_unitario_promedio?: number;
    valor_total_acumulado?: number;
    
    // Información de ubicaciones y estados del conteo
    ubicaciones: string;
    ubicaciones_detalle: string;
    estados: string;
    unidades: string;
    usuarios: string;
    usuariosnombre: string;
    observaciones_consolidadas: string;
    
    // ✅ NUEVO: detalle estructurado de cada conteo individual (conteosunif8).
    // Incluye id y usuario_contador para la edición de conteos propios.
    conteos_detalle?: ConteoDetalleItemDto[];
    
    // Fechas del conteo
    primera_fecha_conteo?: Date | string;
    ultima_fecha_conteo?: Date | string;
    fechas_conteo: string;
    
    // Información adicional del conteo
    descripcion: string;
    latitud?: number;
    longitud?: number;
    requiere_reconteo: boolean;
    motivos_reconteo: string;
    total_registros_conteo: number;
    
    // IDs originales e imágenes
    ids_conteos_originales: number[];
    numero_conteos: number;
    imagenes: ImagenConteoUnificadoDto[];
    
    // ====== DATOS DEL INVENTARIO DEL SISTEMA ======
    // Stock del sistema
    stock_sistema: number;
    stock_reservado: number;
    stock_disponible: number;
    diferencia_stock: number; // Diferencia entre conteo físico y sistema
    
    // Información de la organización
    oficina?: string;
    bodega?: string;
    clase?: string;
    grupo?: string;
    nombre_articulo?: string;
    ubicacion_sistema?: string;
    linea_competencia?: string;
    
    // Costos y precios
    costo_unitario?: number;
    costo_total_sistema?: number;
    costo_promedio?: number;
    precio_sin_iva?: number;
    descuento_maximo?: number;
    
    // Historial de movimientos
    primera_fecha_compra?: Date | string;
    ultima_fecha_compra?: Date | string;
    ultima_fecha_venta?: Date | string;
    
    // Datos de rotación
    cant_vendida_ult_mes?: number;
    numero_de_transferencias?: number;
    fue_contado?: boolean;
}

// ✅ NUEVO: item del array conteos_detalle que devuelve conteosunif8
// (coincide con el DTO ConteoDetalleUbicacionItemDto del backend)
export interface ConteoDetalleItemDto {
    id?: number | null;                 // id del conteo individual (para editar)
    usuario_contador?: string | null;   // id numérico del usuario que contó
    ubicacion: string;
    cantidad: number | null;
    usuario: string;                    // nombre completo del usuario
    fecha: string;
    estado_producto?: string | null;
    observaciones?: string | null;
}

export interface ImagenConteoUnificadoDto {
    nombre_archivo: string;
    ruta_archivo: string;
    tamano_bytes: number;
    fecha_subida: Date | string;
    conteo_id: number;
}

export interface TotalItemsDto {
    oficina_id: string;
    total_items: number;
}

export interface RepuestoReservadoDto {
    articulo: string;
    nombre: string;
    grupo: string;
    stock_reservado: number;
    stock_disponible: number;
    costo_promedio: number;
}

export interface ConteoUnificadoResponse {
  datos: ConteoUnificadoDto[]; 
  
  // Propiedades nuevas / ajustadas basadas en el error de TypeScript:
  agencia_filtrada?: number;
  total_registros?: number;
  total_contados?: number;
  total_no_contados?: number;
  porcentaje_contado?: number;
  
  mensaje?: string;
}