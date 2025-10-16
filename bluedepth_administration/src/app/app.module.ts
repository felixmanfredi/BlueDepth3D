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
import { SonyComponent } from "./pages/dashboard/sony/sony.component";
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
    SonyComponent
    
],providers:[],
        bootstrap:[AppComponent]
    }
)
export class AppModule {
    
}