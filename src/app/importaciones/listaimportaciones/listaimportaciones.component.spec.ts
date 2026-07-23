import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListaimportacionesComponent } from './listaimportaciones.component';

describe('ListaimportacionesComponent', () => {
  let component: ListaimportacionesComponent;
  let fixture: ComponentFixture<ListaimportacionesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ListaimportacionesComponent]
    });
    fixture = TestBed.createComponent(ListaimportacionesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
