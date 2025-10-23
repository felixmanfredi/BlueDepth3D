import { Component } from '@angular/core';
//import { NetworkComponent } from './network/network.component';

@Component({
  selector: 'app-settings',
  standalone: false,
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsComponent {
  tab=1;
}
