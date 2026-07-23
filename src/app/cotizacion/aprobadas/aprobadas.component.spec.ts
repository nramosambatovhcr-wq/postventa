import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AprobadasComponent } from './aprobadas.component';

describe('AprobadasComponent', () => {
  let component: AprobadasComponent;
  let fixture: ComponentFixture<AprobadasComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AprobadasComponent]
    });
    fixture = TestBed.createComponent(AprobadasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
