import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { Usuario } from '../models/usuario';
import { LoginDto } from '../models/login-dto';
import { RegistroDto } from '../models/registro-dto';

export interface LoginSimpleDto {
  nombreUsuario: string;
}

export interface UsuarioDto {
  id: number;
  nombreUsuario: string;
  correo: string;
  rol: string;
  agencia?: string;
  cliente?: string;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Fuente de datos para el usuario actual
  private usuarioActualSubject = new BehaviorSubject<Usuario | null>(null);
  usuarioActual$ = this.usuarioActualSubject.asObservable();
  private currentUserSubject = new  BehaviorSubject<UsuarioDto | null>(null);
  
  // URL base de la API
  private apiUrl = 'https://bodega.vehicentro.com:1830/api/api/Auth';
  private readonly STORAGE_KEY = 'currentUser';
  
  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Cargar el usuario desde localStorage al iniciar
    this.cargarUsuarioDesdeLocalStorage();
  }

  
  /**
   * Carga el usuario desde localStorage y verifica su sesión
   */
  private cargarUsuarioDesdeLocalStorage(): void {
    const storedUser = localStorage.getItem(this.STORAGE_KEY);
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        this.usuarioActualSubject.next(user);
        
        // Opcional: Si quieres verificar el token en silencio en segundo plano
        // (Esto verificaría si el token aún es válido en el servidor)
        /* this.verificarToken(user.token).subscribe(
          isValid => {
            if (!isValid) {
              console.log('Token expirado o inválido');
              this.logout();
            }
          },
          error => {
            console.error('Error al verificar token:', error);
          }
        ); */
      } catch (error) {
        console.error('Error al parsear usuario de localStorage:', error);
        localStorage.removeItem(this.STORAGE_KEY);
      }
    }
  }
  
  /**
   * Inicia sesión del usuario
   */
  login(model: LoginDto): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.apiUrl}/login`, model)
      .pipe(
        tap(response => {
          this.guardarUsuario(response);
        }),
        catchError(error => {
          console.error('Error de login:', error);
         return throwError(() => error);
        })
      );
  }
 
  
  /**
   * Registra un nuevo usuario
   */
  registro(model: RegistroDto): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.apiUrl}/registro`, model).pipe(
      tap(usuario => {
        if (usuario) {
          this.guardarUsuario(usuario);
        }
      }),
      catchError(error => {
        console.error('Error de registro:', error);
        return of(null as any);
      })
    );
  }
  
  /**
   * Guarda la información del usuario
   */
  private guardarUsuario(usuario: Usuario): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(usuario));
    this.usuarioActualSubject.next(usuario);
    console.log('Usuario guardado:', usuario);
  }
  
  /**
   * Cierra la sesión del usuario
   */
  logout(): void {
    // Elimina el usuario del localStorage
    localStorage.removeItem(this.STORAGE_KEY);
    // Actualiza el subject con null
    this.usuarioActualSubject.next(null);
    // Redirigir al login
    this.router.navigate(['/login']);
  }
  
  /**
   * Verifica si el usuario tiene sesión activa
   */
  isLoggedIn(): boolean {
    const usuario = this.getUsuarioActual();
    return usuario !== null && !!usuario.token;
  }
  
  /**
   * Obtiene el usuario actual
   */
  getUsuarioActual(): Usuario | null {
    return this.usuarioActualSubject.value;
  }
  
  /**
   * Verifica si el usuario tiene alguno de los roles especificados
   */
  hasAnyRole(roles: string[]): boolean {
    const user = this.getUsuarioActual();
    if (!user || !user.rol) {
      return false;
    }
    return roles.includes(user.rol);
  }
  
  /**
   * Verifica si el usuario tiene un rol específico
   */
  hasRole(role: string): boolean {
    const user = this.getUsuarioActual();
    if (!user || !user.rol) {
      return false;
    }
    return user.rol === role;
  }
  
  /**
   * Verifica la validez del token
   */
  verificarToken(token: string): Observable<boolean> {
    return this.http.post<boolean>(`${this.apiUrl}/verificar-token`, JSON.stringify(token), {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      catchError(error => {
        console.error('Error al verificar token:', error);
        return of(false);
      })
    );
  }

 usuarioagencia(id: any) {
  const url = `https://bodega.vehicentro.com:1830/api/api/Usuarios/import/${id}`;
  
  return this.http.get(url).pipe(
    catchError(error => {
      console.error('Error al obtener usuario de agencia:', error);
      return throwError(() => error);
    })
  );
}

loginSimple(loginData: LoginSimpleDto): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/login-simple`, loginData)
    .pipe(
      // 1. Reemplazamos 'map' por 'tap' para manejar el efecto secundario de guardar.
      // 2. Llamamos a la función estandarizada 'this.guardarUsuario(user)'.
      tap(user => {
        // Asumiendo que 'guardarUsuario' puede manejar la respuesta de 'login-simple',
        // que debería ser idéntica o similar a la de 'login'.
        this.guardarUsuario(user); 
      }),
      // El 'tap' ya no necesita el 'map' anterior, solo asegura que el 'user' fluya.
      // El resto del pipe (manejo de errores, si lo tiene) sigue igual.
    );
}

getUsernameByCedula(cedula: string): Observable<string> {
  return this.http.get<string>(`${this.apiUrl}/username/${cedula}`);
}

}