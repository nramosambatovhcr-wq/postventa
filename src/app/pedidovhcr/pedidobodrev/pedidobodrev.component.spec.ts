import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PedidobodrevComponent } from './pedidobodrev.component';

describe('PedidobodrevComponent', () => {
  let component: PedidobodrevComponent;
  let fixture: ComponentFixture<PedidobodrevComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PedidobodrevComponent]
    });
    fixture = TestBed.createComponent(PedidobodrevComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
