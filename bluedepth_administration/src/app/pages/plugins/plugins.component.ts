import { Component, OnInit } from '@angular/core';
import { MpeApiService } from '../../mpe-api.service';

@Component({
  selector: 'app-plugins',
  templateUrl: './plugins.component.html',
  styleUrl: './plugins.component.css'
})
export class PluginsComponent implements OnInit {

  plugins:any=[];

  constructor(private mpeApi:MpeApiService){}

  ngOnInit(): void {
      this.mpeApi.getPlugins((result:any)=>{

        const keys=Object.keys(result.data[0]);
        
        for(let k of keys){
          const pkeys=Object.keys(result.data[0][k]);

          console.log(pkeys);

          this.plugins.push({"name":pkeys[0].split(".")[0],"version":result.data[0][k][pkeys[0]],"type":k})
        }

        
      },(onerror:any)=>{})
  }

}
