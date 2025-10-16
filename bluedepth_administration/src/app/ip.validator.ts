import { AbstractControl, ValidatorFn } from '@angular/forms';

export function ipValidator(): ValidatorFn {
  const pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  
  return (control: AbstractControl): {[key: string]: any} | null => {
    if (!control.value) {
      return null;
    }
    
    const valid = pattern.test(control.value);
    if (!valid) {
      return { invalidIp: true };
    }
    
    const parts = control.value.split('.');
    const validParts = parts.every((part: string) => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
    
    return validParts ? null : { invalidIp: true };
  };
}
