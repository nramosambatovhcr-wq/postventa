import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaqtanaComponent } from './paqtana.component';

describe('PaqtanaComponent', () => {
  let component: PaqtanaComponent;
  let fixture: ComponentFixture<PaqtanaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PaqtanaComponent]
    });
    fixture = TestBed.createComponent(PaqtanaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
