// src/app/conteo2/conteo2.component.ts

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, catchError, map } from 'rxjs/operators';
import { Usuario } from 'src/app/models/usuario';
import { AuthService } from 'src/app/services/auth.service';
import { ReconteoPendiente, InventarioService, ReconteosPendientesResponse } from 'src/app/services/inventario.service';
import * as XLSX from 'xlsx'; // <--- Importación de la librería XLSX
 

@Component({
  selector: 'app-conteo2',
  templateUrl: './conteo2.component.html',
  styleUrls: ['./conteo2.component.css']
})
export class Conteo2Component implements OnInit {
  // Almacenamiento de datos
  allReconteos: ReconteoPendiente[] = [];
  filteredReconteos: ReconteoPendiente[] = [];
  
  totalPendientes: number = 0;

  // Estados de la UI
  isLoading: boolean = true;
  errorMessage: string | null = null;
  
  // Búsqueda: usamos Subject para optimizar la búsqueda (debounce)
  private searchTerms = new Subject<string>();
  searchTerm: string = '';
  id: number = 0;
  rol:any;
  usuario: Usuario | null = null;
  isSaving: boolean = false;
  blId:any;

  // Inyecta el servicio que creaste
  constructor(
    private inventarioService: InventarioService,    
    private route: ActivatedRoute,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    // 1. Inicializar la escucha del campo de búsqueda
    this.searchTerms.pipe(
      debounceTime(300),          // Espera 300ms antes de buscar (mejora el rendimiento)
      distinctUntilChanged(),     // Solo busca si el término ha cambiado
      map(term => term.trim().toLowerCase())
    ).subscribe(term => {
      this.filterData(term);
    });

    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      console.log(this.usuario);
      if(this.usuario != null){
        this.id = this.usuario.id;
        this.rol= this.usuario.rol;
        console.log(this.id);
        if(this.id){
          this.route.paramMap.subscribe(params => {
            this.blId = params.get('id');
            if (this.blId) { 
              
              this.loadReconteos(this.blId);
            } else {
              this.isLoading = false;
              this.errorMessage = 'No se proporcionó un ID de BL.';
            }
          });
        }
        else{
         // this.router.navigate(['/login']);
        }
      }
    });
  }

  loadReconteos(agenciaId?: number): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.inventarioService.getReconteosPendientes(agenciaId).pipe(
      catchError(err => {
        this.errorMessage = 'Error al cargar los reconteos pendientes. Revise la consola para más detalles.';
        console.error('Error al obtener reconteos:', err);
        this.isLoading = false;
        // Retorna un objeto de error que cumpla con la interfaz
         return of({ 
          agencia_filtrada: null, // <--- Propiedad Requerida
          total_pendientes: 0, 
          data: [] 
        } as ReconteosPendientesResponse); 
      })
    ).subscribe(response => {
      this.allReconteos = response.data;
      this.totalPendientes = response.total_pendientes;
      this.filterData(this.searchTerm);
      this.isLoading = false;
    });
  }

  // Método que se llama desde el HTML al escribir
  search(term: string): void {
    this.searchTerms.next(term);
  }

  // Lógica de filtrado en el cliente
  filterData(term: string): void {
    if (!term) {
      this.filteredReconteos = this.allReconteos;
      return;
    }
    
    const lowerTerm = term.toLowerCase();

    this.filteredReconteos = this.allReconteos.filter(item => {
      // Búsqueda en los campos más relevantes
      return (
        item.codigo_articulo.toLowerCase().includes(lowerTerm) ||
        item.nombre_articulo?.toLowerCase().includes(lowerTerm) ||
        item.ubicacion?.toLowerCase().includes(lowerTerm) ||
        item.nombre_agencia.toLowerCase().includes(lowerTerm)
      );
    });
  }

  // -----------------------------------------------------------------
  // FUNCIÓN DE EXPORTACIÓN A EXCEL (XLSX)
  // -----------------------------------------------------------------
  exportToExcel(): void {
    if (this.filteredReconteos.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }

    // 1. Mapear y formatear los datos a un formato de objeto plano
    const dataForExport = this.filteredReconteos.map(item => ({
      'ID Conteo': item.conteo_id_individual,
      'CÓDIGO ARTÍCULO': item.codigo_articulo,
      'NOMBRE ARTÍCULO': item.nombre_articulo || 'Sin descripción',
      'AGENCIA': item.nombre_agencia,
      'UBICACIÓN': item.ubicacion || 'N/A',
      'CANTIDAD INICIAL': item.cantidad_contada_inicial || 0,
      'CANTIDAD RECONTEO': item.cantidad_reconteo || 'PENDIENTE', // Usando el campo del HTML
      'CONTADOR': item.usuario_contador || 'Desconocido',
      'FECHA CONTEO': item.fecha_conteo || '',
      'MOTIVO PENDIENTE': item.motivo_reconteo_actual || 'SIN ASIGNAR'
    }));

    // 2. Crear la hoja de cálculo
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataForExport);

    // Opcional: Ajustar el ancho de las columnas
    ws['!cols'] = [
        { wch: 10 }, // ID Conteo
        { wch: 20 }, // Código Artículo
        { wch: 40 }, // Nombre Artículo
        { wch: 15 }, // Agencia
        { wch: 15 }, // Ubicación
        { wch: 15 }, // Cantidad Inicial
        { wch: 18 }, // Cantidad Reconteo
        { wch: 20 }, // Contador
        { wch: 25 }, // Fecha Conteo
        { wch: 30 }  // Motivo Pendiente
    ];

    // 3. Crear el libro de trabajo (Workbook)
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reconteos');

    // 4. Descargar el archivo .xlsx
    const datePart = new Date();
    XLSX.writeFile(wb, `ReconteosPendientes_${datePart}.xlsx`);
  }
}