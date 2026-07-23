import { Component, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { ReloadService } from './services/reload.service';
 
 

@Component({
  
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  
})
export class AppComponent {
  title = 'IMPORTACIONES VHCR';


  constructor(private router: Router, private reloadService: ReloadService) {

    localStorage.removeItem('currentUser');
  }
  
  /*get isLoginPage(): boolean {
    return this.router.url === '/login';
  }*/

    @HostListener('document:keydown', ['$event'])
handleKeyboardEvent(event: KeyboardEvent): boolean {
  // Intercepta la tecla F5 (código 116)
  if (event.keyCode === 116 || event.key === 'F5') {
    event.preventDefault(); // Evita el comportamiento predeterminado
    this.reloadService.triggerReload(); // Usa nuestro servicio de recarga
    return false;
  }
  return true; // Añade esta línea para los demás casos
}

}
