import { Component } from '@angular/core';

@Component({
  selector: 'app-storage',
  standalone: false,
  templateUrl: './storage.component.html',
  styleUrl: './storage.component.css'
})
export class StorageComponent {

  datasets:any[]=[];
  selectedDataset:any=null;
}
