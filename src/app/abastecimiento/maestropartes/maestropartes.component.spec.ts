import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MaestropartesComponent } from './maestropartes.component';

describe('MaestropartesComponent', () => {
  let component: MaestropartesComponent;
  let fixture: ComponentFixture<MaestropartesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MaestropartesComponent]
    });
    fixture = TestBed.createComponent(MaestropartesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
