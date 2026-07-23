import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AppInitializerService {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}
  
  /**
   * Inicializa la aplicación verificando la autenticación
   */
  init(): Promise<any> {
    return new Promise<void>((resolve) => {
      // Verificar si hay un usuario autenticado
      if (this.authService.isLoggedIn()) {
        console.log('Usuario autenticado al iniciar la aplicación');
        // Opcionalmente verificar el token en el servidor
        resolve();
      } else {
        console.log('No hay usuario autenticado al iniciar');
        // Si no hay usuario autenticado, redireccionar al login
        this.router.navigate(['/login']);
        resolve();
      }
    });
  }
}