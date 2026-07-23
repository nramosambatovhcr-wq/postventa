// import-detail.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TutorialService } from '../services/tutorial.service';
import { FechasOrdenService } from '../services/fechas-orden.service';
import { FormBuilder, FormGroup } from '@angular/forms';

interface TimelineEvent {
  date: string | null;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed';
}

@Component({
  selector: 'app-import-detail',
  templateUrl: './import-detail.component.html',
  styleUrls: ['./import-detail.component.css']
})
export class ImportDetailComponent implements OnInit {
  proformaId: number = 0;
   fechasForm: FormGroup | any;
  
  lista:any;
  lista2:any;
  lista3:any;
  importDetails = {
    proforma: 240429,
    invoiceNo: '240429J',
    invoiceConBL: '240429J',
    bl: 'SHE25010203',
    contenedor: '',
    liquidacion: 'PENDIENTE',
    fechaEmbarque: null,
    fechaSalidaPuerto: null,
    fechaLlegada: null,
    fechaSalidaAduana: null,
    fechaArriboBodega: null,
    fechaLiquidacion: null,
    estado: 'PENDIENTE' as const
  };

  timelineEvents: TimelineEvent[] = [
    {
      date: null,
      title: 'Fecha de Embarque China',
      description: 'Mercancía embarcada en puerto de origen',
      status: 'pending'
    },
    {
      date: null,
      title: 'Fecha de Salida de Puerto China',
      description: 'Salida del buque de puerto de origen',
      status: 'pending'
    },
    {
      date: null,
      title: 'Fecha Llegada a Guayaquil',
      description: 'Arribo a puerto destino en Guayaquil',
      status: 'pending'
    },
    {
      date: null,
      title: 'Fecha de Salida de Aduana',
      description: 'Nacionalización y liberación de mercancía',
      status: 'pending'
    },
    {
      date: null,
      title: 'Fecha Arribo en Bodega',
      description: 'Recepción en bodega de importaciones',
      status: 'pending'
    },
    {
      date: null,
      title: 'Fecha de Liquidación',
      description: 'Cierre y liquidación de la importación',
      status: 'pending'
    }
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private ordenService: FechasOrdenService,
     private tutorialService: TutorialService
  ) { }

  ngOnInit(): void {
    
    

    // En una aplicación real, obtendríamos el ID de la ruta
    this.route.paramMap.subscribe(params => {
      const id = params.get('proformaId');
      if (id) {
        this.proformaId = +id;
        console.log(this.proformaId);
        this.loadImportDetails(this.proformaId);
      }
    });
    
    this.loadimportaciones();
    this.loadOrdenData();
    this.loaddocus();
    
  }

  loadimportaciones() {
    this.tutorialService.findImportacion(this.proformaId).subscribe({
      next: (data) => {
        this.lista = data;
        console.log(data);
        this.lista2=this.lista[0];
      },
      error: (e) => console.error(e)
    });

  }
  loaddocus() {
    this.tutorialService.findDocus(this.proformaId).subscribe({
      next: (data) => {
        this.lista3 = data;
        console.log(this.lista3);
       // this.lista3=this.lista[0];
      },
      error: (e) => console.error(e)
    });

  }
  etapas:any;
  fembarque='';
  ftransito='';
  farrivop='';
  faduana='';
  faduanas='';
  farribob='';
  fpreliquidacion='';
  

  loadOrdenData(): void {
    if (this.proformaId) {
      console.log('hola');
      
      this.ordenService.getFechasByOrdenId(this.proformaId).subscribe(
        (orden:any) => {
          console.log(orden);
          this.fembarque=orden.fembarque;
         // console.log(this.fembarque);
         if(this.fembarque!=null){
          this.fembarque = this.fembarque.split('T')[0];
          console.log(this.fembarque);
         }
          
          this.ftransito=orden.ftransito;
          if(this.ftransito!=null){
          this.ftransito=this.ftransito.split('T')[0];
          console.log(this.ftransito);
          }
          
          this.farrivop=orden.farrivop;
          if(this.farrivop!=null){
          this.farrivop=this.farrivop.split('T')[0];
          console.log(this.farrivop);
          }
          this.faduana=orden.faduana;
          if(this.faduana!=null){
          this.faduana=this.faduana.split('T')[0];
          }
          this.faduanas=orden.faduanas;
          if(this.faduanas!=null){
          this.faduanas=this.faduanas.split('T')[0];
          }
          this.farribob=orden.farribob;
          if(this.farribob!=null){
          this.farribob=this.farribob.split('T')[0];
          }
          this.fpreliquidacion=orden.fpreliquidacion;
          if(this.fpreliquidacion!=null){
          this.fpreliquidacion=this.fpreliquidacion.split('T')[0];
          }
          /*
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
          ];*/

          this.timelineEvents = [
            {
              date: this.fembarque,
              title: 'Fecha de Embarque China',
              description: 'Mercancía embarcada en puerto de origen',
              status: 'pending'
            },
            {
              date: this.ftransito,
              title: 'Fecha de Salida de Puerto China',
              description: 'Salida del buque de puerto de origen',
              status: 'pending'
            },
            {
              date: this.farrivop,
              title: 'Fecha Llegada a Guayaquil',
              description: 'Arribo a puerto destino en Guayaquil',
              status: 'pending'
            },
            {
              date: this.faduanas,
              title: 'Fecha de Salida de Aduana',
              description: 'Nacionalización y liberación de mercancía',
              status: 'pending'
            },
            {
              date: this.farribob,
              title: 'Fecha Arribo en Bodega',
              description: 'Recepción en bodega de importaciones',
              status: 'pending'
            },
            {
              date: this.fpreliquidacion,
              title: 'Fecha de Liquidación',
              description: 'Cierre y liquidación de la importación',
              status: 'pending'
            }
          ];

          console.log(this.timelineEvents);
        }
      );
    } else {
    //  this.loading = false;
    }
  }



  loadImportDetails(id: number): void {
    // En una aplicación real, esto se cargaría desde un servicio
    console.log('Cargando detalles para proforma' +id);
    // Simulación de datos cargados
    this.updateTimelineStatus();
  }

  updateTimelineStatus(): void {
    // Simulamos algunos eventos completados para mostrar estado de la timeline
    this.timelineEvents[0].date = '15/01/2025';
    this.timelineEvents[0].status = 'completed';
    
    this.timelineEvents[1].date = '20/01/2025';
    this.timelineEvents[1].status = 'completed';
    
    this.timelineEvents[2].status = 'active';
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  downloadDetails(): void {
    console.log('Descargando detalles');
  }

  updateStatus(): void {
    console.log('Actualizando estado');
  }

  // Transformar estado a clase CSS
  getStatusClass(status: string): string {
    return status.toLowerCase().replace(' ', '-')
  }


  editImport(): void {
    this.router.navigate(['/details', this.proformaId, 'edit',this.proformaId]);
  }
  editDates(){
    this.router.navigate(['/details', this.proformaId, 'seguimiento',this.proformaId]);
  }
}