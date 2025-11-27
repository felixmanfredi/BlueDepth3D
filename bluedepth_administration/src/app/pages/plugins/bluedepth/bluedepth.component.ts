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
    this.mpeApi.getStereocameraSettings((result:any)=>{
      this.loading=false; 
      console.log(result)
      this.settings = result.data[0];

    },(error:any)=>{
      console.error(error)
      this.loading=false; 
    });
  }
  
  
  save(){    
    this.isSaving=true;
    
   this.settings.save_settings=true;

    this.mpeApi.setStereocameraSettings(this.settings,(result:any)=>{
      this.isSaving=false; 

    });
  } 
}
