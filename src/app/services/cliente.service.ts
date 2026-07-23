import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';


export interface Cliente {
    id: number;
    nombre_del_cliente: string;
    direccion: string;
    correo_electronico: string;
    ci_ruc: string;
    telefono: string;
    fecha_creacion?: Date;
    fecha_modificacion?: Date;
    estado?: string;
    usuario_crea?: string;
    usuario_modificacion?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private apiUrl = `https://bodega.vehicentro.com:1830/api/api/clientes`;

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  /** GET: Obtiene la lista de clientes del servidor */
  getClientes(): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(this.apiUrl);
  }
}