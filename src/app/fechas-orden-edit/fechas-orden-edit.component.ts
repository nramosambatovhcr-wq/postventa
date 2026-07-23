// src/app/components/fechas-orden-edit/fechas-orden-edit.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
 
import { FechasOrdenService } from '../services/fechas-orden.service';

@Component({
  selector: 'app-fechas-orden-edit',
  templateUrl: './fechas-orden-edit.component.html',
  styleUrls: ['./fechas-orden-edit.component.css']
})
export class FechasOrdenEditComponent implements OnInit {
  fechasForm: FormGroup | any;
  loading = true;
  ordenId: any;
  today = new Date().toISOString().split('T')[0];
  
  fembarque:string='';
  ftransito:string='';


  constructor(
    private fb: FormBuilder,
    private ordenService: FechasOrdenService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.ordenId = this.route.snapshot.paramMap.get('id');
    console.log(this.ordenId);
    
    this.loadOrdenData();

    const formGroupConfig: { [key: string]: any[] } = {};
    
    this.etapas.forEach(etapa => {
      formGroupConfig[etapa.campo] = [etapa.valorDefault];
    });
    
    // Initialize the form
    this.fechasForm = this.fb.group(formGroupConfig);
  }

  
  etapas = [
    {
      nombre: 'Orden de Compra',
      descripcion: 'Fecha en que se realizó la orden de compra',
      campo: 'fcotizacion',
      valorDefault:this.fembarque,
      bloqueado: true  // Este campo estará bloqueado
    },
    {
      nombre: 'Producción',
      descripcion: 'Fecha en que inició la producción',
      campo: 'fechaProduccion',
      valorDefault: new Date(2024, 4, 15).toISOString().split('T')[0],
      bloqueado: true  // Este campo no estará bloqueado
    },
    {
      nombre: 'FECHA DE EMBARQUE CHINA',
      descripcion: 'Fecha en que se realizó el embarque',
      campo: 'fembarque',
      valorDefault: null,
      bloqueado: false
    },
    {
      nombre: 'FECHA DE SALIDA DE PUERTO CHINA',
      descripcion: 'Fecha en que se realizó el embarque',
      campo: 'ftransito',
      valorDefault: null,
      bloqueado: false
    },
    {
      nombre: 'FECHA LLEGADA A GUAYAQUIL',
      descripcion: 'Fecha estimada de llegada a puerto',
      campo: 'farrivop',
      valorDefault: null,
      bloqueado: false
    },
    {
      nombre: 'FECHA ADUANA',
      descripcion: 'Fecha de revision aduana',
      campo: 'faduana',
      valorDefault: null,
      bloqueado: false
    },
    
    {
      nombre: 'FECHA DE SALIDA DE ADUANA',
      descripcion: 'Fecha en que se desanuadizo',
      campo: 'faduanas',
      valorDefault: null,
      bloqueado: false
    },
    {
      nombre: 'FECHA ARRIBO EN BODEGA IMPORTACIONES',
      descripcion: 'Fecha estimada de llegada a puerto',
      campo: 'farribob',
      valorDefault: null,
      bloqueado: false
    },
    {
      nombre: 'FECHA DE LIQUIDACION',
      descripcion: 'Fecha estimada de entrega en almacén',
      campo: 'fpreliquidacion',
      valorDefault: null,
      bloqueado: false
    }
  ];

  initForm(): void {
    const formGroup: { [key: string]: any } = {};
  
    this.etapas.forEach(etapa => {
      formGroup[etapa.campo] = [''];
    });
    
    this.fechasForm = this.fb.group(formGroup);
  }

  loadOrdenData(): void {
    if (this.ordenId) {
      console.log('hola');
      
      this.ordenService.getFechasByOrdenId(this.ordenId).subscribe(
        (orden:any) => {
          console.log(orden);
          this.fembarque=orden.fembarque;
          console.log(this.fembarque);
          this.fembarque = this.fembarque.split('T')[0];
          console.log(this.fembarque);
          this.ftransito=orden.fembarque;
          this.ftransito=this.ftransito.split('T')[0];
          
          this.etapas = [
            {
              nombre: 'Orden de Compra',
              descripcion: 'Fecha en que se realizó la orden de compra',
              campo: 'fcotizacion',
              valorDefault:this.fembarque,
              bloqueado: true  // Este campo estará bloqueado
            },
            {
              nombre: 'Producción',
              descripcion: 'Fecha en que inició la producción',
              campo: 'fechaProduccion',
              valorDefault: new Date(2024, 4, 15).toISOString().split('T')[0],
              bloqueado: true  // Este campo no estará bloqueado
            },
            {
              nombre: 'FECHA DE EMBARQUE CHINA',
              descripcion: 'Fecha en que se realizó el embarque',
              campo: 'fembarque',
              valorDefault: this.fembarque,
              bloqueado: false
            },
            {
              nombre: 'FECHA DE SALIDA DE PUERTO CHINA',
              descripcion: 'Fecha en que se realizó el embarque',
              campo: 'ftransito',
              valorDefault: this.ftransito,
              bloqueado: false
            },
            {
              nombre: 'FECHA LLEGADA A GUAYAQUIL',
              descripcion: 'Fecha estimada de llegada a puerto',
              campo: 'farrivop',
              valorDefault: null,
              bloqueado: false
            },
            {
              nombre: 'FECHA ADUANA',
              descripcion: 'Fecha de revision aduana',
              campo: 'faduana',
              valorDefault: null,
              bloqueado: false
            },
            
            {
              nombre: 'FECHA DE SALIDA DE ADUANA',
              descripcion: 'Fecha en que se desanuadizo',
              campo: 'faduanas',
              valorDefault: null,
              bloqueado: false
            },
            {
              nombre: 'FECHA ARRIBO EN BODEGA IMPORTACIONES',
              descripcion: 'Fecha estimada de llegada a puerto',
              campo: 'farribob',
              valorDefault: null,
              bloqueado: false
            },
            {
              nombre: 'FECHA DE LIQUIDACION',
              descripcion: 'Fecha estimada de entrega en almacén',
              campo: 'fpreliquidacion',
              valorDefault: null,
              bloqueado: false
            }
          ];
          console.log(this.etapas);
          this.etapas.forEach(etapa => {
            if (orden[etapa.campo]) {
              // Convert string date to Date object if needed
              this.fechasForm.get(etapa.campo).setValue(
                orden[etapa.campo] instanceof Date 
                  ? orden[etapa.campo] 
                  : new Date(orden[etapa.campo])
              );
            }
          });
          this.loading = false;
          const formGroupConfig: { [key: string]: any[] } = {};
    
    this.etapas.forEach(etapa => {
      formGroupConfig[etapa.campo] = [etapa.valorDefault];
    });
    
    // Initialize the form
    this.fechasForm = this.fb.group(formGroupConfig);
        },
        (error:any) => {
          console.error('Error loading order data', error);
          this.loading = false;
        }
      );
    } else {
      this.loading = false;
    }
  }

  updateFecha(campo: string, event: any): void {
    const date = event.target ? event.target.value : event.value;
    if (date) {
      this.fechasForm.get(campo).setValue(date);
    }
  }

  onSubmit(): void {
    if (this.fechasForm.valid) {
      this.loading = true;
      const formData = this.fechasForm.value;
      
      this.ordenService.updateFechasOrden(this.ordenId, formData).subscribe(
        () => {
          this.loading = false;
          this.router.navigate(['/importaciones']);
        },
        (error:any) => {
          console.error('Error updating dates', error);
          this.loading = false;
        }
      );
    }
  }
}