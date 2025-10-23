import { Component } from '@angular/core';

@Component({
  selector: 'app-dock',
  standalone: false,
  templateUrl: './dock.component.html',
  styleUrl: './dock.component.css'
})
export class DockComponent {

    openDashboard(){
      window.open("/", "_blank",'width=1024,height=768');
    }
} 
