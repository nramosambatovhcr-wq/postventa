import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExtraccionbodComponent } from './extraccionbod.component';

describe('ExtraccionbodComponent', () => {
  let component: ExtraccionbodComponent;
  let fixture: ComponentFixture<ExtraccionbodComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ExtraccionbodComponent]
    });
    fixture = TestBed.createComponent(ExtraccionbodComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
