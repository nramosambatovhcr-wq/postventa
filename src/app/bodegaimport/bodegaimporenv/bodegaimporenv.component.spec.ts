import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BodegaimporenvComponent } from './bodegaimporenv.component';

describe('BodegaimporenvComponent', () => {
  let component: BodegaimporenvComponent;
  let fixture: ComponentFixture<BodegaimporenvComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BodegaimporenvComponent]
    });
    fixture = TestBed.createComponent(BodegaimporenvComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
