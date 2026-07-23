import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GarantiasTecnicoComponent } from './garantias-tecnico.component';

describe('GarantiasTecnicoComponent', () => {
  let component: GarantiasTecnicoComponent;
  let fixture: ComponentFixture<GarantiasTecnicoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [GarantiasTecnicoComponent]
    });
    fixture = TestBed.createComponent(GarantiasTecnicoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
