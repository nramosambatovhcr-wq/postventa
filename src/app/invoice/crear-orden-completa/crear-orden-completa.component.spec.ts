import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearOrdenCompletaComponent } from './crear-orden-completa.component';

describe('CrearOrdenCompletaComponent', () => {
  let component: CrearOrdenCompletaComponent;
  let fixture: ComponentFixture<CrearOrdenCompletaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CrearOrdenCompletaComponent]
    });
    fixture = TestBed.createComponent(CrearOrdenCompletaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
