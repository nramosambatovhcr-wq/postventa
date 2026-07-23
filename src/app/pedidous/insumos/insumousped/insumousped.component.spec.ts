import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InsumouspedComponent } from './insumousped.component';

describe('InsumouspedComponent', () => {
  let component: InsumouspedComponent;
  let fixture: ComponentFixture<InsumouspedComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InsumouspedComponent]
    });
    fixture = TestBed.createComponent(InsumouspedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
