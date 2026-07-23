import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, ChangeDetectorRef,
  OnChanges, SimpleChanges
} from '@angular/core';
import {
  ChecklistDetailDto, RegistroCumplimientoDto,
  ChecklistEnsamblajeService, UpdateRegistroCumplimientoDto
} from 'src/app/services/checklist-ensamblaje.service';
import { GrupoData } from '../checklist-grupo/checklist-grupo.component';
import { TareaEditEvent } from '../checklist-tarea-item/checklist-tarea-item.component';

/**
 * Vista completa de Gestión de Tareas.
 *
 * Recibe el checklist ya cargado como @Input — sin llamadas HTTP propias.
 * OnPush + grupos pre-calculados → elimina el freeze del componente padre.
 */
@Component({
  selector: 'app-checklist-tareas-page',
  templateUrl : './checklist-tareas-page.component.html',
  styleUrls  : ['./checklist-tareas-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChecklistTareasPageComponent implements OnChanges {

  @Input()  checklist!   : ChecklistDetailDto;
  @Input()  loading      = false;

  @Output() volver       = new EventEmitter<void>();
  @Output() checklistActualizado = new EventEmitter<ChecklistDetailDto>();

  // Grupos pre-calculados: se recalculan SOLO cuando cambia el @Input checklist
  grupos          : GrupoData[] = [];
  gruposExpandidos: Set<number> = new Set();
  tareaEnEdicionId: number | null = null;

  // Para la llamada de persistencia
  private pendingEdit: {
    checklistId  : number;
    tareaId      : number;
    completado   : boolean;
    realizadoPor : string;
    observaciones: string;
  } | null = null;

  savingError = '';

  constructor(
    private checklistService: ChecklistEnsamblajeService,
    private cdr             : ChangeDetectorRef
  ) {}

  // ────────────────────────────────────────────
  // OnChanges: recalcular grupos SOLO si cambió el checklist
  // ────────────────────────────────────────────
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['checklist'] && this.checklist) {
      this.grupos = this.buildGrupos(this.checklist);
      // Expandir todos al cargar por primera vez
      if (changes['checklist'].firstChange || !changes['checklist'].previousValue) {
        setTimeout(() => {
          this.grupos.forEach((_, i) => this.gruposExpandidos.add(i));
          this.cdr.markForCheck();
        }, 0);
      }
    }
  }

  // ────────────────────────────────────────────
  // Construcción de grupos (se llama 1 sola vez)
  // ────────────────────────────────────────────
  private buildGrupos(checklist: ChecklistDetailDto): GrupoData[] {
    const registros = checklist.registros ?? [];
    const mapa = new Map<string, RegistroCumplimientoDto[]>();

    for (const r of registros) {
      const nombre =
        (r as any).grupo              ||
        (r as any).grupoTrabajo       ||
        (r as any).nombreGrupo        ||
        (r as any).nombreGrupoTrabajo ||
        (r as any).area               ||
        (r as any).groupName          ||
        'Sin grupo';
      if (!mapa.has(nombre)) mapa.set(nombre, []);
      mapa.get(nombre)!.push(r);
    }

    return Array.from(mapa.entries()).map(([nombre, regs]) => {
      const total       = regs.length;
      const completadas = regs.filter(r => r.completado).length;
      return {
        nombre,
        registros  : regs,
        completadas,
        total,
        porcentaje : total ? Math.round((completadas / total) * 100) : 0
      };
    });
  }

  // ────────────────────────────────────────────
  // Recalcular porcentajes del grupo que cambió
  // ────────────────────────────────────────────
  private refreshGrupo(grupoIndex: number): void {
    const g = this.grupos[grupoIndex];
    if (!g) return;
    g.completadas = g.registros.filter(r => r.completado).length;
    g.porcentaje  = g.total ? Math.round((g.completadas / g.total) * 100) : 0;
    // Forzar nueva referencia para que OnPush del hijo detecte el cambio
    this.grupos = [...this.grupos];
  }

  private refreshChecklist(): void {
    const regs        = this.checklist.registros ?? [];
    const completadas = regs.filter(r => r.completado).length;
    this.checklist = {
      ...this.checklist,
      tareasCompletadas: completadas,
      porcentajeAvance : regs.length ? Math.round((completadas / regs.length) * 100) : 0
    };
    this.checklistActualizado.emit(this.checklist);
  }

  // ────────────────────────────────────────────
  // Acordeón
  // ────────────────────────────────────────────
  toggleGrupo(index: number): void {
    this.gruposExpandidos.has(index)
      ? this.gruposExpandidos.delete(index)
      : this.gruposExpandidos.add(index);
    this.gruposExpandidos = new Set(this.gruposExpandidos); // nueva referencia
    this.cdr.markForCheck();
  }

  isExpanded(i: number): boolean { return this.gruposExpandidos.has(i); }

  expandirTodos(): void {
    this.grupos.forEach((_, i) => this.gruposExpandidos.add(i));
    this.gruposExpandidos = new Set(this.gruposExpandidos);
    this.cdr.markForCheck();
  }

  colapsarTodos(): void {
    this.gruposExpandidos.clear();
    this.gruposExpandidos = new Set();
    this.cdr.markForCheck();
  }

  // ────────────────────────────────────────────
  // Toggle tarea (checkbox)
  // ────────────────────────────────────────────
  onTareaToggled(registro: RegistroCumplimientoDto): void {
    // Invertir el estado localmente (el checkbox ya fue clickeado pero con [checked] no con ngModel)
    registro.completado = !registro.completado;

    if (registro.completado) {
      if (!registro.fechaRealizacion) {
        registro.fechaRealizacion = new Date().toISOString().split('T')[0] as any;
      }
      this.tareaEnEdicionId = registro.tareaId;
    } else {
      registro.realizadoPor     = '';
      registro.fechaRealizacion = undefined as any;
      registro.observaciones    = '';
      if (this.tareaEnEdicionId === registro.tareaId) {
        this.tareaEnEdicionId = null;
      }
    }

    this.pendingEdit = {
      checklistId  : this.checklist.id,
      tareaId      : registro.tareaId,
      completado   : registro.completado,
      realizadoPor : registro.realizadoPor  || '',
      observaciones: registro.observaciones || ''
    };

    // Recalcular stats
    const grupoIdx = this.grupos.findIndex(g =>
      g.registros.some(r => r.tareaId === registro.tareaId)
    );
    if (grupoIdx >= 0) this.refreshGrupo(grupoIdx);
    this.refreshChecklist();
    this.cdr.markForCheck();

    this.persistir();
  }

  // ────────────────────────────────────────────
  // Edición de detalles (realizadoPor / observaciones)
  // ────────────────────────────────────────────
  onEditOpen(registro: RegistroCumplimientoDto): void {
    this.tareaEnEdicionId = registro.tareaId;
    this.pendingEdit = {
      checklistId  : this.checklist.id,
      tareaId      : registro.tareaId,
      completado   : registro.completado,
      realizadoPor : registro.realizadoPor  || '',
      observaciones: registro.observaciones || ''
    };
    this.cdr.markForCheck();
  }

  onEditSave(event: TareaEditEvent): void {
    const { registro, realizadoPor, observaciones } = event;
    registro.realizadoPor  = realizadoPor;
    registro.observaciones = observaciones;

    this.pendingEdit = {
      checklistId  : this.checklist.id,
      tareaId      : registro.tareaId,
      completado   : registro.completado,
      realizadoPor,
      observaciones
    };

    this.tareaEnEdicionId = null;
    this.cdr.markForCheck();
    this.persistir();
  }

  onEditCancel(): void {
    this.tareaEnEdicionId = null;
    this.cdr.markForCheck();
  }

  // ────────────────────────────────────────────
  // Persistir en el API
  // ────────────────────────────────────────────
  private persistir(): void {
    if (!this.pendingEdit) return;
    const e = this.pendingEdit;
    const update: UpdateRegistroCumplimientoDto = {
      completado   : e.completado,
      observaciones: e.observaciones,
      realizadoPor : e.realizadoPor
    };
    this.checklistService.updateRegistroCumplimiento(e.checklistId, e.tareaId, update)
      .subscribe({
        next : () => { this.savingError = ''; },
        error: () => {
          this.savingError = 'Error al guardar. Intente nuevamente.';
          this.cdr.markForCheck();
        }
      });
  }

  // ────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────
  formatDate(d: string): string {
    return this.checklistService.formatDateForDisplay(d);
  }

  getPorcentaje(p: number): string {
    return this.checklistService.getPorcentajeFormateado(p);
  }

  getProgressClass(p: number): string {
    return this.checklistService.getProgressClass(p);
  }

  trackByGrupo(_: number, g: GrupoData): string { return g.nombre; }
}