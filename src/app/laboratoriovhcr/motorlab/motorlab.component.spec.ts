import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MotorlabComponent } from './motorlab.component';

describe('MotorlabComponent', () => {
  let component: MotorlabComponent;
  let fixture: ComponentFixture<MotorlabComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MotorlabComponent]
    });
    fixture = TestBed.createComponent(MotorlabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
