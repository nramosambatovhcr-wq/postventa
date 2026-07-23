import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
 export interface ProveedorOil1 {
  idProveedor: number;
  nombreProveedor: string;
  contactoPrincipal?: string; // Optional, as it can be null in DB
  telefono?: string;          // Optional
  email?: string;             // Optional
  direccion?: string;         // Optional
  fechaCreacion: Date;
  estado?: string;            // Optional
}
 export interface ProveedorFilter1 {
  idProveedor: number;
  nombreProveedor: string;
  contactoPrincipal?: string; // Optional, as it can be null in DB
  telefono?: string;          // Optional
  email?: string;             // Optional
  direccion?: string;         // Optional
  fechaCreacion: Date;
  estado?: string;            // Optional
}
 export interface ProveedorInsumo1 {
  idProveedor: number;
  nombreProveedor: string;
  contactoPrincipal?: string; // Optional, as it can be null in DB
  telefono?: string;          // Optional
  email?: string;             // Optional
  direccion?: string;         // Optional
  fechaCreacion: Date;
  estado?: string;            // Optional
}

 export interface ProveedorVidrio1 {
  idProveedor: number;
  nombreProveedor: string;
  contactoPrincipal?: string; // Optional, as it can be null in DB
  telefono?: string;          // Optional
  email?: string;             // Optional
  direccion?: string;         // Optional
  fechaCreacion: Date;
  estado?: string;            // Optional
}

@Injectable({
  providedIn: 'root'
})
export class ProveedoroilService {

   private apiUrl = 'https://bodega.vehicentro.com:1830/api/api/PedidosWeb/proveedores-oil';
   private apiUrl2 = 'https://bodega.vehicentro.com:1830/api/api/PedidosWeb/proveedores-filter'; // Adjust this to your actual API endpoint for getting suppliers
   private apiUrl3 = 'https://bodega.vehicentro.com:1830/api/api/PedidosWeb/proveedores-insumos';
   private apiUrl4 = 'https://bodega.vehicentro.com:1830/api/api/PedidosWeb/proveedores-vidrios';

  constructor(private http: HttpClient) { }

  getProveedoresOil(): Observable<ProveedorOil1[]> {
    // This assumes your API returns an array of ProveedorOil objects
    return this.http.get<ProveedorOil1[]>(this.apiUrl);
  }

  getProveedoresFilter(): Observable<ProveedorFilter1[]> {
    // This assumes your API returns an array of ProveedorOil objects
    return this.http.get<ProveedorFilter1[]>(this.apiUrl2);
  }

  getProveedoresInsumo(): Observable<ProveedorInsumo1[]> {
    // This assumes your API returns an array of ProveedorOil objects
    return this.http.get<ProveedorInsumo1[]>(this.apiUrl3);
  }
 getProveedoresVidrios(): Observable<ProveedorVidrio1[]> {
    // This assumes your API returns an array of ProveedorOil objects
    return this.http.get<ProveedorVidrio1[]>(this.apiUrl4);
  }
 

}
