import { Component, OnInit } from '@angular/core';
import { MpeApiService } from '../../mpe-api.service';
import { AppComponent } from '../../app.component';
import { DatasetDetailComponent } from './detail/detail.component';

@Component({
  selector: 'app-storage',
  standalone: false,
  templateUrl: './storage.component.html',
  styleUrl: './storage.component.css'
})
export class StorageComponent implements OnInit {
  datasets:any[]=[];
  selectedDataset:any=null;
  get percentualUsedDisk(){

      return AppComponent.app.board_status.used_disk['/']/(AppComponent.app.board_status.free_disk['/']+AppComponent.app.board_status.used_disk['/'])


      
  }

  constructor(private mpeApi:MpeApiService){}


  ngOnInit(): void {
    this.mpeApi.getDatasets((result:any)=>{
      this.datasets=result.data[0]
      console.log(this.datasets)
    },(onerror:any)=>{

    });
  }


  openDetail(id_dataset:number){
    const ref=AppComponent.app.modalService.open(DatasetDetailComponent);
    ref.component.id_dataset=id_dataset;
    
  }
  



}
