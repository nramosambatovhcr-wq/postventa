import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OtgrtresumComponent } from './otgrtresum.component';

describe('OtgrtresumComponent', () => {
  let component: OtgrtresumComponent;
  let fixture: ComponentFixture<OtgrtresumComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OtgrtresumComponent]
    });
    fixture = TestBed.createComponent(OtgrtresumComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
