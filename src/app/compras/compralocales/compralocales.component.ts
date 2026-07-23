import { Component, OnInit, OnDestroy } from '@angular/core';
import { ComprasService, CompraDetalle, FiltrosCompras } from '../../services/compras.service';
import * as XLSX from 'xlsx';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

interface EstadisticasCompras {
  totalRegistros: number;
  totalCompras: number;
  totalArticulos: number;
}

@Component({
  selector: 'app-compralocales',
  templateUrl: './compralocales.component.html',
  styleUrls: ['./compralocales.component.css']
})

export class CompralocalesComponent implements OnInit, OnDestroy {
  // Datos
  compras: CompraDetalle[] = [];
  comprasFiltradas: CompraDetalle[] = [];
  
  // Estados
  loading = false;
  error: string | null = null;
  
  // Filtros
  usuarioBusqueda = 'JCATOTA';
  filtroProveedor = '';
  filtroArticulo = '';
  filtroNumero = '';
  filtroFechaDesde: Date | null = null;
  filtroFechaHasta: Date | null = null;
  
  // Paginación
  paginaActual = 1;
  itemsPorPagina = 500;
  
  // Ordenamiento
  columnaOrden: 'fechaEmision' | 'proveedor' | 'numero' | 'articulo' | 'cantidad' | 'valor' = 'fechaEmision';
  ordenAscendente = false;
  
  // Modal detalle
  mostrarDetalleModal = false;
  compraSeleccionada: CompraDetalle | any;

  // Estadísticas (calculadas una vez)
  estadisticas: EstadisticasCompras = {
    totalRegistros: 0,
    totalCompras: 0,
    totalArticulos: 0
  };

  // Utilidades
  readonly Math = Math;
  
  // Subjects para manejar subscripciones
  private destroy$ = new Subject<void>();
  private filtroChange$ = new Subject<void>();

  constructor(private comprasService: ComprasService) { }

  ngOnInit(): void {
    this.cargarCompras();
    this.setupFiltroDebounce();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Configura debounce para los filtros (evita múltiples llamadas)
   */
  private setupFiltroDebounce(): void {
    this.filtroChange$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.aplicarFiltrosInterno();
      });
  }

  /**
   * Carga las compras del usuario
   */
  cargarCompras(): void {
    if (!this.usuarioBusqueda?.trim()) {
      this.error = 'Por favor ingrese un usuario válido';
      return;
    }

    this.loading = true;
    this.error = null;

    this.comprasService.getComprasPorUsuario(this.usuarioBusqueda.trim())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.compras = response.data || [];
          this.aplicarFiltros();
          this.loading = false;
          console.log(`✓ Compras cargadas: ${response.total}`);
        },
        error: (err) => {
          this.error = 'Error al cargar las compras. Por favor, intente nuevamente.';
          console.error('Error al cargar compras:', err);
          this.loading = false;
          this.compras = [];
          this.comprasFiltradas = [];
          this.calcularEstadisticas();
        }
      });
  }

  /**
   * Busca compras por usuario
   */
  buscarPorUsuario(): void {
    const usuario = this.usuarioBusqueda?.trim();
    
    if (!usuario) {
      this.error = 'Por favor ingrese un usuario';
      return;
    }

    if (usuario.length < 3) {
      this.error = 'El usuario debe tener al menos 3 caracteres';
      return;
    }

    this.cargarCompras();
  }

  /**
   * Aplica los filtros (con debounce)
   */
  aplicarFiltros(): void {
    this.filtroChange$.next();
  }

  /**
   * Aplica filtros internamente
   */
  private aplicarFiltrosInterno(): void {
    this.comprasFiltradas = this.compras.filter(compra => {
      // Filtro por proveedor
      const cumpleFiltroProveedor = !this.filtroProveedor || 
        this.normalizarTexto(compra.proveedorNombre).includes(
          this.normalizarTexto(this.filtroProveedor)
        );
      
      // Filtro por artículo
      const cumpleFiltroArticulo = !this.filtroArticulo || 
        this.normalizarTexto(compra.articuloNombre).includes(
          this.normalizarTexto(this.filtroArticulo)
        ) ||
        this.normalizarTexto(compra.descripcion).includes(
          this.normalizarTexto(this.filtroArticulo)
        );
      
      // Filtro por número/serie
      const cumpleFiltroNumero = !this.filtroNumero || 
        this.normalizarTexto(compra.numero).includes(
          this.normalizarTexto(this.filtroNumero)
        ) ||
        this.normalizarTexto(compra.serie).includes(
          this.normalizarTexto(this.filtroNumero)
        );
      
      // Filtro por fecha desde
      let cumpleFiltroFechaDesde = true;
      if (this.filtroFechaDesde && compra.fechaEmision) {
        const fechaCompra = new Date(compra.fechaEmision);
        fechaCompra.setHours(0, 0, 0, 0);
        const fechaDesde = new Date(this.filtroFechaDesde);
        fechaDesde.setHours(0, 0, 0, 0);
        cumpleFiltroFechaDesde = fechaCompra >= fechaDesde;
      }
      
      // Filtro por fecha hasta
      let cumpleFiltroFechaHasta = true;
      if (this.filtroFechaHasta && compra.fechaEmision) {
        const fechaCompra = new Date(compra.fechaEmision);
        fechaCompra.setHours(0, 0, 0, 0);
        const fechaHasta = new Date(this.filtroFechaHasta);
        fechaHasta.setHours(0, 0, 0, 0);
        cumpleFiltroFechaHasta = fechaCompra <= fechaHasta;
      }
      
      return cumpleFiltroProveedor && 
             cumpleFiltroArticulo && 
             cumpleFiltroNumero && 
             cumpleFiltroFechaDesde && 
             cumpleFiltroFechaHasta;
    });
    
    this.paginaActual = 1;
    this.calcularEstadisticas();
  }

  /**
   * Normaliza texto para búsqueda (sin acentos, lowercase)
   */
  private normalizarTexto(texto: string | undefined): string {
    if (!texto) return '';
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Limpia todos los filtros
   */
  limpiarFiltros(): void {
    this.filtroProveedor = '';
    this.filtroArticulo = '';
    this.filtroNumero = '';
    this.filtroFechaDesde = null;
    this.filtroFechaHasta = null;
    this.aplicarFiltros();
  }

  /**
   * Ordena por columna
   */
  ordenarPor(columna: typeof this.columnaOrden): void {
    if (this.columnaOrden === columna) {
      this.ordenAscendente = !this.ordenAscendente;
    } else {
      this.columnaOrden = columna;
      this.ordenAscendente = true;
    }
    
    this.comprasFiltradas.sort((a, b) => {
      const valorA = this.obtenerValorOrden(a, columna);
      const valorB = this.obtenerValorOrden(b, columna);
      
      if (valorA < valorB) return this.ordenAscendente ? -1 : 1;
      if (valorA > valorB) return this.ordenAscendente ? 1 : -1;
      return 0;
    });
  }

  /**
   * Obtiene el valor para ordenar según la columna
   */
  private obtenerValorOrden(compra: CompraDetalle, columna: string): any {
    switch(columna) {
      case 'fechaEmision':
        return compra.fechaEmision ? new Date(compra.fechaEmision).getTime() : 0;
      case 'proveedor':
        return compra.proveedorNombre || '';
      case 'numero':
        return compra.numero || '';
      case 'articulo':
        return compra.articuloNombre || '';
      case 'cantidad':
        return compra.cantidad || 0;
      case 'valor':
        return compra.valor || 0;
      default:
        return '';
    }
  }

  /**
   * Calcula estadísticas de las compras filtradas
   */
  private calcularEstadisticas(): void {
    this.estadisticas = {
      totalRegistros: this.comprasFiltradas.length,
      totalCompras: this.comprasFiltradas.reduce((sum, c) => sum + (c.valor || 0), 0),
      totalArticulos: this.comprasFiltradas.reduce((sum, c) => sum + (c.cantidad || 0), 0)
    };
  }

  /**
   * Obtiene las compras de la página actual
   */
  get comprasPaginadas(): CompraDetalle[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    return this.comprasFiltradas.slice(inicio, fin);
  }

  /**
   * Calcula el total de páginas
   */
  get totalPaginas(): number {
    return Math.ceil(this.comprasFiltradas.length / this.itemsPorPagina);
  }

  /**
   * Cambia de página
   */
  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
      // Scroll al inicio de la tabla
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * Genera array de números de página para mostrar
   */
  get paginasArray(): number[] {
    const paginas: number[] = [];
    const maxPaginas = 5;
    let inicio = Math.max(1, this.paginaActual - Math.floor(maxPaginas / 2));
    let fin = Math.min(this.totalPaginas, inicio + maxPaginas - 1);
    
    // Ajustar inicio si estamos cerca del final
    if (fin - inicio < maxPaginas - 1) {
      inicio = Math.max(1, fin - maxPaginas + 1);
    }
    
    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }
    
    return paginas;
  }

  /**
   * Muestra el modal de detalle
   */
  verDetalle(compra: CompraDetalle): void {
    this.compraSeleccionada = compra;
    this.mostrarDetalleModal = true;
    document.body.style.overflow = 'hidden'; // Prevenir scroll
  }

  /**
   * Cierra el modal de detalle
   */
  cerrarDetalle(): void {
    this.mostrarDetalleModal = false;
    this.compraSeleccionada = null;
    document.body.style.overflow = ''; // Restaurar scroll
  }

  /**
   * Formatea una fecha
   */
  formatearFecha(fecha: Date | undefined): string {
    if (!fecha) return 'N/A';
    
    try {
      return new Date(fecha).toLocaleDateString('es-EC', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  /**
   * Formatea un valor como moneda
   */
  formatearMoneda(valor: number | undefined | null): string {
    if (valor === undefined || valor === null || isNaN(valor)) return '$0.00';
    
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valor);
  }

  /**
   * Exporta los datos a Excel
   */
  exportarExcel(): void {
    if (this.comprasFiltradas.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    try {
      // Datos principales
      const datosExportar = this.comprasFiltradas.map(compra => ({
        'Fecha Emisión': this.formatearFecha(compra.fechaEmision),
        'Serie': compra.serie || '',
        'Número': compra.numero || '',
        'Proveedor': compra.proveedorNombre || '',
        'Ciudad': compra.proveedorCiudad || '',
        'RUC': compra.provCeduruc || '',
        'Artículo': compra.articulo || '',
        'Descripción': compra.articuloNombre || '',
        'Clase': compra.artlClase || '',
        'Grupo': compra.grarCodigrup || '',
        'Cantidad': compra.cantidad || 0,
        'Precio Unitario': compra.precioUnitario || 0,
        'Costo Unitario': compra.costoUnitario || 0,
        'Valor Total': compra.valor || 0,
        'Entrada/Salida': compra.entrSali || '',
        'Fecha Creación': this.formatearFecha(compra.fechaCreacion)
      }));

      const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosExportar);

      // Configurar anchos de columna
      const columnWidths = [
        { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 30 }, { wch: 15 },
        { wch: 15 }, { wch: 15 }, { wch: 40 }, { wch: 12 }, { wch: 15 },
        { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }
      ];
      ws['!cols'] = columnWidths;

      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Compras Locales');

      // Hoja de resumen
      const resumen = [
        { Indicador: 'Usuario', Valor: this.usuarioBusqueda },
        { Indicador: 'Total Registros', Valor: this.estadisticas.totalRegistros },
        { Indicador: 'Total Artículos', Valor: this.estadisticas.totalArticulos },
        { Indicador: 'Total Compras', Valor: this.formatearMoneda(this.estadisticas.totalCompras) },
        { Indicador: 'Fecha Exportación', Valor: new Date().toLocaleString('es-EC') },
        { Indicador: 'Filtros Aplicados', Valor: this.obtenerFiltrosActivos() }
      ];
      
      const wsResumen: XLSX.WorkSheet = XLSX.utils.json_to_sheet(resumen);
      wsResumen['!cols'] = [{ wch: 25 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

      // Generar nombre de archivo
      const fecha = new Date().toISOString().split('T')[0];
      const nombreArchivo = `Compras_Locales_${this.usuarioBusqueda}_${fecha}.xlsx`;

      // Descargar archivo
      XLSX.writeFile(wb, nombreArchivo);

      console.log('✓ Excel exportado exitosamente:', nombreArchivo);
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      alert('Error al exportar el archivo Excel. Por favor, intente nuevamente.');
    }
  }

  /**
   * Obtiene descripción de filtros activos
   */
  private obtenerFiltrosActivos(): string {
    const filtros: string[] = [];
    
    if (this.filtroProveedor) filtros.push(`Proveedor: ${this.filtroProveedor}`);
    if (this.filtroArticulo) filtros.push(`Artículo: ${this.filtroArticulo}`);
    if (this.filtroNumero) filtros.push(`Serie/Número: ${this.filtroNumero}`);
    if (this.filtroFechaDesde) filtros.push(`Desde: ${this.formatearFecha(this.filtroFechaDesde)}`);
    if (this.filtroFechaHasta) filtros.push(`Hasta: ${this.formatearFecha(this.filtroFechaHasta)}`);
    
    return filtros.length > 0 ? filtros.join(', ') : 'Sin filtros';
  }

  /**
   * Imprime el reporte
   */
  imprimirReporte(): void {
    if (this.comprasFiltradas.length === 0) {
      alert('No hay datos para imprimir');
      return;
    }
    
    window.print();
  }

  /**
   * Obtiene el icono de ordenamiento
   */
  getIconoOrden(columna: string): string {
    if (this.columnaOrden !== columna) {
      return 'fa-sort';
    }
    return this.ordenAscendente ? 'fa-sort-up' : 'fa-sort-down';
  }

  /**
   * Verifica si hay filtros activos
   */
  get hayFiltrosActivos(): boolean {
    return !!(
      this.filtroProveedor ||
      this.filtroArticulo ||
      this.filtroNumero ||
      this.filtroFechaDesde ||
      this.filtroFechaHasta
    );
  }
}