import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VidriosCreateComponent } from './vidrios-create.component';

describe('VidriosCreateComponent', () => {
  let component: VidriosCreateComponent;
  let fixture: ComponentFixture<VidriosCreateComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [VidriosCreateComponent]
    });
    fixture = TestBed.createComponent(VidriosCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
