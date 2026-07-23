import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PedidobodSearchModalComponent } from './pedidobod-search-modal.component';

describe('PedidobodSearchModalComponent', () => {
  let component: PedidobodSearchModalComponent;
  let fixture: ComponentFixture<PedidobodSearchModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PedidobodSearchModalComponent]
    });
    fixture = TestBed.createComponent(PedidobodSearchModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
