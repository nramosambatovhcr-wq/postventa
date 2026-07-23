import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalisisbodagComponent } from './analisisbodag.component';

describe('AnalisisbodagComponent', () => {
  let component: AnalisisbodagComponent;
  let fixture: ComponentFixture<AnalisisbodagComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AnalisisbodagComponent]
    });
    fixture = TestBed.createComponent(AnalisisbodagComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
