import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VidriosuspedComponent } from './vidriosusped.component';

describe('VidriosuspedComponent', () => {
  let component: VidriosuspedComponent;
  let fixture: ComponentFixture<VidriosuspedComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [VidriosuspedComponent]
    });
    fixture = TestBed.createComponent(VidriosuspedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
