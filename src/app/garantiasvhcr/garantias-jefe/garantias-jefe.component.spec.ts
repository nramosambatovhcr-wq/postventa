import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GarantiasJefeComponent } from './garantias-jefe.component';

describe('GarantiasJefeComponent', () => {
  let component: GarantiasJefeComponent;
  let fixture: ComponentFixture<GarantiasJefeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [GarantiasJefeComponent]
    });
    fixture = TestBed.createComponent(GarantiasJefeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
