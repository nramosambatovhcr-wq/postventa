import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { PedidobodegaService } from '../../services/pedidobodega.service';
import { ReloadService } from '../../services/reload.service';
import { AuthService } from '../../services/auth.service';
import { Usuario } from '../../models/usuario';
import { PedidoOilDetail } from 'src/app/services/oil.service';


interface Observacion {
  idObservacion: number;
  mensaje: string;
  fechaCreacion: Date;
  idUsuarioCreacion?: number;
  nombreUsuario?: string;
  rolUsuario?: string;
  usuario?: string;
  imagenes: Array<{
    idImagen?: number;
    rutaImagen: string;
    nombreArchivo?: string;
    tipoArchivo?: string;
    tamañoKb?: number;
  }>;
}

@Component({
  selector: 'app-observacionesvidriosus',
  templateUrl: './observacionesvidriosus.component.html',
  styleUrls: ['./observacionesvidriosus.component.css']
})
export class ObservacionesvidriosusComponent implements OnInit, OnChanges, AfterViewChecked {
  @Input() pedido: PedidoOilDetail | null = null;
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

  imageViewerVisible: boolean = false;
  selectedImageUrl: string = '';

  private shouldScrollToBottom = false;
  usuario: Usuario | null = null;
  username = '';

  private baseImageUrl = 'https://bodega.vehicentro.com:1830/api/api/Pedidos/ObservacionesVidrios/imagen/';

  constructor(
    private pedidoService: PedidobodegaService,
    private reloadService: ReloadService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      if (this.usuario != null) {
        this.username = this.usuario.nombreUsuario;
      }
    });
    if (this.pedido) {
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

  cargarObservaciones(): void {
    if (!this.pedido?.idPedido) {
      console.warn('No se puede cargar observaciones: id_pedido es nulo o indefinido.');
      this.observaciones = [];
      return;
    }

    this.pedidoService.getObservacionesVidriosPedido(this.pedido.idPedido).subscribe({
      next: (data: any) => {
        this.observaciones = data.map((obs: any) => ({
          idObservacion: obs.IdObservacion || obs.idObservacion,
          mensaje: obs.Mensaje || obs.mensaje,
          fechaCreacion: new Date(obs.FechaCreacion || obs.fechaCreacion),
          idUsuarioCreacion: obs.IdUsuarioCreacion || obs.idUsuarioCreacion,
          nombreUsuario: obs.NombreUsuario || obs.nombreUsuario || 'Usuario',
          usuario: obs.usuario || 'Usuario',
          rolUsuario: obs.RolUsuario || obs.rolUsuario || 'Rol',
          imagenes: this.mapImagenes(obs.Imagenes || obs.imagenes || [])
        }));

        this.observaciones.sort((a, b) =>
          new Date(a.fechaCreacion).getTime() - new Date(b.fechaCreacion).getTime()
        );

        this.shouldScrollToBottom = true;
      },
      error: (err) => {
        console.error('Error al cargar observaciones:', err);
        this.showToast('Error al cargar las observaciones.', 'error');
      }
    });
  }

  private mapImagenes(imagenes: any[]): Array<{idImagen?: number, rutaImagen: string, nombreArchivo?: string, tipoArchivo?: string, tamañoKb?: number}> {
    if (!Array.isArray(imagenes)) return [];

    return imagenes.map((img: any) => {
      if (typeof img === 'string') {
        return {
          rutaImagen: img,
          nombreArchivo: img.split('/').pop() || img.split('\\').pop() || img
        };
      }
      return {
        idImagen: img.IdImagen || img.idImagen,
        rutaImagen: img.RutaImagen || img.rutaImagen || img,
        nombreArchivo: img.NombreArchivo || img.nombreArchivo,
        tipoArchivo: img.TipoArchivo || img.tipoArchivo,
        tamañoKb: img.TamañoKb || img.tamañoKb
      };
    }).filter(img => img.rutaImagen);
  }

  closeModal(): void {
    this.modalVisible = false;
    this.resetForm();
    this.closeModalEvent.emit();
  }

  private resetForm(): void {
    this.nuevaObservacion = '';
    this.selectedFiles = [];
    this.previewImages = [];
    this.isSending = false;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  canAddObservation(): boolean {
    const permittedRoles = ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'repuestosc','bodega','bodegaped','laboratorio1','laboratorio2','laboratorio3','bodegaimpor'];
    return permittedRoles.includes(this.userRole);
  }

  canSendMessage(): boolean {
    return (this.nuevaObservacion.trim().length > 0 || this.selectedFiles.length > 0) && !this.isSending;
  }

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

  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

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
      if (file.size > 5 * 1024 * 1024) {
        this.showToast(`El archivo "${file.name}" es muy grande. Máximo 5MB.`, 'error');
        continue;
      }

      this.selectedFiles.push(file);
      const reader = new FileReader();
      reader.onload = (e: any) => this.previewImages.push(e.target.result);
      reader.readAsDataURL(file);
    }

    if (newFilesCount < files.length) {
      this.showToast(`Solo se agregaron ${newFilesCount} archivos debido a las limitaciones.`, 'warning');
    }

    event.target.value = '';
  }

  removeImage(index: number): void {
    if (index >= 0 && index < this.selectedFiles.length) {
      this.selectedFiles.splice(index, 1);
      this.previewImages.splice(index, 1);
    }
  }

  enviarObservacion(): void {
    if (!this.pedido || (!this.nuevaObservacion.trim() && this.selectedFiles.length === 0)) {
      this.showToast('El mensaje no puede estar vacío y debe haber un pedido seleccionado.', 'error');
      return;
    }

    this.isSending = true;
    const formData = new FormData();
    formData.append('idPedido', this.pedido.idPedido?.toString() || '');
    formData.append('idUsuario', this.currentUserId.toString());
    formData.append('Usuario', this.username);
    formData.append('mensaje', this.nuevaObservacion.trim());

    for (let i = 0; i < this.selectedFiles.length; i++) {
      formData.append('imagenes', this.selectedFiles[i], this.selectedFiles[i].name);
    }

    this.pedidoService.addObservacionVidrios(formData).subscribe({
      next: (response) => {
        this.resetForm();
        this.cargarObservaciones();
        this.reloadService.triggerReload();
        this.showToast('Observación enviada exitosamente.', 'success');
      },
      error: (err) => {
        console.error('Error al agregar observación:', err);
        this.isSending = false;
        this.showToast('Error al enviar la observación. Por favor, intenta nuevamente.', 'error');
      }
    });
  }

  getImageUrl(rutaImagen: string): string {
    if (!rutaImagen) return '';
    const nombreArchivo = rutaImagen.split('\\').pop() || rutaImagen.split('/').pop() || rutaImagen;
    return `${this.baseImageUrl}${nombreArchivo}`;
  }

  openImageViewer(imagePath: string): void {
    this.selectedImageUrl = this.getImageUrl(imagePath);
    this.imageViewerVisible = true;
    document.body.style.overflow = 'hidden';
  }

  closeImageViewer(): void {
    this.imageViewerVisible = false;
    this.selectedImageUrl = '';
    document.body.style.overflow = 'auto';
  }

  onImageError(event: any): void {
    event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zNSA2NUw1MCA0NUw2NSA2NUgzNVoiIGZpbGw9IiNEMUQ1REIiLz4KPGNpcmNsZSBjeD0iNDAiIGN5PSIzNSIgcj0iNSIgZmlsbD0iI0QxRDVEQiIvPgo8L3N2Zz4K';
    event.target.alt = 'Imagen no disponible';
  }

  private scrollToBottom(): void {
    try {
      const el = this.chatMessages.nativeElement;
      el.scrollTop = el.scrollHeight;
    } catch (err) {
      console.error('Error al hacer scroll:', err);
    }
  }

  trackByObservacion(index: number, item: Observacion): any {
    return item.idObservacion;
  }

  trackByImagen(index: number, item: any): any {
    return item.idImagen || item.rutaImagen || index;
  }

  private showToast(message: string, type: 'success' | 'error' | 'warning'): void {
    const toast = document.createElement('div');
    toast.innerText = message;
    toast.className = `toast toast-${type}`;
    Object.assign(toast.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#ffc107',
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
      toast.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => document.body.contains(toast) && document.body.removeChild(toast), 300);
    }, 4000);
  }
}