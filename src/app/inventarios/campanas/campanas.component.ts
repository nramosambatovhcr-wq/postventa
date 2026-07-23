import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import {
  InventarioService,
  CampanaInventarioDto,
  CampanaActivaDto
} from 'src/app/services/inventario.service';

interface CampanaRow extends CampanaInventarioDto {
  id: number;
}

interface AgenciaOpcion {
  id: number;
  nombre: string;
  seleccionada: boolean;
}

@Component({
  selector: 'app-campanas',
  templateUrl: './campanas.component.html',
  styleUrls: ['./campanas.component.css']
})
export class CampanasComponent implements OnInit {

  // ── Estado principal ────────────────────────────
  campanas: CampanaRow[] = [];
  campanaActivaId: number | null = null;

  cargando = false;
  guardando = false;
  error = '';

  // ── Formulario (crear / editar) ─────────────────
  mostrarFormulario = false;
  modoEdicion = false;
  campanaEnEdicionId: number | null = null;
  form: CampanaInventarioDto = this.formVacio();

  // ── Agencias para el multi-select del formulario ─
  agenciasOpciones: AgenciaOpcion[] = [];

  constructor(
    private inventarioService: InventarioService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarCampanas();
    this.cargarCampanaActiva();
    this.cargarAgenciasParaFormulario();
  }

  // ── Carga de datos ───────────────────────────────

  cargarCampanas(): void {
    this.cargando = true;
    this.error = '';
    this.inventarioService.getCampanas().subscribe({
      next: (data: any) => {
        this.campanas = Array.isArray(data) ? data : [];
        this.cargando = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar las campañas';
        this.cargando = false;
      }
    });
  }

  cargarCampanaActiva(): void {
    this.inventarioService.getCampanaActiva().subscribe({
      next: (data: CampanaActivaDto) => {
        this.campanaActivaId = data?.id ?? null;
      },
      error: () => {
        // El backend responde 404 cuando no hay ninguna campaña activa;
        // no es un error real para la UI, solo significa "ninguna activa".
        this.campanaActivaId = null;
      }
    });
  }

  private cargarAgenciasParaFormulario(): void {
    this.inventarioService.getAgencias().subscribe({
      next: (data: any) => {
        const lista = Array.isArray(data) ? data : [];
        this.agenciasOpciones = lista.map((a: any) => ({
          id: a.idSerial ?? a.idAgencia,
          nombre: a.nombre,
          seleccionada: false
        }));
      },
      error: () => console.error('No se pudieron cargar las agencias para el formulario de campañas')
    });
  }

  // ── Helpers de estado ────────────────────────────

  esActiva(campana: CampanaRow): boolean {
    return this.campanaActivaId === campana.id;
  }

  estaCerrada(campana: CampanaRow): boolean {
    return (campana.estado || '').toLowerCase() === 'cerrada';
  }

  getBadgeClass(estado: string): string {
    switch ((estado || '').toLowerCase()) {
      case 'activa':   return 'badge-activa';
      case 'cerrada':  return 'badge-cerrada';
      case 'inactiva': return 'badge-inactiva';
      default:         return 'badge-nd';
    }
  }

  // ── Formulario: abrir / cerrar ───────────────────

  private formVacio(): CampanaInventarioDto {
    return {
      nombre: '',
      descripcion: '',
      fecha_inicio: '',
      fecha_fin: '',
      estado: 'inactiva',
      tipo_inventario: '',
      agencias_incluidas: [],
      categorias_incluidas: [],
      observaciones: '',
      usuario_creacion: this.authService.getUsuarioActual()?.nombreUsuario || ''
    };
  }

  abrirCrear(): void {
    this.modoEdicion = false;
    this.campanaEnEdicionId = null;
    this.form = this.formVacio();
    this.agenciasOpciones.forEach(a => a.seleccionada = false);
    this.mostrarFormulario = true;
  }

  abrirEditar(campana: CampanaRow): void {
    this.modoEdicion = true;
    this.campanaEnEdicionId = campana.id;
    this.form = {
      nombre: campana.nombre,
      descripcion: campana.descripcion,
      fecha_inicio: this.toDateInputValue(campana.fecha_inicio),
      fecha_fin: this.toDateInputValue(campana.fecha_fin),
      estado: campana.estado,
      tipo_inventario: campana.tipo_inventario,
      agencias_incluidas: campana.agencias_incluidas || [],
      categorias_incluidas: campana.categorias_incluidas || [],
      observaciones: campana.observaciones,
      usuario_creacion: campana.usuario_creacion
    };

    const incluidas = new Set(this.form.agencias_incluidas || []);
    this.agenciasOpciones.forEach(a => a.seleccionada = incluidas.has(a.id));

    this.mostrarFormulario = true;
  }

  cerrarFormulario(): void {
    this.mostrarFormulario = false;
  }

  private toDateInputValue(value: any): string {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().substring(0, 10);
  }

  // ── Guardar (crear o editar) ─────────────────────

  guardar(): void {
    if (!this.form.nombre?.trim()) {
      alert('El nombre de la campaña es obligatorio');
      return;
    }
    if (!this.form.fecha_inicio || !this.form.fecha_fin) {
      alert('Debes indicar fecha de inicio y fecha de fin');
      return;
    }

    this.form.agencias_incluidas = this.agenciasOpciones
      .filter(a => a.seleccionada)
      .map(a => a.id);

    this.guardando = true;

    const request = (this.modoEdicion && this.campanaEnEdicionId)
      ? this.inventarioService.updateCampana(this.campanaEnEdicionId, this.form)
      : this.inventarioService.createCampana(this.form);

    request.subscribe({
      next: () => {
        this.guardando = false;
        this.mostrarFormulario = false;
        this.cargarCampanas();
      },
      error: (err: any) => {
        this.guardando = false;
        alert('❌ Error al guardar la campaña: ' + (err?.error?.message || err?.message || 'Error de servidor'));
      }
    });
  }

  // ── Acciones de fila: activar / cerrar / eliminar ─

  activar(campana: CampanaRow): void {
    if (this.esActiva(campana)) return;

    const confirmMsg = `¿Activar la campaña "${campana.nombre}"? ` +
      `Esto desactivará automáticamente cualquier otra campaña que esté activa.`;
    if (!confirm(confirmMsg)) return;

    this.inventarioService.activarCampana(campana.id).subscribe({
      next: () => {
        this.campanaActivaId = campana.id;
        this.cargarCampanas();
      },
      error: (err: any) => {
        alert('❌ Error al activar la campaña: ' + (err?.error?.message || err?.message || 'Error de servidor'));
      }
    });
  }

  cerrar(campana: CampanaRow): void {
    if (this.estaCerrada(campana)) return;

    const confirmMsg = `¿Cerrar la campaña "${campana.nombre}"? ` +
      `Quedará marcada como finalizada.`;
    if (!confirm(confirmMsg)) return;

    this.inventarioService.cerrarCampana(campana.id).subscribe({
      next: () => {
        this.cargarCampanas();
      },
      error: (err: any) => {
        alert('❌ Error al cerrar la campaña: ' + (err?.error?.message || err?.message || 'Error de servidor'));
      }
    });
  }

  eliminar(campana: CampanaRow): void {
    const confirmMsg = `¿Eliminar la campaña "${campana.nombre}"? Esta acción no se puede deshacer.`;
    if (!confirm(confirmMsg)) return;

    this.inventarioService.deleteCampana(campana.id).subscribe({
      next: () => {
        this.campanas = this.campanas.filter(c => c.id !== campana.id);
      },
      error: (err: any) => {
        alert('❌ Error al eliminar la campaña: ' + (err?.error?.message || err?.message || 'Error de servidor'));
      }
    });
  }
}