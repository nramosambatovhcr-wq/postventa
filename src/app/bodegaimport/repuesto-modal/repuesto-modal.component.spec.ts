import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RepuestoModalComponent } from './repuesto-modal.component';

describe('RepuestoModalComponent', () => {
  let component: RepuestoModalComponent;
  let fixture: ComponentFixture<RepuestoModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RepuestoModalComponent]
    });
    fixture = TestBed.createComponent(RepuestoModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
