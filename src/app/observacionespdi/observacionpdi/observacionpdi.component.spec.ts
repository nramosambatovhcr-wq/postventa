import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservacionpdiComponent } from './observacionpdi.component';

describe('ObservacionpdiComponent', () => {
  let component: ObservacionpdiComponent;
  let fixture: ComponentFixture<ObservacionpdiComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ObservacionpdiComponent]
    });
    fixture = TestBed.createComponent(ObservacionpdiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
