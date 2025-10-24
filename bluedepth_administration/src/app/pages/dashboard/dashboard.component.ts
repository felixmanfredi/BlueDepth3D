import { Component, OnInit } from '@angular/core';
import { MpeApiService } from '../../mpe-api.service';
import { AppComponent } from '../../app.component';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  
  constructor(private mpeApi:MpeApiService){}
  get board_status(){
    return  AppComponent.app.board_status;
  }

  get system_status(){
    return  AppComponent.app.system_status;
  }

  get lastSystemStatusTime(){
    return  AppComponent.app.lastSystemStatusTime;
  }

  get datasets(){
    if( AppComponent.app.system_status==null){
      return [];
    }
    return  AppComponent.app.system_status.available_datasets;
  };
  version={
    partnumber:"B3D.1000",
    serialnumber:"",
    firmwareversion:""
  }
  
  ngOnInit(): void {
    this.mpeApi.version((result:any)=>{
        this.version.firmwareversion=result.data[0].version
    },()=>{});
  }

  


  checkStatus(device_type:string){

    if(this.system_status==null){
      return {"status":"warning","message":"Not ready"};
    } 
    
    if(this.system_status[device_type]!=null){
      if(this.system_status[device_type].running){
        return {"status":"success","message":"Online"};
      }else{
        return {"status":"danger","message":"Not running"};  
      }
    }
   return {"status":"warning","message":"Not ready"};
  }
}
