import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { InventarioService, CampanaInventarioDto } from 'src/app/services/inventario.service';
import {
  UsuariosInventarioService,
  PersonaInventario,
  SlotLogin,
  AsignacionCampana,
  PersonaDto
} from 'src/app/services/usuarios-inventario.service';
 
/** Fila de la grilla de asignaciones: un slot + su asignación vigente (si existe) */
interface FilaSlot {
  slot: SlotLogin;
  asignacion: AsignacionCampana | null;
}

@Component({
  selector: 'app-invusuario',
  templateUrl: './invusuario.component.html',
  styleUrls: ['./invusuario.component.css']
})
export class InvusuarioComponent implements OnInit {
 
  // ── Tabs ────────────────────────────────────────
  tabActiva: 'asignaciones' | 'personas' | 'slots' = 'asignaciones';
 
  // ── Contexto compartido ─────────────────────────
  usuario: any = null;
  campanas: CampanaInventarioDto[] = [];
  agencias: any[] = [];
  personas: PersonaInventario[] = [];
  slots: SlotLogin[] = [];
 
  // ── Asignaciones ────────────────────────────────
  campanaSeleccionada: number | null = null;
  agenciaSeleccionada: number | null = null;
  filasSlots: FilaSlot[] = [];
  historial: AsignacionCampana[] = [];
  mostrarHistorial = false;
  cargandoAsignaciones = false;
  errorAsignaciones = '';
  // edición inline por fila
  slotEditando: number | null = null;          // idimport en edición
  personaParaAsignar: number | null = null;
  guardandoAsignacion = false;
  confirmBajaId: number | null = null;         // id de asignación a dar de baja
  mensajeOk = '';
 
  // ── Personas ────────────────────────────────────
  cargandoPersonas = false;
  errorPersonas = '';
  busquedaPersona = '';
  mostrarFormPersona = false;
  personaEditandoId: number | null = null;
  guardandoPersona = false;
  formPersona: PersonaDto = this.formPersonaVacio();
  confirmEstadoPersonaId: number | null = null;
 
  // ── Slots ───────────────────────────────────────
  cargandoSlots = false;
  errorSlots = '';
  confirmSlotId: number | null = null;
  cambiandoSlotId: number | null = null;
 
  constructor(
    private authService: AuthService,
    private inventarioService: InventarioService,
    private usuariosService: UsuariosInventarioService
  ) {}
 
  ngOnInit(): void {
    this.usuario = this.authService.getUsuarioActual();
    this.cargarBase();
  }
 
  // ════════════════════════════════════════════════
  // Carga inicial: campañas, agencias, personas, slots
  // ════════════════════════════════════════════════
  cargarBase(): void {
    this.cargandoAsignaciones = true;
    forkJoin({
      campanas: this.inventarioService.getCampanas(),
      agencias: this.inventarioService.getAgencias(),
      personas: this.usuariosService.getPersonas(),
      slots:    this.usuariosService.getSlots()
    }).subscribe({
      next: ({ campanas, agencias, personas, slots }) => {
        this.campanas = campanas || [];
        this.agencias = Array.isArray(agencias) ? agencias : Object.values(agencias);
        this.personas = personas.personas || [];
        this.slots    = slots.slots || [];
 
        // Preseleccionar la campaña activa si existe
        const activa = this.campanas.find(c => (c.estado || '').toLowerCase() === 'activa');
        if (activa?.id) {
          this.campanaSeleccionada = activa.id;
        }
        this.cargandoAsignaciones = false;
      },
      error: () => {
        this.errorAsignaciones = 'No se pudieron cargar los datos base';
        this.cargandoAsignaciones = false;
      }
    });
  }
 
  // ════════════════════════════════════════════════
  // TAB: ASIGNACIONES
  // ════════════════════════════════════════════════
 
  get personasActivas(): PersonaInventario[] {
    return this.personas.filter(p => p.estado);
  }
 
  get asignacionesVigentes(): number {
    return this.filasSlots.filter(f => f.asignacion !== null).length;
  }
 
  onContextoChange(): void {
    this.filasSlots = [];
    this.historial = [];
    this.errorAsignaciones = '';
    this.mensajeOk = '';
    this.slotEditando = null;
    this.confirmBajaId = null;
    if (this.campanaSeleccionada && this.agenciaSeleccionada) {
      this.cargarAsignaciones();
    }
  }
 
  cargarAsignaciones(): void {
    if (!this.campanaSeleccionada || !this.agenciaSeleccionada) return;
    this.cargandoAsignaciones = true;
    this.errorAsignaciones = '';
 
    this.usuariosService
      .getAsignaciones(this.campanaSeleccionada, this.agenciaSeleccionada, true)
      .subscribe({
        next: (resp) => {
          const todas = resp.asignaciones || [];
          const vigentes = new Map<number, AsignacionCampana>();
          todas.forEach(a => {
            if (!a.fecha_baja && !vigentes.has(a.idimport)) {
              vigentes.set(a.idimport, a);
            }
          });
          this.historial = todas.filter(a => a.fecha_baja !== null);
          this.filasSlots = this.slots.map(slot => ({
            slot,
            asignacion: vigentes.get(slot.idimport) || null
          }));
          this.cargandoAsignaciones = false;
        },
        error: () => {
          this.errorAsignaciones = 'No se pudieron cargar las asignaciones';
          this.cargandoAsignaciones = false;
        }
      });
  }
 
  /** Abre el selector inline de persona para un slot */
  iniciarAsignacion(fila: FilaSlot): void {
    this.slotEditando = fila.slot.idimport;
    this.personaParaAsignar = fila.asignacion?.persona_id ?? null;
    this.confirmBajaId = null;
    this.mensajeOk = '';
  }
 
  cancelarAsignacion(): void {
    this.slotEditando = null;
    this.personaParaAsignar = null;
  }
 
  guardarAsignacion(fila: FilaSlot): void {
    if (!this.personaParaAsignar || !this.campanaSeleccionada || !this.agenciaSeleccionada) return;
    this.guardandoAsignacion = true;
 
    this.usuariosService.asignar({
      campanaId: this.campanaSeleccionada,
      agenciaId: this.agenciaSeleccionada,
      personaId: this.personaParaAsignar,
      idimport:  fila.slot.idimport,
      usuarioAsigno: this.usuario?.nombre || this.usuario?.nombreUsuario || undefined
    }).subscribe({
      next: (resp) => {
        this.mensajeOk = resp?.mensaje || 'Asignación guardada';
        this.guardandoAsignacion = false;
        this.slotEditando = null;
        this.personaParaAsignar = null;
        this.cargarAsignaciones();
      },
      error: (err) => {
        this.errorAsignaciones = err?.error || 'Error al guardar la asignación';
        this.guardandoAsignacion = false;
      }
    });
  }
 
  pedirBaja(asignacion: AsignacionCampana): void {
    this.confirmBajaId = asignacion.id;
    this.slotEditando = null;
    this.mensajeOk = '';
  }
 
  cancelarBaja(): void {
    this.confirmBajaId = null;
  }
 
  confirmarBaja(asignacion: AsignacionCampana): void {
    this.confirmBajaId = null;
    this.usuariosService.darDeBaja(asignacion.id).subscribe({
      next: () => {
        this.mensajeOk = `Slot ${this.getNombreSlot(asignacion.idimport)} liberado`;
        this.cargarAsignaciones();
      },
      error: () => this.errorAsignaciones = 'No se pudo dar de baja la asignación'
    });
  }
 
  getNombreSlot(idimport: number): string {
    return this.slots.find(s => s.idimport === idimport)?.nombre_usuario || `#${idimport}`;
  }
 
  getNombreAgencia(agenciaId: number | null): string {
    if (agenciaId == null) return '';
    const ag = this.agencias.find(a => Number(a.idSerial ?? a.id) === Number(agenciaId)
      || Number(a.idAgencia) === Number(agenciaId));
    return ag?.nombre || `Agencia ${agenciaId}`;
  }
 
  // ════════════════════════════════════════════════
  // TAB: PERSONAS
  // ════════════════════════════════════════════════
 
  get personasFiltradas(): PersonaInventario[] {
    const q = this.busquedaPersona.trim().toLowerCase();
    if (!q) return this.personas;
    return this.personas.filter(p =>
      p.nombre_completo.toLowerCase().includes(q) ||
      (p.cedula || '').toLowerCase().includes(q) ||
      (p.especialidad || '').toLowerCase().includes(q)
    );
  }
 
  private formPersonaVacio(): PersonaDto {
    return { nombreCompleto: '', cedula: '', telefono: '', email: '', especialidad: '', observaciones: '' };
  }
 
  nuevaPersona(): void {
    this.personaEditandoId = null;
    this.formPersona = this.formPersonaVacio();
    this.mostrarFormPersona = true;
    this.errorPersonas = '';
  }
 
  editarPersona(p: PersonaInventario): void {
    this.personaEditandoId = p.id;
    this.formPersona = {
      nombreCompleto: p.nombre_completo,
      cedula: p.cedula || '',
      telefono: p.telefono || '',
      email: p.email || '',
      especialidad: p.especialidad || '',
      observaciones: p.observaciones || ''
    };
    this.mostrarFormPersona = true;
    this.errorPersonas = '';
  }
 
  cancelarFormPersona(): void {
    this.mostrarFormPersona = false;
    this.personaEditandoId = null;
  }
 
  guardarPersona(): void {
    if (!this.formPersona.nombreCompleto?.trim()) {
      this.errorPersonas = 'El nombre completo es obligatorio';
      return;
    }
    this.guardandoPersona = true;
    this.errorPersonas = '';
 
    const peticion = this.personaEditandoId
      ? this.usuariosService.actualizarPersona(this.personaEditandoId, this.formPersona)
      : this.usuariosService.crearPersona(this.formPersona);
 
    peticion.subscribe({
      next: () => {
        this.guardandoPersona = false;
        this.mostrarFormPersona = false;
        this.personaEditandoId = null;
        this.recargarPersonas();
      },
      error: (err) => {
        this.errorPersonas = err?.error || 'Error al guardar la persona';
        this.guardandoPersona = false;
      }
    });
  }
 
  recargarPersonas(): void {
    this.cargandoPersonas = true;
    this.usuariosService.getPersonas().subscribe({
      next: (resp) => {
        this.personas = resp.personas || [];
        this.cargandoPersonas = false;
      },
      error: () => {
        this.errorPersonas = 'No se pudieron recargar las personas';
        this.cargandoPersonas = false;
      }
    });
  }
 
  pedirCambioEstadoPersona(p: PersonaInventario): void {
    this.confirmEstadoPersonaId = p.id;
  }
 
  cancelarCambioEstadoPersona(): void {
    this.confirmEstadoPersonaId = null;
  }
 
  confirmarCambioEstadoPersona(p: PersonaInventario): void {
    this.confirmEstadoPersonaId = null;
    this.usuariosService.cambiarEstadoPersona(p.id, !p.estado).subscribe({
      next: () => this.recargarPersonas(),
      error: () => this.errorPersonas = 'No se pudo cambiar el estado de la persona'
    });
  }
 
  // ════════════════════════════════════════════════
  // TAB: SLOTS DE LOGIN
  // ════════════════════════════════════════════════
 
  pedirCambioSlot(slot: SlotLogin): void {
    this.confirmSlotId = slot.idimport;
  }
 
  cancelarCambioSlot(): void {
    this.confirmSlotId = null;
  }
 
  confirmarCambioSlot(slot: SlotLogin): void {
    this.confirmSlotId = null;
    this.cambiandoSlotId = slot.idimport;
    this.usuariosService.cambiarEstadoSlot(slot.idimport, !slot.activo).subscribe({
      next: () => {
        this.cambiandoSlotId = null;
        this.recargarSlots();
      },
      error: (err) => {
        this.cambiandoSlotId = null;
        this.errorSlots = err?.error || 'No se pudo cambiar el estado del login';
      }
    });
  }
 
  recargarSlots(): void {
    this.cargandoSlots = true;
    this.errorSlots = '';
    this.usuariosService.getSlots().subscribe({
      next: (resp) => {
        this.slots = resp.slots || [];
        this.cargandoSlots = false;
        // Refrescar la grilla de asignaciones si estaba cargada
        if (this.campanaSeleccionada && this.agenciaSeleccionada) {
          this.cargarAsignaciones();
        }
      },
      error: () => {
        this.errorSlots = 'No se pudieron recargar los usuarios de login';
        this.cargandoSlots = false;
      }
    });
  }
 
  // ════════════════════════════════════════════════
  // Helpers de UI
  // ════════════════════════════════════════════════
 
  cambiarTab(tab: 'asignaciones' | 'personas' | 'slots'): void {
    this.tabActiva = tab;
    this.mensajeOk = '';
  }
 
  getInicialesPersona(nombre: string): string {
    const parts = (nombre || '').trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0]?.[0]?.toUpperCase() || '?';
  }
}
