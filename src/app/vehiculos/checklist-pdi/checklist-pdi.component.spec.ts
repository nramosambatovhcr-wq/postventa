import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChecklistPdiComponent } from './checklist-pdi.component';

describe('ChecklistPdiComponent', () => {
  let component: ChecklistPdiComponent;
  let fixture: ComponentFixture<ChecklistPdiComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ChecklistPdiComponent]
    });
    fixture = TestBed.createComponent(ChecklistPdiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
