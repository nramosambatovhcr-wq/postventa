import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservacionesoilusComponent } from './observacionesoilus.component';

describe('ObservacionesoilusComponent', () => {
  let component: ObservacionesoilusComponent;
  let fixture: ComponentFixture<ObservacionesoilusComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ObservacionesoilusComponent]
    });
    fixture = TestBed.createComponent(ObservacionesoilusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
