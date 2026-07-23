import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OtgrtfactdetalleComponent } from './otgrtfactdetalle.component';

describe('OtgrtfactdetalleComponent', () => {
  let component: OtgrtfactdetalleComponent;
  let fixture: ComponentFixture<OtgrtfactdetalleComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OtgrtfactdetalleComponent]
    });
    fixture = TestBed.createComponent(OtgrtfactdetalleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
