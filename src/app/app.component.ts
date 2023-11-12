import { Component } from '@angular/core';
import { testData1 } from './fish/test.data';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'd3-cero-fishbone';
  data = testData1;
}
