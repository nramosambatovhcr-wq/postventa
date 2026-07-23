import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SugeridosadComponent } from './sugeridosad.component';

describe('SugeridosadComponent', () => {
  let component: SugeridosadComponent;
  let fixture: ComponentFixture<SugeridosadComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SugeridosadComponent]
    });
    fixture = TestBed.createComponent(SugeridosadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
