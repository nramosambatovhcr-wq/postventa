import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Usuario } from 'src/app/models/usuario';
import { AuthService } from 'src/app/services/auth.service';
import { OilService } from 'src/app/services/oil.service';
import { ReloadService } from 'src/app/services/reload.service';
import { forkJoin, Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ProveedoroilService } from 'src/app/services/proveedoroil.service';


// Define el modelo Vidrio
export interface Vidrio {
  codigo: string;
  descripcion: string;
  idProveedor: number;
  estado?: string;
  presentacion?: string;
}

// Define el modelo ProveedorVidrios
export interface ProveedorVidrio {
  idProveedor: number;
  nombreProveedor: string;
}

@Component({   
  selector: 'app-vidrios-create',  
  templateUrl: './vidrios-create.component.html',
  styleUrls: ['./vidrios-create.component.css']
})
export class VidriosCreateComponent implements OnInit {
  vidriosForm: FormGroup;
  usuario: Usuario | null = null;
  loading = false;
  submitted = false;
  submitSuccess = false;
  errorMessage = '';
  proveedores: ProveedorVidrio[] = [];

  estados: string[] = ['activo', 'inactivo', 'mantenimiento'];
  presentaciones: string[] = ['unidad', 'caja'];

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private vidriosService: OilService,
    private proveedorVidriosService: ProveedoroilService,
    private reloadService: ReloadService,
    private authService: AuthService
  ) {
    this.vidriosForm = this.formBuilder.group({
      codigo: ['', Validators.required],
      descripcion: ['', Validators.required],
      idProveedor: ['', [Validators.required, Validators.min(1)]],
      estado: ['activo', Validators.required],
      presentacion: this.formBuilder.array([], Validators.required)
    });
  }

  ngOnInit(): void {
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
    });

    this.loadProveedores();
    this.addPresentacionCheckboxes();
  }

  get f() {
    return this.vidriosForm.controls;
  }

  get presentacionFormArray() {
    return this.vidriosForm.get('presentacion') as FormArray;
  }

  private addPresentacionCheckboxes(): void {
    this.presentaciones.forEach(() => this.presentacionFormArray.push(new FormControl(false)));
  }

  onPresentacionChange(event: any): void {
    const selectedPresentaciones = this.presentacionFormArray;
    if (event.target.checked) {
      selectedPresentaciones.push(new FormControl(event.target.value));
    } else {
      const index = selectedPresentaciones.controls.findIndex(x => x.value === event.target.value);
      if (index !== -1) {
        selectedPresentaciones.removeAt(index);
      }
    }
    this.presentacionFormArray.markAsTouched();
  }

  loadProveedores(): void {
    this.proveedorVidriosService.getProveedoresVidrios().subscribe({
      next: (data: ProveedorVidrio[]) => {
        this.proveedores = data;
      },
      error: (error) => {
        console.error('Error loading proveedores:', error);
        this.errorMessage = 'Error al cargar la lista de proveedores.';
      }
    });
  }

  onSubmit(): void {
    this.submitted = true;
    this.submitSuccess = false;
    this.errorMessage = '';

    if (this.vidriosForm.invalid) {
      return;
    }

    this.loading = true;

    const selectedPresentaciones: string[] = this.presentacionFormArray.controls
      .filter(control => control.value !== false)
      .map(control => control.value);

    if (selectedPresentaciones.length === 0) {
      this.errorMessage = 'Debe seleccionar al menos una presentación.';
      this.loading = false;
      return;
    }

    const apiCalls: Observable<any>[] = [];

    selectedPresentaciones.forEach(presentation => {
      const vidrioData: Vidrio = {
        codigo: this.vidriosForm.value.codigo,
        descripcion: this.vidriosForm.value.descripcion,
        idProveedor: this.vidriosForm.value.idProveedor,
        estado: this.vidriosForm.value.estado,
        presentacion: presentation
      };
      apiCalls.push(this.vidriosService.createVidrio(vidrioData));
    });

    forkJoin(apiCalls).pipe(
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: (responses: any[]) => {
        this.handleSuccess('Vidrios creados exitosamente para todas las presentaciones seleccionadas.');
      },
      error: (error) => {
        console.error('Error creating one or more vidrios:', error);
        this.errorMessage = `Error al crear uno o más vidrios: ${error.error || error.message || 'Error desconocido'}`;
      }
    });
  }

  handleSuccess(message: string = "Operación completada exitosamente"): void {
    this.loading = false;
    this.submitSuccess = true;
    this.reloadService.triggerReload();

    this.vidriosForm.reset({
      estado: 'activo'
    });
    this.submitted = false;

    while (this.presentacionFormArray.length !== 0) {
      this.presentacionFormArray.removeAt(0);
    }
    this.addPresentacionCheckboxes();

    const toast = document.createElement('div');
    toast.innerText = message;
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.backgroundColor = '#4CAF50';
    toast.style.color = 'white';
    toast.style.padding = '15px 20px';
    toast.style.borderRadius = '4px';
    toast.style.zIndex = '9999';
    toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';

    document.body.appendChild(toast);

    setTimeout(() => {
      document.body.removeChild(toast);
    }, 3000);
  }

  cancelar(): void {
    this.router.navigate(['/vidrioslist']);
  }
}