import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { RegistroCumplimientoDto } from 'src/app/services/checklist-ensamblaje.service';

export interface TareaEditEvent {
  registro     : RegistroCumplimientoDto;
  realizadoPor : string;
  observaciones: string;
}

/**
 * Componente atómico para una sola tarea del checklist.
 * Usa OnPush: solo se vuelve a renderizar cuando cambian sus @Input.
 * Esto elimina el loop de change-detection del componente padre.
 */
@Component({
  selector: 'app-checklist-tarea-item',
  templateUrl : './checklist-tarea-item.component.html',
  styleUrls  : ['./checklist-tarea-item.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChecklistTareaItemComponent {

  @Input()  registro!      : RegistroCumplimientoDto;
  @Input()  enEdicion      = false;   // true cuando ESTE item está siendo editado
  @Input()  realizadoPor   = '';
  @Input()  observaciones  = '';

  @Output() toggled  = new EventEmitter<RegistroCumplimientoDto>();
  @Output() editOpen = new EventEmitter<RegistroCumplimientoDto>();
  @Output() editSave = new EventEmitter<TareaEditEvent>();
  @Output() editCancel = new EventEmitter<void>();

  // Campos locales del mini-form (no tocan el objeto padre hasta guardar)
  localRealizadoPor  = '';
  localObservaciones = '';

  constructor(private cdr: ChangeDetectorRef) {}

  onToggle(): void {
    this.toggled.emit(this.registro);
  }

  onEditOpen(): void {
    this.localRealizadoPor  = this.registro.realizadoPor  || '';
    this.localObservaciones = this.registro.observaciones || '';
    this.editOpen.emit(this.registro);
  }

  onSave(): void {
    this.editSave.emit({
      registro     : this.registro,
      realizadoPor : this.localRealizadoPor,
      observaciones: this.localObservaciones
    });
  }

  onCancel(): void {
    this.editCancel.emit();
  }

  formatDate(d: string | null | undefined): string {
    if (!d) return '';
    try {
      return new Date(d).toLocaleDateString('es-EC', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
    } catch { return d; }
  }
}