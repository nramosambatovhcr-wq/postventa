import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvconteoComponent } from './invconteo.component';

describe('InvconteoComponent', () => {
  let component: InvconteoComponent;
  let fixture: ComponentFixture<InvconteoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InvconteoComponent]
    });
    fixture = TestBed.createComponent(InvconteoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
