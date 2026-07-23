import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearinvoiproComponent } from './crearinvoipro.component';

describe('CrearinvoiproComponent', () => {
  let component: CrearinvoiproComponent;
  let fixture: ComponentFixture<CrearinvoiproComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CrearinvoiproComponent]
    });
    fixture = TestBed.createComponent(CrearinvoiproComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
