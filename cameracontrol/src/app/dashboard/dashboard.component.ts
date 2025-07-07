import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, isDevMode, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MdbDropdownModule } from 'mdb-angular-ui-kit/dropdown';
import { MdbRippleModule } from 'mdb-angular-ui-kit/ripple';
import Hls from 'hls.js';
import { SonyApiService } from '../sony-api.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MdbDropdownModule,MdbRippleModule,CommonModule,FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit,AfterViewInit {

  MESSAGE_LOADING="Caricamento impostazioni camera in corso ...";
  MESSAGE_LOADED="Caricamento impostazioni completato!";

  isLoaded=false;
  isLoaded2=true;
  message_error="";
  message_loading=this.MESSAGE_LOADING
  constructor(private sonyApi:SonyApiService){

  }

  mode="photo";

  dataset={
    "datasetname": "test",
    "description": "example_desc",
    "acquisition_device": "camera",
    "interval": 0.5
  }

  panels={
    "dataset":true,
    "shooting":false,
    "main":true,
    "sub":false,
    "focus":false
  }

  statusDataset=false;
  showPreview=false;
  
  
  ngAfterViewInit(): void {
     //this.initVideoPlayer();
  }
  
  ngOnInit(): void {
    //if(!isDevMode())
      this.getSettings();
  }

  @ViewChild('videoPlayer', { static: false }) videoPlayer!: ElementRef<HTMLVideoElement>;
  

  url="/hls/hls/1_0.m3u8";
  private hls!: Hls;

  settings:any={
    DispMode:"DisplayAllInfo",
    GridLineDisplay:"Off",
    AEL:"Unlocked",
    AWBL:"Unlocked",
    FNumber:"F22",
    ExposureBiasCompensation:"0Ev",
    ShutterSpeed:"bulb",
    IsoSensitivity:"ISO 100",
    ExposureProgramMode:"M_Manual",
    FocusModeSetting:"Manual",
    FileType:"Jpeg",
    RAW_FileCompressionType:"Uncompression",
    StillImageQuality:"Fine",
    WhiteBalance:"AWB",
    FocusMode:"MF",
    MeteringMode:"Multi",
    DriveMode:"Single",
    DRO:"Auto",
    ImageSize:"L",
    AspectRatio:"3_2",
    FocusArea:"Wide",
    ColorTemp:0,
    ColorTuningAB:"B0.00",
    ColorTuningGM:"M0.00",
    LiveViewDisplayEffect:"ON",
    StillImageStoreDestination:"MemoryCard",
    PriorityKeySettings:"CameraPosition",
    AFTrackingSensitivity:"3",
    FocalDistanceInMeter:2
    
  }

  getSettings(){
    this.message_loading=this.MESSAGE_LOADING;
    this.message_error="";
    this.isLoaded=false;
    this.sonyApi.getSettings((result:any)=>{
      this.message_loading=this.MESSAGE_LOADED;
      this.isLoaded=true;
      if(result.data){
        this.settings=result.data[0];
      }
    },(error: HttpErrorResponse)=>{
      this.message_loading=this.MESSAGE_LOADED;
      this.isLoaded=false;
      this.message_error="Errore durante lo scaricamento delle impostazioni della camera"
    })
  }

   sendSetting(attributeName:any){

    let tosend:any={};
    tosend[attributeName]=this.settings[attributeName];

    this.sonyApi.setSettings(tosend,(result:any)=>{
      console.log(result);
    })
  }

  sendSettings(){
    this.sonyApi.setSettings(this.settings,(result:any)=>{
      console.log(result);
    })
  }


  setFocalDistanceInMeter(delta:any){
    if(delta<0){
      if(this.settings.FocalDistanceInMeter==0){
        return;
      }
    }
     
    this.settings.FocalDistanceInMeter+delta;
    if(this.settings.FocalDistanceInMeter<0)
      this.settings.FocalDistanceInMeter=0;

    this.sendSetting("FocalDistanceInMeter");
  }

  startDataset(){
      this.sonyApi.startDataset(this.dataset,(result:any)=>{

      },(error:any)=>{

      });
  }


  private initVideoPlayer(): void {
    // Reinizializza solo se l'URL è nuovo
    
    
    if (!this.videoPlayer?.nativeElement) return;
      const video = this.videoPlayer.nativeElement;
   
   
    if (Hls.isSupported()) {
      this.hls = new Hls();
      this.hls.loadSource(this.url);
      this.hls.attachMedia(video);
      
      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log("sup")
        video.play().catch(error => {
          console.warn('Autoplay fallito:', error);
        });
      });
      
    } /*else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = this.url;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(console.warn);
      });
    }*/
  }

}
