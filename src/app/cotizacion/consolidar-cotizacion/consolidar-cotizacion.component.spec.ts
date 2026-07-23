import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConsolidarCotizacionComponent } from './consolidar-cotizacion.component';

describe('ConsolidarCotizacionComponent', () => {
  let component: ConsolidarCotizacionComponent;
  let fixture: ComponentFixture<ConsolidarCotizacionComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ConsolidarCotizacionComponent]
    });
    fixture = TestBed.createComponent(ConsolidarCotizacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
