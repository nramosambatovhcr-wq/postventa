// invbodage.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { InventarioService, ConteoInventarioDto, ImagenesConteoDto, CampanaInventarioDto, ConteoUnificadoDto, TotalItemsDto, RepuestoReservadoDto } from '../../services/inventario.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { OracleService, InventarioBasicoModel } from '../../services/oracle.service';
import { AuthService } from 'src/app/services/auth.service';
import { Usuario } from 'src/app/models/usuario';

// Interfaz para la foto
export interface Photo {
  filepath: string;
  file?: File;
}

interface Agencia {
  idSerial: number;
  codigoAgencia: string;
  nombre: string;
  direccion: string;
  ciudad?: string;
  // Add other properties as needed
}

export interface Imagen {
  nombre_archivo: string;
  ruta_archivo: string;
  tamano_bytes: number;
  fecha_subida: string;
}

// Interfaz que representa el registro de inventario (actualizado)
export interface BlDetailItemForConteo {
  id: number;
  codigo: string;
  descripcionEspanol: string;
  cantidad: number;
  invoice: string;
  invoiceBl: string;
  bl: string;
  // Propiedades de conteo
  cantidadContada?: number;
  observaciones?: string;
  ubicacion?: string;
  estado?: string;
  unidad?: string;
  photos?: Photo[]; // Fotos para subir
  imagenes?: Imagen[]; // Nueva propiedad para las imágenes existentes
}

@Component({
  selector: 'app-invbodage',
  templateUrl: './invbodage.component.html',
  styleUrls: ['./invbodage.component.css']
})
export class InvbodageComponent implements OnInit {

  blId: string | null = null;
  blNombre: string = 'Cargando...';
  availableUnits: string[] = ['unidad', 'kit', 'conjunto'];
  availableStates: string[] = ['bueno', 'averiado'];

  blDetails: BlDetailItemForConteo[] = [];
  filteredBlDetails: BlDetailItemForConteo[] = [];
  conteosRealizados: any[] = []; // Arreglo para los conteos unificados
  conteosFiltered: any[] = []; // Arreglo para conteos filtrados
  campanaActual: CampanaInventarioDto | null = null; // Variable para almacenar la campaña

  searchTerm: string = '';
  isLoading: boolean = true;
  errorMessage: string | null = null;

  selectedDetail: any | null = null;
  isModalOpen: boolean = false;
  isSearching: boolean = false;
  isModalOpenI: boolean = false;
  currentImages: Imagen[] = [];
  id: number = 0;
  usuario: Usuario | null = null;
  isSaving: boolean = false; // Nueva variable para controlar el estado de guardado
  // [AÑADIDO] Estado para el cierre de conteo
  isFinalizing: boolean = false; 

  // NUEVAS VARIABLES PARA LA VISTA DE ANÁLISIS
  showAnalysisView: boolean = false; // Toggle entre vista simple y análisis
  selectedAnalysisConteo: ConteoUnificadoDto | null = null;
  showAnalysisModal: boolean = false;
  
  // Variables para filtros de análisis
  filterDiferencia: string = 'todos';
  filterEstadoReconteo: string = 'todos';
   agencias: any[] = [];
   nombreAgencia: string='';
   codAgencia: string='';
  totalItems: TotalItemsDto | null = null;
  totalItemsc:any;
  error: string = '';
  totalreservado:any;
  totalreserdis:any;
  public inventarioReservado: RepuestoReservadoDto[] = [];
public isLoadingInventario: boolean = false;
public errorInventario: string = '';
rol:any;

  // Propiedades para el modal de selección de bodega
  isModalBodegaOpen: boolean = false;
  bodegasDisponibles: any[] = [];
  bodegaSeleccionada: any = null;

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router,
    private inventarioService: InventarioService,
    private oracleService: OracleService
  ) { }

  ngOnInit(): void {
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      console.log(this.usuario);
      if(this.usuario != null){
        this.id = this.usuario.id;
        this.rol= this.usuario.rol;
        console.log(this.id);
        if(this.id){
          this.route.paramMap.subscribe(params => {
            this.blId = params.get('id');
            if (this.blId) { 
              this.getAgencias();
              this.cargarConteosRealizados(Number(this.blId)); // Cargar conteos unificados al iniciar
              this.cargarCampanaPorId(1); // Llamar a la función que faltaba
              
            } else {
              this.isLoading = false;
              this.errorMessage = 'No se proporcionó un ID de BL.';
            }
          });
        }
        else{
          this.router.navigate(['/login']);
        }
      }
    });
  }

  usercont(): void {
     this.router.navigate(['/ranking', this.blId]);
    
  }

  usersum(): void {
     this.router.navigate(['/conteoallagen', this.blId]);
    
  }

  // --- MÉTODOS EXISTENTES OMITIDOS POR BREVEDAD ---
  // ... (cargarTotalItems, canClickReservados, goToReservadosDetail, cargarInventarioReservado, getAgencias, cargarCampanaPorId) ...
  cargarTotalItems(oficinaId: string): void {
    this.isLoading = true;
    this.error = '';
    
    this.inventarioService.getTotalItemsPorAgencia(oficinaId)
      .subscribe({
        next: (response: TotalItemsDto) => {
          this.totalItems = response;
          console.log('Total de items:', response.total_items);
          this.totalItemsc =response.total_items;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error al cargar total de items:', err);
          this.error = 'No se pudo cargar el total de items';
          this.isLoading = false;
        }
      });
  }

  // Asumiendo que 'usuario' ya está cargado y tiene una propiedad 'rol'
// Por ejemplo: usuario: Usuario | null;

// Reemplaza 'ROL_PERMITIDO' por el nombre del rol que debe tener acceso al click.
private readonly ROL_REQUERIDO_CLICK: string = 'inventarioad'; // <-- Define el rol aquí

// 1. Función para verificar si el usuario tiene el rol necesario
canClickReservados(): void {
  console.log('hizo click');
  
  // Asegúrate de que 'this.usuario' se haya cargado previamente (por ejemplo, en ngOnInit)
   if(this.rol === this.ROL_REQUERIDO_CLICK){
    const agenciaId = this.blId; // Usando la variable de agencia que ya tienes
   this.router.navigate(['/reservados', agenciaId]);
   }
  
  // O si el usuario tiene un array de roles:
  // return this.usuario?.roles.includes(this.ROL_REQUERIDO_CLICK);
}

// 2. Función que se ejecuta si se tiene permiso
goToReservadosDetail(): void {
    // Si esta tarjeta está en invbodage.component, esto navega al componente reservados
    
}

  cargarInventarioReservado(oficinaId: string): void {
    // 1. Inicializar estados
    this.isLoadingInventario = true;
    this.errorInventario = '';
    this.inventarioReservado = []; // Opcional: limpiar los datos anteriores

    // 2. Llamar al servicio y suscribirse al Observable
    this.inventarioService.getInventarioReservadoPorOficina(oficinaId)
        .subscribe({
            // Caso de éxito: 'next'
            next: (response: RepuestoReservadoDto[]) => {
                this.inventarioReservado = response;
                this.totalreservado=response.length;
                console.log(`Inventario reservado cargado para ${oficinaId}. Total de artículos: ${response.length}`);
                const itemsSinStock = response.filter(item => 
                    item.stock_disponible === 0
                );

                // 3. Asignar el resultado al contador
                this.totalreserdis = itemsSinStock.length;
                // 3. Finalizar estado de carga
                this.isLoadingInventario = false;
            },
            
            // Caso de error: 'error'
            error: (err) => {
                console.error('Error al cargar el inventario reservado:', err);
                // Si el backend devuelve 404 y lo maneja como 'error', puedes ajustar el mensaje
                this.errorInventario = 'No se pudo cargar el inventario reservado.';
                
                // 3. Finalizar estado de carga (incluso en caso de error)
                this.isLoadingInventario = false;
            }
        });
}

 getAgencias(): void {
  console.log('blId a buscar:', this.blId, 'tipo:', typeof this.blId);
  
  this.inventarioService.getAgencias()
    .pipe(
      catchError(error => {
        console.error('Error al obtener agencias:', error);
        return of([]);
      })
    )
    .subscribe((data: any) => {
      console.log('Data recibida:', data);
      
      // Convertir el objeto a array usando Object.values()
      const arrayAgencias: Agencia[] = Object.values(data);
      this.agencias = arrayAgencias;
      console.log('Array de agencias:', arrayAgencias);
      
      // Convertir blId a número si es string
      const blIdNumber = typeof this.blId === 'string' ? parseInt(this.blId, 10) : this.blId;
      console.log('blId convertido:', blIdNumber);
      
      // Filtrar la agencia por idSerial
      const agenciaEncontrada = arrayAgencias.find((agencia: Agencia) => 
        agencia.idSerial === blIdNumber
      );
      
      if (agenciaEncontrada) {
        console.log('Agencia encontrada:', agenciaEncontrada);
        this.nombreAgencia = agenciaEncontrada.nombre;
        this.codAgencia = agenciaEncontrada.codigoAgencia.substring(1);;
        console.log(this.codAgencia);
        this.cargarTotalItems(this.codAgencia);
        this.cargarInventarioReservado(this.codAgencia);
        console.log('Nombre de la agencia:', this.nombreAgencia);
      } else {
        console.log('No se encontró una agencia con ID:', blIdNumber);
        console.log('IDs disponibles:', arrayAgencias.map((a: Agencia) => a.idSerial));
      }
    });

    
}

  // Cargar una campaña de inventario específica por su ID
  cargarCampanaPorId(id: number): void {
    this.inventarioService.getCampanaById(id)
      .pipe(
        catchError(error => {
          console.error('Error al cargar la campaña:', error);
          this.campanaActual = null;
          return of(null);
        })
      )
      .subscribe((campana: CampanaInventarioDto | null) => {
        if (campana) {
          console.log('Campaña encontrada:', campana);
          this.campanaActual = campana; // Almacenar los datos de la campaña
        } else {
          console.log('No se encontró la campaña con ID:', id);
          this.campanaActual = null;
        }
      });
  }
  
  cargarConteosRealizados(agenciaId: number): void {
  // Usar la nueva función con filtro
  this.inventarioService.getConteosUnificadosPorAgencia(agenciaId).subscribe({
    next: (response: any) => {
      // Verificar la estructura de la respuesta
      if (response && response.datos) {
        this.conteosRealizados = response.datos;
      } else {
        // Si la respuesta es directamente el array
        this.conteosRealizados = response;
      }
      this.conteosFiltered = [...this.conteosRealizados];
      console.log('Conteos unificados de la agencia cargados:', this.conteosRealizados);
    },
    error: (error) => {
      console.error('Error al cargar los conteos unificados:', error);
      this.conteosRealizados = [];
      this.conteosFiltered = [];
    }
  });
}

  applyFilter(): void {
    const term = this.searchTerm.toLowerCase();
    
    if (this.showAnalysisView) {
      // Filtrado para la vista de análisis
      this.conteosFiltered = this.conteosRealizados.filter(conteo => {
        const matchSearch = !term || 
          conteo.codigo_interno_agencia.toLowerCase().includes(term) ||
          (conteo.nombre_articulo && conteo.nombre_articulo.toLowerCase().includes(term));
        
        const matchDiferencia = this.filterDiferencia === 'todos' ||
          (this.filterDiferencia === 'sobrante' && conteo.diferencia_stock > 0) ||
          (this.filterDiferencia === 'faltante' && conteo.diferencia_stock < 0) ||
          (this.filterDiferencia === 'exacto' && conteo.diferencia_stock === 0);
        
        const matchReconteo = this.filterEstadoReconteo === 'todos' ||
          (this.filterEstadoReconteo === 'reconteo' && conteo.requiere_reconteo) ||
          (this.filterEstadoReconteo === 'ok' && !conteo.requiere_reconteo);
        
        return matchSearch && matchDiferencia && matchReconteo;
      });
    } else {
      // Filtrado para la vista simple (original)
      if (!term) {
        this.conteosFiltered = [...this.conteosRealizados];
      } else {
        this.conteosFiltered = this.conteosRealizados.filter(conteo =>
          conteo.codigo_interno_agencia.toLowerCase().includes(term) ||
          (conteo.descripcion && conteo.descripcion.toLowerCase().includes(term))
        );
      }
    }
  }

  // NUEVAS FUNCIONES PARA LA VISTA DE ANÁLISIS
  toggleView(): void {
    this.showAnalysisView = !this.showAnalysisView;
    this.applyFilter(); // Reaplicar filtros al cambiar de vista
  }

  showAnalysisDetails(conteo: ConteoUnificadoDto): void {
    this.selectedAnalysisConteo = conteo;
    this.showAnalysisModal = true;
  }

  closeAnalysisModal(): void {
    this.showAnalysisModal = false;
    this.selectedAnalysisConteo = null;
  }

  getDiferenciaColor(diferencia: number): string {
    if (diferencia > 0) return 'text-success';
    if (diferencia < 0) return 'text-danger';
    return 'text-muted';
  }

  getDiferenciaIcon(diferencia: number): string {
    if (diferencia > 0) return '↑';
    if (diferencia < 0) return '↓';
    return '=';
  }

  // NUEVAS FUNCIONES PARA TIPO DE DIFERENCIA
  getTipoDiferenciaText(diferencia: number): string {
    if (diferencia > 0) return 'SOBRANTE';
    if (diferencia < 0) return 'FALTANTE';
    return 'EXACTO';
  }

  getTipoDiferenciaBadge(diferencia: number): string {
    if (diferencia > 0) return 'badge-sobrante';
    if (diferencia < 0) return 'badge-faltante';
    return 'badge-exacto';
  }

  // Método auxiliar para limpiar rutas de imágenes
  cleanImagePath(rutaArchivo: string): string {
    if (!rutaArchivo) return '';
    
    // Eliminar la parte no deseada del path
    let cleanPath = rutaArchivo.replace('wwwroot\\uploads\\', '');
    // Reemplazar backslashes por forward slashes
    cleanPath = cleanPath.replace(/\\/g, '/');
    
    return cleanPath;
  }

  formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'N/A';
    return '$' + value.toFixed(2);
  }

  formatDate(date: Date | string | null | undefined): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('es-EC');
  }

  getStats() {
    const total = this.conteosFiltered.length;
    const conReconteo = this.conteosFiltered.filter((c: any) => c.requiere_reconteo).length;
    const sobrantes = this.conteosFiltered.filter((c: any) => c.diferencia_stock > 0).length;
    const faltantes = this.conteosFiltered.filter((c: any) => c.diferencia_stock < 0).length;
    const exactos = this.conteosFiltered.filter((c: any) => c.diferencia_stock === 0).length;
    
    return { total, conReconteo, sobrantes, faltantes, exactos };
  }

  exportToCSV(): void {
    const headers = [
      'Código', 'Artículo', 'Agencia', 'Cantidad Física', 'Stock Sistema',
      'Diferencia', 'Valor Total', 'Estado', 'Usuario', 'Fecha'
    ];
    
    const rows = this.conteosFiltered.map((c: any) => [
      c.codigo_interno_agencia,
      c.nombre_articulo || '',
      c.agencia_id,
      c.cantidad_total,
      c.stock_disponible,
      c.diferencia_stock,
      c.valor_total_acumulado || 0,
      c.requiere_reconteo ? 'Requiere Reconteo' : 'OK',
      c.usuariosnombre,
      this.formatDate(c.ultima_fecha_conteo)
    ]);
    
    let csv = headers.join(',') + '\n';
    rows.forEach((row: any) => {
      csv += row.map((cell: any) => `"${cell}"`).join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conteos_agencia_${this.blId}_${new Date().getTime()}.csv`;
    a.click();
  }

  // FUNCIONES ORIGINALES (mejoradas)
  openModal(item: BlDetailItemForConteo): void {
    this.selectedDetail = { 
      ...item,
      estado: 'bueno',
      unidad: 'unidad'
    };
    this.isSaving = false; // Resetear estado de guardado al abrir modal
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedDetail = null;
    this.isSaving = false; // Resetear estado de guardado al cerrar modal
  }

  // --- onCodigoChange, onCodigoChange1, onCodigoChange2, llenarDatosBodega, etc. ---
  onCodigoChange(): void {
    if (this.selectedDetail && this.selectedDetail.codigo.length >= 2) {
      this.isSearching = true;
      this.selectedDetail.descripcionEspanol = '';
      this.selectedDetail.cantidadContada = 0;
      this.selectedDetail.ubicacion = '';
      this.selectedDetail.observaciones = '';
      this.selectedDetail.estado = 'bueno';
      this.selectedDetail.unidad = 'unidad';

      this.oracleService.getInventarioBasicoPorArticulo(this.selectedDetail.codigo)
        .pipe(
          catchError(error => {
            console.error('Error al buscar artículo:', error);
            this.isSearching = false;
            return of(null);
          })
        )
        .subscribe(response => {
          this.isSearching = false;
          if (response && response.success && response.datos.length > 0) {
            const articuloEncontrado: any = response.datos[0];
            this.selectedDetail.descripcionEspanol = articuloEncontrado.nombre;
            this.selectedDetail.cantidad = articuloEncontrado.cantidad;
            this.selectedDetail.ubicacion = articuloEncontrado.ubicacion;
            this.selectedDetail.unidad = articuloEncontrado.unidad || 'unidad';
            this.selectedDetail.estado = articuloEncontrado.estado || 'bueno';
            this.selectedDetail.observaciones = '';
          } else {
            this.selectedDetail.descripcionEspanol = 'Artículo no encontrado';
            this.selectedDetail.cantidadContada = 0;
            this.selectedDetail.ubicacion = '';
            this.selectedDetail.observaciones = 'No se encontraron datos para este artículo.';
            this.selectedDetail.estado = 'bueno';
            this.selectedDetail.unidad = 'unidad';
          }
        });
    } else {
      if (this.selectedDetail) {
        this.selectedDetail.descripcionEspanol = '';
        this.selectedDetail.cantidadContada = 0;
        this.selectedDetail.ubicacion = '';
        this.selectedDetail.observaciones = '';
        this.selectedDetail.estado = 'bueno';
        this.selectedDetail.unidad = 'unidad';
      }
    }
  }

onCodigoChange1(): void {
    if (this.selectedDetail && this.selectedDetail.codigo.length >= 2) {
      this.isSearching = true;
      this.selectedDetail.descripcionEspanol = '';
      this.selectedDetail.cantidadContada = 0;
      this.selectedDetail.ubicacion = '';
      this.selectedDetail.observaciones = '';
      this.selectedDetail.estado = 'bueno';
      this.selectedDetail.unidad = 'unidad';

      // Obtener la agencia del inventario actual
      const agenciaId = '008';

      this.oracleService.getInventarioGenParcialPorArticulo(this.selectedDetail.codigo, this.codAgencia)
        .pipe(
          catchError(error => {
            console.error('Error al buscar artículo:', error);
            this.isSearching = false;
            return of(null);
          })
        )
        .subscribe(response => {
          this.isSearching = false;
          if (response && response.success && response.datos.length > 0) {
            const articuloEncontrado = response.datos[0];
            this.selectedDetail.descripcionEspanol = articuloEncontrado.nombre;
            this.selectedDetail.cantidad = response.stockTotal; // Stock total de la agencia
            this.selectedDetail.ubicacion = articuloEncontrado.ubicacion;
            this.selectedDetail.unidad = 'unidad'; // Ajusta según tu lógica
            this.selectedDetail.estado = 'bueno'; // Ajusta según tu lógica
            this.selectedDetail.observaciones = '';
            
            // Opcional: Mostrar información adicional de bodega
            if (response.datos.length > 1) {
              this.selectedDetail.observaciones = `Encontrado en ${response.datos.length} bodegas`;
            }
          } else {
            this.selectedDetail.descripcionEspanol = 'Artículo no encontrado';
            this.selectedDetail.cantidadContada = 0;
            this.selectedDetail.ubicacion = '';
            this.selectedDetail.observaciones = 'No se encontraron datos para este artículo en esta agencia.';
            this.selectedDetail.estado = 'bueno';
            this.selectedDetail.unidad = 'unidad';
          }
        });
    } else {
      if (this.selectedDetail) {
        this.selectedDetail.descripcionEspanol = '';
        this.selectedDetail.cantidadContada = 0;
        this.selectedDetail.ubicacion = '';
        this.selectedDetail.observaciones = '';
        this.selectedDetail.estado = 'bueno';
        this.selectedDetail.unidad = 'unidad';
      }
    }
  }

onCodigoChange2(): void {
  if (this.selectedDetail && this.selectedDetail.codigo.length >= 1) {
    this.isSearching = true;
    this.selectedDetail.descripcionEspanol = '';
    this.selectedDetail.cantidadContada = 0;
    this.selectedDetail.ubicacion = '';
    this.selectedDetail.observaciones = '';
    this.selectedDetail.estado = 'bueno';
    this.selectedDetail.unidad = 'unidad';

    this.oracleService.getInventarioGenParcialPorArticulo(this.selectedDetail.codigo, this.codAgencia)
      .pipe(
        catchError(error => {
          console.error('Error al buscar artículo:', error);
          this.isSearching = false;
          return of(null);
        })
      )
      .subscribe(response => {
        this.isSearching = false;
        if (response && response.success && response.datos.length > 0) {
          
          // Si hay más de una bodega, mostrar modal de selección
          if (response.datos.length > 1) {
            this.bodegasDisponibles = response.datos;
            this.isModalBodegaOpen = true;
            // Mantener descripción básica mientras selecciona
            this.selectedDetail.descripcionEspanol = response.datos[0].nombre;
            this.selectedDetail.observaciones = `Encontrado en ${response.datos.length} bodegas. Seleccione una bodega.`;
          } else {
            // Solo una bodega, llenar directamente
            this.llenarDatosBodega(response.datos[0], response.stockTotal);
          }
        } else {
          this.selectedDetail.descripcionEspanol = 'Artículo no encontrado';          
          this.selectedDetail.cantidadContada = 0;
          this.selectedDetail.ubicacion = '';
          this.selectedDetail.observaciones = 'No se encontraron datos para este artículo en esta agencia.';
          this.selectedDetail.estado = 'bueno';
          this.selectedDetail.unidad = 'unidad';
        }
      });
  } else {
    if (this.selectedDetail) {
      this.selectedDetail.descripcionEspanol = '';
      this.selectedDetail.cantidadContada = 0;
      this.selectedDetail.ubicacion = '';
      this.selectedDetail.observaciones = '';
      this.selectedDetail.estado = 'bueno';
      this.selectedDetail.unidad = 'unidad';
    }
  }
}

// Nuevo método para llenar datos de una bodega específica
llenarDatosBodega(bodega: any, stockTotal?: number): void {
  if (!this.selectedDetail) return;
  console.log(bodega);
  
  this.selectedDetail.codigo = bodega.articulo;
  this.selectedDetail.descripcionEspanol = bodega.nombre;
  this.selectedDetail.cantidad = stockTotal || bodega.cantidad || 0;
  this.selectedDetail.stock = bodega.stock;
  this.selectedDetail.ubicacion = '';
  this.selectedDetail.unidad = 'unidad';
  this.selectedDetail.estado = 'bueno';
  
  // Información adicional en observaciones
  const infoAdicional = [];
  if (bodega.bodega) infoAdicional.push(`Bodega: ${bodega.bodega}`);
  if (bodega.oficinaid) infoAdicional.push(`Oficina: ${bodega.oficinaid}`);
  if (bodega.bodegaid) infoAdicional.push(`Bodega ID: ${bodega.bodegaid}`);
  
  this.selectedDetail.observaciones = '';
}

// Método para seleccionar una bodega del modal
seleccionarBodega(bodega: any): void {
  this.bodegaSeleccionada = bodega;
  this.llenarDatosBodega(bodega);
  this.closeBodegaModal();
}

// Método para cerrar el modal de selección de bodega
closeBodegaModal(): void {
  this.isModalBodegaOpen = false;
  this.bodegasDisponibles = [];
  this.bodegaSeleccionada = null;
}

  searchForDetails(term: string): void {
    if (term.length > 2) {
      this.isSearching = true;
      this.oracleService.getInventarioBasicoPorArticulo(term)
        .subscribe((data:any) => {
          this.isSearching = false;
          if (this.selectedDetail) {
            this.selectedDetail.descripcionEspanol = data.descripcionEspanol;
            this.selectedDetail.cantidad = data.cantidad;
            this.selectedDetail.ubicacion = data.ubicacion;
            this.selectedDetail.unidad = data.unidad;
            this.selectedDetail.estado = data.estado;
          }
        }, error => {
          this.isSearching = false;
          console.error('Error al buscar detalles:', error);
          if (this.selectedDetail) {
            this.selectedDetail.descripcionEspanol = 'No encontrado';
            this.selectedDetail.cantidadContada = 0;
            this.selectedDetail.ubicacion = '';
            this.selectedDetail.observaciones = 'No se encontraron datos para este artículo.';
            this.selectedDetail.estado = '';
            this.selectedDetail.unidad = '';
          }
        });
    } else {
      if (this.selectedDetail) {
        this.selectedDetail.descripcionEspanol = '';
        this.selectedDetail.cantidadContada = 0;
        this.selectedDetail.ubicacion = '';
        this.selectedDetail.observaciones = '';
        this.selectedDetail.estado = 'bueno';
        this.selectedDetail.unidad = 'unidad';
      }
    }
  }

  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.onload = (e: any) => {
          if (this.selectedDetail) {
            this.selectedDetail.photos = this.selectedDetail.photos || [];
            this.selectedDetail.photos.push({
              filepath: e.target.result,
              file: file
            });
          }
        };
        reader.readAsDataURL(file);
      }
    }
  }

  removePhoto(index: number): void {
    if (this.selectedDetail && this.selectedDetail.photos) {
      this.selectedDetail.photos.splice(index, 1);
    }
  }

  // Función para guardar el conteo con imágenes - SE MANTIENE SU LÓGICA
  guardarConteo(): void {
    // Validar que no se esté guardando ya
    if (this.isSaving) {
      console.log('Ya se está guardando un conteo...');
      return;
    }

    if (!this.selectedDetail) {
      console.error('No hay datos seleccionados para guardar.');
      alert('No hay datos seleccionados para guardar.');
      return;
    }

    // Validar campos obligatorios
    if (
      !this.selectedDetail.codigo ||
      !this.selectedDetail.descripcionEspanol ||
      this.selectedDetail.cantidadContada === null ||
      this.selectedDetail.cantidadContada === undefined ||
      !this.selectedDetail.unidad ||
      !this.selectedDetail.estado ||
      !this.selectedDetail.ubicacion ||
      !this.blId
    ) {
      console.error('Error: Campos obligatorios incompletos.');
      alert('Por favor, llena todos los campos obligatorios:\n- Código\n- Descripción\n- Cantidad Contada\n- Unidad\n- Estado\n- Ubicación');
      return;
    }

    // Activar el estado de guardado
    this.isSaving = true;

    const formData = new FormData();

    // Agregar cada campo individual del conteo al FormData
    formData.append('campanaId', '1');
    formData.append('agenciaId', this.blId?.toString() || '');
    formData.append('repuestoId', this.selectedDetail.id?.toString() || '0');
    formData.append('ubicacionFisicaId', '1');
    formData.append('CodigoInternoAgencia', this.selectedDetail.codigo || '');
    formData.append('cantidadContada', (this.selectedDetail.cantidadContada || 0).toString());
    formData.append('precioUnitario', '0');
    formData.append('valorTotal', '0');
    formData.append('EstadoProducto', this.selectedDetail.estado || 'bueno');
    formData.append('observaciones', this.selectedDetail.observaciones || '');
    formData.append('usuarioContador', this.id.toString());
    formData.append('latitud', '0');
    formData.append('longitud', '0');
    formData.append('requiereReconteo', 'false'); // Se mantiene su lógica existente
    formData.append('motivoReconteo', ''); // Se mantiene su lógica existente
    formData.append('usuarioReconteo', '');
    formData.append('cantidadReconteo', '0');
    formData.append('ubicacion', this.selectedDetail.ubicacion || '');
    formData.append('descripcion', this.selectedDetail.descripcionEspanol || '');
    formData.append('unidad', this.selectedDetail.unidad || 'unidad');

    // Agregar los archivos de imagen si existen
    if (this.selectedDetail.photos && this.selectedDetail.photos.length > 0) {
      this.selectedDetail.photos.forEach((photo: any, index: number) => {
        if (photo.file) {
          formData.append('files', photo.file, photo.file.name);
        }
      });
    }

    // Llamar al servicio para guardar el conteo
    this.inventarioService.createConteo(formData)
      .subscribe(
        response => {
          console.log('Conteo guardado con éxito:', response);
          alert('✓ Conteo guardado exitosamente');
          this.isSaving = false; // Desactivar estado de guardado
          this.closeModal();
          if (this.blId) {
            // Recargar los conteos unificados después de guardar
            this.cargarConteosRealizados(Number(this.blId));
          }
        },
        error => {
          console.error('Error al guardar el conteo:', error);
          alert('✗ Error al guardar el conteo. Por favor, intenta nuevamente.');
          this.isSaving = false; // Desactivar estado de guardado en caso de error
        }
      );
  }

  openImagesModalA(imagenes: Imagen[]): void {
    this.currentImages = imagenes;
    this.isModalOpenI = true;
  }

  openImagesModal(imagenes: Imagen[]): void {
    // Limpiamos la ruta de cada imagen antes de asignarla a la lista
    // que se mostrará en el modal.
    this.currentImages = imagenes.map(imagen => {
      // Definimos las partes de la ruta que queremos eliminar
      const unwantedPart = 'wwwroot\\uploads\\';
      
      // Si la ruta_archivo comienza con la parte no deseada, la eliminamos.
      if (imagen.ruta_archivo.startsWith(unwantedPart)) {
        imagen.ruta_archivo = imagen.ruta_archivo.substring(unwantedPart.length);
      }
      
      // También es una buena práctica reemplazar las barras invertidas por barras normales
      // para que las URLs funcionen correctamente en todos los navegadores.
      imagen.ruta_archivo = imagen.ruta_archivo.replace(/\\/g, '/');
      console.log(imagen.ruta_archivo);

      return imagen;
    });

    this.isModalOpenI = true;
  }
  
  // Método para cerrar el modal
  closeImagesModal(): void {
    this.isModalOpenI = false;
    this.currentImages = [];
  }

  goBack(): void {
    this.router.navigate(['/main/agencia']);
  }

  contarFueraDeTabla(): void {
    // Lógica para contar artículos no listados en la tabla
    this.selectedDetail = {
      id: 0,
      codigo: '',
      descripcionEspanol: '',
      cantidad: 0,
      invoice: '',
      invoiceBl: '',
      bl: '',
      cantidadContada: 0,
      observaciones: '',
      ubicacion: '',
      estado: 'bueno',
      unidad: 'unidad',
      photos: []
    };
    this.isSaving = false; // Resetear estado de guardado
    this.isModalOpen = true;
  }

  diferencia(): void {
    // Cambiar a la vista de análisis con filtro de diferencias
    this.showAnalysisView = true;
    this.filterDiferencia = 'faltante';
    this.applyFilter();
  }

  conteoCompleto(): void {
    // Cambiar a la vista de análisis completa
    this.showAnalysisView = true;
    this.filterDiferencia = 'todos';
    this.filterEstadoReconteo = 'todos';
    this.applyFilter();
  }

  // ----------------------------------------------------------------------
  // [AÑADIDO] LÓGICA DE CIERRE Y RECONTEO
  // ----------------------------------------------------------------------

  /**
   * [AÑADIDO] Lógica para finalizar el proceso de conteo de inventario para la agencia actual.
   * Marca el conteo como cerrado y dispara el ajuste de stock en el backend (ACCIÓN CRÍTICA).
   */
  finalizarConteo(): void {
    // 1. Evitar doble click y validar ID
    if (this.isFinalizing || !this.blId) {
      return;
    }

    // 2. Determinar el mensaje de confirmación y validar reconteo pendiente
    // Usamos this.conteosRealizados que contiene la lista consolidada
    const itemsConReconteo = this.conteosRealizados.filter((c: any) => c.requiere_reconteo).length;
    let confirmMessage = '';

    if (itemsConReconteo > 0) {
      // Usamos this.nombreAgencia
      confirmMessage = `ADVERTENCIA: Aún existen ${itemsConReconteo} artículos que REQUIEREN RECONTEO. ¿Desea continuar con la finalización y AJUSTE del inventario de la agencia ${this.nombreAgencia}? Esta acción es IRREVERSIBLE y ajustará los stocks del sistema.`;
    } else {
      confirmMessage = `¿Está seguro de que desea FINALIZAR y AJUSTAR el inventario de la agencia ${this.nombreAgencia}? Esta acción es IRREVERSIBLE.`;
    }

    if (!confirm(confirmMessage)) {
      return;
    }

    // 3. Ejecutar el proceso de cierre
    this.isFinalizing = true;
    const agenciaId = Number(this.blId);
    
    // NOTA: Se asume que InventarioService tiene el método `cerrarInventario(agenciaId: number)`.
    this.inventarioService.cerrarInventario(agenciaId) 
      .subscribe({
        next: (response) => {
          alert('✅ Conteo finalizado y ajustes realizados con éxito. El inventario ha sido cerrado.');
          this.isFinalizing = false;
          // Redireccionar a la lista de agencias después del cierre
          this.router.navigate(['/main/agencia']); 
        },
        error: (err) => {
          console.error('❌ Error al finalizar el conteo:', err);
          alert('❌ Error al finalizar el conteo: ' + (err.error?.message || 'Error de servidor.'));
          this.isFinalizing = false;
        }
      });
  }

  /**
   * [AÑADIDO] Prepara el modal de conteo para realizar un reconteo de un artículo específico.
   * Precarga los datos existentes para que el usuario ingrese la nueva cantidad contada.
   * @param conteo El objeto ConteoUnificadoDto del artículo a recontar (usamos 'any' por si la interfaz no coincide exactamente).
   */
  contarArticuloParaReconteo(conteo: any): void {
    // 1. Prepara el objeto selectedDetail con la información del artículo
    this.selectedDetail = {
      id: conteo.repuesto_id || 0, // ID del repuesto existente
      codigo: conteo.codigo_interno_agencia,
      descripcionEspanol: conteo.nombre_articulo,
      cantidad: conteo.stock_disponible, // Stock del sistema como referencia
      invoice: '',
      invoiceBl: '',
      bl: '',
      cantidadContada: 0, // <-- IMPORTANTE: Se inicia en 0 para forzar el nuevo conteo físico
      ubicacion: conteo.ubicaciones || '', // Usar ubicaciones del consolidado si existen
      observaciones: `RECONTEO INICIADO - Ingrese el nuevo conteo físico. (Stock Sistema: ${conteo.stock_disponible}, Cantidad Previa: ${conteo.cantidad_total})`,
      estado: conteo.estado_ult_conteo || 'bueno', 
      unidad: conteo.unidad || 'unidad', 
      photos: []
    };
    
    this.isSaving = false;
    this.isModalOpen = true;

    // Opcional: Ejecutar la búsqueda para obtener el stock más actual de Oracle
    // Usamos onCodigoChange2 que es la función que maneja la búsqueda y bodegas en su archivo.
    this.onCodigoChange2();
  }
}