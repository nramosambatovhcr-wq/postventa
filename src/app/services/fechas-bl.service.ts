// src/app/services/fechas-bl.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FechasBL {
  id?: number; // Assuming 'id' is still number in Angular even if bigint in DB
  idbl: number; // Changed to idbl and number type
  fpedidocont?: Date | any;
  fembarque?: Date | any;
  ftransito?: Date | any;
  farrivop?: Date | any;
  faduana?: Date | any;
  faduanas?: Date | any;
  farribob?: Date | any;
  fpreliquidacion?: Date | any;
  fliquidacion?: Date | any; // New field
}

@Injectable({
  providedIn: 'root'
})
export class FechasBLService {
  private apiUrl = 'https://bodega.vehicentro.com:1830/api/api/FechasBL'; // Updated API URL to FechasBL

  constructor(private http: HttpClient) { }

  getFechasByBlId(idbl: number): Observable<any> { // Changed parameter name and type
    return this.http.get<any>(`${this.apiUrl}/${idbl}`);
  }

 
// Método del servicio actualizado
updateFechasBL(idbl: number, fechasData: any): Observable<any> {
  const headers = new HttpHeaders({
    'Content-Type': 'application/json'
  });
  
  return this.http.put<any>(`${this.apiUrl}/blid=${idbl}`, fechasData, { headers });
}

  createFechasBL(fechasData: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, fechasData);
  }
}