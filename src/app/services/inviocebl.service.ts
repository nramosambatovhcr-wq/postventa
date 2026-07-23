import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InvioceblService {
  private apiUrl = 'https://bodega.vehicentro.com:1830/api/api/Invoicebl'; // Ajusta la URL base según tu configuración
  
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) { }

  // GET: Obtener todos los registros de BL
  getAllBl(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  uploadExcelForInvoiceBl1(formData: any): Observable<any> {
     return this.http.post(`${this.apiUrl}/uploadexcel`, formData);
  }
  uploadExcelForInvoiceBl(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('excelFile', file, file.name); 
    return this.http.post(`${this.apiUrl}/uploadexcel`, formData); 
  }


  getInvoiceBlDetails(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/ver/${id}`); // Ajusta la URL del endpoint si es diferente
  }

  deleteDetalleInvoiceBl(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`); // Usar la URL del controlador de detalles
  }

}
