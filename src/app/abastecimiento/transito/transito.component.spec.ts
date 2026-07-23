import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransitoComponent } from './transito.component';

describe('TransitoComponent', () => {
  let component: TransitoComponent;
  let fixture: ComponentFixture<TransitoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TransitoComponent]
    });
    fixture = TestBed.createComponent(TransitoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
