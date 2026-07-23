import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExceldetalleComponent } from './exceldetalle.component';

describe('ExceldetalleComponent', () => {
  let component: ExceldetalleComponent;
  let fixture: ComponentFixture<ExceldetalleComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ExceldetalleComponent]
    });
    fixture = TestBed.createComponent(ExceldetalleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
