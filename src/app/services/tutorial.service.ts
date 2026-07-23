import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { Tutorial } from '../models/tutorial.model';
import { categoria } from '../models/categoria.model';
import { producto } from '../models/producto.model';

const baseUrl = 'http://localhost:8080/api/tutorials';
 

@Injectable({
  providedIn: 'root',
})
export class TutorialService {
  //url = 'https://localhost:7294';
  url = 'https://bodega.vehicentro.com:1830/api';
  constructor(private http: HttpClient) {}

  Lineas1() : Observable<any>{ // Preparar el Observable
    //return this.articulo;
    return this.http.get<categoria[]>(`${this.url}/api/lineas`)
  }
  productos() : Observable<any>{ // Preparar el Observable
    //return this.articulo;
    return this.http.get<producto[]>(`${this.url}/api/productos`)
  }
  getproducto(id: any): Observable<producto> {
    return this.http.get<producto>(`${this.url}/api/productos/${id}`);
  }
//https://localhost:7294/api/Importaciones
  importaciones(){
    return this.http.get<any>(`${this.url}/api/Importaciones`)
  }
 

  importacionesPorUsuario(usuarioId: number): Observable<any> {
    return this.http.get<any>(`${this.url}/api/Importaciones/usuario?usuarioId=${usuarioId}`);
  }
  detallesimpor(cod:number){
    return this.http.get<any>(`${this.url}/api/Importaciones/cod=`+cod)
  }

  liquidado(){
    return this.http.get<any>(`${this.url}/api/Importaciones/liqui`)
  }

searchDetailByCodigo(codigo: string): Observable<any> {
    // 1. Encode the 'codigo' parameter to handle special characters like '/'
    const encodedCodigo = encodeURIComponent(codigo);

    // 2. Build the URL with query parameter instead of route parameter
    return this.http.get(`${this.url}/api/Bl/detail-search?codigo=${encodedCodigo}`)
      .pipe(
        catchError(error => {
          console.error('Error en searchDetailByCodigo:', error);
          return throwError(error);
        })
      );
}


  subcate(): Observable<producto> {
    return this.http.get<any>(`${this.url}/api/subcate`);
  }

  getAll(): Observable<Tutorial[]> {
    return this.http.get<Tutorial[]>(baseUrl);
  }

  get(id: any): Observable<Tutorial> {
    return this.http.get<Tutorial>(`${baseUrl}/${id}`);
  }

  create(data: any): Observable<any> {
    return this.http.post(baseUrl, data);
  }
  createrep(data: any): Observable<any> {
    return this.http.post(this.url+'/api/productos', data);
  }

  createcat(data: any): Observable<any> {
    return this.http.post(this.url+'/api/categoria', data);
  }

  update(id: any, data: any): Observable<any> {
    return this.http.put(`${baseUrl}/${id}`, data);
  }
  

  delete(id: any): Observable<any> {
    return this.http.delete(`${baseUrl}/${id}`);
  }

  deleteAll(): Observable<any> {
    return this.http.delete(baseUrl);
  }

  findByTitle(title: any): Observable<Tutorial[]> {
    return this.http.get<Tutorial[]>(`${baseUrl}?title=${title}`);
  }
  findByCodigo(title: any): Observable<any> {
    return this.http.post( this.url+'/api/productos/codigo=' +title, null);
  }
  findByLinea(id: any): Observable<any> {
    return this.http.post( this.url+'/api/lineacat/codigo=' +id, null);
  }
  findByFamilia(id: any): Observable<any> {
    return this.http.post( this.url+'/api/familiacat/codigo=' +id, null);
  }
  //https://localhost:7294/api/Importaciones/1
  findImportacion(id: any) {
    return this.http.get( this.url+'/api/IMportaciones/' +id);
  }
  findDocus(id: any) {
    return this.http.get( this.url+'/api/Documentos/' +id);
  }


}
