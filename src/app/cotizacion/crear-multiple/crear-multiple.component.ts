import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormArray, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Usuario } from 'src/app/models/usuario';
import { AuthService } from 'src/app/services/auth.service';
import { CotizacionService } from 'src/app/services/cotizacion.service';
import { ProveedorService } from 'src/app/services/proveedor.service';

interface Proveedor {
  id: number;
  nombre: string;
  inicial?: string;
}

@Component({
  selector: 'app-crear-multiple',
  templateUrl: './crear-multiple.component.html',
  styleUrls: ['./crear-multiple.component.css']
})
export class CrearMultipleComponent implements OnInit {
  cotizacionForm!: FormGroup;
  isLoading: boolean = false;
  usuario: Usuario | null = null;
  idus = 0;
  allProveedores: Proveedor[] = [];
  proveedoresSeleccionados: Proveedor[] = [];
  loading = false;
  
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private proveedorService: ProveedorService,
    private cotizacionService: CotizacionService
  ) {
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      this.idus = Number(this.usuario?.id);
    });
  }

  ngOnInit(): void {
    this.loadProveedores();
    this.initForm();
  }

  loadProveedores(): void {
    this.loading = true;
    this.proveedorService.getProveedor().subscribe({
      next: (data: any) => {
        this.allProveedores = data.map((prov: any) => ({
          ...prov,
          inicial: this.obtenerInicial(prov.nombre)
        }));
        console.log('Proveedores cargados:', this.allProveedores);
        this.loading = false;
      },
      error: (e) => {
        console.error(e);
        this.loading = false;
        this.mostrarToast('Error al cargar proveedores', 'error');
      }
    });
  }

  initForm(): void {
  this.cotizacionForm = this.fb.group({
    Cotigeneral: ['', [Validators.required, Validators.maxLength(20)]],
    proveedoresIds: this.fb.array([], Validators.required),
    fechaSolicitud: [this.getCurrentDateTime(), Validators.required],  // ✅ fecha actual
    estadoCotizacion: [{ value: 'Solicitada', disabled: true }, Validators.required],
    referenciaSolicitud: ['', Validators.maxLength(50)],
    observacionesSolicitud: [''],
    usuario: this.idus
  });
}

// ✅ Agregar este método
getCurrentDateTime(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

  get proveedoresIdsArray(): FormArray {
    return this.cotizacionForm.get('proveedoresIds') as FormArray;
  }

  obtenerInicial(nombreProveedor: string): string {
    if (!nombreProveedor) return 'X';
    
    // Obtener las primeras letras de cada palabra
    const palabras = nombreProveedor.trim().split(/\s+/);
    
    if (palabras.length === 1) {
      // Si es una sola palabra, tomar las primeras 2 letras
      return nombreProveedor.substring(0, 2).toUpperCase();
    } else {
      // Si son múltiples palabras, tomar la primera letra de cada palabra (máximo 3)
      return palabras
        .slice(0, 3)
        .map(p => p.charAt(0))
        .join('')
        .toUpperCase();
    }
  }

  toggleProveedor(proveedor: Proveedor, event: any): void {
    const isChecked = event.target.checked;
    
    if (isChecked) {
      this.proveedoresIdsArray.push(this.fb.control(proveedor.id));
      this.proveedoresSeleccionados.push(proveedor);
    } else {
      const index = this.proveedoresIdsArray.controls.findIndex(
        control => control.value === proveedor.id
      );
      if (index !== -1) {
        this.proveedoresIdsArray.removeAt(index);
      }
      
      const provIndex = this.proveedoresSeleccionados.findIndex(
        p => p.id === proveedor.id
      );
      if (provIndex !== -1) {
        this.proveedoresSeleccionados.splice(provIndex, 1);
      }
    }
  }

  isProveedorSeleccionado(proveedorId: number): boolean {
    return this.proveedoresIdsArray.controls.some(
      control => control.value === proveedorId
    );
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.cotizacionForm.get(fieldName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  generarNombreCotizacion(nombreBase: string, proveedor: Proveedor): string {
    const inicial = proveedor.inicial || this.obtenerInicial(proveedor.nombre);
    return `${inicial}-${nombreBase}`;
  }

  guardarCotizaciones(): void {
    if (this.cotizacionForm.valid && this.proveedoresIdsArray.length > 0) {
      const formValue = this.cotizacionForm.getRawValue(); 
      const nombreBase = formValue.Cotigeneral;
      
      // Convertir fecha a ISO
      let fechaISO = '';
      if (formValue.fechaSolicitud) {
        try {
          fechaISO = new Date(formValue.fechaSolicitud).toISOString();
        } catch (e) {
          console.error("Error al convertir fecha:", e);
          this.mostrarToast('Error en el formato de fecha', 'error');
          return;
        }
      }

      this.isLoading = true;

      // Crear un array de observables para guardar cada cotización
         const requests = this.proveedoresSeleccionados.map(proveedor => {
        const nombreCotizacion = this.generarNombreCotizacion(nombreBase, proveedor);
        
        const cotizacionData: any = {
          Cotigeneral: nombreBase,
          codigoCot: nombreCotizacion, // Usar el mismo nombre para codigoCot
          proveedorId: proveedor.id,
          fechaSolicitud: fechaISO,
          estadoCotizacion: formValue.estadoCotizacion,
          referenciaSolicitud: formValue.referenciaSolicitud || '',
          referenciaProveedor: '', // Campo vacío inicialmente
          observacionesSolicitud: formValue.observacionesSolicitud || '',
          observacionesRespuesta: '', // Campo vacío inicialmente
          usuario: this.idus
        };

        return this.cotizacionService.createCotizacion(cotizacionData);
      });

      // Ejecutar todas las peticiones en paralelo
      forkJoin(requests)
        .pipe(finalize(() => {
          this.isLoading = false;
        }))
        .subscribe({
          next: (responses) => {
            const cantidad = responses.length;
            this.mostrarToast(
              `Se crearon exitosamente ${cantidad} cotización(es)`,
              'success'
            );
            
            // Redirigir al dashboard después de 2 segundos
            setTimeout(() => {
              this.router.navigate(['/dashboardcot']);
            }, 2000);
          },
          error: (error: any) => {
            let errorMsg = 'Ocurrió un error al guardar las cotizaciones.';
            
            if (error.error) {
              if (error.error.error) {
                errorMsg = error.error.error;
              } else if (error.error.message) {
                errorMsg = error.error.message;
              } else if (typeof error.error === 'string') {
                errorMsg = error.error;
              }
            }

            this.mostrarToast(errorMsg, 'error');
            console.error('Error completo:', error);
          }
        });
    } else {
      Object.keys(this.cotizacionForm.controls).forEach(key => {
        const control = this.cotizacionForm.get(key);
        if (control) {
          control.markAsTouched();
        }
      });

      if (this.proveedoresIdsArray.length === 0) {
        this.mostrarToast('Debe seleccionar al menos un proveedor', 'warning');
      } else {
        this.mostrarToast('Por favor complete todos los campos requeridos', 'warning');
      }
    }
  }

  mostrarToast(mensaje: string, tipo: 'success' | 'error' | 'warning'): void {
    const colores = {
      success: '#4CAF50',
      error: '#e62c17',
      warning: '#ffc107'
    };

    const textColor = tipo === 'warning' ? '#343a40' : 'white';
    const duracion = tipo === 'error' ? 7000 : tipo === 'warning' ? 5000 : 3000;

    const toast = document.createElement('div');
    toast.innerText = mensaje;
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.backgroundColor = colores[tipo];
    toast.style.color = textColor;
    toast.style.padding = '15px 20px';
    toast.style.borderRadius = '4px';
    toast.style.zIndex = '9999';
    toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    toast.style.fontFamily = 'Arial, sans-serif';
    toast.style.transition = 'opacity 0.5s ease';
    toast.style.opacity = '1';
    toast.style.maxWidth = '400px';

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        toast.remove();
      }, 500);
    }, duracion);
  }

  cancelar(): void {
    this.router.navigate(['/dashboardcot']);
  }

  individual(): void {
    this.router.navigate(['/crearcot']);
  }

  excel(): void {
    this.router.navigate(['/detallexcelcot']);
  }
}