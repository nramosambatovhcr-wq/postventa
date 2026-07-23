import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClocalComponent } from './clocal.component';

describe('ClocalComponent', () => {
  let component: ClocalComponent;
  let fixture: ComponentFixture<ClocalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ClocalComponent]
    });
    fixture = TestBed.createComponent(ClocalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
