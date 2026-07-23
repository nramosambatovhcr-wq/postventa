import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { BlService, BlModel } from '../../services/bl.service'; // Ajusta la ruta según tu estructura
import { Router } from '@angular/router'; // Si necesitas redirigir


@Component({
  selector: 'app-blprocreate',
  templateUrl: './blprocreate.component.html',
  styleUrls: ['./blprocreate.component.css']
})
export class BlprocreateComponent implements OnInit, OnDestroy {
  // Cambiar las propiedades individuales por un objeto blForm
  blForm: BlModel = {
    nombre: '',
    estado: ''
  };

  // Mantener las propiedades originales para el template (getter/setter)
  get blName(): string {
    return this.blForm.nombre;
  }

  set blName(value: string) {
    this.blForm.nombre = value;
  }

  get blEstado(): string {
    return this.blForm.estado;
  }

  set blEstado(value: string) {
    this.blForm.estado = value;
  }

  isSavingBl: boolean = false;
  showSuccessMessage: boolean = false;
  showErrorMessage: boolean = false;
  showValidationErrors: boolean = false;
  errorMessage: string = '';

  private subscription: Subscription = new Subscription();

  constructor(
    private blService: BlService,
    private router: Router // Opcional, si necesitas redirigir
  ) {}

  ngOnInit(): void {
    console.log('Componente BL Create inicializado');
    console.log('Estado inicial blForm:', this.blForm);
  }

  private validateForm(): boolean {
    let isValid = true;
    this.showValidationErrors = true;
    this.hideNotifications();

    if (!this.blForm.nombre || this.blForm.nombre.trim().length === 0) {
      this.showNotification('Por favor, ingresa el nombre del BL.', 'error');
      isValid = false;
    }

    if (!this.blForm.estado || this.blForm.estado === '') {
      this.showNotification('Por favor, selecciona el estado del BL.', 'error');
      isValid = false;
    }

    return isValid;
  }

  resetForm(): void {
    this.blForm = {
      nombre: '',
      estado: ''
    };
    this.showValidationErrors = false;
    this.hideNotifications();
    console.log('Formulario BL reiniciado');
  }

  get isFormValid(): boolean {
    const isValid = !!(
      this.blForm.nombre && 
      this.blForm.nombre.trim().length > 0 && 
      this.blForm.estado && 
      this.blForm.estado !== ''
    );
    console.log('Form validation:', {
      blForm: this.blForm,
      isValid: isValid
    });
    return isValid;
  }

  onSelectChange(event: any): void {
    const value = event.target.value;
    console.log('Select changed to:', value);
    this.blForm.estado = value;
  }

  // Método principal usando el servicio
  createBl(): void {
    if (!this.blForm.nombre || !this.blForm.estado) {
      this.showNotification('Por favor, complete todos los campos', 'error');
      return;
    }

    this.isSavingBl = true;
    this.hideNotifications();

    this.subscription.add(
      this.blService.createBl(this.blForm).subscribe({
        next: (response) => {
          console.log('BL creado:', response);
          this.isSavingBl = false;
          this.showNotification('BL creado exitosamente', 'success');
          
          // Resetear formulario después de crear exitosamente
          setTimeout(() => {
            this.resetForm();
            // Opcional: redirigir a la lista de BLs
             this.router.navigate(['/dashboardbl']);
          }, 2000);
        },
        error: (error) => {
          console.error('Error al crear el BL:', error);
          this.isSavingBl = false;
          
          let errorMsg = 'Error al crear el registro';
          if (error.error?.message) {
            errorMsg = error.error.message;
          } else if (error.message) {
            errorMsg = error.message;
          } else if (typeof error.error === 'string') {
            errorMsg = error.error;
          }
          
          this.showNotification(errorMsg, 'error');
        }
      })
    );
  }

  // Método que se llama desde el template
  saveBl(): void {
    console.log('Intentando guardar BL...');
    console.log('blForm:', this.blForm);
    
    if (!this.validateForm()) {
      console.log('Formulario no válido');
      return;
    }

    this.createBl();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private hideNotifications(): void {
    this.showSuccessMessage = false;
    this.showErrorMessage = false;
    this.errorMessage = '';
  }

  showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.hideNotifications();

    if (type === 'success') {
      this.showSuccessMessage = true;
    } else if (type === 'error') {
      this.showErrorMessage = true;
      this.errorMessage = message;
    }

    setTimeout(() => {
      this.hideNotifications();
    }, 5000);
  }

  logCurrentValues(): void {
    console.log('Current values:', this.blForm);
  }
}