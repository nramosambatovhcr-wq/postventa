import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspeccionblarrivoComponent } from './inspeccionblarrivo.component';

describe('InspeccionblarrivoComponent', () => {
  let component: InspeccionblarrivoComponent;
  let fixture: ComponentFixture<InspeccionblarrivoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InspeccionblarrivoComponent]
    });
    fixture = TestBed.createComponent(InspeccionblarrivoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
