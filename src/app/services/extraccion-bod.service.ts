import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// ========================
// INTERFACES
// ========================
export interface ExtraccionBod {
  id?: number;
  codigo: string;
  articulo: string;
  cantidad: number;
  conjunto?: string | null;
  codigoConjunto?: string | null;
  fechaExtraccion?: string | null; // ISO date
  agencia?: string | null;
  requisicionReversion?: string | null;
  ajusteJimmy?: string | null;
  cliente?: string | null;
  otPrefacturaProforma?: string | null;
  solicitadoPor?: string | null;
  fechaDevolucion?: string | null; // ISO date
  reservado?: string | null;
  ajuste?: string | null;
  codigoEstado?: string | null;
  estado?: string | null;
  observacion?: string | null;
  proveedor?: string | null;
  stock?: string | null;
}

export interface ExtraccionBodFiltros {
  estado?: string;
  agencia?: string;
  codigo?: string;
}

// ========================
// SERVICE
// ========================
@Injectable({
  providedIn: 'root'
})
export class ExtraccionBodService {
  private readonly baseUrl = 'https://bodega.vehicentro.com:1830/api/api/ExtraccionBod'; // ← cambia si tu URL varía

  constructor(private http: HttpClient) {}

  // -------- CRUD BÁSICO --------
  getAll(filtros?: ExtraccionBodFiltros): Observable<ExtraccionBod[]> {
    let params = new HttpParams();
    if (filtros?.estado) params = params.set('estado', filtros.estado);
    if (filtros?.agencia) params = params.set('agencia', filtros.agencia);
    if (filtros?.codigo) params = params.set('codigo', filtros.codigo);

    return this.http.get<ExtraccionBod[]>(this.baseUrl, { params });
  }

  buscarPorCodigo(codigo: string): Observable<{ codigo: string; articulo: string; cantidad: number }[]> {
  const params = new HttpParams().set('codigo', codigo);
  return this.http.get<{ codigo: string; articulo: string; cantidad: number }[]>(
    `${this.baseUrl}/buscar`, { params }
  );
}

  getById(id: number): Observable<ExtraccionBod> {
    return this.http.get<ExtraccionBod>(`${this.baseUrl}/${id}`);
  }

  create(bod: ExtraccionBod): Observable<ExtraccionBod> {
    return this.http.post<ExtraccionBod>(this.baseUrl, bod);
  }

update(id: number, bod: ExtraccionBod): Observable<any> {
  return this.http.put<any>(`${this.baseUrl}/${id}`, bod);
}
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // -------- UTILIDADES --------
  getEstados(): Observable<string[]> {
    return new Observable((observer:any) => {
      this.getAll().subscribe({
        next: data => {
          const estados = [...new Set(data.map(r => r.estado))].filter(Boolean);
          observer.next(estados);
          observer.complete();
        },
        error: err => observer.error(err)
      });
    });
  }

  getAgencias(): Observable<string[]> {
    return new Observable((observer:any) => {
      this.getAll().subscribe({
        next: data => {
          const agencias = [...new Set(data.map(r => r.agencia))].filter(Boolean);
          observer.next(agencias);
          observer.complete();
        },
        error: err => observer.error(err)
      });
    });
  }

  // -------- EXCEL --------
  uploadExcel(file: File): Observable<{ message: string; count: number }> {
    const form = new FormData();
    form.append('excelFile', file);
    return this.http.post<{ message: string; count: number }>(
      `${this.baseUrl}/upload-excel`,
      form
    );
  }

  downloadExcel(filtros?: ExtraccionBodFiltros): Observable<Blob> {
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