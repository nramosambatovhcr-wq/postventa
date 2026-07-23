import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OilListenvComponent } from './oil-listenv.component';

describe('OilListenvComponent', () => {
  let component: OilListenvComponent;
  let fixture: ComponentFixture<OilListenvComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OilListenvComponent]
    });
    fixture = TestBed.createComponent(OilListenvComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
