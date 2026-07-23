import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { BlService, BlModel, BlResponse, ArchivoBl } from 'src/app/services/bl.service';
import { FechasBLService, FechasBL } from 'src/app/services/fechas-bl.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

declare var bootstrap: any;

@Component({
  selector: 'app-blvhcrupdate',
  templateUrl: './blvhcrupdate.component.html',
  styleUrls: ['./blvhcrupdate.component.css']
})
export class BlvhcrupdateComponent implements OnInit, OnDestroy {
  fechasForm: FormGroup;
  blForm: FormGroup;
  archivosForm: FormGroup; // Add files form

  loading = true;
  loadingArchivos = false; // Add loading state for files
  blId: string | null = null;
  today = new Date().toISOString().split('T')[0];

  errorMessage = '';
  successMessage = '';
  
  // File-related properties
  selectedFile: File | null = null;
  archivos: ArchivoBl[] = [];
  fileUrl: SafeResourceUrl = '';

  lista: any;
  private subscription = new Subscription();
  idInvoiceBl: number = 0;
  invoiceBlDetail: any | null = null;
  id: any;
  bl: any;
  estadobl: any;

  estadosDisponibles = [
    'pendiente',
    'transito',
    'Activo',
    'embarque',
    'aduana',
    'preliquidado',
    'liquidado',
  ];

  etapas = [
    {
      nombre: 'FECHA DE EMBARQUE',
      descripcion: 'Fecha en que se realizó el embarque',
      campo: 'fembarque',
      bloqueado: false
    },
    {
      nombre: 'FECHA EN TRÁNSITO',
      descripcion: 'Fecha de salida de puerto de origen',
      campo: 'ftransito',
      bloqueado: false
    },
    {
      nombre: 'FECHA ARRIBO EN PUERTO DE DESTINO',
      descripcion: 'Fecha estimada de llegada a puerto de destino',
      campo: 'farrivop',
      bloqueado: false
    },
    {
      nombre: 'FECHA ADUANA',
      descripcion: 'Fecha de revisión en aduana',
      campo: 'faduana',
      bloqueado: false
    },
    {
      nombre: 'FECHA SALIDA ADUANA',
      descripcion: 'Fecha en que la mercadería salió de aduana',
      campo: 'faduanas',
      bloqueado: false
    },
    {
      nombre: 'FECHA PRE-LIQUIDACIÓN',
      descripcion: 'Fecha de pre-liquidación de la importación',
      campo: 'fpreliquidacion',
      bloqueado: false
    }
  ];

  constructor(
    private fb: FormBuilder,
    private fechasBLService: FechasBLService,
    private route: ActivatedRoute,
    private router: Router,
    private blService: BlService,
    private sanitizer: DomSanitizer // Inject DomSanitizer
  ) {
    this.fechasForm = this.initForm();
    this.blForm = this.fb.group({
      nombre: [{ value: '', disabled: true }, Validators.required],
      estado: ['', Validators.required],
    });
    this.archivosForm = this.fb.group({
      fileInput: ['']
    });
  }

  ngOnInit(): void {
    this.blId = this.route.snapshot.paramMap.get('id');
    console.log('ID del BL:', this.blId);

    if (this.blId) {
      this.loadBl(Number(this.blId));
      this.loadFechasBLData();
      this.loadArchivos(Number(this.blId)); // Load files on init
    } else {
      this.loading = false;
      console.error('No se encontró el ID del BL');
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private initForm(): FormGroup {
    const formGroup: { [key: string]: any } = {};
    this.etapas.forEach(etapa => {
      formGroup[etapa.campo] = [null];
    });
    return this.fb.group(formGroup);
  }

  loadBl(id: number): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.subscription.add(
      this.blService.getBl(id).subscribe({
        next: (data: any) => {
          this.lista = data;
          this.loading = false;
          this.id = this.lista.id;
          this.bl = this.lista.nombre;
          this.estadobl = this.lista.estado;
          console.log('Datos bl:', this.lista);
          this.blForm.patchValue({
            nombre: this.lista.nombre,
            estado: this.lista.estado,
          });
        },
        error: (error) => {
          console.error('Error al cargar los detalles de bl:', error);
          this.errorMessage = 'Error al cargar los detalles de bl. ' + (error.error?.message || error.message);
          this.loading = false;
          this.lista = null;
        }
      })
    );
  }

  private loadFechasBLData(): void {
    if (!this.blId) {
      this.loading = false;
      return;
    }

    this.fechasBLService.getFechasByBlId(Number(this.blId)).subscribe({
      next: (fechasBL: FechasBL) => {
        console.log('Datos de FechasBL cargados:', fechasBL);
        this.populateForm(fechasBL);
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error al cargar los datos de FechasBL', error);
        this.loading = false;
      }
    });
  }

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
  
  private populateForm(fechasBL: FechasBL): void {
    const formPatch: { [key: string]: string | null } = {};
    this.etapas.forEach(etapa => {
      const fieldValue = fechasBL[etapa.campo as keyof FechasBL];
      if (fieldValue) {
        const dateValue = new Date(fieldValue as string | Date);
        if (!isNaN(dateValue.getTime())) {
          formPatch[etapa.campo] = dateValue.toISOString().split('T')[0];
        } else {
          formPatch[etapa.campo] = null;
        }
      } else {
        formPatch[etapa.campo] = null;
      }
    });
    this.fechasForm.patchValue(formPatch);
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
          this.loadArchivos(+this.blId!);
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

  downloadFile(archivo: ArchivoBl): void {
    const url = `${this.blService.getApiUrl()}/download/${archivo.id}`;
    window.open(url, '_blank');
  }

  getDownloadUrl(archivo: ArchivoBl): string {
    return `${this.blService.getApiUrl()}/download/${archivo.id}`;
  }
  
  viewFile(archivo: ArchivoBl): void {
    const url = `${this.blService.getApiUrl()}/view/${archivo.id}`;
    this.fileUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    const modalElement = document.getElementById('viewFileModal');
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  isViewable(tipoArchivo: string): boolean {
    return tipoArchivo.includes('pdf') || tipoArchivo.includes('image');
  }

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

  // Método onSubmit corregido
onSubmit(): void {
  if (this.fechasForm.valid && this.blId) {
    this.loading = true;
    
    // Procesar los datos del formulario antes de enviar
    const formData = this.fechasForm.value;
    const processedData = this.processFormDataForSubmission(formData);
    
    console.log('Datos procesados para envío:', processedData); // Para debugging
    
    this.fechasBLService.updateFechasBL(Number(this.blId), processedData).subscribe({
      next: (response) => {
        console.log('Respuesta del servidor:', response);
        this.loading = false;
        this.router.navigate(['/dashboardblVhcr']);
      },
      error: (error: any) => {
        console.error('Error al actualizar las fechas del BL', error);
        if (error.status === 404) {
          this.createNewRecord(processedData);
        } else {
          this.loading = false;
        }
      }
    });
  }
}

// Nuevo método para procesar datos específicamente para el envío
private processFormDataForSubmission(formData: any): Partial<FechasBL> {
  const processedData: any = {};
  
  // Agregar idbl si está disponible
  if (this.blId) {
    processedData.idbl = Number(this.blId);
  }
  
  // Procesar cada campo de fecha
  Object.keys(formData).forEach(key => {
    const value = formData[key];
    
    if (value && value !== '') {
      // Si el valor es una cadena de fecha válida
      if (typeof value === 'string') {
        // Crear fecha usando solo la fecha (sin conversiones de zona horaria)
        const parts = value.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // Los meses en JS van de 0-11
          const day = parseInt(parts[2]);
          const dateValue = new Date(year, month, day);
          processedData[key] = dateValue.toISOString();
        }
      } 
      // Si ya es un objeto Date
      else if (value instanceof Date && !isNaN(value.getTime())) {
        // Crear nueva fecha usando solo año, mes, día para evitar problemas de zona horaria
        const localDate = new Date(value.getFullYear(), value.getMonth(), value.getDate());
        processedData[key] = localDate.toISOString();
      }
    }
    // Si el valor está vacío o es null, enviamos null explícitamente
    else if (value === '' || value === null || value === undefined) {
      processedData[key] = null;
    }
  });
  
  return processedData;
}

// Método original processFormData actualizado (para uso interno)
private processFormData2(formData: Partial<FechasBL>): Partial<FechasBL> {
  const processedData: Partial<FechasBL> = { ...formData };
  
  for (const key in processedData) {
    if (processedData.hasOwnProperty(key) && key !== 'id' && key !== 'idbl') {
      const value = processedData[key as keyof FechasBL];
      
      if (typeof value === 'string' && value.trim() !== '') {
        const dateValue = new Date(value);
        if (!isNaN(dateValue.getTime())) {
          processedData[key as keyof FechasBL] = dateValue as any;
        }
      } else if (value === '' || value === null || value === undefined) {
        processedData[key as keyof FechasBL] = null as any;
      }
    }
  }
  
  return processedData;
}


  onSubmitBl(): void {
    if (this.blForm.valid && this.id) {
      this.loading = true;
      const blData = {
        nombre: this.blForm.value.nombre,
        estado: this.blForm.value.estado
      };
      this.blService.updateBl(this.id, blData).subscribe({
        next: () => {
          this.successMessage = 'Información del BL actualizada correctamente.';
          this.loading = false;
          this.goBack();
        },
        error: (error: any) => {
          console.error('Error al actualizar el BL:', error);
          this.errorMessage = 'Error al actualizar el BL. ' + (error.error?.message || error.message);
          this.loading = false;
        }
      });
    }
  }

  private createNewRecord(data: Partial<FechasBL>): void {
    this.fechasBLService.createFechasBL(data).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboardblVhcr']);
      },
      error: (createError: any) => {
        console.error('Error al crear las fechas del BL', createError);
        this.loading = false;
      }
    });
  }

  private processFormData(formData: Partial<FechasBL>): Partial<FechasBL> {
    const processedData: Partial<FechasBL> = { ...formData };
    for (const key in processedData) {
      if (processedData.hasOwnProperty(key) && key !== 'id' && key !== 'idbl') {
        const value = processedData[key as keyof FechasBL];
        if (typeof value === 'string' && value.trim() !== '') {
          const dateValue = new Date(value);
          if (!isNaN(dateValue.getTime())) {
            processedData[key as keyof FechasBL] = dateValue as any;
          }
        } else if (value === '' || value === null || value === undefined) {
          processedData[key as keyof FechasBL] = null as any;
        }
      }
    }
    return processedData;
  }

  isFechaCompleta(campo: string): boolean {
    const value = this.fechasForm.get(campo)?.value;
    return value !== null && value !== '' && value !== undefined;
  }

  getEstadoEtapa(campo: string): string {
    return this.isFechaCompleta(campo) ? 'completado' : 'pendiente';
  }

  goBack(): void {
    this.router.navigate(['/dashboardblVhcr']);
  }
  
  trackByEtapa(index: number, etapa: any): string {
    return etapa.campo;
  }
}