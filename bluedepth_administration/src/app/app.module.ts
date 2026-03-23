import { NgModule } from "@angular/core";
import { AppComponent } from "./app.component";
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { SidebarComponent } from "./component/sidebar/sidebar.component";
import { RouterModule, RouterOutlet } from "@angular/router";
import { MdbModalModule } from "mdb-angular-ui-kit/modal";
import { MdbDropdownModule } from 'mdb-angular-ui-kit/dropdown';
import { AppRoutingModule } from "./app-routing.module";
import { DashboardComponent } from "./pages/dashboard/dashboard.component";
import { CameraControlComponent } from "./pages/cameracontrol/cameracontrol.component";
import { HttpClientModule, provideHttpClient } from "@angular/common/http";
import { SettingsComponent } from "./pages/settings/settings.component";
import { StorageComponent } from "./pages/storage/storage.component";
import { PluginsComponent } from "./pages/plugins/plugins.component";
import { CameraComponent } from "./pages/camera/camera.component";
import { NetworkComponent } from "./pages/settings/network/network.component";
import { MaintenanceComponent } from "./pages/settings/maintenance/maintenance.component";
import { SystemSettingsComponent } from "./pages/settings/system/system.component";
//import { LogErrorsComponent } from "./pages/settings/logerrors/logerrors.component";
import { SystemComponent } from "./pages/dashboard/system/system.component";
import { LogErrorsComponent } from './component/logerrors/logerrors.component';
import { VideoStreamingComponent } from "./pages/camera/video-streaming/video-streaming.component";
import { DockComponent } from "./pages/dock/dock.component";
import { FileSizePipe } from "./filesize.pipe";
import { DatasetDetailComponent } from "./pages/storage/detail/detail.component";
import { CdkAriaLive } from "../../node_modules/@angular/cdk/a11y/index";
import { LongPressDirective } from "./long-press.directive";
import { ShortPressDirective } from "./short-press.directive";
import { BluedepthSettingsComponent } from "./pages/plugins/bluedepth/bluedepth.component";
import { SonySettingsComponent } from "./pages/plugins/sony/sony.component";
@NgModule(
    {
        declarations:[
            AppComponent,
            SidebarComponent,
            DashboardComponent,
            CameraControlComponent,
            StorageComponent,
            SettingsComponent,
            PluginsComponent,
            CameraComponent,
            VideoStreamingComponent,
            DockComponent,
            FileSizePipe,
            SystemComponent,
            DatasetDetailComponent,
            LongPressDirective,
            ShortPressDirective,
            BluedepthSettingsComponent,
            SonySettingsComponent
        ],
        imports: [
    AppRoutingModule,
    BrowserModule,
    BrowserAnimationsModule,
    CommonModule,
    FormsModule,
    RouterOutlet,
    MdbModalModule,
    MdbDropdownModule,
    HttpClientModule,
    NetworkComponent,
    MaintenanceComponent,
    SystemSettingsComponent,
    LogErrorsComponent,
    
],providers:[],
        bootstrap:[AppComponent]
    }
)
export class AppModule {
    
}