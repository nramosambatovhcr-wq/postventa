import { Component } from '@angular/core';
import { TutorialService } from 'src/app/services/tutorial.service';

@Component({
  selector: 'app-add-producto',
  templateUrl: './add-producto.component.html',
  styleUrls: ['./add-producto.component.css']
})
export class AddProductoComponent {
 tutorial: any;
  submitted = false;
  title:any;
  description:any;
  precio:any;


  constructor(private tutorialService: TutorialService) {}

  saveTutorial(): void {
    const data = {
      codigo: this.title,
      descripcion: this.description,
      precio: this.precio,
      cantidad:0
    };
console.log(data);

    this.tutorialService.createrep(data).subscribe({
      next: (res) => {
        console.log(res);
        this.submitted = true;
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
