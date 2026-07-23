import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlvhcrComponent } from './blvhcr.component';

describe('BlvhcrComponent', () => {
  let component: BlvhcrComponent;
  let fixture: ComponentFixture<BlvhcrComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BlvhcrComponent]
    });
    fixture = TestBed.createComponent(BlvhcrComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
