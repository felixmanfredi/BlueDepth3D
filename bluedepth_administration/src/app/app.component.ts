import { Component, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { MdbModalService } from 'mdb-angular-ui-kit/modal';
import { ErrorMonitorService } from '../app/error-monitor.service'; // Adatta il path
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { SocketService } from './socket-service.service';
import { MpeApiService } from './mpe-api.service';

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
  board_status={
    cpu_usage: 0,
    free_disk: { "/": 0, "/boot/efi": 0 },
    free_ram: 0,
    used_disk: { "/": 0, "/boot/efi": 0 },​
    used_ram: 0
  };
  frame=true;
  location_status!:any
  lastSystemStatusTime!:Date
  system_status:any={available_datasets:[]};
  device_status:any=[];
  dataset_storage_status:any=[];
  
  hasErrors: boolean = false;
  showLogErrors: boolean = false;

  logic_unit=false;
  versionBoard:any={}
  private healthSubscription?: Subscription;
  private routerSubscription?: Subscription;

  message_not_connected="";

  get isConnected(){
    return SocketService.isConnected
  }

  constructor(
    public modalService: MdbModalService,
    private router: Router,
    private errorMonitor: ErrorMonitorService,
    private socketService: SocketService,
    private mpeApi:MpeApiService
  ) {
    AppComponent.app = this;


    if (document.location.href.indexOf('dock') > -1) {
      this.frame=false;
      this.router.navigate(["/dock"]);
    }

  }



  ngOnInit(): void {

    this.mpeApi.getVersion((res:any)=>{
      this.versionBoard=res.data[0]
    },(error:any)=>{

    })

    // Sottoscrivi al servizio di monitoraggio errori
    this.healthSubscription = this.errorMonitor.healthStatus$.subscribe(
      (health: boolean) => {
        this.hasErrors = !health;
        //console.log('App - Health status:', health, 'hasErrors:', this.hasErrors);
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
    
      this.socketService.listen("connect").subscribe(()=>{
        this.logic_unit=true;
      });

    this.socketService.listen('board_status').subscribe((msg) => {
      this.board_status=msg;
    });

    this.socketService.listen('location_status').subscribe((msg) => {
      this.location_status=msg;
    });

    this.socketService.listen('datasets_storage_status').subscribe((msg) => {
      this.dataset_storage_status=msg;
    });

    

    this.socketService.listen('device_status').subscribe((msg) => {
     
     for(let i=0;i<this.device_status.length;i++){
      if(this.device_status[i].device_type==msg.device_type){
        this.device_status[i]=msg;
        return;
      }
     }
     this.device_status.push(msg);
    });

    this.socketService.listen('system_status').subscribe((msg) => {
     this.system_status=msg;
     this.lastSystemStatusTime=new Date();
    });


    this.socketService.onReconnect.subscribe(()=>{
      this.message_not_connected="Nuovo tentativo di riconnessione";
      setTimeout(()=>{
        this.message_not_connected="";
      },2000);
    })
    
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


  checkStatus(device_type:string){

    if(this.system_status==null){
      return {"status":"warning","message":"Not ready","running":false};
    } 
    
    if(this.system_status[device_type]!=null){
      if(this.system_status[device_type].running){
        return {"status":"success","message":"Online","running":true};
      }else{
        return {"status":"danger","message":"Not running","running":false};  
      }
    }
   return {"status":"warning","message":"Not ready","running":false};
  }
}
