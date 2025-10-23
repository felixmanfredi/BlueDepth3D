// import { CommonModule } from '@angular/common';
// import { Component, ViewChild } from '@angular/core';
// import { RouterOutlet } from '@angular/router';
// import { SidebarComponent } from './component/sidebar/sidebar.component';
// import {MdbModalModule, MdbModalService} from 'mdb-angular-ui-kit/modal';

// @Component({
//   selector: 'app-root',
//   standalone: false,
//   templateUrl: './app.component.html',
//   styleUrl: './app.component.css'
// })
// export class AppComponent {

//   static app:AppComponent;  
//   @ViewChild("modalMessage")
//   modalMessage:any;
//   modalMessageRef:any;
//   modalMessageType="info";
//   message:String="";
  
//   title = 'bluedepth_administration';
//   version="1.0.0";
//   isLogin=true;

//   user:any={name:"",role:""};



//   constructor(public modalService:MdbModalService){
//     AppComponent.app=this;
//   }


//   logout(){

//   }

//   showMessage(message:String,type="info",delay=2000){
//     this.message=message;
//     this.modalMessageType=type;
//     this.modalMessageRef=this.modalService.open(this.modalMessage);
//     if(delay>0){
//       setTimeout(()=>{
//         this.closeMessage();
//       },delay)
//     }
//   }

//   closeMessage(){
//     this.modalMessageRef.close();
//   }

// }


import { Component, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { SidebarComponent } from './component/sidebar/sidebar.component';
import { MdbModalService } from 'mdb-angular-ui-kit/modal';
import { ErrorMonitorService } from '../app/error-monitor.service'; // Adatta il path
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  static app: AppComponent;
  @ViewChild("modalMessage")
  modalMessage: any;
  modalMessageRef: any;
  modalMessageType = "info";
  message: String = "";
  title = 'bluedepth_administration';
  version = "1.0.0";
  isLogin = true;
  user: any = { name: "", role: "" };
  
  hasErrors: boolean = false;
  showLogErrors: boolean = false;
  private healthSubscription?: Subscription;
  private routerSubscription?: Subscription;

  constructor(
    public modalService: MdbModalService,
    private router: Router,
    private errorMonitor: ErrorMonitorService
  ) {
    AppComponent.app = this;
  }

  ngOnInit(): void {
    // Sottoscrivi al servizio di monitoraggio errori
    this.healthSubscription = this.errorMonitor.healthStatus$.subscribe(
      (health: boolean) => {
        this.hasErrors = !health;
        console.log('App - Health status:', health, 'hasErrors:', this.hasErrors);
      }
    );

    // Chiudi logerrors quando si naviga
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationStart))
      .subscribe(() => {
        if (this.showLogErrors) {
          this.showLogErrors = false;
        }
      });
  }

  ngOnDestroy(): void {
    if (this.healthSubscription) {
      this.healthSubscription.unsubscribe();
    }
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  toggleLogErrors(): void {
    this.showLogErrors = !this.showLogErrors;
    console.log('Toggle LogErrors:', this.showLogErrors);
  }

  logout() {
    // existing code
  }

  showMessage(message: String, type = "info", delay = 2000) {
    this.message = message;
    this.modalMessageType = type;
    this.modalMessageRef = this.modalService.open(this.modalMessage);
    if (delay > 0) {
      setTimeout(() => {
        this.closeMessage();
      }, delay)
    }
  }

  closeMessage() {
    this.modalMessageRef.close();
  }
}
