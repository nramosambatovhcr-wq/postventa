import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChecklistEnsamblajeComponent } from './checklist-ensamblaje.component';

describe('ChecklistEnsamblajeComponent', () => {
  let component: ChecklistEnsamblajeComponent;
  let fixture: ComponentFixture<ChecklistEnsamblajeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ChecklistEnsamblajeComponent]
    });
    fixture = TestBed.createComponent(ChecklistEnsamblajeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
