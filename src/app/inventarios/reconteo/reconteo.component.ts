// reconteo.component.ts (VERSIÓN CORREGIDA Y OPTIMIZADA)
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, map } from 'rxjs/operators';
import { forkJoin, of, Observable } from 'rxjs';
import { 
  ConteosInconsistenciasResponse, 
  ImagenConteo, 
  Inconsistencia, 
  InventarioService, 
  ReconteosPendientesResponse, 
  ResumenInconsistencias 
} from 'src/app/services/inventario.service';
import { AuthService } from 'src/app/services/auth.service';
import { Usuario } from 'src/app/models/usuario';
import * as XLSX from 'xlsx';

interface ResumenReconteos {
  total_reconteos: number;
  exactos: number;
  faltantes_reconteo: number;
  sobrantes_reconteo: number;
  fuera_inventario_reconteo: number;
}

@Component({
  selector: 'app-reconteo',
  templateUrl: './reconteo.component.html',
  styleUrls: ['./reconteo.component.css']
})
export class ReconteoComponent implements OnInit {

   resumen: ResumenInconsistencias | null = null;
  resumenReconteos: ResumenReconteos | null = null; 
  agenciaId: number | null = null;
  nombreAgencia: string = 'Cargando Análisis...';
  isLoading: boolean = true;
  
  inconsistencias: Inconsistencia[] = [];
  combinedData: Inconsistencia[] = [];
  filteredInconsistencias: Inconsistencia[] = [];
  //resumen: ResumenInconsistencias | null = null;
  searchTerm: string = '';

  // Modals para imágenes
  isModalOpenI: boolean = false;
  currentImages: ImagenConteo[] = [];
  selectedArticuloName: string = '';
  selectedClasificacion: string = 'TODAS'; 
  
  // PROPIEDADES DE ESTADO Y USUARIO
  isReconteoModalOpen: boolean = false;
  selectedInconsistencia: Inconsistencia | any = null;
  cantidadReconteo: number = 0; 
  motivoReconteo: string = '';
  estadoProducto: string = ''; 
  id: number = 0;
  usuario: Usuario | null = null;
  agen: string = '';
  rol: any;
  isSubmittingReconteo: boolean = false; 
  ubicacionReconteo: string = '';
  
  errorMessage: string = '';
  allReconteos: any[] = [];

  // Opciones para el filtro de Clasificación
  clasificaciones: string[] = [
    'TODAS', 
    'FALTANTE', 
    'SOBRANTE', 
    'FUERA DE INVENTARIO', 
    'ERROR'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private reconteoService: InventarioService 
  ) { }

  ngOnInit(): void {
    // Suscribirse al usuario primero
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      if (this.usuario != null) {
        this.id = this.usuario.id;
        this.agen = this.usuario.agencia;
        this.rol = this.usuario.rol;
        if (!this.id) {
          this.router.navigate(['/login']);
        }
      }
    });

    // Luego cargar los datos de la ruta
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.agenciaId = +id;
      }
      this.unirDatos(this.agenciaId || undefined);
    });
  }
 
  ir(): void {
    this.router.navigate(['/conteo2', this.agenciaId]);
  }

  ir2(): void {
    this.router.navigate(['/alldays', this.agenciaId]);
  }

  // -----------------------------------------------------
  // 📌 MÉTODOS DE CARGA (DEVUELVEN OBSERVABLES)
  // -----------------------------------------------------

  loadReconteos(agenciaId?: number): Observable<ReconteosPendientesResponse> {
    this.errorMessage = '';
    
    return this.reconteoService.getReconteosPendientes(agenciaId).pipe(
      catchError(err => {
        this.errorMessage = 'Error al cargar los reconteos pendientes. Revise la consola para más detalles.';
        console.error('Error al obtener reconteos:', err);
        return of({ 
          agencia_filtrada: null, 
          total_pendientes: 0, 
          data: [] 
        } as ReconteosPendientesResponse); 
      })
    );
  }

  cargarInconsistencias(agenciaId?: number): Observable<ConteosInconsistenciasResponse | null> {
    return this.reconteoService.getConteosInconsistencias(agenciaId)
      .pipe(
        catchError(error => {
          console.error('❌ Error al cargar las inconsistencias:', error);
          alert('✗ Error al cargar los datos de análisis. Por favor, verifique la conexión del servicio.');
          return of(null);
        })
      );
  }



  // ... resto del código ...

  // NUEVO MÉTODO: Calcular resumen de reconteos
  calcularResumenReconteos(): void {
    if (!this.combinedData || this.combinedData.length === 0) {
      this.resumenReconteos = null;
      return;
    }

    let totalReconteos = 0;
    let exactos = 0;
    let faltantesReconteo = 0;
    let sobrantesReconteo = 0;
    let fueraInventarioReconteo = 0;

    this.combinedData.forEach(item => {
      const reconteoData = this.getReconteoData(item);
      
      // Solo contar items que tienen reconteo registrado
      if (reconteoData.cantidad !== null) {
  
} else {
  totalReconteos++;

  if (item.clasificacion?.toUpperCase() === 'FUERA DE INVENTARIO') {
    fueraInventarioReconteo++;}
  else if (item.clasificacion?.toUpperCase() === 'FALTANTE') {
    faltantesReconteo++;
  } else if (item.clasificacion?.toUpperCase() === 'EXACTO') {
    exactos++;
  } else if (item.clasificacion?.toUpperCase() === 'SOBRANTE') {
    sobrantesReconteo++;
  }
}
    });

    this.resumenReconteos = {
      total_reconteos: totalReconteos,
      exactos: exactos,
      faltantes_reconteo: faltantesReconteo,
      sobrantes_reconteo: sobrantesReconteo,
      fuera_inventario_reconteo: fueraInventarioReconteo
    };
  }

  // MODIFICAR el método unirDatos para calcular el resumen
  unirDatos(agenciaId?: number): void {
    this.isLoading = true;

    forkJoin({
      reconteos: this.loadReconteos(agenciaId),
      inconsistencias: this.cargarInconsistencias(agenciaId)
    }).pipe(
      map(results => {
        const inconsistenciasResponse = results.inconsistencias;
        this.allReconteos = results.reconteos.data || [];

        if (!inconsistenciasResponse || !inconsistenciasResponse.datos) {
          this.inconsistencias = [];
          return []; 
        }
        
        this.resumen = inconsistenciasResponse.resumen;
        this.inconsistencias = inconsistenciasResponse.datos;

        const reconteosMap = new Map<string, any>();
        this.allReconteos.forEach(item => {
          if (item.codigo_articulo) {
            reconteosMap.set(item.codigo_articulo, item);
          }
        });

        const datosFusionados = this.inconsistencias.map(inconsistenciaItem => {
          const codigo = inconsistenciaItem.codigo_articulo; 
          const reconteoMatch = codigo ? reconteosMap.get(codigo) : undefined;
          
          if (reconteoMatch) {
            return {
              ...inconsistenciaItem,
              ...reconteoMatch
            } as Inconsistencia; 
          }
          
          return inconsistenciaItem; 
        });
        
        return datosFusionados;
      }),
      finalize(() => this.isLoading = false)
    )
    .subscribe({
      next: (datosUnidos: Inconsistencia[]) => {
        this.combinedData = datosUnidos;
        this.calcularResumenReconteos(); // CALCULAR RESUMEN DE RECONTEOS
        this.applyFilter();
        
        if (agenciaId && this.inconsistencias.length > 0 && this.inconsistencias[0].nombre_agencia) {
          this.nombreAgencia = `Análisis de Inconsistencias: ${this.inconsistencias[0].nombre_agencia}`;
        } else if (!agenciaId) {
          this.nombreAgencia = 'Análisis de Inconsistencias (General)';
        }
      },
      error: (error) => {
        console.error('❌ Error fatal al combinar datos:', error);
        this.inconsistencias = [];
        this.filteredInconsistencias = [];
        this.resumen = null;
        this.resumenReconteos = null;
      }
    });
  }

  applyFilter(): void {
    let filteredByClasificacion: Inconsistencia[] = [...this.combinedData]; 

    // 1. Filtrar por Clasificación
    if (this.selectedClasificacion && this.selectedClasificacion !== 'TODAS') {
      filteredByClasificacion = filteredByClasificacion.filter(item =>
        item.clasificacion === this.selectedClasificacion
      );
    }
    
    // 2. Aplicar filtro de búsqueda de texto
    if (!this.searchTerm) {
      this.filteredInconsistencias = filteredByClasificacion;
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredInconsistencias = filteredByClasificacion.filter(item =>
      item.codigo_articulo?.toLowerCase().includes(term) ||
      item.nombre_articulo?.toLowerCase().includes(term) ||
      item.clasificacion.toLowerCase().includes(term) ||
      item.ubicaciones_conteo?.toLowerCase().includes(term)
    );
  }

  // --- Lógica de Modals y Visualización ---

  openImagesModal(inconsistencia: Inconsistencia): void {
    this.currentImages = inconsistencia.imagenes;
    this.selectedArticuloName = `${inconsistencia.codigo_articulo} - ${inconsistencia.nombre_articulo}`;
    this.isModalOpenI = true;
  }

  closeImagesModal(): void {
    this.isModalOpenI = false;
    this.currentImages = [];
    this.selectedArticuloName = '';
  }

  // Lógica para abrir el modal de Reconteo
  iniciarReconteo(inconsistencia: Inconsistencia): void {
    if (!inconsistencia) {
      alert('❌ Error: No se pudo cargar la información del artículo.');
      return;
    }

    this.selectedInconsistencia = { ...inconsistencia };
    this.cantidadReconteo = inconsistencia.cantidad_contada || 0;
    this.motivoReconteo = '';
    this.estadoProducto = '';
    this.ubicacionReconteo = inconsistencia.ubicaciones_conteo || '';
    this.isSubmittingReconteo = false;
    this.isReconteoModalOpen = true;
  }

  closeReconteoModal(): void {
    this.isReconteoModalOpen = false;
    this.selectedInconsistencia = null;
    this.cantidadReconteo = 0;
    this.motivoReconteo = '';
    this.estadoProducto = '';
    this.ubicacionReconteo = '';
    this.isSubmittingReconteo = false;
  }

  // Validación del formulario
  isReconteoFormValid(): boolean {
    if (!this.selectedInconsistencia) {
      return false;
    }

    const cantidad = Number(this.cantidadReconteo);
    const cantidadValida = !isNaN(cantidad) && cantidad >= 0;
    const estadoValido = !!this.estadoProducto && this.estadoProducto.trim().length > 0;
    const ubicacionValida = !!this.ubicacionReconteo && this.ubicacionReconteo.trim().length > 0;
    const motivoValido = !!this.motivoReconteo && this.motivoReconteo.trim().length > 0;
    
    return cantidadValida && estadoValido && ubicacionValida && motivoValido && !this.isSubmittingReconteo;
  }

  // Función para enviar el reconteo
  guardarReconteo(): void {
    if (!this.isReconteoFormValid()) {
      alert('⚠️ Por favor complete todos los campos requeridos correctamente.');
      return;
    }

    const item = this.selectedInconsistencia;
    const cantidadNumero = Number(this.cantidadReconteo);
    
    // Verificar que tengamos el campana_id
    item.campana_id=1;
    item.repuesto_id=1;
    
    const confirmMsg = `¿Confirmar el registro de reconteo?\n\n` +
      `Artículo: ${item.nombre_articulo}\n` +
      `Cantidad Nueva: ${cantidadNumero}\n` +
      `Estado: ${this.estadoProducto}\n` +
      `Ubicación: ${this.ubicacionReconteo}`;
    
    if (!confirm(confirmMsg)) {
      return;
    }
    
    const formData = new FormData();
    
    // ID de Campaña (CRÍTICO)
    const campanaId = item.campana_id || item.id_campana;
    formData.append('CampanaId', campanaId.toString());
    formData.append('RepuestoId', item.repuesto_id);
    
    // Campos básicos
    formData.append('Descripcion', item.nombre_articulo || 'Artículo sin descripción');
    formData.append('Ubicacion', this.ubicacionReconteo.trim());
    formData.append('EstadoProducto', this.estadoProducto.trim().toUpperCase());
    formData.append('CodigoArticulo', item.codigo_articulo || '');
    
    // Cantidades
    formData.append('CantidadReconteo', cantidadNumero.toString());
    formData.append('CantidadOriginal', (item.cantidad_contada || 0).toString());
    formData.append('CantidadSistema', (item.cantidad_sistema || 0).toString());
    
    // Campos requeridos
    formData.append('Unidad', item.unidad || 'UND');
    formData.append('Observaciones', this.motivoReconteo.trim());
    formData.append('MotivoReconteo', this.motivoReconteo.trim());
    
    // Usuarios
    formData.append('UsuarioId', this.id.toString());
    formData.append('UsuarioContador', this.id.toString());
    formData.append('UsuarioReconteo', this.id.toString());
    
    // Agencia
    formData.append('AgenciaId', (this.agenciaId || 0).toString());
    formData.append('CodigoInternoAgencia', item.codigo_articulo);
    
    // Campos adicionales opcionales
    formData.append('StockReservado', (item.stock_reservado || 0).toString());
    formData.append('StockDisponible', (item.stock_disponible || 0).toString());
    formData.append('Clasificacion', item.clasificacion || '');
    formData.append('DiferenciaOriginal', (item.diferencia || 0).toString());
    formData.append('CostoPromedio', (item.costo_promedio || 0).toString());
    formData.append('ImpactoFinanciero', (item.impacto_financiero || 0).toString());
    
    // Si existe conteo_id, incluirlo
    if (item.conteo_id) {
      formData.append('ConteoId', item.conteo_id.toString());
    }

    this.isSubmittingReconteo = true;
    
    // Log para debug
    console.log('📤 Enviando reconteo con datos:', {
      campanaId: campanaId,
      codigoArticulo: item.codigo_articulo,
      cantidadReconteo: cantidadNumero,
      agenciaId: this.agenciaId,
      usuarioId: this.id
    });
    
    this.reconteoService.createReconteo(formData).subscribe({
      next: (response) => {
        console.log('✅ Respuesta del servidor:', response);
        alert('✅ RECONTEO GUARDADO EXITOSAMENTE');
        this.closeReconteoModal();
        this.unirDatos(this.agenciaId || undefined);
      },
      error: (err) => {
        console.error('❌ Error completo al guardar reconteo:', err);
        console.error('❌ Detalles del error:', err.error);
        
        let errorMsg = '❌ ERROR AL GUARDAR EL RECONTEO\n\n';
        
        if (err.error && err.error.errors) {
          errorMsg += 'Campos con errores:\n';
          Object.keys(err.error.errors).forEach(key => {
            errorMsg += `- ${key}: ${err.error.errors[key].join(', ')}\n`;
          });
        } else if (err.error && err.error.message) {
          errorMsg += err.error.message;
        } else if (err.message) {
          errorMsg += err.message;
        } else {
          errorMsg += 'Consulte la consola para más detalles.';
        }
        
        alert(errorMsg);
        this.isSubmittingReconteo = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/conteoallagen']);
  }

  getPrioridadClass(prioridad: string | null): string {
    if (!prioridad) return 'prioridad-ninguna';
    const prioridadUpper = prioridad.toUpperCase();
    if (prioridadUpper.includes('CRÍTICA') || prioridadUpper.includes('CRITICA')) return 'prioridad-critica';
    if (prioridadUpper.includes('ALTA')) return 'prioridad-alta';
    if (prioridadUpper.includes('MEDIA')) return 'prioridad-media';
    if (prioridadUpper.includes('BAJA')) return 'prioridad-baja';
    return 'prioridad-ninguna';
  }

  getClasificacionClass(clasificacion: string): string {
    if (!clasificacion) return '';
    switch (clasificacion.toUpperCase()) {
      case 'FALTANTE': return 'clasificacion-faltante';
      case 'SOBRANTE': return 'clasificacion-sobrante';
      case 'FUERA DE INVENTARIO': return 'clasificacion-fuera';
      case 'ERROR': return 'clasificacion-error';
      default: return '';
    }
  }

  getNuevaDiferencia(): number {
    if (!this.selectedInconsistencia || this.cantidadReconteo === null) {
      return 0;
    }
    const cantidad = Number(this.cantidadReconteo);
    if (isNaN(cantidad)) {
      return 0;
    }
    return cantidad - (this.selectedInconsistencia.stock_disponible || 0);
  }

  /**
   * Método helper para acceder a datos de reconteo de forma segura
   * @param item Inconsistencia
   * @returns Objeto con datos de reconteo o valores vacíos
   */
  getReconteoData(item: Inconsistencia): { cantidad: number | null; usuario: string } {
    const itemAny = item as any;
    return {
      cantidad: itemAny.cantidad_reconteo !== undefined && itemAny.cantidad_reconteo !== null 
        ? itemAny.cantidad_reconteo 
        : null,
      usuario: itemAny.usuario_reconteo_nombre || itemAny.usuario_reconteo || ''
    };
  }
  
  /**
   * Exporta los datos filtrados a un archivo Excel (.xlsx)
   */
  exportar(): void {
    if (this.filteredInconsistencias.length === 0) {
      alert('No hay inconsistencias filtradas para exportar.');
      return;
    }

    const dataForExport = this.filteredInconsistencias.map((item, index) => ({
      'Item': index + 1,
      'Código de Artículo': item.codigo_articulo || 'N/A',
      'Descripción': item.nombre_articulo || 'Sin Nombre',
      'Cantidad Contada': item.cantidad_contada || 0,
      'Cantidad Sistema': item.cantidad_sistema || 0,
      'Stock Reservado': item.stock_reservado || 0,
      'Stock Disponible': item.stock_disponible || 0,
      'Diferencia': item.diferencia || 0,
      'Clasificación': item.clasificacion || 'N/A',
      'Costo Promedio': item.costo_promedio || 0,
      'Impacto Financiero': item.impacto_financiero || 0,
      'Ubicación': item.ubicaciones_conteo || 'N/A',
      'Cant. Reconteo': (item as any).cantidad_reconteo !== undefined && (item as any).cantidad_reconteo !== null 
  ? (item as any).cantidad_reconteo 
  : '',
      'Usuario Reconteo': (item as any).usuario_reconteo_nombre || '',
      'Estado Reconteo': (item as any).estado_producto || ''
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataForExport);
    
    const wscols = [
      { wch: 8 }, { wch: 18 }, { wch: 40 }, { wch: 12 }, { wch: 12 }, 
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 15 },
      { wch: 18 }, { wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 15 }
    ];
    ws['!cols'] = wscols;

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inconsistencias');

    const agencyNameClean = this.nombreAgencia
      .replace(/Análisis de Inconsistencias: /g, '')
      .replace(/Análisis de Inconsistencias \(General\)/g, 'General')
      .trim();
      
    const fileName = `Analisis_Inconsistencias_${agencyNameClean}_${new Date().toISOString().substring(0, 10)}.xlsx`;

    XLSX.writeFile(wb, fileName);
  }
}