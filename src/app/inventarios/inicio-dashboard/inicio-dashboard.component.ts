import { Component, OnInit } from '@angular/core';
import { InventarioService } from 'src/app/services/inventario.service';

@Component({
  selector: 'app-inicio-dashboard',
  templateUrl: './inicio-dashboard.component.html',
  styleUrls: ['./inicio-dashboard.component.css']
})
export class InicioDashboardComponent implements OnInit {
  
  estadisticasGenerales = {
    totalAgencias: 0,
    campanasActivas: 0,
    conteosHoy: 0,
    usuariosActivos: 0
  };
  
  actividadesRecientes: any[] = [];
  campanasActivas: any[] = [];
  cargando: boolean = true;

  constructor(private inventarioService: InventarioService) {}

  ngOnInit() {
    this.cargarEstadisticas();
    this.cargarCampanasActivas();
  }

  cargarEstadisticas() {
    // Aquí integras tus servicios reales
    this.estadisticasGenerales = {
      totalAgencias: 12,
      campanasActivas: 3,
      conteosHoy: 145,
      usuariosActivos: 28
    };
    this.cargando = false;
  }

  cargarCampanasActivas() {
    this.inventarioService.getCampanas().subscribe({
      next: (campanas) => {
        this.campanasActivas = campanas.filter(c => c.estado === 'ACTIVA').slice(0, 5);
      },
      error: (error) => {
        console.error('Error al cargar campañas:', error);
      }
    });
  }
}