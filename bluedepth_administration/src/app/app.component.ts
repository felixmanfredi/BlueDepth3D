import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './component/sidebar/sidebar.component';
import {MdbModalModule, MdbModalService} from 'mdb-angular-ui-kit/modal';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {

  static app:AppComponent;  
  @ViewChild("modalMessage")
  modalMessage:any;
  modalMessageRef:any;
  modalMessageType="info";
  message:String="";
  
  title = 'bluedepth_administration';
  version="1.0.0";
  isLogin=true;

  user:any={name:"",role:""};



  constructor(public modalService:MdbModalService){
    AppComponent.app=this;
  }


  logout(){

  }

  showMessage(message:String,type="info",delay=2000){
    this.message=message;
    this.modalMessageType=type;
    this.modalMessageRef=this.modalService.open(this.modalMessage);
    if(delay>0){
      setTimeout(()=>{
        this.closeMessage();
      },delay)
    }
  }

  closeMessage(){
    this.modalMessageRef.close();
  }

}
