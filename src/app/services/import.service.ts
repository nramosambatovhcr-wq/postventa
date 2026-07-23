// import.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Import {
  id: string;
  status: string;
  proforma: string;
  invoiceNo: string;
  invoiceWithBl: string;
  bl: string;
  container: string;
  liquidation: string;
}

@Injectable({
  providedIn: 'root'
})
export class ImportService {

  url = 'https://localhost:7294';
  URL2 = 'https://localhost:7294/api/Importaciones'
  private apiUrl = 'api/imports'; // Replace with your actual API endpoint

  constructor(private http: HttpClient) { }

  getImports(): Observable<Import[]> {
    return this.http.get<Import[]>(this.apiUrl);
  }

  getImportById(id: string): Observable<Import> {
    return this.http.get<Import>(`${this.apiUrl}/${id}`);
  }

  findImportacion(id: number) {
    return this.http.get( this.url+'/api/IMportaciones/' +id);
  }

  updateImport(id: number, importData: any): Observable<Import> {
    return this.http.put<Import>(`${this.URL2}/${id}`, importData);
  }

  createImport(importData: any): Observable<Import> {
    return this.http.post<Import>(this.apiUrl, importData);
  }

  deleteImport(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}