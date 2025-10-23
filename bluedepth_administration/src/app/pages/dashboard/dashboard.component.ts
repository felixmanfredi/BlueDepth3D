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
  version={
    partnumber:"",
    serialnumber:"",
    firmwareversion:""
  }
  
  ngOnInit(): void {
    this.mpeApi.version((result:any)=>{
        this.version.firmwareversion=result.data[0].version
    },()=>{});
  }

}
