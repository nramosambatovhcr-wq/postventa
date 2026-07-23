import { Component, OnInit, ViewChild } from '@angular/core';
import { Subscription, forkJoin } from 'rxjs';
import { Usuario } from 'src/app/models/usuario';
import {  NgForm } from '@angular/forms';
import { Agencia, Agendamiento, Agendamiento1, AgendamientosService } from 'src/app/services/agentamientos.service';
import { AuthService } from 'src/app/services/auth.service';
import { PlanMantenimientoService } from 'src/app/services/planmantenimiento.service';
import { Vehiculo, VehiculoService } from 'src/app/services/vehiculo.service';

interface EstadisticasAgendamiento {
  total: number;
  iniciados: number;
  procesados: number,
  finalizados: number;
  cancelados: number;
}

export interface AgendamientoForm {
  idAgenda?: number;
  idcliente?: number;
  nombre_cliente?: string;
  idplanmantenimiento?: number;
  nombre_plan?: string;
  fecha_mantenimiento?: Date | string;
  kilometrajeactual?: number;
  observaciones?: string;
  estado?: string;
  fecha_creacion?: Date;
  fecha_modificacion?: Date;
  usuario_crea?: string;
  usuario_modificacion?: string;
  idVehiculo?: number;
  fechaAtencion?: Date | string;
  hora_atencion?: string;
  observacion_turno?: string;
  idAgencia?: number;
}

export interface VehiculoForm {
  idcliente?: number;
  chasis?: string;
  modelo?: string;
  anio?: number;
  color?: string;
  placa?: string;
  estado?: string;
  usuario_crea?: string;
}

@Component({ 
  selector: 'app-agenda',
  templateUrl: './agenda.component.html',
  styleUrls: ['./agenda.component.css']
})
export class AgendaComponent implements OnInit {

  @ViewChild('agendamientoForm') agendamientoForm!: NgForm;
  @ViewChild('vehiculoForm') vehiculoForm!: NgForm;

  // Datos principales
  agendamientos: Agendamiento1[] = [];
  agendamientosFiltrados: Agendamiento1[] = [];
  
  // Objetos para los formularios de los modales
  agendamientoSeleccionado: AgendamientoForm = {};
  formularioVehiculo: VehiculoForm = {};
  agencias: Agencia[] = [];

  // Control de modales y vista
  mostrarModalAgendamiento = false;
  mostrarModalVehiculo = false;
  modoEdicion = false;
  vehiculo: any = [];
  planes: any = [];

  // Filtros y búsqueda
  terminoBusqueda = '';
  filtroEstado = '';
  fechaDesde = '';
  fechaHasta = '';
  cliente = '';

  // Control de carga y errores
  isLoadingResults = false;
  error = '';
  mensaje = '';
  private subscription = new Subscription();
  usuario: Usuario | null = null;
  id: any;
  idclient: any;
  errorMessage: any;

  // Estadísticas
  estadisticas: EstadisticasAgendamiento = {
    total: 0,
    iniciados: 0,
    procesados: 0,
    finalizados: 0,
    cancelados: 0
  };

  constructor(
    private agendamientosService: AgendamientosService,
    private authService: AuthService,
    private vehiculoService: VehiculoService,
    private planMantenimiento: PlanMantenimientoService
  ) { }

  ngOnInit(): void {
    this.subscription.add(
      this.authService.usuarioActual$.subscribe(usuario => {
        this.usuario = usuario;
        if (this.usuario && this.usuario.id) {
          this.id = this.usuario.id;
          this.idclient = this.usuario.cliente;
          this.cliente = this.usuario.nombreUsuario;
          console.log('Usuario ID:', this.id);
          console.log('Cliente ID:', this.idclient);
          this.getAgendamientos();
        } else {
          console.warn('No se pudo obtener el ID del usuario.');
          this.errorMessage = 'Usuario no autenticado o ID no disponible.';
        }
      })
    );
  }

  // ========================
  // LÓGICA DE AGENDAMIENTOS
  // ========================
  getAgendamientos(): void {
    this.isLoadingResults = true;
    this.agendamientosService.getAgendamientos().subscribe({
      next: (data: any) => {
        this.agendamientos = data;
        this.agendamientosFiltrados = data;
        this.aplicarFiltros();
        this.calcularEstadisticas();
        this.isLoadingResults = false;
      },
      error: (err) => {
        this.error = 'Error al cargar los agendamientos.';
        console.error(err);
        this.isLoadingResults = false;
      }
    });
  }

  getVehiculos(): void {
    this.vehiculoService.getVehiculoCli(this.idclient).subscribe({
      next: (data: any) => {
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          this.vehiculo = [data];
        } else {
          this.vehiculo = data || [];
        }
        console.log('Vehículos cargados:', this.vehiculo);
      },
      error: (err) => {
        this.error = 'Error al cargar los vehículos.';
        console.error(err);
        this.vehiculo = [];
      }
    });
  }

  // ========================
  // LÓGICA DEL MODAL DE AGENDAMIENTO
  // ========================

  abrirModalCreacionAgendamiento(): void {
    this.getVehiculos();
    this.modoEdicion = false;
    this.error = '';
    
    this.agendamientoSeleccionado = { 
      nombre_cliente: this.cliente,
      estado: 'Iniciado',
      fecha_mantenimiento: new Date(),
      usuario_crea: 'UsuarioDemo'
    };
    
    this.mostrarModalAgendamiento = true;
    
    setTimeout(() => {
      if (this.agendamientoForm) {
        this.agendamientoForm.resetForm(this.agendamientoSeleccionado);
      }
    }, 0);
  }

  abrirModalEdicionAgendamiento(agendamiento: Agendamiento1): void {
    console.log('=== INICIO EDICIÓN ===');
    console.log('1. Agendamiento recibido:', agendamiento);
    console.log('2. Propiedades del agendamiento:', Object.keys(agendamiento));
    
    // Intentar diferentes variaciones de nombres de propiedades
    const idClientePosible = agendamiento.idCliente || (agendamiento as any).id_cliente || (agendamiento as any).idcliente;
    const idVehiculoPosible = agendamiento.idVehiculo || (agendamiento as any).id_vehiculo || (agendamiento as any).idvehiculo;
    
    console.log('3. idCliente detectado:', idClientePosible);
    console.log('4. idVehiculo detectado:', idVehiculoPosible);
    
    this.modoEdicion = true;
    this.error = '';
    this.isLoadingResults = true;
    
    // Preparar el objeto seleccionado
    this.agendamientoSeleccionado = { 
      ...agendamiento, 
      nombre_cliente: agendamiento.nombreCliente, 
      kilometrajeactual: agendamiento.kilometrajeActual,
      idVehiculo: idVehiculoPosible, 
      idplanmantenimiento: agendamiento.idPlanMantenimiento 
    };

    console.log('5. agendamientoSeleccionado preparado:', this.agendamientoSeleccionado);

    // Mostrar el modal inmediatamente
    this.mostrarModalAgendamiento = true;

    // Verificar que tenemos los IDs necesarios
    if (!idClientePosible || !idVehiculoPosible) {
      console.error('ERROR: Faltan IDs necesarios');
      console.error('idCliente:', idClientePosible);
      console.error('idVehiculo:', idVehiculoPosible);
      this.error = 'Error: No se encontraron los IDs necesarios del agendamiento';
      this.isLoadingResults = false;
      return;
    }

    // Cargar todos los datos en paralelo usando forkJoin
    console.log('6. Iniciando carga de datos...');
    console.log('   - Vehículos del cliente:', idClientePosible);
    console.log('   - Planes del vehículo:', idVehiculoPosible);
    
    forkJoin({
      vehiculos: this.vehiculoService.getVehiculoCli(idClientePosible),
      planes: this.planMantenimiento.getPlanesVehi(idVehiculoPosible),
      agencias: this.agendamientosService.getAllAgencias()
    }).subscribe({
      next: (resultado) => {
        console.log('=== DATOS RECIBIDOS DEL BACKEND ===');
        console.log('7. Vehículos raw:', resultado.vehiculos);
        console.log('8. Planes raw:', resultado.planes);
        console.log('9. Agencias raw:', resultado.agencias);
        
        // Procesar vehículos
        if (resultado.vehiculos && typeof resultado.vehiculos === 'object' && !Array.isArray(resultado.vehiculos)) {
          this.vehiculo = [resultado.vehiculos];
        } else {
          this.vehiculo = resultado.vehiculos || [];
        }
        
        // Procesar planes
        if (resultado.planes && typeof resultado.planes === 'object' && !Array.isArray(resultado.planes)) {
          this.planes = [resultado.planes];
        } else {
          this.planes = resultado.planes || [];
        }
        
        // Procesar agencias
        this.agencias = resultado.agencias || [];
        
        console.log('=== DATOS PROCESADOS ===');
        console.log('10. this.vehiculo:', this.vehiculo);
        console.log('11. this.planes:', this.planes);
        console.log('12. this.agencias:', this.agencias);
        console.log('13. Cantidad de vehículos:', this.vehiculo?.length);
        console.log('14. Cantidad de planes:', this.planes?.length);
        console.log('15. Cantidad de agencias:', this.agencias?.length);
        
        this.isLoadingResults = false;
        
        // Resetear formulario después de cargar datos
        setTimeout(() => {
          if (this.agendamientoForm) {
            console.log('16. Reseteando formulario con:', this.agendamientoSeleccionado);
            this.agendamientoForm.resetForm(this.agendamientoSeleccionado);
            console.log('17. Formulario reseteado correctamente');
          } else {
            console.error('ERROR: agendamientoForm no está disponible');
          }
        }, 200);
      },
      error: (err) => {
        console.error('=== ERROR AL CARGAR DATOS ===');
        console.error('Error completo:', err);
        console.error('Status:', err.status);
        console.error('Message:', err.message);
        this.error = 'Error al cargar la información del agendamiento: ' + (err.message || 'Error desconocido');
        this.isLoadingResults = false;
        
        // Inicializar arrays vacíos en caso de error
        this.vehiculo = [];
        this.planes = [];
        this.agencias = [];
      }
    });
  }

  cerrarModalAgendamiento(): void {
    this.mostrarModalAgendamiento = false;
    this.error = '';
    this.agendamientoSeleccionado = {};
    
    if (this.agendamientoForm) {
      this.agendamientoForm.resetForm();
      Object.keys(this.agendamientoForm.controls).forEach(key => {
        const control = this.agendamientoForm.controls[key];
        control.markAsPristine();
        control.markAsUntouched();
        control.updateValueAndValidity();
      });
    }
    
    // Limpiar arrays auxiliares
    this.vehiculo = [];
    this.planes = [];
    this.agencias = [];
  }

  guardarAgendamiento(): void {
    Object.keys(this.agendamientoForm.controls).forEach(key => {
      this.agendamientoForm.controls[key].markAsTouched();
    });

    if (this.agendamientoForm.invalid) {
      this.error = 'Por favor, complete todos los campos requeridos.';
      return;
    }

    console.log('Guardando agendamiento:', this.agendamientoSeleccionado);

    this.isLoadingResults = true;
    this.error = '';

    if (!this.modoEdicion) {
      const nuevoAgendamiento = {
        ...this.agendamientoSeleccionado,
        idcliente: this.id,
        idplanmantenimiento: this.agendamientoSeleccionado.idplanmantenimiento,
        fecha_creacion: new Date(),
        usuario_crea: 'UsuarioDemo'
      } as Agendamiento;
      
      this.agendamientosService.createAgendamiento(nuevoAgendamiento).subscribe({
        next: () => {
          this.mensaje = 'Agendamiento creado exitosamente.';
          this.getAgendamientos();
          this.cerrarModalAgendamiento();
          this.isLoadingResults = false;
        },
        error: (err) => {
          this.error = 'Error al crear el agendamiento.';
          console.error(err);
          this.isLoadingResults = false;
        }
      });
    } else {
      if (this.agendamientoSeleccionado.idAgenda) {
        const agendamientoActualizado = {
          ...this.agendamientoSeleccionado,
          fecha_modificacion: new Date(),
          usuario_modificacion: this.usuario?.nombreUsuario,
        } as Agendamiento;
        
        this.agendamientosService.updateAgendamiento(
          Number(agendamientoActualizado.idAgenda), 
          agendamientoActualizado
        ).subscribe({
          next: () => {
            this.mensaje = 'Agendamiento actualizado exitosamente.';
            this.getAgendamientos();
            this.cerrarModalAgendamiento();
            this.isLoadingResults = false;
          },
          error: (err) => {
            this.error = 'Error al actualizar el agendamiento.';
            console.error(err);
            this.isLoadingResults = false;
          }
        });
      }
    }
  }

  deleteAgendamiento(id: number | undefined): void {
    if (id && confirm('¿Está seguro de que desea eliminar este agendamiento?')) {
      this.agendamientosService.deleteAgendamiento(id).subscribe({
        next: () => {
          this.mensaje = 'Agendamiento eliminado exitosamente.';
          this.getAgendamientos();
        },
        error: (err) => {
          this.error = 'Error al eliminar el agendamiento.';
          console.error(err);
        }
      });
    }
  }

  onVehiculoChange(): void {
    const selectedId = this.agendamientoSeleccionado.idVehiculo;
    console.log('Vehículo cambiado. ID seleccionado:', selectedId);
    if (selectedId) {
      this.getPlanes(selectedId);
    }
  }

  onVehiculoChange1(): void {
    const selectedId = this.agendamientoSeleccionado.idplanmantenimiento;
    console.log('Plan seleccionado:', selectedId);
  }

  getPlanes(id: any): void {
    console.log('Cargando planes para vehículo:', id);
    this.planMantenimiento.getPlanesVehi(id).subscribe({
      next: (data: any) => {
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          this.planes = [data];
        } else {
          this.planes = data || [];
        }
        console.log('Planes cargados:', this.planes);
      },
      error: (err) => {
        this.error = 'Error al cargar los planes.';
        console.error(err);
        this.planes = [];
      }
    });
  }
  
  // ========================
  // LÓGICA DEL MODAL DE VEHÍCULO
  // ========================

  abrirModalCreacionVehiculo(): void {
    this.error = '';
    
    this.formularioVehiculo = {
      estado: 'Iniciado',
      usuario_crea: 'UsuarioDemo'
    };
    
    this.mostrarModalVehiculo = true;
    
    setTimeout(() => {
      if (this.vehiculoForm) {
        this.vehiculoForm.resetForm(this.formularioVehiculo);
      }
    }, 0);
  }

  cerrarModalVehiculo(): void {
    this.mostrarModalVehiculo = false;
    this.error = '';
    this.formularioVehiculo = {};
    
    if (this.vehiculoForm) {
      this.vehiculoForm.resetForm();
      Object.keys(this.vehiculoForm.controls).forEach(key => {
        const control = this.vehiculoForm.controls[key];
        control.markAsPristine();
        control.markAsUntouched();
        control.updateValueAndValidity();
      });
    }
  }

  guardarVehiculo(): void {
    Object.keys(this.vehiculoForm.controls).forEach(key => {
      this.vehiculoForm.controls[key].markAsTouched();
    });

    if (this.vehiculoForm.invalid) {
      this.error = 'Por favor, complete todos los campos requeridos para el vehículo.';
      return;
    }
    
    this.isLoadingResults = true;
    this.error = '';
    
    const nuevoVehiculo = {
      ...this.formularioVehiculo,
      idcliente: this.idclient,
      fecha_creacion: new Date(),
      estado: 'Activo',
      usuario: this.id
    } as Vehiculo;

    this.vehiculoService.createVehiculo(nuevoVehiculo).subscribe({
      next: (vehiculoCreado) => {
        this.mensaje = 'Vehículo creado exitosamente.';
        this.cerrarModalVehiculo();
        this.isLoadingResults = false;
      },
      error: (err) => {
        this.error = 'Error al crear el vehículo. Por favor, intente de nuevo.';
        console.error(err);
        this.isLoadingResults = false;
      }
    });
  }

  // ========================
  // LÓGICA DE FILTROS Y BÚSQUEDA
  // ========================

  aplicarFiltros(): void {
    let agendamientosTemp = this.agendamientos;

    if (this.filtroEstado) {
      agendamientosTemp = agendamientosTemp.filter(a => a.estado === this.filtroEstado);
    }

    if (this.terminoBusqueda) {
      const termino = this.terminoBusqueda.toLowerCase();
      agendamientosTemp = agendamientosTemp.filter(a =>
        a.nombreCliente?.toLowerCase().includes(termino) ||
        a.nombrePlan?.toLowerCase().includes(termino)
      );
    }

    if (this.fechaDesde && this.fechaHasta) {
      const desde = new Date(this.fechaDesde);
      const hasta = new Date(this.fechaHasta);
      agendamientosTemp = agendamientosTemp.filter(a => {
        const fechaAgenda = new Date(a.fecha_mantenimiento);
        return fechaAgenda >= desde && fechaAgenda <= hasta;
      });
    }

    this.agendamientosFiltrados = agendamientosTemp;
  }
  
  onFiltroChange(): void {
    this.aplicarFiltros();
  }
  
  onBusquedaChange(): void {
    this.aplicarFiltros();
  }

  // ========================
  // ESTADÍSTICAS
  // ========================
  calcularEstadisticas(): void {
    this.estadisticas.total = this.agendamientos.length;
    this.estadisticas.iniciados = this.agendamientos.filter(a => a.estado === 'Iniciado').length;
    this.estadisticas.procesados = this.agendamientos.filter(a => a.estado === 'Proceso').length;
    this.estadisticas.finalizados = this.agendamientos.filter(a => a.estado === 'Finalizado').length;
    this.estadisticas.cancelados = this.agendamientos.filter(a => a.estado === 'Cancelado').length;
  }

  // ========================
  // UTILIDADES
  // ========================
  formatearFecha(fecha: any): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString();
  }

  obtenerClaseEstado(estado: string | undefined): string {
    switch (estado) {
      case 'Iniciado': return 'badge-warning';
      case 'Proceso': return 'badge-info';
      case 'Finalizado': return 'badge-success';
      case 'Cancelado': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }
}