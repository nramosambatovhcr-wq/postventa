import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgenciasvhcrComponent } from './agenciasvhcr.component';

describe('AgenciasvhcrComponent', () => {
  let component: AgenciasvhcrComponent;
  let fixture: ComponentFixture<AgenciasvhcrComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AgenciasvhcrComponent]
    });
    fixture = TestBed.createComponent(AgenciasvhcrComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
