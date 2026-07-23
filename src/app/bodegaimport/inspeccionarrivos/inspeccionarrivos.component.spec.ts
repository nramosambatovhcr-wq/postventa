import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspeccionarrivosComponent } from './inspeccionarrivos.component';

describe('InspeccionarrivosComponent', () => {
  let component: InspeccionarrivosComponent;
  let fixture: ComponentFixture<InspeccionarrivosComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InspeccionarrivosComponent]
    });
    fixture = TestBed.createComponent(InspeccionarrivosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
