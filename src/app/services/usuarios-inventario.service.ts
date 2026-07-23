import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// ══════════════════════════════════════════════════
// Interfaces
// ══════════════════════════════════════════════════

export interface PersonaInventario {
  id: number;
  nombre_completo: string;
  cedula: string | null;
  telefono: string | null;
  email: string | null;
  especialidad: string | null;
  estado: boolean;
  observaciones: string | null;
  fecha_creacion: string;
}

export interface PersonasResponse {
  total: number;
  personas: PersonaInventario[];
}

export interface PersonaDto {
  nombreCompleto: string;
  cedula?: string | null;
  telefono?: string | null;
  email?: string | null;
  especialidad?: string | null;
  observaciones?: string | null;
}

export interface SlotLogin {
  idimport: number;
  nombre_usuario: string;
  correo: string | null;
  activo: boolean;
  ultimo_acceso: string | null;
}

export interface SlotsResponse {
  total: number;
  slots: SlotLogin[];
}

export interface AsignacionCampana {
  id: number;
  campana_id: number;
  agencia_id: number;
  idimport: number;
  rol: string | null;
  estado: boolean;
  fecha_asignacion: string;
  fecha_baja: string | null;
  usuario_asigno: string | null;
  observaciones: string | null;
  persona_id: number;
  nombre_completo: string;
  cedula: string | null;
}

export interface AsignacionesResponse {
  campana_id: number;
  agencia_id: number;
  total: number;
  asignaciones: AsignacionCampana[];
}

export interface AsignacionDto {
  campanaId: number;
  agenciaId: number;
  personaId: number;
  idimport: number;
  rol?: string;
  usuarioAsigno?: string;
  observaciones?: string;
}

export interface QuienSoyResponse {
  asignado: boolean;
  persona_id?: number;
  nombre_completo?: string;
  rol?: string | null;
  mensaje?: string;
}

// ══════════════════════════════════════════════════
// Servicio
// ══════════════════════════════════════════════════

@Injectable({ providedIn: 'root' })
export class UsuariosInventarioService {

  private baseUrl = 'https://bodega.vehicentro.com:1830/api/api/UsuariosInventario';

  constructor(private http: HttpClient) {}

  // ── Personas reales (solo base inventario) ─────

  getPersonas(soloActivas?: boolean): Observable<PersonasResponse> {
    let params = new HttpParams();
    if (soloActivas !== undefined) {
      params = params.set('soloActivas', soloActivas.toString());
    }
    return this.http.get<PersonasResponse>(`${this.baseUrl}/personas`, { params });
  }

  crearPersona(dto: PersonaDto): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/personas`, dto);
  }

  actualizarPersona(id: number, dto: PersonaDto): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/personas/${id}`, dto);
  }

  cambiarEstadoPersona(id: number, activo: boolean): Observable<any> {
    return this.http.put<any>(
      `${this.baseUrl}/personas/${id}/estado`, {},
      { params: new HttpParams().set('activo', activo.toString()) }
    );
  }

  // ── Slots de login (base importaciones) ────────

  getSlots(prefijo: string = 'userinv'): Observable<SlotsResponse> {
    return this.http.get<SlotsResponse>(
      `${this.baseUrl}/slots`,
      { params: new HttpParams().set('prefijo', prefijo) }
    );
  }

  /** Bloquea/desbloquea el login en AMBAS bases (importaciones + asignaciones activas). */
  cambiarEstadoSlot(idimport: number, activo: boolean): Observable<any> {
    return this.http.put<any>(
      `${this.baseUrl}/slots/${idimport}/estado`, {},
      { params: new HttpParams().set('activo', activo.toString()) }
    );
  }

  // ── Asignaciones campaña + agencia ──────────────

  getAsignaciones(campanaId: number, agenciaId: number, incluirHistorial = false): Observable<AsignacionesResponse> {
    const params = new HttpParams()
      .set('campanaId', campanaId.toString())
      .set('agenciaId', agenciaId.toString())
      .set('incluirHistorial', incluirHistorial.toString());
    return this.http.get<AsignacionesResponse>(`${this.baseUrl}/asignaciones`, { params });
  }

  /** Asigna (o reasigna automáticamente) una persona a un slot en campaña+bodega. */
  asignar(dto: AsignacionDto): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/asignaciones`, dto);
  }

  darDeBaja(asignacionId: number): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/asignaciones/${asignacionId}/baja`, {});
  }

  // ── Identidad (para app móvil / verificación) ───

  quienSoy(idimport: number, campanaId: number, agenciaId: number): Observable<QuienSoyResponse> {
    const params = new HttpParams()
      .set('idimport', idimport.toString())
      .set('campanaId', campanaId.toString())
      .set('agenciaId', agenciaId.toString());
    return this.http.get<QuienSoyResponse>(`${this.baseUrl}/quien-soy`, { params });
  }
}