import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { Cotizacion } from './cotizacion.service';

export interface Proveedor {
    id: number;
    nombre: string;
    // Add any other properties your proveedor model has
}

@Injectable({
  providedIn: 'root'
})
export class ProveedorService {
  private apiUrl = `https://bodega.vehicentro.com:1830/api/api/Proveedor`;
  //ProveedorCl
private apiUrl2 = `https://bodega.vehicentro.com:1830/api/api/ProveedorCl`;
  constructor(private http: HttpClient) { }

  // Obtener todas las cotizaciones
  getProveedor(): Observable<any> {
    return this.http.get<any>(this.apiUrl)
      .pipe(
        catchError(this.handleError)
      );
  }

  getProveedores(): Observable<Proveedor[]> {
        return this.http.get<Proveedor[]>(this.apiUrl2);
    }

  

   private handleError(error: HttpErrorResponse) {
      console.error('Error en la API:', error);
      
      let errorMessage = 'Ha ocurrido un error en el servidor.';
      
      if (error.error instanceof ErrorEvent) {
        // Error del lado del cliente
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Error del lado del servidor
        if (error.status === 409) {
          errorMessage = 'Ya existe una cotización con ese código.';
        } else if (error.status === 400 && error.error) {
          errorMessage = error.error;
        } else if (error.status === 500) {
          errorMessage = 'Error interno del servidor.';
        }
      }
      
      return throwError(() => new Error(errorMessage));
    }

}
