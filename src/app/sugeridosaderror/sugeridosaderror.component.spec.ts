import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SugeridosaderrorComponent } from './sugeridosaderror.component';

describe('SugeridosaderrorComponent', () => {
  let component: SugeridosaderrorComponent;
  let fixture: ComponentFixture<SugeridosaderrorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SugeridosaderrorComponent]
    });
    fixture = TestBed.createComponent(SugeridosaderrorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
