import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CotasignadaComponent } from './cotasignada.component';

describe('CotasignadaComponent', () => {
  let component: CotasignadaComponent;
  let fixture: ComponentFixture<CotasignadaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CotasignadaComponent]
    });
    fixture = TestBed.createComponent(CotasignadaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
