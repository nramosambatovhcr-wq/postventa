import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { Usuario } from 'src/app/models/usuario';
import { AuthService } from 'src/app/services/auth.service';
import { OilService } from 'src/app/services/oil.service';

export interface SolicitudPermiso {
  id?: number;
  codigoArticulo: string;
  descripcionArticulo: string;
  idUsuarioSolicitante: number;
  nombreUsuarioSolicitante?: string;
  motivo: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  fechaSolicitud: Date;
  fechaRespuesta?: Date;
  idUsuarioAprobador?: number;
  observaciones?: string;
}

@Component({
  selector: 'app-adminsolicitudespermiso',
  templateUrl: './adminsolicitudespermiso.component.html',
  styleUrls: ['./adminsolicitudespermiso.component.css']
})
export class AdminsolicitudespermisoComponent implements OnInit, OnDestroy {
  usuario: Usuario | null = null;
  solicitudes: SolicitudPermiso[] = [];
  solicitudesFiltradas: SolicitudPermiso[] = [];
  loading = false;
  error: string | null = null;
  
  // Filtros
  filtroEstado: string = 'pendiente';
  terminoBusqueda: string = '';
  
  // Modal
  mostrarModal = false;
  solicitudSeleccionada: SolicitudPermiso | null = null;
  accionModal: 'aprobar' | 'rechazar' | null = null;
  observacionesModal: string = '';
  
  private subscriptions = new Subscription();

  constructor(
    private authService: AuthService,
    private oilService: OilService
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.authService.usuarioActual$.subscribe(usuario => {
        this.usuario = usuario;
        if (this.usuario) {
          this.cargarSolicitudes();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  cargarSolicitudes(): void {
    this.loading = true;
    this.error = null;

    // Cargar todas las solicitudes (para administradores)
    this.oilService.getAllSolicitudesPermiso().subscribe({
      next: (data) => {
        this.solicitudes = data;
        this.aplicarFiltros();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar las solicitudes de permiso';
        this.loading = false;
        console.error('Error:', err);
      }
    });
  }

  aplicarFiltros(): void {
    let resultado = [...this.solicitudes];

    // Filtrar por estado
    if (this.filtroEstado && this.filtroEstado !== 'todas') {
      resultado = resultado.filter(s => s.estado === this.filtroEstado);
    }

    // Filtrar por término de búsqueda
    if (this.terminoBusqueda.trim() !== '') {
      const termino = this.terminoBusqueda.toLowerCase();
      resultado = resultado.filter(s =>
        s.codigoArticulo.toLowerCase().includes(termino) ||
        s.descripcionArticulo.toLowerCase().includes(termino) ||
        s.nombreUsuarioSolicitante?.toLowerCase().includes(termino)
      );
    }

    this.solicitudesFiltradas = resultado;
  }

  onFiltroChange(): void {
    this.aplicarFiltros();
  }

  abrirModal(solicitud: SolicitudPermiso, accion: 'aprobar' | 'rechazar'): void {
    this.solicitudSeleccionada = solicitud;
    this.accionModal = accion;
    this.observacionesModal = '';
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.solicitudSeleccionada = null;
    this.accionModal = null;
    this.observacionesModal = '';
  }

  confirmarAccion(): void {
    if (!this.solicitudSeleccionada || !this.accionModal || !this.usuario) {
      return;
    }

    if (this.accionModal === 'rechazar' && !this.observacionesModal.trim()) {
      this.showToast('Debe proporcionar una razón para el rechazo', 'error');
      return;
    }

    this.loading = true;

    const request$ = this.accionModal === 'aprobar'
      ? this.oilService.aprobarSolicitudPermiso(
          this.solicitudSeleccionada.id!,
          this.usuario.id,
          this.observacionesModal
        )
      : this.oilService.rechazarSolicitudPermiso(
          this.solicitudSeleccionada.id!,
          this.usuario.id,
          this.observacionesModal
        );

    request$.subscribe({
      next: () => {
        const accion = this.accionModal === 'aprobar' ? 'aprobada' : 'rechazada';
        this.showToast(`Solicitud ${accion} exitosamente`, 'success');
        this.cerrarModal();
        this.cargarSolicitudes();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al procesar solicitud:', err);
        this.showToast('Error al procesar la solicitud', 'error');
        this.loading = false;
      }
    });
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'pendiente':
        return 'estado-pendiente';
      case 'aprobada':
        return 'estado-aprobada';
      case 'rechazada':
        return 'estado-rechazada';
      default:
        return '';
    }
  }

  getEstadoLabel(estado: string): string {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente';
      case 'aprobada':
        return 'Aprobada';
      case 'rechazada':
        return 'Rechazada';
      default:
        return estado;
    }
  }

  formatFecha(fecha: Date | string): string {
    if (!fecha) return '-';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  showToast(message: string, type: 'success' | 'error' | 'info'): void {
    const toast = document.createElement('div');
    toast.innerText = message;

    const colores: Record<string, string> = {
      success: '#28a745',
      error: '#dc3545',
      info: '#007bff'
    };

    // Estilos inline porque el toast se agrega a document.body,
    // fuera del encapsulamiento de estilos del componente
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      backgroundColor: colores[type],
      color: 'white',
      padding: '12px 20px',
      borderRadius: '6px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
      fontSize: '14px',
      fontWeight: '600',
      zIndex: '2000',
      opacity: '0',
      transform: 'translateY(10px)',
      transition: 'opacity 0.3s ease, transform 0.3s ease'
    });

    document.body.appendChild(toast);

    // Forzar reflow para que la transición de entrada funcione
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    // Ocultar y ELIMINAR siempre (sin depender de transitionend)
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 350);
    }, 3000);
  }
}