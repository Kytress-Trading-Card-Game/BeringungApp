import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from "./header/header";
import { ToastMessage } from './toast-message/toast-message';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, ToastMessage],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('BeringungView');
}
