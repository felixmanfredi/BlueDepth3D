import { AfterViewInit, Component, Input, isDevMode, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CameraData } from './camera.model';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
//import { SonyService } from './sony.service';
import { TickService } from './tick.service'; // <-- IMPORTA IL SERVIZIO
import { Subscription } from 'rxjs';
import { BlueDepthBoardEnvironment } from '../../enviroment';
import { BluedepthBoardService } from '../../bluedepth-board.service';
import { VideoStreamingComponent } from './video-streaming/video-streaming.component';
import { ShutterSpeedValues } from './shutterspeed.enum';
import { FNumber } from './fnumber.enum';
import { IsoSensitivity } from './iso-sensitivity.enum';
import { ExposureBiasCompensation } from './exposure-bias.enum';
import {CameraMode} from './mode.enum';
import { MpeApiService } from '../../mpe-api.service';
import { AppComponent } from '../../app.component';
import * as L from 'leaflet';


@Component({
  selector: 'app-camera',
  standalone: false,
  templateUrl: './camera.component.html',
  styleUrls: ['./camera.component.css']
})
export class CameraComponent implements OnInit,AfterViewInit {
  private map!: L.Map
  markerIcon = L.icon({ iconUrl: 'src/assets/marker.png'});
  marker?: L.Marker;  
    coordinates:any=[];

  get cameraMode(){
    return CameraMode
  }
  
  get system_status(){
    return AppComponent.app.system_status
  }

   get location_status(){
    this.marker?.setLatLng(L.latLng(AppComponent.app.location_status.latitude[0],AppComponent.app.location_status.longitude[1]))
    return  AppComponent.app.location_status;
  }

  previewCameraFull=false;
  sonyData: CameraData | null = null; // Utilizza il modello
  loading = true;
  error: string | null = null;
  isUpdating = false;
  isFocusing = false;
  private apiUrl = BlueDepthBoardEnvironment.apiUrl;
  isPhoto = false;
  isFlash = true;
  isFlashAllTime = true;
  isPinging = false;
  private componentId = BlueDepthBoardEnvironment.sonyID; // ID UNIVOCO per questo componente
  private tickSub!: Subscription;
  //flashPulseTime = null; // Tempo impostabile da HTML
  isFlashing = false;
  flashPulseTime = 50;
  focusTime = 500; //imposto il tempo a minimo 50ms
  
  isTimer=false;
 
  mode="photo";
  interval=1;

  dataset:any={
    "datasetname": "",
    "description": "",
    "ignore_warnings":true,
    "flash":false
  }

  _statusDataset=false;
  get statusDataset(): boolean {
    if(AppComponent.app.device_status!=null ){
      for(let d of AppComponent.app.device_status){
        if(d.device_type=="camera" && this.system_status.camera!=null){

          return d.is_recording;
        }

         if(d.device_type=="stereocamera" && this.system_status.stereocamera!=null){

          return d.is_recording;
        }
      }
    }
      

    return false;
  }
  set statusDataset(value: boolean) {
    this._statusDataset = value;
  }
  showPreview=false;
  
  shutterValues = Object.values(ShutterSpeedValues); // array di valori per *ngFor
  fnumberValues = Object.values(FNumber);
  isoValues = Object.values(IsoSensitivity);
  biasValues = Object.values(ExposureBiasCompensation);

  MESSAGE_LOADING="Caricamento impostazioni camera in corso ...";
  MESSAGE_LOADED="Caricamento impostazioni completato!";

  isLoaded=false;
  isLoaded2=true;
  message_error="";
  message_loading=this.MESSAGE_LOADING

  get camera_status(){
    return AppComponent.app.checkStatus("camera").status;
  }

  get dataset_storage_status(){
    return AppComponent.app.dataset_storage_status;
  }

 

  constructor(private mpeApi:MpeApiService,private http: HttpClient, private tickService: TickService,private bluedepthBoardService: BluedepthBoardService) { 
    if(isDevMode()){
      this.apiUrl=""
    }else{
      this.apiUrl="http://192.168.1.230"
    }

   


  }
  ngAfterViewInit(): void {
    this.initMap()
    
  }

  private initMap() {
      const baseMapURl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      this.map = L.map('map',{center: [ 39.8282, -98.5795 ],
      zoom: 3});
      this.map.options.maxZoom = 22;
      
      
      L.tileLayer(baseMapURl).addTo(this.map);
      this.marker =  L.marker([this.location_status.latitude[0], this.location_status.longitude[0]],{icon: this.markerIcon,riseOnHover:true}) // Dhaka, Bangladesh
 
      this.marker.addTo(this.map)
      this.centerMap();
    }


  private centerMap() {
    
    // Fit the map into the boundary
    this.map.setView(this.marker!.getLatLng(),18);
  }

  ngOnInit(): void {

    //avvia la modalità di controllo PC
    this.sendSetting('PriorityKeySettings')



    this.tickSub = this.tickService.tick$.subscribe(tick => {
      // Esegui la richiesta solo se il tick è allineato con il tuo ID
      if (tick % 4 === this.componentId) {
        this.loadSonyData();
      }
    });
    this.stopDataset();

     
  }

  ngOnDestroy(): void {
    if (this.tickSub) {
      this.tickSub.unsubscribe();
    }
  }

  loadSonyData(): void {
    this.loading = true;
    this.error = null;
    
    this.http.get<CameraData>(`${this.apiUrl}/api/sony`).subscribe({
      next: (data) => {
        this.sonyData = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Errore nel caricamento dei dati.';
        console.error(err);
        this.loading = false;
      }
    });
    this.getSettings();
  }

  togglePower(): void {
    if (this.isUpdating) return;
    this.isUpdating = true;
    if (this.sonyData) {
      //this.http.post<SonyData>(`${this.apiUrl}/sony`, { state: !this.sonyData.isPowered }).subscribe({
      this.http.post<CameraData>(`${this.apiUrl}/api/sony/power`, { isPowered: this.sonyData.isPowered }).subscribe({
        next: (data) => {
          this.sonyData = data;
          this.isUpdating = false;
        },
        error: (err) => {
          console.error('Errore nell\'aggiornamento dello stato di alimentazione.', err);
          this.isUpdating = false;
        }
      });
    }
  }

  toggleFlashAllTime(): void{
        if (this.isUpdating) return;
    this.isUpdating = true;
    if (this.sonyData) {
      //this.http.post<SonyData>(`${this.apiUrl}/sony`, { state: !this.sonyData.isPowered }).subscribe({
      this.http.post<CameraData>(`${this.apiUrl}/api/settings/FlashAllTime`, { isFlashAllTime: !this.sonyData.isFlashAllTime }).subscribe({
        next: (data) => {
          this.sonyData = data;
          this.isUpdating = false;
        },
        error: (err) => {
          console.error('Errore nell\'aggiornamento dello stato di alimentazione.', err);
          this.isUpdating = false;
        }
      });
    }
  }

 triggerPhoto() {

    if(this.isTimer){
      this.startStopDataset();
    }else{
      this.manualDataset();
      /*
      if (this.isUpdating) return;
    
      this.isUpdating = true;
      this.isPhoto = true;
    
      this.bluedepthBoardService.takePicture(350,50,this.isFlash,false,false,(result:any)=>{
      // Attendi la durata dell'impulso prima di spegnere animazione
            setTimeout(() => {
              this.isPhoto = false;
              this.isUpdating = false;
            }, 1000);
      });
      */
    }
   
  }

  manualDataset(){
    if(!this.statusDataset){
      this.startDataset(0,()=>{
        this.trigger_capture();
      });
      
    }else{  
      this.trigger_capture();
    }
  }

  trigger_capture(){
    
    this.mpeApi.trigger_capture(this.isFlash,(result:any)=>{
        console.log(result)
    },()=>{

    });
  }




    getStateColor(): string {
      if (this.sonyData) {
      switch(this.sonyData.state) {
        case 'normal':
          return 'green';
        case 'idle':
          return 'blue';
        case 'watning':
          return 'orange';
        case 'error':
          return 'red';
        default:
          return 'gray';
      }
    }
    return '';
  }

  getStatusColor(isConnected: boolean): string {
    if (isConnected) {
      return '#4CAF50'; // Verde
    } else {
      return '#F44336'; // Rosso
    }
  }



  triggerFocus() {

    if (this.isUpdating) return;  
    this.isUpdating = true;
    this.isFocusing = true;
  

    let headers:HttpHeaders=new HttpHeaders();
        headers = headers.set('Access-Control-Allow-Origin', '*');

    // Invia POST al server
    //this.http.post('/api/mcu/flashlights', { flashPulseTime: this.mcuData?.flashPulseTime })
    
    //this.http.post('/api/mcu/flashlights', { flashPulseTime: this.flashPulseTime })
    //this.http.post('/api/sony/focus', { focusTime: this.focusTime, isFlashing: this.isFlashing, isFocusing:this.isFocusing })
    this.http.post(`${this.apiUrl}/api/sony/focus`, { focusTime: this.focusTime, isFlashing: false, isFocusing: this.isFocusing },{headers:headers})    //lo stato del flash è impostato dal flòash generale della pagina
      .subscribe({
        next: () => {
          // Attendi la durata dell'impulso prima di spegnere animazione
          setTimeout(() => {
            this.isFlashing = false;
            this.isUpdating = false;
            this.isFocusing = false;
          }, (this.focusTime + 500));
          //}, this.mcuData?.flashPulseTime);
        },
        error: (err) => {
          console.error('Errore POST:', err);
          this.isFlashing = false;
          this.isUpdating = false;
          this.isFocusing = false;
        }
      });
  }


  triggerFlash() {
    if (this.isUpdating) return;
  
    this.isUpdating = true;
    this.isFlashing = true;
  
    // Invia POST al server
    //this.http.post('/api/mcu/flashlights', { flashPulseTime: this.mcuData?.flashPulseTime })

    this.http.post(`${this.apiUrl}/api/sony/flashlights`, { flashTime: this.flashPulseTime })
      .subscribe({
        next: () => {
          // Attendi la durata dell'impulso prima di spegnere animazione
          setTimeout(() => {
            this.isFlashing = false;
            this.isUpdating = false;
            this.isFocusing = false;
          }, this.flashPulseTime);
          //}, this.mcuData?.flashPulseTime);
        },
        error: (err) => {
          console.error('Errore POST:', err);
          this.isFlashing = false;
          this.isUpdating = false;
          this.isFocusing = false;
        }
      });
  }

  // getStateClass(): string {
  //   if (this.sonyData) {
  //     switch (this.sonyData.state) {
  //       case 'warning':
  //         return 'warning';
  //       case 'error':
  //         return 'error';
  //       case 'idle':
  //         return 'idle';
  //       case 'normal':
  //       default:
  //         return 'normal';
  //     }
  //   }
  //   return '';
  // }




  capturePreview(){
        
      
      this.mpeApi.capture(false,(img:any)=>{
        var image = new Image()
        
        image.src="data:image/jpeg,base64,"+img;
        var w=window.open();
        w?.document.write("<html><body>"+image.outerHTML+"</body></html>");
      },(error:any)=>{
  
      });
      
    }
  
    camerafocus(){  
       this.bluedepthBoardService.triggerFocus(false, true, 1000, ()=>{
       });
  
    }
  
    
  
   
  
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
      PriorityKeySettings:"PCRemote",
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

          //verifica in che modalità è il sistema
          const cm= CameraMode.filter((x)=>x.modality==this.settings.ExposureProgramMode)[0];
          if(cm) this.mode=cm.mode;
            

        }
      },(error: HttpErrorResponse)=>{
        this.message_loading=this.MESSAGE_LOADED;
        this.isLoaded=false;
        this.message_error="Errore durante lo scaricamento delle impostazioni della camera"
      })
    }
  
     sendSetting(attributeName:any,onsuccess:any=null){
  
      let tosend:any={};
      tosend[attributeName]=this.settings[attributeName];
  
      this.mpeApi.setSettings(tosend,(result:any)=>{
        if(onsuccess)
          onsuccess();
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

    startStopDataset(){
      if(this.statusDataset){
        this.stopDataset();
      }else{
        this.startDataset(this.interval);
      }
    }
  
    startDataset(interval=0,callback:any=null){
      if(interval>0){
        this.dataset.camera_interval=interval;
        this.dataset.stereocamera_interval=this.interval;
      }

      
      //se la stereocamera è disabilitata
      if(this.system_status.stereocamera==null && this.system_status.camera !=null)
        this.dataset.acquisition_device="camera"

      if(this.system_status.stereocamera!=null && this.system_status.camera ==null)
        this.dataset.acquisition_device="stereocamera"




      this.dataset.flash=this.isFlash;
        this.mpeApi.startDataset(this.dataset,(result:any)=>{
         
          this.statusDataset=true;
          if(callback)
            callback();
        },(error:any)=>{
  
        });
    }
  
     stopDataset(){
        this.mpeApi.stopDataset((result:any)=>{
          this.statusDataset=false;

          if(this.mode=="video"){
            this.bluedepthBoardService.takePicture(350, 50, false, false, false, ()=>{});
          }

        },(error:any)=>{
  
        });
  
    }


    setMode(modality:string,mode:string){
      this.settings.ExposureProgramMode=modality;
      this.sendSetting('ExposureProgramMode',()=>{
        this.mode=mode;
      })
    }





  
}
