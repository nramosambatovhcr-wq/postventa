import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SugeridoserrorComponent } from './sugeridoserror.component';

describe('SugeridoserrorComponent', () => {
  let component: SugeridoserrorComponent;
  let fixture: ComponentFixture<SugeridoserrorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SugeridoserrorComponent]
    });
    fixture = TestBed.createComponent(SugeridoserrorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
