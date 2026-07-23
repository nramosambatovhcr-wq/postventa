import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConteoglobalComponent } from './conteoglobal.component';

describe('ConteoglobalComponent', () => {
  let component: ConteoglobalComponent;
  let fixture: ComponentFixture<ConteoglobalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ConteoglobalComponent]
    });
    fixture = TestBed.createComponent(ConteoglobalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
