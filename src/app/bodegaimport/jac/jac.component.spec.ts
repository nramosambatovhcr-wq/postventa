import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JacComponent } from './jac.component';

describe('JacComponent', () => {
  let component: JacComponent;
  let fixture: ComponentFixture<JacComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [JacComponent]
    });
    fixture = TestBed.createComponent(JacComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
