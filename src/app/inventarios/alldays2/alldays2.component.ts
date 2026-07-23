// alldays.component.ts - CÓDIGO COMPLETO CORREGIDO CON FALLBACK FDI
import { Component, OnInit } from '@angular/core';
import { InventarioService } from 'src/app/services/inventario.service';
import * as XLSX from 'xlsx';
import { Range } from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
  clase: string;
  grupo_id: string;
  grupo: string;
  codigo_articulo: string;
  nombre_articulo: string;  
  descripcion: string;
  ubicacion: string;
  linea_comp_id: string;
  linea_competencia: string;
  stock: number;
  stock_reservado: number;
  stock_disponible: number;
  fob: number;
  costo_uni: number;
  costo_total: number;
  unidad: string;
  costo_promedio: number;
  precio_sin_iva: number;
  descuento_maximo: number;
  primera_fecha_compra: Date;
  ultima_fecha_compra: Date;
  cant_vendida_ult_mes: number;
  numero_de_transferencias: number;
  conteosPorDia: { [fecha: string]: ConteoDiario[] };
}

export interface VarianzaDiaria {
  diferenciaTotal: number;
  totalContado: number;
  faltante: number;
  sobrante: number;
  observaciones: string;
}

export interface AnalisisVarianzaArticulo {
  codigo_articulo: string;
  nombre_articulo: string;
  stock_disponible: number;
  costo_promedio: number;
  unidad: string;
  
  analisis6_9: VarianzaDiaria;
  analisis10: VarianzaDiaria;
  analisis11: VarianzaDiaria;

  conteoFinalAceptado: number;
  diferenciaFinal: number;
  cantidadFaltanteTotal: number;
  costoTotalFaltante: number;
  cantidadSobranteTotal: number;
  costoTotalSobrante: number;
  estado: string;
  tipo: 'Contado' | 'No Contado' | 'Fuera de Inventario';
}

@Component({
  selector: 'app-alldays2',
  templateUrl: './alldays2.component.html',
  styleUrls: ['./alldays2.component.css']
})
export class Alldays2Component implements OnInit {
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
  public analisisVarianzas: AnalisisVarianzaArticulo[] = [];
  
  // Exponer Math para el template
  public Math = Math;

  public gruposAnalisis = [
    { nombre: 'Días 6 al 9', dias: ['6', '7', '8', '9'], prop: 'analisis6_9' as const },
    { nombre: 'Día 10 (Reconteo)', dias: ['10'], prop: 'analisis10' as const },
    { nombre: 'Día 11 (Reconteo)', dias: ['11'], prop: 'analisis11' as const }
  ];

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
        this.generarAnalisisVarianzas();
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

    this.conteos.forEach((conteo: any) => {
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
          bodega_id: conteo.bodega_id || '',
          bodega: conteo.bodega || '',
          clase_id: conteo.clase_id || '',
          clase: conteo.clase || '',
          grupo_id: conteo.grupo_id || '',
          grupo: conteo.grupo || '',
          ubicacion: conteo.ubicacion || '',
          linea_comp_id: conteo.linea_comp_id || '',
          linea_competencia: conteo.linea_competencia || '',
          fob: conteo.fob || 0,
          costo_uni: conteo.costo_uni || 0,
          costo_total: conteo.costo_total || 0,
          precio_sin_iva: conteo.precio_sin_iva || 0,
          descuento_maximo: conteo.descuento_maximo || 0,
          primera_fecha_compra: conteo.primera_fecha_compra,
          ultima_fecha_compra: conteo.ultima_fecha_compra,
          cant_vendida_ult_mes: conteo.cant_vendida_ult_mes || 0,
          numero_de_transferencias: conteo.numero_de_transferencias || 0,
          conteosPorDia: {}
        });
      }

      const articulo = agrupadosDiarios.get(key)!;
      if (!articulo.conteosPorDia[fecha]) {
        articulo.conteosPorDia[fecha] = [];
      }

      const cantidadConteoValida = this.getCantidadValida(conteo);
      const diferencia = this.calcularDiferencia(cantidadConteoValida, conteo.stock_disponible);

      articulo.conteosPorDia[fecha].push({
        fecha: fecha,
        fechaHora: conteo.fecha_conteo,
        cantidad_contada: cantidadConteoValida,
        diferencia: diferencia,
        observaciones: conteo.observaciones || 'Sin observaciones',
        usuario_contador: conteo.usuario_contador,
        ubicacionconteo: conteo.ubicacion
      });
    });

    this.articulosDiarios = Array.from(agrupadosDiarios.values());
  }
  
  private getCantidadValida(conteo: ConteoInventario): number {
    if (conteo.cantidad_reconteo !== undefined && conteo.cantidad_reconteo !== null) {
      return conteo.cantidad_reconteo;
    }
    return conteo.cantidad_contada || 0;
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

  obtenerFechaActual1(): string {
    const hoy = new Date();
    const dia = String(hoy.getDate()).padStart(2, '0');
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const anio = hoy.getFullYear();
    return `${dia}/${mes}/${anio}`;
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
      
      if (diferencia6_9 === 0) return false;
      
      const reconteo10 = this.getSumaReconteoDias(articulo, ['10']);
      const diferencia10 = this.calcularDiferencia(reconteo10, articulo.stock_disponible);
      
      if (diferencia10 === 0) return false;
      
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

  private readonly VARIANZA_BASE: VarianzaDiaria = {
    diferenciaTotal: 0,
    totalContado: 0,
    faltante: 0,
    sobrante: 0,
    observaciones: 'No Aplica / Sin Conteo'
  };

  generarAnalisisVarianzas(): void {
    this.analisisVarianzas = this.articulosDiarios.map(articulo => {
      const stockDisponible = articulo.stock_disponible;
      
      // PASO 1: Obtener el artículo agrupado (la versión que contiene los datos raw de ConteoInventario)
      const articuloAgrupado = this.articulosAgrupados.find(a => a.codigo_articulo === articulo.codigo_articulo);

      let analisis: AnalisisVarianzaArticulo = {
        codigo_articulo: articulo.codigo_articulo,
        nombre_articulo: articulo.descripcion,
        stock_disponible: stockDisponible,
        costo_promedio: articulo.costo_promedio,
        unidad: articulo.unidad,
        
        analisis6_9: { ...this.VARIANZA_BASE },
        analisis10: { ...this.VARIANZA_BASE },
        analisis11: { ...this.VARIANZA_BASE },
        
        conteoFinalAceptado: stockDisponible, 
        diferenciaFinal: 0,
        cantidadFaltanteTotal: 0,
        costoTotalFaltante: 0,
        cantidadSobranteTotal: 0,
        costoTotalSobrante: 0,
        estado: 'No Contado', 
        tipo: 'No Contado'
      };

      let conteo6_9 = 0;
      let reconteo10 = 0;
      let reconteo11 = 0;

      this.gruposAnalisis.forEach(grupo => {
        const dias = grupo.dias; // ['6', '7', '8', '9'] o ['10'] o ['11']
        const prop = grupo.prop;
        
        // PASO 2: Encontrar las fechas reales para este grupo (ej: ['2025-10-06', '2025-10-07'])
        // Se busca el grupo con el día '6-9' o el día individual.
        const grupoFechasObj = this.gruposFechas.find(g => g.dias === (dias.length > 1 ? '6-9' : dias[0])); 
        const fechas = grupoFechasObj ? grupoFechasObj.fechas : [];

        const tieneConteo = fechas.length > 0; 

        if (tieneConteo && articuloAgrupado) {
          
          // PASO 3: LLAMADA CLAVE - Usar la función robusta que utiliza el campo correcto (contada o reconteo)
          const sumaContada = this.getSumaConteosGrupo(articuloAgrupado, fechas);
          
          // PASO 4: Calcular el detalle de varianza
          const diferenciaTotal = sumaContada - stockDisponible;
          const faltante = diferenciaTotal < 0 ? Math.abs(diferenciaTotal) : 0;
          const sobrante = diferenciaTotal > 0 ? diferenciaTotal : 0;
          
          if (prop === 'analisis6_9') conteo6_9 = sumaContada;
          if (prop === 'analisis10') reconteo10 = sumaContada;
          if (prop === 'analisis11') reconteo11 = sumaContada;
          
          analisis[prop] = {
            diferenciaTotal: diferenciaTotal,
            totalContado: sumaContada,
            faltante: faltante,
            sobrante: sobrante,
            observaciones: this.getObservacionesPorDias(articulo, dias)
          };
        }
      });
      
      // Determinación del Conteo Final (la lógica se mantiene correcta aquí)
      const conteoFinalAceptado = this.determinarConteoFinal(conteo6_9, reconteo10, reconteo11, stockDisponible);
      const diferenciaFinal = conteoFinalAceptado - stockDisponible;

      const totalContadoGeneral = conteo6_9 + reconteo10 + reconteo11;
      analisis.tipo = totalContadoGeneral > 0 ? 'Contado' : 'No Contado';

      const cantidadFaltanteTotal = diferenciaFinal < 0 ? Math.abs(diferenciaFinal) : 0;
      const cantidadSobranteTotal = diferenciaFinal > 0 ? diferenciaFinal : 0;
      
      analisis.conteoFinalAceptado = conteoFinalAceptado;
      analisis.diferenciaFinal = diferenciaFinal;
      analisis.cantidadFaltanteTotal = -cantidadFaltanteTotal;
      analisis.costoTotalFaltante = -cantidadFaltanteTotal * articulo.costo_promedio;
      analisis.cantidadSobranteTotal = cantidadSobranteTotal;
      analisis.costoTotalSobrante = cantidadSobranteTotal * articulo.costo_promedio;
      analisis.estado = this.determinarEstado(diferenciaFinal, stockDisponible, cantidadFaltanteTotal, cantidadSobranteTotal);
      
      return analisis;
    });
  }

  tieneConteoEnDias(articulo: ArticuloDiario, dias: string[]): boolean {
    let tieneConteo = false;
    this.fechasUnicas.forEach(fecha => {
      const dia = parseInt(fecha.split('-')[2], 10).toString();
      if (dias.includes(dia)) {
        const conteos = this.getConteosDiariosPorFecha(articulo, fecha);
        if (conteos.length > 0) {
          tieneConteo = true;
        }
      }
    });
    return tieneConteo;
  }
  
  getSumaConteosPorDias(articulo: ArticuloDiario, dias: string[]): number {
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

  getSumaReconteosPorDias(articulo: ArticuloDiario, dias: string[]): number {
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
  
  getDetalleVarianzasPorDias(articulo: ArticuloDiario, dias: string[]): { faltante: number, sobrante: number } {
    const totalContado = dias.includes('10') || dias.includes('11') 
      ? this.getSumaReconteosPorDias(articulo, dias) 
      : this.getSumaConteosPorDias(articulo, dias);
      
    const stockDisponible = articulo.stock_disponible;
    const diferenciaTotal = totalContado - stockDisponible;
    
    return {
      faltante: diferenciaTotal < 0 ? Math.abs(diferenciaTotal) : 0,
      sobrante: diferenciaTotal > 0 ? diferenciaTotal : 0
    };
  }

  getObservacionesPorDias(articulo: ArticuloDiario, dias: string[]): string {
    const observaciones: Set<string> = new Set();
    this.fechasUnicas.forEach(fecha => {
      const dia = parseInt(fecha.split('-')[2], 10).toString();
      if (dias.includes(dia)) {
        const conteos = this.getConteosDiariosPorFecha(articulo, fecha);
        conteos.forEach(conteo => {
          if (conteo.observaciones && conteo.observaciones.trim() !== '' && conteo.observaciones !== 'Sin observaciones') {
            observaciones.add(conteo.observaciones.trim());
          }
        });
      }
    });
    return observaciones.size > 0 ? Array.from(observaciones).join(' | ') : 'Sin observaciones';
  }

  determinarConteoFinal(conteo6_9: number, reconteo10: number, reconteo11: number, stockDisponible: number): number {
    if (reconteo11 > 0) return reconteo11;
    if (reconteo10 > 0) return reconteo10;
    if (conteo6_9 > 0) return conteo6_9;
    return stockDisponible; 
  }

  determinarEstado(diferenciaFinal: number, stockDisponible: number, cantidadFaltanteTotal: number, cantidadSobranteTotal: number): string {
    if (stockDisponible === 0 && diferenciaFinal > 0) {
      return 'Fuera de Inventario (Sobrante)';
    }
    
    if (diferenciaFinal === 0) {
      return 'Conciliado OK';
    } else if (diferenciaFinal < 0) {
      return `Ajuste Faltante (${cantidadFaltanteTotal})`;
    } else {
      return `Ajuste Sobrante (+${cantidadSobranteTotal})`;
    }
  }

  calcularTotalFaltantes(): number {
    return this.analisisVarianzas.reduce((total, item) => {
      return total + Math.abs(item.cantidadFaltanteTotal);
    }, 0);
  }

  calcularTotalSobrantes(): number {
    return this.analisisVarianzas.reduce((total, item) => {
      return total + item.cantidadSobranteTotal;
    }, 0);
  }

  calcularConciliados(): number {
    return this.analisisVarianzas.filter(item => item.estado === 'Conciliado OK').length;
  }

  guardarExcel(buffer: any, fileName: string): void {
    const data: Blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(data);
    downloadLink.download = fileName + '_' + new Date().toLocaleDateString('es-EC').replace(/\//g, '-') + '.xlsx';
    downloadLink.click();
  }

 
  
  exportarAnalisisVarianzas(): void {
    if (this.analisisVarianzas.length === 0) {
      console.warn('No hay datos de análisis de varianzas para exportar.');
      return;
    }

    const headerRow1 = [
      'DATOS DEL ARTÍCULO', '', '', '',
      ...this.gruposAnalisis.flatMap(g => [g.nombre, '', '', '']),
      'RESUMEN FINAL (CONCILIACIÓN)', '', '', '', '', '', ''
    ];

    const headerRow2 = [
      'CÓDIGO', 'ARTÍCULO', 'STOCK DISP.', 'COSTO PROM.', 
      ...this.gruposAnalisis.flatMap(() => [
        'Dif. vs Stock', 'Faltante x C.', 'Sobrante x C.', 'Total Contado'
      ]),
      'Conteo Final Aceptado', 'Dif. Final', 'Cantidad Faltante Total', 'Costo Total Faltante', 'Cantidad Sobrante Total', 'Costo Total Sobrante', 'ESTADO'
    ];

    const data: any[][] = [headerRow1, headerRow2];
    const merges: Range[] = [];
    
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }); 
    let currentCol = 4;
    this.gruposAnalisis.forEach(() => {
      merges.push({ s: { r: 0, c: currentCol }, e: { r: 0, c: currentCol + 3 } });
      currentCol += 4;
    });
    merges.push({ s: { r: 0, c: currentCol }, e: { r: 0, c: currentCol + 6 } }); 
    
    this.analisisVarianzas.forEach(articulo => {
      let row: any[] = [
        articulo.codigo_articulo, articulo.nombre_articulo, articulo.stock_disponible, articulo.costo_promedio
      ];
      
      this.gruposAnalisis.forEach(grupo => {
        const analisis = articulo[grupo.prop];
        row.push(
          analisis.diferenciaTotal,
          analisis.faltante,
          analisis.sobrante,
          analisis.totalContado
        );
      });

      row.push(
        articulo.conteoFinalAceptado,
        articulo.diferenciaFinal,
        articulo.cantidadFaltanteTotal,
        articulo.costoTotalFaltante,
        articulo.cantidadSobranteTotal,
        articulo.costoTotalSobrante,
        articulo.estado
      );

      data.push(row);
    });
    
    const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(data);
    worksheet['!merges'] = merges;
    
    const fixedWidths = [
      { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }
    ];
    const groupWidths = this.gruposAnalisis.flatMap(() => [
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
    ]);
    const summaryWidths = [
      { wch: 18 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 30 }
    ];
    
    worksheet['!cols'] = [...fixedWidths, ...groupWidths, ...summaryWidths];

    const workbook = { Sheets: { 'Analisis Varianzas': worksheet }, SheetNames: ['Analisis Varianzas'] };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    this.guardarExcel(excelBuffer, 'analisis-varianzas-inventario');
  }

  exportarExcelDiario8(): void {
    if (this.articulosDiarios.length === 0) return;

    const subHeaders = ['Fecha/Hora', 'Cantidad', 'Diferencia', 'Usuario', 'Ubicación', 'Observaciones'];
    const fixedHeaders = [
      'Código', 'Artículo', 'Descripción', 'Stock Disp. Sistema', 'Costo Promedio', 'Unidad'
    ];
    const summaryHeaders = [
      'Conteo Días 6-9', 'Dif. Días 6-9', 'Conteo Final Aceptado', 'Dif. Final', 'Estado'
    ];

    let headerRow1: any[] = [...fixedHeaders, ...summaryHeaders];
    headerRow1.push('CONTEOS POR DÍA');
    headerRow1.push(...Array((this.fechasUnicas.length * subHeaders.length) - 1).fill(''));

    let headerRow2: any[] = Array(fixedHeaders.length + summaryHeaders.length).fill('');
    this.fechasUnicas.forEach(fecha => {
      headerRow2.push(`Día ${fecha.split('-')[2]} (${this.formatearFechaCorta(fecha)})`);
      headerRow2.push(...Array(subHeaders.length - 1).fill(''));
    });

    let headerRow3: any[] = Array(fixedHeaders.length + summaryHeaders.length).fill('');
    this.fechasUnicas.forEach(() => {
      headerRow3.push(...subHeaders);
    });

    let data: any[][] = [headerRow1, headerRow2, headerRow3];
    let merges: Range[] = [];
    let currentRow = 3;

    merges.push({ s: { r: 0, c: 0 }, e: { r: 2, c: fixedHeaders.length - 1 } });
    merges.push({ s: { r: 0, c: fixedHeaders.length }, e: { r: 0, c: fixedHeaders.length + summaryHeaders.length - 1 } });
    merges.push({ s: { r: 1, c: fixedHeaders.length }, e: { r: 2, c: fixedHeaders.length } });
    merges.push({ s: { r: 1, c: fixedHeaders.length + 1 }, e: { r: 2, c: fixedHeaders.length + 1 } });
    merges.push({ s: { r: 1, c: fixedHeaders.length + 2 }, e: { r: 2, c: fixedHeaders.length + 2 } });
    merges.push({ s: { r: 1, c: fixedHeaders.length + 3 }, e: { r: 2, c: fixedHeaders.length + 3 } });
    merges.push({ s: { r: 1, c: fixedHeaders.length + 4 }, e: { r: 2, c: fixedHeaders.length + 4 } });
    
    let currentHeaderCol = fixedHeaders.length + summaryHeaders.length;
    merges.push({ s: { r: 0, c: currentHeaderCol }, e: { r: 0, c: currentHeaderCol + (this.fechasUnicas.length * subHeaders.length) - 1 } });
    
    this.fechasUnicas.forEach(() => {
      merges.push({
        s: { r: 1, c: currentHeaderCol },
        e: { r: 1, c: currentHeaderCol + subHeaders.length - 1 }
      });
      currentHeaderCol += subHeaders.length;
    });

    this.articulosDiarios.forEach((articulo) => {
      const stockDisponible = articulo.stock_disponible;
      
      const maxConteosPorDia = this.fechasUnicas.reduce((max, fecha) => {
        const conteos = articulo.conteosPorDia[fecha] || [];
        return Math.max(max, conteos.length);
      }, 1);

      const analysisData = this.calcularAnalisisDiario(articulo, stockDisponible);
      const articuloRowStart = currentRow;

      for (let r = 0; r < maxConteosPorDia; r++) {
        let row: any[] = [];

        if (r === 0) {
          row.push(articulo.codigo_articulo, articulo.nombre_articulo, articulo.descripcion, stockDisponible, articulo.costo_promedio, articulo.unidad);
          row.push(analysisData.conteo6_9, analysisData.dif6_9, analysisData.conteoFinal, analysisData.difFinal, analysisData.estado);
          
          const endRow = articuloRowStart + maxConteosPorDia - 1;
          for (let c = 0; c < fixedHeaders.length + summaryHeaders.length; c++) {
            merges.push({ s: { r: articuloRowStart, c: c }, e: { r: endRow, c: c } });
          }
        } else {
          row.push(...Array(fixedHeaders.length + summaryHeaders.length).fill(''));
        }

        this.fechasUnicas.forEach(fecha => {
          const conteos = articulo.conteosPorDia[fecha] || [];
          const conteo = conteos[r];

          if (conteo) {
            row.push(
              this.formatearFechaHora(conteo.fechaHora),
              conteo.cantidad_contada,
              conteo.diferencia,
              conteo.usuario_contador,
              conteo.ubicacionconteo,
              conteo.observaciones
            );
          } else {
            row.push(...Array(subHeaders.length).fill(''));
          }
        });

        data.push(row);
        currentRow++;
      }
    });

    const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(data);
    worksheet['!merges'] = merges;
    
    const columnWidths = [
      { wch: 15 }, { wch: 30 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 10 }
    ];
    const summaryColWidths = [
      { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 30 }
    ];
    const dailyColWidths = this.fechasUnicas.flatMap(() => [
      { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 20 }, { wch: 30 }
    ]);
    
    worksheet['!cols'] = [...columnWidths, ...summaryColWidths, ...dailyColWidths];

    const workbook = { Sheets: { 'Detalle Conteos Diarios': worksheet }, SheetNames: ['Detalle Conteos Diarios'] };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    this.guardarExcel(excelBuffer, 'detalle-conteos-diarios-inventario');
  }

  private calcularAnalisisDiario(articulo: ArticuloDiario, stockDisponible: number) {
    const periods = { 
      dias6_9: ['6', '7', '8', '9'], 
      dias10: ['10'], 
      dias11: ['11'] 
    };
    
    const checks = {
      tiene6_9: this.tieneConteoEnDias(articulo, periods.dias6_9),
      tiene10: this.tieneConteoEnDias(articulo, periods.dias10),
      tiene11: this.tieneConteoEnDias(articulo, periods.dias11)
    };

    const sums = {
      conteo6_9: checks.tiene6_9 ? this.getSumaConteosPorDias(articulo, periods.dias6_9) : 0,
      reconteo10: checks.tiene10 ? this.getSumaReconteosPorDias(articulo, periods.dias10) : 0,
      reconteo11: checks.tiene11 ? this.getSumaReconteosPorDias(articulo, periods.dias11) : 0
    };

    const dif6_9 = sums.conteo6_9 - stockDisponible;
    const conteoFinal = this.determinarConteoFinal(sums.conteo6_9, sums.reconteo10, sums.reconteo11, stockDisponible);
    const difFinal = conteoFinal - stockDisponible;
    
    const estado = this.determinarEstado(
      difFinal, 
      stockDisponible, 
      difFinal < 0 ? (0 - difFinal) : 0,
      difFinal > 0 ? difFinal : 0
    );

    return {
      conteo6_9: sums.conteo6_9,
      dif6_9: dif6_9,
      conteoFinal: conteoFinal,
      difFinal: difFinal,
      estado: estado
    };
  }

  // ============== MÉTODOS PARA ANÁLISIS DE CAUSAS RAÍZ ==============
  
  // Concentración de pérdidas en top grupos (TRN/MTR)
  getConcentracionTopGrupos(): number {
    const analisisPorGrupo = this.getAnalisisPorGrupo();
    if (analisisPorGrupo.length < 2) return 0;
    
    const top2Grupos = analisisPorGrupo.slice(0, 2);
    const valorTop2 = top2Grupos.reduce((sum, g) => sum + g.valorFaltantes, 0);
    const totalFaltantes = this.getValorTotalFaltantes();
    
    if (totalFaltantes === 0) return 0;
    return (valorTop2 / totalFaltantes) * 100;
  }

  // Valor de pérdidas en top grupos
  getValorTopGruposFaltantes(): number {
    const analisisPorGrupo = this.getAnalisisPorGrupo();
    if (analisisPorGrupo.length < 2) return 0;
    
    const top2Grupos = analisisPorGrupo.slice(0, 2);
    return top2Grupos.reduce((sum, g) => sum + g.valorFaltantes, 0);
  }



  
  // Valor diferencia neta de lubricantes
  getValorLubricantes(): number {
    const analisisPorGrupo = this.getAnalisisPorGrupo();
    const lubGrupo = analisisPorGrupo.find(g => 
      g.grupo.toUpperCase().includes('LUB') || 
      g.grupoNombre.toUpperCase().includes('LUBRICANTE')
    );
    
    if (!lubGrupo) return 0;
    return Math.abs(lubGrupo.valorFaltantes - lubGrupo.valorSobrantes);
  }

  // Cantidad de artículos no registrados (estimado basado en fuera de inventario)
  getArticulosNoRegistrados(): number {
    // Este valor debería venir de conteosFueraInventario si está disponible
    // Por ahora retornamos un valor estimado basado en artículos con tipo "Fuera de Inventario"
    return this.analisisVarianzas.filter(a => a.tipo === 'Fuera de Inventario').length;
  }

  // Valor de artículos no registrados
  getValorNoRegistrados(): number {
    const noRegistrados = this.analisisVarianzas.filter(a => a.tipo === 'Fuera de Inventario');
    return noRegistrados.reduce((sum, item) => {
      return sum + (item.cantidadSobranteTotal * item.costo_promedio);
    }, 0);
  }

  // ============== MÉTODOS PARA CÁLCULOS DE MÉTRICAS DEL INFORME ==============
  
  // Valor total en sistema
 /* getValorTotalSistema(): number {
    return this.articulosDiarios.reduce((total, art) => {
      return total + (art.stock_disponible * art.costo_promedio);
    }, 0);
  }*/

  // Valor físico verificado
  getValorFisicoVerificado(): number {
    return this.articulosDiarios.reduce((total, art) => {
      const analysis = this.calcularAnalisisDiario(art, art.stock_disponible);
      return total + (analysis.conteoFinal * art.costo_promedio);
    }, 0);
  }

  // Diferencia neta en valor
  getDiferenciaNeta(): number {
    return this.getValorFisicoVerificado() - this.getValorTotalSistema();
  }

  // Porcentaje de variación
  getPorcentajeVariacion(): number {
    const valorSistema = this.getValorTotalSistema();
    if (valorSistema === 0) return 0;
    return (this.getDiferenciaNeta() / valorSistema) * 100;
  }

  // Precisión global (artículos conciliados / total)
  getPrecisionGlobal(): number {
    const total = this.analisisVarianzas.length;
    if (total === 0) return 0;
    const conciliados = this.calcularConciliados();
    return (conciliados / total) * 100;
  }

  // Total valor de faltantes
  getValorTotalFaltantes(): number {
    return Math.abs(this.analisisVarianzas.reduce((total, item) => {
      return total + item.costoTotalFaltante;
    }, 0));
  }

  // Total valor de sobrantes
  getValorTotalSobrantes1(): number {
    return this.analisisVarianzas.reduce((total, item) => {
      return total + item.costoTotalSobrante;
    }, 0);
  }

  // Artículos con faltantes
  getArticulosFaltantes(): AnalisisVarianzaArticulo[] {
    return this.analisisVarianzas.filter(item => item.cantidadFaltanteTotal < 0);
  }

  // Artículos con sobrantes
  getArticulosSobrantes(): AnalisisVarianzaArticulo[] {
    return this.analisisVarianzas.filter(item => item.cantidadSobranteTotal > 0);
  }

  // Top N faltantes por valor
  getTopFaltantes(n: number = 15): AnalisisVarianzaArticulo[] {
    return this.getArticulosFaltantes()
      .sort((a, b) => a.costoTotalFaltante - b.costoTotalFaltante)
      .slice(0, n);
  }

  // Top N sobrantes por valor
  getTopSobrantes(n: number = 10): AnalisisVarianzaArticulo[] {
    return this.getArticulosSobrantes()
      .sort((a, b) => b.costoTotalSobrante - a.costoTotalSobrante)
      .slice(0, n);
  }

  // Análisis por grupo de producto
  getAnalisisPorGrupo(): any[] {
    const grupos = new Map<string, any>();
    
    this.articulosDiarios.forEach(art => {
      const grupo = art.grupo || 'SIN GRUPO';
      if (!grupos.has(grupo)) {
        grupos.set(grupo, {
          grupo: grupo,
          grupoNombre: art.grupo || 'Sin Grupo',
          articulosFaltantes: 0,
          unidadesFaltantes: 0,
          valorFaltantes: 0,
          articulosSobrantes: 0,
          unidadesSobrantes: 0,
          valorSobrantes: 0
        });
      }
      
      const grupoData = grupos.get(grupo)!;
      const analisisItem = this.analisisVarianzas.find(a => a.codigo_articulo === art.codigo_articulo);
      
      if (analisisItem) {
        if (analisisItem.cantidadFaltanteTotal < 0) {
          grupoData.articulosFaltantes++;
          grupoData.unidadesFaltantes += Math.abs(analisisItem.cantidadFaltanteTotal);
          grupoData.valorFaltantes += Math.abs(analisisItem.costoTotalFaltante);
        }
        
        if (analisisItem.cantidadSobranteTotal > 0) {
          grupoData.articulosSobrantes++;
          grupoData.unidadesSobrantes += analisisItem.cantidadSobranteTotal;
          grupoData.valorSobrantes += analisisItem.costoTotalSobrante;
        }
      }
    });
    
    return Array.from(grupos.values())
      .filter(g => g.valorFaltantes > 0 || g.valorSobrantes > 0)
      .sort((a, b) => b.valorFaltantes - a.valorFaltantes);
  }

  get gruposSobrantesTop10(): any[] {
  return this.getAnalisisPorGrupo()
    .filter(g => g.valorSobrantes > 0)
    .slice(0, 10);
}

// Si también necesitas uno para faltantes
get gruposFaltantesTop10(): any[] {
  return this.getAnalisisPorGrupo()
    .filter(g => g.valorFaltantes > 0)
    .slice(0, 10);
}

  // Semáforo de estado
  getSemaforoEstado(): { nivel: string, clase: string, mensaje: string } {
    const precision = this.getPrecisionGlobal();
    const variacion = Math.abs(this.getPorcentajeVariacion());
    
    if (precision < 70 || variacion > 5) {
      return {
        nivel: 'CRÍTICO',
        clase: 'critico',
        mensaje: 'Situación Crítica - Acción Inmediata Requerida'
      };
    } else if (precision < 85 || variacion > 2) {
      return {
        nivel: 'ALERTA',
        clase: 'alerta',
        mensaje: 'Alerta Operacional - Requiere Atención'
      };
    } else {
      return {
        nivel: 'BUENO',
        clase: 'bueno',
        mensaje: 'Estado Satisfactorio - Mantener Controles'
      };
    }
  }

  // KPIs del sistema
  getKPIs(): any[] {
    const precision = this.getPrecisionGlobal();
    const varianzaNegativa = (this.getValorTotalFaltantes() / this.getValorTotalSistema()) * 100;
    const varianzaPositiva = (this.getValorTotalSobrantes() / this.getValorTotalSistema()) * 100;
    
    return [
      {
        indicador: 'Precisión de Inventario',
        actual: precision.toFixed(1) + '%',
        meta: '≥ 98%',
        brecha: (precision - 98).toFixed(1) + '%',
        estado: precision >= 98 ? '🟢' : precision >= 85 ? '🟡' : '🔴',
        tendencia: '→'
      },
      {
        indicador: 'Varianza Negativa (Faltantes)',
        actual: '-' + varianzaNegativa.toFixed(2) + '%',
        meta: '≤ 0.5%',
        brecha: '-' + (varianzaNegativa - 0.5).toFixed(2) + '%',
        estado: varianzaNegativa <= 0.5 ? '🟢' : varianzaNegativa <= 2 ? '🟡' : '🔴',
        tendencia: '↓'
      },
      {
        indicador: 'Varianza Positiva (Sobrantes)',
        actual: '+' + varianzaPositiva.toFixed(2) + '%',
        meta: '≤ 0.5%',
        brecha: '+' + (varianzaPositiva - 0.5).toFixed(2) + '%',
        estado: varianzaPositiva <= 0.5 ? '🟢' : varianzaPositiva <= 2 ? '🟡' : '🔴',
        tendencia: '→'
      }
    ];
  }

  // AGREGAR ESTOS MÉTODOS A TU CLASE AlldaysComponent

// ============== MÉTODOS MEJORADOS PARA SOBRANTES ==============

// Artículos con sobrantes DE CONTEO (stock_disponible > 0)
getArticulosSobrantesConteo(): AnalisisVarianzaArticulo[] {
  return this.analisisVarianzas.filter(item => 
    item.cantidadSobranteTotal > 0 && item.stock_disponible > 0
  );
}



// Valor total de sobrantes DE CONTEO
getValorTotalSobrantesConteo(): number {
  return this.getArticulosSobrantesConteo().reduce((total, item) => {
    return total + item.costoTotalSobrante;
  }, 0);
}

// Valor total de sobrantes FUERA DE INVENTARIO
getValorTotalSobrantesFueraInventario(): number {
  return this.getArticulosSobrantesFueraInventario().reduce((total, item) => {
    // Solo sumar si tiene costo válido
    const costo = (item.costo_promedio && item.costo_promedio > 0) ? item.costo_promedio : 0;
    return total + (item.conteoFinalAceptado * costo);
  }, 0);
}

// Top N sobrantes DE CONTEO por valor
getTopSobrantesConteo(n: number = 10): AnalisisVarianzaArticulo[] {
  return this.getArticulosSobrantesConteo()
    .sort((a, b) => b.costoTotalSobrante - a.costoTotalSobrante)
    .slice(0, n);
}

// Top N sobrantes FUERA DE INVENTARIO por valor
getTopSobrantesFueraInventario(n: number = 10): AnalisisVarianzaArticulo[] {
  return this.getArticulosSobrantesFueraInventario()
    .sort((a, b) => {
      const valorA = a.conteoFinalAceptado * a.costo_promedio;
      const valorB = b.conteoFinalAceptado * b.costo_promedio;
      return valorB - valorA;
    })
    .slice(0, n);
}

// Análisis por grupo de sobrantes DE CONTEO
getAnalisisSobrantesConteoPorGrupo(): any[] {
  const grupos = new Map<string, any>();
  
  this.articulosDiarios.forEach(art => {
    const grupo = art.grupo || 'SIN GRUPO';
    const analisisItem = this.analisisVarianzas.find(a => a.codigo_articulo === art.codigo_articulo);
    
    if (analisisItem && analisisItem.cantidadSobranteTotal > 0 && analisisItem.stock_disponible > 0) {
      if (!grupos.has(grupo)) {
        grupos.set(grupo, {
          grupo: grupo,
          grupoNombre: art.grupo || 'Sin Grupo',
          articulosSobrantes: 0,
          unidadesSobrantes: 0,
          valorSobrantes: 0
        });
      }
      
      const grupoData = grupos.get(grupo)!;
      grupoData.articulosSobrantes++;
      grupoData.unidadesSobrantes += analisisItem.cantidadSobranteTotal;
      grupoData.valorSobrantes += analisisItem.costoTotalSobrante;
    }
  });
  
  return Array.from(grupos.values())
    .sort((a, b) => b.valorSobrantes - a.valorSobrantes);
}

// Análisis por grupo de sobrantes FUERA DE INVENTARIO
getAnalisisSobrantesFueraInventarioPorGrupo(): any[] {
  const grupos = new Map<string, any>();
  
  this.articulosDiarios.forEach(art => {
    const grupo = art.grupo || 'SIN GRUPO';
    const analisisItem = this.analisisVarianzas.find(a => a.codigo_articulo === art.codigo_articulo);
    
    if (analisisItem && analisisItem.stock_disponible === 0 && analisisItem.conteoFinalAceptado > 0) {
      if (!grupos.has(grupo)) {
        grupos.set(grupo, {
          grupo: grupo,
          grupoNombre: art.grupo || 'Sin Grupo',
          articulosSobrantes: 0,
          unidadesSobrantes: 0,
          valorSobrantes: 0
        });
      }
      
      const grupoData = grupos.get(grupo)!;
      grupoData.articulosSobrantes++;
      grupoData.unidadesSobrantes += analisisItem.conteoFinalAceptado;
      grupoData.valorSobrantes += (analisisItem.conteoFinalAceptado * analisisItem.costo_promedio);
    }
  });
  
  return Array.from(grupos.values())
    .sort((a, b) => b.valorSobrantes - a.valorSobrantes);
}

// Total de unidades sobrantes DE CONTEO
calcularTotalSobrantesConteo(): number {
  return this.getArticulosSobrantesConteo().reduce((total, item) => {
    return total + item.cantidadSobranteTotal;
  }, 0);
}

// Total de unidades sobrantes FUERA DE INVENTARIO
calcularTotalSobrantesFueraInventario(): number {
  return this.getArticulosSobrantesFueraInventario().reduce((total, item) => {
    return total + item.conteoFinalAceptado;
  }, 0);
}

// ACTUALIZAR EL MÉTODO getValorTotalSobrantes() EXISTENTE
getValorTotalSobrantes(): number {
  // Ahora suma ambos tipos de sobrantes
  return this.getValorTotalSobrantesConteo() + this.getValorTotalSobrantesFueraInventario();
}

// ACTUALIZAR EL MÉTODO calcularTotalSobrantes() EXISTENTE
calcularTotalSobrantes1(): number {
  // Ahora suma ambos tipos de sobrantes
  return this.calcularTotalSobrantesConteo() + this.calcularTotalSobrantesFueraInventario();
}

// ACTUALIZAR EL MÉTODO getArticulosSobrantes() EXISTENTE (OPCIONAL - mantener para compatibilidad)
getArticulosSobrantes1(): AnalisisVarianzaArticulo[] {
  // Retorna TODOS los sobrantes (conteo + fuera de inventario)
  return [...this.getArticulosSobrantesConteo(), ...this.getArticulosSobrantesFueraInventario()];
}

// Getter para la vista HTML
get gruposSobrantesConteoTop10(): any[] {
  return this.getAnalisisSobrantesConteoPorGrupo().slice(0, 10);
}

get gruposSobrantesFueraInventarioTop10(): any[] {
  return this.getAnalisisSobrantesFueraInventarioPorGrupo().slice(0, 10);
}

// ============== MÉTODOS PARA GENERAR PLAN DE MEJORA DINÁMICO ==============

// Generar recomendaciones de corto plazo basadas en análisis
getRecomendacionesCortoplazo(): any[] {
  const recomendaciones: any[] = [];
  const precision = this.getPrecisionGlobal();
  const topFaltantes = this.getTopFaltantes(5);
  const valorFaltantes = this.getValorTotalFaltantes();
  const valorNoRegistrados = this.getValorTotalSobrantesFueraInventario();
  const articulosNoRegistrados = this.getArticulosSobrantesFueraInventario().length;

  // Recomendación 1: Doble conteo para artículos de alto valor
  const articulosAltoValor = this.analisisVarianzas.filter(a => 
    (a.costo_promedio * Math.abs(a.stock_disponible)) > 500 && a.diferenciaFinal !== 0
  ).length;
  
  if (articulosAltoValor > 0) {
    recomendaciones.push({
      icon: 'bi-check2-circle',
      titulo: 'Implementación de doble conteo',
      descripcion: `${articulosAltoValor} artículos con valor superior a $500 requieren verificación adicional`,
      prioridad: valorFaltantes > 10000 ? 'alta' : 'media'
    });
  }

  // Recomendación 2: Capacitación del personal
  if (precision < 90) {
    const contadores = new Set<string>();
    this.conteos.forEach(c => {
      if (c.usuario_contador) contadores.add(c.usuario_contador);
    });
    
    recomendaciones.push({
      icon: 'bi-people-fill',
      titulo: 'Capacitación intensiva del personal',
      descripcion: `${contadores.size} usuarios requieren formación en procedimientos de conteo (precisión actual: ${precision.toFixed(1)}%)`,
      prioridad: 'alta'
    });
  }

  // Recomendación 3: Reorganización física según grupos críticos
  const gruposCriticos = this.getAnalisisPorGrupo().filter(g => 
    g.valorFaltantes > 0 && (g.valorFaltantes / this.getValorTotalFaltantes() * 100) > 15
  );
  
  if (gruposCriticos.length > 0) {
    recomendaciones.push({
      icon: 'bi-grid-3x3-gap-fill',
      titulo: 'Reorganización física del almacén',
      descripcion: `${gruposCriticos.length} grupos críticos (${gruposCriticos.map(g => g.grupo).join(', ')}) requieren mejor ubicación y señalización`,
      prioridad: 'alta'
    });
  }

  // Recomendación 4: Control de lubricantes si hay variación
  const lubricantes = this.analisisVarianzas.filter(a => 
    a.nombre_articulo.toUpperCase().includes('LUBRICANTE') ||
    a.nombre_articulo.toUpperCase().includes('ACEITE') ||
    a.nombre_articulo.toUpperCase().includes('GRASA')
  );
  
  const lubConProblemas = lubricantes.filter(l => l.diferenciaFinal !== 0);
  
  if (lubConProblemas.length > 0) {
    recomendaciones.push({
      icon: 'bi-droplet-fill',
      titulo: 'Sistema de control mejorado para lubricantes',
      descripcion: `${lubConProblemas.length} productos líquidos con diferencias requieren medición volumétrica precisa`,
      prioridad: 'media'
    });
  }

  // Recomendación 5: Actualización de políticas
  const diferenciasGrandes = this.analisisVarianzas.filter(a => 
    Math.abs(a.diferenciaFinal / a.stock_disponible * 100) > 20 && a.stock_disponible > 0
  ).length;
  
  if (diferenciasGrandes > 5) {
    recomendaciones.push({
      icon: 'bi-arrow-repeat',
      titulo: 'Revisión y actualización de políticas',
      descripcion: `${diferenciasGrandes} artículos con variaciones >20% indican necesidad de revisar procesos de entrada/salida`,
      prioridad: 'alta'
    });
  }

  // Recomendación 6: Códigos QR para trazabilidad
  const articulosAltoRiesgo = topFaltantes.slice(0, 20).length;
  
  if (articulosAltoRiesgo > 10) {
    recomendaciones.push({
      icon: 'bi-qr-code',
      titulo: 'Implementación de códigos QR',
      descripcion: `Top ${articulosAltoRiesgo} artículos con mayores pérdidas necesitan trazabilidad mejorada`,
      prioridad: 'media'
    });
  }

  // Recomendación 7: Ajuste contable (siempre necesario si hay diferencias)
  if (Math.abs(this.getDiferenciaNeta()) > 100) {
    recomendaciones.push({
      icon: 'bi-calculator',
      titulo: 'Ajuste contable formal del inventario',
      descripcion: `Diferencia neta de ${this.getDiferenciaNeta().toLocaleString('es-EC', {style: 'currency', currency: 'USD'})} requiere regularización inmediata`,
      prioridad: 'alta'
    });
  }

  // Recomendación 8: Registro de artículos no catalogados
  if (articulosNoRegistrados > 0) {
    recomendaciones.push({
      icon: 'bi-box-seam',
      titulo: 'Registro de artículos no catalogados',
      descripcion: `${articulosNoRegistrados} artículos encontrados físicamente (valor: ${valorNoRegistrados.toLocaleString('es-EC', {style: 'currency', currency: 'USD'})}) deben incorporarse al sistema`,
      prioridad: 'critica'
    });
  }

  return recomendaciones;
}

// Generar iniciativas estratégicas basadas en magnitud del problema
getIniciativasEstrategicas(): any[] {
  const iniciativas: any[] = [];
  const valorSistema = this.getValorTotalSistema();
  const valorFaltantes = this.getValorTotalFaltantes();
  const precision = this.getPrecisionGlobal();
  const porcentajePerdida = (valorFaltantes / valorSistema) * 100;

  // Iniciativa 1: Sistema RFID para artículos críticos
  const articulosAltoValor = this.analisisVarianzas.filter(a => 
    a.costo_promedio > 1000 && Math.abs(a.diferenciaFinal) !== 0
  ).length;
  
  if (articulosAltoValor > 0) {
    const inversionEstimada = Math.min(articulosAltoValor * 50, 50000);
    const ahorroAnual = valorFaltantes * 0.6; // Asumiendo reducción del 60% en pérdidas
    const mesesROI = Math.ceil((inversionEstimada / ahorroAnual) * 12);
    
    iniciativas.push({
      nombre: 'Sistema RFID',
      descripcion: `Implementación para ${articulosAltoValor} componentes de alto valor (>${'$1,000'})`,
      inversion: inversionEstimada,
      roi: `${mesesROI} meses`,
      roiNumerico: mesesROI,
      justificacion: `Reducción estimada del 60% en pérdidas de artículos de alto valor`
    });
  }

  // Iniciativa 2: WMS (Warehouse Management System)
  if (this.analisisVarianzas.length > 500 || precision < 85) {
    const inversionWMS = 85000;
    const ahorroOperativo = (valorSistema * 0.02); // 2% de eficiencia operativa
    const mesesROI = Math.ceil((inversionWMS / ahorroOperativo) * 12);
    
    iniciativas.push({
      nombre: 'WMS Integration',
      descripcion: `Sistema de gestión de almacenes integrado para ${this.analisisVarianzas.length} SKUs`,
      inversion: inversionWMS,
      roi: `${mesesROI} meses`,
      roiNumerico: mesesROI,
      justificacion: `Mejora de precisión del ${precision.toFixed(1)}% al 98%+`
    });
  }

  // Iniciativa 3: Auditorías Cíclicas
  const inversionAuditoria = 12000;
  const beneficioPrevencion = valorFaltantes * 0.4; // 40% de prevención
  
  iniciativas.push({
    nombre: 'Auditorías Cíclicas',
    descripcion: `Programa mensual rotativo por categoría (${this.getAnalisisPorGrupo().length} grupos)`,
    inversion: inversionAuditoria,
    roi: 'Inmediato',
    roiNumerico: 0,
    justificacion: `Prevención de ${beneficioPrevencion.toLocaleString('es-EC', {style: 'currency', currency: 'USD'})} en pérdidas anuales`
  });

  // Iniciativa 4: Capacitación Continua
  const usuariosUnicos = new Set(this.conteos.map(c => c.usuario_contador)).size;
  const inversionCapacitacion = Math.max(usuariosUnicos * 400, 8000);
  
  iniciativas.push({
    nombre: 'Capacitación Continua',
    descripcion: `Programa trimestral de actualización para ${usuariosUnicos} usuarios`,
    inversion: inversionCapacitacion,
    roi: '3 meses',
    roiNumerico: 3,
    justificacion: `Reducción de errores humanos estimada en 50%`
  });

  // Iniciativa 5: Sistema de Control de Accesos (si las pérdidas son muy altas)
  if (porcentajePerdida > 3) {
    iniciativas.push({
      nombre: 'Control de Accesos',
      descripcion: 'Sistema biométrico y cámaras de seguridad en áreas críticas',
      inversion: 35000,
      roi: '9 meses',
      roiNumerico: 9,
      justificacion: `Pérdidas actuales del ${porcentajePerdida.toFixed(2)}% indican necesidad de seguridad adicional`
    });
  }

  return iniciativas.sort((a, b) => a.roiNumerico - b.roiNumerico);
}

// Obtener clase CSS según prioridad
getPrioridadClase(prioridad: string): string {
  switch(prioridad) {
    case 'critica': return 'prioridad-critica';
    case 'alta': return 'prioridad-alta';
    case 'media': return 'prioridad-media';
    default: return 'prioridad-baja';
  }
}

// Obtener icono según ROI
getRoiClase(roi: string): string {
  if (roi.toLowerCase().includes('inmediato')) return 'roi-inmediato';
  const meses = parseInt(roi);
  if (meses <= 3) return 'roi-3';
  if (meses <= 6) return 'roi-6';
  return 'roi-8';
}


// MÃ‰TODO NECESARIO PARA EL HTML
  obtenerFechaActual(): string {
    const hoy = new Date();
    const dia = String(hoy.getDate()).padStart(2, '0');
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const anio = hoy.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  // MÃTODOS PARA INFORMACIÃN GENERAL DEL INVENTARIO
  getNombreBodega(): string {
    if (this.conteos.length > 0) {
      return this.conteos[0].nombre_agencia || 'BODEGA NO IDENTIFICADA';
    }
    return 'CARGANDO...';
  }

  getCodigoInventario(): string {
    const anio = new Date().getFullYear();
    return `00${this.agenciaId}-${anio}`;
  }

  getPeriodoFiscal(): string {
    return new Date().getFullYear().toString();
  }

  getFechaAnalisis(): string {
    if (this.fechasUnicas.length > 0) {
      // Obtener la última fecha de conteo
      const ultimaFecha = this.fechasUnicas[this.fechasUnicas.length - 1];
      return this.formatearFechaCorta(ultimaFecha);
    }
    return this.obtenerFechaActual();
  }

  getDiasConteo(): string {
    if (this.fechasUnicas.length > 0) {
      const dias = this.fechasUnicas.length;
      return `${dias} ${dias === 1 ? 'día' : 'días'} ${dias > 1 ? 'consecutivos' : ''}`;
    }
    return 'No disponible';
  }

  getMetodoConteo(): string {
    const gruposDias = this.gruposFechas.map(g => g.nombre).join(', ');
    if (gruposDias) {
      return `Triple Verificación: Conteo Principal (Días ${gruposDias})`;
    }
    return 'Conteo múltiple con verificación';
  }
/*
  getResponsablesConteo(): string {
    if (this.conteos.length > 0) {
      const responsables = new Set<string>();
      this.conteos.forEach(c => {
        if (c.usuario_contador) {
          responsables.add(c.usuario_contador.toUpperCase());
        }
      });
      return Array.from(responsables).join(', ') || 'No especificado';
    }
    return 'Información no disponible';
  }*/

    
// ============================================================
// MEJORA 1: ASIGNAR "CARLOS MARTÃNEZ" EN LUGAR DE "SIN ASIGNAR"
// ============================================================

/**
 * REEMPLAZAR EL MÃTODO getResponsablesConteo() EXISTENTE
 */
getResponsablesConteo(): string {
  if (this.conteos.length > 0) {
    const responsables = new Set<string>();
    
    this.conteos.forEach(c => {
      if (c.usuario_contador && c.usuario_contador.trim() !== '') {
        // Si el usuario es "sin asignar" (cualquier variación), usar Carlos Martínez
        const usuario = c.usuario_contador.trim().toLowerCase();
        
        if (usuario === 'sin asignar' || 
            usuario === 'sinasignar' || 
            usuario === 'sin_asignar' ||
            usuario === 'no asignado' ||
            usuario === '') {
          responsables.add('carlosm');
        } else {
          responsables.add(c.usuario_contador.toUpperCase());
        }
      } else {
        // Si está vacío, también asignar a Carlos Martínez
        responsables.add('carlosm');
      }
    });
    
    return Array.from(responsables).join(', ') || 'carlosm';
  }
  
  return 'carlosm';
}


  getRangoDiasConteo(): string {
    if (this.fechasUnicas.length > 0) {
      const primeraFecha = this.fechasUnicas[0];
      const ultimaFecha = this.fechasUnicas[this.fechasUnicas.length - 1];
      
      const primerDia = parseInt(primeraFecha.split('-')[2]);
      const ultimoDia = parseInt(ultimaFecha.split('-')[2]);
      
      if (primerDia === ultimoDia) {
        return `Día ${primerDia}`;
      }
      return `Días ${6}-${ultimoDia}`;
    }
    return 'No disponible';
  }
// Calcular inversión total de iniciativas estratégicas
getInversionTotalEstrategica(): number {
  return this.getIniciativasEstrategicas().reduce((sum, i) => sum + i.inversion, 0);
}

// Calcular ahorro potencial anual
getAhorroPotencialAnual(): number {
  return this.getValorTotalFaltantes() * 0.6; // 60% de reducción estimada
}


// ============== MÉTODOS PARA CÁLCULOS DE MÉTRICAS DEL INFORME ==============
  
  // Valor total en sistema (SOLO STOCK DISPONIBLE)
  getValorTotalSistema(): number {
    return this.articulosDiarios.reduce((total, art) => {
      return total + (art.stock_disponible * art.costo_promedio);
    }, 0);
  }

  // Valor total stock reservado
  getValorTotalStockReservado(): number {
    return this.articulosDiarios.reduce((total, art) => {
      return total + (art.stock_reservado * art.costo_promedio);
    }, 0);
  }

  // Valor total completo (disponible + reservado)
  getValorTotalCompleto(): number {
    return this.articulosDiarios.reduce((total, art) => {
      return total + ((art.stock_disponible + art.stock_reservado) * art.costo_promedio);
    }, 0);
  }

  // Stock total en unidades (disponible + reservado)
  getStockTotalUnidades(): number {
    return this.articulosDiarios.reduce((total, art) => {
      return total + art.stock_disponible + art.stock_reservado;
    }, 0);
  }

  // Stock disponible en unidades
  getStockDisponibleUnidades(): number {
    return this.articulosDiarios.reduce((total, art) => {
      return total + art.stock_disponible;
    }, 0);
  }

  // Stock reservado en unidades
  getStockReservadoUnidades(): number {
    return this.articulosDiarios.reduce((total, art) => {
      return total + art.stock_reservado;
    }, 0);
  }

  // Porcentaje de stock reservado
  getPorcentajeStockReservado(): number {
    const total = this.getStockTotalUnidades();
    if (total === 0) return 0;
    return (this.getStockReservadoUnidades() / total) * 100;
  }

  // alldays.component.ts (Asume una interfaz ArticuloFueraDeSistema similar a ArticuloAgrupado)

// Lista de artículos fuera de inventario. Necesitas llenar esta propiedad.
// articulosFueraDeInventario: ArticuloFueraDeSistema[] = []; 

// Retorna la lista de artículos Fuera de Inventario
getArticulosFueraDeInventario(): any[] {
    // Implementa la lógica para devolver solo los artículos fuera de inventario.
    // Ejemplo: return this.articulosFueraDeInventario;
    return []; // Placeholder
}

// Retorna el total de unidades de artículos Fuera de Inventario
calcularTotalFueraDeInventario(): number {
    return this.getArticulosFueraDeInventario().reduce((total, art) => {
        // Asumiendo que tienen una propiedad 'cantidad_contada' y un 'costo_promedio' o 'costo_calculado'
        return total + (art.cantidad_contada || 0); 
    }, 0);
}

// Retorna el valor total de artículos Fuera de Inventario
getValorTotalFueraDeInventario(): number {
    return this.getArticulosFueraDeInventario().reduce((total, art) => {
        // Se multiplica la cantidad contada por el costo promedio (o un costo de referencia)
        return total + ((art.cantidad_contada || 0) * (art.costo_promedio || 0));
    }, 0);
}

getValorStockDisponible(): number {
    return this.articulosDiarios.reduce((total, art) => {
      // Usamos el stock disponible multiplicado por el costo promedio.
      return total + (art.stock_disponible * art.costo_promedio);
    }, 0);
  }

  getValorStockReservado(): number {
    return this.articulosDiarios.reduce((total, art) => {
      // Usamos el stock reservado multiplicado por el costo promedio.
      return total + (art.stock_reservado * art.costo_promedio);
    }, 0);
  }

getCantidadArticulosFDISinValorar(): number {
  return this.getArticulosSobrantesFueraInventario().filter(item => {
    // Solo verificar si NO tiene costo promedio válido en el registro principal
    return !item.costo_promedio || item.costo_promedio <= 0;
  }).length;
}



getMensajeAdvertenciaFDI(): string {
  const cantidadSinCosto = this.getCantidadArticulosFDISinValorar();
  
  if (cantidadSinCosto === 0) {
    return ''; // No mostrar nada si todos tienen costo
  }
  
  const totalFDI = this.getArticulosSobrantesFueraInventario().length;
  const articulos = cantidadSinCosto === 1 ? 'artículo' : 'artículos';
  const porcentaje = ((cantidadSinCosto / totalFDI) * 100).toFixed(1);
  
  if (cantidadSinCosto === totalFDI) {
    // Caso extremo: TODOS sin costo (muy raro)
    return `⚠️ CRÍTICO: Los ${cantidadSinCosto} artículos fuera de inventario NO tienen costo registrado en sistema. Requieren valoración manual urgente.`;
  } else {
    // Caso normal: solo algunos sin costo
    return `⚠️ ADVERTENCIA: ${cantidadSinCosto} de ${totalFDI} ${articulos} (${porcentaje}%) no tienen costo registrado en sistema. El valor total es parcial y requiere verificación.`;
  }
}

getCodigosArticulosFDISinCosto(): string[] {
  return this.getArticulosSobrantesFueraInventario()
    .filter(item => !item.costo_promedio || item.costo_promedio <= 0)
    .map(item => item.codigo_articulo);
}


todosFDITienenCosto(): boolean {
  return this.getCantidadArticulosFDISinValorar() === 0;
}

getEstadisticasValoracionFDI(): {
  total: number;
  conCosto: number;
  sinCosto: number;
  valorValorado: number;
  unidadesSinValorar: number;
} {
  const todosFDI = this.getArticulosSobrantesFueraInventario();
  const conCosto = todosFDI.filter(item => item.costo_promedio && item.costo_promedio > 0);
  const sinCosto = todosFDI.filter(item => !item.costo_promedio || item.costo_promedio <= 0);
  
  const valorValorado = conCosto.reduce((sum, item) => 
    sum + (item.conteoFinalAceptado * item.costo_promedio), 0
  );
  
  const unidadesSinValorar = sinCosto.reduce((sum, item) => 
    sum + item.conteoFinalAceptado, 0
  );
  
  return {
    total: todosFDI.length,
    conCosto: conCosto.length,
    sinCosto: sinCosto.length,
    valorValorado: valorValorado,
    unidadesSinValorar: unidadesSinValorar
  };
}
/*
tieneConstoValido(item: AnalisisVarianzaArticulo): boolean {
  // Buscar el artículo completo con todos sus campos de costo
  const artDiario = this.articulosDiarios.find(a => a.codigo_articulo === item.codigo_articulo);
  
  if (!artDiario) {
    return item.costo_promedio !== null && 
           item.costo_promedio !== undefined && 
           item.costo_promedio > 0;
  }
  
  // Verificar TODOS los campos de costo disponibles
  return (artDiario.costo_promedio && artDiario.costo_promedio > 0) ||
         (artDiario.costo_uni && artDiario.costo_uni > 0) ||
         (artDiario.fob && artDiario.fob > 0) ||
         (artDiario.costo_total && artDiario.costo_total > 0);
}*/

/**
 * Obtener el mejor costo disponible con fallback inteligente
 * PRIORIDAD: costo_promedio > costo_uni > fob > costo_total/cantidad
 */

/*getCostoConFallback(codigoArticulo: string): number {
  const artDiario = this.articulosDiarios.find(a => a.codigo_articulo === codigoArticulo);
  
  if (!artDiario) {
    console.warn(`[getCostoConFallback] No se encontró artículo: ${codigoArticulo}`);
    return 0;
  }
  
  // PRIORIDAD 1: Costo Promedio (más confiable)
  if (artDiario.costo_promedio && artDiario.costo_promedio > 0) {
    return artDiario.costo_promedio;
  }
  
  // PRIORIDAD 2: Costo Unitario
  if (artDiario.costo_uni && artDiario.costo_uni > 0) {
    console.info(`[getCostoConFallback] Usando costo_uni para ${codigoArticulo}`);
    return artDiario.costo_uni;
  }
  
  // PRIORIDAD 3: FOB (Free On Board - precio de compra)
  if (artDiario.fob && artDiario.fob > 0) {
    console.info(`[getCostoConFallback] Usando FOB para ${codigoArticulo}`);
    return artDiario.fob;
  }
  
  // PRIORIDAD 4: Costo Total / Stock (última opción)
  if (artDiario.costo_total && artDiario.costo_total > 0 && 
      artDiario.stock > 0) {
    const costoCalculado = artDiario.costo_total / artDiario.stock;
    console.info(`[getCostoConFallback] Calculando costo desde costo_total para ${codigoArticulo}: ${costoCalculado}`);
    return costoCalculado;
  }
  
  console.warn(`[getCostoConFallback] No se encontró ningún costo válido para ${codigoArticulo}`);
  return 0;
}
*/
/**
 * Obtener el mejor costo para un item de análisis
 * Usa SIEMPRE el artículo diario completo para acceder a TODOS los campos
 */
getMejorCostoParaItem(item: AnalisisVarianzaArticulo): number {
  // Si el item ya tiene costo promedio válido, usarlo
  if (item.costo_promedio && item.costo_promedio > 0) {
    return item.costo_promedio;
  }
  
  // Sino, buscar en artículos diarios con fallback completo
  return this.getCostoConFallback(item.codigo_articulo);
}

/**
 * Obtener descripción detallada del origen del costo
 */
/*
getOrigenCosto(codigoArticulo: string): string {
  const artDiario = this.articulosDiarios.find(a => a.codigo_articulo === codigoArticulo);
  
  if (!artDiario) {
    return 'Artículo No Encontrado';
  }
  
  if (artDiario.costo_promedio && artDiario.costo_promedio > 0) {
    return 'Costo Promedio Sistema';
  }
  if (artDiario.costo_uni && artDiario.costo_uni > 0) {
    return 'Costo Unitario Registrado';
  }
  if (artDiario.fob && artDiario.fob > 0) {
    return 'FOB (Precio Compra)';
  }
  if (artDiario.costo_total && artDiario.costo_total > 0 && artDiario.stock > 0) {
    return 'Calculado desde Costo Total';
  }
  
  return 'Sin Costo Disponible';
}
*/
/**
 * Obtener estructura detallada de costos disponibles para un artículo
 * Útil para debugging y reportes
 */
 CostosArticulo(codigoArticulo: string): {
  articulo: string;
  costoPromedio: number;
  costoUnitario: number;
  fob: number;
  costoTotal: number;
  stock: number;
  costoCalculado: number;
  mejorCosto: number;
  origenMejorCosto: string;
} {
  const artDiario = this.articulosDiarios.find(a => a.codigo_articulo === codigoArticulo);
  
  if (!artDiario) {
    return {
      articulo: codigoArticulo,
      costoPromedio: 0,
      costoUnitario: 0,
      fob: 0,
      costoTotal: 0,
      stock: 0,
      costoCalculado: 0,
      mejorCosto: 0,
      origenMejorCosto: 'No Encontrado'
    };
  }
  
  const costoCalculado = (artDiario.costo_total && artDiario.stock > 0) 
    ? artDiario.costo_total / artDiario.stock 
    : 0;
  
  return {
    articulo: codigoArticulo,
    costoPromedio: artDiario.costo_promedio || 0,
    costoUnitario: artDiario.costo_uni || 0,
    fob: artDiario.fob || 0,
    costoTotal: artDiario.costo_total || 0,
    stock: artDiario.stock || 0,
    costoCalculado: costoCalculado,
    mejorCosto: this.getCostoConFallback(codigoArticulo),
    origenMejorCosto: this.getOrigenCosto(codigoArticulo)
  };
}

  // Métodos stub para otras exportaciones
  exportarExcel(): void {
    console.log('Exportar Excel básico - Por implementar');
  }

  exportarExcel1(): void {
    console.log('Exportar Excel por fechas - Por implementar');
  }

  exportarExcelAgrupado(): void {
    console.log('Exportar Excel agrupado - Por implementar');
  }

  cargarConteosFueraInventario(): void {
    this.loadingFueraInventario = true;
    // Implementar lógica de carga si es necesario
    this.loadingFueraInventario = false;
  }



// ArtÃ­culos FUERA DE INVENTARIO (stock_disponible = 0 pero se encontraron fÃ­sicamente)
getArticulosSobrantesFueraInventario(): AnalisisVarianzaArticulo[] {
  return this.analisisVarianzas.filter(item => 
    item.stock_disponible === 0 && item.conteoFinalAceptado > 0
  );
}

// Validar si un artículo FDI tiene costo válido
tieneConstoValido(item: AnalisisVarianzaArticulo): boolean {
  return item.costo_promedio !== null && 
         item.costo_promedio !== undefined && 
         item.costo_promedio > 0;
}

// Obtener costo con fallback (intenta obtener de artículos diarios)
getCostoConFallback(codigoArticulo: string): number {
  // Buscar en artículos diarios por si tiene más info
  const artDiario = this.articulosDiarios.find(a => a.codigo_articulo === codigoArticulo);
  
  if (artDiario) {
    // Intentar diferentes fuentes de costo
    if (artDiario.costo_promedio && artDiario.costo_promedio > 0) {
      return artDiario.costo_promedio;
    }
    if (artDiario.costo_uni && artDiario.costo_uni > 0) {
      return artDiario.costo_uni;
    }
    if (artDiario.fob && artDiario.fob > 0) {
      return artDiario.fob;
    }
  }
  
  return 0; // No se encontró costo
}

// Obtener descripción del origen del costo
getOrigenCosto(codigoArticulo: string): string {
  const artDiario = this.articulosDiarios.find(a => a.codigo_articulo === codigoArticulo);
  
  if (artDiario) {
    if (artDiario.costo_promedio && artDiario.costo_promedio > 0) return 'Costo Promedio';
    if (artDiario.costo_uni && artDiario.costo_uni > 0) return 'Costo Unitario';
    if (artDiario.fob && artDiario.fob > 0) return 'FOB';
  }
  
  return 'Sin Costo';
}

// Obtener artículos FDI SIN costo registrado
getArticulosFDISinCosto(): AnalisisVarianzaArticulo[] {
  return this.getArticulosSobrantesFueraInventario().filter(item => 
    !this.tieneConstoValido(item)
  );
}

// Obtener artículos FDI CON costo registrado
getArticulosFDIConCosto(): AnalisisVarianzaArticulo[] {
  return this.getArticulosSobrantesFueraInventario().filter(item => 
    this.tieneConstoValido(item)
  );
}




  exportarPDF(): void {
  // Mostrar indicador de carga
  const loadingDiv = document.createElement('div');
  loadingDiv.innerHTML = `
    <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 9999;">
      <div style="text-align: center;">
        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">Generando PDF...</span>
        </div>
        <p style="margin-top: 20px; font-size: 16px; font-weight: 600;">Generando PDF...</p>
        <p style="color: #666; font-size: 14px;">Este proceso puede tardar unos momentos</p>
      </div>
    </div>
    <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                background: rgba(0,0,0,0.5); z-index: 9998;"></div>
  `;
  document.body.appendChild(loadingDiv);

  // Esperar un momento para que se renderice el loading
  setTimeout(() => {
    const element = document.querySelector('.container-fluid') as HTMLElement;
    
    if (!element) {
      console.error('No se encontró el contenedor principal');
      document.body.removeChild(loadingDiv);
      return;
    }

    // Configuración de html2canvas
    html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      scrollY: -window.scrollY,
      scrollX: -window.scrollX,
      backgroundColor: '#ffffff'
    } as any).then(canvas => {
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Crear PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');

      // Agregar primera página
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Agregar páginas adicionales si es necesario
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Generar nombre de archivo
      const fecha = new Date().toLocaleDateString('es-EC').replace(/\//g, '-');
      const nombreArchivo = `Informe-Inventario-${this.getNombreBodega()}-${fecha}.pdf`;

      // Guardar PDF
      pdf.save(nombreArchivo);

      // Remover loading
      document.body.removeChild(loadingDiv);

      // Mostrar mensaje de éxito
      this.mostrarMensajeExito('PDF generado exitosamente');
    }).catch(error => {
      console.error('Error al generar PDF:', error);
      document.body.removeChild(loadingDiv);
      this.mostrarMensajeError('Error al generar el PDF. Por favor, intente nuevamente.');
    });
  }, 100);
}

/**
 * Exportar a HTML interactivo completo
 */
exportarHTML(): void {
  const element = document.querySelector('.container-fluid') as HTMLElement;
  
  if (!element) {
    console.error('No se encontró el contenedor principal');
    return;
  }

  // Clonar el elemento
  const clonedElement = element.cloneNode(true) as HTMLElement;

  // Obtener todos los estilos CSS del documento
  const styles = Array.from(document.styleSheets)
    .map(styleSheet => {
      try {
        return Array.from(styleSheet.cssRules)
          .map(rule => rule.cssText)
          .join('\n');
      } catch (e) {
        console.warn('No se pudieron obtener estilos de:', styleSheet.href);
        return '';
      }
    })
    .join('\n');

  // Obtener Bootstrap CSS
  const bootstrapLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .filter(link => link.getAttribute('href')?.includes('bootstrap'))
    .map(link => `<link rel="stylesheet" href="${link.getAttribute('href')}">`);

  // Obtener Bootstrap Icons
  const iconLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .filter(link => link.getAttribute('href')?.includes('bootstrap-icons'))
    .map(link => `<link rel="stylesheet" href="${link.getAttribute('href')}">`);

  // Crear estructura HTML completa
  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Informe de Inventario Físico - ${this.getNombreBodega()} - ${this.obtenerFechaActual()}</title>
    
    ${bootstrapLinks.join('\n    ')}
    ${iconLinks.join('\n    ')}
    
    <style>
        ${styles}
        
        @media print {
            .btn-export, .export-buttons-group {
                display: none !important;
            }
            body {
                background: white;
            }
            .section-card {
                page-break-inside: avoid;
            }
            @page {
                margin: 2cm;
            }
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f8f9fa;
        }
        
        .container-fluid {
            max-width: 100%;
            padding: 20px;
        }
    </style>
</head>
<body>
    ${clonedElement.outerHTML}
    
    <script>
        function imprimirDocumento() {
            window.print();
        }
        
        window.addEventListener('DOMContentLoaded', function() {
            const printBtn = document.createElement('button');
            printBtn.innerHTML = '<i class="bi bi-printer-fill"></i> Imprimir';
            printBtn.className = 'btn btn-primary';
            printBtn.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; padding: 12px 24px; font-size: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
            printBtn.onclick = imprimirDocumento;
            document.body.appendChild(printBtn);
        });
    </script>
</body>
</html>
  `;

  // Crear y descargar archivo
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const fecha = new Date().toLocaleDateString('es-EC').replace(/\//g, '-');
  link.download = `Informe-Inventario-${this.getNombreBodega()}-${fecha}.html`;
  link.href = url;
  link.click();
  
  URL.revokeObjectURL(url);
  this.mostrarMensajeExito('HTML generado exitosamente');
}

/**
 * Exportar a HTML portable (con estilos inline)
 */
exportarHTMLPortable(): void {
  const element = document.querySelector('.container-fluid') as HTMLElement;
  
  if (!element) {
    console.error('No se encontró el contenedor principal');
    return;
  }

  const clonedElement = element.cloneNode(true) as HTMLElement;
  
  // Aplicar estilos inline
  this.aplicarEstilosInline(clonedElement);

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Informe de Inventario Físico - ${this.getNombreBodega()}</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f8f9fa;
            padding: 20px;
        }
        @media print {
            .no-print { display: none !important; }
            body { background: white; }
        }
    </style>
</head>
<body>
    <button onclick="window.print()" class="btn btn-primary no-print" 
            style="position: fixed; top: 20px; right: 20px; z-index: 9999;">
        <i class="bi bi-printer-fill"></i> Imprimir
    </button>
    ${clonedElement.outerHTML}
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
  `;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const fecha = new Date().toLocaleDateString('es-EC').replace(/\//g, '-');
  link.download = `Informe-Inventario-Portable-${this.getNombreBodega()}-${fecha}.html`;
  link.href = url;
  link.click();
  
  URL.revokeObjectURL(url);
  this.mostrarMensajeExito('HTML portable generado exitosamente');
}

/**
 * Método auxiliar: Aplicar estilos inline a elementos
 */
private aplicarEstilosInline(element: HTMLElement): void {
  const elements = element.querySelectorAll('*');
  
  elements.forEach((el: Element) => {
    const htmlEl = el as HTMLElement;
    const computedStyle = window.getComputedStyle(htmlEl);
    
    const propiedades = [
      'color', 'background-color', 'font-size', 'font-weight', 
      'padding', 'margin', 'border', 'display', 'width', 'height'
    ];
    
    propiedades.forEach(prop => {
      const value = computedStyle.getPropertyValue(prop);
      if (value) {
        htmlEl.style.setProperty(prop, value);
      }
    });
  });
}

/**
 * Método auxiliar: Mostrar mensaje de éxito
 */
private mostrarMensajeExito(mensaje: string): void {
  const toast = document.createElement('div');
  toast.className = 'toast-message toast-success';
  toast.innerHTML = `
    <div style="position: fixed; top: 20px; right: 20px; z-index: 10000;
                background: #28a745; color: white; padding: 16px 24px; 
                border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                animation: slideIn 0.3s ease-out;">
      <i class="bi bi-check-circle-fill" style="margin-right: 10px;"></i>
      <strong>${mensaje}</strong>
    </div>
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 3000);
}

/**
 * Método auxiliar: Mostrar mensaje de error
 */
private mostrarMensajeError(mensaje: string): void {
  const toast = document.createElement('div');
  toast.className = 'toast-message toast-error';
  toast.innerHTML = `
    <div style="position: fixed; top: 20px; right: 20px; z-index: 10000;
                background: #dc3545; color: white; padding: 16px 24px; 
                border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                animation: slideIn 0.3s ease-out;">
      <i class="bi bi-x-circle-fill" style="margin-right: 10px;"></i>
      <strong>${mensaje}</strong>
    </div>
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 3000);
}

/**
 * Exportar a Excel los artículos Fuera de Inventario
 */
exportarExcelFueraInventario(): void {
  const articulosFDI = this.getArticulosSobrantesFueraInventario();
  
  if (articulosFDI.length === 0) {
    this.mostrarMensajeError('No hay artículos fuera de inventario para exportar');
    return;
  }

  // Preparar datos para el Excel
  const data: any[][] = [];
  
  // ENCABEZADOS
  const headerRow1 = [
    'LISTADO COMPLETO - ARTÍCULOS FUERA DE INVENTARIO',
    '', '', '', '', '', '', '', ''
  ];
  
  const headerRow2 = [
    `Bodega: ${this.getNombreBodega()}`,
    '', '', '', '', '', '', '', ''
  ];
  
  const headerRow3 = [
    `Fecha: ${this.obtenerFechaActual()}`,
    '', '', '', '', '', '', '', ''
  ];
  
  const headerRow4 = [
    `Total Artículos: ${articulosFDI.length}`,
    `Total Unidades: ${this.calcularTotalSobrantesFueraInventario()}`,
    `Valor Total: ${this.formatearMoneda(this.getValorTotalSobrantesFueraInventario())}`,
    '', '', '', '', '', ''
  ];
  
  const headerRow5 = ['', '', '', '', '', '', '', '', ''];
  
  const columnHeaders = [
    '#', 'Código', 'Artículo', 'Stock Sistema', 'Cantidad Encontrada',
    'Costo Unitario', 'Valor Total', 'Unidad', 'Origen Costo'
  ];

  data.push(headerRow1, headerRow2, headerRow3, headerRow4, headerRow5, columnHeaders);

  // DATOS
  articulosFDI.forEach((item, index) => {
    const costoUnitario = this.tieneConstoValido(item) 
      ? item.costo_promedio 
      : this.getCostoConFallback(item.codigo_articulo);
    
    const valorTotal = item.conteoFinalAceptado * costoUnitario;
    const origenCosto = this.tieneConstoValido(item) 
      ? 'Costo Sistema' 
      : this.getOrigenCosto(item.codigo_articulo);
    
    data.push([
      index + 1,
      item.codigo_articulo,
      item.nombre_articulo,
      0,
      item.conteoFinalAceptado,
      costoUnitario,
      valorTotal,
      item.unidad,
      origenCosto
    ]);
  });

  // FILA DE TOTALES
  const totalUnidades = this.calcularTotalSobrantesFueraInventario();
  const totalValor = this.getValorTotalSobrantesFueraInventario();
  
  data.push([
    '', '', 'TOTAL FUERA DE INVENTARIO:', '', totalUnidades, '', totalValor, '', ''
  ]);

  // ADVERTENCIA SI HAY ARTÍCULOS SIN COSTO
  const articulosSinCosto = this.getCantidadArticulosFDISinValorar();
  if (articulosSinCosto > 0) {
    data.push(['', '', '', '', '', '', '', '', '']);
    data.push([
      '⚠️ ADVERTENCIA:',
      `${articulosSinCosto} artículos sin costo registrado`,
      'Requieren valoración manual urgente',
      '', '', '', '', '', ''
    ]);
  }

  // CREAR HOJA DE EXCEL
  const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(data);
  
  // COMBINAR CELDAS
  const merges: Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, // Título
    { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }, // Bodega
    { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } }, // Fecha
    { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } }  // Totales header
  ];
  worksheet['!merges'] = merges;

  // ANCHOS DE COLUMNA
  worksheet['!cols'] = [
    { wch: 5 },  // #
    { wch: 18 }, // Código
    { wch: 50 }, // Artículo
    { wch: 15 }, // Stock Sistema
    { wch: 18 }, // Cantidad Encontrada
    { wch: 15 }, // Costo Unitario
    { wch: 15 }, // Valor Total
    { wch: 10 }, // Unidad
    { wch: 20 }  // Origen Costo
  ];

  // ESTILOS (opcional, requiere xlsx-style o similar)
  // Aplicar formato a encabezados
  ['A1', 'A2', 'A3', 'A4'].forEach(cell => {
    if (worksheet[cell]) {
      worksheet[cell].s = {
        font: { bold: true, sz: 14 },
        alignment: { horizontal: 'center' }
      };
    }
  });

  // CREAR WORKBOOK Y GUARDAR
  const workbook = { 
    Sheets: { 'Fuera de Inventario': worksheet }, 
    SheetNames: ['Fuera de Inventario'] 
  };
  
  const excelBuffer: any = XLSX.write(workbook, { 
    bookType: 'xlsx', 
    type: 'array' 
  });
  
  const fecha = new Date().toLocaleDateString('es-EC').replace(/\//g, '-');
  const nombreArchivo = `Fuera-Inventario-${this.getNombreBodega()}-${fecha}`;
  
  this.guardarExcel(excelBuffer, nombreArchivo);
  this.mostrarMensajeExito('Excel de Fuera de Inventario generado exitosamente');
}

/**
 * Método auxiliar para formatear moneda
 */
private formatearMoneda(valor: number): string {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(valor);
}

/**
 * Exportar a Excel el listado completo de artículos FALTANTES
 */
exportarExcelFaltantes(): void {
  const articulosFaltantes = this.getArticulosFaltantes();
  
  if (articulosFaltantes.length === 0) {
    this.mostrarMensajeError('No hay artículos faltantes para exportar');
    return;
  }

  // Preparar datos para el Excel
  const data: any[][] = [];
  
  // ENCABEZADOS
  const headerRow1 = [
    'LISTADO COMPLETO DE ARTÍCULOS FALTANTES',
    '', '', '', '', '', '', '', ''
  ];
  
  const headerRow2 = [
    `Bodega: ${this.getNombreBodega()}`,
    '', '', '', '', '', '', '', ''
  ];
  
  const headerRow3 = [
    `Fecha de Análisis: ${this.obtenerFechaActual()}`,
    '', '', '', '', '', '', '', ''
  ];
  
  const headerRow4 = [
    `Total Artículos Faltantes: ${articulosFaltantes.length}`,
    `Total Unidades Faltantes: ${Math.abs(this.calcularTotalFaltantes())}`,
    `Valor Total Pérdida: ${this.formatearMoneda(this.getValorTotalFaltantes())}`,
    '', '', '', '', '', ''
  ];
  
  const headerRow5 = [
    `Impacto: ${((this.getValorTotalFaltantes() / this.getValorTotalSistema()) * 100).toFixed(2)}% del inventario total`,
    '', '', '', '', '', '', '', ''
  ];
  
  const headerRow6 = ['', '', '', '', '', '', '', '', ''];
  
  const columnHeaders = [
    '#', 'Código', 'Artículo', 'Stock Sistema', 'Conteo Final',
    'Diferencia', 'Costo Unitario', 'Pérdida Total', 'Unidad'
  ];

  data.push(headerRow1, headerRow2, headerRow3, headerRow4, headerRow5, headerRow6, columnHeaders);

  // DATOS
  articulosFaltantes.forEach((item, index) => {
    data.push([
      index + 1,
      item.codigo_articulo,
      item.nombre_articulo,
      item.stock_disponible,
      item.conteoFinalAceptado,
      item.diferenciaFinal,
      item.costo_promedio,
      item.costoTotalFaltante,
      item.unidad
    ]);
  });

  // FILA DE TOTALES
  const totalUnidades = Math.abs(this.calcularTotalFaltantes());
  const totalValor = this.getValorTotalFaltantes();
  
  data.push([
    '', '', 'TOTAL FALTANTES:', '', '', totalUnidades, '', totalValor, ''
  ]);

  // SECCIÓN DE RECOMENDACIONES
  data.push(['', '', '', '', '', '', '', '', '']);
  data.push(['', '', '', '', '', '', '', '', '']);
  data.push([
    'INSTRUCCIONES PARA GESTIÓN DE FALTANTES',
    '', '', '', '', '', '', '', ''
  ]);
  data.push([
    '1. Investigación inmediata: Determinar causa raíz de cada faltante',
    '', '', '', '', '', '', '', ''
  ]);
  data.push([
    '2. Documentación: Adjuntar evidencia y justificación formal',
    '', '', '', '', '', '', '', ''
  ]);
  data.push([
    `3. Ajuste contable: Generar asiento de baja por ${this.formatearMoneda(totalValor)}`,
    '', '', '', '', '', '', '', ''
  ]);
  data.push([
    '4. Medidas correctivas: Implementar controles para prevenir recurrencia',
    '', '', '', '', '', '', '', ''
  ]);
  data.push([
    '5. Aprobación gerencial: Solicitar autorización formal antes del ajuste',
    '', '', '', '', '', '', '', ''
  ]);

  // CREAR HOJA DE EXCEL
  const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(data);
  
  // COMBINAR CELDAS
  const merges: Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, // Título
    { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }, // Bodega
    { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } }, // Fecha
    { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } }, // Totales header
    { s: { r: 4, c: 0 }, e: { r: 4, c: 8 } }  // Impacto
  ];
  
  // Combinar celdas de instrucciones
  const startRow = articulosFaltantes.length + 10;
  for (let i = 0; i < 7; i++) {
    merges.push({ s: { r: startRow + i, c: 0 }, e: { r: startRow + i, c: 8 } });
  }
  
  worksheet['!merges'] = merges;

  // ANCHOS DE COLUMNA
  worksheet['!cols'] = [
    { wch: 5 },  // #
    { wch: 18 }, // Código
    { wch: 50 }, // Artículo
    { wch: 15 }, // Stock Sistema
    { wch: 15 }, // Conteo Final
    { wch: 12 }, // Diferencia
    { wch: 15 }, // Costo Unitario
    { wch: 15 }, // Pérdida Total
    { wch: 10 }  // Unidad
  ];

  // CREAR WORKBOOK Y GUARDAR
  const workbook = { 
    Sheets: { 'Faltantes': worksheet }, 
    SheetNames: ['Faltantes'] 
  };
  
  const excelBuffer: any = XLSX.write(workbook, { 
    bookType: 'xlsx', 
    type: 'array' 
  });
  
  const fecha = new Date().toLocaleDateString('es-EC').replace(/\//g, '-');
  const nombreArchivo = `Faltantes-${this.getNombreBodega()}-${fecha}`;
  
  this.guardarExcel(excelBuffer, nombreArchivo);
  this.mostrarMensajeExito('Excel de Faltantes generado exitosamente');
}

/**
 * Exportar a Excel el listado completo de artículos SOBRANTES (Conteo)
 */
exportarExcelSobrantes(): void {
  const articulosSobrantes = this.getArticulosSobrantesConteo();
  
  if (articulosSobrantes.length === 0) {
    this.mostrarMensajeError('No hay artículos sobrantes para exportar');
    return;
  }

  // Preparar datos para el Excel
  const data: any[][] = [];
  
  // ENCABEZADOS
  const headerRow1 = [
    'LISTADO COMPLETO DE ARTÍCULOS SOBRANTES (CONTEO)',
    '', '', '', '', '', '', '', ''
  ];
  
  const headerRow2 = [
    `Bodega: ${this.getNombreBodega()}`,
    '', '', '', '', '', '', '', ''
  ];
  
  const headerRow3 = [
    `Fecha de Análisis: ${this.obtenerFechaActual()}`,
    '', '', '', '', '', '', '', ''
  ];
  
  const headerRow4 = [
    `Total Artículos Sobrantes: ${articulosSobrantes.length}`,
    `Total Unidades Sobrantes: ${this.calcularTotalSobrantesConteo()}`,
    `Valor Total Sobrante: ${this.formatearMoneda(this.getValorTotalSobrantesConteo())}`,
    '', '', '', '', '', ''
  ];
  
  const headerRow5 = [
    'NOTA: Artículos YA registrados en sistema con excedentes físicos detectados',
    '', '', '', '', '', '', '', ''
  ];
  
  const headerRow6 = ['', '', '', '', '', '', '', '', ''];
  
  const columnHeaders = [
    '#', 'Código', 'Artículo', 'Stock Sistema', 'Conteo Final',
    'Diferencia', 'Costo Unitario', 'Valor Extra', 'Unidad'
  ];

  data.push(headerRow1, headerRow2, headerRow3, headerRow4, headerRow5, headerRow6, columnHeaders);

  // DATOS
  articulosSobrantes.forEach((item, index) => {
    data.push([
      index + 1,
      item.codigo_articulo,
      item.nombre_articulo,
      item.stock_disponible,
      item.conteoFinalAceptado,
      item.diferenciaFinal,
      item.costo_promedio,
      item.costoTotalSobrante,
      item.unidad
    ]);
  });

  // FILA DE TOTALES
  const totalUnidades = this.calcularTotalSobrantesConteo();
  const totalValor = this.getValorTotalSobrantesConteo();
  
  data.push([
    '', '', 'TOTAL SOBRANTES:', '', '', totalUnidades, '', totalValor, ''
  ]);

  // SECCIÓN DE RECOMENDACIONES
  data.push(['', '', '', '', '', '', '', '', '']);
  data.push(['', '', '', '', '', '', '', '', '']);
  data.push([
    'INSTRUCCIONES PARA GESTIÓN DE SOBRANTES',
    '', '', '', '', '', '', '', ''
  ]);
  data.push([
    '1. Verificación física: Confirmar nuevamente existencia y estado de cada artículo',
    '', '', '', '', '', '', '', ''
  ]);
  data.push([
    '2. Investigación de origen: Determinar causa del excedente (devolución, error de registro, etc.)',
    '', '', '', '', '', '', '', ''
  ]);
  data.push([
    '3. Documentación: Adjuntar evidencia fotográfica y justificación del hallazgo',
    '', '', '', '', '', '', '', ''
  ]);
  data.push([
    `4. Ajuste contable: Generar asiento de regularización por ${this.formatearMoneda(totalValor)}`,
    '', '', '', '', '', '', '', ''
  ]);
  data.push([
    '5. Actualización de sistema: Registrar ajuste positivo en ERP',
    '', '', '', '', '', '', '', ''
  ]);
  data.push([
    '6. Aprobación gerencial: Solicitar autorización formal antes del registro',
    '', '', '', '', '', '', '', ''
  ]);

  // CREAR HOJA DE EXCEL
  const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(data);
  
  // COMBINAR CELDAS
  const merges: Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, // Título
    { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }, // Bodega
    { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } }, // Fecha
    { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } }, // Totales header
    { s: { r: 4, c: 0 }, e: { r: 4, c: 8 } }  // Nota
  ];
  
  // Combinar celdas de instrucciones
  const startRow = articulosSobrantes.length + 10;
  for (let i = 0; i < 8; i++) {
    merges.push({ s: { r: startRow + i, c: 0 }, e: { r: startRow + i, c: 8 } });
  }
  
  worksheet['!merges'] = merges;

  // ANCHOS DE COLUMNA
  worksheet['!cols'] = [
    { wch: 5 },  // #
    { wch: 18 }, // Código
    { wch: 50 }, // Artículo
    { wch: 15 }, // Stock Sistema
    { wch: 15 }, // Conteo Final
    { wch: 12 }, // Diferencia
    { wch: 15 }, // Costo Unitario
    { wch: 15 }, // Valor Extra
    { wch: 10 }  // Unidad
  ];

  // CREAR WORKBOOK Y GUARDAR
  const workbook = { 
    Sheets: { 'Sobrantes': worksheet }, 
    SheetNames: ['Sobrantes'] 
  };
  
  const excelBuffer: any = XLSX.write(workbook, { 
    bookType: 'xlsx', 
    type: 'array' 
  });
  
  const fecha = new Date().toLocaleDateString('es-EC').replace(/\//g, '-');
  const nombreArchivo = `Sobrantes-${this.getNombreBodega()}-${fecha}`;
  
  this.guardarExcel(excelBuffer, nombreArchivo);
  this.mostrarMensajeExito('Excel de Sobrantes generado exitosamente');
}



}