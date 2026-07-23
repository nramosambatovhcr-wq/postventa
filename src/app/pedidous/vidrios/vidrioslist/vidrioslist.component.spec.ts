import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VidrioslistComponent } from './vidrioslist.component';

describe('VidrioslistComponent', () => {
  let component: VidrioslistComponent;
  let fixture: ComponentFixture<VidrioslistComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [VidrioslistComponent]
    });
    fixture = TestBed.createComponent(VidrioslistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
