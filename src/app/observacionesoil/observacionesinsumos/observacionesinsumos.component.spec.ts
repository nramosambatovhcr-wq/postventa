import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservacionesinsumosComponent } from './observacionesinsumos.component';

describe('ObservacionesinsumosComponent', () => {
  let component: ObservacionesinsumosComponent;
  let fixture: ComponentFixture<ObservacionesinsumosComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ObservacionesinsumosComponent]
    });
    fixture = TestBed.createComponent(ObservacionesinsumosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
