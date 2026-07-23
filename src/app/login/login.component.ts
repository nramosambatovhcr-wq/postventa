import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { MenuVisibilityService } from '../services/menu-visibility.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  submitted = false;
  loading = false;
  returnUrl: string = '';
  errorMessage = '';
  intentosRestantes: number = 0;
  isSimpleLogin = false;
 
  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private menuVisibilityService: MenuVisibilityService
  ) {
    this.loginForm = this.formBuilder.group({
      nombreUsuario: ['', Validators.required],
      contrasena: ['']
    });
  }

  ngOnInit(): void {
    this.menuVisibilityService.hideMenu();
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    
    // SOLUCIÓN MÚLTIPLE: Leer parámetros de diferentes formas para compatibilidad
    this.checkForAutoLogin();
  }

  private checkForAutoLogin(): void {
    let usernameOrCedula: string | null = null;

    // MÉTODO 1: Intentar con ActivatedRoute (preferido)
    this.route.queryParams.subscribe(params => {
      if (params['cedula']) {
        usernameOrCedula = params['cedula'];
        console.log('Username detectado via ActivatedRoute:', usernameOrCedula);
        this.getUsernameFromCedula(usernameOrCedula);
      }
    });

    // MÉTODO 2: Si no funciona, leer directamente del hash de la URL
    if (!usernameOrCedula) {
      const hash = window.location.hash;
      console.log('Hash completo:', hash);
      
      // Extraer query params del hash
      const queryIndex = hash.indexOf('?');
      if (queryIndex !== -1) {
        const queryString = hash.substring(queryIndex);
        const urlParams = new URLSearchParams(queryString);
        usernameOrCedula = urlParams.get('cedula');
        console.log('Username detectado via window.location.hash:', usernameOrCedula);
      }
    }

    // MÉTODO 3: Usar snapshot como último recurso
    if (!usernameOrCedula) {
      usernameOrCedula = this.route.snapshot.queryParams['cedula'];
      if (usernameOrCedula) {
        console.log('Username detectado via snapshot:', usernameOrCedula);
      }
    }

    // Si se encontró username/cédula, proceder con auto-login
    if (usernameOrCedula) {
      console.log(usernameOrCedula);
      
      this.processAutoLogin(usernameOrCedula);
    } else {
      console.log('No se detectó username en la URL, mostrando login normal');
      this.setupNormalLogin();
    }
  }

  private processAutoLogin(usernameOrCedula: string): void {
    console.log('Procesando auto-login para:', usernameOrCedula);
    this.isSimpleLogin = true;
    
    // Verificar si es una cédula (solo números) o un username
    if (/^\d+$/.test(usernameOrCedula)) {
      // Es una cédula (solo dígitos)
      console.log('Detectado como cédula, buscando username...');
      this.getUsernameFromCedula(usernameOrCedula);
    } else {
      // Es un username directo
      console.log('Detectado como username directo');
      this.loginForm.patchValue({
        nombreUsuario: usernameOrCedula
      });
      this.performSimpleLogin(usernameOrCedula);
    }
  }

  private setupNormalLogin(): void {
    // Login normal con contraseña
    this.loginForm.get('contrasena')?.setValidators([Validators.required]);
    this.loginForm.get('contrasena')?.updateValueAndValidity();
    
    // Redirect if already logged in
    if (this.authService.isLoggedIn()) {
      console.log('Usuario ya autenticado, redirigiendo a dashboard');
      this.router.navigate(['/dashboard']);
    }
  }

  ngOnDestroy(): void {
    this.menuVisibilityService.showMenu();
  }

  get f() { return this.loginForm.controls; }

  getUsernameFromCedula(cedula: any): void {
    this.loading = true;
    this.errorMessage = '';

    console.log('Buscando username para cédula:', cedula);

    this.authService.getUsernameByCedula(cedula)
      .subscribe({
        next: (response: any) => {
          console.log('Respuesta completa del servicio:', response);
          const username = response.nombreUsuario;
          
          if (username) {
            console.log('Username encontrado:', username);
            this.loginForm.patchValue({ 
              nombreUsuario: username 
            });
            this.performSimpleLogin(username);
          } else {
            console.error('No se recibió nombreUsuario en la respuesta');
            this.errorMessage = 'No se pudo obtener el usuario';
            this.loading = false;
            this.setupNormalLogin();
          }
        },
        error: (error: any) => {
          console.error('Error al buscar usuario por cédula:', error);
          this.errorMessage = 'No se encontró un usuario con esa cédula';
          this.loading = false;
          this.setupNormalLogin();
        }
      });
  }

  performSimpleLogin(username: any): void {
    this.loading = true;
    this.errorMessage = '';

    console.log('Ejecutando login simple para:', username);

    this.authService.loginSimple({ nombreUsuario: username })
      .subscribe({
        next: (data: any) => {
          console.log('Login simple exitoso:', data);
          this.loading = false;
          this.redirectByRole(data.rol);
        },
        error: (error: any) => {
          console.error('Error de login simple:', error);
          this.handleLoginError(error);
          this.loading = false;
          this.setupNormalLogin();
        }
      });
  }

  onSubmit1() {
    this.submitted = true;
    this.errorMessage = '';
    this.intentosRestantes = 0;

    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.authService.login(this.loginForm.value)
      .subscribe({
        next: (data: any) => {
          console.log('Login normal exitoso:', data);
          this.redirectByRole(data.rol);
        },
        error: (error: any) => {
          console.error('Error de login:', error);
          this.handleLoginError(error);
          this.loading = false;
        }
      });
  }

  private redirectByRole(rol: string): void {
    console.log('Redirigiendo según rol:', rol);
    
    const roleRoutes: { [key: string]: string } = {
      'laboratorio': '/laboratorio',
      'repuestos': '/pedidobod',
      'repuestoslv': '/pedidobod',
      'repuestoslk': '/pedidobod',
      'repuestoslsc': '/pedidobod',
      'bodega': '/pedidosbod',
      'bodegaped': '/pedidosbod',
      'bodegaimpor': '/dashboardbodimp',
      'bodegaimpor1': '/dashboardblbod',
      'bodegaimpor2': '/dashboardblbod',
       'bodegaimpor3': '/agenciabod',
      'proveedor': '/dashboardcotpro',
      'proveedoroil': '/dashboardpedidos',
      'bodegapdi': '/dashboardpedidospdius',
      'bodegapdi1': '/pedidosbod',
      'taller': '/dashboardtaller',
      'importaciones': '/dashboardblVhcr',
      'procesos': '/dashboardagendamientos',
      'procesos1': '/dashboardagenda',
      'inventario': '/dashboardinv',
      'inventarioad': '/dashboardinv',
      'admin': '/admindashboard',
      'usuario': '/dashboard',
      'vehiculo': '/vehidash',
      'jefe': '/jefe',
      'encargado': '/agenvhcr',
      'tecnico': '/tecnico',
      'laboratorio1': '/dashboard',
      'laboratorio2': '/dashboard',
      'laboratorio3': '/bitacora',
      'talleres': '/otgrtresumen',
      'garantias': '/repotenciacion',
      'gerencia': '/otgrtresumen',
      'paqtana': '/invoice-paqtana'
    };

    const route = roleRoutes[rol] || '/dashboard';
    
    if (!roleRoutes[rol]) {
      console.warn('Rol no reconocido:', rol, '- Redirigiendo a dashboard');
    }
    
    this.router.navigate([route]);
  }

  private handleLoginError(error: any): void {
    console.log('Manejando error de login:', error);
    
    if (error.error && typeof error.error === 'object') {
      this.errorMessage = error.error.message || 'Error desconocido';
      
      switch (error.error.errorCode) {
        case 'AUTH_001':
          break;
        case 'AUTH_002':
          break;
        case 'AUTH_003':
          if (error.error.data && error.error.data.intentosRestantes !== undefined) {
            this.intentosRestantes = error.error.data.intentosRestantes;
            if (this.intentosRestantes > 0) {
              this.errorMessage += `. Intentos restantes: ${this.intentosRestantes}`;
            }
          }
          break;
        case 'AUTH_004':
          break;
        case 'AUTH_005':
          this.errorMessage = 'Usuario no encontrado en el sistema';
          break;
        default:
          break;
      }
    } else if (error.status === 401) {
      this.errorMessage = 'Usuario o contraseña incorrectos';
    } else if (error.message) {
      this.errorMessage = error.message;
    } else {
      this.errorMessage = 'Error de autenticación. Por favor, verifique sus credenciales.';
    }
  }
}