// src/app/services/fechas-orden.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
 

export interface FechasOrden {
  id?: number;
  idOrden: number;
  fCotizacion?: Date | null;
  fRespuesta?: Date | null;
  fAprobacion?: Date | null;
  fPedido?: Date | null;
  fPedidoCont?: Date | null;
  fEmbarque?: Date | null;
  fTransito?: Date | null;
  fArrivOP?: Date | null;
  fAduana?: Date | null;
  fAduanas?: Date | null;
  fArribOB?: Date | null;
  fPreLiquidacion?: Date | null;
}

@Injectable({
  providedIn: 'root'
})
export class FechasOrdenService {
  private apiUrl  = 'https://bodega.vehicentro.com:1830/api/api/FechasOrden';
  //private apiUrl = `${environment.apiUrl}/api/FechasOrden`;

  constructor(private http: HttpClient) { }

  getFechasByOrdenId(idOrden: number): Observable<FechasOrden> {
    return this.http.get<FechasOrden>(`${this.apiUrl}/${idOrden}`);
  }

  updateFechasOrden(id: number, fechasData: FechasOrden): Observable<FechasOrden> {
    return this.http.put<FechasOrden>(`${this.apiUrl}/orden=${id}`, fechasData);
  }

  createFechasOrden(fechasData: FechasOrden): Observable<FechasOrden> {
    return this.http.post<FechasOrden>(this.apiUrl, fechasData);
  }
}