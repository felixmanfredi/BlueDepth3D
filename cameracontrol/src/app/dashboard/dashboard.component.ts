import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MdbDropdownModule } from 'mdb-angular-ui-kit/dropdown';
import { MdbRippleModule } from 'mdb-angular-ui-kit/ripple';
import Hls from 'hls.js';
import { SonyApiService } from '../sony-api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MdbDropdownModule,MdbRippleModule,CommonModule,FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit,AfterViewInit {


  constructor(private sonyApi:SonyApiService){

  }

  panels={
    "shooting":true,
    "main":true,
    "sub":true,
    "focus":true
  }


  showPreview=false;
  
  
  ngAfterViewInit(): void {
     //this.initVideoPlayer();
  }
  
  ngOnInit(): void {
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


  settings2={
    modality:"A",
    ShutterSpeed:"1/500",
    F:2.8,
    ISO:100,
    EV:0.0,
    format:"RAW",
    type:"RAW (non compresso)",
    quality:"X.FINE",
    size:"L",
    aspectRatio:"3:2",
    modeNext:"Scatto singolo",
    WB:"AWB",
    FocusMode:"MF"

  }

  getSettings(){
    this.sonyApi.getSettings((result:any)=>{
      if(result.data){
        this.settings=result.data[0];
      }
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
