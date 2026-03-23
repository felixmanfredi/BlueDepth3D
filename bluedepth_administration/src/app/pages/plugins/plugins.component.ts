import { Component, OnInit, ViewChild } from '@angular/core';
import { MpeApiService } from '../../mpe-api.service';
import { AppComponent } from '../../app.component';
import { MdbModalService } from 'mdb-angular-ui-kit/modal';

@Component({
  selector: 'app-plugins',
  templateUrl: './plugins.component.html',
  styleUrl: './plugins.component.css'
})
export class PluginsComponent implements OnInit {
  @ViewChild("pluginSettings")
  pluginSettings: any;
  pluginSettingsRef:any;
  pluginSelected:any=null;
 
  loadingPlugins=false;
  plugins:any=[];

  constructor(private mpeApi:MpeApiService,private modalService: MdbModalService){}

  ngOnInit(): void {
      this.mpeApi.getPlugins((result:any)=>{

        const keys=Object.keys(result.data[0]);
        
        for(let k of keys){
          const pkeys=Object.keys(result.data[0][k]);

          console.log(pkeys);

          this.plugins.push({"name":pkeys[0].split(".")[0],"fullname":pkeys[0],"version":result.data[0][k][pkeys[0]],"type":k})
        }

        
      },(onerror:any)=>{})
  }

  stopPlugin(fullname:string,type:string){
    this.loadingPlugins=true;


    this.mpeApi.stopPlugin(type,fullname,(result:any)=>{
      alert("Plugin stopped");
       this.loadingPlugins=false;
       AppComponent.app.system_status[type].running=false;
    },(onerror:any)=>{
      alert("Error stopping plugin");
      this.loadingPlugins=false;
    })  
  }

  startPlugin(fullname:string,type:string){
    this.loadingPlugins=true;
    this.mpeApi.startPlugin(type,fullname,(result:any)=>{
      alert("Plugin started");
      this.loadingPlugins=false;
      AppComponent.app.system_status[type].running=true;

      
    },(onerror:any)=>{
      alert("Error starting plugin");
      this.loadingPlugins=false;
    })  
  }


  checkStatus(device_type:string){
      return AppComponent.app.checkStatus(device_type);
    }


  openSettings(plugin:any){
    this.pluginSelected=plugin;
    this.pluginSettingsRef=this.modalService.open(this.pluginSettings);
  }

  closePluginSettings(){
    this.pluginSettingsRef.close();
  }

}
