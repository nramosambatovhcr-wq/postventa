import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FawComponent } from './faw.component';

describe('FawComponent', () => {
  let component: FawComponent;
  let fixture: ComponentFixture<FawComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FawComponent]
    });
    fixture = TestBed.createComponent(FawComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
