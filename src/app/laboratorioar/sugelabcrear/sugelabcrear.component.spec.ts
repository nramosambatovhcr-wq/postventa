import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SugelabcrearComponent } from './sugelabcrear.component';

describe('SugelabcrearComponent', () => {
  let component: SugelabcrearComponent;
  let fixture: ComponentFixture<SugelabcrearComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SugelabcrearComponent]
    });
    fixture = TestBed.createComponent(SugelabcrearComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
