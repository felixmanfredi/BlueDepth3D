// import { Component, OnInit, NgZone } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { HttpClient, HttpHeaders } from '@angular/common/http'; // Rimosso HttpResponse, non più usato
// import { firstValueFrom } from 'rxjs';
// import { BlueDepthBoardEnvironment } from '../../../enviroment';
// import * as CryptoJS from 'crypto-js';

// interface SystemConfig {
//   fw_version: string;
//   pcb_rev: string;
//   serial_number: string;
//   part_number: string;
// }

// interface Status {
//   message: string;
//   type: 'success' | 'error' | 'info' | null;
// }

// interface UpdateInfo {
//   version: string;
//   size: string;
//   available: boolean;
// }

// interface ServerError {
//   error: boolean;
//   error_code: number;
// }

// @Component({
//   selector: 'app-maintenance',
//   standalone: true,
//   imports: [CommonModule],
//   templateUrl: './maintenance.component.html',
//   styleUrls: ['./maintenance.component.scss']
// })
// export class MaintenanceComponent implements OnInit {
//   private readonly apiUrl = BlueDepthBoardEnvironment.apiUrl;
//   private readonly otaServerUrl = `/getUpdate`;
//   private readonly otaToken = '8cbb019f431857f31fa6fde795da47445040c62d';
//   private readonly ESP32_UPLOAD_URL = `/ota/upload`;
//   private readonly ESP32_OTA_START_URL = `/ota/start`;
//   private readonly ESP32_SETTINGS_URL = `/api/settings`;

//   currentVersion = "N/D";
//   isChecking = false;
//   isUpdating = false;
//   showCheckProgress = false; // Pubblico: per progress durante check
//   checkProgress = 0; // Pubblico: progress specifico per check
//   checkStatus: Status = { message: '', type: null };
//   uploadStatus: Status = { message: '', type: null };
//   progress = 0;
//   showProgressBar = false;
//   updateInfo: UpdateInfo = { version: '', size: '', available: false };
//   private firmwareBlob: Blob | null = null;
//   selectedFirmware: File | null = null;

//   constructor(private http: HttpClient, private zone: NgZone) { }

//   ngOnInit(): void {
//     this.loadSystemConfig(); // Async, fire and forget
//   }

//   private async loadSystemConfig(): Promise<{ system_config: SystemConfig } | null> {
//     try {
//       const response = await firstValueFrom(
//         this.http.get<{ system_config: SystemConfig }>(this.ESP32_SETTINGS_URL)
//       );
//       this.currentVersion = response.system_config.fw_version;
//       return response;
//     } catch (error) {
//       this.currentVersion = "Errore di connessione";
//       this.checkStatus = { message: '❌ Impossibile comunicare con il dispositivo.', type: 'error' };
//       return null;
//     }
//   }

//   async checkFirmwareUpdate(): Promise<void> {
//     this.isChecking = true;
//     this.showCheckProgress = true;
//     this.checkProgress = 0;
//     this.updateInfo.available = false;
//     this.firmwareBlob = null;
//     this.selectedFirmware = null;
//     this.checkStatus = { message: 'Recupero configurazione dispositivo...', type: 'info' };
//     this.zone.run(() => this.checkProgress = 20); // Fase 1: Config

//     try {
//       const config = await this.loadSystemConfig();
//       if (!config) {
//         throw new Error("Configurazione del dispositivo non disponibile.");
//       }

//       this.checkStatus = { message: 'Controllo aggiornamenti sul server...', type: 'info' };
//       this.zone.run(() => this.checkProgress = 50); // Fase 2: Chiamata server

//       const { part_number, serial_number, fw_version, pcb_rev } = config.system_config;
//       const body = { pn: part_number, sn: serial_number, fw: fw_version, rev: pcb_rev };

//       // Usa fetch per evitare limiti typing HttpClient con blob/response
//       const response = await fetch(this.otaServerUrl, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'Token': this.otaToken
//         },
//         body: JSON.stringify(body)
//       });

//       if (!response.ok) {
//         throw new Error(`Errore HTTP: ${response.status} - ${response.statusText}`);
//       }

//       this.zone.run(() => this.checkProgress = 80); // Fase 3: Parsing

//       // Leggi come blob per compatibilità con firmware binary
//       const blob = await response.blob();
//       if (!blob || blob.size === 0) {
//         throw new Error('Risposta vuota dal server.');
//       }

//       const contentType = response.headers.get('content-type') || 'application/octet-stream';

//       // Controlla se è errore JSON (content-type o size piccola)
//       if (contentType.includes('application/json') || contentType.includes('text/') || blob.size < 1024) {
//         const text = await blob.text();
//         try {
//           const errorJson: ServerError = JSON.parse(text);
//           if (errorJson.error && errorJson.error_code) {
//             throw new Error(this.getErrorMessage(errorJson.error_code));
//           }
//         } catch (parseError) {
//           // Non è JSON errore: procedi come successo (raro, ma fallback)
//           console.warn('Parsing JSON fallito, assumo successo:', parseError);
//         }
//       }

//       // Successo: tratta come firmware blob
//       const newVersion = response.headers.get('Version') || 'Sconosciuta';
//       const fileSize = response.headers.get('content-length') || blob.size.toString();
//       const fileSizeMB = (parseInt(fileSize) / (1024 * 1024)).toFixed(2);

//       this.firmwareBlob = blob;
//       this.updateInfo = { version: newVersion, size: `${fileSizeMB} MB`, available: true };
//       this.selectedFirmware = new File([this.firmwareBlob!], "firmware.bin", { type: "application/octet-stream" });
//       this.checkStatus = { message: `✅ Aggiornamento disponibile: versione ${newVersion} (${fileSizeMB} MB). Premi Upload per procedere.`, type: 'success' };
//       this.zone.run(() => this.checkProgress = 100);

//     } catch (error: any) {
//       let errorMessage = error.message || 'Errore sconosciuto';
//       this.checkStatus = { message: `❌ ${errorMessage}`, type: 'error' };
//       console.error('Errore check update:', error); // Debug opzionale
//       this.zone.run(() => this.checkProgress = 0);
//     } finally {
//       this.isChecking = false;
//       this.showCheckProgress = false;
//     }
//   }

//   onFileSelected(event: Event): void {
//     const input = event.target as HTMLInputElement;
//     if (input.files?.[0]) {
//       const file = input.files[0];
//       if (!file.name.endsWith('.bin')) {
//         this.uploadStatus = { message: '❌ Selezionare solo file .bin', type: 'error' };
//         input.value = '';
//         return;
//       }
//       this.selectedFirmware = file;
//       this.uploadStatus = { message: `📁 File selezionato: ${file.name}. Premi Upload per procedere.`, type: 'info' };
//       input.value = '';
//     }
//   }

//   uploadFirmware(): void {
//     if (!this.selectedFirmware) {
//       this.uploadStatus = { message: '❌ Nessun firmware selezionato. Carica un file o controlla gli aggiornamenti.', type: 'error' };
//       return;
//     }
//     this.showProgressBar = true;
//     this.progress = 0;
//     this.handleUpload(this.selectedFirmware, 'upload');
//     this.selectedFirmware = null;
//   }

//   private async handleUpload(file: File, statusChannel: 'upload' | 'check'): Promise<void> {
//     this.isUpdating = true;
//     this.showProgressBar = true;
//     this.progress = 0;
//     const statusTarget = statusChannel === 'upload' ? 'uploadStatus' : 'checkStatus';

//     try {
//       // Fase 1: Calcolo MD5 (0-10%)
//       this[statusTarget] = { message: '🔐 Calcolo hash MD5...', type: 'info' };
//       const hash = await this.calculateMD5(file);
//       this.zone.run(() => this.progress = 10);
//       this[statusTarget] = { message: `🔐 Hash MD5 calcolato: ${hash}`, type: 'info' };

//       // Fase 2: Avvio OTA (10-20%)
//       this[statusTarget] = { message: '📡 Avvio processo OTA...', type: 'info' };
//       const startUrl = `${this.ESP32_OTA_START_URL}?mode=fr&hash=${hash}`;
//       const startResponse = await fetch(startUrl);
//       if (!startResponse.ok) {
//         const errorText = await startResponse.text();
//         throw new Error(`Impossibile avviare il processo OTA. Dettaglio: ${errorText}`);
//       }
//       this.zone.run(() => this.progress = 20);
//       this[statusTarget] = { message: '✅ Processo OTA avviato.', type: 'info' };

//       // Fase 3: Upload (20-90%)
//       this[statusTarget] = { message: `📤 Caricamento ${file.name}...`, type: 'info' };
//       await this.uploadFileWithProgress(file, statusTarget);
//       this.zone.run(() => this.progress = 90);
//       this[statusTarget] = { message: '📤 Upload completato. Inizio flashing...', type: 'info' };

//       // Fase 4: Flashing simulato (90-100%, ~35s)
//       this[statusTarget] = { message: '⚡ Flashing in corso... (fino a 35 secondi)', type: 'info' };
//       for (let i = 90; i <= 100; i += 2) {
//         await new Promise(resolve => setTimeout(resolve, 700));
//         this.zone.run(() => this.progress = i);
//       }
//       this[statusTarget] = { message: '✅ Flashing completato! Riavvio in corso...', type: 'success' };
//       setTimeout(() => location.reload(), 3000);

//     } catch (error: any) {
//       this[statusTarget] = { message: `❌ Errore: ${error.message || 'Errore sconosciuto'}`, type: 'error' };
//       console.error('Errore upload:', error); // Debug opzionale
//       this.resetState();
//     }
//   }

//   private calculateMD5(file: File): Promise<string> {
//     return new Promise((resolve, reject) => {
//       const reader = new FileReader();
//       reader.onload = (event: any) => {
//         try {
//           const arrayBuffer = event.target.result as ArrayBuffer;
//           const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
//           const hash = CryptoJS.MD5(wordArray).toString(CryptoJS.enc.Hex);
//           resolve(hash);
//         } catch (error) {
//           reject(new Error('Errore nel calcolo dell\'MD5: ' + error));
//         }
//       };
//       reader.onerror = () => reject(new Error('Errore nella lettura del file'));
//       reader.readAsArrayBuffer(file);
//     });
//   }

//   private uploadFileWithProgress(file: File, statusTarget: 'uploadStatus' | 'checkStatus'): Promise<void> {
//     return new Promise((resolve, reject) => {
//       const xhr = new XMLHttpRequest();
//       const formData = new FormData();
//       formData.append('file', file, file.name);

//       let lastProgress = 20;
//       xhr.upload.addEventListener('progress', (event) => {
//         if (event.lengthComputable) {
//           const newProgress = 20 + Math.round((event.loaded / event.total) * 70);
//           if (newProgress > lastProgress) {
//             this.zone.run(() => this.progress = newProgress);
//             lastProgress = newProgress;
//           }
//         }
//       });

//       xhr.onreadystatechange = () => {
//         if (xhr.readyState === 4) {
//           if (xhr.status === 200) {
//             resolve();
//           } else {
//             const errorMessage = xhr.responseText || `Errore del server: ${xhr.status} - ${xhr.statusText}`;
//             reject(new Error(errorMessage));
//           }
//         }
//       };
//       xhr.onerror = () => reject(new Error('Errore di rete durante l\'upload'));
//       xhr.open('POST', this.ESP32_UPLOAD_URL, true);
//       xhr.send(formData);
//     });
//   }

//   private getErrorMessage(code: number): string {
//     const errorMap: { [key: number]: string } = {
//       1: "Token non trovato nella chiamata",
//       2: "Token non valido",
//       101: "Part number non trovato",
//       102: "Aggiornamento firmware non disponibile",
//       103: "Firmware non aggiornabile",
//       104: "File firmware non esistente sul server",
//       105: "Mancata corrispondenza della revisione hardware",
//       106: "Serial number non trovato"
//     };
//     return errorMap[code] || `Errore sconosciuto (codice: ${code})`;
//   }

//   private resetState(): void {
//     this.isUpdating = false;
//     this.showProgressBar = false;
//     this.progress = 0;
//   }
// }





import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BlueDepthBoardEnvironment } from '../../../enviroment';
import * as CryptoJS from 'crypto-js';

interface SystemConfig {
  fw_version: string;
  pcb_rev: string;
  serial_number: string;
  part_number: string;
}

interface Status {
  message: string;
  type: 'success' | 'error' | 'info' | null;
}

interface UpdateInfo {
  version: string;
  size: string;
  available: boolean;
}

interface ServerError {
  error: boolean;
  error_code: number;
}

@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './maintenance.component.html',
  styleUrls: ['./maintenance.component.scss']
})
export class MaintenanceComponent implements OnInit {
  private readonly apiUrl = BlueDepthBoardEnvironment.apiUrl;
  private readonly otaServerUrl = `/getUpdate`;
  private readonly otaToken = '8cbb019f431857f31fa6fde795da47445040c62d';
  private readonly ESP32_UPLOAD_URL = `/ota/upload`;
  private readonly ESP32_OTA_START_URL = `/ota/start`;
  private readonly ESP32_SETTINGS_URL = `/api/settings`;

  currentVersion = "N/D";
  isChecking = false;
  isUpdating = false;
  showCheckProgress = false;
  checkProgress = 0;
  checkStatus: Status = { message: '', type: null };
  uploadStatus: Status = { message: '', type: null };
  progress = 0;
  showProgressBar = false;
  updateInfo: UpdateInfo = { version: '', size: '', available: false };
  private firmwareBlob: Blob | null = null;
  selectedFirmware: File | null = null;

  constructor(private http: HttpClient, private zone: NgZone) { }

  ngOnInit(): void {
    this.loadSystemConfig();
  }

  private async loadSystemConfig(): Promise<{ system_config: SystemConfig } | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ system_config: SystemConfig }>(this.ESP32_SETTINGS_URL)
      );
      this.currentVersion = response.system_config.fw_version;
      return response;
    } catch (error) {
      this.currentVersion = "Errore di connessione";
      this.checkStatus = { message: '❌ Impossibile comunicare con il dispositivo.', type: 'error' };
      return null;
    }
  }

  async checkFirmwareUpdate(): Promise<void> {
    this.isChecking = true;
    this.showCheckProgress = true;
    this.checkProgress = 0;
    this.updateInfo.available = false;
    this.firmwareBlob = null;
    this.selectedFirmware = null;
    this.checkStatus = { message: 'Recupero configurazione dispositivo...', type: 'info' };
    this.zone.run(() => this.checkProgress = 20);

    try {
      const config = await this.loadSystemConfig();
      if (!config) {
        throw new Error("Configurazione del dispositivo non disponibile.");
      }

      this.checkStatus = { message: 'Controllo aggiornamenti sul server...', type: 'info' };
      this.zone.run(() => this.checkProgress = 50);

      const { part_number, serial_number, fw_version, pcb_rev } = config.system_config;
      const body = { pn: part_number, sn: serial_number, fw: fw_version, rev: pcb_rev };

      const response = await fetch(this.otaServerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Token': this.otaToken
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Errore HTTP: ${response.status} - ${response.statusText}`);
      }

      this.zone.run(() => this.checkProgress = 80);

      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        throw new Error('Risposta vuota dal server.');
      }

      const contentType = response.headers.get('content-type') || '';

      // Controlla se è JSON (errore o altro)
      if (contentType.includes('application/json') || contentType.includes('text/') || blob.size < 1024) {
        const text = await blob.text();
        let parsedJson: any = null;
        
        // Tenta parsing JSON
        try {
          parsedJson = JSON.parse(text);
        } catch (jsonError) {
          // Non è JSON valido, ignora e tratta come blob (improbabile ma gestito)
          console.warn('Risposta non JSON, trattata come blob firmware:', text);
        }

        // Se parsing JSON riuscito, controlla se è errore
        if (parsedJson && parsedJson.error === true && parsedJson.error_code) {
          // È un errore del server: lancia eccezione che viene catturata dal catch esterno
          throw new Error(this.getErrorMessage(parsedJson.error_code));
        }
      }

      // Se arriviamo qui, è successo: tratta come firmware blob
      const newVersion = response.headers.get('Version') || response.headers.get('version') || 'Sconosciuta';
      const contentLength = response.headers.get('content-length') || response.headers.get('Content-Length');
      const fileSize = contentLength || blob.size.toString();
      const fileSizeMB = (parseInt(fileSize) / (1024 * 1024)).toFixed(2);

      this.firmwareBlob = blob;
      this.updateInfo = { version: newVersion, size: `${fileSizeMB} MB`, available: true };
      this.selectedFirmware = new File([this.firmwareBlob!], "firmware.bin", { type: "application/octet-stream" });
      this.checkStatus = { message: `✅ Aggiornamento disponibile: versione ${newVersion} (${fileSizeMB} MB). Premi "Upload e Programma" per procedere.`, type: 'success' };
      this.zone.run(() => this.checkProgress = 100);

    } catch (error: any) {
      // Gestione errori: NON impostare updateInfo.available
      let errorMessage = error.message || 'Errore sconosciuto';
      this.checkStatus = { message: `❌ ${errorMessage}`, type: 'error' };
      console.error('Errore check update:', error);
      this.zone.run(() => this.checkProgress = 0);
      
      // Resetta tutto per sicurezza
      this.updateInfo.available = false;
      this.firmwareBlob = null;
      this.selectedFirmware = null;
    } finally {
      this.isChecking = false;
      this.showCheckProgress = false;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      const file = input.files[0];
      if (!file.name.endsWith('.bin')) {
        this.uploadStatus = { message: '❌ Selezionare solo file .bin', type: 'error' };
        input.value = '';
        return;
      }
      this.selectedFirmware = file;
      this.uploadStatus = { message: `📁 File selezionato: ${file.name}. Premi "Upload e Programma" per procedere.`, type: 'info' };
      input.value = '';
    }
  }

  uploadFirmware(): void {
    if (!this.selectedFirmware) {
      this.uploadStatus = { message: '❌ Nessun firmware selezionato. Carica un file o controlla gli aggiornamenti.', type: 'error' };
      return;
    }
    this.showProgressBar = true;
    this.progress = 0;
    this.handleUpload(this.selectedFirmware, 'upload');
    this.selectedFirmware = null;
  }

  private async handleUpload(file: File, statusChannel: 'upload' | 'check'): Promise<void> {
    this.isUpdating = true;
    this.showProgressBar = true;
    this.progress = 0;
    const statusTarget = statusChannel === 'upload' ? 'uploadStatus' : 'checkStatus';

    try {
      // Fase 1: Calcolo MD5 (0-10%)
      this[statusTarget] = { message: '🔐 Calcolo hash MD5...', type: 'info' };
      const hash = await this.calculateMD5(file);
      this.zone.run(() => this.progress = 10);
      this[statusTarget] = { message: `🔐 Hash MD5 calcolato: ${hash}`, type: 'info' };

      // Fase 2: Avvio OTA (10-20%)
      this[statusTarget] = { message: '📡 Avvio processo OTA...', type: 'info' };
      const startUrl = `${this.ESP32_OTA_START_URL}?mode=fr&hash=${hash}`;
      const startResponse = await fetch(startUrl);
      if (!startResponse.ok) {
        const errorText = await startResponse.text();
        throw new Error(`Impossibile avviare il processo OTA. Dettaglio: ${errorText}`);
      }
      this.zone.run(() => this.progress = 20);
      this[statusTarget] = { message: '✅ Processo OTA avviato.', type: 'info' };

      // Fase 3: Upload (20-90%)
      this[statusTarget] = { message: `📤 Caricamento ${file.name}...`, type: 'info' };
      await this.uploadFileWithProgress(file, statusTarget);
      this.zone.run(() => this.progress = 90);
      this[statusTarget] = { message: '📤 Upload completato. Inizio flashing...', type: 'info' };

      // Fase 4: Flashing simulato (90-100%, ~35s)
      this[statusTarget] = { message: '⚡ Flashing in corso... (fino a 35 secondi)', type: 'info' };
      for (let i = 90; i <= 100; i += 2) {
        await new Promise(resolve => setTimeout(resolve, 700));
        this.zone.run(() => this.progress = i);
      }
      this[statusTarget] = { message: '✅ Flashing completato! Riavvio in corso...', type: 'success' };
      setTimeout(() => location.reload(), 3000);

    } catch (error: any) {
      this[statusTarget] = { message: `❌ Errore: ${error.message || 'Errore sconosciuto'}`, type: 'error' };
      console.error('Errore upload:', error);
      this.resetState();
    }
  }

  private calculateMD5(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event: any) => {
        try {
          const arrayBuffer = event.target.result as ArrayBuffer;
          const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
          const hash = CryptoJS.MD5(wordArray).toString(CryptoJS.enc.Hex);
          resolve(hash);
        } catch (error) {
          reject(new Error('Errore nel calcolo dell\'MD5: ' + error));
        }
      };
      reader.onerror = () => reject(new Error('Errore nella lettura del file'));
      reader.readAsArrayBuffer(file);
    });
  }

  private uploadFileWithProgress(file: File, statusTarget: 'uploadStatus' | 'checkStatus'): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file, file.name);

      let lastProgress = 20;
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const newProgress = 20 + Math.round((event.loaded / event.total) * 70);
          if (newProgress > lastProgress) {
            this.zone.run(() => this.progress = newProgress);
            lastProgress = newProgress;
          }
        }
      });

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            resolve();
          } else {
            const errorMessage = xhr.responseText || `Errore del server: ${xhr.status} - ${xhr.statusText}`;
            reject(new Error(errorMessage));
          }
        }
      };
      xhr.onerror = () => reject(new Error('Errore di rete durante l\'upload'));
      xhr.open('POST', this.ESP32_UPLOAD_URL, true);
      xhr.send(formData);
    });
  }

  private getErrorMessage(code: number): string {
    const errorMap: { [key: number]: string } = {
      1: "Token non trovato nella chiamata",
      2: "Token non valido",
      101: "Part number non trovato",
      102: "Aggiornamento firmware non disponibile",
      103: "Firmware non aggiornabile",
      104: "File firmware non esistente sul server",
      105: "Mancata corrispondenza della revisione hardware",
      106: "Serial number non trovato"
    };
    return errorMap[code] || `Errore sconosciuto (codice: ${code})`;
  }

  private resetState(): void {
    this.isUpdating = false;
    this.showProgressBar = false;
    this.progress = 0;
  }
}




