import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface Equivalente {
  id?: number;
  codsistema: string;
  codoriginal: string;
  chino: string;
  descripcion: string;
  codigo1?: string;
  codigo2?: string;
  codigo3?: string;
  codigo4?: string;
  codigo5?: string;
  descActualizadaOracle ?: boolean;
}

export interface EquivalenteInsert {
  codsistema: string;
  codoriginal: string;
  chino: string;
  descripcion: string;
  codigo1?: string;
  codigo2?: string;
  codigo3?: string;
  codigo4?: string;
  codigo5?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EquivalentesService {
  private apiUrl = 'https://bodega.vehicentro.com:1830/api/api/equivalentes'; // ✅ cambia esto

  constructor(private http: HttpClient) {}

  // GET todos
  getAll(): Observable<Equivalente[]> {
    return this.http.get<Equivalente[]>(this.apiUrl)
      .pipe(catchError(this.handleError));
  }

  // url base ya la tenés, ej: base = '/api/equivalentes';

getFiltered(term: string): Observable<Equivalente[]> {
  let params = new HttpParams();
  if (term?.trim()) {
    params = params.set('q', term.trim());
  }

  return this.http.get<Equivalente[]>(`${this.apiUrl}/filter`, { params });
}

  // GET por ID
  getById(id: number): Observable<Equivalente> {
    return this.http.get<Equivalente>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  // POST con lógica de inserción inteligente
  create(data: EquivalenteInsert): Observable<any> {
    return this.http.post<any>(this.apiUrl, data)
      .pipe(catchError(this.handleError));
  }

  // PUT actualizar completo
  update(id: number, data: Equivalente): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, data)
      .pipe(catchError(this.handleError));
  }

  // DELETE
  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  // Manejo de errores
  private handleError(error: HttpErrorResponse) {
    const msg = error.error?.message || error.statusText || 'Error desconocido';
    return throwError(() => new Error(msg));
  }

  cargaMasiva(file: File): Observable<any> {
  const formData = new FormData();
  formData.append('archivo', file);
  return this.http.post(`${this.apiUrl}/carga-masiva`, formData);
}
}