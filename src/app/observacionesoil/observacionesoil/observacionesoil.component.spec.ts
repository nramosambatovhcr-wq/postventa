import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservacionesoilComponent } from './observacionesoil.component';

describe('ObservacionesoilComponent', () => {
  let component: ObservacionesoilComponent;
  let fixture: ComponentFixture<ObservacionesoilComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ObservacionesoilComponent]
    });
    fixture = TestBed.createComponent(ObservacionesoilComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
