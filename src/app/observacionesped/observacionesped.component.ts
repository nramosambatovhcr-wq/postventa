import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { PedidobodegaService } from '../services/pedidobodega.service';

// Interfaces actualizadas para coincidir con la nueva API
export interface CommentImage {
  idImagen: number;
  idObservacion: number;
  rutaImagen: string;
  nombreArchivo: string;
  tipoArchivo: string;
  tamanoKb: number;
  fechaSubida: string;
}

export interface CommentDetail {
  idObservacion: number;
  idPedido: number;
  mensaje: string;
  fechaCreacion: string;
  usuario: string;
  commentImages: CommentImage[];
}

export interface PedidoImage {
  idImagen: number;
  nombreArchivo: string;
  rutaArchivo: string;
  tipoArchivo: string;
  tamanoKb: number;
  fechaCarga: string;
}

export interface PedidoDetail {
  idPedido: number;
  codigo: string;
  descripcion: string;
  observaciones: string;
  fechaCreacion: string;
  fechaModificacion?: string;
  idUsuarioCreacion: number;
  idUsuarioModificacion?: number;
  cantidad: number;
  modelo?: string;
  cliente?: string;
  ot?: string;
  estado?: string;
  tipo?: string;
  nombreUsuarioCreacion: string;
  apellidoUsuarioCreacion: string;
  pedidoImages: PedidoImage[];
  comentarios: CommentDetail[];
}

@Component({
  selector: 'app-observacionesped',
  templateUrl: './observacionesped.component.html',
  styleUrls: ['./observacionesped.component.css']
})
export class ObservacionespedComponent implements OnInit, OnChanges {
  @Input() pedidoId: number | null = null; // Cambiado para recibir solo el ID
  @Input() modalVisible: boolean = false;
  @Input() currentUserId: number | null = null;
  @Input() userRole: string = '';

  @Output() closeModalEvent = new EventEmitter<void>();

  // Propiedades del componente
  pedidoDetail: PedidoDetail | null = null;
  newCommentText: string = '';
  selectedImages: File[] = [];
  isLoading: boolean = false;
  error: string | null = null;

  constructor(
    private pedidobodegaService: PedidobodegaService
  ) { }

  ngOnInit(): void {
    // Inicialización inicial
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Cargar datos cuando cambie el pedidoId y el modal sea visible
    if (changes['pedidoId'] && this.pedidoId && this.modalVisible) {
      this.loadPedidoDetails();
    }
    
    // También cargar cuando el modal se haga visible con un pedidoId existente
    if (changes['modalVisible'] && this.modalVisible && this.pedidoId) {
      this.loadPedidoDetails();
    }
  }
loadPedidoDetails(): void {
  if (!this.pedidoId) return;

  this.isLoading = true;
  this.error = null;

  this.pedidobodegaService.getPedidoDetails(this.pedidoId).subscribe({
    next: (pedidoDetail: any) => {
      this.pedidoDetail = pedidoDetail;
      this.isLoading = false;
      console.log('Pedido details loaded:', this.pedidoDetail);
    },
    error: (err) => {
      console.error('Error loading pedido details:', err);
      this.error = 'Error al cargar los detalles del pedido';
      this.isLoading = false;
    }
  });
}

  closeModal(): void {
    this.modalVisible = false;
    this.closeModalEvent.emit();
    this.newCommentText = '';
    this.selectedImages = [];
    this.pedidoDetail = null;
    this.error = null;
  }

  // Método para obtener URL de imagen del pedido
  getPedidoImageUrl(rutaArchivo: string): string {
    const formattedPath = rutaArchivo.replace(/\\/g, '/');
    return `https://bodega.vehicentro.com:1830/api/api/${formattedPath}`;
  }

  // Método para obtener URL de imagen de comentario
  getCommentImageUrl(rutaImagen: string): string {
    const formattedPath = rutaImagen.replace(/\\/g, '/');
    return `https://bodega.vehicentro.com:1830/api/api/${formattedPath}`;
  }

  // Manejo de selección de archivos
  onFileSelected(event: any): void {
    const files = Array.from(event.target.files) as File[];
    this.selectedImages = [...this.selectedImages, ...files];
  }

  // Remover imagen seleccionada
  removeSelectedImage(index: number): void {
    this.selectedImages.splice(index, 1);
  }

  // Agregar comentario
  addComment(): void {
    if (!this.pedidoDetail || !this.newCommentText.trim() || !this.currentUserId) {
      console.warn('Cannot add comment: missing required data');
      return;
    }

    const formData = new FormData();
    formData.append('pedidoId', this.pedidoDetail.idPedido.toString());
    formData.append('userId', this.currentUserId.toString());
    formData.append('mensaje', this.newCommentText.trim());

    // Agregar imágenes si las hay
    this.selectedImages.forEach((file, index) => {
      formData.append(`images`, file);
    });

    this.pedidobodegaService.addComment(formData).subscribe({
      next: (response) => {
        // Recargar los detalles del pedido para obtener el comentario actualizado
        this.loadPedidoDetails();
        this.newCommentText = '';
        this.selectedImages = [];
        console.log('Comment added successfully');
      },
      error: (err) => {
        console.error('Error adding comment:', err);
        this.error = 'Error al agregar el comentario';
      }
    });
  }

  // Método para verificar si se puede enviar el comentario
  canSubmitComment(): boolean {
    return !!(this.newCommentText.trim() && this.currentUserId && !this.isLoading);
  }

  // Método para obtener preview de imagen seleccionada
  getImagePreview(file: File): string {
    return URL.createObjectURL(file);
  }
}