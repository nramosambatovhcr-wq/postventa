import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OtgarantiaComponent } from './otgarantia.component';

describe('OtgarantiaComponent', () => {
  let component: OtgarantiaComponent;
  let fixture: ComponentFixture<OtgarantiaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OtgarantiaComponent]
    });
    fixture = TestBed.createComponent(OtgarantiaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
