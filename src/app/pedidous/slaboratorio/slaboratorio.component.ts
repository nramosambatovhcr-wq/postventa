import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { Soporte, SoporteRequest, LaboratorioService } from 'src/app/services/laboratorio.service';
import { AbastecimientoService } from 'src/app/services/abastecimiento.service';


@Component({
  selector: 'app-slaboratorio',
  templateUrl: './slaboratorio.component.html',
  styleUrls: ['./slaboratorio.component.css']
})
export class SlaboratorioComponent implements OnInit {

  // Datos principales
  soportes: Soporte[] = [];
  soportesFiltrados: Soporte[] = [];
  soporteSeleccionado: Soporte | null = null;

  // Control de modales y vista
  mostrarModal = false;
  mostrarModalImagenes = false;
  mostrarModalDetalle = false;
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
    observacion: '',
    vim: '',
    color: '',
    modelo: '',
    tipoSoporte: 'calibracion',
    origen: '',
    destino: '',
    fechaingreso: new Date(),
    fechaentrega: undefined,
    usuarioCrea: 1, // Temporal, debe venir del usuario logueado
    usuarioRepara: undefined,
    usuarioEntrega: undefined,
    estado: 'PENDIENTE'
  };

  // Control de carga y errores
  cargando = false;
  error = '';
  mensaje = '';

  // Búsqueda automática de artículo por código
  buscandoCodigo = false;
  codigoMsg = '';
  codigoMsgClase = '';   // 'text-success' | 'text-danger'

  // Archivos para subir
  archivosSeleccionados: File[] = [];
  // Vista previa (data URLs) de los archivos seleccionados en el modal principal
  imagenesPreview: string[] = [];

  // Estadísticas
  estadisticas = {
    total: 0,
    pendientes: 0,
    enProceso: 0,
    completados: 0,
    entregados: 0
  };
  usuario: any;
  id: any;
  agencia: any;

  constructor(
    private laboratorioService: LaboratorioService,
    private abastecimientoService: AbastecimientoService,
    private authService: AuthService,
  ) { }

  ngOnInit(): void {
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      if (this.usuario != null) {
        this.id = this.usuario.id;
        this.agencia = this.usuario.agencia;
        this.cargarSoportes();
      }
    });

  }

  // ========================
  // CARGA DE DATOS
  // ========================

  cargarSoportes(): void {
    this.cargando = true;
    this.error = '';

    this.laboratorioService.getSoportesByUsuarioCrea(this.id).subscribe({
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

  aplicarFiltros(): void {
    this.soportesFiltrados = this.soportes.filter(soporte => {
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
  // BÚSQUEDA AUTOMÁTICA POR CÓDIGO
  // ========================

  /**
   * Consulta el detalle del artículo por código y rellena la descripción
   * automáticamente. Se dispara al salir del campo (blur) o al presionar Enter.
   */
  buscarDatosArticulo(): void {
    const codigo = this.formularioSoporte.codigo?.trim();

    // Sin código, no hacemos nada
    if (!codigo) {
      this.codigoMsg = '';
      this.codigoMsgClase = '';
      return;
    }

    this.buscandoCodigo = true;
    this.codigoMsg = '';
    this.codigoMsgClase = '';

    this.abastecimientoService.getArticuloDetalle(codigo).subscribe({
      next: (res) => {
        if (res?.success && res.maestro) {
          // Autocompleta la descripción con el nombre del maestro
          this.formularioSoporte.descripcion = res.maestro.nombre || this.formularioSoporte.descripcion;
          this.codigoMsg = 'Artículo encontrado: ' + res.maestro.nombre;
          this.codigoMsgClase = 'text-success';
        } else {
          this.codigoMsg = `No se encontró información para el código "${codigo}"`;
          this.codigoMsgClase = 'text-danger';
        }
        this.buscandoCodigo = false;
      },
      error: (err) => {
        console.error('Error al buscar artículo:', err);
        this.codigoMsg = `No se encontró el código "${codigo}" en el maestro`;
        this.codigoMsgClase = 'text-danger';
        this.buscandoCodigo = false;
      }
    });
  }

  // ========================
  // OPERACIONES CRUD
  // ========================

  abrirModalNuevo(): void {
    this.modoEdicion = false;
    this.limpiarFormulario();
    this.archivosSeleccionados = [];
    this.imagenesPreview = [];
    this.codigoMsg = '';
    this.codigoMsgClase = '';
    this.mostrarModal = true;
  }

  abrirModalEditar(soporte: Soporte): void {
    this.modoEdicion = true;
    this.soporteSeleccionado = soporte;
    this.cargarDatosFormulario(soporte);
    this.archivosSeleccionados = [];
    this.imagenesPreview = [];
    this.codigoMsg = '';
    this.codigoMsgClase = '';
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.limpiarFormulario();
    this.archivosSeleccionados = [];
    this.imagenesPreview = [];
    this.codigoMsg = '';
    this.codigoMsgClase = '';
    this.error = '';
    this.mensaje = '';
  }

  guardarSoporte(): void {
    if (!this.validarFormulario()) {
      return;
    }

    this.cargando = true;
    this.error = '';
    this.formularioSoporte.fechaingreso = new Date();
    this.formularioSoporte.usuarioCrea = this.id;
    this.formularioSoporte.origen = this.agencia;

    if (this.modoEdicion && this.soporteSeleccionado) {
      // Actualizar
      this.laboratorioService.updateSoporte(this.soporteSeleccionado.id, this.formularioSoporte).subscribe({
        next: (response: any) => {
          // Si se seleccionaron nuevas imágenes durante la edición, subirlas también
          if (this.archivosSeleccionados.length > 0 && this.soporteSeleccionado) {
            this.subirImagenesYFinalizar(this.soporteSeleccionado.id, 'Soporte actualizado exitosamente');
          } else {
            this.cerrarModal();
            this.mensaje = 'Soporte actualizado exitosamente';
            this.cargarSoportes();
            this.cargando = false;
          }
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
          // Obtener el id del soporte recién creado.
          // Ajusta esto según lo que devuelva tu API (response.id, response.data.id, o el id directo).
          const nuevoId = response?.id ?? response?.data?.id ?? response;

          if (nuevoId) {
            this.subirImagenesYFinalizar(nuevoId, 'Soporte creado exitosamente');
          } else {
            this.error = 'No se pudo obtener el ID del soporte creado para subir las imágenes';
            this.cargarSoportes();
            this.cargando = false;
          }
        },
        error: (error) => {
          console.error('Error al crear soporte:', error);
          this.error = 'Error al crear el soporte';
          this.cargando = false;
        }
      });
    }
  }

  // Sube las imágenes seleccionadas en el modal principal y finaliza el flujo
  private subirImagenesYFinalizar(soporteId: any, mensajeExito: string): void {
    this.laboratorioService.uploadSoporteImages(soporteId, this.archivosSeleccionados).subscribe({
      next: () => {
        this.cerrarModal();
        this.mensaje = mensajeExito;
        this.cargarSoportes();
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al subir imágenes:', error);
        this.cerrarModal();
        this.error = 'El soporte se guardó, pero ocurrió un error al subir las imágenes';
        this.cargarSoportes();
        this.cargando = false;
      }
    });
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
   * Procesa los archivos seleccionados (galería o cámara).
   * Acumula sobre lo ya seleccionado, para permitir tomar varias fotos seguidas
   * o combinar cámara + galería.
   */
  onFileSelected(event: any): void {
    const files = Array.from(event.target.files) as File[];

    files.forEach(file => {
      const error = this.laboratorioService.getFileValidationError(file);
      if (!error) {
        this.archivosSeleccionados.push(file);

        // Generar vista previa
        const reader = new FileReader();
        reader.onload = (e: any) => this.imagenesPreview.push(e.target.result);
        reader.readAsDataURL(file);
      } else {
        alert(error);
      }
    });

    // Limpia el input para permitir volver a tomar/seleccionar (incluso el mismo archivo)
    if (event?.target) {
      event.target.value = '';
    }
  }

  // Quitar una imagen de la selección antes de guardar
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
        this.cerrarModalImagenes();
        this.mensaje = 'Imágenes subidas exitosamente';
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

    // La imagen es obligatoria al crear un nuevo soporte
    if (!this.modoEdicion && this.archivosSeleccionados.length === 0) {
      this.error = 'Debe adjuntar al menos una imagen para registrar el soporte';
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
      tipoSoporte: 'calibracion',
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
    // Implementar exportación a Excel
    console.log('Exportando a Excel...');
  }

  exportarCSV(): void {
    // Implementar exportación a CSV
    console.log('Exportando a CSV...');
  }
}