import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransitovehiComponent } from './transitovehi.component';

describe('TransitovehiComponent', () => {
  let component: TransitovehiComponent;
  let fixture: ComponentFixture<TransitovehiComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TransitovehiComponent]
    });
    fixture = TestBed.createComponent(TransitovehiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
