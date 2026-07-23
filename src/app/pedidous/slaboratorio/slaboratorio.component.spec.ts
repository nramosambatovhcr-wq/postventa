import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SlaboratorioComponent } from './slaboratorio.component';

describe('SlaboratorioComponent', () => {
  let component: SlaboratorioComponent;
  let fixture: ComponentFixture<SlaboratorioComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SlaboratorioComponent]
    });
    fixture = TestBed.createComponent(SlaboratorioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
