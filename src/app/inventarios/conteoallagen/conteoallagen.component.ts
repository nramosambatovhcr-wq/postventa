// conteoallagen.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { InventarioService, ConteoInventarioDto, ImagenesConteoDto, CampanaInventarioDto, ConteoUnificadoDto, TotalItemsDto, RepuestoReservadoDto, ConteoUnificadoResponse } from '../../services/inventario.service';
import { catchError } from 'rxjs/operators';
import { of, Observable } from 'rxjs';
import { OracleService, InventarioBasicoModel } from '../../services/oracle.service';
import { AuthService } from 'src/app/services/auth.service';
import { Usuario } from 'src/app/models/usuario';
import * as XLSX from 'xlsx'; 
 

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
  selector: 'app-conteoallagen',
  templateUrl: './conteoallagen.component.html',
  styleUrls: ['./conteoallagen.component.css']
})
export class ConteoallagenComponent implements OnInit { 

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
   nombreAgencia: string='Conteo Total de Agencias'; // Nombre modificado para reflejar todas las agencias
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
            // El blId puede ser el ID del usuario o un ID de agencia inicial.
            // Usaremos el ID de la agencia si está en la ruta, sino asumimos un ID por defecto (ej: 1) o el ID del usuario.
            // Para 'ConteoAllAgen' asumiremos que el parámetro 'id' se sigue usando como filtro si existe, o se usa 1 si es necesario para el endpoint.
            this.blId = params.get('id');
            const agenciaIdToLoad = this.blId ? Number(this.blId) : 1; // Usamos 1 como fallback si no hay ID
            
            this.cargarConteosRealizados(agenciaIdToLoad); // Cargar conteos unificados usando la función All
            this.cargarCampanaPorId(1); 
             
          });
        }
        else{
          this.router.navigate(['/login']);
        }
      }
    });
  }
  
  // FUNCIONES DE SOPORTE (Copiadas de invbodage.component.ts)

  // Función modificada para usar getsUnificadosPorAgenciaAll
  cargarConteosRealizados(agenciaId: number): void {
    this.isLoading = true;
    this.errorMessage = null;

    // MODIFICACIÓN CRÍTICA: USAR LA FUNCIÓN DEL USUARIO
    this.inventarioService.getsUnificadosPorAgenciaAll(agenciaId) //
      .pipe(
        catchError(error => {
          console.error('Error al cargar los conteos unificados de todas las agencias:', error);
          this.errorMessage = 'No se pudo cargar el conteo de todas las agencias.';
          this.isLoading = false;
          return of({ datos: [] } as ConteoUnificadoResponse); // Retorna un observable de una respuesta vacía
        })
      )
      .subscribe((response: ConteoUnificadoResponse) => {
        // Asumiendo que ConteoUnificadoResponse tiene una propiedad 'datos' que es el array
        if (response && response.datos) {
          this.conteosRealizados = response.datos;
        } else if (Array.isArray(response)) {
          // Si la respuesta es directamente el array de conteos
          this.conteosRealizados = response;
        } else {
           // Manejar caso donde la respuesta no es la esperada (ej. si es un objeto con otra estructura)
           console.warn('Estructura de respuesta inesperada:', response);
           this.conteosRealizados = [];
        }

        this.conteosFiltered = [...this.conteosRealizados];
        console.log('Conteos unificados de TODAS las agencias cargados:', this.conteosRealizados.length);
        this.isLoading = false;
    });
  }

  // Se dejan solo los métodos esenciales y aquellos usados en el HTML que se copiará
  // Se omiten getAgencias, cargarTotalItems, cargarInventarioReservado por ser específicos de una agencia

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
          this.campanaActual = campana;
        } else {
          this.campanaActual = null;
        }
    });
  }

  // Métodos de navegación
  goBack(): void {
    this.router.navigate(['/']); // Navegar a la ruta principal o a la ruta deseada
  }
  
  usercont(): void {
     this.router.navigate(['/ranking', this.blId]);
  }
  
  // Métodos de vista y filtro (Se copia el resto del archivo TS original para mantener funcionalidad)
  // ... (applyFilter, toggleView, getStats, getDiferenciaColor, getTipoDiferenciaBadge, getTipoDiferenciaText, formatCurrency, contarFueraDeTabla, diferencia, conteoCompleto, finalizarConteo, openModal, closeModal, openImagesModal, closeImagesModal, contarArticuloParaReconteo, canClickReservados, goToReservadosDetail, openBodegaModal, closeBodegaModal, selectBodega) ...

  applyFilter(): void {
    const term = this.searchTerm.toLowerCase();
    if (this.showAnalysisView) {
      // Filtrado para la vista de análisis
      this.conteosFiltered = this.conteosRealizados.filter(conteo => {
        const matchSearch = !term || conteo.codigo_interno_agencia.toLowerCase().includes(term) || (conteo.nombre_articulo && conteo.nombre_articulo.toLowerCase().includes(term));
        const matchDiferencia = this.filterDiferencia === 'todos' || (this.filterDiferencia === 'sobrante' && conteo.diferencia_stock > 0) || (this.filterDiferencia === 'faltante' && conteo.diferencia_stock < 0) || (this.filterDiferencia === 'exacto' && conteo.diferencia_stock === 0);
        const matchReconteo = this.filterEstadoReconteo === 'todos' || (this.filterEstadoReconteo === 'reconteo' && conteo.requiere_reconteo) || (this.filterEstadoReconteo === 'ok' && !conteo.requiere_reconteo);
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

// conteoallagen.component.ts





exportToexcel(): void { 
    if (!this.conteosFiltered || this.conteosFiltered.length === 0) {
        alert('No hay datos para exportar en la vista de Análisis.');
        return;
    }

    // 1. Definir la estructura de la cabecera y el mapeo de campos.
    // Usamos el mismo orden que en la tabla para los títulos.
    const headerTitles = [
        'CÓDIGO',
        'ARTÍCULO',
        'DESCRIPCION',
        'CANT. FÍSICA',
        'STOCK SISTEMA',
        'STOCK DISPONIBLE',
        'STOCK RESERVADO',
        'DIFERENCIA',
        'TIPO DIFERENCIA',
        'COSTO PROMEDIO',
        'VALOR TOTAL (Costo * Stock)',
        'ESTADO CONTEO',
        'UBICACIONES',
        'USUARIO ÚLTIMO CONTEO',
        'FECHA ÚLTIMO CONTEO'
    ];

    // 2. Mapear y transformar los datos
    const dataForExport = this.conteosFiltered.map(item => {
        const valorTotal = (item.costo_promedio * item.diferencia_stock) || 0;
        const estadoConteo = item.requiere_reconteo ? 'Reconteo' : 'Finalizado';
        const tipoDiferencia = this.getTipoDiferenciaText(item.diferencia_stock);

        return {
            'CÓDIGO': item.codigo_interno_agencia,
            'ARTÍCULO': item.descripcion,
            'DESCRIPCION': item.nombre_articulo,
            'CANT. FÍSICA': item.cantidad_contada,
            'STOCK SISTEMA': item.stock_sistema,
            'STOCK DISPONIBLE': item.stock_sistema_disponible,
            'STOCK RESERVADO': item.stock_reservado,
            'DIFERENCIA': item.diferencia_stock,
            'TIPO DIFERENCIA': tipoDiferencia,
            'COSTO PROMEDIO': item.costo_promedio,
            'VALOR TOTAL (Costo * Stock)': valorTotal,
            'ESTADO CONTEO': estadoConteo,
            'UBICACIONES': item.ubicaciones || 'N/A',
            'USUARIO ÚLTIMO CONTEO': item.usuario_ult_conteo_nombre || 'N/A',
            'FECHA ÚLTIMO CONTEO': new Date(item.ultima_fecha_conteo).toLocaleString()
        };
    });

    // 3. Crear la hoja de trabajo (Worksheet) a partir del array de datos
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataForExport);
    
    // Opcional: Asegurar que los encabezados sean los definidos (aunque json_to_sheet lo hace bien si los objetos son consistentes)
    XLSX.utils.sheet_add_aoa(ws, [headerTitles], { origin: 'A1' });

    // 4. Crear el libro de trabajo (Workbook) y agregar la hoja
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ConteoAnalisis'); // 'ConteoAnalisis' es el nombre de la pestaña

    // 5. Generar el archivo Excel y forzar la descarga
    const today = new Date().toISOString().slice(0, 10);
    const fileName = `ConteoTotalAgencias_Analisis_${today}.xlsx`;
    XLSX.writeFile(wb, fileName);

    console.log(`Datos exportados a ${fileName}`);
}

  // En conteoallagen.component.ts, dentro de la clase ConteoallagenComponent

// ... (resto de métodos y propiedades)

/**
 * Guarda o actualiza un registro de conteo o reconteo para un artículo.
 * Esta función debe estar enlazada al formulario del modal en el HTML.
 */
saveConteo(): void {
  // 1. Validaciones básicas
  if (!this.selectedDetail || this.selectedDetail.cantidadContada === undefined || this.selectedDetail.cantidadContada < 0) {
    alert('Por favor, ingrese una cantidad contada válida.');
    return;
  }
  
  if (!this.usuario || !this.blId) {
    alert('Error: Datos de usuario o ID de agencia no disponibles.');
    return;
  }

  this.isSaving = true; // Activar el spinner de guardado

  // 2. Construir el objeto de datos para la API
  
}

  toggleView(): void {
    this.showAnalysisView = !this.showAnalysisView;
    this.applyFilter(); // Aplicar el filtro nuevamente al cambiar de vista
  }

  getStats(): { total: number, conReconteo: number, exactos: number, sobrantes: number, faltantes: number } {
    if (!this.conteosRealizados || this.conteosRealizados.length === 0) {
      return { total: 0, conReconteo: 0, exactos: 0, sobrantes: 0, faltantes: 0 };
    }

    const stats = {
      total: this.conteosRealizados.length,
      conReconteo: this.conteosRealizados.filter(c => c.requiere_reconteo).length,
      exactos: this.conteosRealizados.filter(c => c.diferencia_stock === 0).length,
      sobrantes: this.conteosRealizados.filter(c => c.diferencia_stock > 0).length,
      faltantes: this.conteosRealizados.filter(c => c.diferencia_stock < 0).length,
    };
    
    return stats;
  }

  getDiferenciaColor(diferencia: number): string {
    if (diferencia > 0) return 'text-success'; // Sobrante
    if (diferencia < 0) return 'text-danger'; // Faltante
    return 'text-muted'; // Exacto (0)
  }

  getDiferenciaIcon(diferencia: number): string {
    if (diferencia > 0) return '↑';
    if (diferencia < 0) return '↓';
    return '=';
  }

  getTipoDiferenciaBadge(diferencia: number): string {
    if (diferencia > 0) return 'badge-sobrante';
    if (diferencia < 0) return 'badge-faltante';
    return 'badge-exacto';
  }

  getTipoDiferenciaText(diferencia: number): string {
    if (diferencia > 0) return 'Sobrante';
    if (diferencia < 0) return 'Faltante';
    return 'Exacto';
  }

  formatCurrency(value: number | undefined): string {
    if (value === undefined) return '$0.00';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 2,
    }).format(value);
  }

  // Métodos placeholder para el HTML
  contarFueraDeTabla(): void { console.log('Contar Fuera de Tabla clickeado'); }
  diferencia(): void { console.log('Diferencia clickeado'); }
  conteoCompleto(): void { console.log('Conteo Completo clickeado'); }
  finalizarConteo(): void { 
    this.isFinalizing = true;
    console.log('Finalizar Conteo clickeado');
    // Implementación real de la API de finalización
    setTimeout(() => this.isFinalizing = false, 2000); // Simulación
  }
  exportToCSV(): void { console.log('Exportar a CSV clickeado'); }
  canClickReservados(): void { console.log('canClickReservados clickeado'); }
  openImagesModal(imagenes: Imagen[]): void {
    this.currentImages = imagenes;
    this.isModalOpenI = true;
  }
  closeImagesModal(): void { this.isModalOpenI = false; }
  openModal(item: any): void {
    this.selectedDetail = item;
    this.isModalOpen = true;
  }
  closeModal(): void { this.isModalOpen = false; }
  contarArticuloParaReconteo(conteo: any): void {
    console.log('Contar Artículo para Reconteo clickeado', conteo);
  }

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

}