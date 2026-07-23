// src/app/services/menu-visibility.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MenuVisibilityService {
  private showMenuSubject = new BehaviorSubject<boolean>(true);
  public showMenu$ = this.showMenuSubject.asObservable();

  constructor() { }

  showMenu(): void {
    this.showMenuSubject.next(true);
  }

  hideMenu(): void {
    this.showMenuSubject.next(false);
  }
}