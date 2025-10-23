import { RouterModule, Routes } from "@angular/router";
import { AppComponent } from "./app.component";
import { NgModule } from "@angular/core";
import { DashboardComponent } from "./pages/dashboard/dashboard.component";
import { AuthService } from "./auth.service";
import { CameraControlComponent } from "./pages/cameracontrol/cameracontrol.component";
import { SettingsComponent } from "./pages/settings/settings.component";
import { StorageComponent } from "./pages/storage/storage.component";
import { PluginsComponent } from "./pages/plugins/plugins.component";

const routes: Routes = [
  { path: '', component: DashboardComponent, title: 'Dashboard',data:{icon:'fa fa-gauge'},canActivate:[AuthService]},
  { path: 'dashboard', component: DashboardComponent, title: 'Dashboard',data:{icon:'fa fa-gauge'},canActivate:[AuthService]},
  { path: 'camerasetting', component: CameraControlComponent, title: 'Camera',data:{icon:'fa fa-camera'},canActivate:[AuthService]},
  { path: 'storage', component: StorageComponent, title: 'Camera',data:{icon:'fa fa-database'},canActivate:[AuthService]},
  { path: 'plugins', component: PluginsComponent, title: 'Plugin',data:{icon:'fa fa-plug'},canActivate:[AuthService]},
  
  { path: 'settings', component: SettingsComponent, title: 'Camera',data:{icon:'fa fa-cog'},canActivate:[AuthService]},

];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})

export class AppRoutingModule{}; 