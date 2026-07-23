import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { Usuario } from 'src/app/models/usuario';
import { GarantiaEncargado, GarantiaDetalle, TramiteSimscloud, EnvioSimscloudRequest, RespuestaFabricaRequest, Notificacion, GarantiasVHCRService, EstadoGarantia } from 'src/app/services/garantias-vhcr.service';
import { GarantiasService, OrdenGarantia } from 'src/app/services/garantias.service';


@Component({
  selector: 'app-garantias-encargado',
  templateUrl: './garantias-encargado.component.html',
  styleUrls: ['./garantias-encargado.component.css']
})
export class GarantiasEncargadoComponent implements OnInit {

  // ─── Usuario ──────────────────────────────────────────
  usuario: Usuario | null = null;
  usuarioId: string = '';
  tallerId: string = '';

  // ─── Listado ──────────────────────────────────────────
  garantias: GarantiaEncargado[] = [];
  garantiasFiltradas: GarantiaEncargado[] = [];
  loading: boolean = false;
  filtroTexto: string = '';
  filtroEstado: string = '';

  // ─── Selección ────────────────────────────────────────
  garantiaSeleccionada: GarantiaEncargado | null = null;
  detalle: GarantiaDetalle | null = null;
  loadingDetalle: boolean = false;
  vistaActiva: 'info' | 'simscloud' | 'respuesta' | 'tramites' = 'info';

  // ─── Trámites Simscloud ───────────────────────────────
  tramites: TramiteSimscloud[] = [];
  loadingTramites: boolean = false;

  enviandoSimscloud: boolean = false;
  mensajeSimscloud: string = '';
  errorSimscloud: string = '';

  simscloudForm: EnvioSimscloudRequest = {
    encargadoId: '',
    numeroTramiteSimscloud: '',
    observaciones: ''
  };

  // ─── Respuesta de fábrica ─────────────────────────────
  registrandoRespuesta: boolean = false;
  mensajeRespuesta: string = '';
  errorRespuesta: string = '';
  mostrarConfirmRespuesta: boolean = false;

  respuestaForm: RespuestaFabricaRequest = {
    encargadoId: '',
    resultado: 'aprobada',
    motivoRechazo: '',
    comentarioFabrica: '',
    codigoRespuesta: '',
    montoCubierto: null
  };

  // ─── Notificaciones ───────────────────────────────────
  notificaciones: Notificacion[] = [];
  loadingNotif: boolean = false;
  mostrarNotif: boolean = false;
  totalNoLeidas: number = 0;

  // ─── OT Oracle (endpoint garantía por agencia) ────────
  ordenesGRT: OrdenGarantia[] = [];
  loadingOrdenes: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private garantiasService: GarantiasVHCRService,
    private garantiasOracleService: GarantiasService
  ) {}

  ngOnInit(): void {

    this.tallerId = this.route.snapshot.paramMap.get('id') ?? '';

    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      if (this.usuario) {
        this.usuarioId = String(this.usuario.id);
        
        this.simscloudForm.encargadoId  = this.usuarioId;
        this.respuestaForm.encargadoId  = this.usuarioId;
        this.cargarGarantias();
        this.cargarNotificaciones();
        this.cargarOrdenesGRT();
      } else {
        this.router.navigate(['/login']);
      }
    });
  }

  // ══════════════════════════════════════════════════════
  // CARGA DE DATOS
  // ══════════════════════════════════════════════════════

  cargarGarantias(): void {
    this.loading = true;
    this.garantiasService.getGarantiasEncargado(this.tallerId).subscribe({
      next: (data) => {
        this.garantias = data;
        this.aplicarFiltros();
        this.loading = false;
      },
      error: (err) => { console.error(err); this.loading = false; }
    });
  }

  cargarOrdenesGRT(): void {
    if (!this.tallerId) return;
    this.loadingOrdenes = true;
    this.garantiasOracleService.getOrdenesGarantiaPorOficina(this.tallerId).subscribe({
      next: (data) => {
        this.ordenesGRT = data;
        this.loadingOrdenes = false;
      },
      error: (err) => {
        console.error('Error cargando OT Oracle:', err);
        this.loadingOrdenes = false;
      }
    });
  }

  seleccionarGarantia(g: GarantiaEncargado): void {
    this.garantiaSeleccionada = g;
    this.vistaActiva = 'info';
    this.limpiarMensajes();
    this.resetForms();
    this.cargarDetalle(g.garantiaId);
  }

  cargarDetalle(garantiaId: string): void {
    this.loadingDetalle = true;
    this.garantiasService.getGarantiaById(garantiaId).subscribe({
      next: (d) => { this.detalle = d; this.loadingDetalle = false; },
      error: (err) => { console.error(err); this.loadingDetalle = false; }
    });
  }

  abrirTramites(): void {
    this.vistaActiva = 'tramites';
    this.loadingTramites = true;
    this.garantiasService.getHistorialTramites(this.garantiaSeleccionada!.garantiaId).subscribe({
      next: (t) => { this.tramites = t; this.loadingTramites = false; },
      error: (err) => { console.error(err); this.loadingTramites = false; }
    });
  }

  cerrarPanel(): void {
    this.garantiaSeleccionada = null;
    this.detalle = null;
    this.tramites = [];
    this.limpiarMensajes();
    this.resetForms();
  }

  // ══════════════════════════════════════════════════════
  // ENVIAR A SIMSCLOUD
  // ══════════════════════════════════════════════════════

  enviarASimscloud(): void {
    this.enviandoSimscloud = true;
    this.errorSimscloud   = '';
    this.mensajeSimscloud = '';

    this.garantiasService.registrarEnvioSimscloud(
      this.garantiaSeleccionada!.garantiaId,
      this.simscloudForm
    ).subscribe({
      next: () => {
        this.mensajeSimscloud = '✅ Garantía enviada a Simscloud correctamente. Estado actualizado.';
        this.enviandoSimscloud = false;
        this.cargarGarantias();
        // Actualizar la garantía seleccionada
        setTimeout(() => {
          const actualizada = this.garantias.find(g => g.garantiaId === this.garantiaSeleccionada!.garantiaId);
          if (actualizada) this.garantiaSeleccionada = actualizada;
        }, 500);
      },
      error: (err) => {
        this.errorSimscloud   = err.message || 'Error al registrar envío a Simscloud.';
        this.enviandoSimscloud = false;
      }
    });
  }

  // ══════════════════════════════════════════════════════
  // REGISTRAR RESPUESTA DE FÁBRICA
  // ══════════════════════════════════════════════════════

  confirmarRespuesta(): void {
    if (this.respuestaForm.resultado === 'rechazada' && !this.respuestaForm.motivoRechazo?.trim()) {
      this.errorRespuesta = 'El motivo de rechazo es obligatorio cuando la fábrica rechaza.';
      return;
    }
    this.errorRespuesta = '';
    this.mostrarConfirmRespuesta = true;
  }

  registrarRespuesta(): void {
    this.registrandoRespuesta    = true;
    this.errorRespuesta          = '';
    this.mensajeRespuesta        = '';
    this.mostrarConfirmRespuesta = false;

    this.garantiasService.registrarRespuestaFabrica(
      this.garantiaSeleccionada!.garantiaId,
      this.respuestaForm
    ).subscribe({
      next: (res) => {
        this.mensajeRespuesta     = res?.message || (
          this.respuestaForm.resultado === 'aprobada'
            ? '✅ Garantía aprobada por fábrica.'
            : '⚠️ Garantía rechazada. El jefe de taller fue notificado como URGENTE.'
        );
        this.registrandoRespuesta = false;
        this.cargarGarantias();
        setTimeout(() => this.cerrarPanel(), 3000);
      },
      error: (err) => {
        this.errorRespuesta        = err.message || 'Error al registrar respuesta.';
        this.registrandoRespuesta  = false;
      }
    });
  }

  // ══════════════════════════════════════════════════════
  // NOTIFICACIONES
  // ══════════════════════════════════════════════════════

  cargarNotificaciones(): void {
    this.loadingNotif = true;
    this.garantiasService.getNotificaciones(this.usuarioId).subscribe({
      next: (n) => {
        this.notificaciones = n;
        this.totalNoLeidas  = n.filter(x => x.estado === 'no_leida').length;
        this.loadingNotif   = false;
      },
      error: (err) => { console.error(err); this.loadingNotif = false; }
    });
  }

  marcarLeida(notif: Notificacion): void {
    if (notif.estado === 'leida') return;
    this.garantiasService.marcarNotificacionLeida(notif.id, this.usuarioId).subscribe({
      next: () => {
        notif.estado  = 'leida';
        this.totalNoLeidas = this.notificaciones.filter(x => x.estado === 'no_leida').length;
      }
    });
  }

  abrirGarantiaDesdeNotif(notif: Notificacion): void {
    this.marcarLeida(notif);
    this.mostrarNotif = false;
    if (!notif.garantiaId) return;
    const g = this.garantias.find(x => x.garantiaId === notif.garantiaId);
    if (g) this.seleccionarGarantia(g);
  }

  // ══════════════════════════════════════════════════════
  // DESCARGAR ZIP
  // ══════════════════════════════════════════════════════

  descargarZip(): void {
    if (!this.garantiaSeleccionada) return;
    this.garantiasService.descargarZipEnNavegador(
      this.garantiaSeleccionada.garantiaId,
      this.garantiaSeleccionada.numeroOt
    );
  }

  // ══════════════════════════════════════════════════════
  // FILTROS
  // ══════════════════════════════════════════════════════

  aplicarFiltros(): void {
    this.garantiasFiltradas = this.garantias.filter(g => {
      const t = this.filtroTexto.toLowerCase();
      const textoMatch = !t ||
        g.numeroOt.toLowerCase().includes(t)  ||
        g.placa.toLowerCase().includes(t)     ||
        g.cliente.toLowerCase().includes(t)   ||
        g.numeroVin.toLowerCase().includes(t);
      const estadoMatch = !this.filtroEstado || g.estado === this.filtroEstado;
      return textoMatch && estadoMatch;
    });
  }

  limpiarFiltros(): void {
    this.filtroTexto  = '';
    this.filtroEstado = '';
    this.aplicarFiltros();
  }

  // ══════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════

  getColorEstado(estado: EstadoGarantia, urgente = false): string {
    return this.garantiasService.getColorEstado(estado, urgente);
  }

  getLabelEstado(estado: EstadoGarantia): string {
    return this.garantiasService.getLabelEstado(estado);
  }

  getColorEstadoStr(estado: string, urgente = false): string {
    return this.garantiasService.getColorEstado(estado as EstadoGarantia, urgente);
  }

  getLabelEstadoStr(estado: string): string {
    return this.garantiasService.getLabelEstado(estado as EstadoGarantia);
  }

  formatFecha(f?: string | null): string {
    if (!f) return '—';
    return new Date(f).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatFechaHora(f?: string | null): string {
    if (!f) return '—';
    return new Date(f).toLocaleString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  puedeEnviarSimscloud(): boolean {
    return this.garantiaSeleccionada?.estado === 'finalizada_taller';
  }

  puedeRegistrarRespuesta(): boolean {
    return this.garantiaSeleccionada?.estado === 'enviada_simscloud';
  }

  contarPorEstado(e: string): number {
    return this.garantias.filter(g => g.estado === e).length;
  }

  contarConRespuesta(): number {
    return this.garantias.filter(g => !!g.respuestaFabrica).length;
  }

  private limpiarMensajes(): void {
    this.mensajeSimscloud    = '';
    this.errorSimscloud      = '';
    this.mensajeRespuesta    = '';
    this.errorRespuesta      = '';
    this.mostrarConfirmRespuesta = false;
  }

  private resetForms(): void {
    this.simscloudForm = { encargadoId: this.usuarioId, numeroTramiteSimscloud: '', observaciones: '' };
    this.respuestaForm = { encargadoId: this.usuarioId, resultado: 'aprobada', motivoRechazo: '', comentarioFabrica: '', codigoRespuesta: '', montoCubierto: null };
  }
}