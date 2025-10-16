import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { BlueDepthBoardEnvironment } from '../../../enviroment';
import { Subscription } from 'rxjs';
import { ipValidator } from '../../../ip.validator';

@Component({
  selector: 'app-network',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule, ReactiveFormsModule],
  templateUrl: './network.component.html',
  styleUrls: ['./network.component.css']
})
export class NetworkComponent implements OnInit, OnDestroy, AfterViewInit {
  networkForm!: FormGroup;
  isSaving = false;
  loading = true;
  error: string | null = null;
  connectionTypeMap = ['Cable ETH'];//, 'WiFi AP', 'WiFi Client'];
  
  private apiUrl = BlueDepthBoardEnvironment.apiUrl;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder
  ) {
    this.networkForm = this.fb.group({
      system_config: this.fb.group({
        conn_type: 0,  //forzo la scelta sulla connessione ethernet //[0, Validators.required],   
        ip: ['', [Validators.required, ipValidator()]],
        gateway: ['', [Validators.required, ipValidator()]],
        subnet: ['', [Validators.required, ipValidator()]],
        dns1: ['', [Validators.required, ipValidator()]],
        dns2: ['', [Validators.required, ipValidator()]],
        dhcp_client: [true],
        ntp_ip: ['', [Validators.required, ipValidator()]],
        ntp_port: [123, [Validators.required, Validators.min(1), Validators.max(65535)]],
        ntp_offset: [0, [Validators.required, Validators.min(-12000000000), Validators.max(14000000000)]]
      })
    });
  }

  private logInvalidControls(context: string) {
    const invalidControls: string[] = [];
    const errorsMap: Record<string, any> = {};
    const walk = (control: AbstractControl, path: string[] = []) => {
      const asGroup = control as FormGroup;
      if (asGroup && asGroup.controls) {
        Object.keys(asGroup.controls).forEach(key => {
          const child = asGroup.controls[key];
          const currentPath = [...path, key];
          const childAsGroup = child as FormGroup;
          if (childAsGroup && (childAsGroup as any).controls) {
            walk(childAsGroup, currentPath);
          } else {
            if (child.enabled && child.invalid) {
              const name = currentPath.join('.');
              invalidControls.push(name);
              errorsMap[name] = child.errors;
            }
          }
        });
      }
    };
    walk(this.networkForm as FormGroup);
    console.group(`[Form Debug] ${context}`);
    console.log('Form status:', this.networkForm.status, 'valid:', this.networkForm.valid);
    console.log('Invalid controls:', invalidControls);
    console.log('Errors map:', errorsMap);
    console.groupEnd();
  }

  private applyVisibilityRules() {
    const sys = this.networkForm.get('system_config') as FormGroup;
    const toggleCtrl = (name: string, hide: boolean) => {
      const c = sys.get(name);
      if (!c) return;
      if (hide) {
        if (c.enabled) {
          c.disable({ emitEvent: false });
          console.log('[Visibility] disabled', `system_config.${name}`);
        }
      } else {
        if (c.disabled) {
          c.enable({ emitEvent: false });
          console.log('[Visibility] enabled', `system_config.${name}`);
        }
      }
    };

    const ct = sys.get('conn_type')?.value as number;
    const dhcp = sys.get('dhcp_client')?.value as boolean;
    const hideIpNet = dhcp || [1, 2].includes(ct);
    // const hideWifiClient = [0, 1].includes(ct);
    // const hideAp = [0, 2].includes(ct);

    console.group('[VisibilityRules]');
    console.log('conn_type:', ct, 'dhcp_client:', dhcp);
    //console.log('hideIpNet:', hideIpNet, 'hideWifiClient:', hideWifiClient, 'hideAp:', hideAp);
    console.groupEnd();

    toggleCtrl('gateway', hideIpNet);
    toggleCtrl('subnet', hideIpNet);
    toggleCtrl('dns1', hideIpNet);
    toggleCtrl('dns2', hideIpNet);
    toggleCtrl('ip', hideIpNet);

    this.logInvalidControls('after applyVisibilityRules');
  }

  ngOnInit(): void {
    this.networkForm.statusChanges.subscribe(status => {
      console.log('[Form statusChanges] =>', status);
      this.logInvalidControls('statusChanges');
    });

    const sys = this.networkForm.get('system_config') as FormGroup;
    this.applyVisibilityRules();
    sys.get('conn_type')?.valueChanges.subscribe(() => this.applyVisibilityRules());
    sys.get('dhcp_client')?.valueChanges.subscribe(() => this.applyVisibilityRules());
    sys.get('ip')?.valueChanges.subscribe(() => this.applyVisibilityRules());

    console.log('[Init] form created. Initial value:', this.networkForm.value);
    this.logInvalidControls('after init');
  }

  ngAfterViewInit(): void {
    this.loadSettings();
  }

  ngOnDestroy(): void {}

  reloadSettings(): void {
    this.loadSettings();
  }

  loadDefaultSettings(): void {
    this.loading = true;
    console.log('[API] GET default settings');
    this.http.get(`${this.apiUrl}/api/settings/get/default`).subscribe({
      next: (data) => {
        console.log('[API] default settings payload:', data);
        this.networkForm.patchValue(data as any);
        this.applyVisibilityRules();
        this.loading = false;
        this.logInvalidControls('after loadDefaultSettings');
      },
      error: (err) => {
        this.error = 'Error loading DEFAULT settings';
        console.error('[API] default settings error:', err);
        this.loading = false;
      }
    });
  }

  loadSettings(): void {
    this.loading = true;
    console.log('[API] GET settings');
    this.http.get(`${this.apiUrl}/api/settings`).subscribe({
      next: (data) => {
        console.log('[API] settings payload:', data);
        this.networkForm.patchValue(data as any);
        this.applyVisibilityRules();
        this.loading = false;
        this.logInvalidControls('after loadSettings');
      },
      error: (err) => {
        this.error = 'Error loading settings';
        console.error('[API] settings error:', err);
        this.loading = false;
      }
    });
  }

  saveSettings(): void {
    if (this.networkForm.invalid) {
      const markAll = (ctrl: AbstractControl) => {
        (ctrl as any).markAllAsTouched?.();
        const g = ctrl as FormGroup;
        if (g && g.controls) {
          Object.values(g.controls).forEach(c => {
            (c as any).markAsTouched?.();
          });
        }
      };
      markAll(this.networkForm);
      console.error('[Save] form INVALID -> abort');
      this.logInvalidControls('on save attempt');
      return;
    }

    const payload = this.networkForm.value;
    console.log('[Save] form VALID. Payload:', payload);
    this.isSaving = true;
    this.http.post(`${this.apiUrl}/api/settings/network/save`, payload).subscribe({
      next: () => {
        console.log('[Save] success');
        this.isSaving = false;
      },
      error: (err) => {
        console.error('[Save] error:', err);
        this.isSaving = false;
      }
    });
  }
}
