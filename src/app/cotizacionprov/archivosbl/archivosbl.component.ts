import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { BlService, BlModel, BlResponse, ArchivoBl } from 'src/app/services/bl.service';
import { FechasBLService, FechasBL } from 'src/app/services/fechas-bl.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

declare var bootstrap: any; // Declara la variable global de Bootstrap

@Component({
  selector: 'app-archivosbl',
  templateUrl: './archivosbl.component.html',
  styleUrls: ['./archivosbl.component.css']
})
export class ArchivosblComponent implements OnInit, OnDestroy {
  // Formularios para gestionar diferentes secciones
  fechasForm: FormGroup;
  blForm: FormGroup;
  archivosForm: FormGroup;

  loading = true;
  loadingArchivos = false;
  blId: string | null = null;
  today = new Date().toISOString().split('T')[0];

  // Propiedades para la gestión de archivos
  selectedFile: File | null = null;
  errorMessage = '';
  successMessage = '';
  archivos: ArchivoBl[] = []; // Lista de archivos asociados al BL
  fileUrl: SafeResourceUrl = ''; // URL segura para el iframe

  // Otras propiedades del componente
  lista: any;
  private subscription = new Subscription();
  idInvoiceBl: number = 0;
  invoiceBlDetail: any | null = null;
  id: any;
  bl: any;
  estadobl: any;

  // Lista de estados disponibles para el select
  estadosDisponibles = [
    'pendiente',
    'transito',
    'Activo',
    'embarque',
    'aduana',
    'preliquidado',
    'liquidado',
  ];

  // Definición de las etapas
  etapas = [
    {
      nombre: 'FECHA DE EMBARQUE',
      descripcion: 'Fecha en que se realizó el embarque',
      campo: 'fembarque',
      bloqueado: false
    },
    {
      nombre: 'FECHA DE ARRIBO',
      descripcion: 'Fecha en que arribó la mercadería',
      campo: 'farribo',
      bloqueado: false
    },
    {
      nombre: 'FECHA DE AFORO',
      descripcion: 'Fecha de aforo de la mercadería',
      campo: 'faforo',
      bloqueado: false
    },
    {
      nombre: 'FECHA DE PAGO ANTICIPO',
      descripcion: 'Fecha de pago del anticipo de la liquidación',
      campo: 'fpagoanticipo',
      bloqueado: false
    },
    {
      nombre: 'FECHA DE PAGO TOTAL',
      descripcion: 'Fecha de pago total de la liquidación',
      campo: 'fpagototal',
      bloqueado: false
    },
    {
      nombre: 'FECHA DE ENTREGA',
      descripcion: 'Fecha en que se entregó la mercadería al cliente',
      campo: 'fentrega',
      bloqueado: false
    },
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private blService: BlService,
    private fechasBLService: FechasBLService,
    private sanitizer: DomSanitizer // Inyectar DomSanitizer
  ) {
    // Inicialización de los formularios
    this.blForm = this.fb.group({
      nombre: [{ value: '', disabled: true }, Validators.required],
      estado: ['', Validators.required],
    });

    this.fechasForm = this.fb.group({});
    this.etapas.forEach((etapa) => {
      this.fechasForm.addControl(etapa.campo, this.fb.control(null, Validators.required));
    });

    this.archivosForm = this.fb.group({
      fileInput: ['']
    });
  }

  ngOnInit(): void {
    this.subscription.add(
      this.route.paramMap.subscribe(params => {
        this.blId = params.get('id');
        if (this.blId) {
          this.loadData(+this.blId);
        } else {
          console.error('ID de BL no encontrado en la ruta.');
          this.loading = false;
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  /**
   * Carga los datos iniciales del BL, las fechas y los archivos.
   * @param id El ID numérico del BL.
   */
  loadData(id: number): void {
    this.loading = true;
    this.blService.getBl(id).subscribe({
      next: (blData) => {
        this.bl = blData;
        this.blForm.patchValue({
          nombre: blData.nombre,
          estado: blData.estado
        });
        this.loadFechas(+id);
        this.loadArchivos(+id);
      },
      error: (err) => {
        console.error('Error al cargar la información del BL', err);
        this.loading = false;
      }
    });
  }

  /**
   * Carga las fechas de seguimiento del BL.
   * @param id El ID del BL.
   */
  loadFechas(id: number): void {
    this.fechasBLService.getFechasByBlId(id).subscribe({
      next: (fechasData) => {
        if (fechasData) {
          const fechas = { ...fechasData };
          for (const key in fechas) {
            if (fechas.hasOwnProperty(key) && fechas[key]) {
              fechas[key] = new Date(fechas[key]).toISOString().split('T')[0];
            }
          }
          this.fechasForm.patchValue(fechas);
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar las fechas del BL', err);
        this.loading = false;
      }
    });
  }

  /**
   * Carga la lista de archivos asociados al BL.
   * @param id El ID del BL.
   */
  loadArchivos(id: number): void {
    this.loadingArchivos = true;
    this.blService.getArchivosByBlId(id).subscribe({
      next: (archivos) => {
        this.archivos = archivos;
        this.loadingArchivos = false;
      },
      error: (err) => {
        console.error('Error al cargar los archivos del BL', err);
        this.loadingArchivos = false;
      }
    });
  }

  /**
   * Maneja la selección de un archivo por parte del usuario.
   * @param event El evento de cambio del input de archivo.
   */
  onFileSelected(event: any): void {
    this.errorMessage = '';
    this.successMessage = '';
    const file = event.target.files[0];
    if (file) {
      const validTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        this.errorMessage = 'Tipo de archivo no válido. Solo se permiten Excel, Word, PDF, JPG o PNG.';
        this.selectedFile = null;
        event.target.value = null;
      } else {
        this.selectedFile = file;
      }
    } else {
      this.selectedFile = null;
    }
  }

  /**
   * Envía el archivo seleccionado al servicio del backend.
   */
  onFileSubmit(): void {
    if (this.selectedFile && this.blId) {
      this.loadingArchivos = true;
      this.errorMessage = '';
      this.successMessage = '';

      this.blService.uploadFile(this.selectedFile, +this.blId).subscribe({
        next: (response) => {
          console.log('Archivo subido con éxito:', response);
          this.loadingArchivos = false;
          this.successMessage = 'Archivo subido correctamente.';
          this.selectedFile = null;
          this.archivosForm.reset();
          this.loadArchivos(+this.blId!); // Recargar la lista de archivos
        },
        error: (error) => {
          console.error('Error al subir el archivo:', error);
          this.loadingArchivos = false;
          this.errorMessage = 'Error al subir el archivo. Intente de nuevo.';
        }
      });
    } else {
      this.errorMessage = 'Por favor, seleccione un archivo para subir.';
    }
  }

  /**
   * Maneja la descarga de un archivo.
   * @param archivo El objeto del archivo a descargar.
   */
  downloadFile(archivo: ArchivoBl): void {
    const url = `${this.blService.getApiUrl()}/download/${archivo.id}`;
    window.open(url, '_blank');
  }

  /**
   * Construye la URL de descarga para un archivo.
   * @param archivo El objeto del archivo.
   * @returns La URL de descarga.
   */
  getDownloadUrl(archivo: ArchivoBl): string {
    return `${this.blService.getApiUrl()}/download/${archivo.id}`;
  }
  
  /**
   * Abre un modal para visualizar archivos PDF o de imagen.
   * @param archivo El objeto del archivo a visualizar.
   */
  viewFile(archivo: ArchivoBl): void {
    const url = `${this.blService.getApiUrl()}/view/${archivo.id}`;
    this.fileUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    const modalElement = document.getElementById('viewFileModal');
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  /**
   * Verifica si el archivo es visualizable en el navegador.
   * @param tipoArchivo El tipo MIME del archivo.
   * @returns `true` si se puede visualizar, `false` en caso contrario.
   */
  isViewable(tipoArchivo: string): boolean {
    return tipoArchivo.includes('pdf') || tipoArchivo.includes('image');
  }

  /**
   * Retorna el ícono de Font Awesome según el tipo de archivo.
   * @param tipoArchivo El tipo MIME del archivo.
   * @returns La clase CSS del ícono.
   */
  getFileIcon(tipoArchivo: string): string {
    if (tipoArchivo.includes('pdf')) {
      return 'fas fa-file-pdf text-danger';
    } else if (tipoArchivo.includes('excel') || tipoArchivo.includes('sheet')) {
      return 'fas fa-file-excel text-success';
    } else if (tipoArchivo.includes('word') || tipoArchivo.includes('document')) {
      return 'fas fa-file-word text-primary';
    } else if (tipoArchivo.includes('image')) {
      return 'fas fa-file-image text-warning';
    }
    return 'fas fa-file';
  }
  
  /**
   * Maneja el envío del formulario de BL.
   */
  onSubmitBl(): void {
    if (this.blForm.valid && this.blId) {
      this.loading = true;
      const blData: BlModel = this.blForm.value;
      this.blService.updateBl(+this.blId, blData).subscribe({
        next: () => {
          this.loading = false;
          this.successMessage = 'Información del BL actualizada con éxito.';
        },
        error: (err) => {
          console.error('Error al actualizar el BL', err);
          this.loading = false;
          this.errorMessage = 'Error al actualizar el BL.';
        }
      });
    }
  }

  /**
   * Maneja el envío del formulario de fechas.
   */
  onSubmit(): void {
    if (this.fechasForm.valid && this.blId) {
      this.loading = true;
      const formData = this.processFormData(this.fechasForm.value);

      if (this.idInvoiceBl) {
        this.updateExistingRecord(this.idInvoiceBl, formData);
      } else {
        const newData: Partial<FechasBL> = { ...formData, idbl: +this.blId };
        this.createNewRecord(newData);
      }
    }
  }

  private createNewRecord(data: Partial<FechasBL>): void {
    this.fechasBLService.createFechasBL(data).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/importaciones']);
      },
      error: (createError: any) => {
        console.error('Error al crear las fechas del BL', createError);
        this.loading = false;
      }
    });
  }

  private updateExistingRecord(id: number, data: Partial<FechasBL>): void {
    this.fechasBLService.updateFechasBL(id, data).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/importaciones']);
      },
      error: (updateError: any) => {
        console.error('Error al actualizar las fechas del BL', updateError);
        this.loading = false;
      }
    });
  }

  private processFormData(formData: any): Partial<FechasBL> {
    const processedData: Partial<FechasBL> = { ...formData };
    for (const key in processedData) {
      if (processedData.hasOwnProperty(key)) {
        const value = processedData[key as keyof FechasBL];
        if (value === '' || value === null || value === undefined) {
          processedData[key as keyof FechasBL] = null as any;
        }
      }
    }
    return processedData;
  }

  /**
   * Verifica si una fecha de etapa está completa.
   * @param campo El campo del formulario de la fecha.
   * @returns `true` si la fecha no es nula ni vacía, `false` en caso contrario.
   */
  isFechaCompleta(campo: string): boolean {
    const value = this.fechasForm.get(campo)?.value;
    return value !== null && value !== '' && value !== undefined;
  }

  /**
   * Retorna la clase CSS para el estado de una etapa.
   * @param campo El campo del formulario de la fecha.
   * @returns 'completado' si la fecha está completa, 'pendiente' en caso contrario.
   */
  getEstadoEtapa(campo: string): string {
    return this.isFechaCompleta(campo) ? 'completado' : 'pendiente';
  }

  /**
   * Navega de vuelta a la página principal.
   */
  goBack(): void {
    this.router.navigate(['/importaciones']);
  }
  updateFecha(campo: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    const date = target.value;
    if (date) {
      this.fechasForm.get(campo)?.setValue(date);
    } else {
      this.fechasForm.get(campo)?.setValue(null);
    }
  }

  /**
   * Función para el trackBy en el bucle *ngFor.
   * @param index El índice del elemento.
   * @param etapa El objeto de la etapa.
   * @returns El nombre del campo para el seguimiento.
   */
  trackByEtapa(index: number, etapa: any): string {
    return etapa.campo;
  }
}
