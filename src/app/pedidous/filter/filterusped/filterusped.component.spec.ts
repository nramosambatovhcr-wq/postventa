import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilteruspedComponent } from './filterusped.component';

describe('FilteruspedComponent', () => {
  let component: FilteruspedComponent;
  let fixture: ComponentFixture<FilteruspedComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FilteruspedComponent]
    });
    fixture = TestBed.createComponent(FilteruspedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
