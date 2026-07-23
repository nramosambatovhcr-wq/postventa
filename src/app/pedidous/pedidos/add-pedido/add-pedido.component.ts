import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component } from '@angular/core';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-add-pedido',
  templateUrl: './add-pedido.component.html',
  styleUrls: ['./add-pedido.component.css']
})
export class AddPedidoComponent {

  file: any;
  data: any[] = [];

  constructor(private http: HttpClient) {}

  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        this.data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      };
      reader.readAsBinaryString(file);
      this.file = file;
    }
  }

  uploadFile(): void {
    const formData = new FormData();
    formData.append('file', this.file);

    // Convert the Excel data to a JSON string
    formData.append('excelData', JSON.stringify(this.data));

    const headers = new HttpHeaders();
    this.http.post('https://localhost:7294/api/Upload/upload', formData, { headers })
      .subscribe(response => {
        console.log('File uploaded successfully', response);
      }, error => {
        console.error('Error uploading file', error);
      });
  }
}