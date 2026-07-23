import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservacionesvidriosusComponent } from './observacionesvidriosus.component';

describe('ObservacionesvidriosusComponent', () => {
  let component: ObservacionesvidriosusComponent;
  let fixture: ComponentFixture<ObservacionesvidriosusComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ObservacionesvidriosusComponent]
    });
    fixture = TestBed.createComponent(ObservacionesvidriosusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
