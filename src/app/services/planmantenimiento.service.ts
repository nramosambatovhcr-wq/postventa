import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PlanMantenimiento {
    id_plan: number;
    kilometraje_intervalo: number;
    descripcion_plan: string;
}

@Injectable({
  providedIn: 'root'
})
export class PlanMantenimientoService {
  private apiUrl = `https://bodega.vehicentro.com:1830/api/api/planes-mantenimiento`;

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  /** GET: Obtiene la lista de planes de mantenimiento del servidor */
  getPlanes(): Observable<PlanMantenimiento[]> {
    return this.http.get<PlanMantenimiento[]>(this.apiUrl);
  }

  //planes-mantenimiento/vehi/

  getPlanesVehi(id:any): Observable<PlanMantenimiento[]> {
    return this.http.get<PlanMantenimiento[]>(`${this.apiUrl}/vehi/${id}`);
  }
  
}