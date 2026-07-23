import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrdenTrabajoResumen, GarantiasService } from 'src/app/services/garantias.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-otgrt',
  templateUrl: './otgrt.component.html',
  styleUrls: ['./otgrt.component.css']
})
export class OtgrtComponent implements OnInit {
  ordenes: OrdenTrabajoResumen[] = [];
  ordenesFiltradas: OrdenTrabajoResumen[] = [];
  loading = false;
  error: string | null = null;
  Math = Math;
  
  // ⭐️ PROPIEDAD AÑADIDA: Para controlar la vista actual
  vistaActual: 'pendientes' | 'procesadas' = 'pendientes';

  // Filtros
  filtroOficina = '';
  filtroNumero = '';
  filtroCliente = '';
  filtroChasis = '';
  
  // Paginación
  paginaActual = 1;
  itemsPorPagina = 30;
  
  // Ordenamiento
  columnaOrden = 'diasAbierto';
  ordenAscendente = false;

  constructor(private garantiasService: GarantiasService) { }

  ngOnInit(): void {
    this.cargarOrdenes();
  }

  cargarOrdenes(): void {
    this.loading = true;
    this.error = null;

    // ⭐️ LÓGICA CONDICIONAL: Llama al servicio según la vista actual
    const observable = this.vistaActual === 'pendientes'
      ? this.garantiasService.getOrdenesAbiertasResumen()
      : this.garantiasService.getOrdenesProcesadasResumen(); // ASUMIDO
      
    observable.subscribe({
      next: (data) => {
        this.ordenes = data;
        // Reiniciar la paginación, orden y filtros al cambiar de contexto
        this.paginaActual = 1; 
        this.columnaOrden = 'diasAbierto';
        this.ordenAscendente = false;
        this.aplicarFiltros();
        this.loading = false;
      },
      error: (err) => {
        this.error = `Error al cargar las órdenes de trabajo (${this.vistaActual}). Por favor, intente nuevamente.`;
        console.error('Error:', err);
        this.loading = false;
      }
    });
  }
  
  // ⭐️ MÉTODO AÑADIDO: Cambia la vista y recarga los datos
  cambiarVista(nuevaVista: 'pendientes' | 'procesadas'): void {
    if (this.vistaActual !== nuevaVista) {
      this.vistaActual = nuevaVista;
      this.limpiarFiltros(); 
      this.cargarOrdenes();
    }
  }

  aplicarFiltros(): void {
    this.ordenesFiltradas = this.ordenes.filter(orden => {
      const cumpleFiltroOficina = !this.filtroOficina || 
        orden.oficinaNombre?.toLowerCase().includes(this.filtroOficina.toLowerCase());
      
      const cumpleFiltroNumero = !this.filtroNumero || 
        orden.numero?.toLowerCase().includes(this.filtroNumero.toLowerCase());
      
      const cumpleFiltroCliente = !this.filtroCliente || 
        orden.clienteNombre?.toLowerCase().includes(this.filtroCliente.toLowerCase());
      
      const cumpleFiltroChasis = !this.filtroChasis || 
        orden.chasis?.toLowerCase().includes(this.filtroChasis.toLowerCase());
      
      return cumpleFiltroOficina && cumpleFiltroNumero && cumpleFiltroCliente && cumpleFiltroChasis;
    });
    
    this.paginaActual = 1;
  }

  limpiarFiltros(): void {
    this.filtroOficina = '';
    this.filtroNumero = '';
    this.filtroCliente = '';
    this.filtroChasis = '';
    this.aplicarFiltros();
  }

  ordenarPor(columna: string): void {
    if (this.columnaOrden === columna) {
      this.ordenAscendente = !this.ordenAscendente;
    } else {
      this.columnaOrden = columna;
      this.ordenAscendente = true;
    }
    
    this.ordenesFiltradas.sort((a, b) => {
      let valorA: any;
      let valorB: any;
      
      switch(columna) {
        case 'diasAbierto':
          valorA = a.diasAbierto || 0;
          valorB = b.diasAbierto || 0;
          break;
        case 'oficina':
          valorA = a.oficinaNombre || '';
          valorB = b.oficinaNombre || '';
          break;
        case 'numero':
          valorA = a.numero || '';
          valorB = b.numero || '';
          break;
        case 'cliente':
          valorA = a.clienteNombre || '';
          valorB = b.clienteNombre || '';
          break;
        case 'total':
          valorA = a.total || 0;
          valorB = b.total || 0;
          break;
        case 'fechaSolicitud':
          valorA = a.fechaSolicitud ? new Date(a.fechaSolicitud).getTime() : 0;
          valorB = b.fechaSolicitud ? new Date(b.fechaSolicitud).getTime() : 0;
          break;
        default:
          return 0;
      }
      
      if (valorA < valorB) return this.ordenAscendente ? -1 : 1;
      if (valorA > valorB) return this.ordenAscendente ? 1 : -1;
      return 0;
    });
  }

  get ordenesPaginadas(): OrdenTrabajoResumen[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    return this.ordenesFiltradas.slice(inicio, fin);
  }

  get totalPaginas(): number {
    return Math.ceil(this.ordenesFiltradas.length / this.itemsPorPagina);
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
    }
  }

  get paginasArray(): number[] {
    const paginas = [];
    const maxPaginas = 5;
    let inicio = Math.max(1, this.paginaActual - Math.floor(maxPaginas / 2));
    let fin = Math.min(this.totalPaginas, inicio + maxPaginas - 1);
    
    if (fin - inicio < maxPaginas - 1) {
      inicio = Math.max(1, fin - maxPaginas + 1);
    }
    
    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }
    return paginas;
  }

  formatearFecha(fecha: Date | undefined): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-EC', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  formatearMoneda(valor: number | undefined): string {
    if (valor === undefined || valor === null) return '$0.00';
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD'
    }).format(valor);
  }

  getClaseDiasAbierto(dias: number | undefined): string {
    if (!dias) return '';
    if (dias > 30) return 'dias-critico';
    if (dias > 15) return 'dias-alerta';
    return 'dias-normal';
  }

  

  imprimirReporte(): void {
    window.print();
  }

 
exportarExcel(): void {
  try {
    // Preparar los datos para exportar
    const datosExportar = this.ordenesFiltradas.map(orden => ({
      'Días Abierto': orden.diasAbierto || 0,
      'Oficina ID': orden.oficinaId || '',
      'Oficina': orden.oficinaNombre || '',
      'Número Orden': orden.numero || '',
      'Tipo': orden.tipo || '',
      'Estado': orden.estado || '',
      'Fecha Solicitud': this.formatearFecha(orden.fechaSolicitud),
      'Cliente': orden.clienteNombre || '',
      'Cédula/RUC': orden.clienteCedula || '',
      'Chasis': orden.chasis || '',
      'Motivo': orden.motivo || '',
      'Monto': orden.monto || 0,
      'Tasa IVA': orden.tasaIva || 0,
      'Total': orden.total || 0,
      'Usuario Creación': orden.usuarioCreacion || '',
      'Usuario Actualización': orden.usuarioActualizacion || ''
    }));

    // Crear el libro de trabajo
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosExportar);

    // Configurar el ancho de las columnas
    const columnWidths = [
      { wch: 12 }, // Días Abierto
      { wch: 12 }, // Oficina ID
      { wch: 25 }, // Oficina
      { wch: 15 }, // Número Orden
      { wch: 8 },  // Tipo
      { wch: 10 }, // Estado
      { wch: 15 }, // Fecha Solicitud
      { wch: 30 }, // Cliente
      { wch: 15 }, // Cédula/RUC
      { wch: 20 }, // Chasis
      { wch: 35 }, // Motivo
      { wch: 12 }, // Monto
      { wch: 10 }, // Tasa IVA
      { wch: 12 }, // Total
      { wch: 18 }, // Usuario Creación
      { wch: 18 }  // Usuario Actualización
    ];
    ws['!cols'] = columnWidths;

    // Aplicar formato a las celdas de encabezado
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + "1";
      if (!ws[address]) continue;
      ws[address].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "366092" } },
        alignment: { horizontal: "center", vertical: "center" }
      };
    }

    // Crear el libro
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Órdenes GRT');

    // Agregar una hoja con resumen
    const resumen = [
      { Indicador: 'Total Órdenes', Valor: this.ordenesFiltradas.length },
      { Indicador: 'Total Monto', Valor: this.calcularTotalMonto() },
      { Indicador: 'Total General', Valor: this.calcularTotalGeneral() },
      { Indicador: 'Promedio Días Abierto', Valor: this.calcularPromedioDias() },
      { Indicador: 'Fecha Exportación', Valor: new Date().toLocaleString('es-EC') }
    ];
    const wsResumen: XLSX.WorkSheet = XLSX.utils.json_to_sheet(resumen);
    wsResumen['!cols'] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    // Generar el nombre del archivo con fecha
    const fecha = new Date().toISOString().split('T')[0];
    const nombreArchivo = `Ordenes_Garantia_GRT_${fecha}.xlsx`;

    // Descargar el archivo
    XLSX.writeFile(wb, nombreArchivo);

    console.log('Excel exportado exitosamente');
  } catch (error) {
    console.error('Error al exportar Excel:', error);
    alert('Error al exportar el archivo Excel. Por favor, intente nuevamente.');
  }
}

// Funciones auxiliares para el resumen
private calcularTotalMonto(): number {
  return this.ordenesFiltradas.reduce((sum, orden) => sum + (orden.monto || 0), 0);
}

private calcularTotalGeneral(): number {
  return this.ordenesFiltradas.reduce((sum, orden) => sum + (orden.total || 0), 0);
}

private calcularPromedioDias(): number {
  if (this.ordenesFiltradas.length === 0) return 0;
  const totalDias = this.ordenesFiltradas.reduce((sum, orden) => sum + (orden.diasAbierto || 0), 0);
  return Math.round(totalDias / this.ordenesFiltradas.length);
}

// ============================================
// ALTERNATIVA: Exportación más simple
// ============================================

exportarExcelSimple(): void {
  try {
    const datosExportar = this.ordenesFiltradas.map(orden => ({
      'Días Abierto': orden.diasAbierto || 0,
      'Oficina': orden.oficinaNombre || '',
      'Número Orden': orden.numero || '',
      'Estado': orden.estado || '',
      'Fecha Solicitud': this.formatearFecha(orden.fechaSolicitud),
      'Cliente': orden.clienteNombre || '',
      'Chasis': orden.chasis || '',
      'Total': orden.total || 0
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosExportar);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Órdenes GRT');

    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Ordenes_GRT_${fecha}.xlsx`);
  } catch (error) {
    console.error('Error al exportar Excel:', error);
  }
}
}