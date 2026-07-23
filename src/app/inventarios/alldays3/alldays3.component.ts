import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { InventarioService } from 'src/app/services/inventario.service';
import * as XLSX from 'xlsx';
import { Range } from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Agencia } from 'src/app/services/agentamientos.service';

// ─── Interfaces (sin cambios) ────────────────────────────────────────────────

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
  tiene_conteo: boolean;
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
  tiene_conteo: boolean;
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
  [key: string]: any;   // permite acceso dinámico a analisisGrupoX
  conteoFinalAceptado: number;
  diferenciaFinal: number;
  cantidadFaltanteTotal: number;
  costoTotalFaltante: number;
  cantidadSobranteTotal: number;
  costoTotalSobrante: number;
  estado: string;
  tipo: 'Contado' | 'No Contado' | 'Fuera de Inventario';
  tiene_conteo: boolean;   // ← campo directo del backend: true=contado, false=pendiente
}

// ─── Interfaz para grupo de análisis dinámico ─────────────────────────────────
interface GrupoAnalisis {
  nombre: string;
  dias: string[];
  prop: string;
}

@Component({
  selector: 'app-alldays3',
  templateUrl: './alldays3.component.html',
  styleUrls: ['./alldays3.component.css']
})
export class Alldays3Component implements OnInit, OnChanges {

  // ── @Input: permite usar el componente embebido con <app-alldays [agenciaId]="5">
  @Input() agenciaId: number = 0;

  conteos: ConteoInventario[] = [];
  articulosAgrupados: ArticuloAgrupado[] = [];
  articulosConDiferencias: ArticuloAgrupado[] = [];
  articulosDiarios: ArticuloDiario[] = [];
  fechasUnicas: string[] = [];
  gruposFechas: GrupoFechas[] = [];
  loading: boolean = false;
  conteosFueraInventario: any[] = [];
  loadingFueraInventario: boolean = false;
  public analisisVarianzas: AnalisisVarianzaArticulo[] = [];

  public Math = Math;
  agencias: Agencia[] = [];

  // ── gruposAnalisis se construye dinámicamente en configurarGruposFechas()
  public gruposAnalisis: GrupoAnalisis[] = [];
  agenciaSeleccionada: any = null;

  constructor(
    private conteosService: InventarioService,
    private route: ActivatedRoute,
    private inventarioService: InventarioService
  ) {}

  ngOnInit(): void {
    // Leer el parámetro de ruta :id  (ruta: /alldays3/:id)
    

    if (!this.agenciaId) {
      const paramId = this.route.snapshot.paramMap.get('id');
      this.agenciaId = paramId ? Number(paramId) : 0;
      this.cargarAgencias();
    }

   
  }

    cargarAgencias() {
    //  console.log(this.agenciaId);
      
  this.inventarioService.getAgencias().subscribe({
    next: (data: any) => {
      this.agencias = Array.isArray(data) ? data : Object.values(data);

      // ✅ Buscar la agencia que corresponde al agenciaId actual
      if (this.agenciaId) {
        const agenciaEncontrada = this.agencias.find(
          (ag: any) =>
            ag.idSerial === this.agenciaId                     // PK directo
        );

        if (agenciaEncontrada) {
          console.log(agenciaEncontrada);
          
          this.agenciaSeleccionada = Number(agenciaEncontrada.idAgencia);;
          console.log('Agencia encontrada:', agenciaEncontrada);
           
              this.cargarDatos();
            
        } else {
          console.warn('No se encontró agencia con id:', this.agenciaId);
        }
      }
    },
    error: () => console.error('Error al cargar agencias')
  });
}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['agenciaId'] && !changes['agenciaId'].firstChange) {
      this.resetearDatos();
      this.cargarDatos();
    }
  }

  // ── Resetea el estado antes de cargar una agencia diferente ──────────────
  private resetearDatos(): void {
    this.conteos = [];
    this.articulosAgrupados = [];
    this.articulosConDiferencias = [];
    this.articulosDiarios = [];
    this.fechasUnicas = [];
    this.gruposFechas = [];
    this.gruposAnalisis = [];
    this.analisisVarianzas = [];
    this.conteosFueraInventario = [];
  }

  cargarDatos(): void {
    this.cargarConteos();
    this.cargarConteosFueraInventario();
  }

  cargarConteos(): void {
    this.loading = true;
    this.conteosService.getConteosInventario1(this.agenciaSeleccionada,3).subscribe({
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

  cargarConteosFueraInventario(): void {
    this.loadingFueraInventario = true;
    this.conteosService.getConteosFueraInventario(this.agenciaSeleccionada).subscribe({
      next: (data) => {
        this.conteosFueraInventario = data;
        this.loadingFueraInventario = false;
      },
      error: (error) => {
        console.error('Error al cargar conteos fuera de inventario:', error);
        this.loadingFueraInventario = false;
      }
    });
  }

  // ─── Procesamiento de datos ──────────────────────────────────────────────

  procesarDatos(): void {
    const agrupados = new Map<string, ArticuloAgrupado>();
    const fechasSet = new Set<string>();

    this.conteos.forEach(conteo => {
      const key = conteo.codigo_articulo;
      const fecha = this.formatearFecha(conteo.fecha_conteo);

      // Solo registrar fechas reales (tiene_conteo=true y no fecha fantasma 1970-01-01)
      if (conteo.tiene_conteo === true && fecha && fecha !== '1970-01-01') {
        fechasSet.add(fecha);
      }

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

      // Solo agregar el conteo al mapa si fue realmente contado
      if (conteo.tiene_conteo === true) {
        const articulo = agrupados.get(key)!;
        if (!articulo.conteosPorFecha[fecha]) {
          articulo.conteosPorFecha[fecha] = [];
        }
        articulo.conteosPorFecha[fecha].push(conteo);
      }
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
          conteosPorDia: {},
          tiene_conteo: conteo.tiene_conteo === true
        });
      }

      const articulo = agrupadosDiarios.get(key)!;
      if (conteo.tiene_conteo === true) {
        articulo.tiene_conteo = true;
      }

      // Solo agregar datos de conteo reales (bloquea fecha fantasma 1970-01-01)
      if (conteo.tiene_conteo === true && fecha && fecha !== '1970-01-01') {
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
      }
    });

    this.articulosDiarios = Array.from(agrupadosDiarios.values());
  }

  private getCantidadValida(conteo: ConteoInventario): number {
    if (conteo.cantidad_reconteo !== undefined && conteo.cantidad_reconteo !== null) {
      return conteo.cantidad_reconteo;
    }
    return conteo.cantidad_contada || 0;
  }

  // ─── Configuración dinámica de grupos de fechas ──────────────────────────
  //
  // LÓGICA:  Los datos pueden venir para cualquier agencia con cualquier rango
  // de días.  En lugar de asumir "días 6-9 / 10 / 11", calculamos los grupos
  // de forma automática:
  //
  //   • Si hay ≥ 2 fechas distintas: la primera mitad es "Conteo Principal" y
  //     cada fecha posterior individual es un "Reconteo N".
  //   • Si solo hay 1 fecha: es el "Conteo Único".
  //
  // Esto funciona para cualquier agencia con cualquier calendario de conteo.
  // ─────────────────────────────────────────────────────────────────────────

  configurarGruposFechas(): void {
    this.gruposFechas = [];
    this.gruposAnalisis = [];

    if (this.fechasUnicas.length === 0) return;

    const totalFechas = this.fechasUnicas.length;

    if (totalFechas === 1) {
      // Un solo día de conteo
      const diasStr = this.fechasUnicas[0].split('-')[2];
      this.gruposFechas.push({ nombre: 'Conteo Único', fechas: this.fechasUnicas, dias: diasStr });
      this.gruposAnalisis.push({ nombre: 'Conteo Único', dias: [diasStr], prop: 'analisisGrupo0' });
      return;
    }

    // Separar: la primera mitad de fechas = conteo principal
    //          las restantes = reconteos individuales
    const mitad = Math.max(1, Math.floor(totalFechas / 2));
    const fechasConteo = this.fechasUnicas.slice(0, mitad);
    const fechasReconteo = this.fechasUnicas.slice(mitad);

    // Grupo de conteo principal
    const diasConteo = fechasConteo.map(f => f.split('-')[2]);
    const nombreGrupoConteo = diasConteo.length === 1
      ? `Día ${diasConteo[0]}`
      : `Días ${diasConteo[0]} al ${diasConteo[diasConteo.length - 1]}`;

    this.gruposFechas.push({
      nombre: nombreGrupoConteo,
      fechas: fechasConteo,
      dias: diasConteo.join(',')
    });
    this.gruposAnalisis.push({
      nombre: nombreGrupoConteo,
      dias: diasConteo,
      prop: 'analisisGrupo0'
    });

    // Grupos de reconteo (uno por fecha)
    fechasReconteo.forEach((fecha, idx) => {
      const dia = fecha.split('-')[2];
      const nombre = `Reconteo – Día ${dia}`;
      this.gruposFechas.push({ nombre, fechas: [fecha], dias: dia });
      this.gruposAnalisis.push({ nombre, dias: [dia], prop: `analisisGrupo${idx + 1}` });
    });
  }

  // ─── Métodos de apoyo (sin cambios de lógica) ────────────────────────────

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
    const [, month, day] = fecha.split('-');
    return `${day}/${month}`;
  }

  obtenerFechaActual(): string {
    const hoy = new Date();
    const dia = String(hoy.getDate()).padStart(2, '0');
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const anio = hoy.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  calcularDiferencia(cantidadContada: number, stockDisponible: number): number {
    return cantidadContada - stockDisponible;
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
      const conteos = this.getConteosPorFecha(articulo, fecha);
      conteos.forEach(conteo => {
        suma += conteo.cantidad_contada || 0;
      });
    });
    return suma;
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

  filtrarArticulosConDiferencias(): void {
    this.articulosConDiferencias = this.articulosAgrupados.filter(articulo => {
      const grupoConteo = this.gruposFechas[0];
      if (!grupoConteo) return false;

      const sumaConteo = this.getSumaConteosGrupo(articulo, grupoConteo.fechas);
      const diferencia = this.calcularDiferencia(sumaConteo, articulo.stock_disponible);
      if (diferencia === 0) return false;

      // Si existen reconteos, verificar si alguno concilia
      for (let i = 1; i < this.gruposFechas.length; i++) {
        const reconteo = this.getSumaConteosGrupo(articulo, this.gruposFechas[i].fechas);
        if (this.calcularDiferencia(reconteo, articulo.stock_disponible) === 0) return false;
      }

      return true;
    });
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

  // ─── Generación dinámica de análisis de varianzas ────────────────────────

  generarAnalisisVarianzas(): void {
    this.analisisVarianzas = this.articulosDiarios.map(articulo => {
      const stockDisponible = articulo.stock_disponible;

      // Inicializar análisis con propiedades dinámicas para cada grupo
      const analisis: AnalisisVarianzaArticulo = {
        codigo_articulo: articulo.codigo_articulo,
        nombre_articulo: articulo.descripcion,
        stock_disponible: stockDisponible,
        costo_promedio: articulo.costo_promedio,
        unidad: articulo.unidad,
        conteoFinalAceptado: stockDisponible,
        diferenciaFinal: 0,
        cantidadFaltanteTotal: 0,
        costoTotalFaltante: 0,
        cantidadSobranteTotal: 0,
        costoTotalSobrante: 0,
        estado: 'No Contado',
        tipo: 'No Contado',
        tiene_conteo: articulo.tiene_conteo === true   // ← propagado del backend
      };

      // Inicializar todas las props de grupo
      this.gruposAnalisis.forEach(g => {
        analisis[g.prop] = { ...this.VARIANZA_BASE };
      });

      const sumasPorGrupo: number[] = [];

      this.gruposAnalisis.forEach((grupo, idx) => {
        const prop = grupo.prop;
        const tieneConteo = this.tieneConteoEnDias(articulo, grupo.dias);

        if (tieneConteo) {
          const sumaContada = this.getSumaConteosPorDias(articulo, grupo.dias);
          sumasPorGrupo[idx] = sumaContada;

          const detalle = this.getDetalleVarianzasPorDias(articulo, grupo.dias);
          const diferenciaTotal = sumaContada - stockDisponible;
          const observaciones = this.getObservacionesPorDias(articulo, grupo.dias);

          analisis[prop] = {
            diferenciaTotal,
            totalContado: sumaContada,
            faltante: detalle.faltante,
            sobrante: detalle.sobrante,
            observaciones
          };
        } else {
          sumasPorGrupo[idx] = 0;
        }
      });

      const conteoFinalAceptado = this.determinarConteoFinalDinamico(sumasPorGrupo, stockDisponible);
      const diferenciaFinal = conteoFinalAceptado - stockDisponible;
      const totalContadoGeneral = sumasPorGrupo.reduce((a, b) => a + b, 0);

      analisis.tipo = totalContadoGeneral > 0 ? 'Contado' : 'No Contado';

      const cantidadFaltanteTotal = diferenciaFinal < 0 ? Math.abs(diferenciaFinal) : 0;
      const cantidadSobranteTotal = diferenciaFinal > 0 ? diferenciaFinal : 0;

      analisis.conteoFinalAceptado = conteoFinalAceptado;
      analisis.diferenciaFinal = diferenciaFinal;
      analisis.cantidadFaltanteTotal = -cantidadFaltanteTotal;
      analisis.costoTotalFaltante = -cantidadFaltanteTotal * articulo.costo_promedio;
      analisis.cantidadSobranteTotal = cantidadSobranteTotal;
      analisis.costoTotalSobrante = cantidadSobranteTotal * articulo.costo_promedio;

      // Si el artículo NO fue contado, el estado siempre es PENDIENTE (no usar el fallback)
      if (!articulo.tiene_conteo) {
        analisis.estado = 'Pendiente por Contar';
        analisis.tipo = 'No Contado';
      } else {
        analisis.estado = this.determinarEstado(diferenciaFinal, stockDisponible, cantidadFaltanteTotal, cantidadSobranteTotal);
      }

      return analisis;
    });
  }

  // Determina el conteo final: usa el último reconteo no-cero si existe,
  // de lo contrario el primer conteo, de lo contrario el stock del sistema.
  determinarConteoFinalDinamico(sumasPorGrupo: number[], stockDisponible: number): number {
    for (let i = sumasPorGrupo.length - 1; i >= 0; i--) {
      if (sumasPorGrupo[i] > 0) return sumasPorGrupo[i];
    }
    return stockDisponible;
  }

  // Mantenemos este método por compatibilidad con llamadas existentes
  determinarConteoFinal(conteo6_9: number, reconteo10: number, reconteo11: number, stockDisponible: number): number {
    return this.determinarConteoFinalDinamico([conteo6_9, reconteo10, reconteo11], stockDisponible);
  }

  tieneConteoEnDias(articulo: ArticuloDiario, dias: string[]): boolean {
    return this.fechasUnicas.some(fecha => {
      const dia = fecha.split('-')[2];   // '02' no '2' — debe coincidir con gruposAnalisis
      if (!dias.includes(dia)) return false;
      return (this.getConteosDiariosPorFecha(articulo, fecha).length > 0);
    });
  }

  getSumaConteosPorDias(articulo: ArticuloDiario, dias: string[]): number {
    let suma = 0;
    this.fechasUnicas.forEach(fecha => {
      const dia = fecha.split('-')[2];   // '02' no '2'
      if (dias.includes(dia)) {
        this.getConteosDiariosPorFecha(articulo, fecha).forEach(c => { suma += c.cantidad_contada || 0; });
      }
    });
    return suma;
  }

  getSumaReconteosPorDias(articulo: ArticuloDiario, dias: string[]): number {
    return this.getSumaConteosPorDias(articulo, dias);
  }

  getDetalleVarianzasPorDias(articulo: ArticuloDiario, dias: string[]): { faltante: number, sobrante: number } {
    const totalContado = this.getSumaConteosPorDias(articulo, dias);
    const diferenciaTotal = totalContado - articulo.stock_disponible;
    return {
      faltante: diferenciaTotal < 0 ? Math.abs(diferenciaTotal) : 0,
      sobrante: diferenciaTotal > 0 ? diferenciaTotal : 0
    };
  }

  getObservacionesPorDias(articulo: ArticuloDiario, dias: string[]): string {
    const observaciones = new Set<string>();
    this.fechasUnicas.forEach(fecha => {
      const dia = fecha.split('-')[2];   // '02' no '2'
      if (dias.includes(dia)) {
        this.getConteosDiariosPorFecha(articulo, fecha).forEach(c => {
          if (c.observaciones && c.observaciones.trim() !== '' && c.observaciones !== 'Sin observaciones') {
            observaciones.add(c.observaciones.trim());
          }
        });
      }
    });
    return observaciones.size > 0 ? Array.from(observaciones).join(' | ') : 'Sin observaciones';
  }

  determinarEstado(diferenciaFinal: number, stockDisponible: number, faltante: number, sobrante: number): string {
    if (stockDisponible === 0 && diferenciaFinal > 0) return 'Fuera de Inventario (Sobrante)';
    if (diferenciaFinal === 0) return 'Conciliado OK';
    if (diferenciaFinal < 0) return `Ajuste Faltante (${faltante})`;
    return `Ajuste Sobrante (+${sobrante})`;
  }

  // ─── Métodos de información general del inventario ───────────────────────
  //  Todos leen los datos que vienen del backend; ninguno tiene texto hardcodeado.

  /** Nombre de la bodega/agencia leído directamente de los datos */
  getNombreBodega(): string {
    if (this.conteos.length > 0) {
      return (this.conteos[0].nombre_agencia || '').toUpperCase() || 'BODEGA NO IDENTIFICADA';
    }
    return 'CARGANDO...';
  }

  /** Nombre corto de la empresa: si el backend no lo provee, se deriva del nombre_agencia */
  getNombreEmpresa(): string {
    if (this.articulosDiarios.length > 0) {
      const bodega = (this.articulosDiarios[0] as any).empresa || '';
      if (bodega) return bodega.toUpperCase();
    }
    // Fallback: extraer empresa del nombre de agencia (ej: "VEHICENTRO - SAMBORONDON" → "VEHICENTRO")
    const nombreAgencia = this.getNombreBodega();
    const partes = nombreAgencia.split(/[-–]/);
    return partes[0].trim() || nombreAgencia;
  }

  /** Código de inventario dinámico: agenciaId + año en curso */
  getCodigoInventario(): string {
    const anio = new Date().getFullYear();
    const id = String(this.agenciaId).padStart(3, '0');
    return `${id}-${anio}`;
  }

  getPeriodoFiscal(): string {
    return new Date().getFullYear().toString();
  }

  getFechaAnalisis(): string {
    if (this.fechasUnicas.length > 0) {
      return this.formatearFechaCorta(this.fechasUnicas[this.fechasUnicas.length - 1]);
    }
    return this.obtenerFechaActual();
  }

  getDiasConteo(): string {
    if (this.fechasUnicas.length > 0) {
      const dias = this.fechasUnicas.length;
      return `${dias} ${dias === 1 ? 'día' : 'días'}${dias > 1 ? ' consecutivos' : ''}`;
    }
    return 'No disponible';
  }

  getMetodoConteo(): string {
    if (this.gruposAnalisis.length === 0) return 'Conteo múltiple con verificación';
    const nombres = this.gruposAnalisis.map(g => g.nombre).join(', ');
    return `Conteo con verificación: ${nombres}`;
  }

  getRangoDiasConteo(): string {
    if (this.fechasUnicas.length === 0) return 'No disponible';
    const primeraFecha = this.fechasUnicas[0];
    const ultimaFecha  = this.fechasUnicas[this.fechasUnicas.length - 1];
    const primerDia = parseInt(primeraFecha.split('-')[2]);
    const ultimoDia = parseInt(ultimaFecha.split('-')[2]);
    if (primerDia === ultimoDia) return `Día ${primerDia}`;
    return `Días ${primerDia} al ${ultimoDia}`;
  }

  getResponsablesConteo(): string {
    if (this.conteos.length === 0) return 'Información no disponible';

    const responsables = new Set<string>();
    this.conteos.forEach(c => {
      const usuario = (c.usuario_contador || '').trim().toLowerCase();
      if (!usuario || usuario === 'sin asignar' || usuario === 'sinasignar' || usuario === 'sin_asignar') {
        responsables.add('Sin Asignar');
      } else {
        responsables.add(c.usuario_contador.toUpperCase());
      }
    });
    return Array.from(responsables).join(', ') || 'Sin información';
  }

  // ─── KPIs y métricas (sin cambios lógicos) ──────────────────────────────

  calcularTotalFaltantes(): number {
    return this.analisisVarianzas.reduce((t, i) => t + Math.abs(i.cantidadFaltanteTotal), 0);
  }

  calcularTotalSobrantes(): number {
    return this.analisisVarianzas.reduce((t, i) => t + i.cantidadSobranteTotal, 0);
  }

  calcularConciliados(): number {
    return this.analisisVarianzas.filter(i => i.estado === 'Conciliado OK').length;
  }

  getValorTotalSistema(): number {
    return this.articulosDiarios.reduce((t, a) => t + a.stock_disponible * a.costo_promedio, 0);
  }

  getValorFisicoVerificado(): number {
    // Solo suma artículos que YA fueron contados físicamente.
    // Los artículos pendientes NO se incluyen: aún no hay evidencia física de ellos.
    return this.analisisVarianzas
      .filter(a => a.tiene_conteo)
      .reduce((t, a) => t + a.conteoFinalAceptado * a.costo_promedio, 0);
  }

  getDiferenciaNeta(): number {
    return this.getValorFisicoVerificado() - this.getValorTotalSistema();
  }

  getPorcentajeVariacion(): number {
    const valorSistema = this.getValorTotalSistema();
    return valorSistema === 0 ? 0 : (this.getDiferenciaNeta() / valorSistema) * 100;
  }

  getPrecisionGlobal(): number {
    const total = this.analisisVarianzas.length;
    return total === 0 ? 0 : (this.calcularConciliados() / total) * 100;
  }

  getValorTotalFaltantes(): number {
    return Math.abs(this.analisisVarianzas.reduce((t, i) => t + i.costoTotalFaltante, 0));
  }

  getValorTotalSobrantes(): number {
    return this.getValorTotalSobrantesConteo() + this.getValorTotalSobrantesFueraInventario();
  }

  getValorTotalSobrantes1(): number {
    return this.analisisVarianzas.reduce((t, i) => t + i.costoTotalSobrante, 0);
  }

  getArticulosFaltantes(): AnalisisVarianzaArticulo[] {
    return this.analisisVarianzas.filter(i => i.cantidadFaltanteTotal < 0);
  }

  getArticulosSobrantes(): AnalisisVarianzaArticulo[] {
    return this.analisisVarianzas.filter(i => i.cantidadSobranteTotal > 0);
  }

  getArticulosSobrantesConteo(): AnalisisVarianzaArticulo[] {
    return this.analisisVarianzas.filter(i => i.cantidadSobranteTotal > 0 && i.stock_disponible > 0);
  }

  getArticulosSobrantesFueraInventario(): AnalisisVarianzaArticulo[] {
    return this.analisisVarianzas.filter(i => i.stock_disponible === 0 && i.conteoFinalAceptado > 0);
  }

  getTopFaltantes(n: number = 15): AnalisisVarianzaArticulo[] {
    return this.getArticulosFaltantes().sort((a, b) => a.costoTotalFaltante - b.costoTotalFaltante).slice(0, n);
  }

  getTopSobrantes(n: number = 10): AnalisisVarianzaArticulo[] {
    return this.getArticulosSobrantes().sort((a, b) => b.costoTotalSobrante - a.costoTotalSobrante).slice(0, n);
  }

  getTopSobrantesConteo(n: number = 10): AnalisisVarianzaArticulo[] {
    return this.getArticulosSobrantesConteo().sort((a, b) => b.costoTotalSobrante - a.costoTotalSobrante).slice(0, n);
  }

  getTopSobrantesFueraInventario(n: number = 10): AnalisisVarianzaArticulo[] {
    return this.getArticulosSobrantesFueraInventario()
      .sort((a, b) => (b.conteoFinalAceptado * b.costo_promedio) - (a.conteoFinalAceptado * a.costo_promedio))
      .slice(0, n);
  }

  getValorTotalSobrantesConteo(): number {
    return this.getArticulosSobrantesConteo().reduce((t, i) => t + i.costoTotalSobrante, 0);
  }

  getValorTotalSobrantesFueraInventario(): number {
    return this.getArticulosSobrantesFueraInventario().reduce((t, i) => {
      const costo = (i.costo_promedio && i.costo_promedio > 0) ? i.costo_promedio : 0;
      return t + i.conteoFinalAceptado * costo;
    }, 0);
  }

  calcularTotalSobrantesConteo(): number {
    return this.getArticulosSobrantesConteo().reduce((t, i) => t + i.cantidadSobranteTotal, 0);
  }

  calcularTotalSobrantesFueraInventario(): number {
    return this.getArticulosSobrantesFueraInventario().reduce((t, i) => t + i.conteoFinalAceptado, 0);
  }

  getArticulosConciliados(): AnalisisVarianzaArticulo[] {
    return this.analisisVarianzas.filter(i => i.estado === 'Conciliado OK');
  }

  calcularTotalUnidadesConciliadas(): number {
    return this.getArticulosConciliados().reduce((t, i) => t + i.stock_disponible, 0);
  }

  getValorTotalConciliados(): number {
    return this.getArticulosConciliados().reduce((t, i) => t + i.stock_disponible * i.costo_promedio, 0);
  }

  getAnalisisConciliadosPorGrupo(): any[] {
    const grupos = new Map<string, any>();
    this.articulosDiarios.forEach(art => {
      const grupo = art.grupo || 'SIN GRUPO';
      const analisisItem = this.analisisVarianzas.find(a => a.codigo_articulo === art.codigo_articulo);
      if (analisisItem && analisisItem.estado === 'Conciliado OK') {
        if (!grupos.has(grupo)) {
          grupos.set(grupo, { grupo, articulosConciliados: 0, unidadesConciliadas: 0, valorConciliado: 0 });
        }
        const g = grupos.get(grupo)!;
        g.articulosConciliados++;
        g.unidadesConciliadas += analisisItem.stock_disponible;
        g.valorConciliado += analisisItem.stock_disponible * analisisItem.costo_promedio;
      }
    });
    return Array.from(grupos.values()).sort((a, b) => b.valorConciliado - a.valorConciliado);
  }

  // ─── Análisis por grupo ──────────────────────────────────────────────────

  getAnalisisPorGrupo(): any[] {
    const grupos = new Map<string, any>();

    this.articulosDiarios.forEach(art => {
      const grupo = art.grupo || 'SIN GRUPO';
      if (!grupos.has(grupo)) {
        grupos.set(grupo, {
          grupo, grupoNombre: art.grupo || 'Sin Grupo',
          articulosFaltantes: 0, unidadesFaltantes: 0, valorFaltantes: 0,
          articulosSobrantes: 0, unidadesSobrantes: 0, valorSobrantes: 0
        });
      }
      const gd = grupos.get(grupo)!;
      const ai = this.analisisVarianzas.find(a => a.codigo_articulo === art.codigo_articulo);
      if (ai) {
        if (ai.cantidadFaltanteTotal < 0) {
          gd.articulosFaltantes++;
          gd.unidadesFaltantes += Math.abs(ai.cantidadFaltanteTotal);
          gd.valorFaltantes += Math.abs(ai.costoTotalFaltante);
        }
        if (ai.cantidadSobranteTotal > 0) {
          gd.articulosSobrantes++;
          gd.unidadesSobrantes += ai.cantidadSobranteTotal;
          gd.valorSobrantes += ai.costoTotalSobrante;
        }
      }
    });

    return Array.from(grupos.values())
      .filter(g => g.valorFaltantes > 0 || g.valorSobrantes > 0)
      .sort((a, b) => b.valorFaltantes - a.valorFaltantes);
  }

  getAnalisisSobrantesConteoPorGrupo(): any[] {
    const grupos = new Map<string, any>();
    this.articulosDiarios.forEach(art => {
      const grupo = art.grupo || 'SIN GRUPO';
      const ai = this.analisisVarianzas.find(a => a.codigo_articulo === art.codigo_articulo);
      if (ai && ai.cantidadSobranteTotal > 0 && ai.stock_disponible > 0) {
        if (!grupos.has(grupo)) grupos.set(grupo, { grupo, articulosSobrantes: 0, unidadesSobrantes: 0, valorSobrantes: 0 });
        const g = grupos.get(grupo)!;
        g.articulosSobrantes++;
        g.unidadesSobrantes += ai.cantidadSobranteTotal;
        g.valorSobrantes += ai.costoTotalSobrante;
      }
    });
    return Array.from(grupos.values()).sort((a, b) => b.valorSobrantes - a.valorSobrantes);
  }

  getAnalisisSobrantesFueraInventarioPorGrupo(): any[] {
    const grupos = new Map<string, any>();
    this.articulosDiarios.forEach(art => {
      const grupo = art.grupo || 'SIN GRUPO';
      const ai = this.analisisVarianzas.find(a => a.codigo_articulo === art.codigo_articulo);
      if (ai && ai.stock_disponible === 0 && ai.conteoFinalAceptado > 0) {
        if (!grupos.has(grupo)) grupos.set(grupo, { grupo, articulosSobrantes: 0, unidadesSobrantes: 0, valorSobrantes: 0 });
        const g = grupos.get(grupo)!;
        g.articulosSobrantes++;
        g.unidadesSobrantes += ai.conteoFinalAceptado;
        g.valorSobrantes += ai.conteoFinalAceptado * ai.costo_promedio;
      }
    });
    return Array.from(grupos.values()).sort((a, b) => b.valorSobrantes - a.valorSobrantes);
  }

  get gruposSobrantesTop10(): any[] {
    return this.getAnalisisPorGrupo().filter(g => g.valorSobrantes > 0).slice(0, 10);
  }

  get gruposFaltantesTop10(): any[] {
    return this.getAnalisisPorGrupo().filter(g => g.valorFaltantes > 0).slice(0, 10);
  }

  get gruposSobrantesConteoTop10(): any[] {
    return this.getAnalisisSobrantesConteoPorGrupo().slice(0, 10);
  }

  get gruposSobrantesFueraInventarioTop10(): any[] {
    return this.getAnalisisSobrantesFueraInventarioPorGrupo().slice(0, 10);
  }

  // ─── Métodos basados exclusivamente en el stock físico verificado ──────────

  /** Artículos que ya fueron contados físicamente */
  getArticulosVerificados(): AnalisisVarianzaArticulo[] {
    return this.analisisVarianzas.filter(a => a.tiene_conteo);
  }

  /** Valor en sistema (stock_disponible * costo) solo de los artículos verificados */
  getValorBaseVerificados(): number {
    return this.analisisVarianzas
      .filter(a => a.tiene_conteo)
      .reduce((t, a) => t + a.stock_disponible * a.costo_promedio, 0);
  }

  /** Valor de faltantes solo de artículos verificados */
  getValorFaltantesVerificados(): number {
    return Math.abs(
      this.analisisVarianzas
        .filter(a => a.tiene_conteo)
        .reduce((t, i) => t + i.costoTotalFaltante, 0)
    );
  }

  /** Valor de sobrantes (conteo regular) solo de artículos verificados */
  getValorSobrantesVerificados(): number {
    return this.analisisVarianzas
      .filter(a => a.tiene_conteo)
      .reduce((t, i) => t + i.costoTotalSobrante, 0);
  }

  /** Diferencia neta usando solo el stock verificado (físico - sistema, solo verificados) */
  getDiferenciaNetaVerificados(): number {
    return this.getValorFisicoVerificado() - this.getValorBaseVerificados();
  }

  /** Precisión global calculada solo sobre artículos ya contados */
  getPrecisionGlobalVerificados(): number {
    const verificados = this.getArticulosVerificados();
    if (verificados.length === 0) return 0;
    const conciliados = verificados.filter(a => a.estado === 'Conciliado OK').length;
    return (conciliados / verificados.length) * 100;
  }

  /** Variación porcentual solo sobre artículos verificados */
  getVariacionPorcentualVerificados(): number {
    const base = this.getValorBaseVerificados();
    return base === 0 ? 0 : (this.getDiferenciaNetaVerificados() / base) * 100;
  }

  // ─── Semáforo y KPIs — basados en stock verificado ──────────────────────

  getSemaforoEstado(): { nivel: string; clase: string; mensaje: string } {
    const precision = this.getPrecisionGlobalVerificados();
    const variacion = Math.abs(this.getVariacionPorcentualVerificados());
    if (precision < 70 || variacion > 5) return { nivel: 'CRÍTICO', clase: 'critico', mensaje: 'Situación Crítica - Acción Inmediata Requerida' };
    if (precision < 85 || variacion > 2) return { nivel: 'ALERTA', clase: 'alerta', mensaje: 'Alerta Operacional - Requiere Atención' };
    return { nivel: 'BUENO', clase: 'bueno', mensaje: 'Estado Satisfactorio - Mantener Controles' };
  }

  getKPIs(): any[] {
    const precision = this.getPrecisionGlobalVerificados();
    const valorBase = this.getValorBaseVerificados();
    const varianzaNegativa = valorBase ? (this.getValorFaltantesVerificados() / valorBase) * 100 : 0;
    const varianzaPositiva = valorBase ? (this.getValorSobrantesVerificados() / valorBase) * 100 : 0;

    return [
      { indicador: 'Precisión de Inventario (Verificado)', actual: precision.toFixed(1) + '%', meta: '≥ 98%', brecha: (precision - 98).toFixed(1) + '%', estado: precision >= 98 ? '🟢' : precision >= 85 ? '🟡' : '🔴', tendencia: '→' },
      { indicador: 'Varianza Negativa – Faltantes (Verificado)', actual: '-' + varianzaNegativa.toFixed(2) + '%', meta: '≤ 0.5%', brecha: '-' + (varianzaNegativa - 0.5).toFixed(2) + '%', estado: varianzaNegativa <= 0.5 ? '🟢' : varianzaNegativa <= 2 ? '🟡' : '🔴', tendencia: '↓' },
      { indicador: 'Varianza Positiva – Sobrantes (Verificado)', actual: '+' + varianzaPositiva.toFixed(2) + '%', meta: '≤ 0.5%', brecha: '+' + (varianzaPositiva - 0.5).toFixed(2) + '%', estado: varianzaPositiva <= 0.5 ? '🟢' : varianzaPositiva <= 2 ? '🟡' : '🔴', tendencia: '→' }
    ];
  }

  // ─── Stock helpers ────────────────────────────────────────────────────────

  getStockTotalUnidades(): number { return this.articulosDiarios.reduce((t, a) => t + a.stock_disponible + a.stock_reservado, 0); }
  getStockDisponibleUnidades(): number { return this.articulosDiarios.reduce((t, a) => t + a.stock_disponible, 0); }
  getStockReservadoUnidades(): number { return this.articulosDiarios.reduce((t, a) => t + a.stock_reservado, 0); }
  getPorcentajeStockReservado(): number { const t = this.getStockTotalUnidades(); return t === 0 ? 0 : (this.getStockReservadoUnidades() / t) * 100; }
  getValorTotalStockReservado(): number { return this.articulosDiarios.reduce((t, a) => t + a.stock_reservado * a.costo_promedio, 0); }
  getValorTotalCompleto(): number { return this.articulosDiarios.reduce((t, a) => t + (a.stock_disponible + a.stock_reservado) * a.costo_promedio, 0); }
  getValorStockDisponible(): number { return this.getValorTotalSistema(); }
  getValorStockReservado(): number { return this.getValorTotalStockReservado(); }

  // ─── FDI helpers ──────────────────────────────────────────────────────────

  getCantidadArticulosFDISinValorar(): number {
    return this.getArticulosSobrantesFueraInventario().filter(i => !i.costo_promedio || i.costo_promedio <= 0).length;
  }

  todosFDITienenCosto(): boolean { return this.getCantidadArticulosFDISinValorar() === 0; }

  getMensajeAdvertenciaFDI(): string {
    const cantidadSinCosto = this.getCantidadArticulosFDISinValorar();
    if (cantidadSinCosto === 0) return '';
    const totalFDI = this.getArticulosSobrantesFueraInventario().length;
    const porcentaje = ((cantidadSinCosto / totalFDI) * 100).toFixed(1);
    if (cantidadSinCosto === totalFDI) return `⚠️ CRÍTICO: Los ${cantidadSinCosto} artículos fuera de inventario NO tienen costo. Requieren valoración manual urgente.`;
    return `⚠️ ADVERTENCIA: ${cantidadSinCosto} de ${totalFDI} artículos (${porcentaje}%) sin costo. El valor total es parcial.`;
  }

  getCodigosArticulosFDISinCosto(): string[] {
    return this.getArticulosSobrantesFueraInventario().filter(i => !i.costo_promedio || i.costo_promedio <= 0).map(i => i.codigo_articulo);
  }

  getEstadisticasValoracionFDI(): { total: number; conCosto: number; sinCosto: number; valorValorado: number; unidadesSinValorar: number } {
    const todos = this.getArticulosSobrantesFueraInventario();
    const conCosto = todos.filter(i => i.costo_promedio && i.costo_promedio > 0);
    const sinCosto = todos.filter(i => !i.costo_promedio || i.costo_promedio <= 0);
    return {
      total: todos.length,
      conCosto: conCosto.length,
      sinCosto: sinCosto.length,
      valorValorado: conCosto.reduce((s, i) => s + i.conteoFinalAceptado * i.costo_promedio, 0),
      unidadesSinValorar: sinCosto.reduce((s, i) => s + i.conteoFinalAceptado, 0)
    };
  }

  // ─── calcularAnalisisDiario (usado por exportaciones) ────────────────────

  calcularAnalisisDiario(articulo: ArticuloDiario, stockDisponible: number) {
    const sumasPorGrupo = this.gruposAnalisis.map(g =>
      this.tieneConteoEnDias(articulo, g.dias) ? this.getSumaConteosPorDias(articulo, g.dias) : 0
    );

    const conteo0 = sumasPorGrupo[0] || 0;
    const dif0 = conteo0 - stockDisponible;
    const conteoFinal = this.determinarConteoFinalDinamico(sumasPorGrupo, stockDisponible);
    const difFinal = conteoFinal - stockDisponible;
    const estado = this.determinarEstado(difFinal, stockDisponible, difFinal < 0 ? -difFinal : 0, difFinal > 0 ? difFinal : 0);

    return { conteo6_9: conteo0, dif6_9: dif0, conteoFinal, difFinal, estado };
  }

  // ─── Métodos de análisis de causas raíz ──────────────────────────────────

  getConcentracionTopGrupos(): number {
    const analisis = this.getAnalisisPorGrupo();
    if (analisis.length < 2) return 0;
    const top2Valor = analisis.slice(0, 2).reduce((s, g) => s + g.valorFaltantes, 0);
    const total = this.getValorTotalFaltantes();
    return total === 0 ? 0 : (top2Valor / total) * 100;
  }

  getValorTopGruposFaltantes(): number {
    return this.getAnalisisPorGrupo().slice(0, 2).reduce((s, g) => s + g.valorFaltantes, 0);
  }

  getValorLubricantes(): number {
    const grupo = this.getAnalisisPorGrupo().find(g =>
      g.grupo.toUpperCase().includes('LUB') || g.grupoNombre.toUpperCase().includes('LUBRICANTE')
    );
    return grupo ? Math.abs(grupo.valorFaltantes - grupo.valorSobrantes) : 0;
  }

  getArticulosNoRegistrados(): number {
    return this.analisisVarianzas.filter(a => a.tipo === 'Fuera de Inventario').length;
  }

  getValorNoRegistrados(): number {
    return this.analisisVarianzas.filter(a => a.tipo === 'Fuera de Inventario')
      .reduce((s, i) => s + i.cantidadSobranteTotal * i.costo_promedio, 0);
  }

  // ─── Recomendaciones dinámicas ────────────────────────────────────────────

  getRecomendacionesCortoplazo(): any[] {
    const recomendaciones: any[] = [];
    const precision = this.getPrecisionGlobal();
    const valorFaltantes = this.getValorTotalFaltantes();
    const articulosNoRegistrados = this.getArticulosSobrantesFueraInventario().length;
    const valorNoRegistrados = this.getValorTotalSobrantesFueraInventario();

    const articulosAltoValor = this.analisisVarianzas.filter(a => (a.costo_promedio * Math.abs(a.stock_disponible)) > 500 && a.diferenciaFinal !== 0).length;
    if (articulosAltoValor > 0) recomendaciones.push({ icon: 'bi-check2-circle', titulo: 'Implementación de doble conteo', descripcion: `${articulosAltoValor} artículos con valor > $500 requieren verificación adicional`, prioridad: valorFaltantes > 10000 ? 'alta' : 'media' });

    if (precision < 90) {
      const contadores = new Set(this.conteos.map(c => c.usuario_contador));
      recomendaciones.push({ icon: 'bi-people-fill', titulo: 'Capacitación intensiva del personal', descripcion: `${contadores.size} usuarios requieren formación (precisión actual: ${precision.toFixed(1)}%)`, prioridad: 'alta' });
    }

    const gruposCriticos = this.getAnalisisPorGrupo().filter(g => (g.valorFaltantes / (this.getValorTotalFaltantes() || 1) * 100) > 15);
    if (gruposCriticos.length > 0) recomendaciones.push({ icon: 'bi-grid-3x3-gap-fill', titulo: 'Reorganización física del almacén', descripcion: `${gruposCriticos.length} grupos críticos (${gruposCriticos.map((g: any) => g.grupo).join(', ')}) requieren mejor ubicación`, prioridad: 'alta' });

    if (Math.abs(this.getDiferenciaNeta()) > 100) recomendaciones.push({ icon: 'bi-calculator', titulo: 'Ajuste contable formal del inventario', descripcion: `Diferencia neta de ${this.getDiferenciaNeta().toLocaleString('es-EC', { style: 'currency', currency: 'USD' })} requiere regularización inmediata`, prioridad: 'alta' });

    if (articulosNoRegistrados > 0) recomendaciones.push({ icon: 'bi-box-seam', titulo: 'Registro de artículos no catalogados', descripcion: `${articulosNoRegistrados} artículos fuera de inventario (valor: ${valorNoRegistrados.toLocaleString('es-EC', { style: 'currency', currency: 'USD' })}) deben incorporarse al sistema`, prioridad: 'critica' });

    return recomendaciones;
  }

  getIniciativasEstrategicas(): any[] {
    const iniciativas: any[] = [];
    const valorSistema = this.getValorTotalSistema();
    const valorFaltantes = this.getValorTotalFaltantes();
    const precision = this.getPrecisionGlobal();
    const porcentajePerdida = valorSistema ? (valorFaltantes / valorSistema) * 100 : 0;

    const artAltoValor = this.analisisVarianzas.filter(a => a.costo_promedio > 1000 && Math.abs(a.diferenciaFinal) !== 0).length;
    if (artAltoValor > 0) {
      const inversion = Math.min(artAltoValor * 50, 50000);
      const mesesROI = Math.ceil((inversion / (valorFaltantes * 0.6 || 1)) * 12);
      iniciativas.push({ nombre: 'Sistema RFID', descripcion: `Implementación para ${artAltoValor} componentes de alto valor`, inversion, roi: `${mesesROI} meses`, roiNumerico: mesesROI, justificacion: `Reducción estimada del 60% en pérdidas` });
    }

    if (this.analisisVarianzas.length > 500 || precision < 85) {
      const inversionWMS = 85000;
      const mesesROI = Math.ceil((inversionWMS / (valorSistema * 0.02 || 1)) * 12);
      iniciativas.push({ nombre: 'WMS Integration', descripcion: `Sistema de gestión para ${this.analisisVarianzas.length} SKUs`, inversion: inversionWMS, roi: `${mesesROI} meses`, roiNumerico: mesesROI, justificacion: `Mejora de precisión del ${precision.toFixed(1)}% al 98%+` });
    }

    iniciativas.push({ nombre: 'Auditorías Cíclicas', descripcion: `Programa mensual rotativo por categoría (${this.getAnalisisPorGrupo().length} grupos)`, inversion: 12000, roi: 'Inmediato', roiNumerico: 0, justificacion: `Prevención de ${(valorFaltantes * 0.4).toLocaleString('es-EC', { style: 'currency', currency: 'USD' })} en pérdidas anuales` });

    const usuariosUnicos = new Set(this.conteos.map(c => c.usuario_contador)).size;
    iniciativas.push({ nombre: 'Capacitación Continua', descripcion: `Programa trimestral para ${usuariosUnicos} usuarios`, inversion: Math.max(usuariosUnicos * 400, 8000), roi: '3 meses', roiNumerico: 3, justificacion: `Reducción de errores humanos estimada en 50%` });

    if (porcentajePerdida > 3) iniciativas.push({ nombre: 'Control de Accesos', descripcion: 'Sistema biométrico en áreas críticas', inversion: 35000, roi: '9 meses', roiNumerico: 9, justificacion: `Pérdidas actuales del ${porcentajePerdida.toFixed(2)}%` });

    return iniciativas.sort((a, b) => a.roiNumerico - b.roiNumerico);
  }

  getPrioridadClase(prioridad: string): string {
    return { 'critica': 'prioridad-critica', 'alta': 'prioridad-alta', 'media': 'prioridad-media' }[prioridad] || 'prioridad-baja';
  }

  getRoiClase(roi: string): string {
    if (roi.toLowerCase().includes('inmediato')) return 'roi-inmediato';
    const meses = parseInt(roi);
    if (meses <= 3) return 'roi-3';
    if (meses <= 6) return 'roi-6';
    return 'roi-8';
  }

  getInversionTotalEstrategica(): number { return this.getIniciativasEstrategicas().reduce((s, i) => s + i.inversion, 0); }
  getAhorroPotencialAnual(): number { return this.getValorTotalFaltantes() * 0.6; }

  // ─── Helpers de usuario/ubicación ───────────────────────────────────────

  getUsuarioContador(codigoArticulo: string): string {
    const art = this.articulosDiarios.find(a => a.codigo_articulo === codigoArticulo);
    if (!art) return 'Sin Asignar';

    for (const fecha of this.fechasUnicas) {
      const conteos = art.conteosPorDia[fecha];
      if (conteos && conteos.length > 0) {
        const usuario = conteos[0].usuario_contador;
        if (!usuario || usuario.trim() === '' || usuario.toLowerCase().includes('sin asignar')) return 'Sin Asignar';
        return usuario.toUpperCase();
      }
    }
    return 'Sin Asignar';
  }

  getUbicacionArticulo(codigoArticulo: string): string {
    const art = this.articulosDiarios.find(a => a.codigo_articulo === codigoArticulo);
    if (!art) return 'Sin Ubicación';
    if (art.ubicacion && art.ubicacion.trim()) return art.ubicacion;

    for (const fecha of this.fechasUnicas) {
      const conteos = art.conteosPorDia[fecha];
      if (conteos && conteos.length > 0 && conteos[0].ubicacionconteo) return conteos[0].ubicacionconteo;
    }
    return 'Sin Ubicación';
  }

  // ─── Exportaciones ────────────────────────────────────────────────────────

  guardarExcel(buffer: any, fileName: string): void {
    const nombreAgencia = this.getNombreBodega().replace(/[^a-zA-Z0-9]/g, '_');
    const data: Blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(data);
    link.download = `${fileName}_${nombreAgencia}_${new Date().toLocaleDateString('es-EC').replace(/\//g, '-')}.xlsx`;
    link.click();
  }

  exportarExcel(): void {
    if (!this.analisisVarianzas.length) return;

    const headers = ['#', 'Código', 'Artículo', 'Stock Sistema', 'Conteo Final', 'Diferencia', 'Costo Unitario', 'Valor Total', 'Estado'];
    const rows = this.analisisVarianzas.map((item, idx) => [
      idx + 1,
      item.codigo_articulo,
      item.nombre_articulo,
      item.stock_disponible,
      item.conteoFinalAceptado,
      item.diferenciaFinal,
      item.costo_promedio,
      item.stock_disponible * item.costo_promedio,
      item.estado
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [{ wch: 5 }, { wch: 18 }, { wch: 50 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 30 }];
    const wb = { Sheets: { 'Inventario': ws }, SheetNames: ['Inventario'] };
    this.guardarExcel(XLSX.write(wb, { bookType: 'xlsx', type: 'array' }), `Inventario-Detalle`);
  }

  exportarAnalisisVarianzas(): void {
    if (!this.analisisVarianzas.length) return;

    const headerRow1 = [
      'DATOS DEL ARTÍCULO', '', '', '', '', '',
      ...this.gruposAnalisis.flatMap(g => [g.nombre, '', '', '']),
      'RESUMEN FINAL', '', '', '', '', '', ''
    ];
    const headerRow2 = [
      'CÓDIGO', 'ARTÍCULO', 'STOCK DISP.', 'COSTO PROM.', 'USUARIO', 'UBICACIÓN',
      ...this.gruposAnalisis.flatMap(() => ['Dif. vs Stock', 'Faltante', 'Sobrante', 'Total Contado']),
      'Conteo Final', 'Dif. Final', 'Cant. Faltante', 'Costo Faltante', 'Cant. Sobrante', 'Costo Sobrante', 'ESTADO'
    ];

    const data: any[][] = [headerRow1, headerRow2];
    const merges: Range[] = [];
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } });
    let col = 6;
    this.gruposAnalisis.forEach(() => { merges.push({ s: { r: 0, c: col }, e: { r: 0, c: col + 3 } }); col += 4; });
    merges.push({ s: { r: 0, c: col }, e: { r: 0, c: col + 6 } });

    this.analisisVarianzas.forEach(art => {
      const row: any[] = [
        art.codigo_articulo, art.nombre_articulo, art.stock_disponible, art.costo_promedio,
        this.getUsuarioContador(art.codigo_articulo), this.getUbicacionArticulo(art.codigo_articulo)
      ];
      this.gruposAnalisis.forEach(g => {
        const a = art[g.prop] || this.VARIANZA_BASE;
        row.push(a.diferenciaTotal, a.faltante, a.sobrante, a.totalContado);
      });
      row.push(art.conteoFinalAceptado, art.diferenciaFinal, art.cantidadFaltanteTotal, art.costoTotalFaltante, art.cantidadSobranteTotal, art.costoTotalSobrante, art.estado);
      data.push(row);
    });

    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(data);
    ws['!merges'] = merges;
    ws['!cols'] = [
      { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 25 },
      ...this.gruposAnalisis.flatMap(() => [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }]),
      { wch: 18 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 30 }
    ];

    const wb = { Sheets: { 'Analisis Varianzas': ws }, SheetNames: ['Analisis Varianzas'] };
    this.guardarExcel(XLSX.write(wb, { bookType: 'xlsx', type: 'array' }), 'Analisis-Varianzas');
  }

  exportarExcelDiario8(): void {
    if (!this.articulosDiarios.length) return;

    const subHeaders = ['Fecha/Hora', 'Cantidad', 'Diferencia', 'Usuario', 'Ubicación', 'Observaciones'];
    const fixedHeaders = ['Código', 'Artículo', 'Descripción', 'Stock Disp.', 'Costo Prom.', 'Unidad'];
    const summaryHeaders = ['Conteo Principal', 'Dif. Principal', 'Conteo Final', 'Dif. Final', 'Estado'];

    let headerRow1: any[] = [...fixedHeaders, ...summaryHeaders, 'CONTEOS POR DÍA', ...Array((this.fechasUnicas.length * subHeaders.length) - 1).fill('')];
    let headerRow2: any[] = Array(fixedHeaders.length + summaryHeaders.length).fill('');
    this.fechasUnicas.forEach(f => { headerRow2.push(`Día ${f.split('-')[2]} (${this.formatearFechaCorta(f)})`); headerRow2.push(...Array(subHeaders.length - 1).fill('')); });
    let headerRow3: any[] = Array(fixedHeaders.length + summaryHeaders.length).fill('');
    this.fechasUnicas.forEach(() => headerRow3.push(...subHeaders));

    let data: any[][] = [headerRow1, headerRow2, headerRow3];
    let merges: Range[] = [];
    let currentRow = 3;

    merges.push({ s: { r: 0, c: 0 }, e: { r: 2, c: fixedHeaders.length - 1 } });
    merges.push({ s: { r: 0, c: fixedHeaders.length }, e: { r: 0, c: fixedHeaders.length + summaryHeaders.length - 1 } });
    for (let c = fixedHeaders.length; c < fixedHeaders.length + summaryHeaders.length; c++) merges.push({ s: { r: 1, c }, e: { r: 2, c } });
    let hCol = fixedHeaders.length + summaryHeaders.length;
    merges.push({ s: { r: 0, c: hCol }, e: { r: 0, c: hCol + this.fechasUnicas.length * subHeaders.length - 1 } });
    this.fechasUnicas.forEach(() => { merges.push({ s: { r: 1, c: hCol }, e: { r: 1, c: hCol + subHeaders.length - 1 } }); hCol += subHeaders.length; });

    this.articulosDiarios.forEach(art => {
      const stockDisponible = art.stock_disponible;
      const maxConteos = this.fechasUnicas.reduce((max, f) => Math.max(max, (art.conteosPorDia[f] || []).length), 1);
      const analysis = this.calcularAnalisisDiario(art, stockDisponible);
      const articuloRowStart = currentRow;

      for (let r = 0; r < maxConteos; r++) {
        const row: any[] = [];
        if (r === 0) {
          row.push(art.codigo_articulo, art.nombre_articulo, art.descripcion, stockDisponible, art.costo_promedio, art.unidad);
          row.push(analysis.conteo6_9, analysis.dif6_9, analysis.conteoFinal, analysis.difFinal, analysis.estado);
          const endRow = articuloRowStart + maxConteos - 1;
          for (let c = 0; c < fixedHeaders.length + summaryHeaders.length; c++) merges.push({ s: { r: articuloRowStart, c }, e: { r: endRow, c } });
        } else {
          row.push(...Array(fixedHeaders.length + summaryHeaders.length).fill(''));
        }
        this.fechasUnicas.forEach(f => {
          const conteos = art.conteosPorDia[f] || [];
          const conteo = conteos[r];
          if (conteo) row.push(this.formatearFechaHora(conteo.fechaHora), conteo.cantidad_contada, conteo.diferencia, conteo.usuario_contador, conteo.ubicacionconteo, conteo.observaciones);
          else row.push(...Array(subHeaders.length).fill(''));
        });
        data.push(row);
        currentRow++;
      }
    });

    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(data);
    ws['!merges'] = merges;
    ws['!cols'] = [
      { wch: 15 }, { wch: 30 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 10 },
      { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 30 },
      ...this.fechasUnicas.flatMap(() => [{ wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 20 }, { wch: 30 }])
    ];
    const wb = { Sheets: { 'Detalle Conteos Diarios': ws }, SheetNames: ['Detalle Conteos Diarios'] };
    this.guardarExcel(XLSX.write(wb, { bookType: 'xlsx', type: 'array' }), 'Detalle-Conteos-Diarios');
  }

  exportarExcel1(): void { this.exportarExcelDiario8(); }
  exportarExcelAgrupado(): void { this.exportarAnalisisVarianzas(); }

  exportarPDF(): void {
    const element = document.querySelector('.container-fluid') as HTMLElement;
    if (!element) return;
    html2canvas(element, { useCORS: true } as any).then(canvas => {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      const ratio = canvas.width / canvas.height;
      const pageWidth = 210;
      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageWidth / ratio);
      pdf.save(`Informe-Inventario-${this.getNombreBodega()}-${new Date().toLocaleDateString('es-EC').replace(/\//g, '-')}.pdf`);
    });
  }

  exportarHTML(): void {
    const content = document.querySelector('.container-fluid')?.innerHTML || '';
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Inventario ${this.getNombreBodega()}</title></head><body>${content}</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Informe-Inventario-${this.getNombreBodega()}.html`;
    link.click();
  }

  exportarHTMLPortable(): void {
    // ── 1. Obtener el contenedor principal ──────────────────────────────────
    const container = document.querySelector('.container-fluid');
    if (!container) return;

    // ── 2. Clonar el DOM para no tocar la vista real ─────────────────────────
    const clone = container.cloneNode(true) as HTMLElement;

    // ── 3. Eliminar el bloque de botones de exportación ──────────────────────
    const btnGroup = clone.querySelector('.export-buttons-group');
    if (btnGroup) btnGroup.remove();

    // ── 4. Cortar el contenido: conservar solo hasta .documento-confidencial ──
    const children = Array.from(clone.children);
    let cutIndex = children.length;
    for (let i = 0; i < children.length; i++) {
      if (children[i].classList.contains('documento-confidencial')) {
        cutIndex = i + 1;
        break;
      }
    }
    while (clone.children.length > cutIndex) {
      clone.removeChild(clone.lastElementChild!);
    }

    // ── 5. Recopilar TODOS los estilos y limpiar selectores de Angular ────────
    //   Angular usa [_ngcontent-xxx] y [_nghost-xxx] para encapsular estilos.
    //   Esos atributos no existen en el HTML exportado, así que los quitamos
    //   para que los estilos funcionen correctamente en el archivo standalone.
    const angularScope = /\[_ng(?:content|host)-[^\]]+\]/g;
    let allStyles = '';

    try {
      Array.from(document.styleSheets).forEach(sheet => {
        try {
          if (sheet.cssRules) {
            Array.from(sheet.cssRules).forEach(rule => {
              allStyles += rule.cssText.replace(angularScope, '') + '\n';
            });
          }
        } catch (_) {
          // Hoja de estilos cross-origin (CDN) — se añadirá via <link> en el head
        }
      });
    } catch (_) { /* silencioso */ }

    // ── 6. Construir el HTML portable completo ────────────────────────────────
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inventario ${this.getNombreBodega()}</title>
  <!-- Bootstrap 5 -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
  <!-- Bootstrap Icons -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css">
  <!-- Estilos de la aplicación (encapsulación Angular eliminada) -->
  <style>
${allStyles}
  </style>
</head>
<body>
<div class="container-fluid p-0">
${clone.innerHTML}
</div>
</body>
</html>`;

    // ── 7. Descargar ──────────────────────────────────────────────────────────
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Informe-Inventario-${this.getNombreBodega()}-${new Date().toLocaleDateString('es-EC').replace(/\//g, '-')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  mostrarMensajeExito(msg: string): void {
    console.log('✅', msg);
    // Implementar toast/snackbar según el sistema de diseño del proyecto
  }

  // ─── Getters ordenados — usados por ngFor en el template ─────────────────

  getArticulosFaltantesOrdenados(): AnalisisVarianzaArticulo[] {
    return this.getArticulosFaltantes().slice().sort((a, b) => a.costoTotalFaltante - b.costoTotalFaltante);
  }

  getArticulosSobrantesOrdenados(): AnalisisVarianzaArticulo[] {
    return this.getArticulosSobrantes().slice().sort((a, b) => b.costoTotalSobrante - a.costoTotalSobrante);
  }

  getArticulosSobrantesConteoOrdenados(): AnalisisVarianzaArticulo[] {
    return this.getArticulosSobrantesConteo().slice().sort((a, b) => b.costoTotalSobrante - a.costoTotalSobrante);
  }

  getArticulosFueraInventarioOrdenados(): AnalisisVarianzaArticulo[] {
    return this.getArticulosSobrantesFueraInventario()
      .slice()
      .sort((a, b) => (b.conteoFinalAceptado * b.costo_promedio) - (a.conteoFinalAceptado * a.costo_promedio));
  }

  // ─── Métodos adicionales ──────────────────────────────────────────────────

  getArticulosSobrantesFueraDeInventario(): any[] { return this.conteosFueraInventario; }

  calcularTotalSobrantes1(): number { return this.calcularTotalSobrantesConteo() + this.calcularTotalSobrantesFueraInventario(); }

  getArticulosSobrantes1(): AnalisisVarianzaArticulo[] {
    return [...this.getArticulosSobrantesConteo(), ...this.getArticulosSobrantesFueraInventario()];
  }

  // ─── Métodos faltantes requeridos por el template ────────────────────────

  /** Alias para getValorTotalSobrantesFueraInventario — usado en la tabla de resumen */
  getValorTotalFueraDeInventario(): number {
    return this.getValorTotalSobrantesFueraInventario();
  }

  /** Porcentaje de artículos conciliados sobre el total analizado */
  getPorcentajeConciliados(): number {
    const total = this.analisisVarianzas.length;
    return total === 0 ? 0 : (this.calcularConciliados() / total) * 100;
  }

  /** Verifica si el artículo tiene un costo_promedio válido (> 0) */
  tieneConstoValido(item: AnalisisVarianzaArticulo): boolean {
    return item.costo_promedio !== null && item.costo_promedio !== undefined && item.costo_promedio > 0;
  }

  /**
   * Devuelve el costo del artículo con fallback:
   *  1. costo_promedio del analisisVarianzas
   *  2. costo del registro en conteosFueraInventario
   *  3. 0 si ninguno está disponible
   */
  getCostoConFallback(codigoArticulo: string): number {
    const item = this.analisisVarianzas.find(a => a.codigo_articulo === codigoArticulo);
    if (item && item.costo_promedio && item.costo_promedio > 0) return item.costo_promedio;

    const fdi = this.conteosFueraInventario.find((f: any) => f.codigo_articulo === codigoArticulo);
    if (fdi) {
      const costoFdi = fdi.costo_promedio ?? fdi.costo_uni ?? fdi.costo ?? 0;
      if (costoFdi > 0) return costoFdi;
    }
    return 0;
  }

  /** Indica la fuente del costo utilizado para el artículo */
  getOrigenCosto(codigoArticulo: string): string {
    const item = this.analisisVarianzas.find(a => a.codigo_articulo === codigoArticulo);
    if (item && item.costo_promedio && item.costo_promedio > 0) return 'Costo promedio del sistema';

    const fdi = this.conteosFueraInventario.find((f: any) => f.codigo_articulo === codigoArticulo);
    if (fdi) {
      if (fdi.costo_promedio > 0) return 'Costo promedio (Fuera de Inventario)';
      if (fdi.costo_uni > 0) return 'Costo unitario (Fuera de Inventario)';
    }
    return 'Sin costo disponible';
  }

  // ─── Exportaciones de secciones específicas ──────────────────────────────

  exportarExcelFueraInventario(): void {
    const items = this.getArticulosSobrantesFueraInventario();
    if (!items.length) return;

    const headers = ['#', 'Código', 'Artículo', 'Conteo Final', 'Costo Unitario', 'Valor Total', 'Estado'];
    const rows = items.map((item, idx) => {
      const costo = this.tieneConstoValido(item) ? item.costo_promedio : this.getCostoConFallback(item.codigo_articulo);
      return [
        idx + 1,
        item.codigo_articulo,
        item.nombre_articulo,
        item.conteoFinalAceptado,
        costo,
        item.conteoFinalAceptado * costo,
        item.estado
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [{ wch: 5 }, { wch: 18 }, { wch: 50 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 30 }];
    const wb = { Sheets: { 'Fuera de Inventario': ws }, SheetNames: ['Fuera de Inventario'] };
    this.guardarExcel(XLSX.write(wb, { bookType: 'xlsx', type: 'array' }), 'Fuera-de-Inventario');
  }

  exportarExcelFaltantes(): void {
    const items = this.getArticulosFaltantes();
    if (!items.length) return;

    const headers = ['#', 'Código', 'Artículo', 'Stock Sistema', 'Conteo Final', 'Diferencia', 'Costo Unitario', 'Valor Faltante', 'Estado'];
    const rows = items.map((item, idx) => [
      idx + 1,
      item.codigo_articulo,
      item.nombre_articulo,
      item.stock_disponible,
      item.conteoFinalAceptado,
      item.diferenciaFinal,
      item.costo_promedio,
      item.costoTotalFaltante,
      item.estado
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [{ wch: 5 }, { wch: 18 }, { wch: 50 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 30 }];
    const wb = { Sheets: { 'Faltantes': ws }, SheetNames: ['Faltantes'] };
    this.guardarExcel(XLSX.write(wb, { bookType: 'xlsx', type: 'array' }), 'Articulos-Faltantes');
  }

  exportarExcelSobrantes(): void {
    const items = this.getArticulosSobrantesConteo();
    if (!items.length) return;

    const headers = ['#', 'Código', 'Artículo', 'Stock Sistema', 'Conteo Final', 'Diferencia', 'Costo Unitario', 'Valor Sobrante', 'Estado'];
    const rows = items.map((item, idx) => [
      idx + 1,
      item.codigo_articulo,
      item.nombre_articulo,
      item.stock_disponible,
      item.conteoFinalAceptado,
      item.diferenciaFinal,
      item.costo_promedio,
      item.costoTotalSobrante,
      item.estado
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [{ wch: 5 }, { wch: 18 }, { wch: 50 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 30 }];
    const wb = { Sheets: { 'Sobrantes': ws }, SheetNames: ['Sobrantes'] };
    this.guardarExcel(XLSX.write(wb, { bookType: 'xlsx', type: 'array' }), 'Articulos-Sobrantes');
  }

  exportarExcelConciliados(): void {
    const items = this.getArticulosConciliados();
    if (!items.length) return;

    const headers = ['#', 'Código', 'Artículo', 'Stock Sistema', 'Conteo Final', 'Diferencia', 'Costo Unitario', 'Valor Total', 'Estado'];
    const rows = items.map((item, idx) => [
      idx + 1, item.codigo_articulo, item.nombre_articulo, item.stock_disponible,
      item.conteoFinalAceptado, item.diferenciaFinal, item.costo_promedio,
      item.stock_disponible * item.costo_promedio, item.estado
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [{ wch: 5 }, { wch: 18 }, { wch: 50 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 20 }];
    const wb = { Sheets: { 'Conciliados': ws }, SheetNames: ['Conciliados'] };
    this.guardarExcel(XLSX.write(wb, { bookType: 'xlsx', type: 'array' }), 'Articulos-Conciliados');
  }

  // ─── PENDIENTES POR CONTAR ────────────────────────────────────────────────

  getArticulosPendientesPorContar(): ArticuloDiario[] {
    return this.articulosDiarios.filter(a => !a.tiene_conteo);
  }

  getArticulosYaContados(): ArticuloDiario[] {
    return this.articulosDiarios.filter(a => a.tiene_conteo);
  }

  getTotalArticulosCampana(): number { return this.articulosDiarios.length; }
  getCantidadContados(): number { return this.getArticulosYaContados().length; }
  getCantidadPendientes(): number { return this.getArticulosPendientesPorContar().length; }

  getPorcentajeAvanceConteo(): number {
    const total = this.getTotalArticulosCampana();
    return total === 0 ? 0 : (this.getCantidadContados() / total) * 100;
  }

  getValorPendientesPorContar(): number {
    return this.getArticulosPendientesPorContar().reduce((t, a) => t + a.stock_disponible * a.costo_promedio, 0);
  }

  getUnidadesPendientesPorContar(): number {
    return this.getArticulosPendientesPorContar().reduce((t, a) => t + a.stock_disponible, 0);
  }

  getResumenEstadoConteo(): {
    total: number; contados: number; pendientes: number; avance: number;
    exactos: number; faltantes: number; sobrantes: number; fueraInventario: number;
  } {
    const codigosContados = new Set<string>(
      this.articulosDiarios.filter(a => a.tiene_conteo).map(a => a.codigo_articulo)
    );
    const soloContados = this.analisisVarianzas.filter(a => codigosContados.has(a.codigo_articulo));
    return {
      total:           this.getTotalArticulosCampana(),
      contados:        this.getCantidadContados(),
      pendientes:      this.getCantidadPendientes(),
      avance:          this.getPorcentajeAvanceConteo(),
      exactos:         soloContados.filter(a => a.estado === 'Conciliado OK').length,
      faltantes:       soloContados.filter(a => a.cantidadFaltanteTotal < 0).length,
      sobrantes:       soloContados.filter(a => a.cantidadSobranteTotal > 0 && a.stock_disponible > 0).length,
      fueraInventario: soloContados.filter(a => a.stock_disponible === 0 && a.conteoFinalAceptado > 0).length,
    };
  }

  getTopPendientesPorValor(n: number = 30): ArticuloDiario[] {
    return this.getArticulosPendientesPorContar()
      .sort((a, b) => (b.stock_disponible * b.costo_promedio) - (a.stock_disponible * a.costo_promedio))
      .slice(0, n);
  }

  getPendientesPorGrupo(): { grupo: string; articulos: number; unidades: number; valor: number }[] {
    const map = new Map<string, { grupo: string; articulos: number; unidades: number; valor: number }>();
    this.getArticulosPendientesPorContar().forEach(a => {
      const g = a.grupo || 'SIN GRUPO';
      if (!map.has(g)) map.set(g, { grupo: g, articulos: 0, unidades: 0, valor: 0 });
      const entry = map.get(g)!;
      entry.articulos++;
      entry.unidades += a.stock_disponible;
      entry.valor    += a.stock_disponible * a.costo_promedio;
    });
    return Array.from(map.values()).sort((a, b) => b.valor - a.valor);
  }
}