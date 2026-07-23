import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GarantiasEncargadoComponent } from './garantias-encargado.component';

describe('GarantiasEncargadoComponent', () => {
  let component: GarantiasEncargadoComponent;
  let fixture: ComponentFixture<GarantiasEncargadoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [GarantiasEncargadoComponent]
    });
    fixture = TestBed.createComponent(GarantiasEncargadoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
