import { Injectable } from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot, CanActivate, GuardResult, MaybeAsync, Route, Router, RouterStateSnapshot } from '@angular/router';
import { AppComponent } from './app.component';

@Injectable({
  providedIn: 'root'
})
export class AuthService implements CanActivate {

  constructor(private router: Router,        private activeRoute: ActivatedRoute) {}
  
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): MaybeAsync<GuardResult> {
    
   
    
    
    return this.checkAuth(route.data);
  }

  

  private checkAuth(data:any): boolean {

    if (AppComponent.app.isLogin) {
      if(data){
        if("permissions" in data){
          
          if(data['permissions'].indexOf(AppComponent.app.user.role)>-1){
            
          }else{
            return false;
          }
        }
      }
    }

    return true;
      
      
    
  }
}