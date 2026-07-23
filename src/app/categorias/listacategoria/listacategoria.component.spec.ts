import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListacategoriaComponent } from './listacategoria.component';

describe('ListacategoriaComponent', () => {
  let component: ListacategoriaComponent;
  let fixture: ComponentFixture<ListacategoriaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ListacategoriaComponent]
    });
    fixture = TestBed.createComponent(ListacategoriaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
