import { Component, OnInit } from '@angular/core';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../services/auth.service';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Usuario } from '../models/usuario';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.css']
})
export class NavigationComponent implements OnInit {
  faBars = faBars;
  isMenuActive = false;

  // Índice del submenú abierto (null = ninguno)
  activeSubmenu: number | null = null;

  showMenu = true;
  usuario: Usuario | null = null;

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.verificarAutenticacion();

    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      this.verificarAutenticacion();
    });

    // Cierra submenús al navegar
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => this.closeAllSubmenus());
  }

  // ============================================================
  // AUTENTICACIÓN
  // ============================================================

  verificarAutenticacion(): void {
    this.showMenu = this.authService.isLoggedIn();
  }

  checkAdminAccess(): void {
    this.showMenu = this.authService.isLoggedIn();
  }

  // ============================================================
  // MENÚ HAMBURGUESA
  // ============================================================

  toggleMenu(): void {
    this.isMenuActive = !this.isMenuActive;
  }

  // ============================================================
  // SUBMENÚS
  // ============================================================

  /**
   * Abre el submenú indicado y cierra cualquier otro que estuviera abierto.
   * Si se hace clic sobre el mismo submenú abierto, lo cierra (toggle).
   */
  toggleSubmenu(menuIndex: number): void {
    this.activeSubmenu = this.activeSubmenu === menuIndex ? null : menuIndex;
  }

  /** Devuelve true si el submenú con ese índice está activo. */
  isSubmenuActive(menuIndex: number): boolean {
    return this.activeSubmenu === menuIndex;
  }

  /** Cierra todos los submenús (p. ej. al cambiar de ruta). */
  closeAllSubmenus(): void {
    this.activeSubmenu = null;
  }

  // ============================================================
  // DISPLAY DEL USUARIO
  // ============================================================

  /**
   * Devuelve el nombre a mostrar en el menú.
   * Prioridad: nombre + apellido → solo nombre → nombreUsuario → 'Usuario'
   */
  getUserDisplayName(): string {
    if (!this.usuario) return 'Usuario';

    const nombre   = (this.usuario as any).nombre   || '';
    const apellido = (this.usuario as any).apellido || '';

    if (nombre && apellido) {
      return `${nombre} ${apellido}`;
    }

    if (nombre) {
      return nombre;
    }

    if (this.usuario.nombreUsuario) {
      return this.usuario.nombreUsuario;
    }

    return 'Usuario';
  }

  /**
   * Devuelve el nombre legible del rol del usuario.
   */
  getRoleName(): string {
    if (!this.usuario?.rol) return '';

    const roleNames: Record<string, string> = {
      admin          : 'Administrador',
      repuestos      : 'Repuestos',
      usuario        : 'Usuario',
      laboratorio1   : 'Laboratorio 1',
      laboratorio2   : 'Laboratorio 2',
      laboratorio3   : 'Laboratorio 3',
      laboratorio4   : 'Laboratorio 4',
      repuestoslv    : 'Repuestos LV',
      repuestoslk    : 'Repuestos LK',
      repuestoslsc   : 'Repuestos LSC',
      importaciones  : 'Importaciones',
      procesos       : 'Procesos',
      procesos1      : 'Procesos VHCR',
      proveedor      : 'Proveedor',
      taller         : 'Taller',
      taller1        : 'Taller 1',
      bodegaimpor    : 'Bodega Importaciones',
      bodegaimpor1   : 'Bodega Importaciones 1',
      bodegaimpor2   : 'Bodega Importaciones 2',
      bodegapdi      : 'Bodega PDI',
      bodegapdi1     : 'Bodega PDI 1',
      bodega         : 'Bodega',
      bodegaped      : 'Bodega Pedidos',
      proveedoroil   : 'Proveedor',
      vehiculo   : 'Vehiculos Imp.',
      jefe: 'jefe',
      encargado: 'garantias',
      tecnico: 'tecnico',
      paqtana     : 'Paqtana',
      inventario     : 'Inventario',
      inventarioad   : 'Inventario Admin'
    };

    return roleNames[this.usuario.rol] ?? this.usuario.rol;
  }

  // ============================================================
  // LOGOUT
  // ============================================================

  logout(): void {
    this.authService.logout();
  }
}