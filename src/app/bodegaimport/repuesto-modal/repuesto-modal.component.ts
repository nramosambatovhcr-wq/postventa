import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize, catchError } from 'rxjs/operators';

interface NuevoModeloData {
  nombre: string;
  idMarca: number;
}


@Component({ 
  selector: 'app-repuesto-modal',
  templateUrl: './repuesto-modal.component.html',
  styleUrls: ['./repuesto-modal.component.css']
})
export class RepuestoModalComponent implements OnInit, OnChanges {
  
  @Input() visible: boolean = false;
  @Input() oficina: any = null;
  @Input() modo: 'revision' | 'nuevo' | 'editar' = 'nuevo';
  @Input() repuestoExistente: any = null;
  @Input() baseUrl: string = 'https://bodega.vehicentro.com:1830/api'; // URL base para las APIs
  
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<any>();
  @Output() crearModelo = new EventEmitter<NuevoModeloData>();

  // Wizard state
  pasoActual: number = 1;
  totalPasos: number = 5;
  guardando: boolean = false;
  datosCargados: boolean = false;

  // Estados de carga
  cargandoMarcas: boolean = false;
  cargandoModelos: boolean = false;


  // Modal de nuevo modelo
  mostrarModalNuevoModelo: boolean = false;
  nuevoModeloNombre: string = '';
  guardandoModelo: boolean = false;

  // Modal de nueva ubicación
  mostrarModalNuevaUbicacion: boolean = false;
  guardandoUbicacion: boolean = false;
  cargandoUbicaciones: boolean = false;
  nuevaUbicacion = {
    codigoUbicacion: '',
    nombre: '',
    seccion: '',
    estante: '',
    nivel: '',
    capacidadMaxima: null as number | null,
    descripcion: ''
  };

  // Catálogos
  marcas: any[] = [];
  modelos: any[] = [];
  ubicacionesCatalogo: any[] = [];

  // Autocomplete de ubicación
  ubicacionBusqueda: string = '';
  ubicacionesFiltradas: any[] = [];
  ubicacionSeleccionadaObj: any = null;
  dropdownUbicacionAbierto: boolean = false;
  maxUbicacionesVisibles: number = 50;
  estados: any[] = [
    { id_estado: 1, nombre: 'Nuevo' },
    { id_estado: 2, nombre: 'Usado' },
    { id_estado: 3, nombre: 'Reparado' }
  ];
  clases: any[] = [];
  colores: any[] = [];
  ubicacionesAlmacen: any[] = [];

  // ========== DATOS DEL FORMULARIO ==========
  
  // Paso 1: Información Básica (precargados desde tabla)
  datosBasicos = {
    codigo: '',
    descripcion: '',
    idMarca: null as number | null,
    modelo: '',
    linea: '',
    ano: null as number | null,
    qty: 0,
    stock_disponible: 0,
    idEstado: null as String | null,
    idClase: null as String | null,
    idUbicacion: null as number | null
  };

  // Paso 2: Ubicación Vehículo
  datosUbicacion = {
    lado: '',
    posicion: '',
    ubicacionVehiculo: 'general',
    idColor: null as number | null,
    colorDescripcion: ''
  };

  // Paso 3: Medidas
  datosMedidas = {
    diametro: null as number | null,
    diametroUnidad: 'mm',
    altura: null as number | null,
    alturaUnidad: 'mm',
    ancho: null as number | null,
    anchoUnidad: 'mm',
    longitud: null as number | null,
    longitudUnidad: 'mm',
    espesor: null as number | null,
    espesorUnidad: 'mm',
    peso: null as number | null,
    pesoUnidad: 'kg',
    torque: null as number | null,
    torqueUnidad: 'Nm',
    voltaje: null as number | null,
    voltajeUnidad: 'V',
    amperaje: null as number | null,
    amperajeUnidad: 'A'
  };

  // Paso 4: Especificaciones
  datosEspecificaciones = {
    tipoMaterial: '',
    formaPerfil: '',
    tipoRosca: '',
    numDientes: null as number | null,
    numEspiras: null as number | null,
    numPines: null as number | null,
    tipoConexion: '',
    sistemaFijacion: '',
    versionEquipamiento: '',
    normativaSeguridad: '',
    notas: '',
    etiquetas: ''
  };

  // Paso 5: Imágenes
  imagenes: any[] = [];
  maxImagenes: number = 5;

  // Opciones
  lados = [
    { value: 'izquierdo', label: 'Izquierdo' },
    { value: 'derecho', label: 'Derecho' },
    { value: 'delantero', label: 'Delantero' },
    { value: 'trasero', label: 'Trasero' },
    { value: 'superior', label: 'Superior' },
    { value: 'inferior', label: 'Inferior' }
  ];

  posiciones = [
    { value: 'interior', label: 'Interior' },
    { value: 'exterior', label: 'Exterior' },
    { value: 'central', label: 'Central' }
  ];

  ubicacionesVehiculo = [
    { value: 'motor', label: 'Motor', icon: '🔧' },
    { value: 'transmision', label: 'Transmisión', icon: '⚙️' },
    { value: 'frenos', label: 'Frenos', icon: '🛑' },
    { value: 'suspension', label: 'Suspensión', icon: '🔩' },
    { value: 'direccion', label: 'Dirección', icon: '🔄' },
    { value: 'electrico', label: 'Sistema Eléctrico', icon: '⚡' },
    { value: 'carroceria', label: 'Carrocería', icon: '🚗' },
    { value: 'interior', label: 'Interior', icon: '🪑' },
    { value: 'general', label: 'General', icon: '📦' }
  ];

  unidadesLongitud = ['mm', 'cm', 'm', 'pulg'];
  unidadesPeso = ['g', 'kg', 'lb'];
  unidadesTorque = ['Nm', 'lb-ft', 'kg-m'];
  unidadesVoltaje = ['V', 'kV', 'mV'];
  unidadesAmperaje = ['A', 'mA', 'kA'];

  perfiles = ['U', 'V', 'L', 'T', 'Redondo', 'Cuadrado', 'Rectangular'];
  versiones = ['Básica', 'Full', 'Premium', 'Deportiva', 'Limitada'];

  currentYear: number = new Date().getFullYear();

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarCatalogos();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['repuestoExistente'] && this.repuestoExistente) {
      console.log('Cargando datos del repuesto:', this.repuestoExistente);
      this.cargarDatosDesdeTabla();
    } else if (changes['repuestoExistente'] && !this.repuestoExistente && this.modo === 'nuevo') {
      this.resetForm();
    }
    
    // Recargar marcas si se abre el modal y está vacío
    if (changes['visible'] && this.visible && this.marcas.length === 0) {
      this.cargarMarcas();
    }
  }

  // ============ SERVICIOS HTTP ============

  public getMarcas(): Observable<any> {
    const url = `${this.baseUrl}/api/repuestos/catalogos/marcas`;
    return this.http.get(url, { responseType: 'json' });
  }

  public getModelos(idMarca?: number): Observable<any> {
    const url = `${this.baseUrl}/api/repuestos/catalogos/modelos`;
    let params = new HttpParams();
    if (idMarca) {
      params = params.set('idMarca', idMarca.toString());
    }
    return this.http.get(url, { params, responseType: 'json' });
  }

  public getUbicaciones(): Observable<any> {
    const url = `${this.baseUrl}/api/repuestos/catalogos/ubicaciones`;
    return this.http.get(url, { responseType: 'json' });
  }

  // ============ CARGA DE CATÁLOGOS ============

  cargarMarcas(): void {
    this.cargandoMarcas = true;
    this.getMarcas()
      .pipe(
        finalize(() => this.cargandoMarcas = false),
        catchError(error => {
          console.error('Error al cargar marcas:', error);
          // Datos de respaldo
          this.marcas = [
            { id_marca: 1, nombre: 'Toyota' },
            { id_marca: 2, nombre: 'Honda' },
            { id_marca: 3, nombre: 'Nissan' },
            { id_marca: 4, nombre: 'Ford' },
            { id_marca: 5, nombre: 'Chevrolet' }
          ];
          return [];
        })
      )
      .subscribe({
        next: (response: any) => {
          this.marcas = response.data || response;
          console.log('Marcas cargadas:', this.marcas.length);
        }
      });
  }

  onMarcaChange(): void {
    const idMarca = this.datosBasicos.idMarca;
    
    if (!idMarca) {
      this.modelos = [];
      this.datosBasicos.modelo = '';
      return;
    }

    this.cargandoModelos = true;
    this.datosBasicos.modelo = '';
    
    this.getModelos(idMarca)
      .pipe(
        finalize(() => this.cargandoModelos = false),
        catchError(error => {
          console.error('Error al cargar modelos:', error);
          this.modelos = [];
          return [];
        })
      )
      .subscribe({
        next: (response: any) => {
          this.modelos = response.data || response;
          
          if (this.modelos.length === 0) {
            this.abrirModalNuevoModelo();
          }
        }
      });
  }



  // ============ MODAL NUEVO MODELO ============

  abrirModalNuevoModelo(): void {
    this.nuevoModeloNombre = '';
    this.mostrarModalNuevoModelo = true;
  }

  cerrarModalNuevoModelo(): void {
    this.mostrarModalNuevoModelo = false;
    this.nuevoModeloNombre = '';
    // Resetear marca si cancela
    if (this.modelos.length === 0) {
      this.datosBasicos.idMarca = null;
    }
  }

  guardarNuevoModelo(): void {
    if (!this.nuevoModeloNombre.trim() || !this.datosBasicos.idMarca) {
      return;
    }

    this.guardandoModelo = true;

    const body = {
      NombreModelo: this.nuevoModeloNombre.trim(),
      IdMarca: this.datosBasicos.idMarca
    };

    this.http.post<any>(`${this.baseUrl}/api/repuestos/catalogos/modelos`, body)
      .pipe(
        finalize(() => this.guardandoModelo = false),
        catchError(error => {
          console.error('Error al crear modelo:', error);
          alert(`Error al crear el modelo: ${error?.error?.msg || error.message}`);
          return [];
        })
      )
      .subscribe({
        next: (response: any) => {
          const nuevoModelo = response.data || response;
          this.modelos.push(nuevoModelo);
          this.datosBasicos.modelo = nuevoModelo.nombre_modelo || nuevoModelo.NombreModelo || nuevoModelo.nombre || body.NombreModelo;
          this.crearModelo.emit({ nombre: body.NombreModelo, idMarca: body.IdMarca });
          this.mostrarModalNuevoModelo = false;
          this.nuevoModeloNombre = '';
        }
      });
  }

  actualizarModelosDespuesDeCreacion(nuevoModelo: any): void {
    this.modelos.push(nuevoModelo);
    this.datosBasicos.modelo = nuevoModelo.nombre || nuevoModelo.nombre_modelo;
    this.guardandoModelo = false;
  }

  // ============ MODAL NUEVA UBICACIÓN ============

  abrirModalNuevaUbicacion(): void {
    this.nuevaUbicacion = {
      codigoUbicacion: '',
      nombre: '',
      seccion: '',
      estante: '',
      nivel: '',
      capacidadMaxima: null,
      descripcion: ''
    };
    this.mostrarModalNuevaUbicacion = true;
  }

  cerrarModalNuevaUbicacion(): void {
    this.mostrarModalNuevaUbicacion = false;
  }

  guardarNuevaUbicacion(): void {
    if (!this.nuevaUbicacion.codigoUbicacion.trim() || !this.nuevaUbicacion.nombre.trim()) {
      return;
    }

    this.guardandoUbicacion = true;

    const body = {
      CodigoUbicacion: this.nuevaUbicacion.codigoUbicacion.trim(),
      Nombre: this.nuevaUbicacion.nombre.trim(),
      Seccion: this.nuevaUbicacion.seccion || null,
      Estante: this.nuevaUbicacion.estante || null,
      Nivel: this.nuevaUbicacion.nivel || null,
      CapacidadMaxima: this.nuevaUbicacion.capacidadMaxima || null,
      Descripcion: this.nuevaUbicacion.descripcion || null
    };

    this.http.post<any>(`${this.baseUrl}/api/repuestos/catalogos/ubicaciones`, body)
      .pipe(
        finalize(() => this.guardandoUbicacion = false),
        catchError(error => {
          console.error('Error al crear ubicación:', error);
          alert(`Error al crear la ubicación: ${error?.error?.msg || error.message}`);
          return [];
        })
      )
      .subscribe({
        next: (response: any) => {
          const nuevaUbicacionCreada = {
            id_ubicacion: response.id_ubicacion,
            codigo_ubicacion: body.CodigoUbicacion,
            nombre: body.Nombre,
            seccion: body.Seccion,
            estante: body.Estante,
            nivel: body.Nivel
          };
          this.ubicacionesCatalogo.push(nuevaUbicacionCreada);
          this.ubicacionesFiltradas = this.ubicacionesCatalogo.slice(0, this.maxUbicacionesVisibles);
          this.seleccionarUbicacion(nuevaUbicacionCreada);
          this.mostrarModalNuevaUbicacion = false;
        }
      });
  }

  getNombreMarcaSeleccionada(): string {
    const marca = this.marcas.find(m => m.id_marca === this.datosBasicos.idMarca);
    return marca ? marca.nombre : '';
  }

  // ============ DATOS DESDE TABLA ============

  cargarDatosDesdeTabla(): void {
    const r = this.repuestoExistente;
    if (!r) return;

    this.datosBasicos.codigo = r.articulo || '';
    this.datosBasicos.descripcion = r.nombre || '';
    this.datosBasicos.linea = r.clase || '';
    this.datosBasicos.idClase = r.clase_id;
    this.datosBasicos.stock_disponible = r.stock_disponible || 0;
    this.datosBasicos.idUbicacion = r.id_ubicacion || null;
    
    // Sincronizar objeto visual del autocomplete de ubicación
    if (this.datosBasicos.idUbicacion && this.ubicacionesCatalogo.length > 0) {
      this.sincronizarUbicacionSeleccionada();
    } else {
      this.ubicacionSeleccionadaObj = null;
    }
    
    this.datosBasicos.ano = this.extraerAno(r.nombre) || this.extraerAno(r.articulo);
    this.datosBasicos.idMarca = this.buscarMarcaPorNombre(r.linea_competencia);
    
    if (r.id_marca) this.datosBasicos.idMarca = r.id_marca;
    if (r.modelo) this.datosBasicos.modelo = r.modelo;
    if (r.ano) this.datosBasicos.ano = r.ano;

    if (r.ubicacion_vehiculo) {
      this.datosUbicacion.ubicacionVehiculo = r.ubicacion_vehiculo;
    }
    
    if (r.medidas) {
      Object.assign(this.datosMedidas, r.medidas);
    }

    this.datosCargados = true;
    
    // Si tiene marca cargada, cargar sus modelos
    if (this.datosBasicos.idMarca) {
      this.onMarcaChange();
    }
  }

  extraerNumeroClase(claseId: string | null): number | null {
    if (!claseId) return null;
    const match = claseId.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  extraerAno(texto: string | null): number | null {
    if (!texto) return null;
    const match = texto.match(/\b(19|20)\d{2}\b/);
    return match ? parseInt(match[0], 10) : null;
  }

  buscarMarcaPorNombre(nombre: string | null): number | null {
    if (!nombre) return null;
    const marca = this.marcas.find(m => 
      m.nombre.toLowerCase() === nombre.toLowerCase() ||
      nombre.toLowerCase().includes(m.nombre.toLowerCase())
    );
    return marca ? marca.id_marca : null;
  }

  cargarCatalogos(): void {
    this.cargarMarcas();
    this.cargarUbicaciones();

    this.clases = [
      { id_clase: 1, nombre: '01 - Motor', codigo: '01' },
      { id_clase: 2, nombre: '02 - Transmisión', codigo: '02' },
      { id_clase: 3, nombre: '03 - Frenos', codigo: '03' },
      { id_clase: 4, nombre: '04 - Suspensión', codigo: '04' },
      { id_clase: 5, nombre: '05 - Eléctrico', codigo: '05' }
    ];

    this.ubicacionesAlmacen = [];
  }

  cargarUbicaciones(): void {
    this.cargandoUbicaciones = true;
    this.getUbicaciones()
      .pipe(
        finalize(() => this.cargandoUbicaciones = false),
        catchError(error => {
          console.error('Error al cargar ubicaciones:', error);
          this.ubicacionesCatalogo = [];
          this.ubicacionesFiltradas = [];
          return [];
        })
      )
      .subscribe({
        next: (response: any) => {
          this.ubicacionesCatalogo = response.data || response;
          this.ubicacionesFiltradas = this.ubicacionesCatalogo.slice(0, this.maxUbicacionesVisibles);

          // Si ya hay una ubicación seleccionada (modo editar), sincronizar el objeto
          if (this.datosBasicos.idUbicacion) {
            this.sincronizarUbicacionSeleccionada();
          }

          console.log('Ubicaciones cargadas:', this.ubicacionesCatalogo.length);
        }
      });
  }

  // ── Autocomplete de Ubicación ────────────────────────────────────

  /** Sincroniza el objeto visual con datosBasicos.idUbicacion */
  sincronizarUbicacionSeleccionada(): void {
    this.ubicacionSeleccionadaObj = this.ubicacionesCatalogo.find(
      u => u.id_ubicacion === this.datosBasicos.idUbicacion
    ) || null;
  }

  abrirDropdownUbicacion(): void {
    this.dropdownUbicacionAbierto = true;
    if (!this.ubicacionBusqueda) {
      this.ubicacionesFiltradas = this.ubicacionesCatalogo.slice(0, this.maxUbicacionesVisibles);
    }
  }

  cerrarDropdownUbicacion(): void {
    // Pequeño delay para que el mousedown del ítem se registre antes de cerrar
    setTimeout(() => {
      this.dropdownUbicacionAbierto = false;
    }, 150);
  }

  toggleDropdownUbicacion(): void {
    if (this.dropdownUbicacionAbierto) {
      this.dropdownUbicacionAbierto = false;
    } else {
      this.abrirDropdownUbicacion();
    }
  }

  filtrarUbicaciones(): void {
    const termino = this.ubicacionBusqueda.trim().toLowerCase();
    if (!termino) {
      this.ubicacionesFiltradas = this.ubicacionesCatalogo.slice(0, this.maxUbicacionesVisibles);
    } else {
      this.ubicacionesFiltradas = this.ubicacionesCatalogo
        .filter(u =>
          u.nombre?.toLowerCase().includes(termino) ||
          u.codigo_ubicacion?.toLowerCase().includes(termino) ||
          u.seccion?.toLowerCase().includes(termino)
        )
        .slice(0, this.maxUbicacionesVisibles);
    }
    this.dropdownUbicacionAbierto = true;
  }

  seleccionarUbicacion(ubicacion: any): void {
    this.ubicacionSeleccionadaObj  = ubicacion;
    this.datosBasicos.idUbicacion  = ubicacion.id_ubicacion;
    this.ubicacionBusqueda         = '';
    this.dropdownUbicacionAbierto  = false;
  }

  limpiarUbicacion(): void {
    this.ubicacionSeleccionadaObj  = null;
    this.datosBasicos.idUbicacion  = null;
    this.ubicacionBusqueda         = '';
    this.dropdownUbicacionAbierto  = false;
  }

  /** Resalta en <mark> el texto que coincide con la búsqueda */
  resaltarTexto(texto: string, busqueda: string): string {
    if (!busqueda || !texto) return texto;
    const regex = new RegExp(`(${busqueda.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return texto.replace(regex, '<mark>$1</mark>');
  }

  // ============ WIZARD NAVIGATION ============

  get progresoWizard(): number {
    return (this.pasoActual / this.totalPasos) * 100;
  }

  get tituloPaso(): string {
    const titulos = ['Información Básica', 'Ubicación en Vehículo', 'Medidas', 'Especificaciones', 'Imágenes'];
    return titulos[this.pasoActual - 1];
  }

  siguientePaso(): void {
    if (this.validarPasoActual() && this.pasoActual < this.totalPasos) {
      this.pasoActual++;
    }
  }

  pasoAnterior(): void {
    if (this.pasoActual > 1) {
      this.pasoActual--;
    }
  }

  irAPaso(paso: number): void {
    if (paso <= this.pasoActual || this.validarPasosAnteriores(paso)) {
      this.pasoActual = paso;
    }
  }

  validarPasoActual(): boolean {
    switch (this.pasoActual) {
      case 1:
        return this.datosBasicos.codigo.trim() !== '' && 
               this.datosBasicos.descripcion.trim() !== '';
      default:
        return true;
    }
  }

  validarPasosAnteriores(pasoDestino: number): boolean {
    return pasoDestino < this.pasoActual;
  }

  // ============ IMÁGENES ============

  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    if (this.imagenes.length + files.length > this.maxImagenes) {
      alert(`Máximo ${this.maxImagenes} imágenes`);
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagenes.push({
          file: file,
          preview: e.target.result,
          nombre: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  }

  eliminarImagen(index: number): void {
    this.imagenes.splice(index, 1);
  }

  // ============ GUARDAR ============

  guardarRepuesto(): void {
    if (!this.validarPasoActual()) {
      alert('Complete los campos requeridos');
      return;
    }

    this.guardando = true;

    const body = {
      // Datos básicos
      codigo: this.datosBasicos.codigo,
      descripcion: this.datosBasicos.descripcion,
      idMarca: this.datosBasicos.idMarca,
      modelo: this.datosBasicos.modelo,
      linea: this.datosBasicos.linea,
      ano: this.datosBasicos.ano,
      qty: this.datosBasicos.qty,
      idEstado: this.datosBasicos.idEstado,
      idUbicacion: this.datosBasicos.idUbicacion,
      // Ubicación vehículo
      lado: this.datosUbicacion.lado || null,
      posicion: this.datosUbicacion.posicion || null,
      ubicacionVehiculo: this.datosUbicacion.ubicacionVehiculo || null,
      idColor: this.datosUbicacion.idColor || null,
      colorDescripcion: this.datosUbicacion.colorDescripcion || null,
      // Medidas
      diametro: this.datosMedidas.diametro,
      altura: this.datosMedidas.altura,
      ancho: this.datosMedidas.ancho,
      longitud: this.datosMedidas.longitud,
      espesor: this.datosMedidas.espesor,
      peso: this.datosMedidas.peso,
      torque: this.datosMedidas.torque,
      voltaje: this.datosMedidas.voltaje,
      amperaje: this.datosMedidas.amperaje,
      // Especificaciones
      tipoMaterial: this.datosEspecificaciones.tipoMaterial || null,
      formaPerfil: this.datosEspecificaciones.formaPerfil || null,
      tipoRosca: this.datosEspecificaciones.tipoRosca || null,
      numDientes: this.datosEspecificaciones.numDientes,
      numEspiras: this.datosEspecificaciones.numEspiras,
      numPines: this.datosEspecificaciones.numPines,
      tipoConexion: this.datosEspecificaciones.tipoConexion || null,
      sistemaFijacion: this.datosEspecificaciones.sistemaFijacion || null,
      versionEquipamiento: this.datosEspecificaciones.versionEquipamiento || null,
      normativaSeguridad: this.datosEspecificaciones.normativaSeguridad || null,
      notas: this.datosEspecificaciones.notas || null,
      etiquetas: this.datosEspecificaciones.etiquetas || null,
      // Oficina
      oficinaId: this.oficina?.oficinaId,
      bodegaId: this.oficina?.bodegaId,
      usuarioRegistro: 'sistema'
    };

    this.http.post<any>(`${this.baseUrl}/api/repuestos`, body).subscribe({
      next: (response) => {
        const idRepuesto = response.id_repuesto;

        // Si hay imágenes, subirlas después de crear el repuesto
        if (this.imagenes.length > 0) {
          this.subirImagenes(idRepuesto).then(() => {
            this.guardando = false;
            this.guardar.emit({ guardado: true, idRepuesto, modo: this.modo });
            this.resetForm();
          }).catch((err) => {
            console.error('Error subiendo imágenes:', err);
            // El repuesto se guardó igual, solo fallaron las imágenes
            this.guardando = false;
            this.guardar.emit({ guardado: true, idRepuesto, modo: this.modo });
            this.resetForm();
            alert('Repuesto guardado, pero hubo un error al subir las imágenes.');
          });
        } else {
          this.guardando = false;
          this.guardar.emit({ guardado: true, idRepuesto, modo: this.modo });
          this.resetForm();
        }
      },
      error: (error) => {
        console.error('Error al guardar repuesto:', error);
        this.guardando = false;
        alert(`Error al guardar: ${error?.error?.msg || JSON.stringify(error?.error?.errors) || error.message}`);
      }
    });
  }

  private subirImagenes(idRepuesto: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      this.imagenes.forEach((img) => {
        formData.append('files', img.file, img.nombre);
      });
      formData.append('tipoImagen', 'general');

      this.http.post<any>(`${this.baseUrl}/api/repuestos/upload-imagen/${idRepuesto}`, formData)
        .subscribe({
          next: () => resolve(),
          error: (err) => reject(err)
        });
    });
  }

  puedeGuardar(): boolean {
    return this.datosBasicos.codigo.trim() !== '' && 
           this.datosBasicos.descripcion.trim() !== '' &&
           !this.guardando;
  }

  cerrarModal(): void {
    this.cerrar.emit();
  }

  resetForm(): void {
    this.pasoActual = 1;
    this.datosCargados = false;
    this.modelos = [];
    this.ubicacionBusqueda = '';
    this.ubicacionSeleccionadaObj = null;
    this.dropdownUbicacionAbierto = false;

    
    this.datosBasicos = {
      codigo: '', descripcion: '', idMarca: null, modelo: '', linea: '',
      ano: null, qty: 0, stock_disponible: 0, idEstado: null, idClase: null, idUbicacion: null
    };
    
    this.datosUbicacion = {
      lado: '', posicion: '', ubicacionVehiculo: 'general',
      idColor: null, colorDescripcion: ''
    };
    
    this.datosMedidas = {
      diametro: null, diametroUnidad: 'mm', altura: null, alturaUnidad: 'mm',
      ancho: null, anchoUnidad: 'mm', longitud: null, longitudUnidad: 'mm',
      espesor: null, espesorUnidad: 'mm', peso: null, pesoUnidad: 'kg',
      torque: null, torqueUnidad: 'Nm', voltaje: null, voltajeUnidad: 'V',
      amperaje: null, amperajeUnidad: 'A'
    };
    
    this.datosEspecificaciones = {
      tipoMaterial: '', formaPerfil: '', tipoRosca: '',
      numDientes: null, numEspiras: null, numPines: null,
      tipoConexion: '', sistemaFijacion: '', versionEquipamiento: '',
      normativaSeguridad: '', notas: '', etiquetas: ''
    };
    
    this.imagenes = [];
  }

  // ============ GETTERS ============

  getCategoriaLabel(key: string): string {
    const cat: any = {
      'motor': 'Motor', 'transmision': 'Transmisión', 'frenos': 'Frenos',
      'suspension': 'Suspensión', 'direccion': 'Dirección',
      'electrico': 'Sistema Eléctrico', 'carroceria': 'Carrocería',
      'interior': 'Interior', 'general': 'General'
    };
    return cat[key] || key;
  }

  get claseNombre(): string {
    const clase = this.clases.find(c => c.id_clase === this.datosBasicos.idClase);
    return clase ? clase.nombre : this.datosBasicos.linea || 'No especificada';
  }
}