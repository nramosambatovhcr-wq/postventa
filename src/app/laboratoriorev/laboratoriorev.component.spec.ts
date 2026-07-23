import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LaboratoriorevComponent } from './laboratoriorev.component';

describe('LaboratoriorevComponent', () => {
  let component: LaboratoriorevComponent;
  let fixture: ComponentFixture<LaboratoriorevComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LaboratoriorevComponent]
    });
    fixture = TestBed.createComponent(LaboratoriorevComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
