import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LaboratoriovehidetailComponent } from './laboratoriovehidetail.component';

describe('LaboratoriovehidetailComponent', () => {
  let component: LaboratoriovehidetailComponent;
  let fixture: ComponentFixture<LaboratoriovehidetailComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LaboratoriovehidetailComponent]
    });
    fixture = TestBed.createComponent(LaboratoriovehidetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
