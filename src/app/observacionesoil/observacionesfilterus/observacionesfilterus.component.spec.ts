import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservacionesfilterusComponent } from './observacionesfilterus.component';

describe('ObservacionesfilterusComponent', () => {
  let component: ObservacionesfilterusComponent;
  let fixture: ComponentFixture<ObservacionesfilterusComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ObservacionesfilterusComponent]
    });
    fixture = TestBed.createComponent(ObservacionesfilterusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
