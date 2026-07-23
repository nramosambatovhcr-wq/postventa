import { Component, OnInit, OnDestroy } from '@angular/core';
import { Cotizacion, CotizacionService } from '../../services/cotizacion.service'; // Assuming this service exists
import { PedidobodegaService } from '../../services/pedidobodega.service'; // To save the invoice
import { Subscription, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Router } from '@angular/router'; // For navigation after saving
import { AuthService } from 'src/app/services/auth.service';
import { Usuario } from 'src/app/models/usuario';

@Component({
  selector: 'app-crearinvoipro',
  templateUrl: './crearinvoipro.component.html',
  styleUrls: ['./crearinvoipro.component.css']
})
export class CrearinvoiproComponent implements OnInit, OnDestroy {
  cotizaciones: Cotizacion[] = [];
  filteredCotizaciones: any[] = [];
  selectedCotizacionId: number | null = null;
  selectedCotName: string | null = null;
  invoiceCode: string = '';
  invoiceName: string = ''; // Assuming 'nombre' is another field for the invoice

  // For searchable select
  searchTermCotizacion: string = '';
  private searchInputSubject = new Subject<string>();
  private subscription: Subscription = new Subscription();

  isLoadingCotizaciones: boolean = false;
  isSavingInvoice: boolean = false;
  showSuccessMessage: boolean = false;
  showErrorMessage: boolean = false;
  showValidationErrors: boolean = false; // Para mostrar errores de validación
  errorMessage: string = '';
  id: number = 0;
  usuario: Usuario | null = null;
  idprov:any;

  constructor(
    private cotizacionService: CotizacionService,
    private pedidobodegaService: PedidobodegaService, // Assuming you use this service to save invoice data
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    // this.usuario = this.authService.getUsuarioActual();
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      console.log(this.usuario);
      if(this.usuario != null){
        this.id = this.usuario.id;
        this.idprov = this.usuario.agencia;
        console.log(this.id);
        this.loadCotizaciones();
      }
    });
    
    this.loadCotizaciones();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  loadCotizaciones(): void {
    this.isLoadingCotizaciones = true;
    this.subscription.add(
      this.cotizacionService.getCotizacionByUserAsigPro(this.idprov).subscribe({
        next: (data: any) => {
          console.log(data);
          
          this.cotizaciones = data;
          this.filterCotizaciones(); // Initial filter
          this.isLoadingCotizaciones = false;
        },
        error: (err) => {
          console.error('Error loading cotizaciones:', err);
          this.isLoadingCotizaciones = false;
          this.showNotification('Error al cargar las cotizaciones. Por favor, intenta nuevamente.', 'error');
        }
      })
    );
  }

  setupSearch(): void {
    this.subscription.add(
      this.searchInputSubject.pipe(
        debounceTime(300), // Wait for 300ms after the last keystroke
        distinctUntilChanged() // Only emit if the current value is different from the last
      ).subscribe(searchTerm => {
        this.searchTermCotizacion = searchTerm;
        this.filterCotizaciones();
      })
    );
  }

  onSearchInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.searchInputSubject.next(inputElement.value);
  }

  filterCotizaciones(): void {
    if (!this.searchTermCotizacion) {
      this.filteredCotizaciones = [...this.cotizaciones];
    } else {
      const lowerCaseSearchTerm = this.searchTermCotizacion.toLowerCase();
      this.filteredCotizaciones = this.cotizaciones.filter((cot: any) =>
        cot.codigo?.toLowerCase().includes(lowerCaseSearchTerm) ||
        cot.codigoCot?.toLowerCase().includes(lowerCaseSearchTerm) ||
        cot.id?.toString().includes(lowerCaseSearchTerm) ||
        cot.cotizacionId?.toString().includes(lowerCaseSearchTerm)
      );
    }
  }

  onCotizacionSelect(event: any): void {
    console.log(event);
    
    //const selectElement = event.target as HTMLSelectElement;
   // const selectedValue = selectElement.value;
   const selectedValue = event;
    
    if (selectedValue && selectedValue !== 'null') {
      this.selectedCotizacionId = parseInt(selectedValue, 10);
      console.log('Cotización seleccionada:', this.selectedCotizacionId);

      
      // Reset validation errors cuando se selecciona una cotización
      this.showValidationErrors = false;
      
      // Opcional: Cargar detalles adicionales de la cotización
      // this.loadCotizacionDetails(this.selectedCotizacionId);
    } else {
      this.selectedCotizacionId = null;
    }
  }

  // Validación mejorada
  private validateForm(): boolean {
    let isValid = true;
    this.showValidationErrors = true;

    if (!this.selectedCotizacionId) {
      this.showNotification('Por favor, selecciona una cotización.', 'error');
      isValid = false;
    }

    if (!this.invoiceCode || this.invoiceCode.trim().length === 0) {
      this.showNotification('Por favor, ingresa el código de la factura.', 'error');
      isValid = false;
    }

    // Validación adicional para el código de factura
    if (this.invoiceCode && this.invoiceCode.trim().length < 3) {
      this.showNotification('El código de factura debe tener al menos 3 caracteres.', 'error');
      isValid = false;
    }

    return isValid;
  }

  // debajo de tus propiedades actuales
get selectedCotizacion(): any {
  return this.filteredCotizaciones.find(c => c.cotizacionId === this.selectedCotizacionId);
}

  saveInvoice(): void {
    // Validar formulario
    if (!this.validateForm()) {
      return;
    }

    this.isSavingInvoice = true;
    this.hideNotifications();

    // Preparar datos para enviar
    const invoiceData = {
      IdCotizacion: this.selectedCotizacionId,
      InvoiceN: this.invoiceCode.trim(),
      nombre_invoice: this.invoiceName.trim() || this.invoiceCode.trim(),
      estado: 'activo',
      fecha_creacion: new Date().toISOString(),
      usuario_id: this.id
    };

    console.log('Datos de factura a guardar:', invoiceData);

    this.subscription.add(
      this.cotizacionService.createInvoice(invoiceData).subscribe({
        next: (response: any) => {
          console.log('Factura guardada exitosamente:', response);
          this.isSavingInvoice = false;
          this.showNotification('Factura guardada exitosamente. Redirigiendo...', 'success');
          
          // Limpiar formulario después de un breve delay
          setTimeout(() => {
            this.resetForm();
            this.router.navigate(['/invoicepro']);
          }, 2000);
        },
        error: (err: any) => {
          console.error('Error saving invoice:', err);
          this.isSavingInvoice = false;
          
          // Manejo de errores más específico
          let errorMsg = 'Error desconocido';
          if (err.error?.message) {
            errorMsg = err.error.message;
          } else if (err.message) {
            errorMsg = err.message;
          } else if (typeof err.error === 'string') {
            errorMsg = err.error;
          }
          
          this.showNotification(`Error al guardar el codigo ya existe`, 'error');
        }
      })
    );
  }

  resetForm(): void {
    this.selectedCotizacionId = null;
    this.invoiceCode = '';
    this.invoiceName = '';
    this.searchTermCotizacion = '';
    this.showValidationErrors = false;
    this.hideNotifications();
    this.filterCotizaciones();
    
    console.log('Formulario reiniciado');
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

    // Auto-hide notifications after 5 seconds
    setTimeout(() => {
      this.hideNotifications();
    }, 5000);
  }

  // Método opcional para cargar detalles de la cotización seleccionada
  private loadCotizacionDetails(cotizacionId: number): void {
    this.subscription.add(
      this.cotizacionService.getCotizacionById(cotizacionId).subscribe({
        next: (cotizacion: any) => {
          console.log('Detalles de cotización cargados:', cotizacion);
          // Aquí puedes manejar los detalles adicionales si es necesario
        },
        error: (err: any) => {
          console.error('Error cargando detalles de cotización:', err);
        }
      })
    );
  }

  // Método para generar código de factura automático (opcional)
  generateInvoiceCode(): void {
    const timestamp = new Date().getTime();
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.invoiceCode = `INV-${timestamp}-${randomSuffix}`;
  }

  // Getter para verificar si el formulario es válido
  get isFormValid(): boolean {
    return !!(this.selectedCotizacionId && this.invoiceCode && this.invoiceCode.trim().length >= 3);
  }
}