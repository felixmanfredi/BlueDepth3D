import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CameraControlComponent } from './cameracontrol.component';

describe('CameraControlComponent', () => {
  let component: CameraControlComponent;
  let fixture: ComponentFixture<CameraControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CameraControlComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CameraControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
