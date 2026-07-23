import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Usuario } from 'src/app/models/usuario';
import { AuthService } from 'src/app/services/auth.service';
import { ActividadBitacora, ActividadRequest, BitacoraService } from 'src/app/services/bitacora.service';

import { LaboratorioService, Soporte } from 'src/app/services/laboratorio.service';

interface DiaCalendario {
  numero: number;
  fecha: Date;
  esDelMes: boolean;
  esHoy: boolean;
  actividades: ActividadBitacora[];
}
@Component({
  selector: 'app-bitacora',
  templateUrl: './bitacora.component.html',
  styleUrls: ['./bitacora.component.css']
})
export class BitacoraComponent implements OnInit {

  filtroUsuario = '';

// 2. Agregar lista de usuarios disponibles (después de línea 64)
usuariosDisponibles: { id: number, nombre: string }[] = [];

  // Datos principales
  actividades: ActividadBitacora[] = [];
  actividadesFiltradas: ActividadBitacora[] = [];
  actividadSeleccionada: ActividadBitacora | null = null;
  soportesDisponibles: Soporte[] = [];

  // Control de modales
  mostrarModal = false;
  mostrarModalArchivos = false;
  mostrarModalDetalle = false;
  mostrarModalImagenGrande = false;
  modoEdicion = false;
  tabActivo: 'imagenes' | 'archivos' = 'imagenes';

  // Control de vistas
  vistaActual: 'lista' | 'tarjetas' | 'calendario' = 'lista';

  // Filtros
  filtroEstado = '';
  filtroCategoria = '';
  filtroPrioridad = '';
  terminoBusqueda = '';
  fechaDesde = '';
  fechaHasta = '';

  // Datos de configuración
  categorias: string[] = [];
  prioridades: any[] = [];
  estados: any[] = [];

  // Formulario
  formularioActividad: ActividadRequest = {
    fecha: new Date(),
    titulo: '',
    descripcion: '',
    categoria: '',
    prioridad: 'MEDIA',
    estado: 'PENDIENTE',
    duracion: undefined,
    usuarioId: 1, // Temporal, debe venir del usuario logueado
    usuarioNombre:'',
    soporteId: undefined,
    etiquetas: [],
    ubicacion: '',
    observaciones: ''
  };

  etiquetasInput = '';

  // Archivos
  imagenesSeleccionadas: File[] = [];
  archivosSeleccionados: File[] = [];
  imagenGrandeUrl = '';

  // Control de carga
  cargando = false;
  error = '';
  mensaje = '';

  // Estadísticas
  estadisticas = {
    totalActividades: 0,
    pendientes: 0,
    enProceso: 0,
    completadas: 0,
    tiempoTotal: 0
  };

  // Calendario
  mesActual = new Date().getMonth();
  anioActual = new Date().getFullYear();
  diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  diasCalendario: DiaCalendario[] = [];

  idusuario: number = 1; // Defaulting to 1 as per strict constraint (no AuthService)
    id: number = 0;
      usuario: Usuario | null = null;
      loading = false;
      usrol: string = '';
      nombreusuario:string='';

  constructor(
    private bitacoraService: BitacoraService,
    private laboratorioService: LaboratorioService,
        private authService: AuthService,
  ) { }

  ngOnInit(): void {
    this.usuario = this.authService.getUsuarioActual();
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      console.log(this.usuario);
      if(this.usuario != null){
        this.id = this.usuario.id;
        console.log(this.id);
        this.usrol = this.usuario.rol;  
        console.log(this.usrol);
        this.nombreusuario = this.usuario.nombreUsuario;
        
        if(this.usrol=="admin" || this.usrol=="repuestos" ){
    this.cargarConfiguracion();
    this.cargarActividades();
    this.cargarSoportes();
        }
        else{
    this.cargarConfiguracion();
    this.cargarActividadesUs(this.id);
    this.cargarSoportes();
        }     
      }
    });
    
  }

  // ========================
  // CONFIGURACIÓN INICIAL
  // ========================

  cargarConfiguracion(): void {
    this.categorias = this.bitacoraService.CATEGORIAS;
    this.prioridades = this.bitacoraService.PRIORIDADES;
    this.estados = [
      { value: '', label: 'Todos los Estados' },
      ...this.bitacoraService.ESTADOS
    ];
  }

  // ========================
  // CARGA DE DATOS
  // ========================

 cargarActividades(): void {
  this.cargando = true;
  this.error = '';

  this.bitacoraService.getAllActividades().subscribe({
    next: (actividades) => {
      this.actividades = actividades;
      this.extraerUsuarios(); // Nueva línea
      this.aplicarFiltros();
      this.calcularEstadisticas();
      if (this.vistaActual === 'calendario') {
        this.generarCalendario();
      }
      this.cargando = false;
    },
    error: (error) => {
      console.error('Error al cargar actividades:', error);
      this.error = 'Error al cargar las actividades';
      this.cargando = false;
    }
  });
}

extraerUsuarios(): void {
  const usuariosMap = new Map<number, string>();
  
  this.actividades.forEach(actividad => {
    if (actividad.usuarioId && actividad.usuarioNombre) {
      usuariosMap.set(actividad.usuarioId, actividad.usuarioNombre);
    }
  });

  this.usuariosDisponibles = Array.from(usuariosMap, ([id, nombre]) => ({
    id,
    nombre
  })).sort((a, b) => a.nombre.localeCompare(b.nombre));
}

// 4. Modificar cargarActividadesUs de forma similar
cargarActividadesUs(id: any): void {
  this.cargando = true;
  this.error = '';

  this.bitacoraService.getActividadesByUsuario(id).subscribe({
    next: (actividades) => {
      this.actividades = actividades;
      this.extraerUsuarios(); // Nueva línea
      this.aplicarFiltros();
      this.calcularEstadisticas();
      if (this.vistaActual === 'calendario') {
        this.generarCalendario();
      }
      this.cargando = false;
    },
    error: (error) => {
      console.error('Error al cargar actividades:', error);
      this.error = 'Error al cargar las actividades';
      this.cargando = false;
    }
  });
}

  cargarSoportes(): void {
    this.laboratorioService.getAllSoportes().subscribe({
      next: (soportes) => {
        this.soportesDisponibles = soportes;
      },
      error: (error) => {
        console.error('Error al cargar soportes:', error);
      }
    });
  }

  calcularEstadisticas(): void {
    this.estadisticas = {
      totalActividades: this.actividades.length,
      pendientes: this.actividades.filter(a => a.estado === 'PENDIENTE').length,
      enProceso: this.actividades.filter(a => a.estado === 'EN_PROCESO').length,
      completadas: this.actividades.filter(a => a.estado === 'COMPLETADA').length,
      tiempoTotal: this.actividades.reduce((sum, a) => sum + (a.duracion || 0), 0)
    };
  }

  // ========================
  // FILTROS Y BÚSQUEDA
  // ========================

 aplicarFiltros(): void {
  this.actividadesFiltradas = this.actividades.filter(actividad => {
    // Filtro por estado
    if (this.filtroEstado && actividad.estado !== this.filtroEstado) {
      return false;
    }

    // Filtro por categoría
    if (this.filtroCategoria && actividad.categoria !== this.filtroCategoria) {
      return false;
    }

    // Filtro por prioridad
    if (this.filtroPrioridad && actividad.prioridad !== this.filtroPrioridad) {
      return false;
    }

    // NUEVO: Filtro por usuario
    if (this.filtroUsuario && actividad.usuarioNombre) {
      if (!actividad.usuarioNombre.toLowerCase().includes(this.filtroUsuario.toLowerCase())) {
        return false;
      }
    }

    // Filtro por búsqueda
    if (this.terminoBusqueda) {
      const termino = this.terminoBusqueda.toLowerCase();
      const cumpleBusqueda = 
        actividad.titulo.toLowerCase().includes(termino) ||
        actividad.descripcion.toLowerCase().includes(termino) ||
        (actividad.ubicacion && actividad.ubicacion.toLowerCase().includes(termino)) ||
        (actividad.soporteCodigo && actividad.soporteCodigo.toLowerCase().includes(termino)) ||
        (actividad.usuarioNombre && actividad.usuarioNombre.toLowerCase().includes(termino)); // Agregar usuario a búsqueda
      
      if (!cumpleBusqueda) return false;
    }

    return true;
  });

  // Ordenar por fecha descendente
  this.actividadesFiltradas.sort((a, b) => {
    return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
  });
}

  onFiltroChange(): void {
    this.aplicarFiltros();
    if (this.vistaActual === 'calendario') {
      this.generarCalendario();
    }
  }

 limpiarFiltros(): void {
  this.filtroEstado = '';
  this.filtroCategoria = '';
  this.filtroPrioridad = '';
  this.filtroUsuario = ''; // Nueva línea
  this.terminoBusqueda = '';
  this.fechaDesde = '';
  this.fechaHasta = '';
  this.aplicarFiltros();
}

  // ========================
  // GESTIÓN DE VISTAS
  // ========================

  cambiarVista(vista: 'lista' | 'tarjetas' | 'calendario'): void {
    this.vistaActual = vista;
    if (vista === 'calendario') {
      this.generarCalendario();
    }
  }

  // ========================
  // OPERACIONES CRUD
  // ========================

  abrirModalNuevo(): void {
    this.modoEdicion = false;
    this.limpiarFormulario();
    this.mostrarModal = true;
  }

  abrirModalEditar(actividad: ActividadBitacora): void {
    this.modoEdicion = true;
    this.actividadSeleccionada = actividad;
    this.cargarDatosFormulario(actividad);
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.limpiarFormulario();
    this.error = '';
    this.mensaje = '';
  }

  guardarActividad(): void {
    if (!this.validarFormulario()) {
      return;
    }

    // Procesar etiquetas
    if (this.etiquetasInput) {
      this.formularioActividad.etiquetas = this.etiquetasInput
        .split(',')
        .map(e => e.trim())
        .filter(e => e.length > 0);
    }

    this.cargando = true;
    this.error = '';

    if (this.modoEdicion && this.actividadSeleccionada) {
      // Actualizar
      this.formularioActividad.usuarioId = this.id;
      this.formularioActividad.usuarioNombre = this.nombreusuario;
      this.bitacoraService.updateActividad(this.actividadSeleccionada.id, this.formularioActividad).subscribe({
        next: (response) => {
          this.mensaje = 'Actividad actualizada exitosamente';
          
          if(this.usrol=="admin" || this.usrol=="repuestos" ){
            this.cerrarModal();
          this.cargarActividades();
          this.cargando = false;
          }
          else{
            this.cerrarModal();
          this.cargarActividadesUs(this.id);
          this.cargando = false;
          }
          
        },
        error: (error) => {
          console.error('Error al actualizar actividad:', error);
          this.error = 'Error al actualizar la actividad';
          this.cargando = false;
        }
      });
    } else {
      // Crear nuevo
      this.formularioActividad.usuarioId = this.id;
      this.formularioActividad.usuarioNombre = this.nombreusuario;
      this.bitacoraService.createActividad(this.formularioActividad).subscribe({
        next: (response) => {
          this.mensaje = 'Actividad creada exitosamente';
          if(this.usrol=="admin" || this.usrol=="repuestos" ){
            this.cerrarModal();
          this.cargarActividades();
          this.cargando = false;
          }
          else{
            this.cerrarModal();
          this.cargarActividadesUs(this.id);
          this.cargando = false;
          }
          
        },
        error: (error) => {
          console.error('Error al crear actividad:', error);
          this.error = 'Error al crear la actividad';
          this.cargando = false;
        }
      });
    }
  }

  eliminarActividad(actividad: ActividadBitacora): void {
    if (confirm(`¿Está seguro de eliminar la actividad "${actividad.titulo}"?`)) {
      this.cargando = true;
      
      this.bitacoraService.deleteActividad(actividad.id).subscribe({
        next: () => {
          this.mensaje = 'Actividad eliminada exitosamente';
          this.cargarActividades();
          this.cargando = false;
        },
        error: (error) => {
          console.error('Error al eliminar actividad:', error);
          this.error = 'Error al eliminar la actividad';
          this.cargando = false;
        }
      });
    }
  }

  // ========================
  // GESTIÓN DE ARCHIVOS
  // ========================

  abrirModalArchivos(actividad: ActividadBitacora): void {
    this.actividadSeleccionada = actividad;
    this.tabActivo = 'imagenes';
    this.mostrarModalArchivos = true;
    this.cerrarModalDetalle();
  }

  cerrarModalArchivos(): void {
    this.mostrarModalArchivos = false;
    this.imagenesSeleccionadas = [];
    this.archivosSeleccionados = [];
  }

  onImagenesSeleccionadas(event: any): void {
    const files = Array.from(event.target.files) as File[];
    this.imagenesSeleccionadas = [];
    
    files.forEach(file => {
      const error = this.bitacoraService.getImageValidationError(file);
      if (!error) {
        this.imagenesSeleccionadas.push(file);
      } else {
        alert(error);
      }
    });
  }

  onArchivosSeleccionados(event: any): void {
    const files = Array.from(event.target.files) as File[];
    this.archivosSeleccionados = [];
    
    files.forEach(file => {
      const error = this.bitacoraService.getFileValidationError(file);
      if (!error) {
        this.archivosSeleccionados.push(file);
      } else {
        alert(error);
      }
    });
  }

  removerImagenSeleccionada(archivo: File): void {
    this.imagenesSeleccionadas = this.imagenesSeleccionadas.filter(f => f !== archivo);
  }

  removerArchivoSeleccionado(archivo: File): void {
    this.archivosSeleccionados = this.archivosSeleccionados.filter(f => f !== archivo);
  }

  subirImagenes(): void {
    if (!this.actividadSeleccionada || this.imagenesSeleccionadas.length === 0) {
      return;
    }

    this.cargando = true;
    
    this.bitacoraService.uploadActividadImages(this.actividadSeleccionada.id, this.imagenesSeleccionadas).subscribe({
      next: () => {
        this.mensaje = 'Imágenes subidas exitosamente';
        this.imagenesSeleccionadas = [];
        this.cargarActividades();
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al subir imágenes:', error);
        this.error = 'Error al subir las imágenes';
        this.cargando = false;
      }
    });
  }

  subirArchivos(): void {
    if (!this.actividadSeleccionada || this.archivosSeleccionados.length === 0) {
      return;
    }

    this.cargando = true;
    
    this.bitacoraService.uploadActividadFiles(this.actividadSeleccionada.id, this.archivosSeleccionados).subscribe({
      next: () => {
        this.mensaje = 'Documentos subidos exitosamente';
        this.archivosSeleccionados = [];
        this.cargarActividades();
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al subir documentos:', error);
        this.error = 'Error al subir los documentos';
        this.cargando = false;
      }
    });
  }

  eliminarImagen(filename: string): void {
    if (!this.actividadSeleccionada) return;

    if (confirm('¿Está seguro de eliminar esta imagen?')) {
      this.bitacoraService.deleteActividadImage(this.actividadSeleccionada.id, filename).subscribe({
        next: () => {
          this.mensaje = 'Imagen eliminada exitosamente';
          this.cargarActividades();
        },
        error: (error) => {
          console.error('Error al eliminar imagen:', error);
          this.error = 'Error al eliminar la imagen';
        }
      });
    }
  }

  eliminarArchivo(filename: string): void {
    if (!this.actividadSeleccionada) return;

    if (confirm('¿Está seguro de eliminar este documento?')) {
      this.bitacoraService.deleteActividadFile(this.actividadSeleccionada.id, filename).subscribe({
        next: () => {
          this.mensaje = 'Documento eliminado exitosamente';
          this.cargarActividades();
        },
        error: (error) => {
          console.error('Error al eliminar documento:', error);
          this.error = 'Error al eliminar el documento';
        }
      });
    }
  }

  obtenerUrlImagen(filename: string): string {
    return this.bitacoraService.getActividadImageUrl(filename);
  }

  obtenerUrlArchivo(filename: string): string {
    return this.bitacoraService.getActividadFileUrl(filename);
  }

  // ========================
  // MODAL DETALLE
  // ========================

  verDetalle(actividad: ActividadBitacora): void {
    this.actividadSeleccionada = actividad;
    this.mostrarModalDetalle = true;
  }

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle = false;
  }

  editarDesdeDetalle(): void {
    if (this.actividadSeleccionada) {
      this.cerrarModalDetalle();
      this.abrirModalEditar(this.actividadSeleccionada);
    }
  }

  // ========================
  // MODAL IMAGEN GRANDE
  // ========================

  verImagenGrande(filename: string): void {
    this.imagenGrandeUrl = this.obtenerUrlImagen(filename);
    this.mostrarModalImagenGrande = true;
  }

  cerrarModalImagenGrande(): void {
    this.mostrarModalImagenGrande = false;
    this.imagenGrandeUrl = '';
  }

  // ========================
  // CALENDARIO
  // ========================

  generarCalendario(): void {
    this.diasCalendario = [];
    const primerDia = new Date(this.anioActual, this.mesActual, 1);
    const ultimoDia = new Date(this.anioActual, this.mesActual + 1, 0);
    const diasDelMes = ultimoDia.getDate();
    const diaSemanaInicio = primerDia.getDay();

    // Días del mes anterior
    const diasMesAnterior = new Date(this.anioActual, this.mesActual, 0).getDate();
    for (let i = diaSemanaInicio - 1; i >= 0; i--) {
      const fecha = new Date(this.anioActual, this.mesActual - 1, diasMesAnterior - i);
      this.diasCalendario.push({
        numero: diasMesAnterior - i,
        fecha: fecha,
        esDelMes: false,
        esHoy: this.esFechaHoy(fecha),
        actividades: this.obtenerActividadesPorFecha(fecha)
      });
    }

    // Días del mes actual
    for (let i = 1; i <= diasDelMes; i++) {
      const fecha = new Date(this.anioActual, this.mesActual, i);
      this.diasCalendario.push({
        numero: i,
        fecha: fecha,
        esDelMes: true,
        esHoy: this.esFechaHoy(fecha),
        actividades: this.obtenerActividadesPorFecha(fecha)
      });
    }

    // Días del mes siguiente
    const diasRestantes = 42 - this.diasCalendario.length;
    for (let i = 1; i <= diasRestantes; i++) {
      const fecha = new Date(this.anioActual, this.mesActual + 1, i);
      this.diasCalendario.push({
        numero: i,
        fecha: fecha,
        esDelMes: false,
        esHoy: this.esFechaHoy(fecha),
        actividades: this.obtenerActividadesPorFecha(fecha)
      });
    }
  }

  obtenerActividadesPorFecha(fecha: Date): ActividadBitacora[] {
    return this.actividadesFiltradas.filter(actividad => {
      const fechaActividad = new Date(actividad.fecha);
      return fechaActividad.getDate() === fecha.getDate() &&
             fechaActividad.getMonth() === fecha.getMonth() &&
             fechaActividad.getFullYear() === fecha.getFullYear();
    });
  }

  esFechaHoy(fecha: Date): boolean {
    const hoy = new Date();
    return fecha.getDate() === hoy.getDate() &&
           fecha.getMonth() === hoy.getMonth() &&
           fecha.getFullYear() === hoy.getFullYear();
  }

  mesAnterior(): void {
    if (this.mesActual === 0) {
      this.mesActual = 11;
      this.anioActual--;
    } else {
      this.mesActual--;
    }
    this.generarCalendario();
  }

  mesSiguiente(): void {
    if (this.mesActual === 11) {
      this.mesActual = 0;
      this.anioActual++;
    } else {
      this.mesActual++;
    }
    this.generarCalendario();
  }

  get nombreMesActual(): string {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return meses[this.mesActual];
  }

  seleccionarDia(dia: DiaCalendario): void {
    if (dia.actividades.length > 0) {
      // Mostrar actividades del día
      const fechaStr = dia.fecha.toISOString().split('T')[0];
      this.fechaDesde = fechaStr;
      this.fechaHasta = fechaStr;
      this.aplicarFiltros();
      this.cambiarVista('lista');
    } else {
      // Crear nueva actividad para este día
      this.limpiarFormulario();
      this.formularioActividad.fecha = dia.fecha;
      this.abrirModalNuevo();
    }
  }

  // ========================
  // UTILIDADES
  // ========================

  validarFormulario(): boolean {
    if (!this.formularioActividad.titulo.trim()) {
      this.error = 'El título es obligatorio';
      return false;
    }

    if (!this.formularioActividad.descripcion.trim()) {
      this.error = 'La descripción es obligatoria';
      return false;
    }

    if (!this.formularioActividad.categoria) {
      this.error = 'La categoría es obligatoria';
      return false;
    }

    if (!this.formularioActividad.fecha) {
      this.error = 'La fecha es obligatoria';
      return false;
    }

    return true;
  }

  limpiarFormulario(): void {
    this.formularioActividad = {
      fecha: new Date(),
      titulo: '',
      descripcion: '',
      categoria: '',
      prioridad: 'MEDIA',
      estado: 'PENDIENTE',
      duracion: undefined,
      usuarioId: 1,
      soporteId: undefined,
      etiquetas: [],
      ubicacion: '',
      observaciones: ''
    };
    this.etiquetasInput = '';
  }

  cargarDatosFormulario(actividad: ActividadBitacora): void {
    this.formularioActividad = {
      fecha: new Date(actividad.fecha),
      titulo: actividad.titulo,
      descripcion: actividad.descripcion,
      categoria: actividad.categoria,
      prioridad: actividad.prioridad,
      estado: actividad.estado,
      duracion: actividad.duracion,
      usuarioId: actividad.usuarioId,
      soporteId: actividad.soporteId,
      etiquetas: actividad.etiquetas || [],
      ubicacion: actividad.ubicacion || '',
      observaciones: actividad.observaciones || ''
    };
    this.etiquetasInput = (actividad.etiquetas || []).join(', ');
  }

  formatearFecha(fecha: any): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-ES');
  }

  formatearHora(fecha: any): string {
    if (!fecha) return '';
    return new Date(fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  formatDuracion(minutos: number | undefined): string {
    return this.bitacoraService.formatDuracion(minutos || 0);
  }

  obtenerClaseEstado(estado: string): string {
    switch (estado) {
      case 'PENDIENTE': return 'badge-warning';
      case 'EN_PROCESO': return 'badge-info';
      case 'COMPLETADA': return 'badge-success';
      case 'CANCELADA': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }

  getColorPrioridad(prioridad: string): string {
    return this.bitacoraService.getColorPrioridad(prioridad);
  }

  getPrioridadLabel(prioridad: string): string {
    const p = this.prioridades.find(pr => pr.value === prioridad);
    return p ? p.label : prioridad;
  }

  getEstadoLabel(estado: string): string {
    const e = this.bitacoraService.ESTADOS.find(est => est.value === estado);
    return e ? e.label : estado;
  }

  obtenerIconoArchivo(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return 'fas fa-file-pdf text-danger';
      case 'doc':
      case 'docx': return 'fas fa-file-word text-primary';
      case 'xls':
      case 'xlsx': return 'fas fa-file-excel text-success';
      case 'txt': return 'fas fa-file-alt text-secondary';
      default: return 'fas fa-file text-secondary';
    }
  }

  obtenerExtension(filename: string): string {
    return filename.split('.').pop()?.toUpperCase() || '';
  }

  // ========================
  // EXPORTACIÓN
  // ========================

  exportarExcel(): void {
    console.log('Exportando a Excel...');
    // Implementar exportación
  }

  exportarPDF(): void {
    console.log('Exportando a PDF...');
    // Implementar exportación
  }
}