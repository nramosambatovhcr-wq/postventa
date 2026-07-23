import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Usuario } from 'src/app/models/usuario';
import { AuthService } from 'src/app/services/auth.service';
import { InventarioService } from 'src/app/services/inventario.service';
import { OracleService } from 'src/app/services/oracle.service';

@Component({
  selector: 'app-accesoinv',
  templateUrl: './accesoinv.component.html',
  styleUrls: ['./accesoinv.component.css']
})
export class AccesoinvComponent {

  id: number = 0;
  usuario: Usuario | null = null;
  rol:any;
  blId:any;
  isLoading: boolean = false; 
  errorMessage: string = '';

  constructor(private route: ActivatedRoute,
      private authService: AuthService,
      private router: Router,
      private inventarioService: InventarioService,
      private oracleService: OracleService) {

      this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      console.log(this.usuario);
      if(this.usuario != null){
        this.id = this.usuario.id;
        this.rol= this.usuario.rol;
        console.log(this.id);
        if(this.id){
          this.route.paramMap.subscribe(params => {
            this.blId = params.get('id');
            if (this.blId) { 
               // Llamar a la función que faltaba
              
            } else {
              this.isLoading = false;
              this.errorMessage = 'No se proporcionó un ID de BL.';
            }
          });
        }
        else{
          this.router.navigate(['/login']);
        }
      }
    });
  }

  navegarA(opcion: string): void {
    switch(opcion) {
      case 'conteo':
        this.router.navigate(['/conteoglobal', this.blId]);
        break;
      case 'reconteo':
        this.router.navigate(['/reconteo']);
        break;
      case 'inventario':
        this.router.navigate(['/invdash']);
        break;
      case 'resumen':
        this.router.navigate(['/alldays1', this.blId]);
        break;
      case 'informes':
        this.router.navigate(['/alldays', this.blId]);
        break;case 'informes1':
        this.router.navigate(['/alldays3', this.blId]);
        break;
      default:
        console.log('Opción no reconocida');
    }
  }
}