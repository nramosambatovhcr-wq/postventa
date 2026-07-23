import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservacionesfilterComponent } from './observacionesfilter.component';

describe('ObservacionesfilterComponent', () => {
  let component: ObservacionesfilterComponent;
  let fixture: ComponentFixture<ObservacionesfilterComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ObservacionesfilterComponent]
    });
    fixture = TestBed.createComponent(ObservacionesfilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
