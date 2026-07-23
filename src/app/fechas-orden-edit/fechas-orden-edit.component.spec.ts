import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FechasOrdenEditComponent } from './fechas-orden-edit.component';

describe('FechasOrdenEditComponent', () => {
  let component: FechasOrdenEditComponent;
  let fixture: ComponentFixture<FechasOrdenEditComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FechasOrdenEditComponent]
    });
    fixture = TestBed.createComponent(FechasOrdenEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
