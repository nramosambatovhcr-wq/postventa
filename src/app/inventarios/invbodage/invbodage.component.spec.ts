import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvbodageComponent } from './invbodage.component';

describe('InvbodageComponent', () => {
  let component: InvbodageComponent;
  let fixture: ComponentFixture<InvbodageComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InvbodageComponent]
    });
    fixture = TestBed.createComponent(InvbodageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
