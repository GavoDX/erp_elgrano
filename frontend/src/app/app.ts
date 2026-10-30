import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Menudenavegacion } from './components/menudenavegacion/menudenavegacion';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Menudenavegacion],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
