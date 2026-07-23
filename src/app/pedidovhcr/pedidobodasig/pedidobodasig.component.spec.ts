import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PedidobodasigComponent } from './pedidobodasig.component';

describe('PedidobodasigComponent', () => {
  let component: PedidobodasigComponent;
  let fixture: ComponentFixture<PedidobodasigComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PedidobodasigComponent]
    });
    fixture = TestBed.createComponent(PedidobodasigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
