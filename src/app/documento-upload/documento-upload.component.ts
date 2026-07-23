import { HttpEventType, HttpResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { DocumentoService } from '../services/documento.service';
import { ActivatedRoute, Router } from '@angular/router';
import { TutorialService } from '../services/tutorial.service';

@Component({
  selector: 'app-documento-upload',
  templateUrl: './documento-upload.component.html',
  styleUrls: ['./documento-upload.component.css']
})
export class DocumentoUploadComponent implements OnInit {
  uploadForm: FormGroup;
  selectedFile: File | null = null;
  progress = 0;
  mensaje = '';
  cargando = false;
  tiposDocumento: string[] = [
    'Factura Comercial',
    'Bill of Lading',
    'Packing List',
    'Declaración Aduanera'
  ];

  proformaId:any;
  
  constructor(
    private fb: FormBuilder,
    private documentosService: DocumentoService,
    private route: ActivatedRoute,
        private router: Router,
         private tutorialService: TutorialService
  ) {
    this.uploadForm = this.fb.group({
      tipoDocumento: ['', Validators.required],
      archivo: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('foo');
      if (id) {
        this.proformaId = +id;
        console.log(this.proformaId);
       // this.loadImportDetails(this.proformaId);
      }
    });
  }

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];
    
    // Actualizar el valor en el formulario
    this.uploadForm.get('archivo')?.setValue(this.selectedFile);
  }

  onSubmit(): void {
    if (this.uploadForm.invalid || !this.selectedFile) {
      return;
    }

    this.cargando = true;
    this.progress = 0;
    this.mensaje = '';

    const tipoDocumento = this.uploadForm.get('tipoDocumento')?.value;

    this.documentosService.subirDocumento(this.selectedFile, tipoDocumento, this.proformaId)
      .subscribe({
        next: (event: any) => {
          if (event.type === HttpEventType.UploadProgress) {
            this.progress = Math.round(100 * event.loaded / event.total);
          } else if (event instanceof HttpResponse) {
            this.mensaje = 'Archivo subido correctamente';
            // Resetear formulario después de subida exitosa
            this.uploadForm.reset();
            this.selectedFile = null;
            
            // Emitir evento para refrescar la lista de documentos
            // Podrías usar un Subject/EventEmitter o un servicio de estado
            
            setTimeout(() => {
              this.mensaje = '';
              this.cargando = false;
            }, 3000);
          }
        },
        error: (err: any) => {
          this.progress = 0;
          this.mensaje = 'Error al subir el archivo: ' + err.message;
          this.cargando = false;
        }
      });
  }
}