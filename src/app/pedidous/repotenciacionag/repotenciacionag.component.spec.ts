import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RepotenciacionagComponent } from './repotenciacionag.component';

describe('RepotenciacionagComponent', () => {
  let component: RepotenciacionagComponent;
  let fixture: ComponentFixture<RepotenciacionagComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RepotenciacionagComponent]
    });
    fixture = TestBed.createComponent(RepotenciacionagComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
