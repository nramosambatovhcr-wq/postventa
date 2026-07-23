import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilteruslistComponent } from './filteruslist.component';

describe('FilteruslistComponent', () => {
  let component: FilteruslistComponent;
  let fixture: ComponentFixture<FilteruslistComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FilteruslistComponent]
    });
    fixture = TestBed.createComponent(FilteruslistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
