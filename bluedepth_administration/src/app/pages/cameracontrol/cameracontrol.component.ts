import { Component, ElementRef, ViewChild } from '@angular/core';
import { MpeApiService } from '../../mpe-api.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-cameracontrol',
  standalone: false,
  templateUrl: './cameracontrol.component.html',
  styleUrl: './cameracontrol.component.css'
})
export class CameraControlComponent {

  MESSAGE_LOADING="Caricamento impostazioni camera in corso ...";
  MESSAGE_LOADED="Caricamento impostazioni completato!";

  isLoaded=false;
  isLoaded2=true;
  message_error="";
  message_loading=this.MESSAGE_LOADING
  constructor(private mpeApi:MpeApiService){

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

  capture(){

     (window as any).pywebview.api.capture().then((response : any)=>{
      console.log(response);
    })
    /*
    this.sonyApi.capture((img:any)=>{
      var image = new Image()
      
      image.src="data:image/jpeg,base64,"+img;
      var w=window.open();
      w?.document.write("<html><body>"+image.outerHTML+"</body></html>");
    },(error:any)=>{

    });ù*/
  }

  @ViewChild('videoPlayer', { static: false }) videoPlayer!: ElementRef<HTMLVideoElement>;
  

  url="/hls/hls/1_0.m3u8";
  //private hls!: Hls;

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
    this.mpeApi.getSettings((result:any)=>{
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

    this.mpeApi.setSettings(tosend,(result:any)=>{
      console.log(result);
    })
  }

  sendSettings(){
    this.mpeApi.setSettings(this.settings,(result:any)=>{
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

    (window as any).pywebview.api.startDataset(this.dataset).then((response : any)=>{
      
      this.statusDataset=false;
      
      console.log(response);
    })

/*
      this.sonyApi.startDataset(this.dataset,(result:any)=>{
        console.log(result);  
        this.statusDataset=true;
      },(error:any)=>{

      });*/
  }

   stopDataset(){
      (window as any).pywebview.api.stopDataset().then((response : any)=>{
      
      this.statusDataset=true;
      
      console.log(response);
    })

  }

/*
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
  //}
  
}
