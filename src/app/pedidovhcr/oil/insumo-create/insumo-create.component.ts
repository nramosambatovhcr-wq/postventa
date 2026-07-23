import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Usuario } from 'src/app/models/usuario';
import { AuthService } from 'src/app/services/auth.service';
import { OilService } from 'src/app/services/oil.service';
 
import { ReloadService } from 'src/app/services/reload.service';
import { forkJoin, Observable } from 'rxjs'; // Import forkJoin and Observable
import { finalize } from 'rxjs/operators'; // Import finalize for loading state management
import { ProveedoroilService } from 'src/app/services/proveedoroil.service';

// Define the Oil model (can be in a separate models/oil.ts file)
export interface Insumo {
  codigo: string;
  descripcion: string;
  idProveedor: number;
  estado?: string;
  presentacion?: string; // This will now be a single presentation per API call
}

// Define the ProveedorOil model (can be in a separate models/proveedor-oil.ts file)
export interface ProveedorInsumo {
  idProveedor: number;
  nombreProveedor: string;
}

@Component({
  selector: 'app-insumo-create',
  templateUrl: './insumo-create.component.html',
  styleUrls: ['./insumo-create.component.css']
})
export class InsumoCreateComponent implements OnInit {
  oilForm: FormGroup;
  usuario: Usuario | null = null;
  loading = false;
  submitted = false;
  submitSuccess = false;
  errorMessage = '';
  proveedores: ProveedorInsumo[] = [];

  estados: string[] = ['activo', 'inactivo', 'mantenimiento'];
  presentaciones: string[] = ['unidad', 'caja'];

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private oilService: OilService,
    private proveedorOilService: ProveedoroilService,
    private reloadService: ReloadService,
    private authService: AuthService
  ) {
    this.oilForm = this.formBuilder.group({
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
    return this.oilForm.controls;
  }

  get presentacionFormArray() {
    return this.oilForm.get('presentacion') as FormArray;
  }

  private addPresentacionCheckboxes(): void {
    this.presentaciones.forEach(() => this.presentacionFormArray.push(new FormControl(false)));
  }

  onPresentacionChange(event: any): void {
    const selectedPresentaciones = this.presentacionFormArray;
    if (event.target.checked) {
      // Add the value if checked
      selectedPresentaciones.push(new FormControl(event.target.value));
    } else {
      // Remove the value if unchecked
      const index = selectedPresentaciones.controls.findIndex(x => x.value === event.target.value);
      if (index !== -1) {
        selectedPresentaciones.removeAt(index);
      }
    }
    this.presentacionFormArray.markAsTouched();
  }

  loadProveedores(): void {
    this.proveedorOilService.getProveedoresInsumo().subscribe({
      next: (data: ProveedorInsumo[]) => {
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

    if (this.oilForm.invalid) {
      return;
    }

    this.loading = true;

    // Get the actual selected presentation values (strings)
    const selectedPresentaciones: string[] = this.presentacionFormArray.controls
      .filter(control => control.value !== false) // Filter out unchecked controls
      .map(control => control.value); // Map to their actual string values

    if (selectedPresentaciones.length === 0) {
      this.errorMessage = 'Debe seleccionar al menos una presentación.';
      this.loading = false;
      return;
    }

    const apiCalls: Observable<any>[] = [];

    // Create a separate API call for each selected presentation
    selectedPresentaciones.forEach(presentation => {
      const oilInsumo: Insumo = {
        codigo: this.oilForm.value.codigo,
        descripcion: this.oilForm.value.descripcion,
        idProveedor: this.oilForm.value.idProveedor,
        estado: this.oilForm.value.estado,
        presentacion: presentation // Send one presentation per call
      };
      apiCalls.push(this.oilService.createInsumo(oilInsumo));
    });

    // Use forkJoin to wait for all API calls to complete
    forkJoin(apiCalls).pipe(
      finalize(() => {
        this.loading = false; // Ensure loading is set to false after all calls complete
      })
    ).subscribe({
      next: (responses: any[]) => {
        // All calls succeeded
        this.handleSuccess('Aceites creados exitosamente para todas las presentaciones seleccionadas.');
      },
      error: (error) => {
        // At least one call failed
        console.error('Error creating one or more oils:', error);
        this.errorMessage = `Error al crear uno o más aceites: ${error.error || error.message || 'Error desconocido'}`;
      }
    });
  }

  handleSuccess(message: string = "Operación completada exitosamente"): void {
    this.loading = false;
    this.submitSuccess = true;
    this.reloadService.triggerReload();

    // Reset form
    this.oilForm.reset({
      estado: 'activo'
    });
    this.submitted = false;

    // Clear the FormArray for presentations and re-add controls for next entry
    while (this.presentacionFormArray.length !== 0) {
      this.presentacionFormArray.removeAt(0);
    }
    this.addPresentacionCheckboxes(); // Re-add controls for next entry

    // Show success message as a toast
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
    this.router.navigate(['/oillist']);
  }
}
