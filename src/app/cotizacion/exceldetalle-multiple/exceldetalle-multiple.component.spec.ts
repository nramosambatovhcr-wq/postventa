import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExceldetalleMultipleComponent } from './exceldetalle-multiple.component';

describe('ExceldetalleMultipleComponent', () => {
  let component: ExceldetalleMultipleComponent;
  let fixture: ComponentFixture<ExceldetalleMultipleComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ExceldetalleMultipleComponent]
    });
    fixture = TestBed.createComponent(ExceldetalleMultipleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
