import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReconteoComponent } from './reconteo.component';

describe('ReconteoComponent', () => {
  let component: ReconteoComponent;
  let fixture: ComponentFixture<ReconteoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ReconteoComponent]
    });
    fixture = TestBed.createComponent(ReconteoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
