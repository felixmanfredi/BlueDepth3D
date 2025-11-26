import { Component, OnInit } from '@angular/core';
import { BluedepthBoardService } from '../../../bluedepth-board.service';
import { MpeApiService } from '../../../mpe-api.service';

@Component({
  selector: 'app-bluedepthsettings',
  standalone: false,
  templateUrl: './bluedepth.component.html',
  styleUrl: './bluedepth.component.css'
})
export class BluedepthSettingsComponent implements OnInit {

  settings:any={};
  constructor(private mpeApi: MpeApiService) { } 
  ngOnInit(): void {
    this.getSettings();
  }
  isSaving: boolean = false;
  loading: boolean = false;
  
  getSettings(){
    this.loading=true; 
    this.mpeApi.getStereocameraSettings((settings:any)=>{
      this.loading=false; 
      this.settings = settings;
    },(error:any)=>{
      this.loading=false; 
    });
  }
  
  
  save(){    
    this.isSaving=true;  
    this.mpeApi.setStereocameraSettings(this.settings,(result:any)=>{
      this.isSaving=false; 

    });
  } 
}
