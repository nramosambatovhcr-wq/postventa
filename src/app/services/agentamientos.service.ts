import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Agencia {
  oficina: number;
  idAgencia: string;   
  nombre?: string;
  nomCorto?: string;
  ciudad?: string;
  direccion?: string;
  fax?: string;
  formato?: string;
  estado: boolean;
  fechaCreacion?: Date;
  usuarioCreacion?: string;
  fechaModificacion?: Date;
  usuarioModificacion?: string;
}

export interface Agendamiento {
  idAgenda?: number;
  idcliente: number;
  nombre_cliente?: string; // Add this if your API joins tables
  idplanmantenimiento?: number;
  nombre_plan?: string; // Add this if your API joins tables
  fecha_mantenimiento: Date;
  kilometrajeActual?: number;
  observaciones?: string;
  estado: string;
  fecha_creacion?: Date;
  fecha_modificacion?: Date;
  usuario_crea?: string;
  usuario_modificacion?: string;
  idvehiculo: number;
  vehiculo?: string;
  placa?: string;
  fechaAtencion?: Date;
}

export interface Agendamiento1 {
  idAgenda?: number;
  idCliente: number;
  nombre_cliente?: string; // Add this if your API joins tables
  idPlanMantenimiento?: number;
  nombre_plan?: string; // Add this if your API joins tables
  fecha_mantenimiento: Date;
  kilometrajeActual?: number;
  observaciones?: string;
  estado: string;
  fechaCreacion?: Date;
  fecha_modificacion?: Date;
  usuario_crea?: string;
  usuario_modificacion?: string;
  idVehiculo: number;
  nombreCliente?: string;
 nombrePlan?: string;
 tipoMantenimiento?: string;
 vehiculo?: string;
  placa?: string;
  
  fechaAtencion?: Date;
}

// src/app/models/cliente.model.ts

export interface Cliente {
  id: number;
  nombreDelCliente: string;
  direccion: string;
  correoElectronico: string;
  ciRuc: string;
  telefono: string;
  estado: string;
  fechaCreacion: Date | null;
  fechaModificacion: Date | null;
  usuarioCrea: string | null;
  usuarioModificacion: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AgendamientosService {
  private apiUrl = `https://bodega.vehicentro.com:1830/api/api/agendamientos`;

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  /** GET: Obtener todos los agendamientos del servidor */
  getAgendamientos(): Observable<Agendamiento1[]> {
    return this.http.get<Agendamiento1[]>(this.apiUrl);
  }

   getAllAgencias(): Observable<Agencia[]> {
    // La URL debe ser: https://.../api/Agencia/GetAllAgencias
    const url = `${this.apiUrl}/GetAllAgencias`;
    return this.http.get<Agencia[]>(url);
  }

  getClienteById(id: number): Observable<Cliente> {
    // La URL completa será, por ejemplo: https://localhost:7000/api/infocliente/5
    const url = `${this.apiUrl}/infocliente/${id}`; 
    
    // El método .get<Cliente> mapea la respuesta JSON a la interfaz Cliente.
    return this.http.get<Cliente>(url);
  }
  /** GET: Obtener un agendamiento por su ID */
  getAgendamientoById(id: number): Observable<Agendamiento> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.get<Agendamiento>(url);
  }

    getAgendamientoByIdCli(id: number): Observable<Agendamiento1> {
    const url = `${this.apiUrl}/cliente/${id}`;
    return this.http.get<Agendamiento1>(url);
  }

  /** POST: Crear un nuevo agendamiento en el servidor */
  createAgendamiento(agendamiento: Agendamiento): Observable<Agendamiento> {
    return this.http.post<Agendamiento>(this.apiUrl, agendamiento, this.httpOptions);
  }

  /** PUT: Actualizar un agendamiento existente en el servidor */
  updateAgendamiento(id: number, agendamiento: Agendamiento): Observable<any> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.put(url, agendamiento, this.httpOptions);
  }

  /** DELETE: Eliminar un agendamiento del servidor */
  deleteAgendamiento(id: number): Observable<Agendamiento> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.delete<Agendamiento>(url, this.httpOptions);
  }
}