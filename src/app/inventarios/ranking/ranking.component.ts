
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { Agencia } from 'src/app/services/agentamientos.service';
import { AuthService } from 'src/app/services/auth.service';
import { InventarioService } from 'src/app/services/inventario.service';

interface EstadisticasUsuario {
  nombre: string;
  items: number;
  cantidad: number;
  porcentaje: number;
}

interface EstadisticasAgencia {
  total_usuarios: number;
  total_items_contados: number;
  cantidad_total: number;
  usuarios: EstadisticasUsuario[];
}

interface ConteoUnificado {
  agencia_id: number;
  codigo_interno_agencia: string;
  nombre_articulo: string;
  cantidad_total: number;
  stock_disponible: number;
  diferencia_stock: number;
  nombre_agencia_conteo: string;
  usuarios: string;
  usuariosnombre: string;
  primera_fecha_conteo: Date;
  ultima_fecha_conteo: Date;
}

@Component({
  selector: 'app-ranking',
  templateUrl: './ranking.component.html',
  styleUrls: ['./ranking.component.css']
})
export class RankingComponent implements OnInit {

  Math = Math;
  
  // Variables de estado
  agenciaSeleccionada: number = 1;
  nombreAgencia:string='';
  cargando: boolean = false;
  
  // Datos de estadísticas
  estadisticasConteos: EstadisticasAgencia | null = null;
  conteosUnificados: ConteoUnificado[] = [];
  
  // Datos para rankings
  rankingUsuarios: EstadisticasUsuario[] = [];
  topArticulosContados: any[] = [];
  
  // Totales y resúmenes
  totalItemsContados: number = 0;
  totalCantidadContada: number = 0;
  usuariosActivos: number = 0;
  blId: string | null = null;
  agencias: any[] = [];
  
  // Filtros y búsqueda
  terminoBusqueda: string = '';
  filtroActivo: string = 'todos'; // todos, diferencias, completados

  constructor(
    private inventarioService: InventarioService,
    private route: ActivatedRoute,
        private authService: AuthService,
        private router: Router,
  ) {}

  ngOnInit() {
     this.route.paramMap.subscribe(params => {
            this.blId = params.get('id');
            if (this.blId) { 
              this.getAgencias();
            }
          });
    this.cargarDatos();
  }

   getAgencias(): void {
    console.log('blId a buscar:', this.blId, 'tipo:', typeof this.blId);
    
    this.inventarioService.getAgencias()
      .pipe(
        catchError(error => {
          console.error('Error al obtener agencias:', error);
          return of([]);
        })
      )
      .subscribe((data: any) => {
        console.log('Data recibida:', data);
        
        // Convertir el objeto a array usando Object.values()
        const arrayAgencias: Agencia[] = Object.values(data);
        this.agencias = arrayAgencias;
        console.log('Array de agencias:', arrayAgencias);
        
        // Convertir blId a número si es string
        const blIdNumber = typeof this.blId === 'string' ? parseInt(this.blId, 10) : this.blId;
        console.log('blId convertido:', blIdNumber);
        
        // Filtrar la agencia por idSerial
       
      });
  
      
  }
  
  cargarDatos() {
    this.cargando = true;
     const blIdNumber = typeof this.blId === 'string' ? parseInt(this.blId, 10) : this.blId;
      console.log('blId convertido:', blIdNumber);
      
      // Filtrar la agencia por idSerial
      const agenciaEncontrada = this.agencias.find((agencia: any) => 
        agencia.idSerial === blIdNumber
      );
      
      if (agenciaEncontrada) {
        console.log('Agencia encontrada:', agenciaEncontrada);
        this.nombreAgencia = agenciaEncontrada.nombre;
       
        console.log('Nombre de la agencia:', this.nombreAgencia);
      } else {
        console.log('No se encontró una agencia con ID:', blIdNumber);
      }
    
    // Cargar estadísticas de conteos por usuario
    this.inventarioService.getEstadisticasConteosPorAgencia(this.agenciaSeleccionada).subscribe({
      next: (stats: EstadisticasAgencia) => {
        this.estadisticasConteos = stats;
        this.procesarEstadisticas(stats);
      },
      error: (error) => {
        console.error('Error al cargar estadísticas:', error);
        this.cargando = false;
      }
    });

    // Cargar conteos unificados
    this.inventarioService.getConteosUnificadosPorAgencia(this.agenciaSeleccionada).subscribe({
      next: (response: any) => {
        this.conteosUnificados = response.datos || [];
        this.procesarConteosUnificados(response.datos);
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar conteos unificados:', error);
        this.cargando = false;
      }
    });
  }

  /**
   * Procesa las estadísticas y calcula rankings
   */
  procesarEstadisticas(stats: EstadisticasAgencia) {
    this.totalItemsContados = stats.total_items_contados;
    this.totalCantidadContada = stats.cantidad_total;
    this.usuariosActivos = stats.total_usuarios;

    // Calcular porcentajes y ordenar por items contados
    this.rankingUsuarios = stats.usuarios.map(u => ({
      ...u,
      porcentaje: (u.items / stats.total_items_contados) * 100
    })).sort((a, b) => b.items - a.items);
  }

  /**
   * Procesa los conteos unificados para obtener insights
   */
  procesarConteosUnificados(datos: any[]) {
    if (!datos || datos.length === 0) return;

    // Top artículos más contados
    this.topArticulosContados = datos
      .map(item => ({
        codigo: item.codigo_interno_agencia,
        nombre: item.nombre_articulo || 'Sin nombre',
        cantidad_contada: item.cantidad_total,
        stock_sistema: item.stock_disponible,
        diferencia: item.diferencia_stock,
        usuarios: item.usuariosnombre || item.usuarios
      }))
      .sort((a, b) => b.cantidad_contada - a.cantidad_contada)
      .slice(0, 10);
  }

 

cambiarAgencia(agenciaId: number) {
  // 1. Establece la agencia seleccionada
  this.agenciaSeleccionada = agenciaId;

  // 2. Busca el objeto de la agencia en el array 'agencias'
  const agenciaEncontrada = this.agencias.find(agencia => agencia.idSerial === agenciaId);

  if (agenciaEncontrada) {
    // 3. Asigna el nombre de la agencia a la propiedad 'nombreAgencia' para mostrarlo
    this.nombreAgencia = agenciaEncontrada.nombre;
    this.blId = agenciaId.toString(); 
    console.log(`Agencia seleccionada: ${this.nombreAgencia}`);
  } else {
    this.nombreAgencia = 'Agencia no encontrada';
    console.error(`No se encontró una agencia con ID: ${agenciaId}`);
  }

  // 4. Llama a cargarDatos para recargar la información de la nueva agencia
  this.cargarDatos();
}


  /**
   * Filtra los conteos unificados según el criterio seleccionado
   */
  get conteosFiltrados(): ConteoUnificado[] {
    let filtrados = this.conteosUnificados;

    // Aplicar filtro por tipo
    switch (this.filtroActivo) {
      case 'diferencias':
        filtrados = filtrados.filter(c => c.diferencia_stock !== 0);
        break;
      case 'completados':
        filtrados = filtrados.filter(c => c.diferencia_stock === 0);
        break;
    }

    // Aplicar búsqueda
    if (this.terminoBusqueda.trim()) {
      const termino = this.terminoBusqueda.toLowerCase();
      filtrados = filtrados.filter(c => 
        c.codigo_interno_agencia?.toLowerCase().includes(termino) ||
        c.nombre_articulo?.toLowerCase().includes(termino)
      );
    }

    return filtrados;
  }

  /**
   * Obtiene la clase CSS para el badge de diferencia
   */
  getBadgeDiferencia(diferencia: number): string {
    if (diferencia === 0) return 'badge-success';
    if (diferencia > 0) return 'badge-warning';
    return 'badge-danger';
  }

  /**
   * Formatea números grandes con separadores de miles
   */
  formatearNumero(numero: number): string {
    return numero.toLocaleString('es-EC');
  }

  /**
   * Obtiene el color para el gráfico de progreso
   */
  getColorProgreso(porcentaje: number): string {
    if (porcentaje >= 70) return '#10b981'; // Verde
    if (porcentaje >= 40) return '#f59e0b'; // Amarillo
    return '#ef4444'; // Rojo
  }

  /**
   * Exporta los datos a CSV
   */
  exportarCSV() {
    if (this.conteosUnificados.length === 0) return;

    const headers = ['Código', 'Artículo', 'Cantidad Contada', 'Stock Sistema', 'Diferencia', 'Usuarios'];
    const rows = this.conteosFiltrados.map(c => [
      c.codigo_interno_agencia,
      c.nombre_articulo || '',
      c.cantidad_total,
      c.stock_disponible,
      c.diferencia_stock,
      c.usuariosnombre || c.usuarios || ''
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ranking_conteos_agencia_${this.agenciaSeleccionada}.csv`;
    a.click();
  }
}