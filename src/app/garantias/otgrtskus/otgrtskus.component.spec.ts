import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OtgrtskusComponent } from './otgrtskus.component';

describe('OtgrtskusComponent', () => {
  let component: OtgrtskusComponent;
  let fixture: ComponentFixture<OtgrtskusComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OtgrtskusComponent]
    });
    fixture = TestBed.createComponent(OtgrtskusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
