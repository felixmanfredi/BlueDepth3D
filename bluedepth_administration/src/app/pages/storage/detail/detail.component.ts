import { AfterViewInit, Component, Input, OnInit } from '@angular/core';
import { MpeApiService } from '../../../mpe-api.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-detail',
  standalone: false,
  templateUrl: './detail.component.html',
  styleUrl: './detail.component.css'
})
export class DatasetDetailComponent  implements OnInit,AfterViewInit{
  
  @Input()
  id_dataset:number=0;

  record:any={};

   private map!: L.Map
  markers: L.Marker[] = [
    L.marker([23.7771, 90.3994]) // Dhaka, Bangladesh
  ];
  coordinates:any=[];
  
  constructor(private mpeApi:MpeApiService){}


  ngOnInit(): void {
    this.mpeApi.getDatasetInfo(this.id_dataset,(result:any)=>{
      this.record=result.data[0];
      this.initMap();
      this.loadPaths();
    },(error:any)=>{

    });
  }

  
  ngAfterViewInit() {
    //this.initMap();
  }
   private initMap() {
    const baseMapURl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    this.map = L.map('map');
    this.map.options.maxZoom = 22;
    
    L.tileLayer(baseMapURl).addTo(this.map);
  }


  loadPaths(){

     
    if(this.record.location_history!=null){
      for(let path of this.record.location_history){
        const latLng = L.latLng(path.latitude[0], path.longitude[0]);
        this.coordinates.push(latLng);

      }
    }

     const polyline = L.polyline(this.coordinates, {
      color: 'blue',
      weight: 4,
      opacity: 0.8
    }).addTo(this.map);


    this.centerMap();
  }

  private centerMap() {
    // Create a boundary based on the markers
  //  const bounds = L.latLngBounds(this.markers.map(marker => marker.getLatLng()));
     const bounds = L.latLngBounds(this.coordinates);
    
    // Fit the map into the boundary
    this.map.fitBounds(bounds);
  }


}
