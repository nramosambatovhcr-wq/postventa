import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Usuario } from 'src/app/models/usuario';
import { AuthService } from 'src/app/services/auth.service';
 
import { ReloadService } from 'src/app/services/reload.service';
import { Subscription } from 'rxjs';
import { InvoiceBlModel, BlService } from 'src/app/services/bl.service';
import { CotizacionService } from 'src/app/services/cotizacion.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Interfaz para los ítems de detalle dentro de un InvoiceBL
interface DetalleInvoiceblItem {
  id: number;
  invoiceblId: number;
  producto_Id?: number;
  codigo: string;
  descripcion: string;
  chino?: string;
  cantidad: number;
  precio_Unitario: number;
  subtotal: number;
  impuesto: number;
  total: number;
}

// Interfaz para la respuesta detallada de un InvoiceBL
interface InvoiceBlDetailResponse {
  id: number;
  invoiceNumber: string;
  blNumber: string;
  description?: string;
  creationDate: string;
  status: string;
  detalleInvoiceblItems?: DetalleInvoiceblItem[];
}


@Component({
  selector: 'app-blvhcrinvoice',
  templateUrl: './blvhcrinvoice.component.html',
  styleUrls: ['./blvhcrinvoice.component.css']
})
export class BlvhcrinvoiceComponent implements OnInit, OnDestroy {
  // Modelo para los datos del formulario de InvoiceBL
  blForm: InvoiceBlModel = {
    ordenid: 0,
    invoicebl: '',
    bl: '', // CAMBIO CLAVE: Inicializado a 0 (number)
    contenedor: '',
    liquidacion: '',
    estado: '',
    idbl: 0
  };

  loading: boolean = false;
  allData: any[] = []; // Datos para el select de órdenes
  usuario: any;
  id: any;
  idbl:any;
  bls: any[] = []; // Datos para el select de BL
  showDebugInfo: boolean = true; // Cambiar a false en producción
  private subscription: Subscription = new Subscription();

  isSavingBl: boolean = false;
  showSuccessMessage: boolean = false;
  showErrorMessage: boolean = false;
  showValidationErrors: boolean = false;
  errorMessage: string = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    private blService: BlService,
    private reloadService: ReloadService,
    private cotizacionService: CotizacionService
  ) { }

  ngOnInit(): void {
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      console.log('Usuario actual:', this.usuario);
      if (this.usuario != null) {
        this.id = this.usuario.id;
        console.log('ID usuario:', this.id);
        this.loadInitialData(); // Carga las órdenes
        this.loadAllBls();     // Carga los BLs
      }
    });

    this.subscription.add(
      this.reloadService.reload$.subscribe(() => {
        this.loadInitialData();
        this.loadAllBls();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  resetForm(): void {
    this.blForm = {
      ordenid: 0,
      invoicebl: '',
      bl: '', // CAMBIO CLAVE: Reseteado a 0
      contenedor: '',
      liquidacion: '',
      estado: '',
      idbl: 0
    };
    this.showValidationErrors = false;
    this.hideNotifications();
    console.log('Formulario InvoiceBL reiniciado');
  }

  // Método para guardar el InvoiceBL
  saveIBl(): void {
    console.log(this.blForm);
    this.blForm.idbl=this.idbl;
    console.log(this.idbl);
    
    console.log('Intentando guardar InvoiceBL...');
    console.log('blForm:', this.blForm);

    if (!this.validateForm()) {
      return;
    }

    this.isSavingBl = true;
    this.hideNotifications();

    // Preparar datos para envío
    const invoiceBlData = {
      ...this.blForm,
      // Asegurar que ordenid y idbl sean números (aunque ngModel para number ya lo hace, es buena práctica)
      ordenid: Number(this.blForm.ordenid),
      idbl: Number(this.blForm.idbl)
    };

    console.log('Datos a enviar:', invoiceBlData);

    this.blService.createInvoiceBl(invoiceBlData).subscribe({
      next: (response) => {
        console.log('InvoiceBL guardado exitosamente:', response);
        this.isSavingBl = false;
        this.showNotification('InvoiceBL guardado exitosamente.', 'success');
        this.resetForm();
        // Opcional: redirigir o actualizar una lista
        // this.router.navigate(['/dashboardinvoicebl']);
      },
      error: (error) => {
        console.error('Error al guardar InvoiceBL:', error);
        this.isSavingBl = false;
        let errorMsg = 'Error desconocido al guardar el InvoiceBL.';
        if (error.error && error.error.message) {
          errorMsg = error.error.message;
        } else if (error.message) {
          errorMsg = error.message;
        }
        this.showNotification(`Error: ${errorMsg}`, 'error');
      }
    });
  }

  // Método de validación del formulario
  private validateForm(): boolean {
    let isValid = true;
    this.showValidationErrors = true;
    this.hideNotifications();

    // Validaciones requeridas
    if (!this.blForm.ordenid || this.blForm.ordenid <= 0) {
      this.showNotification('Por favor, selecciona una orden válida.', 'error');
      isValid = false;
    }
    if (!this.blForm.invoicebl || this.blForm.invoicebl.trim().length === 0) {
      this.showNotification('Por favor, ingresa el nombre de InvoiceBL.', 'error');
      isValid = false;
    }
    if (!this.blForm.estado || this.blForm.estado.trim().length === 0) {
      this.showNotification('Por favor, selecciona el estado de InvoiceBL.', 'error');
      isValid = false;
    }
    if (!this.blForm.idbl || this.blForm.idbl <= 0) {
      this.showNotification('Por favor, ingresa un ID de BL válido.', 'error');
      isValid = false;
    }

    console.log('Validación del formulario:', {
      ordenid: this.blForm.ordenid,
      invoicebl: this.blForm.invoicebl,
      estado: this.blForm.estado,
      idbl: this.blForm.idbl,
      isValid: isValid
    });

    return isValid;
  }

  // Carga las órdenes disponibles para el select de "ID de Orden"
  loadInitialData(): void {
    this.loading = true;
    console.log('Cargando datos iniciales (órdenes)...');
    
    this.cotizacionService.getInvoice2().subscribe({
      next: (data: any) => {
        console.log('Datos de órdenes cargados:', data);
        this.allData = Array.isArray(data) ? data : [];
        
        // Asegurar que cada orden tenga ordenid como número
        this.allData = this.allData.map(orden => ({
          ...orden,
          ordenid: Number(orden.ordenid) || 0
        }));
        
        console.log('Órdenes procesadas:', this.allData);
      },
      error: (error) => {
        console.error('Error fetching invoice data (órdenes):', error);
        this.showNotification('Error al cargar las órdenes. Por favor, revisa la conexión al servicio.', 'error');
        this.allData = []; // Vacía los datos en caso de error
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  // Carga todos los BLs disponibles para el select de "BL"
  loadAllBls(): void {
    this.loading = true;
    console.log('Cargando BLs...');
    
    this.blService.getAllBl1().subscribe({
      next: (data) => {
        console.log('BLs cargados:', data);
        this.bls = Array.isArray(data) ? data : [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar los BLs:', error);
        this.showNotification('Error al cargar los BLs. Por favor, revisa la conexión al servicio.', 'error');
        this.bls = []; // Vacía los BLs en caso de error
        this.loading = false;
      }
    });
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

  // Getter para verificar si el formulario es válido
  get isFormValid(): boolean {
    const valid = !!(
      this.blForm.ordenid && 
      this.blForm.ordenid > 0 &&
      this.blForm.invoicebl && 
      this.blForm.invoicebl.trim().length > 0 &&
      this.blForm.estado && 
      this.blForm.estado.trim().length > 0 
    );
    
    console.log('isFormValid:', valid, {
      ordenid: this.blForm.ordenid,
      invoicebl: this.blForm.invoicebl,
      estado: this.blForm.estado,
      idbl: this.blForm.idbl
    });
    return valid;
  }

  // Métodos para manejar cambios en los selects
  onOrdenChange(): void {
    // Convertir a número para asegurar comparación correcta
    this.blForm.ordenid = Number(this.blForm.ordenid);
    console.log('Orden seleccionada:', this.blForm.ordenid);
    
    // Buscar la orden seleccionada para obtener más información si es necesario
    const ordenSeleccionada = this.allData.find(orden => orden.ordenid === this.blForm.ordenid);
    if (ordenSeleccionada) {
      console.log('Detalles de la orden seleccionada:', ordenSeleccionada);
    }
  }

  onEstadoChange(): void {
    console.log('Estado seleccionado:', this.blForm.estado);
  }

  onBlChange(): void {
    console.log('BL seleccionado:', this.blForm.bl);
    
    // Buscar el BL seleccionado para obtener más información si es necesario
    // Ya no es necesario Number(this.blForm.bl) si blForm.bl es tipo number
    const blSeleccionado = this.bls.find(bl => bl.id === this.blForm.bl); 
    this.idbl=this.blForm.bl;
    if (blSeleccionado) {
      console.log('Detalles del BL seleccionado:', blSeleccionado);
    }
  }

  onLiquidacionChange(): void {
    console.log('Liquidación seleccionada:', this.blForm.liquidacion);
  }

  // Método para obtener el texto de la orden seleccionada (para depuración o visualización)
  getOrdenText(): string {
    if (!this.blForm.ordenid || this.blForm.ordenid === 0) {
      return 'Seleccione una orden...';
    }
    
    const orden = this.allData.find(o => o.ordenid === this.blForm.ordenid);
    return orden ? `${orden.invoice} (ID: ${orden.ordenid})` : `ID: ${this.blForm.ordenid}`;
  }

  // Método para obtener el texto del BL seleccionado (para depuración o visualización)
  getBlText(): string {
    if (!this.blForm.bl || this.blForm.bl === '') { // CAMBIO CLAVE: Comparación con 0
      return 'Seleccione un BL...';
    }
    
    const bl = this.bls.find(b => b.id === this.blForm.bl); // Ya no se convierte a Number
    return bl ? bl.nombre : `ID: ${this.blForm.bl}`;
  }
}