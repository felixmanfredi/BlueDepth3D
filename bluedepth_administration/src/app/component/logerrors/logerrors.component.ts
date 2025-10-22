import { Component, OnInit, NgZone, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BlueDepthBoardEnvironment } from '../../enviroment';
import * as CryptoJS from 'crypto-js';
import { interval, Subscription, BehaviorSubject } from 'rxjs';
import { ErrorMonitorService } from '../../error-monitor.service'; // Adatta il path



interface ErrorEvent {
  errorCode: number;
  idDevice: number;
  error: string;
}

interface ErrorLog {
  timestamp: number;
  idDevice: number;
  errorCode: number;
}

@Component({
  selector: 'app-logerrors',
  standalone: true,
  templateUrl: './logerrors.component.html',
  styleUrl: './logerrors.component.css',
  imports: [CommonModule]
})
export class LogErrorsComponent implements OnInit, OnDestroy {
  private apiUrl = BlueDepthBoardEnvironment.apiUrl;
  private eventSource?: EventSource;
  errorLogs: ErrorLog[] = [];
  health: boolean = true;

  constructor(
    private http: HttpClient, 
    private zone: NgZone,
    private errorMonitor: ErrorMonitorService
  ) {
    console.log('LogErrorsComponent constructed');
  }

  ngOnInit(): void {
    console.log('LogErrorsComponent initialized - connecting to SSE');
    this.connectToSSE();
  }

  ngOnDestroy(): void {
    console.log('LogErrorsComponent destroyed - closing SSE');
    if (this.eventSource) {
      this.eventSource.close();
    }
  }






  private connectToSSE(): void {
    this.eventSource = new EventSource(`${this.apiUrl}/events`);
    
    // Aggiungiamo un listener  per 'info'
    this.eventSource.addEventListener('info', (event: MessageEvent) => {
        this.processSSEEvent(event);
    });

    // Aggiungiamo un listener specifico per 'criticalError' e 'info' se 
    // sappiamo che ci sono, perché il browser potrebbe non inviarli a 'message'.
    this.eventSource.addEventListener('criticalError', (event: MessageEvent) => {
        this.processSSEEvent(event);
    });

     
    // ... Se il tuo server invia eventi con altri nomi, dovresti aggiungerli qui

    this.eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
    };
  }

  // metodo per la logica unificata di processamento degli eventi
  private processSSEEvent(event: MessageEvent): void {
      try {
        // Ignoriamo i messaggi vuoti o non JSON come "connected"
        if (!event.data || event.data === 'connected') {
          return;
        }

        // Tentativo di parsare i dati come JSON
        const data = JSON.parse(event.data);

        // ✅ Filtro Strutturale: Verifica che l'oggetto JSON abbia i campi richiesti 
        // con il tipo atteso, indipendentemente dal nome dell'evento.
        if (typeof data.idDevice === 'number' && typeof data.errorCode === 'number' && typeof data.timeStamp === 'number') {
            
          // event.lastEventId è l'ID (timestamp in millisecondi)
          const timestampMilliseconds = data.timeStamp;//parseInt(event.lastEventId);
          
          // Conversione in secondi (parte intera)
          //const timestampSeconds = Math.floor(timestampMilliseconds / 1000); 
          const timestampSeconds = timestampMilliseconds / 1000;
          
          // Popola l'array con i campi richiesti.
          this.errorLogs.unshift({
            timestamp: timestampSeconds,
            idDevice: data.idDevice,
            errorCode: data.errorCode
          });

        //Se c'è almeno un errore, imposta health = false
        if (this.errorLogs.length > 0) {
            this.health = false;
            this.errorMonitor.setHealthStatus(false);
            console.log('Error detected - health set to false');
          // Emetti il nuovo stato
          //LogErrorsComponent.healthStatus$.next(false);
        }

        }
        
      } catch (error) {
        // Log solo per i dati non parsabili, non per la logica di filtro
        console.warn(`Skipping event (Type: ${event.type || 'message'}): Non-JSON or malformed SSE data.`, event.data);
      }
  }
}













