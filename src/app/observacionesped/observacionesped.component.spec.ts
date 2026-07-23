import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservacionespedComponent } from './observacionesped.component';

describe('ObservacionespedComponent', () => {
  let component: ObservacionespedComponent;
  let fixture: ComponentFixture<ObservacionespedComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ObservacionespedComponent]
    });
    fixture = TestBed.createComponent(ObservacionespedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
