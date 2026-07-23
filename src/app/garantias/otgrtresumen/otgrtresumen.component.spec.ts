import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OtgrtresumenComponent } from './otgrtresumen.component';

describe('OtgrtresumenComponent', () => {
  let component: OtgrtresumenComponent;
  let fixture: ComponentFixture<OtgrtresumenComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OtgrtresumenComponent]
    });
    fixture = TestBed.createComponent(OtgrtresumenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
