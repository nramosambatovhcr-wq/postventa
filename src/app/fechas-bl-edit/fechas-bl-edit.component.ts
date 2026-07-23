// src/app/components/fechas-bl-edit/fechas-bl-edit.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FechasBLService, FechasBL } from '../services/fechas-bl.service';

@Component({
  selector: 'app-fechas-bl-edit',
  templateUrl: './fechas-bl-edit.component.html',
  styleUrls: ['./fechas-bl-edit.component.css']
})
export class FechasBLEditComponent  implements OnInit {
  fechasForm: FormGroup;
  loading = true;
  blId: string | null = null;
  today = new Date().toISOString().split('T')[0];

  // Definición de las etapas
  etapas = [
    {
      nombre: 'FECHA PEDIDO CONTENEDOR',
      descripcion: 'Fecha en que se realizó el pedido del contenedor',
      campo: 'fpedidocont',
      bloqueado: false
    },
    {
      nombre: 'FECHA DE EMBARQUE',
      descripcion: 'Fecha en que se realizó el embarque',
      campo: 'fembarque',
      bloqueado: false
    },
    {
      nombre: 'FECHA EN TRÁNSITO',
      descripcion: 'Fecha de salida de puerto de origen',
      campo: 'ftransito',
      bloqueado: false
    },
    {
      nombre: 'FECHA ARRIBO EN PUERTO DE DESTINO',
      descripcion: 'Fecha estimada de llegada a puerto de destino',
      campo: 'farrivop',
      bloqueado: false
    },
    {
      nombre: 'FECHA ADUANA',
      descripcion: 'Fecha de revisión en aduana',
      campo: 'faduana',
      bloqueado: false
    },
    {
      nombre: 'FECHA SALIDA ADUANA',
      descripcion: 'Fecha en que la mercadería salió de aduana',
      campo: 'faduanas',
      bloqueado: false
    },
    {
      nombre: 'FECHA ARRIBO EN BODEGA',
      descripcion: 'Fecha de llegada de la mercadería a la bodega de importaciones',
      campo: 'farribob',
      bloqueado: false
    },
    {
      nombre: 'FECHA PRE-LIQUIDACIÓN',
      descripcion: 'Fecha de pre-liquidación de la importación',
      campo: 'fpreliquidacion',
      bloqueado: false
    },
    {
      nombre: 'FECHA DE LIQUIDACIÓN',
      descripcion: 'Fecha final de liquidación de la importación',
      campo: 'fliquidacion',
      bloqueado: false
    }
  ];

  constructor(
    private fb: FormBuilder,
    private fechasBLService: FechasBLService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    // Inicializar el formulario en el constructor
    this.fechasForm = this.initForm();
  }

  ngOnInit(): void {
    this.blId = this.route.snapshot.paramMap.get('id');
    console.log('ID del BL:', this.blId);

    if (this.blId) {
      this.loadFechasBLData();
    } else {
      this.loading = false;
      console.error('No se encontró el ID del BL');
    }
  }

  private initForm(): FormGroup {
    const formGroup: { [key: string]: any } = {};

    this.etapas.forEach(etapa => {
      formGroup[etapa.campo] = [null]; // Inicializar con null
    });

    return this.fb.group(formGroup);
  }

  private loadFechasBLData(): void {
    if (!this.blId) {
      this.loading = false;
      return;
    }

    this.fechasBLService.getFechasByBlId(Number(this.blId)).subscribe({
      next: (fechasBL: FechasBL) => {
        console.log('Datos de FechasBL cargados:', fechasBL);
        this.populateForm(fechasBL);
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error al cargar los datos de FechasBL', error);
        this.loading = false;
        // Si no se encuentran datos, el formulario queda con valores null
        // y el usuario podrá crear un nuevo registro al guardar.
      }
    });
  }

  private populateForm(fechasBL: FechasBL): void {
    const formPatch: { [key: string]: string | null } = {};
    
    this.etapas.forEach(etapa => {
      const fieldValue = fechasBL[etapa.campo as keyof FechasBL];
      
      if (fieldValue) {
        // Convertir la fecha a formato YYYY-MM-DD para el input de tipo date
        const dateValue = new Date(fieldValue as string | Date);
        if (!isNaN(dateValue.getTime())) {
          formPatch[etapa.campo] = dateValue.toISOString().split('T')[0];
        } else {
          formPatch[etapa.campo] = null;
        }
      } else {
        formPatch[etapa.campo] = null;
      }
    });

    this.fechasForm.patchValue(formPatch);
  }

  updateFecha(campo: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    const date = target.value;
    
    if (date) {
      this.fechasForm.get(campo)?.setValue(date);
    } else {
      this.fechasForm.get(campo)?.setValue(null);
    }
  }

  onSubmit(): void {
    if (this.fechasForm.valid && this.blId) {
      this.loading = true;
      
      const formData: Partial<FechasBL> = {
        idbl: this.blId,
        ...this.fechasForm.value
      };

      // Convertir las cadenas de fecha a objetos Date para el backend
      const processedData = this.processFormData(formData);

      this.fechasBLService.updateFechasBL(Number(this.blId), processedData).subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/importaciones']);
        },
        error: (error: any) => {
          console.error('Error al actualizar las fechas del BL', error);
          
          // Si el error es 404 (No encontrado), intentar crear un nuevo registro
          if (error.status === 404) {
            this.createNewRecord(processedData);
          } else {
            this.loading = false;
            // Aquí podrías mostrar un mensaje de error al usuario
          }
        }
      });
    }
  }

  private createNewRecord(data: Partial<FechasBL>): void {
    this.fechasBLService.createFechasBL(data).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/importaciones']);
      },
      error: (createError: any) => {
        console.error('Error al crear las fechas del BL', createError);
        this.loading = false;
        // Aquí podrías mostrar un mensaje de error al usuario
      }
    });
  }

  private processFormData(formData: Partial<FechasBL>): Partial<FechasBL> {
    const processedData: Partial<FechasBL> = { ...formData };

    // Convertir las cadenas de fecha a objetos Date si es necesario
    for (const key in processedData) {
      if (processedData.hasOwnProperty(key) && key !== 'id' && key !== 'idbl') {
        const value = processedData[key as keyof FechasBL];
        
        if (typeof value === 'string' && value.trim() !== '') {
          // Verificar si es una fecha válida
          const dateValue = new Date(value);
          if (!isNaN(dateValue.getTime())) {
            processedData[key as keyof FechasBL] = dateValue as any;
          }
        } else if (value === '' || value === null || value === undefined) {
          processedData[key as keyof FechasBL] = null as any;
        }
      }
    }

    return processedData;
  }

  // Método helper para verificar si una fecha está completa
  isFechaCompleta(campo: string): boolean {
    const value = this.fechasForm.get(campo)?.value;
    return value !== null && value !== '' && value !== undefined;
  }

  // Método helper para obtener el estado de una etapa
  getEstadoEtapa(campo: string): string {
    return this.isFechaCompleta(campo) ? 'completado' : 'pendiente';
  }
   trackByEtapa(index: number, etapa: any): string {
    return etapa.campo;
  }
}