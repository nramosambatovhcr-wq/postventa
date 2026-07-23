import { Injectable } from '@angular/core';
import { 
  CanActivate, 
  ActivatedRouteSnapshot, 
  RouterStateSnapshot, 
  UrlTree, 
  Router 
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  constructor(private authService: AuthService, private router: Router) {}
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    // Verificación de autenticación
    const currentUser = this.authService.getUsuarioActual();
    
    if (!currentUser || !currentUser.token) {
      console.log('AuthGuard: Usuario no autenticado');
      return this.redirectToLogin(state.url);
    }
    
    // Verificación de roles
    const requiredRoles = route.data['roles'] as string[];
    
    if (requiredRoles && requiredRoles.length > 0) {
      // Si la ruta requiere roles específicos, verificamos si el usuario tiene alguno de ellos
      const hasRole = this.authService.hasAnyRole(requiredRoles);
      
      if (!hasRole) {
        console.log('AuthGuard: Usuario no tiene los roles requeridos');
        return this.redirectToAccessDenied();
      }
    }
    
    // Usuario autenticado y con los roles adecuados
    return true;
  }

  /**
   * Redirige al usuario a la página de login
   */
  private redirectToLogin(returnUrl?: string): UrlTree {
    return this.router.createUrlTree(['/login'], { 
      queryParams: returnUrl ? { returnUrl } : {} 
    });
  }

  /**
   * Redirige al usuario a la página de acceso denegado
   */
  private redirectToAccessDenied(): UrlTree {
    return this.router.createUrlTree(['/acceso-denegado']);
  }
}