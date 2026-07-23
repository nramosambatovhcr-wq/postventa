import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ImportService } from '../services/import.service';

@Component({
  selector: 'app-import-edit',
  templateUrl: './import-edit.component.html',
  styleUrls: ['./import-edit.component.css']
})
export class ImportEditComponent  implements OnInit {
  importForm: FormGroup | any ;
  importId: string='';
  isLoading = false;
  submitError = '';
  proformaId:number=0;
  statusOptions = ['PENDIENTE', 'PRE EMBARQUE', 'EMBARCADO', 'TRANSITO', 'ADUANA', 'TRANSITO BODEGA', 'BODEGA', 'LIQUIDADO'];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private importService1: ImportService
  ) { }

  ngOnInit(): void {
    //this.importId = this.route.snapshot.paramMap.get('id') || '';
    this.route.paramMap.subscribe(params => {
      const id = params.get('proformaId');
      if (id) {
        this.proformaId = +id;
        console.log(this.proformaId);
        this.loadImportData(this.proformaId);
      }
    });
    
    this.importForm = this.fb.group({
      id: [{ value: '', disabled: true }],
      status: ['', Validators.required],
      proforma: ['', Validators.required],
      invoiceNo: ['', Validators.required],
      invoiceWithBl: [''],
      bl: ['', Validators.required],
      container: [''],
      liquidation: ['']
    });

   // this.loadImportData();
  }

  loadImportData(proformaId:number): void {
    this.isLoading = true;
    
    this.importService1.findImportacion(proformaId).subscribe({
      next: (data:any) => {
        console.log(data);
        
        this.importForm.patchValue({
          id: data[0].id,
          status: data[0].estado,
          proforma: data[0].codigocot,
          invoiceNo: data[0].invoicen,
          invoiceWithBl: data[0].invoicebl,
          bl: data[0].bl,
          container: data[0].contenedor,
          liquidation: data[0].liquidacion,
        });
        this.isLoading = false;
      },
      error: (err:any) => {
        console.error('Error loading import data', err);
        this.isLoading = false;
        this.submitError = 'Error al cargar los datos de la importación';
      }
    });
  }

  onSubmit() {
    if (this.importForm.invalid) {
      return;
    }

    this.isLoading = true;
    const formValue = this.importForm.getRawValue();
    
    this.importService1.updateImport(this.proformaId, formValue).subscribe((data:any) => {
      console.log(data);
      
      if(data){
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      }
      else{
        console.error('Error updating import');
        this.isLoading = false;
        this.submitError = 'Error al actualizar la importación';
      }
      
    });
  }

  goBack(): void {
    this.router.navigate(['/imports']);
  }




}
