import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SugeridosadrevComponent } from './sugeridosadrev.component';

describe('SugeridosadrevComponent', () => {
  let component: SugeridosadrevComponent;
  let fixture: ComponentFixture<SugeridosadrevComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SugeridosadrevComponent]
    });
    fixture = TestBed.createComponent(SugeridosadrevComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
