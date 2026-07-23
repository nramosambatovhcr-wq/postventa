import { Component, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import * as XLSX from 'xlsx';

import {
  AbastecimientoService,
  MaestroParte
} from '../../services/abastecimiento.service'; // ⚠️ Ajusta esta ruta a la real en tu proyecto

@Component({
  selector: 'app-maestropartes',
  templateUrl: './maestropartes.component.html',
  styleUrls: ['./maestropartes.component.css']
})
export class MaestropartesComponent implements OnInit {

  // ── Estado de datos ───────────────────────────────────────────
  datos: MaestroParte[] = [];
  cargando = false;
  error: string | null = null;

  // ── Búsqueda ───────────────────────────────────────────────────
  textoBusqueda = '';
  private busquedaSubject = new Subject<string>();
  enModoBusqueda = false;
  totalResultadosBusqueda = 0;

  // ── Paginación (solo aplica en modo listado, no en búsqueda) ───
  pagina = 1;
  tamanoPagina = 25;
  totalRegistros = 0;
  totalPaginas = 0;

  // ── Exportación a Excel ─────────────────────────────────────────
  exportando = false;
  progresoExportacion = 0; // 0-100, para mostrar feedback en el botón

  constructor(private abastecimientoService: AbastecimientoService) {}

  ngOnInit(): void {
    // Debounce para no disparar una request por cada tecla
    this.busquedaSubject.pipe(
      debounceTime(350),
      distinctUntilChanged()
    ).subscribe(texto => this.ejecutarBusqueda(texto));

    this.cargarPagina(1);
  }

  // ─────────────────────────────────────────────────────────────
  //  Eventos de la UI
  // ─────────────────────────────────────────────────────────────

  onTextoBusquedaChange(texto: string): void {
    this.textoBusqueda = texto;
    this.busquedaSubject.next(texto.trim());
  }

  limpiarBusqueda(): void {
    this.textoBusqueda = '';
    this.enModoBusqueda = false;
    this.error = null;
    this.cargarPagina(1);
  }

  irAPaginaAnterior(): void {
    if (this.pagina > 1) {
      this.cargarPagina(this.pagina - 1);
    }
  }

  irAPaginaSiguiente(): void {
    if (this.pagina < this.totalPaginas) {
      this.cargarPagina(this.pagina + 1);
    }
  }

  cambiarTamanoPagina(nuevoTamano: number): void {
    this.tamanoPagina = nuevoTamano;
    this.cargarPagina(1);
  }

  /** Botón "Actualizar": relee Oracle desde cero, respetando el modo actual (búsqueda o listado). */
  actualizarVista(): void {
    if (this.enModoBusqueda && this.textoBusqueda) {
      this.ejecutarBusqueda(this.textoBusqueda);
    } else {
      this.cargarPagina(this.pagina);
    }
  }

  /** Botón "Descargar Excel": trae TODO el maestro de partes (todas las páginas) y genera el .xlsx. */
  exportarExcel(): void {
    if (this.exportando) return;

    this.exportando = true;
    this.progresoExportacion = 0;
    this.error = null;

    this.descargarTodasLasPaginas().subscribe({
      next: (todosLosDatos) => {
        this.generarArchivoExcel(todosLosDatos);
        this.exportando = false;
        this.progresoExportacion = 0;
      },
      error: () => {
        this.exportando = false;
        this.progresoExportacion = 0;
        this.error = 'Error al generar el archivo Excel. Intenta nuevamente.';
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  //  Llamadas al servicio
  // ─────────────────────────────────────────────────────────────

  private ejecutarBusqueda(texto: string): void {
    this.error = null;

    if (!texto) {
      // Campo vacío → volvemos al listado paginado
      this.enModoBusqueda = false;
      this.cargarPagina(1);
      return;
    }

    this.enModoBusqueda = true;
    this.cargando = true;

    this.abastecimientoService.buscarMaestroPartes(texto, 200).subscribe({
      next: (res) => {
        this.cargando = false;
        if (res.success) {
          this.datos = res.datos;
          this.totalResultadosBusqueda = res.total;
        } else {
          this.datos = [];
          this.totalResultadosBusqueda = 0;
          this.error = 'No se pudo completar la búsqueda. Intenta nuevamente.';
        }
      },
      error: () => {
        this.cargando = false;
        this.datos = [];
        this.totalResultadosBusqueda = 0;
        this.error = 'Error de conexión al buscar artículos.';
      }
    });
  }

  private cargarPagina(pagina: number): void {
    this.error = null;
    this.cargando = true;

    this.abastecimientoService.getMaestroPartesPaginado(pagina, this.tamanoPagina).subscribe({
      next: (res) => {
        this.cargando = false;
        if (res.success) {
          this.datos = res.datos;
          this.pagina = res.pagina;
          this.tamanoPagina = res.tamanoPagina;
          this.totalRegistros = res.totalRegistros;
          this.totalPaginas = res.totalPaginas;
        } else {
          this.datos = [];
          this.error = 'No se pudo cargar el listado del maestro de partes.';
        }
      },
      error: () => {
        this.cargando = false;
        this.datos = [];
        this.error = 'Error de conexión al cargar el maestro de partes.';
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  //  Helpers de template
  // ─────────────────────────────────────────────────────────────

  formatearFob(fob: number): string {
    return fob != null ? fob.toFixed(2) : '0.00';
  }

  // ─────────────────────────────────────────────────────────────
  //  Exportación a Excel — helpers privados
  // ─────────────────────────────────────────────────────────────

  /**
   * Trae TODAS las páginas del maestro de partes usando un tamaño de página
   * grande (500, el tope que acepta el backend) y las concatena en un solo
   * arreglo. Se implementa de forma recursiva/secuencial para no saturar
   * Oracle con llamadas en paralelo.
   */
  private descargarTodasLasPaginas(): Subject<MaestroParte[]> {
    const resultado$ = new Subject<MaestroParte[]>();
    const tamanoPaginaExport = 500;
    const acumulado: MaestroParte[] = [];

    const siguientePagina = (pagina: number, totalPaginasConocido: number | null) => {
      this.abastecimientoService.getMaestroPartesPaginado(pagina, tamanoPaginaExport).subscribe({
        next: (res) => {
          if (!res.success) {
            resultado$.error(new Error('Respuesta no exitosa del backend'));
            return;
          }

          acumulado.push(...res.datos);

          const totalPaginas = totalPaginasConocido ?? res.totalPaginas;
          this.progresoExportacion = totalPaginas > 0
            ? Math.round((pagina / totalPaginas) * 100)
            : 100;

          if (pagina < totalPaginas) {
            siguientePagina(pagina + 1, totalPaginas);
          } else {
            resultado$.next(acumulado);
            resultado$.complete();
          }
        },
        error: (err) => resultado$.error(err)
      });
    };

    siguientePagina(1, null);
    return resultado$;
  }

  /** Genera y descarga el archivo .xlsx a partir del arreglo completo de datos. */
  private generarArchivoExcel(datos: MaestroParte[]): void {
    const filas = datos.map(item => ({
      'Artículo':           item.articulo,
      'Nombre':             item.nombre,
      'Clase ID':           item.claseId ?? '',
      'Clase':              item.clase ?? '',
      'Grupo ID':           item.grupoId ?? '',
      'Grupo':              item.grupo ?? '',
      'Línea Comp. ID':     item.lineaCompId ?? '',
      'Línea Competencia':  item.lineaCompetencia ?? '',
      'FOB':                item.fob
    }));

    const worksheet = XLSX.utils.json_to_sheet(filas);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Maestro de Partes');

    // Ancho de columnas aproximado para mejor legibilidad
    worksheet['!cols'] = [
      { wch: 16 }, // Artículo
      { wch: 40 }, // Nombre
      { wch: 12 }, // Clase ID
      { wch: 30 }, // Clase
      { wch: 10 }, // Grupo ID
      { wch: 20 }, // Grupo
      { wch: 14 }, // Línea Comp. ID
      { wch: 22 }, // Línea Competencia
      { wch: 10 }, // FOB
    ];

    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `maestro_partes_${fecha}.xlsx`);
  }
}