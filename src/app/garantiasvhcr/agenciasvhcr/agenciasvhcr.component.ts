import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Usuario } from 'src/app/models/usuario';
import { AuthService } from 'src/app/services/auth.service';
import { InventarioConsolidadoService } from 'src/app/services/inventario-consolidado.service';

// Interfaz para el tipo de Oficina/Bodega
interface OficinaBodega {
  oficinaId: string;
  oficina: string;
  bodegaId: string;
  bodega: string;
}

@Component({
  selector: 'app-agenciasvhcr',
  templateUrl: './agenciasvhcr.component.html',
  styleUrls: ['./agenciasvhcr.component.css']
})
export class AgenciasvhcrComponent implements OnInit {

  oficinas: OficinaBodega[]         = [];
  /** Lista filtrada que se muestra en el template */
  oficinasFiltradas: OficinaBodega[] = [];

  cargando: boolean      = false;
  error: string | null   = null;
  textoBusqueda: string  = '';

  id: number        = 0;
  usuario: Usuario | null = null;
  loading           = false;
  usrol: string     = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private inventarioService: InventarioConsolidadoService
  ) {}

  ngOnInit(): void {
    this.usuario = this.authService.getUsuarioActual();
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      if (this.usuario != null) {
        this.id    = this.usuario.id;
        this.usrol = this.usuario.rol;
      }
    });
    this.cargarOficinas();
  }

  // ── CARGA ──────────────────────────────────────────────────

  cargarOficinas(): void {
    this.cargando = true;
    this.error    = null;

    this.inventarioService.getAllOficinas().subscribe({
      next: (data) => {
        this.oficinas          = data;
        this.oficinasFiltradas = [...data];
        this.cargando          = false;
      },
      error: (err) => {
        console.error('Error al cargar oficinas:', err);
        this.error    = 'No se pudieron cargar las oficinas. Intente nuevamente.';
        this.cargando = false;
      }
    });
  }

  reintentar(): void {
    this.cargarOficinas();
  }

  // ── BÚSQUEDA ───────────────────────────────────────────────

  /**
   * Filtra `oficinas` por texto libre en los campos:
   * bodega, oficina, oficinaId, bodegaId
   */
  aplicarBusqueda(): void {
    const texto = this.textoBusqueda.trim().toLowerCase();

    if (!texto) {
      this.oficinasFiltradas = [...this.oficinas];
      return;
    }

    this.oficinasFiltradas = this.oficinas.filter(o =>
      o.bodega?.toLowerCase().includes(texto)    ||
      o.oficina?.toLowerCase().includes(texto)   ||
      o.oficinaId?.toLowerCase().includes(texto) ||
      o.bodegaId?.toLowerCase().includes(texto)
    );
  }

  limpiarBusqueda(): void {
    this.textoBusqueda     = '';
    this.oficinasFiltradas = [...this.oficinas];
  }

  // ── NAVEGACIÓN ─────────────────────────────────────────────

  goToRevision(oficinaId: string): void {
    console.log(`Navegando a revisión de oficina ID: ${oficinaId}`);

   
      this.router.navigate(['/encargado', oficinaId]);
  
  }
}