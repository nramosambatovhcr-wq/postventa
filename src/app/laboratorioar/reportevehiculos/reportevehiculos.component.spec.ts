import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportevehiculosComponent } from './reportevehiculos.component';

describe('ReportevehiculosComponent', () => {
  let component: ReportevehiculosComponent;
  let fixture: ComponentFixture<ReportevehiculosComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ReportevehiculosComponent]
    });
    fixture = TestBed.createComponent(ReportevehiculosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
