// 1. Primero, crea un archivo auth.interceptor.ts en la carpeta de servicios (o donde prefieras)
// Ruta recomendada: src/app/services/auth.interceptor.ts o src/app/interceptors/auth.interceptor.ts

import { Injectable } from '@angular/core';
import { 
  HttpRequest, 
  HttpHandler, 
  HttpEvent, 
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service'; // Ajusta la ruta según la ubicación de tu AuthService
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Obtener el usuario actual
    const currentUser = this.authService.getUsuarioActual();
    
    // Si hay un usuario y tiene token, añadirlo a las cabeceras
    if (currentUser && currentUser.token) {
      request = this.addToken(request, currentUser.token);
    }
    
    // Procesar la petición y manejar posibles errores
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Si el error es 401 (no autorizado), cerrar sesión
        if (error.status === 401) {
          this.authService.logout();
          this.router.navigate(['/login']);
        }
        
        return throwError(() => error);
      })
    );
  }
  
  // Añadir el token de autenticación a las cabeceras de la petición
  private addToken(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
}

// 2. Una vez creado el interceptor, debes registrarlo en tu AppModule:
// Añade esto en tu app.module.ts

/*
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './services/auth.interceptor'; // Ajusta la ruta según corresponda

@NgModule({
  // ...
  providers: [
    // Otros providers...
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  // ...
})
export class AppModule { }
*/