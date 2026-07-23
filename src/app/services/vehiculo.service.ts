import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Vehiculo {
  id_vehiculo?: number;
  idcliente: number;
  vim?: string;
  modelo: string;
  anio: number;
  color: string;
  placa?: string;
  estado: string;
  fecha_creacion?: Date;
  fecha_modificacion?: Date;
  usuario?: string;
  usuario_modifica?: string;
}

@Injectable({
  providedIn: 'root'
})
export class VehiculoService {

  private apiUrl = 'https://bodega.vehicentro.com:1830/api'; // Reemplaza con la URL base de tu API

  constructor(private http: HttpClient) { }

  /**
   * Obtiene todos los vehículos.
   */
  getVehiculos(): Observable<Vehiculo[]> {
    return this.http.get<Vehiculo[]>(`${this.apiUrl}/vehiculos`);
  }

  /**
   * Obtiene un vehículo por su ID.
   */
  getVehiculo(id: number): Observable<Vehiculo> {
    return this.http.get<Vehiculo>(`${this.apiUrl}/vehiculos/${id}`);
  }

  getVehiculoCli(id: number): Observable<Vehiculo> {
    return this.http.get<Vehiculo>(`${this.apiUrl}/vehiculos/cliente/${id}`);
  }

  /**
   * Crea un nuevo vehículo.
   */
  createVehiculo(vehiculo: Vehiculo): Observable<Vehiculo> {
    return this.http.post<Vehiculo>(`${this.apiUrl}/vehiculos`, vehiculo);
  }

  /**
   * Actualiza un vehículo existente.
   */
  updateVehiculo(id: number, vehiculo: Vehiculo): Observable<Vehiculo> {
    return this.http.put<Vehiculo>(`${this.apiUrl}/vehiculos/${id}`, vehiculo);
  }

  /**
   * Elimina un vehículo por su ID.
   */
  deleteVehiculo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/vehiculoprocesos/${id}`);
  }
}