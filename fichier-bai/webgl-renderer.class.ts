/**
 * Gère le rendu sécurisé d'un texte sur un unique élément canvas via WebGL.
 * Inclut des mécanismes de protection contre la copie et le débogage,
 * ainsi que l'intégration d'un filigrane visible.
 */
export class WebGLRenderer {
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private canvas: HTMLCanvasElement | null = null;

  private vertexShader = `
    attribute vec2 position;
    attribute vec2 texCoord;
    varying vec2 vTexCoord;

    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
      vTexCoord = texCoord;
    }
  `;

  private fragmentShader = `
    precision mediump float;
    uniform sampler2D textTexture;
    varying vec2 vTexCoord;

    void main() {
      vec4 color = texture2D(textTexture, vTexCoord);
      gl_FragColor = color;
    }
  `;

  init(canvas: HTMLCanvasElement): boolean {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl', {
      preserveDrawingBuffer: false,
      antialias: false,
      alpha: false,
      premultipliedAlpha: false,
      stencil: false,
      depth: false
    });

    if (!this.gl) {
      console.error('WebGL non supporté');
      return false;
    }

    this.disableDebugExtensions();
    this.setupCanvasSecurity(canvas);
    return this.setupShaders() && this.setupGeometry();
  }

  /**
   * Modifié : n'accepte plus de paramètres pour le filigrane invisible.
   */
  renderText(text: string, preElement: HTMLPreElement, visibleWatermark: string): void {
    if (!this.gl || !this.program) return;

    const texture = this.createTextTexture(text, preElement, visibleWatermark);
    if (!texture) return;

    this.gl.clearColor(1.0, 1.0, 1.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    const textureLocation = this.gl.getUniformLocation(this.program, 'textTexture');
    this.gl.uniform1i(textureLocation, 0);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    this.gl.flush();
    this.gl.finish();
    this.gl.deleteTexture(texture);
    this.invalidateFramebuffer();
  }

  destroy(): void {
    if (this.canvas) {
      this.canvas.removeEventListener('contextmenu', this.preventEvent, true);
      this.canvas.removeEventListener('selectstart', this.preventEvent, true);
      this.canvas.removeEventListener('dragstart', this.preventEvent, true);
    }
    if (this.gl && this.program) {
      this.gl.deleteProgram(this.program);
    }
    this.gl = null;
    this.program = null;
    this.canvas = null;
  }

  private createTextTexture(text: string, preElement: HTMLPreElement, visibleWatermark: string): WebGLTexture | null {
      if (!this.gl) throw new Error('WebGL non initialisé');

      const lines = text.split('\n');
      const computedStyle = window.getComputedStyle(preElement);
      const baseFontSize = parseInt(computedStyle.fontSize) || 12;
      const fontSize = baseFontSize * 1.2;
      const fontFamily = computedStyle.fontFamily || 'monospace';
      const lineHeight = parseFloat(computedStyle.lineHeight) || fontSize * 1.2;
      const padding = parseInt(computedStyle.padding) || 1;
      const pixelRatio = window.devicePixelRatio || 1;
      const tempCanvas = document.createElement('canvas');
      const maxLineLength = Math.max(...lines.map(line => line.length));
      const baseWidth = Math.max(400, maxLineLength * (fontSize * 0.6) + padding * 2);
      const baseHeight = Math.max(200, lines.length * lineHeight + padding);

      tempCanvas.width = baseWidth * pixelRatio;
      tempCanvas.height = baseHeight * pixelRatio;
      const ctx = tempCanvas.getContext('2d', { willReadFrequently: true })!;
      ctx.scale(pixelRatio, pixelRatio);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, baseWidth, baseHeight);
      ctx.fillStyle = '#000000';
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.textBaseline = 'top';
      ctx.imageSmoothingEnabled = false;
      ctx.textAlign = 'left';
      lines.forEach((line, i) => {
        const y = padding + i * lineHeight;
        ctx.fillText(line, padding, y);
      });

      this.drawVisibleWatermark(ctx, baseWidth, baseHeight, visibleWatermark);

      if (this.gl.canvas instanceof HTMLCanvasElement) {
          this.gl.canvas.width = baseWidth;
          this.gl.canvas.height = baseHeight;
          this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
      }

      const texture = this.gl.createTexture();
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, tempCanvas);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);

      return texture;
  }

  private drawVisibleWatermark(ctx: CanvasRenderingContext2D, width: number, height: number, text: string): void {
    ctx.save();
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const centerX = width / 2;
    const centerY = height / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate(-Math.PI / 4);
    const diagonal = Math.sqrt(width * width + height * height);
    const xSpacing = 300;
    const ySpacing = 100;
    for (let x = -diagonal; x < diagonal; x += xSpacing) {
        for (let y = -diagonal; y < diagonal; y += ySpacing) {
            ctx.fillText(text, x, y);
        }
    }
    ctx.restore();
  }

  private preventEvent = (e: Event): boolean => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
  };

  private setupCanvasSecurity(canvas: HTMLCanvasElement): void {
    const style = canvas.style as any;
    canvas.style.userSelect = 'none';
    canvas.draggable = false;
    style.webkitUserSelect = 'none';
    style.mozUserSelect = 'none';
    style.msUserSelect = 'none';
    style.webkitTouchCallout = 'none';
    style.webkitUserDrag = 'none';

    canvas.addEventListener('contextmenu', this.preventEvent, true);
    canvas.addEventListener('selectstart', this.preventEvent, true);
    canvas.addEventListener('dragstart', this.preventEvent, true);
  }

  private disableDebugExtensions(): void {
    if (!this.gl) return;
    const blockedExtensions = ['WEBGL_debug_renderer_info', 'WEBGL_debug_shaders'];
    blockedExtensions.forEach(ext => {
      try { this.gl!.getExtension(ext); } catch (e) { /* Extension bloquée */ }
    });
  }

  private setupShaders(): boolean {
    if (!this.gl) return false;
    const vs = this.compileShader(this.gl.VERTEX_SHADER, this.vertexShader);
    const fs = this.compileShader(this.gl.FRAGMENT_SHADER, this.fragmentShader);
    if (!vs || !fs) return false;

    this.program = this.gl.createProgram();
    if (!this.program) return false;

    this.gl.attachShader(this.program, vs);
    this.gl.attachShader(this.program, fs);
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error('Erreur de programme:', this.gl.getProgramInfoLog(this.program));
      return false;
    }
    this.gl.useProgram(this.program);
    return true;
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;
    const shader = this.gl.createShader(type);
    if (!shader) return null;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Erreur de shader:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  private setupGeometry(): boolean {
    if (!this.gl || !this.program) return false;
    const vertices = new Float32Array([-1.0, -1.0, 0.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 0.0]);
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
    const posLoc = this.gl.getAttribLocation(this.program, 'position');
    const texLoc = this.gl.getAttribLocation(this.program, 'texCoord');
    this.gl.enableVertexAttribArray(posLoc);
    this.gl.enableVertexAttribArray(texLoc);
    const stride = 4 * 4;
    this.gl.vertexAttribPointer(posLoc, 2, this.gl.FLOAT, false, stride, 0);
    this.gl.vertexAttribPointer(texLoc, 2, this.gl.FLOAT, false, stride, 2 * 4);
    return true;
  }

  private invalidateFramebuffer(): void {
    if (!this.gl) return;
    try {
      const fb = this.gl.createFramebuffer();
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fb);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT);
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
      this.gl.deleteFramebuffer(fb);
    } catch (e) { /* Silencieux */ }
  }
}
