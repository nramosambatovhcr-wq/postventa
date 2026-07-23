import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
// Import the new PDI service
import { ReloadService } from '../../services/reload.service'; // Adjust path if necessary
import { AuthService } from '../../services/auth.service'; // Adjust path if necessary
import { Usuario } from '../../models/usuario'; // Adjust path if necessary
import { PedidosPdiService, PedidoPdiData } from 'src/app/services/pedidos-pdi.service';

@Component({
  selector: 'app-pedidopdicreate', // New selector
  templateUrl: './pedidopdicreate.component.html',
  styleUrls: ['./pedidopdicreate.component.css']
})
export class PedidopdicreateComponent implements OnInit {
  pedidoForm: FormGroup;
  usuario: Usuario | null = null;
  loading = false;
  submitted = false;
  submitSuccess = false;
  errorMessage = '';
  selectedFiles: File[] = [];
  previewImages: string[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private pedidosPdiService: PedidosPdiService, // Use the PDI service
    private reloadService: ReloadService,
    private authService: AuthService
  ) {
    this.pedidoForm = this.formBuilder.group({
      codigo: ['', Validators.required],
      descripcion: ['', Validators.required],
      cantidad: ['', [Validators.required, Validators.min(1)]],
      modelo: ['', Validators.required],
      ot: ['', Validators.required],
      chasis: ['', Validators.required],
      cliente: ['vehicentro'],      
      observaciones: [''],
      tipo: ['pdi'] // Set default type to 'pdi'
    });
  }

  ngOnInit(): void {
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
    });
  }

  // Convenience getter for easy access to form fields
  get f() {
    return this.pedidoForm.controls;
  }

  /**
   * Handles file selection for image uploads.
   * @param event The file input change event.
   */
  onFileSelect(event: any): void {
    if (event.target.files.length > 0) {
      const files = event.target.files;
      this.selectedFiles = Array.from(files);

      // Create preview images
      this.previewImages = [];
      for (const file of this.selectedFiles) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.previewImages.push(e.target.result);
        };
        reader.readAsDataURL(file);
      }
    }
  }

  /**
   * Removes a selected file from the list and its preview.
   * @param index The index of the file to remove.
   */
  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.previewImages.splice(index, 1);
  }

  /**
   * Handles the form submission for creating a new PDI order.
   */
  onSubmit(): void {
    this.submitted = true;
    this.submitSuccess = false;
    this.errorMessage = '';

    if (this.pedidoForm.invalid) {
       this.errorMessage = 'faltan items obligatorios.';
      return;
    }

    if (this.selectedFiles.length <= 0) {
      this.errorMessage = 'Debe seleccionar al menos una imagen.';
      return;
    }

    this.loading = true;

    if (!this.usuario) {
      this.errorMessage = 'No hay usuario autenticado. Por favor, inicie sesión.';
      this.loading = false;
      return;
    }

    const pedidoData: PedidoPdiData = {
      ...this.pedidoForm.value,
      IdUsuarioCreacion: this.usuario.id,
      IdUsuarioModificacion: this.usuario.id,
      Tipo: 'pdi' // Ensure type is 'pdi'
    };

    this.pedidosPdiService.createPedidoPdi(pedidoData).subscribe({
      next: (response: any) => {
        const pedidoId = response.id_pedido;

        // If there are files, upload them
        if (this.selectedFiles.length > 0) {
          this.uploadFiles(pedidoId);
        } else {
          this.handleSuccess();
        }
      },
      error: (error) => {
        this.errorMessage = `Error al crear pedido PDI: ${error.message || 'Error desconocido'}`;
        this.loading = false;
        this.showToast(this.errorMessage, 'error');
      }
    });
  }

  /**
   * Uploads selected files for a given PDI order ID.
   * @param pedidoId The ID of the newly created PDI order.
   */
  uploadFiles(pedidoId: number): void {
    this.pedidosPdiService.uploadImagesPdi(pedidoId, this.selectedFiles).subscribe({
      next: () => {
        this.handleSuccess();
      },
      error: (error) => {
        this.errorMessage = `Error al subir imágenes para el pedido PDI: ${error.message || 'Error desconocido'}`;
        this.loading = false;
        this.showToast(this.errorMessage, 'error');
      }
    });
  }

  /**
   * Handles successful form submission and image upload.
   */
  handleSuccess(): void {
    this.loading = false;
    this.submitSuccess = true;
    this.reloadService.triggerReload(); // Trigger reload for the dashboard

    // Reset form and files
    this.pedidoForm.reset({
      tipo: 'pdi' // Reset with default value
    });
    this.submitted = false;
    this.selectedFiles = [];
    this.previewImages = [];

    this.showToast("Pedido PDI creado exitosamente", 'success');
  }

  /**
   * Navigates back to the PDI dashboard.
   */
  cancelar(): void {
    this.router.navigate(['/dashboardpedidospdius']); // Navigate to PDI dashboard
  }

  /**
   * Displays a toast notification.
   * @param message The message to display.
   * @param type The type of toast (success, error, warning).
   */
  private showToast(message: string, type: 'success' | 'error' | 'warning'): void {
    const toast = document.createElement('div');
    toast.innerText = message;
    toast.className = `toast toast-${type}`;

    // Basic inline styles for the toast (can be moved to CSS)
    Object.assign(toast.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: this.getToastColor(type),
      color: 'white',
      padding: '15px 20px',
      borderRadius: '4px',
      zIndex: '9999',
      boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
      opacity: '0',
      transform: 'translateY(-20px)',
      transition: 'all 0.3s ease'
    });

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    }, 10); // Small delay for animation to start

    // Animate out and remove after 3 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-20px)';
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300); // Wait for fade out animation
    }, 3000);
  }

  /**
   * Gets the background color for a toast notification based on its type.
   * @param type The type of toast.
   * @returns The corresponding CSS color string.
   */
  private getToastColor(type: 'success' | 'error' | 'warning'): string {
    switch (type) {
      case 'success':
        return '#4CAF50';
      case 'error':
        return '#F44336';
      case 'warning':
        return '#FFC107';
      default:
        return '#6c757d';
    }
  }
}
