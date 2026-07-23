// agendamientos.component.ts

import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Usuario } from 'src/app/models/usuario';
import { Agendamiento, Agendamiento1, AgendamientosService } from 'src/app/services/agentamientos.service';
import { AuthService } from 'src/app/services/auth.service';
import { PlanMantenimientoService } from 'src/app/services/planmantenimiento.service';
import { Vehiculo, VehiculoService } from 'src/app/services/vehiculo.service';
 
import { CalendarEvent } from 'angular-calendar';
import { startOfDay, subMonths, addMonths } from 'date-fns'; // Importaciones necesarias para la navegación
 

interface EstadisticasAgendamiento {
  total: number;
  iniciados: number;
  finalizados: number;
  cancelados: number;
  proceso: number;
}

export interface AgendamientoForm {
  id_agenda?: number;
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
  idAgenda?: number;
  tipo_mantenimiento?: string; // <-- Interfaz ya actualizada
}

export interface VehiculoForm {
  idcliente?: number;
  chasis?: string;
  modelo?: string;
  capacidad?: number;
  anio?: number;
  color?: string;
  placa?: string;
  estado?: string;
  usuario_crea?: string;
}

export interface ModeloVehiculo {
  nombre: string;
  capacidades: number[]; // Lista de capacidades disponibles para ese modelo
}

@Component({  
  
  selector: 'app-agendamientos',
  templateUrl: './agendamientos.component.html',
  styleUrls: ['./agendamientos.component.css']
})
export class AgendamientosComponent implements OnInit {

  @ViewChild('agendamientoForm') agendamientoForm!: NgForm;
  @ViewChild('vehiculoForm') vehiculoForm!: NgForm;
  @ViewChild('rescheduleForm') rescheduleForm!: NgForm;

  // Datos principales
  agendamientos: Agendamiento1[] = [];
  agendamientosFiltrados: Agendamiento1[] = [];

  // Objetos para los formularios de los modales
  agendamientoSeleccionado: AgendamientoForm = {};
  formularioVehiculo: VehiculoForm = {};
  agendamientoReagendar: AgendamientoForm = {};

  // Control de modales y vista
  mostrarModalAgendamiento = false;
  mostrarModalVehiculo = false;
  mostrarModalReagendar = false;
  modoEdicion = false;
  vehiculo: any;
  clientes:any;
  planes: any;
  nombrecliente:any;

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
    finalizados: 0,
    cancelados: 0,
    proceso: 0
  };

  viewDate: Date = new Date();
  view: 'month' | 'week' | 'day' = 'month'; // Aquí ya tienes la propiedad 'view'
  calendarEvents: CalendarEvent[] = [];
  
  // <-- MODIFICACIÓN PARA PESTAÑAS: Propiedad para controlar la pestaña activa (Ya estaba declarada)
  tipoMantenimientoActivo: 'Preventivo' | 'Correctivo' = 'Preventivo';
 

  constructor(
    private agendamientosService: AgendamientosService,
    private authService: AuthService,
    private vehiculoService: VehiculoService,
    private planMantenimiento: PlanMantenimientoService
  ) {


   }

  ngOnInit(): void {
    this.subscription.add(
      this.authService.usuarioActual$.subscribe(usuario => {
        this.usuario = usuario;
        if (this.usuario && this.usuario.id) {
          this.id = this.usuario.id;
          this.idclient = this.usuario.cliente;
          this.cliente = this.usuario.nombreUsuario;
          console.log(this.idclient);

          console.log(this.cliente);

          this.getAgendamientos();
          this.getVlientes()

        } else {
          console.warn('No se pudo obtener el ID del usuario. No se cargarán los pedidos.');
          this.errorMessage = 'No se pudo cargar los pedidos: Usuario no autenticado o ID no disponible.';
        }
      })
    );
  }

  modelosDisponibles: ModeloVehiculo[] = [
      { nombre: 'HOWO', capacidades: [3.5, 5,6] },
      { nombre: 'T5G', capacidades: [7,8,8.5,9] },
      { nombre: 'T7H', capacidades: [10, 12, 14] },
      { nombre: 'C7H', capacidades: [20] }
    ];

    // Arreglo que se usará para llenar el SELECT de capacidades.
    // Inicialmente vacío o con las capacidades del primer modelo.
    capacidadesFiltradas: number[] = [];
    
    // ... (resto de tus propiedades y constructor)

    // Función que se dispara cuando el modelo cambia
    onModeloChange(): void {
      const modeloSeleccionado = this.formularioVehiculo.modelo;
      
      // Encontrar el objeto ModeloVehiculo que coincida
      const modelo = this.modelosDisponibles.find(m => m.nombre === modeloSeleccionado);

      if (modelo) {
        // Asignar las capacidades específicas de ese modelo
        this.capacidadesFiltradas = modelo.capacidades;
      } else {
        // Si no se encuentra (o se deselecciona), la lista queda vacía
        this.capacidadesFiltradas = [];
      }
      
      // Reiniciar la capacidad seleccionada si no es compatible con el nuevo modelo
      if (!this.capacidadesFiltradas.includes(Number(this.formularioVehiculo.capacidad))) {
          this.formularioVehiculo.capacidad = 0; // o un valor por defecto si lo prefieres
      }
    }

 

// Función para convertir agendamientos a eventos del calendario
private convertirAgendamientosAEventos(): void {
  this.calendarEvents = this.agendamientos.map(agendamiento => ({
    start: startOfDay(new Date(agendamiento.fecha_mantenimiento)),
    title: `${agendamiento.nombreCliente} - ${agendamiento.nombrePlan}`,
    color: {
      primary: this.obtenerColorEvento(agendamiento.estado),
      secondary: this.obtenerColorEventoSecundario(agendamiento.estado)
    },
    meta: {
      agendamiento: agendamiento
    }
  }));
}

// Función para obtener colores según el estado
private obtenerColorEvento(estado: string): string {
  switch (estado) {
    case 'Iniciado': return '#ffc107';
    case 'Proceso': return '#17a2b8';
    case 'Finalizado': return '#28a745';
    case 'Cancelado': return '#dc3545';
    default: return '#667eea';
  }
}

private obtenerColorEventoSecundario(estado: string): string {
  switch (estado) {
    case 'Iniciado': return '#fff3cd';
    case 'Proceso': return '#d1ecf1';
    case 'Finalizado': return '#d4edda';
    case 'Cancelado': return '#f8d7da';
    default: return '#e3f2fd';
  }
}

// AGREGAR estas funciones adicionales a tu agendamientos.component.ts

// Función para rastrear elementos del ngFor (mejora el rendimiento)
trackByDay(index: number, day: Date): string {
  return day.toDateString();
}

// Función que se ejecuta al hacer clic en un día del calendario
onDayClick(day: Date): void {
  const agendamientos = this.getAgendamientosForDay(day);
  if (agendamientos.length > 0) {
    console.log(`Agendamientos para ${day.toDateString()}:`, agendamientos);
    // Aquí puedes agregar lógica para mostrar un modal con los detalles del día
  } else {
    console.log(`No hay agendamientos para ${day.toDateString()}`);
    // Aquí podrías abrir el modal de creación de agendamiento con esta fecha preseleccionada
  }
}

// Función que se ejecuta al hacer clic en un evento específico
onEventClick(event: Event, agendamiento: any): void {
  event.stopPropagation(); // Evita que se ejecute el click del día
  console.log('Evento clickeado:', agendamiento);
  // Aquí puedes abrir el modal de edición con el agendamiento seleccionado
  this.abrirModalEdicionAgendamiento(agendamiento);
}

// Función mejorada getDaysInMonth con mejor lógica
getDaysInMonth(): Date[] {
  const year = this.viewDate.getFullYear();
  const month = this.viewDate.getMonth();
  
  // Primer día del mes
  const firstDay = new Date(year, month, 1);
  
  // Calcular el primer día de la grilla (puede ser del mes anterior)
  const startDate = new Date(firstDay);
  const dayOfWeek = (firstDay.getDay() + 6) % 7; // Convertir domingo=0 a lunes=0
  startDate.setDate(startDate.getDate() - dayOfWeek);
  
  // Generar exactamente 42 días (6 semanas de 7 días)
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i));
  }
  
  return days;
}

// Función mejorada para formatear fecha con más opciones
getFormattedDate(date: Date): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Asegurar que las funciones de navegación trabajen correctamente
previousView(): void {
  this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() - 1, 1);
}

nextView(): void {
  this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1);
}

irAHoy(): void {
  this.viewDate = new Date();
}

// Funciones de utilidad mejoradas
isToday(date: Date): boolean {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}

isSameMonth(date: Date): boolean {
  return date.getMonth() === this.viewDate.getMonth() &&
         date.getFullYear() === this.viewDate.getFullYear();
}

hasEventsOnDay(date: Date): boolean {
  return this.getAgendamientosForDay(date).length > 0;
}

getAgendamientosForDay(date: Date): any[] {
  if (!this.agendamientos || this.agendamientos.length === 0) {
    return [];
  }
  
  return this.agendamientos.filter(agendamiento => {
    if (!agendamiento.fecha_mantenimiento) return false;
    
    const fechaAgendamiento = new Date(agendamiento.fecha_mantenimiento);
    return fechaAgendamiento.getDate() === date.getDate() &&
           fechaAgendamiento.getMonth() === date.getMonth() &&
           fechaAgendamiento.getFullYear() === date.getFullYear();
  });
}

 
getAgendamientos(): void {
  this.isLoadingResults = true;
  this.agendamientosService.getAgendamientoByIdCli(this.idclient).subscribe({
    next: (data: Agendamiento1[] | Agendamiento1) => {
      const agendamientosArray = Array.isArray(data) ? data : (data ? [data] : []);

      this.agendamientos = agendamientosArray;
      
      // Muestra todos los agendamientos que llegan del servidor, sin filtros.
      this.agendamientosFiltrados = agendamientosArray;

      this.aplicarFiltros(); // Este método se encargará de los filtros del formulario
      this.calcularEstadisticas();
      this.convertirAgendamientosAEventos(); // ← Agregar esta línea
      this.isLoadingResults = false;
    },
    error: (err) => {
      this.error = 'Error al cargar los agendamientos.';
      console.error(err);
      this.agendamientos = [];
      this.calendarEvents = []; // Limpiar eventos del calendario
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
          this.vehiculo = data;
        }
        console.log(this.vehiculo);
      },
      error: (err) => {
        this.error = 'Error al cargar los vehículos.';
        console.error(err);
      }
    });
  }

   getVlientes(): void {
    this.agendamientosService.getClienteById(this.idclient).subscribe({
      next: (data: any) => {
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          this.clientes = [data];
          this.nombrecliente = this.clientes[0].nombreDelCliente;
          console.log(this.nombrecliente);
          
        } else {
          this.clientes = data;
          this.nombrecliente = this.clientes[0].nombreDelCliente;
          console.log(this.nombrecliente);
        }
        console.log(this.nombrecliente);
        console.log(this.clientes);
      },
      error: (err) => {
        this.error = 'Error al cargar los clientes.';
        console.error(err);
      }
    });
  }

  getPlanes(id: any): void {
    this.planMantenimiento.getPlanesVehi(id).subscribe({
      next: (data: any) => {
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          this.planes = [data];
        } else {
          this.planes = data;
        }
        console.log(this.planes);
      },
      error: (err) => {
        this.error = 'Error al cargar los planes.';
        console.error(err);
      }
    });
  }

  onVehiculoChange(): void {
    const selectedId = this.agendamientoSeleccionado.idVehiculo;
    console.log(`The selected vehicle ID is: ${selectedId}`);
    if (selectedId) {
      this.getPlanes(selectedId);
    }
  }

  onVehiculoChange1(): void {
    const selectedId = this.agendamientoSeleccionado.idplanmantenimiento;
    console.log(`The selected plan ID is: ${selectedId}`);
  }

  // ========================
  // LÓGICA DEL MODAL DE AGENDAMIENTO
  // ========================
  
  // <-- MODIFICACIÓN PARA PESTAÑAS: Función para cambiar la pestaña activa
  setTipoMantenimiento(tipo: 'Preventivo' | 'Correctivo'): void {
    console.log(tipo)
    this.tipoMantenimientoActivo = tipo;
    console.log(this.tipoMantenimientoActivo = tipo)
    this.agendamientoSeleccionado.tipo_mantenimiento = tipo; 
  }

  abrirModalCreacionAgendamiento(): void {
    this.getVehiculos();
    this.getVlientes();
    this.modoEdicion = false;
    
    // <-- MODIFICACIÓN PARA PESTAÑAS: Inicializa el nuevo campo
    this.agendamientoSeleccionado = {
      nombre_cliente: this.nombrecliente,
      estado: 'Iniciado',
      fecha_mantenimiento: new Date(),
      usuario_crea: this.idclient,
      tipo_mantenimiento: 'Preventivo' // <--- NUEVO CAMPO
    };
    
    // <-- MODIFICACIÓN PARA PESTAÑAS: Sincroniza la vista
    this.tipoMantenimientoActivo = 'Preventivo'; 
    
    this.mostrarModalAgendamiento = true;
  }

  abrirModalEdicionAgendamiento1(agendamiento: Agendamiento1): void {
    console.log(agendamiento);
    this.getVehiculos();
    this.getVlientes();
    this.getPlanes(agendamiento.idVehiculo);

    this.modoEdicion = true;

    // INICIO DEL CÓDIGO CORREGIDO: Validación y asignación de la fecha
    let fechaMantenimientoFormateada = '';
    const fechaMantenimiento = new Date(agendamiento.fecha_mantenimiento);

    if (!isNaN(fechaMantenimiento.getTime())) {
      fechaMantenimientoFormateada = fechaMantenimiento.toISOString().substring(0, 10);
    } else {
      console.warn('Fecha de mantenimiento inválida, se usará la fecha actual.');
      fechaMantenimientoFormateada = new Date().toISOString().substring(0, 10);
    }
    // FIN DEL CÓDIGO CORREGIDO

    this.agendamientoSeleccionado = {
      ...agendamiento,
      nombre_cliente: agendamiento.nombreCliente,
      kilometrajeactual: agendamiento.kilometrajeActual,
      idVehiculo: agendamiento.idVehiculo,
      idplanmantenimiento: agendamiento.idPlanMantenimiento,
      fecha_mantenimiento: fechaMantenimientoFormateada
    };

    console.log(this.agendamientoSeleccionado);
    this.mostrarModalAgendamiento = true;
  }

  abrirModalEdicionAgendamiento(agendamiento: Agendamiento1): void {
    console.log(agendamiento);
    this.getVehiculos();
    this.getVlientes();
    this.getPlanes(agendamiento.idVehiculo);

    this.modoEdicion = true;

    //INICIO DEL CÓDIGO DE FECHA (Mantenido)
    let fechaMantenimientoFormateada = '';
    const fechaMantenimiento = new Date(agendamiento.fecha_mantenimiento);

    if (!isNaN(fechaMantenimiento.getTime())) {
      fechaMantenimientoFormateada = fechaMantenimiento.toISOString().substring(0, 10);
    } else {
      console.warn('Fecha de mantenimiento inválida, se usará la fecha actual.');
      fechaMantenimientoFormateada = new Date().toISOString().substring(0, 10);
    }
    

    this.agendamientoSeleccionado = {
      ...agendamiento,
      nombre_cliente: agendamiento.nombreCliente,
      kilometrajeactual: agendamiento.kilometrajeActual,
      idVehiculo: agendamiento.idVehiculo,
      idplanmantenimiento: agendamiento.idPlanMantenimiento,
      fecha_mantenimiento: fechaMantenimientoFormateada,
      // 1. AGREGA EL TIPO DE MANTENIMIENTO AL OBJETO DE EDICIÓN
      // Si el campo existe en la data (agendamiento.tipoMantenimiento), úsalo. Si no, asume 'Preventivo'.
      tipo_mantenimiento: agendamiento.tipoMantenimiento || 'Preventivo'
    };

    // 2. ESTABLECE LA PESTAÑA ACTIVA EN EL COMPONENTE
    // Esto hace que el HTML muestre el formulario correcto.
    if( this.agendamientoSeleccionado.tipo_mantenimiento=='Preventivo'){
      this.tipoMantenimientoActivo = 'Preventivo';
    }
  if( this.agendamientoSeleccionado.tipo_mantenimiento=='Correctivo'){
      this.tipoMantenimientoActivo = 'Correctivo';
    }    


    console.log(this.agendamientoSeleccionado);
    this.mostrarModalAgendamiento = true;
  }

  cerrarModalAgendamiento(): void {
    this.mostrarModalAgendamiento = false;
    this.agendamientoSeleccionado = {};
    if (this.agendamientoForm) {
      this.agendamientoForm.resetForm();
    }
  }

  guardarAgendamiento(): void {
    if (this.agendamientoForm.invalid) {
      this.error = 'Por favor, complete todos los campos requeridos.';
      return;
    }

    console.log(this.agendamientoSeleccionado);
    this.isLoadingResults = true;

    if (!this.modoEdicion) {
      const nuevoAgendamiento = {
        ...this.agendamientoSeleccionado,
        idcliente: this.idclient,
        idplanmantenimiento: this.agendamientoSeleccionado.idplanmantenimiento,
        fecha_creacion: new Date(),
        usuario_crea: 'UsuarioDemo'
      } as Agendamiento;

    console.log( nuevoAgendamiento)
      this.agendamientosService.createAgendamiento(nuevoAgendamiento).subscribe({
        next: () => {
          this.mensaje = 'Agendamiento creado exitosamente.';
          this.getAgendamientos();
          this.cerrarModalAgendamiento();
        },
        error: (err) => {
          this.error = 'Error al crear el agendamiento.';
          console.error(err);
          this.isLoadingResults = false;
        }
      });
    } else {
      if (this.agendamientoSeleccionado.id_agenda) {
        const agendamientoActualizado = {
          ...this.agendamientoSeleccionado,
          fecha_modificacion: new Date(),
          usuario_modificacion: this.usuario?.nombreUsuario,
        } as Agendamiento;

        this.agendamientosService.updateAgendamiento(Number(this.agendamientoSeleccionado.id_agenda), agendamientoActualizado).subscribe({
          next: () => {
            this.mensaje = 'Agendamiento actualizado exitosamente.';
            this.getAgendamientos();
            this.cerrarModalAgendamiento();
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

  // ========================
  // LÓGICA DEL MODAL DE VEHÍCULO
  // ========================

  abrirModalCreacionVehiculo(): void {
    this.formularioVehiculo = {
      estado: 'Iniciado',
      usuario_crea: 'UsuarioDemo'
    };
    this.mostrarModalVehiculo = true;
  }

  cerrarModalVehiculo(): void {
    this.mostrarModalVehiculo = false;
    this.formularioVehiculo = {};
    if (this.vehiculoForm) {
      this.vehiculoForm.resetForm();
    }
  }

  guardarVehiculo(): void {
    if (this.vehiculoForm.invalid) {
      this.error = 'Por favor, complete todos los campos requeridos para el vehículo.';
      return;
    }

    this.isLoadingResults = true;
console.log(this.formularioVehiculo);

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
      },
      error: (err) => {
        this.error = 'Error al crear el vehículo. Por favor, intente de nuevo.';
        console.error(err);
        this.isLoadingResults = false;
      },
      complete: () => {
        this.isLoadingResults = false;
      }
    });
  }

  // ========================
  // LÓGICA DE FILTROS Y BÚSQUEDA
  // ========================

  aplicarFiltros(): void {
    let agendamientosTemp = this.agendamientos.filter(a => a.estado === 'Iniciado' || a.estado === 'Proceso');

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
    this.estadisticas.finalizados = this.agendamientos.filter(a => a.estado === 'Finalizado').length;
    this.estadisticas.cancelados = this.agendamientos.filter(a => a.estado === 'Cancelado').length;
    this.estadisticas.proceso = this.agendamientos.filter(a => a.estado === 'Proceso').length;
  }

  // ========================
  // UTILIDADES
  // ========================
  formatearFecha(fecha: any): string {
    if (!fecha) return 'N/A';
    const parsedDate = new Date(fecha);
    if (isNaN(parsedDate.getTime())) {
      return 'Fecha Inválida';
    }
    return parsedDate.toLocaleDateString();
  }

  obtenerClaseEstado(estado: string | undefined): string {
    switch (estado) {
      case 'Iniciado': return 'badge-warning';
      case 'Finalizado': return 'badge-success';
      case 'Cancelado': return 'badge-danger';
      case 'Proceso': return 'badge-info';
      default: return 'badge-secondary';
    }
  }

  guardarReagendamiento(): void {
    if (!this.agendamientoReagendar.id_agenda || !this.agendamientoReagendar.fecha_mantenimiento) {
      this.error = 'Fecha de reagendamiento inválida.';
      return;
    }
    this.isLoadingResults = true;
    const datos = { fecha_mantenimiento: this.agendamientoReagendar.fecha_mantenimiento, estado: 'Iniciado' };
    this.agendamientosService.updateAgendamiento(this.agendamientoReagendar.id_agenda, datos as any).subscribe({
      next: () => {
        this.mensaje = 'Agendamiento reagendado con éxito.';
        this.cerrarModalReagendar();
        this.getAgendamientos();
        this.isLoadingResults = false;
      },
      error: (err) => {
        this.error = 'Error al reagendar la cita: ' + err.message;
        console.error('Error al reagendar la cita:', err);
        this.isLoadingResults = false;
      }
    });
  }

  // Agregar estas propiedades y métodos a tu agendamientos.component.ts

// Nueva propiedad para el calendario del modal
modalViewDate: Date = new Date();

// ========================
// MÉTODOS PARA EL CALENDARIO EN MODAL
// ========================

// Navegación del calendario en modal
previousViewModal(): void {
  this.modalViewDate = new Date(this.modalViewDate.getFullYear(), this.modalViewDate.getMonth() - 1, 1);
}

nextViewModal(): void {
  this.modalViewDate = new Date(this.modalViewDate.getFullYear(), this.modalViewDate.getMonth() + 1, 1);
}

irAHoyModal(): void {
  this.modalViewDate = new Date();
}

// Generar días para el calendario del modal
getDaysInMonthModal(): Date[] {
  const year = this.modalViewDate.getFullYear();
  const month = this.modalViewDate.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const startDate = new Date(firstDay);
  const dayOfWeek = (firstDay.getDay() + 6) % 7; // Convertir domingo=0 a lunes=0
  startDate.setDate(startDate.getDate() - dayOfWeek);
  
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i));
  }
  
  return days;
}

// Verificar si pertenece al mes actual del modal
isSameMonthModal(date: Date): boolean {
  return date.getMonth() === this.modalViewDate.getMonth() &&
         date.getFullYear() === this.modalViewDate.getFullYear();
}

// Verificar si la fecha está seleccionada
isSelectedDate(date: Date): boolean {
  if (!this.agendamientoReagendar.fecha_mantenimiento) return false;
  
  const selectedDate = new Date(this.agendamientoReagendar.fecha_mantenimiento);
  return date.getDate() === selectedDate.getDate() &&
         date.getMonth() === selectedDate.getMonth() &&
         date.getFullYear() === selectedDate.getFullYear();
}

// Verificar si es una fecha pasada
isPastDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate < today;
}

// Verificar si hay conflictos en la fecha
hasConflictOnDate(fecha: any): boolean {
  if (!fecha) return false;
  
  const fechaSeleccionada = new Date(fecha);
  return this.agendamientos.some(a => {
    if (a.idAgenda === this.agendamientoReagendar.id_agenda) return false;
    if (a.estado === 'Cancelado' || a.estado === 'Finalizado') return false;
    
    const fechaAgendamiento = new Date(a.fecha_mantenimiento);
    return fechaAgendamiento.getDate() === fechaSeleccionada.getDate() &&
           fechaAgendamiento.getMonth() === fechaSeleccionada.getMonth() &&
           fechaAgendamiento.getFullYear() === fechaSeleccionada.getFullYear();
  });
}

// Manejar click en día del calendario del modal
onDayClickModal(day: Date): void {
  // No permitir selección de fechas pasadas
  if (this.isPastDate(day)) {
    this.error = 'No se puede seleccionar una fecha pasada.';
    return;
  }
  
  // No permitir fechas de otros meses
  if (!this.isSameMonthModal(day)) {
    return;
  }
  
  // Verificar conflictos
  const dayString = day.toISOString().substring(0, 10);
  if (this.hasConflictOnDate(dayString)) {
    this.error = `Ya existe un agendamiento activo para el ${this.formatearFecha(dayString)}. Por favor, elija otra fecha.`;
    return;
  }
  
  // Seleccionar la fecha
  this.agendamientoReagendar.fecha_mantenimiento = dayString;
  this.error = ''; // Limpiar errores
}

// Método mejorado para abrir modal de reagendamiento
abrirModalReagendar(agendamiento: any): void {
  // Resetear la vista del modal al mes actual
  this.modalViewDate = new Date();
  
  // Formatear fecha actual del agendamiento
  let fechaMantenimientoFormateada = '';
  const fechaMantenimiento = new Date(agendamiento.fecha_mantenimiento);

  if (!isNaN(fechaMantenimiento.getTime())) {
    fechaMantenimientoFormateada = fechaMantenimiento.toISOString().substring(0, 10);
    // Actualizar la vista del modal al mes del agendamiento actual
    this.modalViewDate = new Date(fechaMantenimiento.getFullYear(), fechaMantenimiento.getMonth(), 1);
  } else {
    console.warn('Fecha de reagendamiento inválida, se usará la fecha actual.');
    fechaMantenimientoFormateada = new Date().toISOString().substring(0, 10);
  }

  this.agendamientoReagendar = {
    id_agenda: agendamiento.idAgenda,
    nombre_cliente: agendamiento.nombreCliente,
    idplanmantenimiento: agendamiento.idPlanMantenimiento,
    fecha_mantenimiento: fechaMantenimientoFormateada,
  };
  
  this.mostrarModalReagendar = true;
  this.error = '';
}

// Método mejorado para cerrar modal
cerrarModalReagendar(): void {
  this.mostrarModalReagendar = false;
  this.agendamientoReagendar = {};
  this.error = '';
  this.mensaje = '';
  
  // Resetear vista del calendario modal
  this.modalViewDate = new Date();
  
  if (this.rescheduleForm) {
    this.rescheduleForm.resetForm();
  }
}

// Helper method mejorado para formatear fecha legible
formatearFechaLegible(fecha: any): string {
  if (!fecha) return 'N/A';
  
  const date = new Date(fecha);
  if (isNaN(date.getTime())) {
    return 'Fecha Inválida';
  }
  
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  const diaSemana = diasSemana[date.getDay()];
  const dia = date.getDate();
  const mes = meses[date.getMonth()];
  const año = date.getFullYear();
  
  return `${diaSemana}, ${dia} de ${mes} de ${año}`;
}


}