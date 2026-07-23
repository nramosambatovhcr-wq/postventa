import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChecklistGrupoComponent } from './checklist-grupo.component';

describe('ChecklistGrupoComponent', () => {
  let component: ChecklistGrupoComponent;
  let fixture: ComponentFixture<ChecklistGrupoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ChecklistGrupoComponent]
    });
    fixture = TestBed.createComponent(ChecklistGrupoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
