import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { BlueDepthBoardEnvironment } from '../../../enviroment';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';


@Component({
  selector: 'app-systemsettings',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './system.component.html',
  styleUrls: ['./system.component.css']
})
export class SystemSettingsComponent implements OnInit, OnDestroy {
  systemTime: Date | null = null;
  localTime: Date = new Date();
  loading = true;
  error: string | null = null;
  isSyncing = false;
  showSuccessPopup = false;
  showRebootPopup = false;
  showRebootConfirm = false;
  syncMessage = '';
  rebootMessage = '';
  
  private apiUrl = BlueDepthBoardEnvironment.apiUrl;
  private timeSubscription?: Subscription;
  private localTimeInterval?: any;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // Fetch system time every second
    this.timeSubscription = interval(1000)
      .pipe(
        switchMap(() => this.http.get<any>(`${this.apiUrl}/api/mcu`))
      )
      .subscribe({
        next: (data) => {
          if (data.RTC) {
            // Convert Unix timestamp to Date
            this.systemTime = new Date(data.RTC * 1000);
            this.loading = false;
            this.error = null;
          }
        },
        error: (err) => {
          this.error = 'Error loading system time';
          console.error('[API] system time error:', err);
          this.loading = false;
        }
      });

    // Update local time every second
    this.localTimeInterval = setInterval(() => {
      this.localTime = new Date();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timeSubscription) {
      this.timeSubscription.unsubscribe();
    }
    if (this.localTimeInterval) {
      clearInterval(this.localTimeInterval);
    }
  }

  synchronizeTime(): void {
    this.isSyncing = true;
    const now = new Date();
    
    const timePayload = {
      hour: now.getHours(),
      minute: now.getMinutes(),
      second: now.getSeconds(),
      day: now.getDate(),
      month: now.getMonth() + 1, // JavaScript months are 0-indexed
      year: now.getFullYear()
    };

    console.log('[Sync] Sending time:', timePayload);

    this.http.post<any>(`${this.apiUrl}/api/settings/time`, timePayload).subscribe({
      next: (response) => {
        console.log('[Sync] success:', response);
        this.syncMessage = response.message || 'Time synchronized successfully!';
        this.showSuccessPopup = true;
        this.isSyncing = false;
        
        // Auto-hide popup after 3 seconds
        setTimeout(() => {
          this.showSuccessPopup = false;
        }, 3000);
      },
      error: (err) => {
        console.error('[Sync] error:', err);
        this.syncMessage = 'Failed to synchronize time. Please try again.';
        this.showSuccessPopup = true;
        this.isSyncing = false;
        
        setTimeout(() => {
          this.showSuccessPopup = false;
        }, 3000);
      }
    });
  }

  confirmReboot(): void {
    this.showRebootConfirm = true;
  }

  cancelReboot(): void {
    this.showRebootConfirm = false;
  }

  rebootSystem(): void {
    this.showRebootConfirm = false;
    
    console.log('[Reboot] Initiating system reboot to:', `${this.apiUrl}/reboot`);
    
    // Use text response type since the device returns plain text
    this.http.get(`${this.apiUrl}/reboot`, { 
      responseType: 'text',
      observe: 'response' // To get full response including headers
    }).subscribe({
      next: (response) => {
        console.log('[Reboot] Full response:', response);
        console.log('[Reboot] Status:', response.status);
        console.log('[Reboot] Body:', response.body);
        
        // Display the actual message from the system
        this.rebootMessage = response.body || 'RESET ESP in 2 Seconds...';
        this.showRebootPopup = true;
        
        // Keep popup visible for 5 seconds
        setTimeout(() => {
          this.showRebootPopup = false;
        }, 5000);
      },
      error: (err) => {
        console.error('[Reboot] Full error:', err);
        console.error('[Reboot] Error status:', err.status);
        console.error('[Reboot] Error message:', err.message);
        
        // Check if we got a 200 response but HttpClient treated it as error
        if (err.status === 200 || err.status === 0) {
          // Device might have rebooted immediately, connection lost
          this.rebootMessage = 'RESET ESP in 2 Seconds...';
          this.showRebootPopup = true;
          
          setTimeout(() => {
            this.showRebootPopup = false;
          }, 5000);
        } else {
          this.rebootMessage = 'Failed to reboot the device. Please try again.';
          this.showRebootPopup = true;
          
          setTimeout(() => {
            this.showRebootPopup = false;
          }, 3000);
        }
      }
    });
  }

  closePopup(): void {
    this.showSuccessPopup = false;
    this.showRebootPopup = false;
  }

  formatTime(date: Date | null): string {
    if (!date) return '--:--:--';
    return date.toLocaleTimeString('en-GB');
  }

  formatDate(date: Date | null): string {
    if (!date) return '---';
    return date.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }
}
