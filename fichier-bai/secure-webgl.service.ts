import { Injectable } from '@angular/core';
import { WebGLRenderer } from './webgl-renderer.class';

@Injectable({
  providedIn: 'root'
})
export class SecureWebGLService {

  constructor() { }

  /**
   * Crée et retourne une nouvelle instance de WebGLRenderer.
   * Chaque instance est indépendante et gère son propre canvas.
   */
  createRenderer(): WebGLRenderer {
    return new WebGLRenderer();
  }
}
