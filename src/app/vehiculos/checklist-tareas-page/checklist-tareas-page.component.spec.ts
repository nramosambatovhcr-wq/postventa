import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChecklistTareasPageComponent } from './checklist-tareas-page.component';

describe('ChecklistTareasPageComponent', () => {
  let component: ChecklistTareasPageComponent;
  let fixture: ComponentFixture<ChecklistTareasPageComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ChecklistTareasPageComponent]
    });
    fixture = TestBed.createComponent(ChecklistTareasPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
