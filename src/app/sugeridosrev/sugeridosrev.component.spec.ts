import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SugeridosrevComponent } from './sugeridosrev.component';

describe('SugeridosrevComponent', () => {
  let component: SugeridosrevComponent;
  let fixture: ComponentFixture<SugeridosrevComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SugeridosrevComponent]
    });
    fixture = TestBed.createComponent(SugeridosrevComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
