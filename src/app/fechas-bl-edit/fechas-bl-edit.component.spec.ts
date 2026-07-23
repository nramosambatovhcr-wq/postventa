import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FechasBlEditComponent } from './fechas-bl-edit.component';

describe('FechasBlEditComponent', () => {
  let component: FechasBlEditComponent;
  let fixture: ComponentFixture<FechasBlEditComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FechasBlEditComponent]
    });
    fixture = TestBed.createComponent(FechasBlEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
