// documentos.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';





@Injectable({
  providedIn: 'root'
})
export class DocumentoService {
    private apiUrl  = 'https://localhost:7294/api/Documentos';
  // Ajusta a tu URL de backend

  constructor(private http: HttpClient) { }

  // Métodos existentes...

  subirDocumento(file: File, tipoDocumento: string, orden:number): Observable<HttpEvent<any>> {
    const formData: FormData = new FormData();
    formData.append('archivo', file);
    formData.append('tipoDocumento', tipoDocumento);
     

    const req = new HttpRequest('POST', `${this.apiUrl}/upload?orden=`+orden, formData, {
      reportProgress: true,
      responseType: 'json'
    });

    return this.http.request(req);
  }
}