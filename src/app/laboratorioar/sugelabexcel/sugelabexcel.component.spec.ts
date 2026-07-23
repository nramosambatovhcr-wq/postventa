import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SugelabexcelComponent } from './sugelabexcel.component';

describe('SugelabexcelComponent', () => {
  let component: SugelabexcelComponent;
  let fixture: ComponentFixture<SugelabexcelComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SugelabexcelComponent]
    });
    fixture = TestBed.createComponent(SugelabexcelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
