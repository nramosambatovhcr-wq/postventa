import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExtraccionvehiComponent } from './extraccionvehi.component';

describe('ExtraccionvehiComponent', () => {
  let component: ExtraccionvehiComponent;
  let fixture: ComponentFixture<ExtraccionvehiComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ExtraccionvehiComponent]
    });
    fixture = TestBed.createComponent(ExtraccionvehiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
