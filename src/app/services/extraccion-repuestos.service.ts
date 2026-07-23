import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// ========================
// INTERFACES
// ========================
export interface ExtraccionRepuesto {
  id?: number;
  codigo: string;
  articulo: string;
  cantidad: number;
  conjuntoUnidad: string;
  vin?: string | null;
  fechaExtraccion: string; // ISO date string
  agencia: string;
  ajusteJymmy?: string | null;
  cliente?: string | null;
  otPrefacturaProforma?: string | null;
  solicitadoPor?: string | null;
  fechaDevolucion?: string | null;
  reservado?: string | null;
  estado: string;
  observacion?: string | null;
}

export interface ExtraccionFiltros {
  estado?: string;
  agencia?: string;
  codigo?: string;
}

// ========================
// SERVICE
// =================-------
@Injectable({
  providedIn: 'root'
})
export class ExtraccionRepuestosService {
  private readonly baseUrl = 'https://bodega.vehicentro.com:1830/api/api/ExtraccionRepuestos'; // ← cambia si tu URL varía

  constructor(private http: HttpClient) {}

  // -------- CRUD BÁSICO --------
  getAll(filtros?: ExtraccionFiltros): Observable<ExtraccionRepuesto[]> {
    let params = new HttpParams();
    if (filtros?.estado) params = params.set('estado', filtros.estado);
    if (filtros?.agencia) params = params.set('agencia', filtros.agencia);
    if (filtros?.codigo) params = params.set('codigo', filtros.codigo);

    return this.http.get<ExtraccionRepuesto[]>(this.baseUrl, { params });
  }

  getById(id: number): Observable<ExtraccionRepuesto> {
    return this.http.get<ExtraccionRepuesto>(`${this.baseUrl}/${id}`);
  }

  create(repuesto: ExtraccionRepuesto): Observable<ExtraccionRepuesto> {
    return this.http.post<ExtraccionRepuesto>(this.baseUrl, repuesto);
  }

  update(id: number, repuesto: ExtraccionRepuesto): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, repuesto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // -------- UTILIDADES --------
  getEstados(): Observable<string[]> {
    // Si tu backend expone un endpoint /estados, cámbialo aquí
    return new Observable(observer => {
      this.getAll().subscribe({
        next: data => {
          const estados = [...new Set(data.map(r => r.estado))];
          observer.next(estados);
          observer.complete();
        },
        error: err => observer.error(err)
      });
    });
  }

  getAgencias(): Observable<string[]> {
    // Similar al de estados
    return new Observable(observer => {
      this.getAll().subscribe({
        next: data => {
          const agencias = [...new Set(data.map(r => r.agencia))];
          observer.next(agencias);
          observer.complete();
        },
        error: err => observer.error(err)
      });
    });
  }

  // -------- EXCEL (opcional) --------
  uploadExcel(file: File): Observable<{ success: number; failed: number; details: any[] }> {
    const form = new FormData();
    form.append('excelFile', file);
    return this.http.post<{ success: number; failed: number; details: any[] }>(
      `${this.baseUrl}/upload-excel`,
      form
    );
  }

  // -------- DESCARGA EXCEL (opcional) --------
  downloadExcel(filtros?: ExtraccionFiltros): Observable<Blob> {
    let params = new HttpParams();
    if (filtros?.estado) params = params.set('estado', filtros.estado);
    if (filtros?.agencia) params = params.set('agencia', filtros.agencia);
    if (filtros?.codigo) params = params.set('codigo', filtros.codigo);

    return this.http.get(`${this.baseUrl}/download-excel`, {
      params,
      responseType: 'blob'
    });
  }
}