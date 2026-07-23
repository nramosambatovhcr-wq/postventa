import { Component } from '@angular/core';
import { categoria } from 'src/app/models/categoria.model';
import { Tutorial } from 'src/app/models/tutorial.model';
import { TutorialService } from 'src/app/services/tutorial.service';


@Component({
  selector: 'app-listacategoria',
  templateUrl: './listacategoria.component.html',
  styleUrls: ['./listacategoria.component.css']
})
export class ListacategoriaComponent {
 tutorials?: categoria[];
  currentTutorial: categoria = {};
  currentIndex = -1;
  title = '';
  linea:any;
  categoria:any;
  familia:any;
  ver:boolean=true;
  lista:any;
  lista1:any;
  lista2:any;

  constructor(private tutorialService: TutorialService) {}

  ngOnInit(): void {
    this.retrieveTutorials();
  }

  onChange(deviceValue:any) {
    console.log(deviceValue.target.value);
    this.categ(deviceValue.target.value);
}
onChange1(deviceValue:any) {
  console.log(deviceValue.target.value);
  this.fami(deviceValue.target.value);
}

onChange2(deviceValue:any) {
  console.log(deviceValue.target.value);
  this.subcate();
}

categ(valor:number) {
  this.currentTutorial = {};
  this.currentIndex = -1;

  this.tutorialService.findByLinea(valor).subscribe({
    next: (data) => {
     this.lista = data;
      console.log(data);
      this.ver=true;
    },
    error: (e) => console.error(e)
  });
}
subcate() {
  this.currentTutorial = {};
  this.currentIndex = -1;

  this.tutorialService.subcate().subscribe({
    next: (data) => {
     this.lista2 = data;
      console.log(data);
      this.ver=true;
    },
    error: (e) => console.error(e)
  });
}

fami(valor:number) {
  this.currentTutorial = {};
  this.currentIndex = -1;

  this.tutorialService.findByFamilia(valor).subscribe({
    next: (data) => {
     this.lista1 = data;
      console.log(data);
      this.ver=true;
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

  refreshList(): void {
    this.retrieveTutorials();
    this.currentTutorial = {};
    this.currentIndex = -1;
  }

  setActiveTutorial(tutorial: Tutorial, index: number): void {
    this.currentTutorial = tutorial;
    this.currentIndex = index;
  }

  removeAllTutorials(): void {
    this.tutorialService.deleteAll().subscribe({
      next: (res) => {
        console.log(res);
        this.refreshList();
      },
      error: (e) => console.error(e)
    });
  }

  searchTitle(): void {
    this.currentTutorial = {};
    this.currentIndex = -1;

    this.tutorialService.findByTitle(this.title).subscribe({
      next: (data) => {
        this.tutorials = data;
        console.log(data);
      },
      error: (e) => console.error(e)
    });
  }
}
