import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Usuario } from 'src/app/models/usuario';
import { AuthService } from 'src/app/services/auth.service';
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

@Component({
  selector: 'app-conteoall',
  templateUrl: './conteoall.component.html',
  styleUrls: ['./conteoall.component.css']
})
export class ConteoallComponent implements OnInit {
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
  id: number = 0;
  usuario: Usuario | null = null;
  rol:any;
    blId: string | null = null;

  constructor(private conteosService: InventarioService, private route: ActivatedRoute,
      private authService: AuthService,
      private router: Router,) {}

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
            this.cargarConteos();
           this.cargarConteosFueraInventario();
            
             
          });
        }
        else{
          this.router.navigate(['/login']);
        }
      }
    });
    
  }

  cargarConteos(): void {
    this.loading = true;
    this.conteosService.getConteosInventario(Number(this.blId)).subscribe({
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

  // MÉTODO PRINCIPAL: exportarExcelDiario3 con columna Estado
  exportarExcelDiario8(): void {
    if (this.articulosDiarios.length === 0) {
      console.warn('No hay datos de conteos diarios para exportar.');
      return;
    }

    const subHeaders = ['Fecha/Hora', 'Cant. Contada', 'Diferencia', 'Observaciones', 'Usuario', 'Ubicacion'];
    const N_FIXED_COLS = 43; // 27 originales + 16 nuevas columnas de análisis (incluye Estado)

    let headerRow1: any[] = [
      'Item','ID Bodega', 'Bodega', 'ID Clase', 'Clase', 'ID Grupo', 'Grupo', 'Código', 'Artículo', 
      'Descripción', 'Ubicación', 'ID Línea Comp.', 'Línea Competencia',
      'Stock', 'Stock Reservado', 'Stock Disponible','FOB', 'Costo Unitario', 'Costo Total', 'Costo Promedio',
      'Precio sin IVA', 'Desc. Máximo',
      '1ª Fecha Compra', 'Última Fecha Compra', 'Cant. Vendida Últ. Mes', 'Nº de Transferencias', 'Unidad'
    ];
    
    let headerRow2: string[] = Array(27).fill(''); 

    this.fechasUnicas.forEach(fecha => {
      headerRow1.push(this.formatearFechaCorta(fecha));
      headerRow1.push('', '', '','', '');
      headerRow2.push(...subHeaders);
    });

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
    
    headerRow2.push(...Array(16).fill(''));

    let maxRowsPerArticle = 1;
    this.articulosDiarios.forEach(articulo => {
      this.fechasUnicas.forEach(fecha => {
        const conteos = this.getConteosDiariosPorFecha(articulo, fecha);
        maxRowsPerArticle = Math.max(maxRowsPerArticle, conteos.length);
      });
    });

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
      
      const conteoDias6_9 = this.getSumaConteosPorDias(articulo, ['6', '7', '8', '9']);
      const reconteo10 = this.getSumaReconteosPorDias(articulo, ['10']);
      const reconteo11 = this.getSumaReconteosPorDias(articulo, ['11']);
      
      const stockDisponible = articulo.stock_disponible;
      const diferenciaDias6_9 = conteoDias6_9 - stockDisponible;
      const diferenciaDia10 = reconteo10 - stockDisponible;
      const diferenciaDia11 = reconteo11 - stockDisponible;
      
      const obsDias6_9 = this.getObservacionesPorDias(articulo, ['6', '7', '8', '9']);
      const obsDia10 = this.getObservacionesPorDias(articulo, ['10']);
      const obsDia11 = this.getObservacionesPorDias(articulo, ['11']);
      
      const conteoFinalAceptado = this.determinarConteoFinal(conteoDias6_9, reconteo10, reconteo11, stockDisponible);
      const diferenciaFinal = conteoFinalAceptado - stockDisponible;
      const cantidadFaltante = diferenciaFinal < 0 ? Math.abs(diferenciaFinal) : 0;
      const costoTotalFaltante = cantidadFaltante * articulo.costo_promedio;
      const cantidadSobrante = diferenciaFinal > 0 ? diferenciaFinal : 0;
      const costoTotalSobrante = cantidadSobrante * articulo.costo_promedio;
      
      const estado = this.determinarEstado(diferenciaFinal, stockDisponible, cantidadFaltante, cantidadSobrante);
      
      for (let r = 0; r < articuloMaxConteos; r++) {
        let row: any[] = [];
        
        if (r === 0) {
          row.push(
            i + 1, articulo.bodega_id, articulo.bodega, articulo.clase_id, articulo.clase,
            articulo.grupo_id, articulo.grupo, articulo.codigo_articulo, articulo.nombre_articulo,
            articulo.descripcion, articulo.ubicacion, articulo.linea_comp_id, articulo.linea_competencia,
            articulo.stock, articulo.stock_reservado, articulo.stock_disponible, articulo.fob,
            articulo.costo_uni, articulo.costo_total, articulo.costo_promedio, articulo.precio_sin_iva,
            articulo.descuento_maximo, articulo.primera_fecha_compra, articulo.ultima_fecha_compra, 
            articulo.cant_vendida_ult_mes, articulo.numero_de_transferencias, articulo.unidad
          );
        } else {
          row.push(...Array(27).fill('')); 
        }

        this.fechasUnicas.forEach(fecha => {
          const conteos = this.getConteosDiariosPorFecha(articulo, fecha);
          const conteo = conteos[r];
          
          if (conteo) {
            row.push(
              this.formatearFechaHora(conteo.fechaHora), conteo.cantidad_contada,
              conteo.diferencia, conteo.observaciones, conteo.usuario_contador, conteo.ubicacionconteo
            );
          } else {
            row.push('', '', '', '', '', '');
          }
        });

        if (r === 0) {
          row.push(
            conteoDias6_9, diferenciaDias6_9, obsDias6_9,
            reconteo10, diferenciaDia10, obsDia10,
            reconteo11, diferenciaDia11, obsDia11,
            conteoFinalAceptado, diferenciaFinal,
            -cantidadFaltante, -costoTotalFaltante,
            cantidadSobrante, costoTotalSobrante, estado
          );
        } else {
          row.push(...Array(16).fill(''));
        }

        data.push(row);
      }
      
      if (articuloMaxConteos > 1) {
        for (let c = 0; c < 27; c++) {
          merges.push({
            s: { r: articuloRowStart, c: c }, 
            e: { r: articuloRowStart + articuloMaxConteos - 1, c: c }
          });
        }
        
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

    let currentHeaderCol = 27;
    this.fechasUnicas.forEach(() => {
      merges.push({
        s: { r: 0, c: currentHeaderCol },
        e: { r: 0, c: currentHeaderCol + subHeaders.length - 1 }
      });
      currentHeaderCol += subHeaders.length;
    });

    const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(data);
    worksheet['!merges'] = merges;
    
    const columnWidths = [
      { wch: 6 }, { wch: 10 }, { wch: 20 }, { wch: 10 }, { wch: 20 },
      { wch: 10 }, { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 40 },
      { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 15 },
      { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 },
      { wch: 18 }, { wch: 10 }
    ];
    
    this.fechasUnicas.forEach(() => {
      columnWidths.push({ wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 40 }, { wch: 18 }, { wch: 20 });
    });
    
    columnWidths.push(
      { wch: 18 }, { wch: 18 }, { wch: 40 },
      { wch: 18 }, { wch: 18 }, { wch: 40 },
      { wch: 18 }, { wch: 18 }, { wch: 40 },
      { wch: 18 }, { wch: 15 }, { wch: 18 },
      { wch: 18 }, { wch: 18 }, { wch: 18 },
      { wch: 30 }
    );
    
    worksheet['!cols'] = columnWidths;

    const workbook = { Sheets: { 'Conteos Diarios': worksheet }, SheetNames: ['Conteos Diarios'] };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    this.guardarExcel(excelBuffer, 'conteos-inventario-diario-completo');
  }
// ============================================
// MÉTODOS NUEVOS PARA AGREGAR AL COMPONENTE
// ============================================

/**
 * Obtiene los usuarios concatenados que realizaron conteos en un grupo de fechas
 */
private getUsuariosGrupo(articulo: ArticuloAgrupado, fechas: string[]): string {
  const usuarios: Set<string> = new Set();
  
  fechas.forEach(fecha => {
    const conteos = this.getConteosPorFecha(articulo, fecha);
    conteos.forEach(conteo => {
      if (conteo.usuario_contador && conteo.usuario_contador.trim() !== '') {
        usuarios.add(conteo.usuario_contador.trim());
      }
    });
  });
  
  return usuarios.size > 0 ? Array.from(usuarios).join(', ') : 'Sin usuarios';
}

/**
 * Obtiene las ubicaciones concatenadas de conteos en un grupo de fechas
 */
private getUbicacionesGrupo(articulo: ArticuloAgrupado, fechas: string[]): string {
  const ubicaciones: Set<string> = new Set();
  
  fechas.forEach(fecha => {
    const conteos = this.getConteosPorFecha(articulo, fecha);
    conteos.forEach(conteo => {
      if (conteo.ubicacion && conteo.ubicacion.trim() !== '') {
        ubicaciones.add(conteo.ubicacion.trim());
      }
    });
  });
  
  return ubicaciones.size > 0 ? Array.from(ubicaciones).join(', ') : 'Sin ubicaciones';
}

/**
 * Obtiene los usuarios para artículos diarios por días específicos
 */
/*
private getUsuariosPorDias(articulo: ArticuloDiario, dias: string[]): string {
  const usuarios: Set<string> = new Set();
  
  this.fechasUnicas.forEach(fecha => {
    const dia = parseInt(fecha.split('-')[2], 10).toString();
    if (dias.includes(dia)) {
      const conteos = this.getConteosDiariosPorFecha(articulo, fecha);
      conteos.forEach(conteo => {
        if (conteo.usuario_contador && conteo.usuario_contador.trim() !== '') {
          usuarios.add(conteo.usuario_contador.trim());
        }
      });
    }
  });
  
  return usuarios.size > 0 ? Array.from(usuarios).join(', ') : 'Sin usuarios';
}*/

/**
 * Obtiene las ubicaciones para artículos diarios por días específicos
 */
/*
private getUbicacionesPorDias(articulo: ArticuloDiario, dias: string[]): string {
  const ubicaciones: Set<string> = new Set();
  
  this.fechasUnicas.forEach(fecha => {
    const dia = parseInt(fecha.split('-')[2], 10).toString();
    if (dias.includes(dia)) {
      const conteos = this.getConteosDiariosPorFecha(articulo, fecha);
      conteos.forEach(conteo => {
        if (conteo.ubicacionconteo && conteo.ubicacionconteo.trim() !== '') {
          ubicaciones.add(conteo.ubicacionconteo.trim());
        }
      });
    }
  });
  
  return ubicaciones.size > 0 ? Array.from(ubicaciones).join(', ') : 'Sin ubicaciones';
}*/
/**
 * Verifica si un artículo tiene conteos en un rango de días
 */
/*
private tieneConteoEnDias(articulo: ArticuloDiario | ArticuloAgrupado, dias: string[]): boolean {
  let tieneConteo = false;
  
  this.fechasUnicas.forEach(fecha => {
    const dia = parseInt(fecha.split('-')[2], 10).toString();
    if (dias.includes(dia)) {
      let conteos: any[] = [];
      
      if ('conteosPorDia' in articulo) {
        // Es ArticuloDiario
        conteos = this.getConteosDiariosPorFecha(articulo as ArticuloDiario, fecha);
      } else if ('conteosPorFecha' in articulo) {
        // Es ArticuloAgrupado
        conteos = this.getConteosPorFecha(articulo as ArticuloAgrupado, fecha);
      }
      
      if (conteos.length > 0) {
        tieneConteo = true;
      }
    }
  });
  
  return tieneConteo;
}
*/
// ============================================
// MÉTODO exportarExcelDiario3 CORREGIDO
// ============================================
/*
exportarExcelDiario3(): void {
  if (this.articulosDiarios.length === 0) {
    console.warn('No hay datos de conteos diarios para exportar.');
    return;
  }

  const subHeaders = ['Fecha/Hora', 'Cant. Contada', 'Diferencia', 'Observaciones', 'Usuario', 'Ubicacion'];
  const N_FIXED_COLS = 27; // Columnas fijas originales

  let headerRow1: any[] = [
    'Item','ID Bodega', 'Bodega', 'ID Clase', 'Clase', 'ID Grupo', 'Grupo', 'Código', 'Artículo', 
    'Descripción', 'Ubicación', 'ID Línea Comp.', 'Línea Competencia',
    'Stock', 'Stock Reservado', 'Stock Disponible','FOB', 'Costo Unitario', 'Costo Total', 'Costo Promedio',
    'Precio sin IVA', 'Desc. Máximo',
    '1ª Fecha Compra', 'Última Fecha Compra', 'Cant. Vendida Últ. Mes', 'Nº de Transferencias', 'Unidad'
  ];
  
  let headerRow2: string[] = Array(27).fill(''); 

  this.fechasUnicas.forEach(fecha => {
    headerRow1.push(this.formatearFechaCorta(fecha));
    headerRow1.push('', '', '','', '');
    headerRow2.push(...subHeaders);
  });

  // COLUMNAS DE ANÁLISIS AMPLIADAS CON USUARIOS Y UBICACIONES
  headerRow1.push(
    'Conteo Días 6-9',
    'Diferencia Días 6-9', 
    'Observaciones Días 6-9',
    'Usuarios Días 6-9',
    'Ubicaciones Días 6-9',
    'Reconteo Día 10',
    'Diferencia Día 10',
    'Observaciones Día 10',
    'Usuarios Día 10',
    'Ubicaciones Día 10',
    'Reconteo Día 11',
    'Diferencia Día 11',
    'Observaciones Día 11',
    'Usuarios Día 11',
    'Ubicaciones Día 11',
    'Conteo Final Aceptado',
    'Diferencia Final',
    'Cantidad Faltante',
    'Costo Total Faltante',
    'Cantidad Sobrante',
    'Costo Total Sobrante',
    'Estado'
  );
  
  const numColumnasAnalisis = 22; // 16 originales + 6 nuevas (usuarios y ubicaciones x3 períodos)
  headerRow2.push(...Array(numColumnasAnalisis).fill(''));

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
    
    // VERIFICACIÓN MEJORADA: Comprobar si tiene conteos en 6-9, 10 u 11
    const tieneConteo6_9 = this.tieneConteoEnDias(articulo, ['6', '7', '8', '9']);
    const tieneConteo10 = this.tieneConteoEnDias(articulo, ['10']);
    const tieneConteo11 = this.tieneConteoEnDias(articulo, ['11']);
    
    // Calcular sumas según disponibilidad de datos
    let conteoDias6_9 = 0;
    let reconteo10 = 0;
    let reconteo11 = 0;
    
    if (tieneConteo6_9) {
      conteoDias6_9 = this.getSumaConteosPorDias(articulo, ['6', '7', '8', '9']);
    }
    
    if (tieneConteo10) {
      reconteo10 = this.getSumaReconteosPorDias(articulo, ['10']);
    }
    
    if (tieneConteo11) {
      reconteo11 = this.getSumaReconteosPorDias(articulo, ['11']);
    }
    
    const stockDisponible = articulo.stock_disponible;
    const diferenciaDias6_9 = conteoDias6_9 - stockDisponible;
    const diferenciaDia10 = reconteo10 - stockDisponible;
    const diferenciaDia11 = reconteo11 - stockDisponible;
    
    // Obtener observaciones, usuarios y ubicaciones
    const obsDias6_9 = tieneConteo6_9 ? this.getObservacionesPorDias(articulo, ['6', '7', '8', '9']) : 'Sin conteos';
    const obsDia10 = tieneConteo10 ? this.getObservacionesPorDias(articulo, ['10']) : 'Sin conteos';
    const obsDia11 = tieneConteo11 ? this.getObservacionesPorDias(articulo, ['11']) : 'Sin conteos';
    
    const usuariosDias6_9 = tieneConteo6_9 ? this.getUsuariosPorDias(articulo, ['6', '7', '8', '9']) : 'Sin conteos';
    const usuariosDia10 = tieneConteo10 ? this.getUsuariosPorDias(articulo, ['10']) : 'Sin conteos';
    const usuariosDia11 = tieneConteo11 ? this.getUsuariosPorDias(articulo, ['11']) : 'Sin conteos';
    
    const ubicacionesDias6_9 = tieneConteo6_9 ? this.getUbicacionesPorDias(articulo, ['6', '7', '8', '9']) : 'Sin conteos';
    const ubicacionesDia10 = tieneConteo10 ? this.getUbicacionesPorDias(articulo, ['10']) : 'Sin conteos';
    const ubicacionesDia11 = tieneConteo11 ? this.getUbicacionesPorDias(articulo, ['11']) : 'Sin conteos';
    
    const conteoFinalAceptado = this.determinarConteoFinal(conteoDias6_9, reconteo10, reconteo11, stockDisponible);
    const diferenciaFinal = conteoFinalAceptado - stockDisponible;
    const cantidadFaltante = diferenciaFinal < 0 ? Math.abs(diferenciaFinal) : 0;
    const costoTotalFaltante = cantidadFaltante * articulo.costo_promedio;
    const cantidadSobrante = diferenciaFinal > 0 ? diferenciaFinal : 0;
    const costoTotalSobrante = cantidadSobrante * articulo.costo_promedio;
    
    const estado = this.determinarEstado(diferenciaFinal, stockDisponible, cantidadFaltante, cantidadSobrante);
    
    for (let r = 0; r < articuloMaxConteos; r++) {
      let row: any[] = [];
      
      if (r === 0) {
        row.push(
          i + 1, articulo.bodega_id, articulo.bodega, articulo.clase_id, articulo.clase,
          articulo.grupo_id, articulo.grupo, articulo.codigo_articulo, articulo.nombre_articulo,
          articulo.descripcion, articulo.ubicacion, articulo.linea_comp_id, articulo.linea_competencia,
          articulo.stock, articulo.stock_reservado, articulo.stock_disponible, articulo.fob,
          articulo.costo_uni, articulo.costo_total, articulo.costo_promedio, articulo.precio_sin_iva,
          articulo.descuento_maximo, articulo.primera_fecha_compra, articulo.ultima_fecha_compra, 
          articulo.cant_vendida_ult_mes, articulo.numero_de_transferencias, articulo.unidad
        );
      } else {
        row.push(...Array(27).fill('')); 
      }

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

      if (r === 0) {
        row.push(
          conteoDias6_9, diferenciaDias6_9, obsDias6_9, usuariosDias6_9, ubicacionesDias6_9,
          reconteo10, diferenciaDia10, obsDia10, usuariosDia10, ubicacionesDia10,
          reconteo11, diferenciaDia11, obsDia11, usuariosDia11, ubicacionesDia11,
          conteoFinalAceptado, diferenciaFinal,
          -cantidadFaltante, -costoTotalFaltante,
          cantidadSobrante, costoTotalSobrante, estado
        );
      } else {
        row.push(...Array(numColumnasAnalisis).fill(''));
      }

      data.push(row);
    }
    
    if (articuloMaxConteos > 1) {
      for (let c = 0; c < 27; c++) {
        merges.push({
          s: { r: articuloRowStart, c: c }, 
          e: { r: articuloRowStart + articuloMaxConteos - 1, c: c }
        });
      }
      
      const startAnalysisCol = 27 + (this.fechasUnicas.length * 6);
      for (let c = startAnalysisCol; c < startAnalysisCol + numColumnasAnalisis; c++) {
        merges.push({
          s: { r: articuloRowStart, c: c }, 
          e: { r: articuloRowStart + articuloMaxConteos - 1, c: c }
        });
      }
    }

    currentRow += articuloMaxConteos;
  });

  let currentHeaderCol = 27;
  this.fechasUnicas.forEach(() => {
    merges.push({
      s: { r: 0, c: currentHeaderCol },
      e: { r: 0, c: currentHeaderCol + subHeaders.length - 1 }
    });
    currentHeaderCol += subHeaders.length;
  });

  const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(data);
  worksheet['!merges'] = merges;
  
  const columnWidths = [
    { wch: 6 }, { wch: 10 }, { wch: 20 }, { wch: 10 }, { wch: 20 },
    { wch: 10 }, { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 40 },
    { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 15 },
    { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
    { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 },
    { wch: 18 }, { wch: 10 }
  ];
  
  this.fechasUnicas.forEach(() => {
    columnWidths.push({ wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 40 }, { wch: 18 }, { wch: 20 });
  });
  
  columnWidths.push(
    { wch: 18 }, { wch: 18 }, { wch: 40 }, { wch: 30 }, { wch: 30 }, // Días 6-9 + usuarios + ubicaciones
    { wch: 18 }, { wch: 18 }, { wch: 40 }, { wch: 30 }, { wch: 30 }, // Día 10 + usuarios + ubicaciones
    { wch: 18 }, { wch: 18 }, { wch: 40 }, { wch: 30 }, { wch: 30 }, // Día 11 + usuarios + ubicaciones
    { wch: 18 }, { wch: 15 }, { wch: 18 },
    { wch: 18 }, { wch: 18 }, { wch: 18 },
    { wch: 30 }
  );
  
  worksheet['!cols'] = columnWidths;

  const workbook = { Sheets: { 'Conteos Diarios': worksheet }, SheetNames: ['Conteos Diarios'] };
  const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  this.guardarExcel(excelBuffer, 'conteos-inventario-diario-completo');
}
*/
  
private guardarExcel(buffer: any, fileName: string): void {
  const data: Blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const downloadLink = document.createElement('a');
  downloadLink.href = URL.createObjectURL(data);
  downloadLink.download = fileName + '_' + new Date().toLocaleDateString('es-EC').replace(/\//g, '-') + '.xlsx';
  downloadLink.click();
}

/**
 * Suma la cantidad contada para un artículo en un rango de días.
 */
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

/**
 * Suma la cantidad RECONTEO (usando la última cantidad contada para el día) para un artículo en un rango de días.
 */
 getSumaReconteosPorDias(articulo: ArticuloDiario, dias: string[]): number {
  let suma = 0;
  this.fechasUnicas.forEach(fecha => {
    const dia = parseInt(fecha.split('-')[2], 10).toString();
    if (dias.includes(dia)) {
      const conteos = this.getConteosDiariosPorFecha(articulo, fecha);
      // Asume que el reconteo es el último conteo del día.
      if (conteos.length > 0) {
        suma = conteos[conteos.length - 1].cantidad_contada || 0; 
      }
    }
  });
  return suma;
}

/**
 * Concatena observaciones para un artículo en un rango de días.
 */
private getObservacionesPorDias(articulo: ArticuloDiario, dias: string[]): string {
  const observaciones: Set<string> = new Set();
  this.fechasUnicas.forEach(fecha => {
    const dia = parseInt(fecha.split('-')[2], 10).toString();
    if (dias.includes(dia)) {
      const conteos = this.getConteosDiariosPorFecha(articulo, fecha);
      conteos.forEach(conteo => {
        if (conteo.observaciones && conteo.observaciones.trim() !== 'Sin observaciones') {
          observaciones.add(conteo.observaciones.trim());
        }
      });
    }
  });
  return observaciones.size > 0 ? Array.from(observaciones).join(' | ') : 'Sin observaciones';
}

/**
 * Obtiene los usuarios para artículos diarios por días específicos
 */
private getUsuariosPorDias(articulo: ArticuloDiario, dias: string[]): string {
  const usuarios: Set<string> = new Set();
  this.fechasUnicas.forEach(fecha => {
    const dia = parseInt(fecha.split('-')[2], 10).toString();
    if (dias.includes(dia)) {
      const conteos = this.getConteosDiariosPorFecha(articulo, fecha);
      conteos.forEach(conteo => {
        if (conteo.usuario_contador && conteo.usuario_contador.trim() !== '') {
          usuarios.add(conteo.usuario_contador.trim());
        }
      });
    }
  });
  return usuarios.size > 0 ? Array.from(usuarios).join(', ') : 'Sin usuarios';
}

/**
 * Obtiene las ubicaciones para artículos diarios por días específicos
 */
private getUbicacionesPorDias(articulo: ArticuloDiario, dias: string[]): string {
  const ubicaciones: Set<string> = new Set();
  this.fechasUnicas.forEach(fecha => {
    const dia = parseInt(fecha.split('-')[2], 10).toString();
    if (dias.includes(dia)) {
      const conteos = this.getConteosDiariosPorFecha(articulo, fecha);
      conteos.forEach(conteo => {
        if (conteo.ubicacionconteo && conteo.ubicacionconteo.trim() !== '') {
          ubicaciones.add(conteo.ubicacionconteo.trim());
        }
      });
    }
  });
  return ubicaciones.size > 0 ? Array.from(ubicaciones).join(', ') : 'Sin ubicaciones';
}

/**
 * Verifica si un artículo tiene conteos en un rango de días
 */
 tieneConteoEnDias(articulo: ArticuloDiario | ArticuloAgrupado, dias: string[]): boolean {
  let tieneConteo = false;
  this.fechasUnicas.forEach(fecha => {
    const dia = parseInt(fecha.split('-')[2], 10).toString();
    if (dias.includes(dia)) {
      let conteos: any[] = [];
      if ('conteosPorDia' in articulo) { // Es ArticuloDiario
        conteos = this.getConteosDiariosPorFecha(articulo as ArticuloDiario, fecha);
      } else if ('conteosPorFecha' in articulo) { // Es ArticuloAgrupado
        conteos = this.getConteosPorFecha(articulo as ArticuloAgrupado, fecha);
      }
      if (conteos.length > 0) {
        tieneConteo = true;
      }
    }
  });
  return tieneConteo;
}

/**
 * Determina el conteo final aceptado según la jerarquía de conteos/reconteos.
 */
 determinarConteoFinal(conteoDias6_9: number, reconteo10: number, reconteo11: number, stockDisponible: number): number {
  // Jerarquía: reconteo11 > reconteo10 > conteoDias6_9 > stockDisponible
  if (reconteo11 > 0) return reconteo11;
  if (reconteo10 > 0) return reconteo10;
  if (conteoDias6_9 > 0) return conteoDias6_9;
  return stockDisponible; // Si no hay conteos, el conteo final es el stock del sistema.
}

/**
 * Determina el estado del artículo (Conciliado, Pendiente Ajuste).
 */
 determinarEstado(diferenciaFinal: number, stockDisponible: number, cantidadFaltante: number, cantidadSobrante: number): string {
  if (diferenciaFinal === 0) {
    return 'Conciliado (Cero Diferencia)';
  } else if (diferenciaFinal !== 0) {
    return 'Pendiente Ajuste de Inventario';
  }
  return 'Revisar Lógica de Estado';
}


// ============================================
// MÉTODO exportarExcelDiario3 CORREGIDO (COMPLETADO)
// Se han añadido las columnas de Usuarios y Ubicaciones por día.
// ============================================
exportarExcelDiario3(): void {
  if (this.articulosDiarios.length === 0) {
    console.warn('No hay datos de conteos diarios para exportar.');
    return;
  }

  const subHeaders = ['Fecha/Hora', 'Cant. Contada', 'Diferencia', 'Observaciones', 'Usuario', 'Ubicacion'];
  const N_FIXED_COLS = 27; // Columnas fijas originales
  let headerRow1: any[] = [
    'Item', 'ID Bodega', 'Bodega', 'ID Clase', 'Clase', 'ID Grupo', 'Grupo', 'Código', 'Artículo',
    'Descripción', 'Ubicación', 'ID Línea Comp.', 'Línea Competencia',
    'Stock', 'Stock Reservado', 'Stock Disponible', 'FOB', 'Costo Unitario', 'Costo Total', 'Costo Promedio',
    'Precio sin IVA', 'Desc. Máximo',
    '1ª Fecha Compra', 'Última Fecha Compra', 'Cant. Vendida Últ. Mes', 'Nº de Transferencias', 'Unidad'
  ];
  let headerRow2: string[] = Array(27).fill('');

  this.fechasUnicas.forEach(fecha => {
    headerRow1.push(this.formatearFechaCorta(fecha));
    headerRow1.push('', '', '', '', '');
    headerRow2.push(...subHeaders);
  });

  // COLUMNAS DE ANÁLISIS AMPLIADAS CON USUARIOS Y UBICACIONES (22 columnas en total)
  headerRow1.push(
    'Conteo Días 6-9', 'Diferencia Días 6-9', 'Observaciones Días 6-9', 'Usuarios Días 6-9', 'Ubicaciones Días 6-9', // 5 cols
    'Reconteo Día 10', 'Diferencia Día 10', 'Observaciones Día 10', 'Usuarios Día 10', 'Ubicaciones Día 10',     // 5 cols
    'Reconteo Día 11', 'Diferencia Día 11', 'Observaciones Día 11', 'Usuarios Día 11', 'Ubicaciones Día 11',     // 5 cols
    'Conteo Final Aceptado', 'Diferencia Final', 'Cantidad Faltante', 'Costo Total Faltante',                  // 4 cols
    'Cantidad Sobrante', 'Costo Total Sobrante', 'Estado'                                                     // 3 cols
  );
  const numColumnasAnalisis = 22; 
  headerRow2.push(...Array(numColumnasAnalisis).fill(''));

  let maxRowsPerArticle = 1;
  this.articulosDiarios.forEach(articulo => {
    this.fechasUnicas.forEach(fecha => {
      const conteos = this.getConteosDiariosPorFecha(articulo, fecha);
      maxRowsPerArticle = Math.max(maxRowsPerArticle, conteos.length);
    });
  });

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

    // CÁLCULOS PARA LAS COLUMNAS DE ANÁLISIS
    const dias6_9 = ['6', '7', '8', '9'];
    const dias10 = ['10'];
    const dias11 = ['11'];

    const tieneConteo6_9 = this.tieneConteoEnDias(articulo, dias6_9);
    const tieneConteo10 = this.tieneConteoEnDias(articulo, dias10);
    const tieneConteo11 = this.tieneConteoEnDias(articulo, dias11);

    const conteoDias6_9 = tieneConteo6_9 ? this.getSumaConteosPorDias(articulo, dias6_9) : 0;
    const reconteo10 = tieneConteo10 ? this.getSumaReconteosPorDias(articulo, dias10) : 0;
    const reconteo11 = tieneConteo11 ? this.getSumaReconteosPorDias(articulo, dias11) : 0;

    const stockDisponible = articulo.stock_disponible;
    const diferenciaDias6_9 = conteoDias6_9 - stockDisponible;
    const diferenciaDia10 = reconteo10 - stockDisponible;
    const diferenciaDia11 = reconteo11 - stockDisponible;

    // Obtener Observaciones, Usuarios y Ubicaciones
    const obsDias6_9 = tieneConteo6_9 ? this.getObservacionesPorDias(articulo, dias6_9) : 'Sin conteos';
    const users6_9 = tieneConteo6_9 ? this.getUsuariosPorDias(articulo, dias6_9) : 'N/A';
    const ubi6_9 = tieneConteo6_9 ? this.getUbicacionesPorDias(articulo, dias6_9) : 'N/A';
    
    const obsDia10 = tieneConteo10 ? this.getObservacionesPorDias(articulo, dias10) : 'Sin conteos';
    const users10 = tieneConteo10 ? this.getUsuariosPorDias(articulo, dias10) : 'N/A';
    const ubi10 = tieneConteo10 ? this.getUbicacionesPorDias(articulo, dias10) : 'N/A';
    
    const obsDia11 = tieneConteo11 ? this.getObservacionesPorDias(articulo, dias11) : 'Sin conteos';
    const users11 = tieneConteo11 ? this.getUsuariosPorDias(articulo, dias11) : 'N/A';
    const ubi11 = tieneConteo11 ? this.getUbicacionesPorDias(articulo, dias11) : 'N/A';

    const conteoFinalAceptado = this.determinarConteoFinal(conteoDias6_9, reconteo10, reconteo11, stockDisponible);
    const diferenciaFinal = conteoFinalAceptado - stockDisponible;
    const cantidadFaltante = diferenciaFinal < 0 ? Math.abs(diferenciaFinal) : 0;
    const costoTotalFaltante = cantidadFaltante * articulo.costo_promedio;
    const cantidadSobrante = diferenciaFinal > 0 ? diferenciaFinal : 0;
    const costoTotalSobrante = cantidadSobrante * articulo.costo_promedio;

    const estado = this.determinarEstado(diferenciaFinal, stockDisponible, cantidadFaltante, cantidadSobrante);

    for (let r = 0; r < articuloMaxConteos; r++) {
      let row: any[] = [];

      if (r === 0) {
        // Columnas Fijas (27)
        row.push(
          i + 1, articulo.bodega_id, articulo.bodega, articulo.clase_id, articulo.clase,
          articulo.grupo_id, articulo.grupo, articulo.codigo_articulo, articulo.nombre_articulo,
          articulo.descripcion, articulo.ubicacion, articulo.linea_comp_id, articulo.linea_competencia,
          articulo.stock, articulo.stock_reservado, articulo.stock_disponible, articulo.fob,
          articulo.costo_uni, articulo.costo_total, articulo.costo_promedio, articulo.precio_sin_iva,
          articulo.descuento_maximo, this.formatearFecha(articulo.primera_fecha_compra), this.formatearFecha(articulo.ultima_fecha_compra),
          articulo.cant_vendida_ult_mes, articulo.numero_de_transferencias, articulo.unidad
        );
      } else {
        row.push(...Array(N_FIXED_COLS).fill('')); // Celdas vacías para columnas fijas
      }

      // Columnas por Día (6 * N_Fechas)
      this.fechasUnicas.forEach(fecha => {
        const conteos = this.getConteosDiariosPorFecha(articulo, fecha);
        const conteo = conteos[r];

        if (conteo) {
          row.push(
            this.formatearFechaHora(conteo.fechaHora), conteo.cantidad_contada,
            conteo.diferencia, conteo.observaciones, conteo.usuario_contador, conteo.ubicacionconteo
          );
        } else {
          row.push('', '', '', '', '', '');
        }
      });

      // Columnas de Análisis (22)
      if (r === 0) {
        row.push(
          // Días 6-9
          conteoDias6_9, diferenciaDias6_9, obsDias6_9, users6_9, ubi6_9,
          // Día 10
          reconteo10, diferenciaDia10, obsDia10, users10, ubi10,
          // Día 11
          reconteo11, diferenciaDia11, obsDia11, users11, ubi11,
          // Análisis Final
          conteoFinalAceptado, diferenciaFinal,
          -cantidadFaltante, -costoTotalFaltante, 
          cantidadSobrante, costoTotalSobrante, estado
        );
      } else {
        row.push(...Array(numColumnasAnalisis).fill(''));
      }

      data.push(row);
    }

    // Lógica de Merging para columnas fijas y de análisis
    if (articuloMaxConteos > 1) {
      for (let c = 0; c < N_FIXED_COLS; c++) { 
        merges.push({
          s: { r: articuloRowStart, c: c },
          e: { r: articuloRowStart + articuloMaxConteos - 1, c: c }
        });
      }

      const startAnalysisCol = N_FIXED_COLS + (this.fechasUnicas.length * subHeaders.length);
      for (let c = startAnalysisCol; c < startAnalysisCol + numColumnasAnalisis; c++) { 
        merges.push({
          s: { r: articuloRowStart, c: c },
          e: { r: articuloRowStart + articuloMaxConteos - 1, c: c }
        });
      }
    }

    currentRow += articuloMaxConteos;
  });

  // Lógica de Merging para encabezados (Fechas y Análisis)
  let currentHeaderCol = N_FIXED_COLS;
  this.fechasUnicas.forEach(() => {
    merges.push({
      s: { r: 0, c: currentHeaderCol },
      e: { r: 0, c: currentHeaderCol + subHeaders.length - 1 }
    });
    currentHeaderCol += subHeaders.length;
  });
  
  // Encabezado de Análisis
  merges.push({
    s: { r: 0, c: currentHeaderCol },
    e: { r: 0, c: currentHeaderCol + numColumnasAnalisis - 1 }
  });

  const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(data);
  worksheet['!merges'] = merges;

  // Configuración de ancho de columnas
  const columnWidths = [
    { wch: 6 }, { wch: 10 }, { wch: 20 }, { wch: 10 }, { wch: 20 },
    { wch: 10 }, { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 40 },
    { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 15 },
    { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
    { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 },
    { wch: 18 }, { wch: 10 }
  ];

  this.fechasUnicas.forEach(() => {
    columnWidths.push({ wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 40 }, { wch: 18 }, { wch: 20 });
  });

  // Análisis (22 Columnas)
  columnWidths.push(
    // Días 6-9
    { wch: 18 }, { wch: 18 }, { wch: 40 }, { wch: 25 }, { wch: 25 },
    // Día 10
    { wch: 18 }, { wch: 18 }, { wch: 40 }, { wch: 25 }, { wch: 25 },
    // Día 11
    { wch: 18 }, { wch: 18 }, { wch: 40 }, { wch: 25 }, { wch: 25 },
    // Final
    { wch: 18 }, { wch: 15 }, { wch: 18 },
    { wch: 18 }, { wch: 18 }, { wch: 18 },
    { wch: 30 }
  );

  worksheet['!cols'] = columnWidths;
  const workbook = { Sheets: { 'Conteos Diarios': worksheet }, SheetNames: ['Conteos Diarios'] };
  const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  this.guardarExcel(excelBuffer, 'conteos-inventario-diario-API-mejorada');
}

/*

private getSumaConteosPorDias(articulo: ArticuloDiario, dias: string[]): number {
    let suma = 0;
    this.fechasUnicas.forEach(fecha => {
      const dia = parseInt(fecha.split('-')[2], 10).toString();
      if (dias.includes(dia)) {
        const conteos = this.getConteosDiariosPorFecha(articulo, fecha);
        conteos.forEach(conteo => suma += conteo.cantidad_contada || 0);
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
        conteos.forEach(conteo => suma += conteo.cantidad_contada || 0);
      }
    });
    return suma;
  }

  private determinarConteoFinal(conteo6_9: number, reconteo10: number, reconteo11: number, stockDisponible: number): number {
    if (conteo6_9 === 0 && reconteo10 === 0 && reconteo11 === 0) return 0;

    const opciones = [
      { valor: conteo6_9, diferencia: Math.abs(stockDisponible - conteo6_9) },
      { valor: reconteo10, diferencia: Math.abs(stockDisponible - reconteo10) },
      { valor: reconteo11, diferencia: Math.abs(stockDisponible - reconteo11) }
    ].filter(o => o.valor > 0);

    if (opciones.length === 0) return 0;
    
    opciones.sort((a, b) => a.diferencia - b.diferencia);
    return opciones[0].valor;
  }

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

  private determinarEstado(diferenciaFinal: number, stockDisponible: number, cantidadFaltante: number, cantidadSobrante: number): string {
    if (diferenciaFinal === 0) return 'COMPLETO';
    
    if (cantidadSobrante > 0) {
      const porcentaje = (cantidadSobrante / stockDisponible) * 100;
      if (porcentaje > 50) return 'SOBRANTE ';
      if (porcentaje > 20) return 'SOBRANTE ';
      if (porcentaje > 5) return 'SOBRANTE ';
      return 'SOBRANTE';
    }
    
    if (cantidadFaltante > 0) {
      const porcentaje = (cantidadFaltante / stockDisponible) * 100;
      if (porcentaje > 50) return 'FALTANTE ';
      if (porcentaje > 20) return 'FALTANTE ';
      if (porcentaje > 5) return 'FALTANTE ';
      return 'FALTANTE ';
    }
    
    if (stockDisponible === 0) {
      return diferenciaFinal > 0 ? 'SOBRANTE FUERA DE INVENTARIO' : 'SIN STOCK DISPONIBLE';
    }
    
    return 'REVISAR';
  }
*/
  exportarExcelDiario(): void {
    const excelData: any[] = [];
    let itemNumber = 1;

    this.articulosDiarios.forEach(articulo => {
      this.fechasUnicas.forEach(fecha => {
        const conteosDia = this.getConteosDiariosPorFecha(articulo, fecha);
        if (conteosDia.length > 0) {
          conteosDia.forEach(conteo => {
            excelData.push({
              'Item': itemNumber,
              'Código': articulo.codigo_articulo,
              'Artículo': articulo.nombre_articulo,
              'Descripción': articulo.descripcion,
              'Stock Disponible': articulo.stock_disponible,
              'Unidad': articulo.unidad,
              'Costo Promedio': articulo.costo_promedio,
              'Fecha': fecha,
              'Fecha y Hora': this.formatearFechaHora(conteo.fechaHora),
              'Cantidad Contada': conteo.cantidad_contada,
              'Diferencia': conteo.diferencia,
              'Observaciones': conteo.observaciones,
              'Usuario Contador': conteo.usuario_contador
            });
          });
        }
      });
      itemNumber++;
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    const columnWidths = [
      { wch: 6 }, { wch: 15 }, { wch: 30 }, { wch: 35 }, { wch: 15 },
      { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 15 },
      { wch: 12 }, { wch: 40 }, { wch: 20 }
    ];

    worksheet['!cols'] = columnWidths;

    const workbook = { 
      Sheets: { 'Conteos Diarios': worksheet }, 
      SheetNames: ['Conteos Diarios'] 
    };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    this.guardarExcel(excelBuffer, 'conteos-diarios');
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
      { wch: 6 }, { wch: 15 }, { wch: 30 }, { wch: 35 }, { wch: 10 },
      { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }
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
      { wch: 6 }, { wch: 15 }, { wch: 30 }, { wch: 35 }, { wch: 10 },
      { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }
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
      { wch: 6 }, { wch: 15 }, { wch: 30 }, { wch: 35 }, { wch: 15 },
      { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 40 },
      { wch: 15 }, { wch: 18 }, { wch: 40 }, { wch: 15 }, { wch: 18 }, { wch: 40 }
    ];

    worksheet['!cols'] = columnWidths;

    const workbook = { 
      Sheets: { 'Artículos con Diferencias': worksheet }, 
      SheetNames: ['Artículos con Diferencias'] 
    };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    this.guardarExcel(excelBuffer, 'articulos-con-diferencias');
  }
/*
  guardarExcel(buffer: any, fileName: string): void {
    const data: Blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(data);
    link.download = `${fileName}_${new Date().getTime()}.xlsx`;
    link.click();
  }*/

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
    this.conteosService.getConteosFueraInventario(Number(this.blId)).subscribe({
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
      { wch: 6 }, { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 40 },
      { wch: 12 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 20 },
      { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 50 },
      { wch: 15 }, { wch: 18 }, { wch: 40 }, { wch: 20 }, { wch: 15 },
      { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
      { wch: 30 }, { wch: 60 }
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
      { wch: 6 }, { wch: 20 }, { wch: 40 }, { wch: 15 }, { wch: 18 },
      { wch: 15 }, { wch: 30 }, { wch: 35 }, { wch: 30 }, { wch: 15 },
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

  // En alldays.component.ts

// ... (después de las funciones existentes de exportación)

/**
 * Exporta los conteos de artículos fuera de inventario en un formato horizontal,
 * mostrando los detalles de cada día de conteo en columnas contiguas (pivotado por fecha).
 * Se asemeja al formato diario de artículos en inventario.
 */
exportarExcelFueraInventarioPorDiaHorizontal(): void {
    if (this.conteosFueraInventario.length === 0) {
      alert('No hay datos de conteos fuera de inventario para exportar.');
      return;
    }

    // 1. Recopilar fechas únicas
    const fechasSet = new Set<string>();
    this.conteosFueraInventario.forEach(conteo => {
      if (conteo.fecha_formateada) {
        fechasSet.add(conteo.fecha_formateada);
      }
    });
    const fechasUnicas = Array.from(fechasSet).sort();
    
    // 2. Agrupar por artículo y consolidar data detallada por día
    const articulosFueraInventarioMap = new Map<string, any>();
    let maxRowsPerArticle = 1;

    this.conteosFueraInventario.forEach((conteo: any) => {
      const key = conteo.codigo_interno_agencia;
      const fecha = conteo.fecha_formateada;
      
      if (!articulosFueraInventarioMap.has(key)) {
        articulosFueraInventarioMap.set(key, {
          codigo: conteo.codigo_interno_agencia,
          descripcion: conteo.descripcion,
          unidad: conteo.unidades ? conteo.unidades.split(',')[0].trim() : '',
          campana_id: conteo.campana_id,
          conteoDetallesPorFecha: new Map<string, any[]>() // Detalles de los conteos individuales del día
        });
      }

      const articulo = articulosFueraInventarioMap.get(key)!;
      
      // El campo 'detalle_conteos_dia' contiene el detalle de cada conteo individual.
      // Lo parsearemos o usaremos como está si ya es un array.
      let detalles = [];
      try {
        detalles = JSON.parse(conteo.detalle_conteos_dia);
      } catch (e) {
        // Si no es JSON válido (ej. es un string simple), lo añadimos como un solo detalle
        detalles = [{
          fechaHora: conteo.hora_primer_conteo, // Usamos la hora del primer conteo como placeholder
          cantidad_contada: conteo.cantidad_total_dia,
          observaciones: conteo.observaciones_dia,
          usuario_contador: conteo.usuarios_nombres,
          ubicacionconteo: conteo.ubicaciones
        }];
      }
      
      articulo.conteoDetallesPorFecha.set(fecha, detalles);
      maxRowsPerArticle = Math.max(maxRowsPerArticle, detalles.length);
    });

    // 3. Construcción del Header
    const subHeaders = ['Fecha/Hora', 'Cant. Contada', 'Valor Total Día', 'Observaciones', 'Usuario', 'Ubicacion', 'Requiere Reconteo'];
    
    // Encabezados Fijos (ajustados a los datos fuera de inventario)
    let headerRow1: any[] = [
      'Item', 'Código Artículo', 'Descripción', 'Campaña ID', 'Unidad'
    ];
    let headerRow2: string[] = Array(headerRow1.length).fill(''); 
    
    // Encabezados Dinámicos por Fecha
    fechasUnicas.forEach(fecha => {
      headerRow1.push(fecha); // Encabezado de la fecha (Ej: 2025-10-06)
      headerRow1.push(...Array(subHeaders.length - 1).fill('')); // Celdas vacías para fusionar
      headerRow2.push(...subHeaders); // Subencabezados diarios
    });

    let data: any[][] = [headerRow1, headerRow2];
    const merges: Range[] = [];
    let currentRow = 2; // Fila donde comienzan los datos

    // 4. Construcción de las Filas de Datos y Merges
    Array.from(articulosFueraInventarioMap.values()).forEach((articulo, i) => {
      const articuloRowStart = currentRow;
      let articuloMaxConteos = 1;

      // Encontrar el máximo de conteos individuales en un solo día para este artículo
      articulo.conteoDetallesPorFecha.forEach((detalles: any[]) => {
        articuloMaxConteos = Math.max(articuloMaxConteos, detalles.length);
      });
      
      for (let r = 0; r < articuloMaxConteos; r++) {
        let row: any[] = [];
        
        // Datos Fijos del Artículo (Solo en la primera fila del bloque)
        if (r === 0) {
          row.push(
            i + 1, articulo.codigo, articulo.descripcion, articulo.campana_id, articulo.unidad
          );
        } else {
          row.push(...Array(headerRow1.length).fill('')); // Celdas vacías para las columnas fijas
        }

        // Datos Diarios Detallados (Por cada fecha y subconteo)
        fechasUnicas.forEach(fecha => {
          const detalles = articulo.conteoDetallesPorFecha.get(fecha) || [];
          const detalle = detalles[r]; // El conteo individual r de ese día
          
          if (detalle) {
            // Nota: Aquí se usa 'cantidad_total_dia' y 'valor_total_dia' del resumen del día
            // como datos de la primera fila, y luego detalles individuales en el resto.
            // Para simplificar, usaremos los detalles individuales si están disponibles.
            
            // Dado que no tenemos 'Diferencia' o 'Stock Disponible' en esta data,
            // usaremos 'Valor Total' para mostrar una métrica adicional.
            row.push(
              detalle.fechaHora || '', 
              detalle.cantidad_contada || '',
              detalle.valor_total_dia || '', // Este dato es más un resumen diario. Se puede dejar en blanco si se prioriza el detalle.
              detalle.observaciones || '', 
              detalle.usuario_contador || '', 
              detalle.ubicacionconteo || '',
              detalle.requiere_reconteo || '' // Este dato es más un resumen diario.
            );
          } else {
            row.push(...Array(subHeaders.length).fill(''));
          }
        });
        
        data.push(row);
      }
      
      // Aplicar Fusión (Merge) a las Columnas Fijas
      if (articuloMaxConteos > 1) {
        for (let c = 0; c < 5; c++) { // 5 columnas fijas: Item, Código, Descripción, Campaña ID, Unidad
          merges.push({
            s: { r: articuloRowStart, c: c }, 
            e: { r: articuloRowStart + articuloMaxConteos - 1, c: c }
          });
        }
      }

      currentRow += articuloMaxConteos;
    });

    // 5. Aplicar Fusión (Merge) a las Filas de Encabezado de Fecha
    let currentHeaderCol = headerRow1.length - (fechasUnicas.length * subHeaders.length); // Columna inicial para los encabezados de fecha
    fechasUnicas.forEach(() => {
      merges.push({
        s: { r: 0, c: currentHeaderCol },
        e: { r: 0, c: currentHeaderCol + subHeaders.length - 1 }
      });
      currentHeaderCol += subHeaders.length;
    });

    // 6. Generar el archivo Excel
    const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(data);
    worksheet['!merges'] = merges;
    
    // Configuración de ancho de columnas (Opcional, pero recomendado)
    const columnWidths = [
      { wch: 6 }, { wch: 20 }, { wch: 40 }, { wch: 12 }, { wch: 10 } // Fijos
    ];
    fechasUnicas.forEach(() => {
      columnWidths.push(
        { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 40 }, { wch: 18 }, { wch: 20 }, { wch: 18 } // Diarios
      );
    });
    worksheet['!cols'] = columnWidths;

    const workbook = { 
      Sheets: { 'Fuera Inventario Horizontal': worksheet }, 
      SheetNames: ['Fuera Inventario Horizontal'] 
    };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    this.guardarExcel(excelBuffer, 'conteos-fuera-inventario-horizontal');
  }
}