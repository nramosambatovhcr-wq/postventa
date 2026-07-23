import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

// Interfaces para tipado fuerte
export interface AsignarArmadoRequest {
  numero: string;
  usuario: string;
}

export interface EstadoArmadoRequest {
  estado: 'Pendiente' | 'Parcial' | 'Completo';
  cantidadArmada: number;
}

export interface EstadoRevisionRequest {
  estado: 'Pendiente' | 'Incompleto' | 'Revisado';
  usuario: string;
  observaciones?: string;
}

export interface ArmadoItem {
  articulo: string;
  nombre: string;
  cantidadSolicitada: number;
  stock: number;
  stockDisponible: number;
  armado: {
    usuario: string;
    cantidadAsignada: number;
    cantidadArmada: number;
    estado: string;
    fechaAsignacion: string;
    fechaFin: string;
  };
  revision: {
    usuario: string;
    estado: string;
    fechaInicio: string;
    fechaFin: string;
    observaciones: string;
  };
}

export interface DetalleCompleto {
  numero: string;
  estadoGeneral: string;
  items: ArmadoItem[];
}

export interface UsuarioBodegaImpor1 {
  id: number;
  cedula?: string;
  nombre?: string;
  rol: string;
  agencia?: string;
  cliente?: string;
  idAgencia?: number;
  activo: boolean;
  intentosFallidos: number;
  fechaCreacion: string; // ISO date
  ultimoAcceso?: string; // ISO date
}

export interface UsuariosBodegaImpor1Response {
  success: boolean;
  total: number;
  data: UsuarioBodegaImpor1[];
}

export interface TransferenciaEstadoGeneralDto {
  numeroTransferencia: string;
  estadoGeneral: string;
  usuarioUltimaActualizacion?: string;
  fechaHoraUltimaActualizacion?: string;
}

export interface UpsertEstadoGeneralDto {
  numeroTransferencia: string;
  estadoGeneral: string;
  usuarioUltimaActualizacion: string;
}

/* ---------- Interfaces para Recepción de Contenedores ---------- */
export interface RecepcionContenedorModel {
  id?: number;
  codigo?: string;
  empresaTransporte?: string;
  conductorNombre?: string;
  conductorCI?: string;
  acompananteNombre?: string;
  acompananteCI?: string;
  placaUnidad?: string;
  fechaArribo: string;        // ISO
  horaIngreso?: string;       // HH:mm
  horaSalida?: string;
  observacionesGenerales?: string;
  entregueConforme?: string;
  recibiConforme?: string;
  respaldoFotografico: boolean;
  creadoEn?: string;
}

export interface FotoRecepcionModel {
  id?: number;
  tipoFoto: string;
  nombreArchivo?: string;
  fechaHora?: string;
  subidoPor?: string;
}


@Injectable({
  providedIn: 'root'
})
export class TransferenciaArmadoService {
  private base = 'https://bodega.vehicentro.com:1830/api/api/transferencias';
    private apiUrl = 'https://bodega.vehicentro.com:1830/api/api/transferencias';

  private headers = new HttpHeaders({ 'Content-Type': 'application/json' });
   private httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };

  constructor(private http: HttpClient) {}

  /** POST asignar armador */
  asignarArmador(numero: string, body: AsignarArmadoRequest): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(`${this.base}/${numero}/asignar-armador`, body, { headers: this.headers });
  }

  /** PATCH estado armado */
  cambiarEstadoArmado(numero: string, articulo: string, body: EstadoArmadoRequest): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/${numero}/item/${articulo}/estado-armado`, body, { headers: this.headers });
  }

  /** PATCH estado revisión */
  cambiarEstadoRevision(numero: string, articulo: string, body: EstadoRevisionRequest): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/${numero}/item/${articulo}/estado-revision`, body, { headers: this.headers });
  }

  /** GET detalle completo (armado + revisión + general) */
  getDetalleCompleto(numero: string): Observable<DetalleCompleto> {
    return this.http.get<DetalleCompleto>(`${this.base}/${numero}/detalle-completo`);
  }

 getUsuariosBodegaImpor1(): Observable<UsuariosBodegaImpor1Response> {
    return this.http.get<UsuariosBodegaImpor1Response>(`${this.base}/usuarios-rol-bodegaimpor1`);
  }

  asignarArmadoresATransferencia(body: { numero: number; usuarios: string[], usuarioQueAsigna: any  }): Observable<any> {
  return this.http.post(`${this.base}/asignar-armadores-transferencia`, body);
}

getEstadoGeneral(numero: string): Observable<TransferenciaEstadoGeneralDto> {
    return this.http.get<TransferenciaEstadoGeneralDto>(`${this.base}/${numero}`);
  }

  // 📋 Obtener todos los estados
  getAllEstadosGenerales(): Observable<TransferenciaEstadoGeneralDto[]> {
    return this.http.get<TransferenciaEstadoGeneralDto[]>(`${this.base}`);
  }

  // 🔁 Crear o actualizar estado
  upsertEstadoGeneral(dto: UpsertEstadoGeneralDto): Observable<any> {
    return this.http.post(`${this.base}/upsert`, dto);
  }

 /* ============================================================
   RECEPCIÓN DE CONTENEDORES
   ============================================================ */

/** Crea una nueva recepción de contenedor */
crearRecepcion(recepcion: RecepcionContenedorModel): Observable<{ id: number; message: string }> {
  return this.http.post<{ id: number; message: string }>(
    `${this.apiUrl}/recepciones`,
    recepcion,
    this.httpOptions
  );
}

/* ---------- INSPECCIÓN CONTENEDOR ---------- */
guardarInspeccionContenedor(id: number, items: any[]) {
  return this.http.post<{ message: string }>(
    `${this.apiUrl}/recepciones/${id}/inspeccion-contenedor`,
    items
  );
}

/* ---------- INSPECCIÓN SELLOS ---------- */
guardarInspeccionSellos(id: number, dto: {
  numero: string;
  mecanismos: string;
  tirar: string;
  torcer: string;
}) {
  return this.http.post<{ message: string }>(
    `${this.apiUrl}/recepciones/${id}/inspeccion-sellos`,
    dto
  );
}

/* ---------- RESPONSABLES ---------- */
guardarResponsables(id: number, dto: {
  entregueConforme?: string;
  recibiConforme?: string;
}) {
  return this.http.patch<{ message: string }>(
    `${this.apiUrl}/recepciones/${id}/responsables`,
    dto
  );
}

/** Lista todas las recepciones (resumen) */
listarRecepciones(): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/recepciones`);
}

/** Obtiene una recepción completa por ID */
getRecepcionById(id: number): Observable<RecepcionContenedorModel> {
  return this.http.get<RecepcionContenedorModel>(`${this.apiUrl}/recepciones/${id}`);
}

/** Obtiene las fotos de una recepción */
getFotosRecepcion(id: number): Observable<FotoRecepcionModel[]> {
  return this.http.get<FotoRecepcionModel[]>(`${this.apiUrl}/recepciones/${id}/fotos`);
}

/** Sube una foto para una recepción (FormData) */
subirFotoRecepcion(
  id: number,
  tipoFoto: string,
  file: File,
  subidoPor?: string
): Observable<{ id: number; message: string }> {
  const formData = new FormData();
  formData.append('file', file, file.name);
  formData.append('tipoFoto', tipoFoto);
  if (subidoPor) formData.append('subidoPor', subidoPor);

  return this.http.post<{ id: number; message: string }>(
    `${this.apiUrl}/recepciones/${id}/fotos`,
    formData
  );
}

/** Devuelve array de recepciones con sus fotos, sellos e inspección ya embebidos */
getTodoRecepciones(): Observable<{
  recepciones: any[];
  fotos: any[];
  sellos: any[];
  inspeccionContenedor: any[];
}> {
  return this.http.get<{
    recepciones: any[];
    fotos: any[];
    sellos: any[];
    inspeccionContenedor: any[];
  }>(`${this.apiUrl}/recepciones/todo`);
}
 
/** Devuelve UNA recepción con sus fotos, sellos e inspección */
getRecepcionCompleta(id: number): Observable<{
  recepcion: any;
  fotos: any[];
  sellos: any[];
  inspeccionContenedor: any[];
}> {
  return this.http.get<{
    recepcion: any;
    fotos: any[];
    sellos: any[];
    inspeccionContenedor: any[];
  }>(`${this.apiUrl}/recepciones/${id}/completa`);
}

 actualizarRecepcion(id: number, payload: RecepcionContenedorModel): Observable<{ message: string }> {
  return this.http.put<{ message: string }>(`${this.apiUrl}/recepciones/${id}`, payload);
}

eliminarRecepcion(id: number): Observable<{ message: string }> {
  return this.http.delete<{ message: string }>(`${this.apiUrl}/recepciones/${id}`);
}


}