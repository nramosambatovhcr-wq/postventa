import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BuscarcodComponent } from './buscarcod.component';

describe('BuscarcodComponent', () => {
  let component: BuscarcodComponent;
  let fixture: ComponentFixture<BuscarcodComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BuscarcodComponent]
    });
    fixture = TestBed.createComponent(BuscarcodComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
