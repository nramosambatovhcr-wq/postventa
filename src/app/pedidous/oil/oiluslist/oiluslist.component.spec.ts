import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OiluslistComponent } from './oiluslist.component';

describe('OiluslistComponent', () => {
  let component: OiluslistComponent;
  let fixture: ComponentFixture<OiluslistComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OiluslistComponent]
    });
    fixture = TestBed.createComponent(OiluslistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
