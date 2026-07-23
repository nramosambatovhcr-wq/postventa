import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SugeridoslabrevComponent } from './sugeridoslabrev.component';

describe('SugeridoslabrevComponent', () => {
  let component: SugeridoslabrevComponent;
  let fixture: ComponentFixture<SugeridoslabrevComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SugeridoslabrevComponent]
    });
    fixture = TestBed.createComponent(SugeridoslabrevComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
