import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, OnChanges, SimpleChanges
} from '@angular/core';
import { RegistroCumplimientoDto } from 'src/app/services/checklist-ensamblaje.service';
import { TareaEditEvent } from '../checklist-tarea-item/checklist-tarea-item.component';

export interface GrupoData {
  nombre   : string;
  registros: RegistroCumplimientoDto[];
  // Pre-calculados para no ejecutar funciones en el template
  completadas: number;
  total      : number;
  porcentaje : number;
}

/**
 * Acordeón de un grupo de tareas.
 * OnPush + stats pre-calculados → cero funciones llamadas en el template.
 */
@Component({
  selector: 'app-checklist-grupo',
  templateUrl : './checklist-grupo.component.html',
  styleUrls  : ['./checklist-grupo.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChecklistGrupoComponent implements OnChanges {

  @Input()  grupo!        : GrupoData;
  @Input()  index         = 0;
  @Input()  expanded      = false;
  @Input()  tareaEnEdicionId: number | null = null;

  @Output() toggleGrupo   = new EventEmitter<number>();
  @Output() tareaToggled  = new EventEmitter<RegistroCumplimientoDto>();
  @Output() tareaEditOpen = new EventEmitter<RegistroCumplimientoDto>();
  @Output() tareaEditSave = new EventEmitter<TareaEditEvent>();
  @Output() tareaEditCancel = new EventEmitter<void>();

  progressClass = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['grupo']) {
      this.progressClass = this.getProgressClass(this.grupo.porcentaje);
    }
  }

  onHeaderClick(): void {
    this.toggleGrupo.emit(this.index);
  }

  isEnEdicion(registro: RegistroCumplimientoDto): boolean {
    return this.tareaEnEdicionId === registro.tareaId;
  }

  private getProgressClass(p: number): string {
    if (p === 100) return 'progress-success';
    if (p >= 50)   return 'progress-warning';
    return 'progress-danger';
  }

  /** trackBy para evitar que Angular re-renderice ítems que no cambiaron */
  trackByTareaId(_: number, r: RegistroCumplimientoDto): number {
    return r.tareaId;
  }
}