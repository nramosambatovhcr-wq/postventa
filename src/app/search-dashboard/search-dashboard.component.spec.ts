import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchDashboardComponent } from './search-dashboard.component';

describe('SearchDashboardComponent', () => {
  let component: SearchDashboardComponent;
  let fixture: ComponentFixture<SearchDashboardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SearchDashboardComponent]
    });
    fixture = TestBed.createComponent(SearchDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
