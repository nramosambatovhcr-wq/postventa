import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OilEditComponent } from './oil-edit.component';

describe('OilEditComponent', () => {
  let component: OilEditComponent;
  let fixture: ComponentFixture<OilEditComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OilEditComponent]
    });
    fixture = TestBed.createComponent(OilEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
