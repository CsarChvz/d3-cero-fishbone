import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { PieComponent } from './pie/pie.component';
import { FishComponent } from './fish/fish.component';
import { TreeComponent } from './tree/tree.component';

@NgModule({
  declarations: [AppComponent, PieComponent, FishComponent, TreeComponent],
  imports: [BrowserModule, AppRoutingModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
