import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OtautComponent } from './otaut.component';

describe('OtautComponent', () => {
  let component: OtautComponent;
  let fixture: ComponentFixture<OtautComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OtautComponent]
    });
    fixture = TestBed.createComponent(OtautComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
