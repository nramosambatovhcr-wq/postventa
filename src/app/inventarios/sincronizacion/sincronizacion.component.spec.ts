import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SincronizacionComponent } from './sincronizacion.component';

describe('SincronizacionComponent', () => {
  let component: SincronizacionComponent;
  let fixture: ComponentFixture<SincronizacionComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SincronizacionComponent]
    });
    fixture = TestBed.createComponent(SincronizacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
