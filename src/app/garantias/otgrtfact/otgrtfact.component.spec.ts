import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OtgrtfactComponent } from './otgrtfact.component';

describe('OtgrtfactComponent', () => {
  let component: OtgrtfactComponent;
  let fixture: ComponentFixture<OtgrtfactComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OtgrtfactComponent]
    });
    fixture = TestBed.createComponent(OtgrtfactComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
