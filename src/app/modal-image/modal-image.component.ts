import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-modal-image',
  templateUrl: './modal-image.component.html',
  styleUrls: ['./modal-image.component.css']
})
export class ModalImageComponent {

  @Input() imageUrl: string = '';
  @Input() isOpen: boolean = false;

  closeModal() {
    this.isOpen = false;
  }
}