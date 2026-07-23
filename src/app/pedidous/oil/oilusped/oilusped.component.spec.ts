import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OiluspedComponent } from './oilusped.component';

describe('OiluspedComponent', () => {
  let component: OiluspedComponent;
  let fixture: ComponentFixture<OiluspedComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OiluspedComponent]
    });
    fixture = TestBed.createComponent(OiluspedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
