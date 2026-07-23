import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OilListComponent } from './oil-list.component';

describe('OilListComponent', () => {
  let component: OilListComponent;
  let fixture: ComponentFixture<OilListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OilListComponent]
    });
    fixture = TestBed.createComponent(OilListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
