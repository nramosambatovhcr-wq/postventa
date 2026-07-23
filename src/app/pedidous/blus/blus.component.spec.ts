import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlusComponent } from './blus.component';

describe('BlusComponent', () => {
  let component: BlusComponent;
  let fixture: ComponentFixture<BlusComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BlusComponent]
    });
    fixture = TestBed.createComponent(BlusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
