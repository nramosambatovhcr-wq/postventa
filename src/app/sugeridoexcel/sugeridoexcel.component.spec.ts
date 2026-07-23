import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SugeridoexcelComponent } from './sugeridoexcel.component';

describe('SugeridoexcelComponent', () => {
  let component: SugeridoexcelComponent;
  let fixture: ComponentFixture<SugeridoexcelComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SugeridoexcelComponent]
    });
    fixture = TestBed.createComponent(SugeridoexcelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
