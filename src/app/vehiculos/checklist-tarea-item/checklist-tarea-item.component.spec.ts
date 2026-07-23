import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChecklistTareaItemComponent } from './checklist-tarea-item.component';

describe('ChecklistTareaItemComponent', () => {
  let component: ChecklistTareaItemComponent;
  let fixture: ComponentFixture<ChecklistTareaItemComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ChecklistTareaItemComponent]
    });
    fixture = TestBed.createComponent(ChecklistTareaItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
