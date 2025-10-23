
import { Component, OnInit, NgZone,OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BlueDepthBoardEnvironment } from '../../../enviroment';
import * as CryptoJS from 'crypto-js';
import { interval, Subscription } from 'rxjs';

interface MCUData {
  health: boolean;
  temperature: number;
  RTC: number;
  current: number;
  power: number;
  voltage:number;
  OutVolt:number;
  SonyCur: number;
  VidEncCur: number;
  JetCur: number;
}



@Component({
  selector: 'app-system',
  standalone: true,
  templateUrl: './system.component.html',
  styleUrl: './system.component.css',
  imports: [
    CommonModule // CommonModule perNgClass, NgFor, NgIfsu comp standalone.
    //HttpClient   // L'HttpClient va aggiunto anche qui (se non è fornito a livello root)
  ]
})
export class SystemComponent implements OnInit, OnDestroy {
  private apiUrl = BlueDepthBoardEnvironment.apiUrl;
  private pollingSubscription?: Subscription;

  
  health: boolean = false;
  temperature: number = 0;
  current: number = 0;
  power: number = 0;
  voltage:number = 0;
  OutVolt:number = 0;
  RTC: number = 0;
  dateTime: Date | undefined;
  SonyCur: number = 0;
  VidEncCur: number = 0;
  JetCur: number = 0;

  totCurrent: number = 0;



  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.startPolling();

  }

  ngOnDestroy(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }

  }

  private startPolling(): void {
    // Polling ogni 5 secondi
    this.pollingSubscription = interval(1000).subscribe(() => {
      this.fetchMCUData();
    });
    
    // Prima chiamata immediata
    this.fetchMCUData();
  }

  private fetchMCUData(): void {
    this.http.get<MCUData>(`${this.apiUrl}/api/user`).subscribe({
      next: (data) => {
        this.health = data.health;
        this.RTC = data.RTC;
        this.temperature = data.temperature;
        this.current = data.current;
        this.power = data.power;
        this.voltage = data.voltage;
        this.OutVolt = data.OutVolt;
        this.totCurrent = this.VidEncCur + this.SonyCur+ this.JetCur;

        const timestampInMilliseconds: number = this.RTC * 1000;
        this.dateTime = new Date(timestampInMilliseconds);

      },
      error: (error) => {
        console.error('Error fetching MCU data:', error);
      }
    });
  }


}













