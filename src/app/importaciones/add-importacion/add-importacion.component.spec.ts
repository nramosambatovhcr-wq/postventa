import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddImportacionComponent } from './add-importacion.component';

describe('AddImportacionComponent', () => {
  let component: AddImportacionComponent;
  let fixture: ComponentFixture<AddImportacionComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AddImportacionComponent]
    });
    fixture = TestBed.createComponent(AddImportacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
