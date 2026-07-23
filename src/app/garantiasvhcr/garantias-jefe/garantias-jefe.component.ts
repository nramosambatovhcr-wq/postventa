import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { Usuario } from 'src/app/models/usuario';
import { GarantiaJefe, GarantiaDetalle, ArchivoGarantia, HistorialEstado, Diagnostico, DiagnosticoRequest, GarantiasVHCRService, EstadoGarantia } from 'src/app/services/garantias-vhcr.service';
import { GarantiasService, OrdenGarantia } from 'src/app/services/garantias.service';


@Component({
  selector: 'app-garantias-jefe',
  templateUrl: './garantias-jefe.component.html',
  styleUrls: ['./garantias-jefe.component.css']
})
export class GarantiasJefeComponent implements OnInit {

  // ─── Usuario ──────────────────────────────────────────
  usuario: Usuario | null = null;
  usuarioId: string = '';
  tallerId: string = '';

  // ─── Listado ──────────────────────────────────────────
  garantias: GarantiaJefe[] = [];
  garantiasFiltradas: GarantiaJefe[] = [];
  loading: boolean = false;
  filtroTexto: string = '';
  filtroEstado: string = '';

  // ─── Selección ────────────────────────────────────────
  garantiaSeleccionada: GarantiaJefe | null = null;
  detalle: GarantiaDetalle | null = null;
  loadingDetalle: boolean = false;
  vistaActiva: 'info' | 'diagnostico' | 'archivos' | 'historial' = 'info';

  // ─── Archivos ─────────────────────────────────────────
  archivos: ArchivoGarantia[] = [];
  loadingArchivos: boolean = false;

  // ─── Historial ────────────────────────────────────────
  historial: HistorialEstado[] = [];
  loadingHistorial: boolean = false;

  // ─── Diagnóstico ──────────────────────────────────────
  diagnostico: Diagnostico | null = null;
  loadingDiag: boolean = false;
  guardandoDiag: boolean = false;
  mensajeDiag: string = '';
  errorDiag: string = '';

  diagForm: DiagnosticoRequest = {
    jefeTallerId:      '',
    analisisDanio:     '',
    metodoReparacion:  '',
    estadoAceite:      '',
    solucionAplicada:  '',
    requiereRepuestos: false,
    repuestosDetalle:  ''
  };

  // ─── Finalizar ────────────────────────────────────────
  finalizando: boolean = false;
  mensajeFinalizar: string = '';
  errorFinalizar: string = '';
  mostrarConfirmFinalizar: boolean = false;

  // ─── OT Oracle (endpoint garantía por agencia) ────────
  ordenesGRT: OrdenGarantia[] = [];
  loadingOrdenes: boolean = false;
  idagencia: string='';

  constructor(
    private authService: AuthService,
    private router: Router,
    private garantiasService: GarantiasVHCRService,
    private garantiasOracleService: GarantiasService
  ) {}

  ngOnInit(): void {
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      if (this.usuario) {
        this.usuarioId = String(this.usuario.id);
        this.idagencia = (usuario as any).idAgencia ;
        this.tallerId  = String((this.usuario as any).taller_id || '');
        this.diagForm.jefeTallerId = this.usuarioId;
        this.cargarGarantias();
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
    this.garantiasService.getGarantiasPorJefe(this.tallerId).subscribe({
      next: (data) => {
        this.garantias = data;
        this.aplicarFiltros();
        this.loading = false;
      },
      error: (err) => { console.error(err); this.loading = false; }
    });
  }

  cargarOrdenesGRT(): void {
    if (!this.idagencia) return;
    this.loadingOrdenes = true;
    this.garantiasOracleService.getOrdenesGarantiaPorOficina(this.idagencia).subscribe({
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

  seleccionarGarantia(g: GarantiaJefe): void {
    this.garantiaSeleccionada = g;
    this.vistaActiva = 'info';
    this.mensajeFinalizar = '';
    this.errorFinalizar = '';
    this.mensajeDiag = '';
    this.errorDiag = '';
    this.mostrarConfirmFinalizar = false;
    this.cargarDetalle(g.garantiaId);
    this.cargarArchivos(g.garantiaId);
  }

  cargarDetalle(garantiaId: string): void {
    this.loadingDetalle = true;
    this.garantiasService.getGarantiaById(garantiaId).subscribe({
      next: (d) => { this.detalle = d; this.loadingDetalle = false; },
      error: (err) => { console.error(err); this.loadingDetalle = false; }
    });
  }

  cargarArchivos(garantiaId: string): void {
    this.loadingArchivos = true;
    this.garantiasService.getArchivos(garantiaId).subscribe({
      next: (a) => { this.archivos = a; this.loadingArchivos = false; },
      error: (err) => { console.error(err); this.loadingArchivos = false; }
    });
  }

  abrirDiagnostico(): void {
    this.vistaActiva = 'diagnostico';
    this.loadingDiag = true;
    this.garantiasService.getDiagnostico(this.garantiaSeleccionada!.garantiaId).subscribe({
      next: (d) => {
        this.diagnostico = d;
        this.diagForm = {
          jefeTallerId:      this.usuarioId,
          analisisDanio:     d.analisisDanio,
          metodoReparacion:  d.metodoReparacion,
          estadoAceite:      d.estadoAceite || '',
          solucionAplicada:  d.solucionAplicada,
          requiereRepuestos: d.requiereRepuestos,
          repuestosDetalle:  d.repuestosDetalle || ''
        };
        this.loadingDiag = false;
      },
      error: () => {
        // No hay diagnóstico aún — formulario en blanco
        this.diagnostico = null;
        this.diagForm = {
          jefeTallerId:      this.usuarioId,
          analisisDanio:     '',
          metodoReparacion:  '',
          estadoAceite:      '',
          solucionAplicada:  '',
          requiereRepuestos: false,
          repuestosDetalle:  ''
        };
        this.loadingDiag = false;
      }
    });
  }

  abrirHistorial(): void {
    this.vistaActiva = 'historial';
    this.loadingHistorial = true;
    this.garantiasService.getHistorialEstados(this.garantiaSeleccionada!.garantiaId).subscribe({
      next: (h) => { this.historial = h; this.loadingHistorial = false; },
      error: (err) => { console.error(err); this.loadingHistorial = false; }
    });
  }

  cerrarPanel(): void {
    this.garantiaSeleccionada = null;
    this.detalle = null;
    this.archivos = [];
    this.historial = [];
    this.diagnostico = null;
  }

  // ══════════════════════════════════════════════════════
  // DIAGNÓSTICO — GUARDAR
  // ══════════════════════════════════════════════════════

  guardarDiagnostico(): void {
    if (!this.diagForm.analisisDanio.trim() ||
        !this.diagForm.metodoReparacion.trim() ||
        !this.diagForm.solucionAplicada.trim()) {
      this.errorDiag = 'Completa los campos obligatorios: análisis, método y solución.';
      return;
    }

    this.guardandoDiag = true;
    this.errorDiag = '';
    this.mensajeDiag = '';

    this.garantiasService.guardarDiagnostico(
      this.garantiaSeleccionada!.garantiaId,
      this.diagForm
    ).subscribe({
      next: () => {
        this.mensajeDiag = 'Diagnóstico guardado correctamente.';
        this.guardandoDiag = false;
        this.cargarGarantias();
      },
      error: (err) => {
        this.errorDiag = err.message || 'Error al guardar diagnóstico.';
        this.guardandoDiag = false;
      }
    });
  }

  // ══════════════════════════════════════════════════════
  // FINALIZAR GARANTÍA
  // ══════════════════════════════════════════════════════

  confirmarFinalizar(): void {
    if (!this.garantiaSeleccionada?.tieneDiagnostico) {
      this.errorFinalizar = 'Debes agregar un diagnóstico antes de finalizar.';
      return;
    }
    this.mostrarConfirmFinalizar = true;
  }

  finalizarGarantia(): void {
    this.finalizando = true;
    this.errorFinalizar = '';
    this.mensajeFinalizar = '';
    this.mostrarConfirmFinalizar = false;

    this.garantiasService.finalizarGarantia(
      this.garantiaSeleccionada!.garantiaId,
      this.usuarioId
    ).subscribe({
      next: () => {
        this.mensajeFinalizar = '✅ Garantía finalizada. El técnico y el encargado han sido notificados.';
        this.finalizando = false;
        this.cargarGarantias();
        // Quitar de la lista tras animación
        setTimeout(() => this.cerrarPanel(), 2500);
      },
      error: (err) => {
        this.errorFinalizar = err.message || 'Error al finalizar garantía.';
        this.finalizando = false;
      }
    });
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
        g.numeroOt.toLowerCase().includes(t) ||
        g.placa.toLowerCase().includes(t)    ||
        g.cliente.toLowerCase().includes(t)  ||
        g.tecnico.toLowerCase().includes(t);
      const estadoMatch = !this.filtroEstado || g.estado === this.filtroEstado;
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

  getColorEstado(estado: EstadoGarantia, urgente = false) {
    return this.garantiasService.getColorEstado(estado, urgente);
  }

  getLabelEstado(estado: EstadoGarantia) {
    return this.garantiasService.getLabelEstado(estado);
  }

  // Wrappers que aceptan string para usarse en el historial del template
  getColorEstadoStr(estado: string, urgente = false): string {
    return this.garantiasService.getColorEstado(estado as EstadoGarantia, urgente);
  }

  getLabelEstadoStr(estado: string): string {
    return this.garantiasService.getLabelEstado(estado as EstadoGarantia);
  }

  formatFecha(f: string): string {
    return new Date(f).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatBytes(b: number): string {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  getIconoArchivo(tipo: string): string {
    return tipo === 'video' ? 'bi-camera-video-fill' : tipo === 'imagen' ? 'bi-image-fill' : 'bi-file-earmark-text-fill';
  }

  contarUrgentes(): number   { return this.garantias.filter(g => g.esUrgente).length; }
  contarSinDiag(): number    { return this.garantias.filter(g => !g.tieneDiagnostico).length; }
  contarPorEstado(e: string) { return this.garantias.filter(g => g.estado === e).length; }

  puedeFinalizarGarantia(): boolean {
    if (!this.garantiaSeleccionada) return false;
    const estadosPermitidos: EstadoGarantia[] = ['pendiente_tecnico', 'en_revision', 'urgente'];
    return estadosPermitidos.includes(this.garantiaSeleccionada.estado) &&
           this.garantiaSeleccionada.tieneDiagnostico;
  }
}