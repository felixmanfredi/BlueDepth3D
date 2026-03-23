import { Component, OnInit } from '@angular/core';
import { BluedepthBoardService } from '../../../bluedepth-board.service';

@Component({
  selector: 'app-sonysettings',
  standalone: false,
  templateUrl: './sony.component.html',
  styleUrl: './sony.component.css'
})
export class SonySettingsComponent implements OnInit{
 isSaving: boolean = false;
 loading: boolean = false;
  


  constructor(private bluedepthBoardService:BluedepthBoardService){

  }
  ngOnInit(): void {
    this.getState();
  }

  state=false;


  getState(){
    this.bluedepthBoardService.getPowerSony((result:any)=>{
      this.state=result.isPowered;
    },(error:any)=>{

    })
  }

  setState(state:boolean){
    this.bluedepthBoardService.setPowerSony(state,(result:any)=>{
      this.state=result.isPowered;
    },(error:any)=>{

    })
  }


  save(){    
    this.isSaving=true;
    
   //this.settings.save_settings=true;
    /*
    this.mpeApi.setStereocameraSettings(this.settings,(result:any)=>{
      this.isSaving=false; 

    });
    */
  } 
}
