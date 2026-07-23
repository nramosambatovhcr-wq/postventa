import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { Usuario } from 'src/app/models/usuario';
import { OtTecnico, GarantiaDetalle, ArchivoGarantia, GarantiasVHCRService, EstadoGarantia } from 'src/app/services/garantias-vhcr.service';


@Component({
  selector: 'app-garantias-tecnico',
  templateUrl: './garantias-tecnico.component.html',
  styleUrls: ['./garantias-tecnico.component.css']
})
export class GarantiasTecnicoComponent implements OnInit {

  // ─── Estado del usuario ───────────────────────────────
  usuario: Usuario | null = null;
  usuarioId: string = '';
  rol: any;

  // ─── Listado de OT ────────────────────────────────────
  otList: OtTecnico[] = [];
  otFiltradas: OtTecnico[] = [];
  loading: boolean = false;
  filtroTexto: string = '';
  filtroEstado: string = '';

  // ─── Panel lateral de detalle ─────────────────────────
  otSeleccionada: OtTecnico | null = null;
  detalleGarantia: GarantiaDetalle | null = null;
  loadingDetalle: boolean = false;

  // ─── Panel de archivos ────────────────────────────────
  archivos: ArchivoGarantia[] = [];
  loadingArchivos: boolean = false;
  archivosSeleccionados: File[] = [];
  subiendoArchivos: boolean = false;
  errorArchivos: string = '';
  exitoArchivos: string = '';

  // ─── Observaciones ───────────────────────────────────
  observacionesTexto: string = '';
  guardandoObs: boolean = false;
  mensajeObs: string = '';

  // ─── Vista activa en el panel ─────────────────────────
  vistaActiva: 'info' | 'archivos' | 'historial' = 'info';

  constructor(
    private authService: AuthService,
    private router: Router,
    private garantiasService: GarantiasVHCRService
  ) {}

  ngOnInit(): void {
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      if (this.usuario) {
        this.usuarioId = String(this.usuario.id);
        this.rol = this.usuario.rol;
        this.cargarOT();
      } else {
        this.router.navigate(['/login']);
      }
    });
  }

  // ══════════════════════════════════════════════════════
  // CARGA DE DATOS
  // ══════════════════════════════════════════════════════

  cargarOT(): void {
    this.loading = true;
    this.garantiasService.getOtPorTecnico(this.usuarioId).subscribe({
      next: (data) => {
        this.otList = data;
        this.aplicarFiltros();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar OT:', err);
        this.loading = false;
      }
    });
  }

  seleccionarOT(ot: OtTecnico): void {
    this.otSeleccionada = ot;
    this.vistaActiva = 'info';
    this.errorArchivos = '';
    this.exitoArchivos = '';
    this.mensajeObs = '';
    this.cargarDetalle(ot.garantiaId);
    this.cargarArchivos(ot.garantiaId);
  }

  cargarDetalle(garantiaId: string): void {
    this.loadingDetalle = true;
    this.garantiasService.getGarantiaById(garantiaId).subscribe({
      next: (data) => {
        this.detalleGarantia = data;
        this.observacionesTexto = data.observacionesTecnico || '';
        this.loadingDetalle = false;
      },
      error: (err) => {
        console.error('Error al cargar detalle:', err);
        this.loadingDetalle = false;
      }
    });
  }

  cargarArchivos(garantiaId: string): void {
    this.loadingArchivos = true;
    this.garantiasService.getArchivos(garantiaId).subscribe({
      next: (data) => {
        this.archivos = data;
        this.loadingArchivos = false;
      },
      error: (err) => {
        console.error('Error al cargar archivos:', err);
        this.loadingArchivos = false;
      }
    });
  }

  cerrarPanel(): void {
    this.otSeleccionada = null;
    this.detalleGarantia = null;
    this.archivos = [];
    this.archivosSeleccionados = [];
  }

  // ══════════════════════════════════════════════════════
  // SUBIR ARCHIVOS
  // ══════════════════════════════════════════════════════

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const nuevos = Array.from(input.files);
      const totalActual = this.archivos.length + this.archivosSeleccionados.length;
      if (totalActual + nuevos.length > 100) {
        this.errorArchivos = `No se pueden subir ${nuevos.length} archivo(s). El límite es 100 por garantía (actualmente hay ${totalActual}).`;
        return;
      }
      this.archivosSeleccionados = [...this.archivosSeleccionados, ...nuevos];
      this.errorArchivos = '';
    }
  }

  quitarArchivoSeleccionado(index: number): void {
    this.archivosSeleccionados.splice(index, 1);
  }

  subirArchivos(): void {
    if (!this.otSeleccionada || this.archivosSeleccionados.length === 0) return;

    this.subiendoArchivos = true;
    this.errorArchivos = '';
    this.exitoArchivos = '';

    this.garantiasService.subirArchivos(
      this.otSeleccionada.garantiaId,
      this.usuarioId,
      this.archivosSeleccionados
    ).subscribe({
      next: (res) => {
        this.exitoArchivos = res.message || 'Archivos subidos correctamente.';
        this.archivosSeleccionados = [];
        this.subiendoArchivos = false;
        this.cargarArchivos(this.otSeleccionada!.garantiaId);
        this.cargarOT();
      },
      error: (err) => {
        this.errorArchivos = err.message || 'Error al subir archivos.';
        this.subiendoArchivos = false;
      }
    });
  }

  eliminarArchivo(archivoId: string): void {
    if (!confirm('¿Eliminar este archivo?')) return;
    this.garantiasService.eliminarArchivo(archivoId, this.usuarioId).subscribe({
      next: () => this.cargarArchivos(this.otSeleccionada!.garantiaId),
      error: (err) => { this.errorArchivos = err.message; }
    });
  }

  // ══════════════════════════════════════════════════════
  // OBSERVACIONES
  // ══════════════════════════════════════════════════════

  guardarObservaciones(): void {
    if (!this.otSeleccionada || !this.observacionesTexto.trim()) return;
    this.guardandoObs = true;
    this.mensajeObs = '';

    this.garantiasService.actualizarObservaciones(this.otSeleccionada.garantiaId, {
      usuarioId: this.usuarioId,
      observaciones: this.observacionesTexto
    }).subscribe({
      next: () => {
        this.mensajeObs = 'Observaciones guardadas.';
        this.guardandoObs = false;
      },
      error: (err) => {
        this.mensajeObs = err.message;
        this.guardandoObs = false;
      }
    });
  }

  // ══════════════════════════════════════════════════════
  // FILTROS
  // ══════════════════════════════════════════════════════

  aplicarFiltros(): void {
    this.otFiltradas = this.otList.filter(ot => {
      const textoMatch = !this.filtroTexto ||
        ot.numeroOt.toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        ot.placa.toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        ot.cliente.toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        ot.numeroVin.toLowerCase().includes(this.filtroTexto.toLowerCase());

      const estadoMatch = !this.filtroEstado || ot.estado === this.filtroEstado;

      return textoMatch && estadoMatch;
    });
  }

  limpiarFiltros(): void {
    this.filtroTexto = '';
    this.filtroEstado = '';
    this.aplicarFiltros();
  }

  // ══════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════

  getColorEstado(estado: EstadoGarantia, urgente: boolean): string {
    return this.garantiasService.getColorEstado(estado, urgente);
  }

  getLabelEstado(estado: EstadoGarantia): string {
    return this.garantiasService.getLabelEstado(estado);
  }

  getIconoTipoArchivo(tipo: string): string {
    switch (tipo) {
      case 'video':    return 'bi-camera-video-fill';
      case 'imagen':   return 'bi-image-fill';
      case 'documento': return 'bi-file-earmark-text-fill';
      default:         return 'bi-file-fill';
    }
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024)       return bytes + ' B';
    if (bytes < 1048576)    return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  formatFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-EC', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  contarUrgentes(): number {
    return this.otList.filter(o => o.esUrgente).length;
  }

  contarPorEstado(estado: string): number {
    return this.otList.filter(o => o.estado === estado).length;
  }
}