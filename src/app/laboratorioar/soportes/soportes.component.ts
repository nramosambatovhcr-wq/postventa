import { Component, OnInit } from '@angular/core';
import { Soporte, SoporteRequest, LaboratorioService } from 'src/app/services/laboratorio.service';
import { AuthService } from 'src/app/services/auth.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-soportes',
  templateUrl: './soportes.component.html',
  styleUrls: ['./soportes.component.css']
})
export class SoportesComponent implements OnInit {

  // Datos principales
  soportes: Soporte[] = [];
  soportesFiltrados: Soporte[] = [];
  soporteSeleccionado: Soporte | null = null;

  // Control de modales y vista
  mostrarModal = false;
  mostrarModalImagenes = false;
  mostrarModalDetalle = false;
  mostrarModalAsignar = false;
  mostrarModalCalibrar = false;
  modoEdicion = false;

  // Filtros y búsqueda
  filtroEstado = '';
  terminoBusqueda = '';
  fechaDesde = '';
  fechaHasta = '';

  // Estados disponibles
  estados = [
    { value: '', label: 'Todos los Estados' },
    { value: 'PENDIENTE', label: 'Pendiente' },
    { value: 'EN_PROCESO', label: 'En Proceso' },
    { value: 'REPARANDO', label: 'Reparando' },
    { value: 'COMPLETADO', label: 'Completado' },
    { value: 'ENTREGADO', label: 'Entregado' }
  ];

  // Formulario
  formularioSoporte: SoporteRequest = {
    codigo: '',
    descripcion: '',
    vim: '',
    color: '',
    modelo: '',
    tipoSoporte: '',
    origen: '',
    destino: '',
    fechaingreso: undefined,
    fechaentrega: undefined,
    usuarioCrea: 1, // Temporal, debe venir del usuario logueado
    usuarioRepara: undefined,
    usuarioEntrega: undefined,
    observacion: '',
    estado: 'PENDIENTE'
  };

  // Control de carga y errores
  cargando = false;
  error = '';
  mensaje = '';

  // Archivos para subir + vista previa
  archivosSeleccionados: File[] = [];
  imagenesPreview: string[] = [];

  // Flujo de taller: asignación / recepción / calibración / entrega
  mecanicosDisponibles: { id: number; nombre: string }[] = [];
  mecanicoSeleccionadoId: number | null = null;
  soporteParaAccion: Soporte | null = null;

  // Usuario actual (para registrar la entrega)
  usuarioActual: any;
  idUsuarioActual: any;

  // Estadísticas
  estadisticas = {
    total: 0,
    pendientes: 0,
    enProceso: 0,
    completados: 0,
    entregados: 0
  };

  constructor(
    private laboratorioService: LaboratorioService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuarioActual = usuario;
      if (this.usuarioActual != null) {
        this.idUsuarioActual = this.usuarioActual.id;
      }
    });
    this.cargarSoportes();
    this.cargarMecanicos();
  }

  // ========================
  // CARGA DE DATOS
  // ========================

  cargarSoportes(): void {
    this.cargando = true;
    this.error = '';

    this.laboratorioService.getAllSoportes().subscribe({
      next: (soportes) => {
        this.soportes = soportes;
        this.aplicarFiltros();
        this.calcularEstadisticas();
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar soportes:', error);
        this.error = 'Error al cargar los soportes';
        this.cargando = false;
      }
    });
  }

  cargarMecanicos(): void {
    this.laboratorioService.getUsuariosParaAsignar().subscribe({
      next: (data: any) => {
        // Soporta varios formatos de respuesta del endpoint /disponibles
        const lista = Array.isArray(data) ? data : (data?.datos ?? data?.usuarios ?? []);
        this.mecanicosDisponibles = (lista || []).map((u: any) => ({
          id: u.idimportaciones,
          nombre: u.nombre_usuario ?? u.nombre ?? u.nombreUsuario ?? ('Usuario ' + (u.id ?? ''))
        }));
      },
      error: (err) => {
        console.error('Error al cargar mecánicos disponibles:', err);
      }
    });
  }

  calcularEstadisticas(): void {
    this.estadisticas = {
      total: this.soportes.length,
      pendientes: this.soportes.filter(s => s.estado === 'PENDIENTE').length,
      enProceso: this.soportes.filter(s => s.estado === 'EN_PROCESO' || s.estado === 'REPARANDO').length,
      completados: this.soportes.filter(s => s.estado === 'COMPLETADO').length,
      entregados: this.soportes.filter(s => s.estado === 'ENTREGADO').length
    };
  }

  // ========================
  // FILTROS Y BÚSQUEDA
  // ========================

  private convertirFechaParaInput(fecha: any): string {
    if (!fecha) return '';

    try {
      const date = new Date(fecha);
      if (isNaN(date.getTime())) return '';

      // Usar toISOString y tomar solo la parte necesaria
      return date.toISOString().slice(0, 16);
    } catch (error) {
      console.error('Error al convertir fecha:', error);
      return '';
    }
  }

  aplicarFiltros(): void {
    this.soportesFiltrados = this.soportes.filter((soporte: any) => {
      // Filtro por estado
      if (this.filtroEstado && soporte.estado !== this.filtroEstado) {
        return false;
      }

      // Filtro por búsqueda
      if (this.terminoBusqueda) {
        const termino = this.terminoBusqueda.toLowerCase();
        const cumpleBusqueda =
          soporte.codigo.toLowerCase().includes(termino) ||
          soporte.descripcion.toLowerCase().includes(termino) ||
          (soporte.vim && soporte.vim.toLowerCase().includes(termino)) ||
          (soporte.modelo && soporte.modelo.toLowerCase().includes(termino));

        if (!cumpleBusqueda) return false;
      }

      // Filtro por fecha
      if (this.fechaDesde && soporte.fechaingreso) {
        const fechaSoporte = new Date(soporte.fechaingreso);
        const fechaDesde = new Date(this.fechaDesde);
        if (fechaSoporte < fechaDesde) return false;
      }

      if (this.fechaHasta && soporte.fechaingreso) {
        const fechaSoporte = new Date(soporte.fechaingreso);
        const fechaHasta = new Date(this.fechaHasta);
        if (fechaSoporte > fechaHasta) return false;
      }

      return true;
    });

    // Ordenar por id descendente (del último al inicio)
    this.soportesFiltrados.sort((a: any, b: any) => (b.id ?? 0) - (a.id ?? 0));
  }

  onFiltroChange(): void {
    this.aplicarFiltros();
  }

  limpiarFiltros(): void {
    this.filtroEstado = '';
    this.terminoBusqueda = '';
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.aplicarFiltros();
  }

  // ========================
  // OPERACIONES CRUD
  // ========================

  abrirModalNuevo(): void {
    this.modoEdicion = false;
    this.limpiarFormulario();
    // La fecha de ingreso se registra automáticamente (no editable)
    this.formularioSoporte.fechaingreso = new Date();
    this.mostrarModal = true;
  }

  abrirModalEditar(soporte: Soporte): void {
    this.modoEdicion = true;
    this.soporteSeleccionado = soporte;
    this.cargarDatosFormulario(soporte);
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.limpiarFormulario();
    this.error = '';
    this.mensaje = '';
  }

  guardarSoporte(): void {
    if (!this.validarFormulario()) {
      return;
    }

    this.cargando = true;
    this.error = '';

    // Garantiza fecha de ingreso al crear
    if (!this.modoEdicion && !this.formularioSoporte.fechaingreso) {
      this.formularioSoporte.fechaingreso = new Date();
    }

    if (this.modoEdicion && this.soporteSeleccionado) {
      // Actualizar
      this.laboratorioService.updateSoporte(this.soporteSeleccionado.id, this.formularioSoporte).subscribe({
        next: (response: any) => {
          this.cerrarModal();
          this.mensaje = 'Soporte actualizado exitosamente';
          this.cargarSoportes();
          this.cargando = false;
        },
        error: (error: any) => {
          console.error('Error al actualizar soporte:', error);
          this.error = 'Error al actualizar el soporte';
          this.cargando = false;
        }
      });
    } else {
      // Crear nuevo
      this.laboratorioService.createSoporte(this.formularioSoporte).subscribe({
        next: (response: any) => {
          this.cerrarModal();
          this.mensaje = 'Soporte creado exitosamente';
          this.cargarSoportes();
          this.cargando = false;
        },
        error: (error) => {
          console.error('Error al crear soporte:', error);
          this.error = 'Error al crear el soporte';
          this.cargando = false;
        }
      });
    }
  }

  eliminarSoporte(soporte: Soporte): void {
    if (confirm(`¿Está seguro de eliminar el soporte "${soporte.codigo}"?`)) {
      this.cargando = true;

      this.laboratorioService.deleteSoporte(soporte.id).subscribe({
        next: (response) => {
          this.mensaje = 'Soporte eliminado exitosamente';
          this.cargarSoportes();
          this.cargando = false;
        },
        error: (error) => {
          console.error('Error al eliminar soporte:', error);
          this.error = 'Error al eliminar el soporte';
          this.cargando = false;
        }
      });
    }
  }

  // ========================
  // FLUJO DE TALLER
  // ========================

  // --- Asignación de mecánico ---
  abrirModalAsignar(soporte: Soporte): void {
    this.soporteParaAccion = soporte;
    this.mecanicoSeleccionadoId = soporte.usuariorepara ?? null;
    this.error = '';
    this.mostrarModalAsignar = true;
  }

  cerrarModalAsignar(): void {
    this.mostrarModalAsignar = false;
    this.soporteParaAccion = null;
    this.mecanicoSeleccionadoId = null;
  }

  confirmarAsignacion(): void {
    if (!this.soporteParaAccion || !this.mecanicoSeleccionadoId) {
      this.error = 'Seleccione un mecánico para asignar.';
      return;
    }

    this.cargando = true;
    this.laboratorioService.asignarMecanico(this.soporteParaAccion.id, this.mecanicoSeleccionadoId).subscribe({
      next: () => {
        this.cerrarModalAsignar();
        this.mensaje = 'Mecánico asignado correctamente';
        this.cargarSoportes();
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al asignar mecánico:', err);
        this.error = 'No se pudo asignar el mecánico.';
        this.cargando = false;
      }
    });
  }

  // --- Recepción (el mecánico asignado recibe el soporte) ---
  recibirSoporte(soporte: Soporte): void {
    if (!soporte.usuariorepara) {
      this.error = 'Primero debe asignar un mecánico para poder registrar la recepción.';
      return;
    }
    if (!confirm(`¿Confirmar la recepción del soporte "${soporte.codigo}"?`)) {
      return;
    }

    this.cargando = true;
    this.laboratorioService.recepcionSoporte(soporte.id, soporte.usuariorepara).subscribe({
      next: () => {
        this.mensaje = 'Recepción registrada correctamente';
        this.cargarSoportes();
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al registrar recepción:', err);
        this.error = 'No se pudo registrar la recepción.';
        this.cargando = false;
      }
    });
  }

  // --- Calibración: el mecánico adjunta imágenes del componente calibrado ---
  abrirModalCalibrar(soporte: Soporte): void {
    this.soporteParaAccion = soporte;
    this.archivosSeleccionados = [];
    this.imagenesPreview = [];
    this.error = '';
    this.mostrarModalCalibrar = true;
  }

  cerrarModalCalibrar(): void {
    this.mostrarModalCalibrar = false;
    this.soporteParaAccion = null;
    this.archivosSeleccionados = [];
    this.imagenesPreview = [];
  }

  confirmarCalibracion(): void {
    if (!this.soporteParaAccion) {
      return;
    }
    // Imagen obligatoria del componente calibrado
    if (this.archivosSeleccionados.length === 0) {
      this.error = 'Debe adjuntar al menos una imagen del componente calibrado.';
      return;
    }

    const idSoporte = this.soporteParaAccion.id;
    this.cargando = true;
    this.error = '';

    // 1) Subir imágenes del componente calibrado
    this.laboratorioService.uploadSoporteImages(idSoporte, this.archivosSeleccionados).subscribe({
      next: () => {
        // 2) Marcar como calibrado (REPARANDO -> COMPLETADO)
        this.laboratorioService.calibrarSoporte(idSoporte).subscribe({
          next: () => {
            this.cerrarModalCalibrar();
            this.mensaje = 'Calibración registrada con imágenes correctamente';
            this.cargarSoportes();
            this.cargando = false;
          },
          error: (err) => {
            console.error('Error al registrar calibración:', err);
            this.error = 'Las imágenes se subieron, pero no se pudo registrar la calibración.';
            this.cargarSoportes();
            this.cargando = false;
          }
        });
      },
      error: (err) => {
        console.error('Error al subir imágenes de calibración:', err);
        this.error = 'No se pudieron subir las imágenes del componente calibrado.';
        this.cargando = false;
      }
    });
  }

  // --- Entrega ---
  entregarSoporte(soporte: Soporte): void {
    if (!this.idUsuarioActual) {
      this.error = 'No se pudo identificar el usuario actual para registrar la entrega.';
      return;
    }
    if (!confirm(`¿Registrar la entrega del soporte "${soporte.codigo}"?`)) {
      return;
    }

    this.cargando = true;
    this.laboratorioService.entregarSoporte(soporte.id, this.idUsuarioActual).subscribe({
      next: () => {
        this.mensaje = 'Entrega registrada correctamente';
        this.cargarSoportes();
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al registrar entrega:', err);
        this.error = 'No se pudo registrar la entrega.';
        this.cargando = false;
      }
    });
  }

  // ========================
  // GESTIÓN DE IMÁGENES
  // ========================

  abrirModalImagenes(soporte: Soporte): void {
    this.soporteSeleccionado = soporte;
    this.archivosSeleccionados = [];
    this.imagenesPreview = [];
    this.mostrarModalImagenes = true;
  }

  cerrarModalImagenes(): void {
    this.mostrarModalImagenes = false;
    this.archivosSeleccionados = [];
    this.imagenesPreview = [];
  }

  /**
   * Procesa archivos (cámara o galería). Acumula sobre lo ya seleccionado y
   * genera vista previa. Se usa tanto en el modal de imágenes como en el de calibración.
   */
  onFileSelected(event: any): void {
    const files = Array.from(event.target.files) as File[];

    files.forEach(file => {
      const error = this.laboratorioService.getFileValidationError(file);
      if (!error) {
        this.archivosSeleccionados.push(file);

        const reader = new FileReader();
        reader.onload = (e: any) => this.imagenesPreview.push(e.target.result);
        reader.readAsDataURL(file);
      } else {
        alert(error);
      }
    });

    // Permite volver a tomar/seleccionar (incluso el mismo archivo)
    if (event?.target) {
      event.target.value = '';
    }
  }

  quitarImagenSeleccionada(index: number): void {
    this.archivosSeleccionados.splice(index, 1);
    this.imagenesPreview.splice(index, 1);
  }

  subirImagenes(): void {
    if (!this.soporteSeleccionado || this.archivosSeleccionados.length === 0) {
      return;
    }

    this.cargando = true;

    this.laboratorioService.uploadSoporteImages(this.soporteSeleccionado.id, this.archivosSeleccionados).subscribe({
      next: (response) => {
        this.mensaje = 'Imágenes subidas exitosamente';
        this.cerrarModalImagenes();
        this.cargarSoportes(); // Recargar para ver las nuevas imágenes
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al subir imágenes:', error);
        this.error = 'Error al subir las imágenes';
        this.cargando = false;
      }
    });
  }

  obtenerUrlImagen(filename: string): string {
    return this.laboratorioService.getSoporteImageUrl(filename);
  }

  // ========================
  // UTILIDADES
  // ========================

  validarFormulario(): boolean {
    if (!this.formularioSoporte.codigo.trim()) {
      this.error = 'El código es obligatorio';
      return false;
    }

    if (!this.formularioSoporte.descripcion.trim()) {
      this.error = 'La descripción es obligatoria';
      return false;
    }

    return true;
  }

  limpiarFormulario(): void {
    this.formularioSoporte = {
      codigo: '',
      descripcion: '',
      observacion: '',
      vim: '',
      color: '',
      modelo: '',
      tipoSoporte: '',
      origen: '',
      destino: '',
      fechaingreso: undefined,
      fechaentrega: undefined,
      usuarioCrea: 1,
      usuarioRepara: undefined,
      usuarioEntrega: undefined,
      estado: 'PENDIENTE'
    };
  }

  cargarDatosFormulario(soporte: Soporte): void {
    this.formularioSoporte = {
      codigo: soporte.codigo,
      descripcion: soporte.descripcion,
      observacion: soporte.observacion || '',
      vim: soporte.vim || '',
      color: soporte.color || '',
      modelo: soporte.modelo || '',
      tipoSoporte: soporte.tiposoporte || '',
      origen: soporte.origen || '',
      destino: soporte.destino || '',
      fechaingreso: soporte.fechaingreso ? new Date(soporte.fechaingreso) : undefined,
      fechaentrega: soporte.fechaentrega ? new Date(soporte.fechaentrega) : undefined,
      usuarioCrea: soporte.usuariocrea,
      usuarioRepara: soporte.usuariorepara,
      usuarioEntrega: soporte.usuarioentrega,
      estado: soporte.estado || 'PENDIENTE'
    };
  }

  formatearFecha(fecha: any): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString();
  }

  formatearFechaHora(fecha: any): string {
    if (!fecha) return 'N/A';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString();
  }

  obtenerClaseEstado(estado: string): string {
    switch (estado) {
      case 'PENDIENTE': return 'badge-warning';
      case 'EN_PROCESO': case 'REPARANDO': return 'badge-info';
      case 'COMPLETADO': return 'badge-success';
      case 'ENTREGADO': return 'badge-primary';
      default: return 'badge-secondary';
    }
  }

  // ========================
  // EXPORTACIÓN
  // ========================


  exportarExcel(): void {
    try {
      // Preparar los datos para exportar
      const datosExportar = this.soportesFiltrados.map(soporte => ({
        'Código': soporte.codigo,
        'Descripción': soporte.descripcion,
        'VIM': soporte.vim || 'N/A',
        'Color': soporte.color || 'N/A',
        'Modelo': soporte.modelo || 'N/A',
        'Tipo Soporte': soporte.tiposoporte || 'N/A',
        'Estado': soporte.estado || 'N/A',
        'Origen': soporte.origen || 'N/A',
        'Destino': soporte.destino || 'N/A',
        'Usuario Crea': soporte.usuariocrea_nombre || 'N/A',
        'Mecánico (recibe/calibra)': soporte.usuariorepara_nombre || 'N/A',
        'Usuario Entrega': soporte.usuarioentrega_nombre || 'N/A',
        'Fecha Ingreso': soporte.fechaingreso ? new Date(soporte.fechaingreso).toLocaleString() : 'N/A',
        'Fecha Recepción': soporte.fecha_recepcion ? new Date(soporte.fecha_recepcion).toLocaleString() : 'N/A',
        'Fecha Calibración': soporte.fecha_calibracion ? new Date(soporte.fecha_calibracion).toLocaleString() : 'N/A',
        'Fecha Entrega': soporte.fechaentrega ? new Date(soporte.fechaentrega).toLocaleString() : 'N/A',
        'Observación': soporte.observacion || 'N/A',
        'Cantidad Imágenes': soporte.imagenes ? soporte.imagenes.length : 0
      }));

      // Crear libro de trabajo
      const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosExportar);
      const wb: XLSX.WorkBook = XLSX.utils.book_new();

      // Agregar hoja al libro
      XLSX.utils.book_append_sheet(wb, ws, 'Soportes');

      // Configurar anchos de columna
      const wscols = [
        { wch: 15 }, // Código
        { wch: 40 }, // Descripción
        { wch: 20 }, // VIM
        { wch: 15 }, // Color
        { wch: 20 }, // Modelo
        { wch: 20 }, // Tipo Soporte
        { wch: 15 }, // Estado
        { wch: 20 }, // Origen
        { wch: 20 }, // Destino
        { wch: 25 }, // Usuario Crea
        { wch: 25 }, // Mecánico
        { wch: 25 }, // Usuario Entrega
        { wch: 20 }, // Fecha Ingreso
        { wch: 20 }, // Fecha Recepción
        { wch: 20 }, // Fecha Calibración
        { wch: 20 }, // Fecha Entrega
        { wch: 40 }, // Observación
        { wch: 15 }  // Cantidad Imágenes
      ];
      ws['!cols'] = wscols;

      // Generar nombre de archivo con fecha actual
      const fecha = new Date().toISOString().split('T')[0];
      const nombreArchivo = `Soportes_Laboratorio_${fecha}.xlsx`;

      // Descargar archivo
      XLSX.writeFile(wb, nombreArchivo);

      this.mensaje = 'Excel exportado exitosamente';
      setTimeout(() => this.mensaje = '', 3000);

    } catch (error) {
      console.error('Error al exportar Excel:', error);
      this.error = 'Error al exportar el archivo Excel';
      setTimeout(() => this.error = '', 3000);
    }
  }

  // ========================
  // FUNCIÓN EXPORTAR CSV (BONUS)
  // ========================

  exportarCSV(): void {
    try {
      // Preparar los datos
      const datosExportar = this.soportesFiltrados.map(soporte => ({
        'Código': soporte.codigo,
        'Descripción': soporte.descripcion,
        'VIM': soporte.vim || 'N/A',
        'Color': soporte.color || 'N/A',
        'Modelo': soporte.modelo || 'N/A',
        'Tipo Soporte': soporte.tiposoporte || 'N/A',
        'Estado': soporte.estado || 'N/A',
        'Origen': soporte.origen || 'N/A',
        'Destino': soporte.destino || 'N/A',
        'Usuario Crea': soporte.usuariocrea_nombre || 'N/A',
        'Mecánico (recibe/calibra)': soporte.usuariorepara_nombre || 'N/A',
        'Usuario Entrega': soporte.usuarioentrega_nombre || 'N/A',
        'Fecha Ingreso': soporte.fechaingreso ? new Date(soporte.fechaingreso).toLocaleString() : 'N/A',
        'Fecha Recepción': soporte.fecha_recepcion ? new Date(soporte.fecha_recepcion).toLocaleString() : 'N/A',
        'Fecha Calibración': soporte.fecha_calibracion ? new Date(soporte.fecha_calibracion).toLocaleString() : 'N/A',
        'Fecha Entrega': soporte.fechaentrega ? new Date(soporte.fechaentrega).toLocaleString() : 'N/A',
        'Observación': soporte.observacion || 'N/A',
        'Cantidad Imágenes': soporte.imagenes ? soporte.imagenes.length : 0
      }));

      // Crear worksheet y convertir a CSV
      const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosExportar);
      const csv = XLSX.utils.sheet_to_csv(ws);

      // Crear blob y descargar
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      const fecha = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `Soportes_Laboratorio_${fecha}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.mensaje = 'CSV exportado exitosamente';
      setTimeout(() => this.mensaje = '', 3000);

    } catch (error) {
      console.error('Error al exportar CSV:', error);
      this.error = 'Error al exportar el archivo CSV';
      setTimeout(() => this.error = '', 3000);
    }
  }

  // ========================
  // FUNCIÓN EXPORTAR CON ESTADÍSTICAS (BONUS)
  // ========================

  exportarExcelConEstadisticas(): void {
    try {
      const wb: XLSX.WorkBook = XLSX.utils.book_new();

      // Hoja 1: Estadísticas
      const estadisticasData = [
        { 'Métrica': 'Total Soportes', 'Cantidad': this.estadisticas.total },
        { 'Métrica': 'Pendientes', 'Cantidad': this.estadisticas.pendientes },
        { 'Métrica': 'En Proceso', 'Cantidad': this.estadisticas.enProceso },
        { 'Métrica': 'Completados', 'Cantidad': this.estadisticas.completados },
        { 'Métrica': 'Entregados', 'Cantidad': this.estadisticas.entregados }
      ];
      const wsEstadisticas = XLSX.utils.json_to_sheet(estadisticasData);
      XLSX.utils.book_append_sheet(wb, wsEstadisticas, 'Estadísticas');

      // Hoja 2: Datos de soportes
      const datosExportar = this.soportesFiltrados.map(soporte => ({
        'Código': soporte.codigo,
        'Descripción': soporte.descripcion,
        'VIM': soporte.vim || 'N/A',
        'Color': soporte.color || 'N/A',
        'Modelo': soporte.modelo || 'N/A',
        'Tipo Soporte': soporte.tiposoporte || 'N/A',
        'Estado': soporte.estado || 'N/A',
        'Origen': soporte.origen || 'N/A',
        'Destino': soporte.destino || 'N/A',
        'Usuario Crea': soporte.usuariocrea_nombre || 'N/A',
        'Mecánico (recibe/calibra)': soporte.usuariorepara_nombre || 'N/A',
        'Usuario Entrega': soporte.usuarioentrega_nombre || 'N/A',
        'Fecha Ingreso': soporte.fechaingreso ? new Date(soporte.fechaingreso).toLocaleString() : 'N/A',
        'Fecha Recepción': soporte.fecha_recepcion ? new Date(soporte.fecha_recepcion).toLocaleString() : 'N/A',
        'Fecha Calibración': soporte.fecha_calibracion ? new Date(soporte.fecha_calibracion).toLocaleString() : 'N/A',
        'Fecha Entrega': soporte.fechaentrega ? new Date(soporte.fechaentrega).toLocaleString() : 'N/A',
        'Observación': soporte.observacion || 'N/A'
      }));
      const wsDatos = XLSX.utils.json_to_sheet(datosExportar);
      XLSX.utils.book_append_sheet(wb, wsDatos, 'Soportes');

      // Descargar
      const fecha = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Reporte_Completo_Soportes_${fecha}.xlsx`);

      this.mensaje = 'Reporte completo exportado exitosamente';
      setTimeout(() => this.mensaje = '', 3000);

    } catch (error) {
      console.error('Error al exportar reporte:', error);
      this.error = 'Error al exportar el reporte';
      setTimeout(() => this.error = '', 3000);
    }
  }
}