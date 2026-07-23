import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SoportesComponent } from './soportes.component';

describe('SoportesComponent', () => {
  let component: SoportesComponent;
  let fixture: ComponentFixture<SoportesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SoportesComponent]
    });
    fixture = TestBed.createComponent(SoportesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
