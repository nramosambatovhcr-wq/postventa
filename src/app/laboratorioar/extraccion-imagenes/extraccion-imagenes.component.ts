import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import {
  ExtraccionImagenesService,
  ImagenExtraccion,
  MomentoImagen,
  TipoExtraccion
} from '../../services/extraccion-imagenes.service';

@Component({
  selector: 'app-extraccion-imagenes',
  templateUrl: './extraccion-imagenes.component.html',
  styleUrls: ['./extraccion-imagenes.component.css']
})
export class ExtraccionImagenesComponent implements OnChanges {
  @Input() tipoExtraccion: TipoExtraccion = 'BOD';   // 'BOD' | 'REPUESTO'
  @Input() extraccionId: number | null = null;
  @Input() visible = false;
  @Input() subidoPor: string | null = null;
  @Output() cerrar = new EventEmitter<void>();

  recepcion: ImagenExtraccion[] = [];
  estado: ImagenExtraccion[] = [];
  entrega: ImagenExtraccion[] = [];

  cargando = false;
  subiendo: MomentoImagen | null = null;
  error: string | null = null;

  imagenAmpliada: string | null = null;

  // Las tres secciones del ciclo de vida del componente
  readonly secciones: { momento: MomentoImagen; titulo: string }[] = [
    { momento: 'RECEPCION', titulo: 'Cómo se recibe' },
    { momento: 'ESTADO',    titulo: 'Cómo queda' },
    { momento: 'ENTREGA',   titulo: 'Cuando se entrega' }
  ];

  constructor(private imagenesService: ExtraccionImagenesService) {}

  ngOnChanges(changes: SimpleChanges): void {
    // Cargar cuando se abre el modal o cambia el registro
    if ((changes['visible'] || changes['extraccionId']) && this.visible && this.extraccionId) {
      this.cargar();
    }
  }

  cargar(): void {
    if (!this.extraccionId) return;
    this.cargando = true;
    this.error = null;
    this.imagenesService.getByExtraccion(this.tipoExtraccion, this.extraccionId).subscribe({
      next: imgs => {
        this.recepcion = imgs.recepcion;
        this.estado = imgs.estado;
        this.entrega = imgs.entrega;
        this.cargando = false;
      },
      error: err => {
        this.error = err.message;
        this.cargando = false;
      }
    });
  }

  imagenesDe(momento: MomentoImagen): ImagenExtraccion[] {
    if (momento === 'RECEPCION') return this.recepcion;
    if (momento === 'ESTADO') return this.estado;
    return this.entrega;
  }

  onSeleccion(momento: MomentoImagen, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length || !this.extraccionId) return;

    const archivos = Array.from(input.files);
    input.value = ''; // permite volver a seleccionar los mismos archivos luego

    this.subiendo = momento;
    this.error = null;
    this.imagenesService.upload({
      tipoExtraccion: this.tipoExtraccion,
      extraccionId: this.extraccionId,
      momento,
      archivos,
      subidoPor: this.subidoPor || undefined
    }).subscribe({
      next: () => {
        this.subiendo = null;
        this.cargar();
      },
      error: err => {
        this.subiendo = null;
        this.error = err.message;
      }
    });
  }

  borrar(img: ImagenExtraccion): void {
    if (!confirm('¿Eliminar esta imagen?')) return;
    this.imagenesService.delete(img.id).subscribe({
      next: () => this.cargar(),
      error: err => (this.error = err.message)
    });
  }

  ampliar(url: string): void {
    this.imagenAmpliada = url;
  }

  cerrarAmpliada(): void {
    this.imagenAmpliada = null;
  }

  cerrarModal(): void {
    this.imagenAmpliada = null;
    this.cerrar.emit();
  }
}