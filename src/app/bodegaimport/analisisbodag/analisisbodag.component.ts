import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { RepuestosvhcrService } from 'src/app/services/repuestosvhcr.service';
import { RepuestoModalComponent } from '../repuesto-modal/repuesto-modal.component';


@Component({
  selector: 'app-analisisbodag',
  templateUrl: './analisisbodag.component.html',
  styleUrls: ['./analisisbodag.component.css']
})
export class AnalisisbodagComponent implements OnInit {
  
  oficinaId: string = '';
  oficinaNombre: string = '';
  oficinaInfo: any = null;
  inventario: any[] = [];
  inventarioFiltrado: any[] = [];
  cargando: boolean = false;
  error: string | null = null;

  // Mapa de repuestos: codigo → datos del repuesto
  private repuestosMap: Map<string, any> = new Map();

  // Filtros
  filtros = {
    articulo: '',
    nombre: '',
    clase: '',
    grupo: '',
    stockMinimo: null as number | null,
    stockMaximo: null as number | null,
    bodega: '',
    lineaCompetencia: ''
  };

  // Listas únicas
  clasesDisponibles: string[] = [];
  gruposDisponibles: string[] = [];
  bodegasDisponibles: string[] = [];
  lineasCompetenciaDisponibles: string[] = [];

  // Paginación
  paginaActual: number = 1;
  itemsPorPagina: number = 20;
  totalPaginas: number = 1;

  // Ordenamiento
  ordenarPor: string = 'articulo';
  ordenAscendente: boolean = true;

  // Fila expandida
  itemExpandido: any = null;

  // Modal nativo
  modalVisible: boolean = false;
  modalModo: 'nuevo' | 'editar' = 'nuevo';
  modalRepuesto: any = null;

  constructor(
    private route: ActivatedRoute,
    private repuestosService: RepuestosvhcrService
  ) {}

  ngOnInit(): void {
    this.oficinaId = this.route.snapshot.paramMap.get('id') || '';
    if (this.oficinaId) {
      this.cargarInventario();
    } else {
      this.error = 'No se especificó una oficina';
    }
  }

  cargarInventario(): void {
    this.cargando = true;
    this.error = null;

    // Ambas consultas en paralelo
    forkJoin({
      inventario: this.repuestosService.getInventarioPorOficina(this.oficinaId),
      repuestos:  this.repuestosService.getRepuestosPorOficina(this.oficinaId)
    }).subscribe({
      next: ({ inventario, repuestos }) => {

        // 1. Construir mapa usando 'codigo' como clave (campo de getRepuestosPorOficina)
        this.repuestosMap = new Map();
        (repuestos.data || []).forEach((rep: any) => {
          this.repuestosMap.set(rep.codigo, rep);
        });

        // 2. Cruzar inventario con repuestos:
        //    - NO existe en repuestos              → mostrar (aún no contado)
        //    - cantidad_sistema >= stock_disponible → ocultar  (ya está completo)
        //    - cantidad_sistema <  stock_disponible → mostrar  (falta cantidad)
        this.inventario = (inventario.data || [])
          .map((item: any) => {
            const repuesto        = this.repuestosMap.get(item.articulo);
            const stockDisponible = Number(item.stock_disponible ?? 0);
            const cantidadContada = repuesto ? Number(repuesto.cantidad_sistema ?? 0) : null;
            return {
              ...item,
              // cantidad ya registrada en repuestos (null = nunca contado)
              cantidad_contada: cantidadContada,
              // cuánto falta aún por contar (null = falta todo)
              diferencia: cantidadContada !== null ? stockDisponible - cantidadContada : null
            };
          })
          .filter((item: any) => {
            if (item.cantidad_contada === null) return true;  // no contado → mostrar
            return item.cantidad_contada < Number(item.stock_disponible ?? 0); // falta → mostrar
          });

        // 3. Flujo normal
        if (this.inventario.length > 0) {
          this.oficinaNombre = this.inventario[0].oficina || this.oficinaId;
          this.oficinaInfo = {
            oficinaId: this.inventario[0].oficina_id,
            oficina:   this.inventario[0].oficina,
            bodegaId:  this.inventario[0].bodega_id,
            bodega:    this.inventario[0].bodega
          };
        }

        this.inventarioFiltrado = [...this.inventario];
        this.extraerValoresUnicos();
        this.actualizarPaginacion();
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar datos:', err);
        this.error = 'Error al cargar el inventario de la oficina';
        this.cargando = false;
      }
    });
  }

  extraerValoresUnicos(): void {
    this.clasesDisponibles            = [...new Set(this.inventario.map(i => i.clase).filter(Boolean))].sort();
    this.gruposDisponibles            = [...new Set(this.inventario.map(i => i.grupo).filter(Boolean))].sort();
    this.bodegasDisponibles           = [...new Set(this.inventario.map(i => i.bodega).filter(Boolean))].sort();
    this.lineasCompetenciaDisponibles = [...new Set(this.inventario.map(i => i.linea_competencia).filter(Boolean))].sort();
  }

  aplicarFiltros(): void {
    this.inventarioFiltrado = this.inventario.filter(item => {
      const coincideArticulo = !this.filtros.articulo || item.articulo?.toLowerCase().includes(this.filtros.articulo.toLowerCase());
      const coincideNombre   = !this.filtros.nombre   || item.nombre?.toLowerCase().includes(this.filtros.nombre.toLowerCase());
      const coincideClase    = !this.filtros.clase    || item.clase === this.filtros.clase;
      const coincideGrupo    = !this.filtros.grupo    || item.grupo === this.filtros.grupo;
      const coincideBodega   = !this.filtros.bodega   || item.bodega === this.filtros.bodega;
      const coincideLinea    = !this.filtros.lineaCompetencia || item.linea_competencia === this.filtros.lineaCompetencia;
      const coincideStockMin = this.filtros.stockMinimo === null || (item.stock_disponible || 0) >= this.filtros.stockMinimo;
      const coincideStockMax = this.filtros.stockMaximo === null || (item.stock_disponible || 0) <= this.filtros.stockMaximo;

      return coincideArticulo && coincideNombre && coincideClase &&
             coincideGrupo && coincideBodega && coincideLinea &&
             coincideStockMin && coincideStockMax;
    });

    this.ordenarInventario();
    this.paginaActual = 1;
    this.actualizarPaginacion();
  }

  ordenarInventario(): void {
    this.inventarioFiltrado.sort((a, b) => {
      let valorA = a[this.ordenarPor] ?? '';
      let valorB = b[this.ordenarPor] ?? '';

      if (['stock_disponible', 'costo_unitario', 'precio_sin_iva', 'diferencia', 'cantidad_contada'].includes(this.ordenarPor)) {
        valorA = Number(valorA) || 0;
        valorB = Number(valorB) || 0;
      } else {
        valorA = String(valorA).toLowerCase();
        valorB = String(valorB).toLowerCase();
      }

      if (valorA < valorB) return this.ordenAscendente ? -1 : 1;
      if (valorA > valorB) return this.ordenAscendente ? 1 : -1;
      return 0;
    });
  }

  cambiarOrden(columna: string): void {
    if (this.ordenarPor === columna) {
      this.ordenAscendente = !this.ordenAscendente;
    } else {
      this.ordenarPor = columna;
      this.ordenAscendente = true;
    }
    this.ordenarInventario();
  }

  getIconoOrden(columna: string): string {
    if (this.ordenarPor !== columna) return '⇅';
    return this.ordenAscendente ? '↑' : '↓';
  }

  limpiarFiltros(): void {
    this.filtros = {
      articulo: '', nombre: '', clase: '', grupo: '',
      stockMinimo: null, stockMaximo: null, bodega: '', lineaCompetencia: ''
    };
    this.aplicarFiltros();
  }

  actualizarPaginacion(): void {
    this.totalPaginas = Math.ceil(this.inventarioFiltrado.length / this.itemsPorPagina) || 1;
    if (this.paginaActual > this.totalPaginas) this.paginaActual = this.totalPaginas;
  }

  getItemsPagina(): any[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.inventarioFiltrado.slice(inicio, inicio + this.itemsPorPagina);
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) this.paginaActual = pagina;
  }

  getPaginas(): number[] {
    const paginas: number[] = [];
    const maxVisible = 5;
    let inicio = Math.max(1, this.paginaActual - Math.floor(maxVisible / 2));
    let fin = Math.min(this.totalPaginas, inicio + maxVisible - 1);
    if (fin - inicio < maxVisible - 1) inicio = Math.max(1, fin - maxVisible + 1);
    for (let i = inicio; i <= fin; i++) paginas.push(i);
    return paginas;
  }

  // ============ MODAL NATIVO ============

  abrirModalNuevo(): void {
    this.modalModo = 'nuevo';
    this.modalRepuesto = null;
    this.modalVisible = true;
  }

  abrirModalEditar(item: any): void {
    this.modalModo = 'editar';
    this.modalRepuesto = item;
    this.modalVisible = true;
  }

  cerrarModal(): void {
    this.modalVisible = false;
    this.modalRepuesto = null;
  }

  onGuardarModal(event: any): void {
    console.log('Guardado:', event);
    this.cerrarModal();
    this.cargarInventario();
    alert('Repuesto guardado correctamente');
  }

  // ============ UTILIDADES ============

  toggleDetalle(item: any): void {
    this.itemExpandido = this.itemExpandido === item ? null : item;
  }

  getStockClass(stock: number): string {
    if (!stock || stock === 0) return 'stock-cero';
    if (stock < 5)  return 'stock-bajo';
    if (stock < 20) return 'stock-medio';
    return 'stock-alto';
  }

  /**
   * Clase CSS para la columna Faltante:
   * null → nunca contado (falta todo) → amarillo
   * >5   → crítico                    → rojo
   * 1-5  → parcial                    → naranja
   */
  getFaltanteClass(diferencia: number | null): string {
    if (diferencia === null) return 'faltante-total';
    if (diferencia > 5)     return 'faltante-critico';
    return 'faltante-parcial';
  }

  formatearStock(valor: number | null | undefined): string {
    return valor === null || valor === undefined ? '0.00' : Number(valor).toFixed(2);
  }

  formatearFecha(fecha: string): string {
    return fecha ? new Date(fecha).toLocaleDateString('es-EC') : '-';
  }

  getTotalArticulos(): number { return this.inventarioFiltrado.length; }

  getStockTotal(): number {
    return this.inventarioFiltrado.reduce((sum, item) => sum + (Number(item.stock_disponible) || 0), 0);
  }

  getValorTotal(): number {
    return this.inventarioFiltrado.reduce((sum, item) => {
      return sum + (Number(item.stock_disponible) || 0) * (Number(item.precio_sin_iva) || 0);
    }, 0);
  }

  getCostoTotal(): number {
    return this.inventarioFiltrado.reduce((sum, item) => {
      return sum + (Number(item.stock_disponible) || 0) * (Number(item.costo_unitario) || 0);
    }, 0);
  }

  exportarExcel(): void {
    const datos = this.inventarioFiltrado.map(item => ({
      Codigo:      item.articulo,
      Descripcion: item.nombre,
      Clase:       item.clase,
      Grupo:       item.grupo,
      Stock:       item.stock_disponible,
      Contado:     item.cantidad_contada ?? 'Sin registro',
      Faltante:    item.diferencia       ?? item.stock_disponible,
      Costo:       item.costo_unitario,
      Precio:      item.precio_sin_iva
    }));

    const headers = Object.keys(datos[0]);
    const csv = [
      headers.join(';'),
      ...datos.map(row => headers.map(h => `"${row[h as keyof typeof row] ?? ''}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventario_${this.oficinaId}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }
}