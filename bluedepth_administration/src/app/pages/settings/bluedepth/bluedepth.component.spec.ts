import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BluedepthSettingsComponent } from './bluedepth.component';

describe('BluedepthComponent', () => {
  let component: BluedepthSettingsComponent;
  let fixture: ComponentFixture<BluedepthSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BluedepthSettingsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BluedepthSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
