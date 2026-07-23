import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OilCreateComponent } from './oil-create.component';

describe('OilCreateComponent', () => {
  let component: OilCreateComponent;
  let fixture: ComponentFixture<OilCreateComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OilCreateComponent]
    });
    fixture = TestBed.createComponent(OilCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
