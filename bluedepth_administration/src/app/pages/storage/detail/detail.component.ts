import { Component, Input, OnInit } from '@angular/core';
import { MpeApiService } from '../../../mpe-api.service';

@Component({
  selector: 'app-detail',
  standalone: false,
  templateUrl: './detail.component.html',
  styleUrl: './detail.component.css'
})
export class DatasetDetailComponent  implements OnInit{
  
  @Input()
  id_dataset:number=0;

  record:any={};

  constructor(private mpeApi:MpeApiService){}


  ngOnInit(): void {
    this.mpeApi.getDatasetInfo(this.id_dataset,(result:any)=>{
      this.record=result.data[0];
    },(error:any)=>{

    });
  }

}
