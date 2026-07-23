import { Component } from '@angular/core';
import { categoria } from 'src/app/models/categoria.model';
import { TutorialService } from 'src/app/services/tutorial.service';

@Component({
  selector: 'app-add-categoria',
  templateUrl: './add-categoria.component.html',
  styleUrls: ['./add-categoria.component.css']
})
export class AddCategoriaComponent {
tutorial: any;
  submitted = false;
  title:any;
  nombre:any;
  descripcion:any;
  precio:any;

  tutorials?: categoria[];
    currentTutorial: categoria = {};
    currentIndex = -1;
     
    linea:any;
    ver:boolean=false;
    lista:any;


  constructor(private tutorialService: TutorialService) {}
  ngOnInit(): void {
    this.retrieveTutorials();
  }

  saveTutorial(): void {
    const data = {
      codigo: this.title,
      nombre: this.nombre,
      descripcion: this.descripcion,
      fecha:new Date()
    //  idlinea: this.linea,
      
    };
console.log(data);

    this.tutorialService.createcat(data).subscribe({
      next: (res) => {
        console.log(res);
        this.submitted = true;
      },
      error: (e) => console.error(e)
    });
  }

  retrieveTutorials(): void {
    /*  this.tutorialService.getAll().subscribe({
        next: (data) => {
          this.tutorials = data;
          console.log(data);
        },
        error: (e) => console.error(e)
      });*/
  
      this.tutorialService.Lineas1().subscribe({
        next: (data) => {
          this.tutorials = data;
          console.log(data);
        },
        error: (e) => console.error(e)
      });
  
    }

  newTutorial(): void {
    this.submitted = false;
    this.tutorial = {
      title: '',
      description: '',
      published: false
    };
  }
}
