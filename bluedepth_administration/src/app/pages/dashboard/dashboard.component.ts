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

  get location_status(){
    return  AppComponent.app.location_status;
  }

  get system_status(){
    
    return  AppComponent.app.system_status;
  }


  get versionBoard(){
    return AppComponent.app.versionBoard
  }

  get lastSystemStatusTime(){
    return  AppComponent.app.lastSystemStatusTime;
  }

  get logic_unit(){
    return AppComponent.app.logic_unit;
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
    return AppComponent.app.checkStatus(device_type);
  }
}
