import { Component, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { BlueDepthBoardEnvironment } from '../../../../enviroment';
import Hls from 'hls.js';

interface SettingsResponse {
  videoenc_config: {
    url_stream: string;
  };
}

@Component({
  selector: 'app-video-streaming',
  imports: [CommonModule, HttpClientModule],
  standalone: true,
  templateUrl: './video-streaming.component.html',
  styleUrls: ['./video-streaming.component.css']
})
export class VideoStreamingComponent implements AfterViewInit, OnDestroy {
  @ViewChild('videoPlayer', { static: false }) videoElementRef!: ElementRef;
  
  videoElement!: HTMLVideoElement;
  loading = true;
  error: string | null = null;
  isMuted = true;
  isPlaying = false;
  
  private hls!: Hls;
  private apiUrl = BlueDepthBoardEnvironment.apiUrl;
  private streamUrl: string = '';

  constructor(private http: HttpClient) { 
    //console.log('🎬 VideoStreamingComponent: Constructor');
  }

  ngAfterViewInit(): void {
    //console.log('🎬 ngAfterViewInit: Inizializzazione video player');
    
    this.videoElement = this.videoElementRef?.nativeElement;
    
    if (this.videoElement) {
      //console.log('✅ Video element disponibile');
      this.loadStreamUrl();
    } else {
      console.error('❌ Video element non disponibile');
      this.error = 'Errore nel caricamento del player';
    }
  }

  ngOnDestroy(): void {
    //console.log('🎬 ngOnDestroy: Cleanup');
    
    if (this.hls) {
      //console.log('🗑️ Destroy HLS instance');
      this.hls.destroy();
    }
  }

  loadStreamUrl(): void {
    //console.log('Caricamento configurazione da:', `${this.apiUrl}/api/settings`);
    
    this.http.get<SettingsResponse>(`${this.apiUrl}/api/settings`).subscribe({
      next: (data) => {
        //console.log('✅ Configurazione ricevuta:', data);
        
        if (data.videoenc_config?.url_stream) {
          this.streamUrl = data.videoenc_config.url_stream;
          //console.log('🔗 URL stream:', this.streamUrl);
          
          // Sostituisci l'IP assoluto con il proxy locale
          this.streamUrl = this.streamUrl.replace('http://192.168.1.233', '');
          //console.log('🔗 URL stream (proxy):', this.streamUrl);
          
          this.initializeHlsPlayer();
        } else {
          console.error('❌ URL stream non trovato nella risposta');
          this.error = 'Configurazione stream non valida';
          this.loading = false;
        }
      },
      error: (err) => {
        console.error('❌ Errore nel caricamento della configurazione:', err);
        this.error = 'Errore nel caricamento della configurazione';
        this.loading = false;
      }
    });
  }

  initializeHlsPlayer(): void {
    //console.log('🎥 Inizializzazione HLS player con URL:', this.streamUrl);
    
    if (!this.videoElement) {
      console.error('❌ Video element non disponibile');
      return;
    }
    
    if (!this.streamUrl) {
      console.error('❌ URL stream non disponibile');
      this.error = 'URL stream non configurato';
      this.loading = false;
      return;
    }
    
    // Verifica supporto HLS.js
    if (Hls.isSupported()) {
      //console.log('✅ HLS.js supportato');
      
      try {
        this.hls = new Hls({
          debug: false,
          enableWorker: true,
          lowLatencyMode: false,
        });
        
        // Eventi HLS
        this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
          //console.log('✅ Manifest parsed - Video pronto');
          this.loading = false;
          
          // Autoplay con muted (sempre permesso dai browser)
          this.videoElement.muted = true;
          this.isMuted = true;
          
          this.videoElement.play()
            .then(() => {
              //console.log('▶️ Video in autoplay (muted)');
              this.isPlaying = true;
            })
            .catch(error => {
              console.warn('⚠️ Autoplay fallito:', error);
              // Se anche muted autoplay fallisce, mostra il controllo play
              this.isPlaying = false;
            });
        });
        
        this.hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('❌ HLS Error:', data);
          
          if (data.fatal) {
            this.loading = false;
            
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error('💔 Fatal network error');
                this.error = 'Errore di rete durante il caricamento dello stream';
                this.hls.startLoad();
                break;
                
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('💔 Fatal media error');
                this.error = 'Errore nel caricamento del media';
                this.hls.recoverMediaError();
                break;
                
              default:
                console.error('💔 Fatal error non recuperabile');
                this.error = 'Errore fatale nel player';
                this.hls.destroy();
                break;
            }
          }
        });
        
        // Carica la sorgente
        //console.log('🔗 Caricamento sorgente HLS');
        this.hls.loadSource(this.streamUrl);
        this.hls.attachMedia(this.videoElement);
        
        // Event listener video element
        this.videoElement.addEventListener('playing', () => {
          //console.log('▶️ Video playing');
          this.isPlaying = true;
        });
        
        this.videoElement.addEventListener('pause', () => {
          //console.log('⏸️ Video paused');
          this.isPlaying = false;
        });
        
        this.videoElement.addEventListener('error', () => {
          console.error('❌ Video error:', this.videoElement.error);
          this.error = 'Errore nella riproduzione del video';
          this.loading = false;
        });
        
      } catch (error) {
        console.error('❌ Errore durante la creazione di HLS:', error);
        this.error = 'Errore nell\'inizializzazione del player';
        this.loading = false;
      }
      
    } 
    // Fallback Safari (supporto nativo HLS)
    else if (this.videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      //console.log('🍎 Safari: Supporto HLS nativo');
      
      this.videoElement.src = this.streamUrl;
      this.videoElement.muted = true;
      this.isMuted = true;
      
      this.videoElement.addEventListener('loadedmetadata', () => {
        //console.log('✅ Safari: Metadati caricati');
        this.loading = false;
        
        this.videoElement.play()
          .then(() => {
            //console.log('▶️ Safari: Video in autoplay (muted)');
            this.isPlaying = true;
          })
          .catch(error => {
            console.warn('⚠️ Safari: Autoplay fallito:', error);
            this.isPlaying = false;
          });
      });
      
      this.videoElement.addEventListener('error', () => {
        console.error('❌ Safari: Errore video:', this.videoElement.error);
        this.error = 'Errore nella riproduzione del video';
        this.loading = false;
      });
      
    } else {
      console.error('❌ HLS non supportato dal browser');
      this.error = 'Il tuo browser non supporta lo streaming HLS';
      this.loading = false;
    }
  }

  // Toggle mute/unmute
  toggleMute(): void {
    if (this.videoElement) {
      this.videoElement.muted = !this.videoElement.muted;
      this.isMuted = this.videoElement.muted;
      //console.log(this.isMuted ? '🔇 Audio disattivato' : '🔊 Audio attivato');
    }
  }

  // Toggle play/pause
  togglePlayPause(): void {
    if (this.videoElement) {
      if (this.videoElement.paused) {
        this.videoElement.play()
          .then(() => {
            //console.log('▶️ Riproduzione avviata');
            this.isPlaying = true;
          })
          .catch(error => {
            console.error('❌ Errore play:', error);
          });
      } else {
        this.videoElement.pause();
        //console.log('⏸️ Riproduzione in pausa');
        this.isPlaying = false;
      }
    }
  }
}
