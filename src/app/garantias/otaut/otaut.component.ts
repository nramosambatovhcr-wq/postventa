import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrdenTrabajoResumen, GarantiasService } from 'src/app/services/garantias.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-otaut',
  templateUrl: './otaut.component.html',
  styleUrls: ['./otaut.component.css']
})
export class OtautComponent implements OnInit {
  ordenes: OrdenTrabajoResumen[] = [];
  ordenesFiltradas: OrdenTrabajoResumen[] = [];
  loading = false;
  error: string | null = null;
  Math = Math;

  vistaActual: 'pendientes' | 'procesadas' = 'pendientes';

  // Filtros
  filtroOficina = '';
  filtroNumero  = '';
  filtroCliente = '';
  filtroChasis  = '';

  // Paginación
  paginaActual   = 1;
  itemsPorPagina = 30;

  // Ordenamiento
  columnaOrden    = 'diasAbierto';
  ordenAscendente = false;

  constructor(private garantiasService: GarantiasService) { }

  ngOnInit(): void {
    this.cargarOrdenes();
  }

  cargarOrdenes(): void {
    this.loading = true;
    this.error   = null;

    // ── Usa los endpoints de Auto Consumo (AUT) ──────────────────────────────
    const observable = this.vistaActual === 'pendientes'
      ? this.garantiasService.getOrdenesAbiertasAutResumen()
      : this.garantiasService.getOrdenesProcesadasAutResumen();

    observable.subscribe({
      next: (data) => {
        this.ordenes        = data;
        this.paginaActual   = 1;
        this.columnaOrden   = 'diasAbierto';
        this.ordenAscendente = false;
        this.aplicarFiltros();
        this.loading = false;
      },
      error: (err) => {
        this.error = `Error al cargar las órdenes de auto consumo (${this.vistaActual}). Por favor, intente nuevamente.`;
        console.error('Error:', err);
        this.loading = false;
      }
    });
  }

  cambiarVista(nuevaVista: 'pendientes' | 'procesadas'): void {
    if (this.vistaActual !== nuevaVista) {
      this.vistaActual = nuevaVista;
      this.limpiarFiltros();
      this.cargarOrdenes();
    }
  }

  aplicarFiltros(): void {
    this.ordenesFiltradas = this.ordenes.filter(orden => {
      const cumpleOficina  = !this.filtroOficina  || orden.oficinaNombre?.toLowerCase().includes(this.filtroOficina.toLowerCase());
      const cumpleNumero   = !this.filtroNumero   || orden.numero?.toLowerCase().includes(this.filtroNumero.toLowerCase());
      const cumpleCliente  = !this.filtroCliente  || orden.clienteNombre?.toLowerCase().includes(this.filtroCliente.toLowerCase());
      const cumpleChasis   = !this.filtroChasis   || orden.chasis?.toLowerCase().includes(this.filtroChasis.toLowerCase());
      return cumpleOficina && cumpleNumero && cumpleCliente && cumpleChasis;
    });
    this.paginaActual = 1;
  }

  limpiarFiltros(): void {
    this.filtroOficina = '';
    this.filtroNumero  = '';
    this.filtroCliente = '';
    this.filtroChasis  = '';
    this.aplicarFiltros();
  }

  ordenarPor(columna: string): void {
    if (this.columnaOrden === columna) {
      this.ordenAscendente = !this.ordenAscendente;
    } else {
      this.columnaOrden    = columna;
      this.ordenAscendente = true;
    }

    this.ordenesFiltradas.sort((a, b) => {
      let valorA: any;
      let valorB: any;

      switch (columna) {
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
      if (valorA > valorB) return this.ordenAscendente ?  1 : -1;
      return 0;
    });
  }

  get ordenesPaginadas(): OrdenTrabajoResumen[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.ordenesFiltradas.slice(inicio, inicio + this.itemsPorPagina);
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
    const paginas   = [];
    const maxPaginas = 5;
    let inicio = Math.max(1, this.paginaActual - Math.floor(maxPaginas / 2));
    let fin    = Math.min(this.totalPaginas, inicio + maxPaginas - 1);
    if (fin - inicio < maxPaginas - 1) {
      inicio = Math.max(1, fin - maxPaginas + 1);
    }
    for (let i = inicio; i <= fin; i++) paginas.push(i);
    return paginas;
  }

  formatearFecha(fecha: Date | undefined): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-EC', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    });
  }

  formatearMoneda(valor: number | undefined): string {
    if (valor === undefined || valor === null) return '$0.00';
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(valor);
  }

  getClaseDiasAbierto(dias: number | undefined): string {
    if (!dias)     return '';
    if (dias > 30) return 'dias-critico';
    if (dias > 15) return 'dias-alerta';
    return 'dias-normal';
  }

  imprimirReporte(): void {
    window.print();
  }

  exportarExcel(): void {
    try {
      const datosExportar = this.ordenesFiltradas.map(orden => ({
        'Días Abierto':          orden.diasAbierto          || 0,
        'Oficina ID':            orden.oficinaId            || '',
        'Oficina':               orden.oficinaNombre        || '',
        'Número Orden':          orden.numero               || '',
        'Tipo':                  orden.tipo                 || '',
        'Estado':                orden.estado               || '',
        'Fecha Solicitud':       this.formatearFecha(orden.fechaSolicitud),
        'Cliente':               orden.clienteNombre        || '',
        'Cédula/RUC':            orden.clienteCedula        || '',
        'Chasis':                orden.chasis               || '',
        'Motivo':                orden.motivo               || '',
        'Monto':                 orden.monto                || 0,
        'Tasa IVA':              orden.tasaIva              || 0,
        'Total':                 orden.total                || 0,
        'Usuario Creación':      orden.usuarioCreacion      || '',
        'Usuario Actualización': orden.usuarioActualizacion || ''
      }));

      const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosExportar);
      ws['!cols'] = [
        { wch: 12 }, { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 8  },
        { wch: 10 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 20 },
        { wch: 35 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 18 }
      ];

      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + '1';
        if (!ws[address]) continue;
        ws[address].s = {
          font:      { bold: true, color: { rgb: 'FFFFFF' } },
          fill:      { fgColor: { rgb: '366092' } },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }

      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Órdenes AUT');   // ← AUT

      const resumen = [
        { Indicador: 'Total Órdenes',        Valor: this.ordenesFiltradas.length },
        { Indicador: 'Total Monto',          Valor: this.calcularTotalMonto()    },
        { Indicador: 'Total General',        Valor: this.calcularTotalGeneral()  },
        { Indicador: 'Promedio Días Abierto',Valor: this.calcularPromedioDias()  },
        { Indicador: 'Fecha Exportación',    Valor: new Date().toLocaleString('es-EC') }
      ];
      const wsResumen: XLSX.WorkSheet = XLSX.utils.json_to_sheet(resumen);
      wsResumen['!cols'] = [{ wch: 25 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

      const fecha = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Ordenes_AutoConsumo_AUT_${fecha}.xlsx`);  // ← AUT
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      alert('Error al exportar el archivo Excel. Por favor, intente nuevamente.');
    }
  }

  private calcularTotalMonto(): number {
    return this.ordenesFiltradas.reduce((sum, o) => sum + (o.monto || 0), 0);
  }

  private calcularTotalGeneral(): number {
    return this.ordenesFiltradas.reduce((sum, o) => sum + (o.total || 0), 0);
  }

  private calcularPromedioDias(): number {
    if (this.ordenesFiltradas.length === 0) return 0;
    const total = this.ordenesFiltradas.reduce((sum, o) => sum + (o.diasAbierto || 0), 0);
    return Math.round(total / this.ordenesFiltradas.length);
  }
}