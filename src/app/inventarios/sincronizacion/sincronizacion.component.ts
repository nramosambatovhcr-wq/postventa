import { Component, OnInit, OnDestroy } from '@angular/core';
import { InventarioService } from 'src/app/services/inventario.service';
import { Subscription, interval } from 'rxjs';
import { takeWhile } from 'rxjs/operators';

interface Agencia {
  idSerial: number;
  idAgencia: string;
  nombre: string;
  codigo: string;
}

interface ResultadoSincronizacion {
  totalLeidos: number;
  insertados: number;
  actualizados: number;
  errores: number;
  detallesErrores: string[];
}

@Component({
  selector: 'app-sincronizacion',
  templateUrl: './sincronizacion.component.html',
  styleUrls: ['./sincronizacion.component.css']
})
export class SincronizacionComponent implements OnInit, OnDestroy {
  
  // Agencias
  agencias: Agencia[] = [];
  agenciaSeleccionada: string = '';
  cargandoAgencias: boolean = false;
  
  // Estado de sincronización
  sincronizando: boolean = false;
  progreso: number = 0;
  mensajeEstado: string = '';
  tipoEstado: 'info' | 'success' | 'error' | null = null;
  
  // Resultados
  resultados: ResultadoSincronizacion | null = null;
  
  // Simulación de progreso (para UX)
  private progresoSubscription: Subscription | null = null;

  constructor(private inventarioService: InventarioService) {}

  ngOnInit() {
    this.cargarAgencias();
  }

  ngOnDestroy() {
    this.detenerProgreso();
  }

  cargarAgencias() {
    this.cargandoAgencias = true;
    this.inventarioService.getAgencias().subscribe({
      next: (data: any) => {
        // Convertir objeto a array si es necesario
        this.agencias = Array.isArray(data) ? data : Object.values(data);
        this.cargandoAgencias = false;
      },
      error: (error) => {
        console.error('Error al cargar agencias:', error);
        this.mensajeEstado = 'Error al cargar agencias';
        this.tipoEstado = 'error';
        this.cargandoAgencias = false;
      }
    });
  }

  iniciarSincronizacion() {
    if (!this.agenciaSeleccionada) {
      this.mensajeEstado = 'Por favor selecciona una agencia';
      this.tipoEstado = 'error';
      return;
    }

    // Resetear estado
    this.sincronizando = true;
    this.progreso = 0;
    this.resultados = null;
    this.mensajeEstado = 'Conectando con Oracle...';
    this.tipoEstado = 'info';

    // Iniciar animación de progreso simulado (hasta 90%)
    this.simularProgreso();

    // Llamar al servicio
    this.inventarioService.sincronizarInventarioDesdeOracle(this.agenciaSeleccionada)
      .subscribe({
        next: (respuesta: any) => {
          this.detenerProgreso();
          this.progreso = 100;
          this.sincronizando = false;
          
          // Guardar resultados
          this.resultados = {
            totalLeidos: respuesta.resumen?.totalLeidos || 0,
            insertados: respuesta.resumen?.insertados || 0,
            actualizados: respuesta.resumen?.actualizados || 0,
            errores: respuesta.resumen?.errores || 0,
            detallesErrores: respuesta.resumen?.detallesErrores || []
          };

          const agenciaNombre = this.agencias.find(a => a.codigo === this.agenciaSeleccionada)?.nombre 
            || this.agenciaSeleccionada;
          
          this.mensajeEstado = `¡Sincronización completada para ${agenciaNombre}!`;
          this.tipoEstado = 'success';
        },
        error: (error) => {
          this.detenerProgreso();
          this.sincronizando = false;
          this.progreso = 0;
          this.mensajeEstado = 'Error en la sincronización: ' + (error.message || 'Error desconocido');
          this.tipoEstado = 'error';
        }
      });
  }

  private simularProgreso() {
    // Simular progreso hasta el 90% mientras esperamos la respuesta
    this.progresoSubscription = interval(500)
      .pipe(takeWhile(() => this.sincronizando && this.progreso < 90))
      .subscribe(() => {
        // Incremento aleatorio entre 5 y 15%
        const incremento = Math.floor(Math.random() * 10) + 5;
        this.progreso = Math.min(this.progreso + incremento, 90);
        
        // Actualizar mensaje según el progreso
        if (this.progreso < 30) {
          this.mensajeEstado = 'Leyendo datos desde Oracle...';
        } else if (this.progreso < 60) {
          this.mensajeEstado = 'Procesando registros...';
        } else if (this.progreso < 90) {
          this.mensajeEstado = 'Actualizando base de datos PostgreSQL...';
        }
      });
  }

  private detenerProgreso() {
    if (this.progresoSubscription) {
      this.progresoSubscription.unsubscribe();
      this.progresoSubscription = null;
    }
  }

  resetear() {
    this.sincronizando = false;
    this.progreso = 0;
    this.mensajeEstado = '';
    this.tipoEstado = null;
    this.resultados = null;
    this.agenciaSeleccionada = '';
  }
}