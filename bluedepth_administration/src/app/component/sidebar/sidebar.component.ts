import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppComponent } from '../../app.component';
//import packageJson from '../../../../package.json';

@Component({
  selector: 'app-sidebar',
  standalone:false,
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  collapsed=true;
  
  routes:any=[];

  get version(){
    return "1.0.0";
//    return packageJson.version
  }

  constructor(private router: Router){

  }
  ngOnInit(): void {
    this.routes=this.router.config;
   
  }
  
  checkPermission(permission:any=null){
    if(permission!=null){
      return permission.indexOf(AppComponent.app.user.role)>-1?true:false;
    }

    return true;
  }

  logout(){
    AppComponent.app.logout();
  }


}