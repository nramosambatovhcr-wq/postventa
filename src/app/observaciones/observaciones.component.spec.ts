import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservacionesComponent } from './observaciones.component';

describe('ObservacionesComponent', () => {
  let component: ObservacionesComponent;
  let fixture: ComponentFixture<ObservacionesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ObservacionesComponent]
    });
    fixture = TestBed.createComponent(ObservacionesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
