import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ReloadService } from '../../services/reload.service';
import { AuthService } from '../../services/auth.service';
import { Usuario } from '../../models/usuario';
import { PedidosPdiService } from 'src/app/services/pedidos-pdi.service';

// Interface for a single observation
interface Observacion {
  idObservacion: number;
  mensaje: string;
  fechaCreacion: Date;
  idUsuarioCreacion?: number; // Optional, if backend provides it
  nombreUsuario?: string; // Mapped from 'usuario' if needed
  rolUsuario?: string; // Mapped from user data if available
  usuario?: string; // The username from the backend
  imagenes: Array<{
    idImagen?: number;
    rutaImagen: string;
    nombreArchivo?: string;
    tipoArchivo?: string;
    tamañoKb?: number;
  }>;
}

// Interface for the parent PDI order
interface Pedido {
  id_pedido?: number;
  codigo: string;
  descripcion: string;
  observaciones?: string;
  cantidad: number;
  modelo?: string;
  cliente?: string;
  ot?: string;
  estado?: string;
}

@Component({
  selector: 'app-observacionpdi', // New selector for PDI observations
  templateUrl: './observacionpdi.component.html',
  styleUrls: ['./observacionpdi.component.css']
})
export class ObservacionpdiComponent implements OnInit, OnChanges, AfterViewChecked {
  @Input() pedido: Pedido | null = null;
  @Input() currentUserId: number = 0;
  @Input() userRole: string = '';
  @Input() modalVisible: boolean = false;
  @Output() closeModalEvent = new EventEmitter<void>();

  @ViewChild('chatMessages') chatMessages!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef;

  observaciones: Observacion[] = [];
  nuevaObservacion: string = '';
  selectedFiles: File[] = [];
  previewImages: string[] = [];
  isSending: boolean = false;

  // For the image viewer
  imageViewerVisible: boolean = false;
  selectedImageUrl: string = '';

  // For auto-scroll
  private shouldScrollToBottom = false;
  usuario: Usuario | null = null;
  username: string = '';

  // Base URL for PDI observation images (from the new controller)
  private baseImageUrl: string;

  constructor(
    private pedidosPdiService: PedidosPdiService, // Used to get the base URL
    private pedidosPdiObservacionesService: PedidosPdiService, // New service for PDI observations
    private reloadService: ReloadService,
    private authService: AuthService,
  ) {
    // Initialize baseImageUrl using the base URL from PedidosPdiService
    this.baseImageUrl = `${this.pedidosPdiService.url}/api/PedidosPdiObservaciones/imagen/`;
  }

  ngOnInit(): void {
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      if (this.usuario != null) {
        this.username = this.usuario.nombreUsuario;
      }
    });
    if (this.pedido && this.modalVisible) {
      this.cargarObservaciones();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['pedido'] && !changes['pedido'].firstChange) ||
        (changes['modalVisible'] && changes['modalVisible'].currentValue === true)) {
      if (this.pedido && this.modalVisible) {
        this.cargarObservaciones();
      }
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  /**
   * Loads observations for the current PDI order from the backend.
   */
  cargarObservaciones(): void {
    if (!this.pedido?.id_pedido) {
      console.warn('No se puede cargar observaciones PDI: id_pedido es nulo o indefinido.');
      this.observaciones = [];
      return;
    }

    this.pedidosPdiObservacionesService.getObservacionesPdi(this.pedido.id_pedido).subscribe({
      next: (data: any) => {
        // Map backend response to frontend interface
        this.observaciones = data.map((obs: any) => ({
          idObservacion: obs.idObservacion,
          mensaje: obs.mensaje,
          fechaCreacion: new Date(obs.fechaCreacion),
          usuario: obs.usuario,
          // Assuming user info is part of the observation or fetched separately
          idUsuarioCreacion: obs.idUsuarioCreacion, // If backend provides it
          nombreUsuario: obs.usuario, // Using 'usuario' from backend for display
          rolUsuario: obs.rolUsuario || 'Rol', // Placeholder or fetched from user service
          imagenes: this.mapImagenes(obs.imagenes || [])
        }));

        // Sort by date (oldest first for chronological chat display)
        this.observaciones.sort((a, b) =>
          new Date(a.fechaCreacion).getTime() - new Date(b.fechaCreacion).getTime()
        );

        this.shouldScrollToBottom = true;
      },
      error: (err) => {
        console.error('Error al cargar observaciones PDI:', err);
        this.showToast('Error al cargar las observaciones PDI.', 'error');
      }
    });
  }

  /**
   * Maps image data from the backend response to the frontend interface.
   * @param imagenes Array of image data from the backend.
   * @returns Mapped array of images.
   */
  private mapImagenes(imagenes: any[]): Array<{idImagen?: number, rutaImagen: string, nombreArchivo?: string, tipoArchivo?: string, tamañoKb?: number}> {
    if (!Array.isArray(imagenes)) {
      return [];
    }

    return imagenes.map((img: any) => {
      if (typeof img === 'string') {
        return {
          rutaImagen: img,
          nombreArchivo: img.split('/').pop() || img.split('\\').pop() || img
        };
      }
      return {
        idImagen: img.IdImagen || img.idImagen,
        rutaImagen: img.RutaImagen || img.rutaImagen,
        nombreArchivo: img.NombreArchivo || img.nombreArchivo,
        tipoArchivo: img.TipoArchivo || img.tipoArchivo,
        tamañoKb: img.TamañoKb || img.tamañoKb
      };
    }).filter(img => img.rutaImagen);
  }

  /**
   * Closes the observation modal.
   */
  closeModal(): void {
    this.modalVisible = false;
    this.resetForm();
    this.closeModalEvent.emit();
  }

  /**
   * Resets the form fields and selected files.
   */
  private resetForm(): void {
    this.nuevaObservacion = '';
    this.selectedFiles = [];
    this.previewImages = [];
    this.isSending = false;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  /**
   * Checks if the current user has permission to add observations.
   * @returns True if the user has permission, false otherwise.
   */
  canAddObservation(): boolean {
    const permittedRoles = ['admin', 'repuestos', 'bodegapdi', 'bodegapdi1'];
    return permittedRoles.includes(this.userRole);
  }

  /**
   * Checks if a message can be sent (not empty and not already sending).
   * @returns True if message can be sent, false otherwise.
   */
  canSendMessage(): boolean {
    return (this.nuevaObservacion.trim().length > 0 || this.selectedFiles.length > 0) && !this.isSending;
  }

  /**
   * Handles keyboard events for sending messages and closing modals.
   * @param event The keyboard event.
   */
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (this.canSendMessage()) {
        this.enviarObservacion();
      }
    } else if (event.key === 'Escape' && this.modalVisible && !this.imageViewerVisible) {
      this.closeModal();
    } else if (event.key === 'Escape' && this.imageViewerVisible) {
      this.closeImageViewer();
    }
  }

  /**
   * Handles file selection for image attachments.
   * @param event The file input change event.
   */
  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    if (files && files.length > 0) {
      const maxFiles = 5;
      const currentFiles = this.selectedFiles.length;
      const newFilesCount = Math.min(files.length, maxFiles - currentFiles);

      if (currentFiles >= maxFiles) {
        this.showToast(`Solo puedes adjuntar máximo ${maxFiles} archivos.`, 'error');
        return;
      }

      for (let i = 0; i < newFilesCount; i++) {
        const file = files[i];
        if (!file.type.match('image.*')) {
          this.showToast('Solo se permiten archivos de imagen.', 'error');
          continue;
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          this.showToast(`El archivo "${file.name}" es muy grande. Máximo 5MB.`, 'error');
          continue;
        }

        this.selectedFiles.push(file);
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.previewImages.push(e.target.result);
        };
        reader.readAsDataURL(file);
      }
      if (newFilesCount < files.length) {
        this.showToast(`Solo se agregaron ${newFilesCount} archivos debido a las limitaciones.`, 'warning');
      }
    }
    event.target.value = ''; // Clear input to allow re-selection of same file
  }

  /**
   * Removes a selected image from the preview and file list.
   * @param index The index of the image to remove.
   */
  removeImage(index: number): void {
    if (index >= 0 && index < this.selectedFiles.length) {
      this.selectedFiles.splice(index, 1);
      this.previewImages.splice(index, 1);
    }
  }

  /**
   * Sends the new observation and attached images to the backend.
   */
  enviarObservacion(): void {
    if (!this.pedido || (!this.nuevaObservacion.trim() && this.selectedFiles.length === 0)) {
      this.showToast('El mensaje no puede estar vacío y debe haber un pedido PDI seleccionado.', 'error');
      return;
    }

    this.isSending = true;

    const formData = new FormData();
    formData.append('idPedido', this.pedido.id_pedido?.toString() || '');
    formData.append('usuario', this.username); // Use the logged-in username
    formData.append('mensaje', this.nuevaObservacion.trim());

    for (let i = 0; i < this.selectedFiles.length; i++) {
      formData.append('imagenes', this.selectedFiles[i], this.selectedFiles[i].name);
    }

    this.pedidosPdiObservacionesService.addObservacionPdi(formData).subscribe({
      next: (response) => {
        console.log('Observación PDI agregada:', response);
        this.resetForm();
        this.cargarObservaciones(); // Reload observations to show the new one
        this.reloadService.triggerReload(); // Trigger reload for the PDI dashboard
        this.showToast('Observación PDI enviada exitosamente.', 'success');
      },
      error: (err) => {
        console.error('Error al agregar observación PDI:', err);
        this.isSending = false;
        this.showToast('Error al enviar la observación PDI. Por favor, intenta nuevamente.', 'error');
      }
    });
  }

  /**
   * Constructs the full URL for an observation image.
   * @param rutaImagen The relative path or filename of the image.
   * @returns The full URL of the image.
   */
  getImageUrl(rutaImagen: string): string {
    if (!rutaImagen) {
      return '';
    }
    // Extract only the filename from the full path (if it's a full path)
    const nombreArchivo = rutaImagen.split('\\').pop() || rutaImagen.split('/').pop() || rutaImagen;
    return `${this.baseImageUrl}${nombreArchivo}`;
  }

  /**
   * Opens the image viewer modal.
   * @param imagePath The path of the image to display.
   */
  openImageViewer(imagePath: string): void {
    this.selectedImageUrl = this.getImageUrl(imagePath);
    this.imageViewerVisible = true;
    document.body.style.overflow = 'hidden'; // Prevent body scroll
  }

  /**
   * Closes the image viewer modal.
   */
  closeImageViewer(): void {
    this.imageViewerVisible = false;
    this.selectedImageUrl = '';
    document.body.style.overflow = 'auto'; // Restore body scroll
  }

  /**
   * Handles image loading errors, replacing the image with a placeholder SVG.
   * @param event The error event.
   */
  onImageError(event: any): void {
    console.error('Error al cargar imagen de observación PDI:', event.target.src);
    event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zz4KPHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNGM0Y0RjYiLz4KPHBhdGggZD0iTTM1IDY1TDUwIDQ1TDY1IDY1SDM1WiIgZmlsbD0iI0QxRDVEQiIvPgo8Y2lyY2xlIGN4PSI0MCIgY3k9IjM1IiByPSI1IiBmaWxsPSIjRDEBNURCIi8+Cjwvc3ZnPgo=';
    event.target.alt = 'Imagen no disponible';
  }

  /**
   * Scrolls the chat messages to the bottom.
   */
  private scrollToBottom(): void {
    try {
      if (this.chatMessages && this.chatMessages.nativeElement) {
        const element = this.chatMessages.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      console.error('Error al hacer scroll:', err);
    }
  }

  /**
   * Track function for ngFor to improve performance for observations.
   * @param index The index of the item.
   * @param item The observation item.
   * @returns A unique identifier for the item.
   */
  trackByObservacion(index: number, item: Observacion): any {
    return item.idObservacion;
  }

  /**
   * Track function for ngFor to improve performance for images.
   * @param index The index of the item.
   * @param item The image item.
   * @returns A unique identifier for the item.
   */
  trackByImagen(index: number, item: any): any {
    return item.idImagen || item.rutaImagen || index;
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

    Object.assign(toast.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: this.getToastColor(type),
      color: 'white',
      padding: '12px 20px',
      borderRadius: '8px',
      zIndex: '10000',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      fontSize: '14px',
      fontWeight: '500',
      maxWidth: '350px',
      wordWrap: 'break-word',
      animation: 'slideInRight 0.3s ease-out',
      transition: 'all 0.3s ease'
    });

    document.body.appendChild(toast);

    setTimeout(() => {
      if (document.body.contains(toast)) {
        toast.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 300);
      }
    }, 4000);
  }

  /**
   * Gets the background color for a toast notification based on its type.
   * @param type The type of toast.
   * @returns The corresponding CSS color string.
   */
  private getToastColor(type: 'success' | 'error' | 'warning'): string {
    switch (type) {
      case 'success':
        return '#28a745';
      case 'error':
        return '#dc3545';
      case 'warning':
        return '#ffc107';
      default:
        return '#6c757d';
    }
  }
}
