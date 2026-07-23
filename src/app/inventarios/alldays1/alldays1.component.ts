// alldays.component.ts
import { Component, OnInit } from '@angular/core';
import { InventarioService } from 'src/app/services/inventario.service';
import * as XLSX from 'xlsx';
import { Range } from 'xlsx';
 
interface ConteoInventario {
  id: number;
  agencia_id: number;
  codigo_articulo: string;
  nombre_articulo: string;
  descripcion: string;
  stock: number;
  stock_reservado: number;
  stock_disponible: number;
  cantidad_contada: number;
  usuario_contador: string;
  fecha_conteo: Date;
  cantidad_reconteo: number;
  usuario_reconteo: string;
  requiere_reconteo: boolean;
  motivo_reconteo: string;
  fecha_reconteo: Date;
  ubicacion: string;
  unidad: string;
  observaciones: string;
  nombre_agencia: string;
  campana_id: number;
  costo_promedio: number;
}

interface ArticuloAgrupado {
  codigo_articulo: string;
  nombre_articulo: string;
  descripcion: string;
  stock: number;
  stock_reservado: number;
  stock_disponible: number;
  unidad: string;
  costo_promedio: number;
  conteosPorFecha: { [fecha: string]: ConteoInventario[] };
}

interface GrupoFechas {
  nombre: string;
  fechas: string[];
  dias: string;
}

interface ConteoDiario {
  fecha: string;
  fechaHora: Date;
  cantidad_contada: number;
  diferencia: number;
  observaciones: string;
  usuario_contador: string;
  ubicacionconteo: string;
}

interface ArticuloDiario {
  bodega_id: string;
  bodega: string;
  clase_id: string;
  clase : string;
  grupo_id : string;
  grupo : string;
  codigo_articulo: string;
  nombre_articulo: string;  
  descripcion: string;
  ubicacion : string;
  linea_comp_id : string;
  linea_competencia : string;
  stock: number;
  stock_reservado: number;
  stock_disponible: number;
  fob:number;
  costo_uni : number;
  costo_total : number;
  unidad: string;
  costo_promedio: number;
  precio_sin_iva: number;
  descuento_maximo : number;
  primera_fecha_compra: Date;
  ultima_fecha_compra: Date;
  cant_vendida_ult_mes: number;
  numero_de_transferencias: number;
  
  conteosPorDia: { [fecha: string]: ConteoDiario[] };
}

@Component({
  selector: 'app-alldays1',
  templateUrl: './alldays1.component.html',
  styleUrls: ['./alldays1.component.css']
})
export class Alldays1Component implements OnInit {
  conteos: ConteoInventario[] = [];
  articulosAgrupados: ArticuloAgrupado[] = [];
  articulosConDiferencias: ArticuloAgrupado[] = [];
  articulosDiarios: ArticuloDiario[] = [];
  fechasUnicas: string[] = [];
  gruposFechas: GrupoFechas[] = [];
  agenciaId: number = 5;
  loading: boolean = false;
  conteosFueraInventario: any[] = [];
  loadingFueraInventario: boolean = false;

  constructor(private conteosService: InventarioService) {}

  ngOnInit(): void {
    this.cargarConteos();
    this.cargarConteosFueraInventario();
  }

  cargarConteos(): void {
    this.loading = true;
    this.conteosService.getConteosInventario(this.agenciaId).subscribe({
      next: (data) => {
        this.conteos = data;
        this.procesarDatos();
        this.procesarDatosDiarios();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar conteos:', error);
        this.loading = false;
      }
    });
  }

  procesarDatos(): void {
    const agrupados = new Map<string, ArticuloAgrupado>();
    const fechasSet = new Set<string>();

    this.conteos.forEach(conteo => {
      const key = conteo.codigo_articulo;
      
      const fecha = this.formatearFecha(conteo.fecha_conteo);
      fechasSet.add(fecha);

      if (!agrupados.has(key)) {
        agrupados.set(key, {
          codigo_articulo: conteo.codigo_articulo,
          nombre_articulo: conteo.nombre_articulo,
          descripcion: conteo.descripcion,
          stock: conteo.stock,
          stock_reservado: conteo.stock_reservado,
          stock_disponible: conteo.stock_disponible,
          unidad: conteo.unidad,
          costo_promedio: conteo.costo_promedio,
          conteosPorFecha: {}
        });
      }

      const articulo = agrupados.get(key)!;
      if (!articulo.conteosPorFecha[fecha]) {
        articulo.conteosPorFecha[fecha] = [];
      }
      articulo.conteosPorFecha[fecha].push(conteo);
    });

    this.articulosAgrupados = Array.from(agrupados.values());
    this.fechasUnicas = Array.from(fechasSet).sort();
    this.configurarGruposFechas();
    this.filtrarArticulosConDiferencias();
  }

  procesarDatosDiarios(): void {
    const agrupadosDiarios = new Map<string, ArticuloDiario>();

    this.conteos.forEach((conteo:any) => {
      const key = conteo.codigo_articulo;
      const fecha = this.formatearFecha(conteo.fecha_conteo);

      if (!agrupadosDiarios.has(key)) {
        agrupadosDiarios.set(key, {
         codigo_articulo: conteo.codigo_articulo,
          nombre_articulo: conteo.nombre_articulo,
          descripcion: conteo.descripcion,
          stock: conteo.stock,
          stock_reservado: conteo.stock_reservado,
          stock_disponible: conteo.stock_disponible,
          unidad: conteo.unidad,
          costo_promedio: conteo.costo_promedio,
          bodega_id: conteo.bodega_id,
          bodega: conteo.bodega,
          clase_id: conteo.clase_id,
          clase: conteo.clase,
          grupo_id: conteo.grupo_id,
          grupo: conteo.grupo,
          ubicacion: conteo.ubicacion,
          linea_comp_id: conteo.linea_comp_id,
          linea_competencia: conteo.linea_competencia,
          fob: conteo.fob,
          costo_uni: conteo.costo_uni,
          costo_total: conteo.costo_total,
          precio_sin_iva: conteo.precio_sin_iva,
          descuento_maximo: conteo.descuento_maximo,
          primera_fecha_compra: conteo.primera_fecha_compra,
          ultima_fecha_compra: conteo.ultima_fecha_compra,
          cant_vendida_ult_mes: conteo.cant_vendida_ult_mes,
          numero_de_transferencias: conteo.numero_de_transferencias,
          conteosPorDia: {}
        });
      }

      const articulo = agrupadosDiarios.get(key)!;
      if (!articulo.conteosPorDia[fecha]) {
        articulo.conteosPorDia[fecha] = [];
      }

      const diferencia = this.calcularDiferencia(conteo.cantidad_contada, conteo.stock_disponible);

      articulo.conteosPorDia[fecha].push({
        fecha: fecha,
        fechaHora: conteo.fecha_conteo,
        cantidad_contada: conteo.cantidad_contada,
        diferencia: diferencia,
        observaciones: conteo.observaciones || 'Sin observaciones',
        usuario_contador: conteo.usuario_contador,
        ubicacionconteo: conteo.ubicacionconteo
      });
    });

    this.articulosDiarios = Array.from(agrupadosDiarios.values());
  }

  configurarGruposFechas(): void {
    const grupos = new Map<string, string[]>();
    
    this.fechasUnicas.forEach(fecha => {
      const dia = parseInt(fecha.split('-')[2], 10);
      
      if (dia >= 6 && dia <= 9) {
        if (!grupos.has('6-9')) grupos.set('6-9', []);
        grupos.get('6-9')!.push(fecha);
      } else if (dia === 10) {
        if (!grupos.has('10')) grupos.set('10', []);
        grupos.get('10')!.push(fecha);
      } else if (dia === 11) {
        if (!grupos.has('11')) grupos.set('11', []);
        grupos.get('11')!.push(fecha);
      }
    });

    this.gruposFechas = [];
    ['6-9', '10', '11'].forEach(key => {
      if (grupos.has(key)) {
        this.gruposFechas.push({
          nombre: key,
          fechas: grupos.get(key)!,
          dias: key
        });
      }
    });
  }

  formatearFecha(fecha: Date): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatearFechaHora(fecha: Date): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  formatearFechaCorta(fecha: string): string {
    if (!fecha) return '';
    const [year, month, day] = fecha.split('-');
    return `${day}/${month}`;
  }

  getConteosPorFecha(articulo: ArticuloAgrupado, fecha: string): ConteoInventario[] {
    return articulo.conteosPorFecha[fecha] || [];
  }

  getConteosDiariosPorFecha(articulo: ArticuloDiario, fecha: string): ConteoDiario[] {
    return articulo.conteosPorDia[fecha] || [];
  }

  getSumaConteosGrupo(articulo: ArticuloAgrupado, fechas: string[]): number {
    let suma = 0;
    
    fechas.forEach(fecha => {
      const dia = parseInt(fecha.split('-')[2], 10);
      const conteos = this.getConteosPorFecha(articulo, fecha);
      
      conteos.forEach(conteo => {
        if (dia === 10 || dia === 11) {
          suma += conteo.cantidad_reconteo || 0;
        } else {
          suma += conteo.cantidad_contada || 0;
        }
      });
    });
    
    return suma;
  }

  calcularDiferencia(cantidadContada: number, stockDisponible: number): number {
    return cantidadContada - stockDisponible;
  }

  getGrupoDias6_9(): GrupoFechas | undefined {
    return this.gruposFechas.find(g => g.dias === '6-9');
  }

  getGrupoDia10(): GrupoFechas | undefined {
    return this.gruposFechas.find(g => g.dias === '10');
  }

  getGrupoDia11(): GrupoFechas | undefined {
    return this.gruposFechas.find(g => g.dias === '11');
  }

  filtrarArticulosConDiferencias(): void {
    this.articulosConDiferencias = this.articulosAgrupados.filter(articulo => {
      const fechasDias6_9 = this.gruposFechas.find(g => g.dias === '6-9')?.fechas || [];
      const sumaConteo6_9 = this.getSumaConteosGrupo(articulo, fechasDias6_9);
      const diferencia6_9 = this.calcularDiferencia(sumaConteo6_9, articulo.stock_disponible);
      
      if (diferencia6_9 === 0) {
        return false;
      }
      
      const reconteo10 = this.getSumaReconteoDias(articulo, ['10']);
      const diferencia10 = this.calcularDiferencia(reconteo10, articulo.stock_disponible);
      
      if (diferencia10 === 0) {
        return false;
      }
      
      return true;
    });
  }

  getSumaReconteoDias(articulo: ArticuloAgrupado, dias: string[]): number {
    let suma = 0;
    
    dias.forEach(diaStr => {
      const grupo = this.gruposFechas.find(g => g.dias === diaStr);
      if (grupo) {
        grupo.fechas.forEach(fecha => {
          const conteos = this.getConteosPorFecha(articulo, fecha);
          conteos.forEach(conteo => {
            suma += conteo.cantidad_reconteo || 0;
          });
        });
      }
    });
    
    return suma;
  }

  getObservacionesGrupo(articulo: ArticuloAgrupado, fechas: string[]): string {
    const observaciones: string[] = [];
    
    fechas.forEach(fecha => {
      const conteos = this.getConteosPorFecha(articulo, fecha);
      conteos.forEach(conteo => {
        if (conteo.observaciones && conteo.observaciones.trim() !== '') {
          observaciones.push(conteo.observaciones);
        }
      });
    });
    
    return observaciones.length > 0 ? observaciones.join(' | ') : 'Sin observaciones';
  }

  exportarExcel(): void {
    const excelData: any[] = [];
    let itemNumber = 1;
    
    this.articulosAgrupados.forEach(articulo => {
      let tieneDatos = false;
      
      this.fechasUnicas.forEach(fecha => {
        const conteos = this.getConteosPorFecha(articulo, fecha);
        
        if (conteos.length > 0) {
          conteos.forEach(conteo => {
            excelData.push({
              'Item': itemNumber,
              'Código': articulo.codigo_articulo,
              'Artículo': articulo.nombre_articulo,
              'Descripción': articulo.descripcion,
              'Stock': articulo.stock,
              'Stock Reservado': articulo.stock_reservado,
              'Stock Disponible': articulo.stock_disponible,
              'Unidad': articulo.unidad,
              'Costo Promedio': articulo.costo_promedio,
              'Fecha': fecha,
              'Cantidad Contada': conteo.cantidad_contada,
              'Usuario Contador': conteo.usuario_contador,
              'Requiere Reconteo': conteo.requiere_reconteo ? 'Sí' : 'No',
              'Motivo Reconteo': conteo.motivo_reconteo || '-',
              'Cantidad Reconteo': conteo.cantidad_reconteo || '-',
              'Usuario Reconteo': conteo.usuario_reconteo || '-',
              'Fecha Reconteo': conteo.fecha_reconteo ? this.formatearFecha(conteo.fecha_reconteo) : '-',
              'Ubicación': conteo.ubicacion || '-',
              'Observaciones': conteo.observaciones || '-'
            });
            tieneDatos = true;
          });
        }
      });
      
      if (!tieneDatos) {
        excelData.push({
          'Item': itemNumber,
          'Código': articulo.codigo_articulo,
          'Artículo': articulo.nombre_articulo,
          'Descripción': articulo.descripcion,
          'Stock': articulo.stock,
          'Stock Reservado': articulo.stock_reservado,
          'Stock Disponible': articulo.stock_disponible,
          'Unidad': articulo.unidad,
          'Costo Promedio': articulo.costo_promedio,
          'Fecha': '-',
          'Cantidad Contada': '-',
          'Usuario Contador': '-',
          'Requiere Reconteo': '-',
          'Motivo Reconteo': '-',
          'Cantidad Reconteo': '-',
          'Usuario Reconteo': '-',
          'Fecha Reconteo': '-',
          'Ubicación': '-',
          'Observaciones': '-'
        });
      }
      
      itemNumber++;
    });

    this.generarExcel(excelData);
  }

  exportarExcel1(): void {
    const excelData: any[] = [];
    
    const headers: any = {
      'Item': 'Item',
      'Código': 'Código',
      'Artículo': 'Artículo',
      'Descripción': 'Descripción',
      'Stock': 'Stock',
      'Stock Reservado': 'Stock Reservado',
      'Stock Disponible': 'Stock Disponible',
      'Unidad': 'Unidad',
      'Costo Promedio': 'Costo Promedio'
    };

    this.fechasUnicas.forEach(fecha => {
      const fechaCorta = this.formatearFechaCorta(fecha);
      headers[`${fecha}_cantidad`] = `${fechaCorta} - Cantidad`;
      headers[`${fecha}_usuario`] = `${fechaCorta} - Usuario`;
      headers[`${fecha}_observaciones`] = `${fechaCorta} - Observaciones`;
    });

    excelData.push(headers);

    let itemNumber = 1;
    this.articulosAgrupados.forEach(articulo => {
      const row: any = {
        'Item': itemNumber,
        'Código': articulo.codigo_articulo,
        'Artículo': articulo.nombre_articulo,
        'Descripción': articulo.descripcion,
        'Stock': articulo.stock,
        'Stock Reservado': articulo.stock_reservado,
        'Stock Disponible': articulo.stock_disponible,
        'Unidad': articulo.unidad,
        'Costo Promedio': articulo.costo_promedio
      };

      this.fechasUnicas.forEach(fecha => {
        const conteos = this.getConteosPorFecha(articulo, fecha);
        
        if (conteos.length > 0) {
          const cantidades = conteos.map(c => c.cantidad_contada).join(', ');
          const usuarios = conteos.map(c => c.usuario_contador).join(', ');
          const observaciones = conteos
            .map(c => c.observaciones || '')
            .filter(o => o)
            .join(' | ');

          row[`${fecha}_cantidad`] = cantidades;
          row[`${fecha}_usuario`] = usuarios;
          row[`${fecha}_observaciones`] = observaciones || '-';
        } else {
          row[`${fecha}_cantidad`] = '-';
          row[`${fecha}_usuario`] = '-';
          row[`${fecha}_observaciones`] = '-';
        }
      });

      excelData.push(row);
      itemNumber++;
    });

    this.generarExcelConFormato(excelData);
  }

  exportarExcelAgrupado(): void {
    const excelData: any[] = [];
    
    let itemNumber = 1;
    this.articulosAgrupados.forEach(articulo => {
      const row: any = {
        'Item': itemNumber,
        'Código': articulo.codigo_articulo,
        'Artículo': articulo.nombre_articulo,
        'Descripción': articulo.descripcion,
        'Stock': articulo.stock,
        'Stock Reservado': articulo.stock_reservado,
        'Stock Disponible': articulo.stock_disponible,
        'Unidad': articulo.unidad,
        'Costo Promedio': articulo.costo_promedio
      };

      this.gruposFechas.forEach(grupo => {
        const sumaConteo = this.getSumaConteosGrupo(articulo, grupo.fechas);
        const diferencia = this.calcularDiferencia(sumaConteo, articulo.stock_disponible);
        
        row[`Días ${grupo.dias} - Conteo`] = sumaConteo || 0;
        row[`Días ${grupo.dias} - Diferencia`] = diferencia;
      });

      excelData.push(row);
      itemNumber++;
    });

    this.generarExcelConFormatoAgrupado(excelData);
  }

  exportarExcelDiferencias(): void {
    const excelData: any[] = [];
    
    let itemNumber = 1;
    this.articulosConDiferencias.forEach(articulo => {
      const fechasDias6_9 = this.gruposFechas.find(g => g.dias === '6-9')?.fechas || [];
      const sumaConteo6_9 = this.getSumaConteosGrupo(articulo, fechasDias6_9);
      const diferencia6_9 = this.calcularDiferencia(sumaConteo6_9, articulo.stock_disponible);
      
      const reconteo10 = this.getSumaReconteoDias(articulo, ['10']);
      const reconteo11 = this.getSumaReconteoDias(articulo, ['11']);
      const diferencia10 = this.calcularDiferencia(reconteo10, articulo.stock_disponible);
      const diferencia11 = this.calcularDiferencia(reconteo11, articulo.stock_disponible);
      
      const obs6_9 = this.getObservacionesGrupo(articulo, fechasDias6_9);
      const obs10 = this.getObservacionesGrupo(articulo, this.gruposFechas.find(g => g.dias === '10')?.fechas || []);
      const obs11 = this.getObservacionesGrupo(articulo, this.gruposFechas.find(g => g.dias === '11')?.fechas || []);
      
      const row: any = {
        'Item': itemNumber,
        'Código': articulo.codigo_articulo,
        'Artículo': articulo.nombre_articulo,
        'Descripción': articulo.descripcion,
        'Stock Disponible': articulo.stock_disponible,
        'Unidad': articulo.unidad,
        'Costo Promedio': articulo.costo_promedio,
        'Conteo Días 6-9': sumaConteo6_9,
        'Diferencia Días 6-9': diferencia6_9,
        'Observaciones Días 6-9': obs6_9,
        'Reconteo Día 10': reconteo10,
        'Diferencia Día 10': diferencia10,
        'Observaciones Día 10': obs10,
        'Reconteo Día 11': reconteo11,
        'Diferencia Día 11': diferencia11,
        'Observaciones Día 11': obs11
      };

      excelData.push(row);
      itemNumber++;
    });

    this.generarExcelDiferencias(excelData);
  }

  generarExcel(data: any[]): void {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = { Sheets: { 'Conteos': worksheet }, SheetNames: ['Conteos'] };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    this.guardarExcel(excelBuffer, 'conteos-inventario-detallado');
  }

  generarExcelConFormato(data: any[]): void {
    const worksheet = XLSX.utils.json_to_sheet(data, { skipHeader: true });
    
    const columnWidths = [
      { wch: 6 },
      { wch: 15 },
      { wch: 30 },
      { wch: 35 },
      { wch: 10 },
      { wch: 15 },
      { wch: 15 },
      { wch: 10 },
      { wch: 15 }
    ];

    this.fechasUnicas.forEach(() => {
      columnWidths.push({ wch: 12 });
      columnWidths.push({ wch: 20 });
      columnWidths.push({ wch: 30 });
    });

    worksheet['!cols'] = columnWidths;

    const workbook = { Sheets: { 'Conteos': worksheet }, SheetNames: ['Conteos'] };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    this.guardarExcel(excelBuffer, 'conteos-inventario-por-fechas');
  }

  generarExcelConFormatoAgrupado(data: any[]): void {
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    const columnWidths = [
      { wch: 6 },
      { wch: 15 },
      { wch: 30 },
      { wch: 35 },
      { wch: 10 },
      { wch: 15 },
      { wch: 15 },
      { wch: 10 },
      { wch: 15 }
    ];

    this.gruposFechas.forEach(() => {
      columnWidths.push({ wch: 18 });
      columnWidths.push({ wch: 18 });
    });

    worksheet['!cols'] = columnWidths;

    const workbook = { Sheets: { 'Conteos Agrupados': worksheet }, SheetNames: ['Conteos Agrupados'] };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    this.guardarExcel(excelBuffer, 'conteos-inventario-agrupado');
  }

  generarExcelDiferencias(data: any[]): void {
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    const columnWidths = [
      { wch: 6 },
      { wch: 15 },
      { wch: 30 },
      { wch: 35 },
      { wch: 15 },
      { wch: 10 },
      { wch: 15 },
      { wch: 15 },
      { wch: 18 },
      { wch: 40 },
      { wch: 15 },
      { wch: 18 },
      { wch: 40 },
      { wch: 15 },
      { wch: 18 },
      { wch: 40 }
    ];

    worksheet['!cols'] = columnWidths;

    const workbook = { 
      Sheets: { 'Artículos con Diferencias': worksheet }, 
      SheetNames: ['Artículos con Diferencias'] 
    };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    this.guardarExcel(excelBuffer, 'articulos-con-diferencias');
  }

  guardarExcel(buffer: any, fileName: string): void {
    const data: Blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(data);
    link.download = `${fileName}_${new Date().getTime()}.xlsx`;
    link.click();
  }

  // MÉTODO PRINCIPAL: exportarExcelDiario3 con columna Estado
  exportarExcelDiario3(): void {
    if (this.articulosDiarios.length === 0) {
      console.warn('No hay datos de conteos diarios para exportar.');
      return;
    }

    const subHeaders = ['Fecha/Hora', 'Cant. Contada', 'Diferencia', 'Observaciones', 'Usuario', 'Ubicacion'];
    const N_FIXED_COLS = 43; // 27 originales + 16 nuevas columnas de análisis (incluye Estado)

    // 1. Definir la estructura de la cabecera del Excel (2 filas)
    let headerRow1: any[] = [
      'Item','ID Bodega', 'Bodega', 'ID Clase', 'Clase', 'ID Grupo', 'Grupo', 'Código', 'Artículo', 
      'Descripción', 'Ubicación', 'ID Línea Comp.', 'Línea Competencia',
      'Stock', 'Stock Reservado', 'Stock Disponible','FOB', 'Costo Unitario', 'Costo Total', 'Costo Promedio',
      'Precio sin IVA', 'Desc. Máximo',
      '1ª Fecha Compra', 'Última Fecha Compra', 'Cant. Vendida Últ. Mes', 'Nº de Transferencias', 'Unidad'
    ];
    
    let headerRow2: string[] = Array(27).fill(''); 

    // Agregar columnas dinámicas de fechas
    this.fechasUnicas.forEach(fecha => {
      headerRow1.push(this.formatearFechaCorta(fecha));
      headerRow1.push('', '', '','', '');
      headerRow2.push(...subHeaders);
    });

    // Agregar las nuevas columnas de análisis después de las fechas
    headerRow1.push(
      'Conteo Días 6-9',
      'Diferencia Días 6-9', 
      'Observaciones Días 6-9',
      'Reconteo Día 10',
      'Diferencia Día 10',
      'Observaciones Día 10',
      'Reconteo Día 11',
      'Diferencia Día 11',
      'Observaciones Día 11',
      'Conteo Final Aceptado',
      'Diferencia Final',
      'Cantidad Faltante',
      'Costo Total Faltante',
      'Cantidad Sobrante',
      'Costo Total Sobrante',
      'Estado'
    );
    
    // Agregar celdas vacías en headerRow2 para las nuevas columnas
    headerRow2.push(...Array(16).fill(''));

    // 2. Determinar la altura máxima de filas para el merge vertical
    let maxRowsPerArticle = 1;
    this.articulosDiarios.forEach(articulo => {
      this.fechasUnicas.forEach(fecha => {
        const conteos = this.getConteosDiariosPorFecha(articulo, fecha);
        maxRowsPerArticle = Math.max(maxRowsPerArticle, conteos.length);
      });
    });

    // 3. Generar la data del cuerpo y las instrucciones de merge
    let data: any[][] = [headerRow1, headerRow2];
    const merges: Range[] = [];
    let currentRow = 2;

    this.articulosDiarios.forEach((articulo, i) => {
      const articuloRowStart = currentRow;
      let articuloMaxConteos = 1;

      this.fechasUnicas.forEach(fecha => {
        const conteos = this.getConteosDiariosPorFecha(articulo, fecha);
        articuloMaxConteos = Math.max(articuloMaxConteos, conteos.length);
      });
      
      // Calcular todos los valores de análisis
      const conteoDias6_9 = this.getSumaConteosPorDias(articulo, ['6', '7', '8', '9']);
      const reconteo10 = this.getSumaReconteosPorDias(articulo, ['10']);
      const reconteo11 = this.getSumaReconteosPorDias(articulo, ['11']);
      
      const stockDisponible = articulo.stock_disponible;
      const diferenciaDias6_9 = conteoDias6_9 - stockDisponible;
      const diferenciaDia10 = reconteo10 - stockDisponible;
      const diferenciaDia11 = reconteo11 - stockDisponible;
      
      // Obtener observaciones
      const obsDias6_9 = this.getObservacionesPorDias(articulo, ['6', '7', '8', '9']);
      const obsDia10 = this.getObservacionesPorDias(articulo, ['10']);
      const obsDia11 = this.getObservacionesPorDias(articulo, ['11']);
      
      const conteoFinalAceptado = this.determinarConteoFinal(conteoDias6_9, reconteo10, reconteo11, stockDisponible);
      const diferenciaFinal = conteoFinalAceptado - stockDisponible;
      const cantidadFaltante = diferenciaFinal < 0 ? Math.abs(diferenciaFinal) : 0;
      const costoTotalFaltante = cantidadFaltante * articulo.costo_promedio;
      const cantidadSobrante = diferenciaFinal > 0 ? diferenciaFinal : 0;
      const costoTotalSobrante = cantidadSobrante * articulo.costo_promedio;
      
      // Determinar el estado basado en análisis
      const estado = this.determinarEstado(diferenciaFinal, stockDisponible, cantidadFaltante, cantidadSobrante);
      
      for (let r = 0; r < articuloMaxConteos; r++) {
        let row: any[] = [];
        
        if (r === 0) {
          // Columnas fijas del artículo (27 columnas)
          row.push(
            i + 1,
            articulo.bodega_id,
            articulo.bodega,
            articulo.clase_id,
            articulo.clase,
            articulo.grupo_id,
            articulo.grupo,
            articulo.codigo_articulo,
            articulo.nombre_articulo,
            articulo.descripcion,
            articulo.ubicacion,
            articulo.linea_comp_id,
            articulo.linea_competencia,
            articulo.stock,
            articulo.stock_reservado,
            articulo.stock_disponible,
            articulo.fob,
            articulo.costo_uni,
            articulo.costo_total,
            articulo.costo_promedio,
            articulo.precio_sin_iva,
            articulo.descuento_maximo,
            articulo.primera_fecha_compra, 
            articulo.ultima_fecha_compra, 
            articulo.cant_vendida_ult_mes,
            articulo.numero_de_transferencias,
            articulo.unidad
          );
        } else {
          row.push(...Array(27).fill('')); 
        }

        // Columnas dinámicas de conteos por día
        this.fechasUnicas.forEach(fecha => {
          const conteos = this.getConteosDiariosPorFecha(articulo, fecha);
          const conteo = conteos[r];
          
          if (conteo) {
            row.push(
              this.formatearFechaHora(conteo.fechaHora),
              conteo.cantidad_contada,
              conteo.diferencia,
              conteo.observaciones,
              conteo.usuario_contador,
              conteo.ubicacionconteo
            );
          } else {
            row.push('', '', '', '', '', '');
          }
        });

        // Agregar columnas de análisis (solo en la primera fila de cada artículo)
        if (r === 0) {
          row.push(
            conteoDias6_9,
            diferenciaDias6_9,
            obsDias6_9,
            reconteo10,
            diferenciaDia10,
            obsDia10,
            reconteo11,
            diferenciaDia11,
            obsDia11,
            conteoFinalAceptado,
            diferenciaFinal,
           -cantidadFaltante,
            -costoTotalFaltante,
            cantidadSobrante,
            costoTotalSobrante,
            estado
          );
        } else {
          row.push(...Array(16).fill(''));
        }

        data.push(row);
      }
      
      // 4. Definir merges para las columnas fijas del artículo (27 primeras columnas)
      if (articuloMaxConteos > 1) {
        for (let c = 0; c < 27; c++) {
          merges.push({
            s: { r: articuloRowStart, c: c }, 
            e: { r: articuloRowStart + articuloMaxConteos - 1, c: c }
          });
        }
        
        // Merge para las columnas de análisis (últimas 16 columnas)
        const startAnalysisCol = 27 + (this.fechasUnicas.length * 6);
        for (let c = startAnalysisCol; c < startAnalysisCol + 16; c++) {
          merges.push({
            s: { r: articuloRowStart, c: c }, 
            e: { r: articuloRowStart + articuloMaxConteos - 1, c: c }
          });
        }
      }

      currentRow += articuloMaxConteos;
    });

    // 5. Definir merges para las cabeceras de fechas
    let currentHeaderCol = 27;
    this.fechasUnicas.forEach(() => {
      merges.push({
        s: { r: 0, c: currentHeaderCol },
        e: { r: 0, c: currentHeaderCol + subHeaders.length - 1 }
      });
      currentHeaderCol += subHeaders.length;
    });

    // 6. Crear la hoja de trabajo y aplicar merges
    const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(data);
    worksheet['!merges'] = merges;
    
    // 7. Ajustar anchos de columna
    const columnWidths = [
      { wch: 6 },  { wch: 10 }, { wch: 20 }, { wch: 10 }, { wch: 20 },
      { wch: 10 }, { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 40 },
      { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 15 },
      { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 },
      { wch: 18 }, { wch: 10 }
    ];
    
    // Anchos para las columnas dinámicas de fechas
    this.fechasUnicas.forEach(() => {
      columnWidths.push(
        { wch: 18 }, { wch: 15 }, { wch: 15 },
        { wch: 40 }, { wch: 18 }, { wch: 20 }
      );
    });
    
    // Anchos para las columnas de análisis
    columnWidths.push(
      { wch: 18 }, { wch: 18 }, { wch: 40 }, // Conteo 6-9, Dif 6-9, Obs 6-9
      { wch: 18 }, { wch: 18 }, { wch: 40 }, // Reconteo 10, Dif 10, Obs 10
      { wch: 18 }, { wch: 18 }, { wch: 40 }, // Reconteo 11, Dif 11, Obs 11
      { wch: 18 }, { wch: 15 }, { wch: 18 }, // Conteo Final, Dif Final, Cant Faltante
      { wch: 18 }, { wch: 18 }, { wch: 18 }, // Costo Faltante, Cant Sobrante, Costo Sobrante
      { wch: 30 }  // Estado
    );
    
    worksheet['!cols'] = columnWidths;

    // 8. Exportar
    const workbook = { Sheets: { 'Conteos Diarios': worksheet }, SheetNames: ['Conteos Diarios'] };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    this.guardarExcel(excelBuffer, 'conteos-inventario-diario-completo');
  }

  // Métodos auxiliares para cálculo del conteo final
  private getSumaConteosPorDias(articulo: ArticuloDiario, dias: string[]): number {
    let suma = 0;
    this.fechasUnicas.forEach(fecha => {
      const dia = parseInt(fecha.split('-')[2], 10).toString();
      if (dias.includes(dia)) {
        const conteos = this.getConteosDiariosPorFecha(articulo, fecha);
        conteos.forEach(conteo => {
          suma += conteo.cantidad_contada || 0;
        });
      }
    });
    return suma;
  }

  private getSumaReconteosPorDias(articulo: ArticuloDiario, dias: string[]): number {
    let suma = 0;
    this.fechasUnicas.forEach(fecha => {
      const dia = parseInt(fecha.split('-')[2], 10).toString();
      if (dias.includes(dia)) {
        const conteos = this.getConteosDiariosPorFecha(articulo, fecha);
        conteos.forEach(conteo => {
          suma += conteo.cantidad_contada || 0;
        });
      }
    });
    return suma;
  }

  private determinarConteoFinal(conteo6_9: number, reconteo10: number, reconteo11: number, stockDisponible: number): number {
    if (conteo6_9 === 0 && reconteo10 === 0 && reconteo11 === 0) {
      return 0;
    }

    const diff6_9 = Math.abs(stockDisponible - conteo6_9 );
    const diff10 = Math.abs(stockDisponible - reconteo10 );
    const diff11 = Math.abs(stockDisponible - reconteo11 );

    const opciones = [
      { valor: conteo6_9, diferencia: diff6_9, tipo: 'conteo6-9' },
      { valor: reconteo10, diferencia: diff10, tipo: 'reconteo10' },
      { valor: reconteo11, diferencia: diff11, tipo: 'reconteo11' }
    ];

    const opcionesValidas = opciones.filter(o => o.valor > 0);

    if (opcionesValidas.length === 0) {
      return 0;
    }

    opcionesValidas.sort((a, b) => a.diferencia - b.diferencia);

    return opcionesValidas[0].valor;
  }

  // Método auxiliar para obtener observaciones por días
  private getObservacionesPorDias(articulo: ArticuloDiario, dias: string[]): string {
    const observaciones: string[] = [];
    
    this.fechasUnicas.forEach(fecha => {
      const dia = parseInt(fecha.split('-')[2], 10).toString();
      if (dias.includes(dia)) {
        const conteos = this.getConteosDiariosPorFecha(articulo, fecha);
        conteos.forEach(conteo => {
          if (conteo.observaciones && conteo.observaciones.trim() !== '' && conteo.observaciones !== 'Sin observaciones') {
            observaciones.push(conteo.observaciones);
          }
        });
      }
    });
    
    return observaciones.length > 0 ? observaciones.join(' | ') : 'Sin observaciones';
  }

  // Método para determinar el estado del artículo
  private determinarEstado(diferenciaFinal: number, stockDisponible: number, cantidadFaltante: number, cantidadSobrante: number): string {
    // Si no hay diferencia
    if (diferenciaFinal === 0) {
      return 'COMPLETO';
    }
    
    // Si hay sobrante
    if (cantidadSobrante > 0) {
      const porcentajeSobrante = (cantidadSobrante / stockDisponible) * 100;
      if (porcentajeSobrante > 50) {
        return 'SOBRANTE CRÍTICO';
      } else if (porcentajeSobrante > 20) {
        return 'SOBRANTE ALTO';
      } else if (porcentajeSobrante > 5) {
        return 'SOBRANTE MODERADO';
      } else {
        return 'SOBRANTE MÍNIMO';
      }
    }
    
    // Si hay faltante
    if (cantidadFaltante > 0) {
      const porcentajeFaltante = (cantidadFaltante / stockDisponible) * 100;
      if (porcentajeFaltante > 50) {
        return 'FALTANTE CRÍTICO';
      } else if (porcentajeFaltante > 20) {
        return 'FALTANTE ALTO';
      } else if (porcentajeFaltante > 5) {
        return 'FALTANTE MODERADO';
      } else {
        return 'FALTANTE MÍNIMO';
      }
    }
    
    // Caso especial: si no hay stock disponible
    if (stockDisponible === 0) {
      if (diferenciaFinal > 0) {
        return 'SOBRANTE FUERA DE INVENTARIO';
      } else {
        return 'SIN STOCK DISPONIBLE';
      }
    }
    
    return 'REVISAR';
  }

  // Métodos para conteos fuera de inventario
  contarArticulosConReconteo(): number {
    return this.conteosFueraInventario.filter(c => c.requiere_reconteo).length;
  }

  calcularCantidadTotal(): number {
    return this.conteosFueraInventario.reduce((sum, c) => sum + (c.cantidad_total_dia || 0), 0);
  }

  calcularValorTotal(): number {
    return this.conteosFueraInventario.reduce((sum, c) => sum + (c.valor_total_dia || 0), 0);
  }

  mostrarDetalleConteo(conteo: any): void {
    const detalle = `
DETALLE COMPLETO DEL CONTEO

Código: ${conteo.codigo_interno_agencia}
Fecha: ${conteo.fecha_formateada}
Descripción: ${conteo.descripcion || 'Sin descripción'}

RESUMEN:
- Total de conteos realizados: ${conteo.total_conteos_del_dia}
- Cantidad total contada: ${conteo.cantidad_total_dia}
- Valor total: ${conteo.valor_total_dia}
- Precio unitario promedio: ${conteo.precio_unitario_promedio || 0}

UBICACIONES:
${conteo.ubicaciones || 'No especificadas'}

USUARIOS QUE CONTARON:
${conteo.usuarios_nombres || conteo.usuarios || 'No especificados'}

OBSERVACIONES:
${conteo.observaciones_dia || 'Sin observaciones'}

DETALLE POR CONTEO:
${conteo.detalle_conteos_dia || 'No disponible'}

RECONTEO:
${conteo.requiere_reconteo ? `Sí - Pendientes: ${conteo.reconteos_pendientes_dia}` : 'No'}
${conteo.motivos_reconteo ? `Motivos: ${conteo.motivos_reconteo}` : ''}

COORDENADAS:
Latitud: ${conteo.latitud_promedio || 'N/A'}
Longitud: ${conteo.longitud_promedio || 'N/A'}

IDs DE CONTEOS:
${conteo.ids_conteos_dia?.join(', ') || 'No disponibles'}
    `;

    alert(detalle);
  }

  cargarConteosFueraInventario(): void {
    this.loadingFueraInventario = true;
    this.conteosService.getConteosFueraInventario(this.agenciaId).subscribe({
      next: (data) => {
        this.conteosFueraInventario = data;
        console.log('Conteos fuera de inventario:', data);
        this.loadingFueraInventario = false;
      },
      error: (error) => {
        console.error('Error al cargar conteos fuera de inventario:', error);
        this.loadingFueraInventario = false;
      }
    });
  }

  exportarExcelFueraInventario(): void {
    if (this.conteosFueraInventario.length === 0) {
      alert('No hay datos de conteos fuera de inventario para exportar.');
      return;
    }

    const excelData: any[] = [];

    this.conteosFueraInventario.forEach((conteo, index) => {
      excelData.push({
        'Item': index + 1,
        'Fecha': conteo.fecha_formateada,
        'Día Semana': conteo.dia_semana?.trim(),
        'Código Artículo': conteo.codigo_interno_agencia,
        'Descripción': conteo.descripcion,
        'Campaña ID': conteo.campana_id,
        'Total Conteos del Día': conteo.total_conteos_del_dia,
        'Cantidad Total': conteo.cantidad_total_dia,
        'Valor Total': conteo.valor_total_dia,
        'Precio Unitario Promedio': conteo.precio_unitario_promedio || 0,
        'Ubicaciones': conteo.ubicaciones,
        'Estados': conteo.estados,
        'Unidades': conteo.unidades,
        'Usuarios': conteo.usuarios_nombres,
        'Observaciones': conteo.observaciones_dia,
        'Requiere Reconteo': conteo.requiere_reconteo ? 'Sí' : 'No',
        'Reconteos Pendientes': conteo.reconteos_pendientes_dia,
        'Motivos Reconteo': conteo.motivos_reconteo,
        'Estado Inventario': conteo.estado_inventario,
        'Código Agencia': conteo.codigo_agencia,
        'Nombre Agencia': conteo.nombre_agencia,
        'Hora Primer Conteo': conteo.hora_primer_conteo,
        'Hora Último Conteo': conteo.hora_ultimo_conteo,
        'Latitud': conteo.latitud_promedio,
        'Longitud': conteo.longitud_promedio,
        'IDs Conteos': conteo.ids_conteos_dia?.join(', '),
        'Detalle Completo': conteo.detalle_conteos_dia
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    const columnWidths = [
      { wch: 6 },   { wch: 12 },  { wch: 15 },  { wch: 20 }, { wch: 40 },
      { wch: 12 },  { wch: 18 },  { wch: 15 },  { wch: 15 }, { wch: 20 },
      { wch: 30 },  { wch: 20 },  { wch: 15 },  { wch: 30 }, { wch: 50 },
      { wch: 15 },  { wch: 18 },  { wch: 40 },  { wch: 20 }, { wch: 15 },
      { wch: 25 },  { wch: 15 },  { wch: 15 },  { wch: 12 }, { wch: 12 },
      { wch: 30 },  { wch: 60 }
    ];

    worksheet['!cols'] = columnWidths;

    const workbook = { 
      Sheets: { 'Fuera de Inventario': worksheet }, 
      SheetNames: ['Fuera de Inventario'] 
    };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    this.guardarExcel(excelBuffer, 'conteos-fuera-inventario');
  }

  exportarExcelFueraInventarioResumen(): void {
    if (this.conteosFueraInventario.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }

    const agrupados = new Map<string, any>();

    this.conteosFueraInventario.forEach(conteo => {
      const key = conteo.codigo_interno_agencia;
      
      if (!agrupados.has(key)) {
        agrupados.set(key, {
          codigo: conteo.codigo_interno_agencia,
          descripcion: conteo.descripcion,
          total_conteos: 0,
          cantidad_total: 0,
          valor_total: 0,
          fechas: [],
          usuarios: new Set(),
          ubicaciones: new Set(),
          requiere_reconteo: false,
          observaciones: []
        });
      }

      const item = agrupados.get(key)!;
      item.total_conteos += conteo.total_conteos_del_dia;
      item.cantidad_total += conteo.cantidad_total_dia;
      item.valor_total += conteo.valor_total_dia;
      item.fechas.push(conteo.fecha_formateada);
      
      if (conteo.usuarios_nombres) {
        conteo.usuarios_nombres.split(',').forEach((u: string) => item.usuarios.add(u.trim()));
      }
      
      if (conteo.ubicaciones) {
        conteo.ubicaciones.split(',').forEach((ub: string) => item.ubicaciones.add(ub.trim()));
      }
      
      if (conteo.requiere_reconteo) {
        item.requiere_reconteo = true;
      }
      
      if (conteo.observaciones_dia) {
        item.observaciones.push(conteo.observaciones_dia);
      }
    });

    const excelData: any[] = [];
    let itemNumber = 1;

    agrupados.forEach(item => {
      excelData.push({
        'Item': itemNumber++,
        'Código Artículo': item.codigo,
        'Descripción': item.descripcion,
        'Total Conteos': item.total_conteos,
        'Cantidad Total Contada': item.cantidad_total,
        'Valor Total': item.valor_total,
        'Fechas Contadas': item.fechas.join(', '),
        'Usuarios': Array.from(item.usuarios).join(', '),
        'Ubicaciones': Array.from(item.ubicaciones).join(', '),
        'Requiere Reconteo': item.requiere_reconteo ? 'Sí' : 'No',
        'Observaciones': item.observaciones.join(' | ')
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    const columnWidths = [
      { wch: 6 },   { wch: 20 },  { wch: 40 },  { wch: 15 }, { wch: 18 },
      { wch: 15 },  { wch: 30 },  { wch: 35 },  { wch: 30 }, { wch: 15 },
      { wch: 60 }
    ];

    worksheet['!cols'] = columnWidths;

    const workbook = { 
      Sheets: { 'Resumen Fuera Inventario': worksheet }, 
      SheetNames: ['Resumen Fuera Inventario'] 
    };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    this.guardarExcel(excelBuffer, 'resumen-fuera-inventario');
  }
}