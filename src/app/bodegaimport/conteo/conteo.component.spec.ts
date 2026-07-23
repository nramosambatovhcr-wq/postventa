import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConteoComponent } from './conteo.component';

describe('ConteoComponent', () => {
  let component: ConteoComponent;
  let fixture: ComponentFixture<ConteoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ConteoComponent]
    });
    fixture = TestBed.createComponent(ConteoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
