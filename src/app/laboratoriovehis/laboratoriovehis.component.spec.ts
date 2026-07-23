import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LaboratoriovehisComponent } from './laboratoriovehis.component';

describe('LaboratoriovehisComponent', () => {
  let component: LaboratoriovehisComponent;
  let fixture: ComponentFixture<LaboratoriovehisComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LaboratoriovehisComponent]
    });
    fixture = TestBed.createComponent(LaboratoriovehisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
