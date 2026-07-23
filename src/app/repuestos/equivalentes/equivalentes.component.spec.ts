import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EquivalentesComponent } from './equivalentes.component';

describe('EquivalentesComponent', () => {
  let component: EquivalentesComponent;
  let fixture: ComponentFixture<EquivalentesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EquivalentesComponent]
    });
    fixture = TestBed.createComponent(EquivalentesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
