import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener, inject, NgZone, OnDestroy, OnInit, QueryList, Renderer2, ViewChild, ViewChildren } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTabsModule } from '@angular/material/tabs';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { BaiFichierService } from './bai.service';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Subscription } from 'rxjs';
import { SecureWebGLService } from './secure-webgl.service';
import { WebGLRenderer } from './webgl-renderer.class';



@Component({
  selector: 'app-fichier-bai',
     // changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
         CommonModule,
        MatDialogModule,
        MatButtonModule,
        NgxSpinnerModule,
        MatTabsModule,
        MatIconModule,
        MatCardModule,
        MatListModule,
        MatChipsModule,
        MatGridListModule
  ],
  templateUrl: './fichier-bai.component.html',
  styleUrl: './fichier-bai.component.scss'
})
export class FichierBaiComponent implements OnInit, OnDestroy  {

    private http = inject(HttpClient);

    readonly data = inject(MAT_DIALOG_DATA);
    readonly dialogRef = inject(MatDialogRef<FichierBaiComponent>);
    readonly baiFichierService = inject(BaiFichierService);
      protected readonly changeDetectorRef = inject(ChangeDetectorRef);
        protected readonly spinnerService = inject(NgxSpinnerService);

 // --- Injections et références de la vue ---
  private webglService = inject(SecureWebGLService);
  private ngZone = inject(NgZone);

  @ViewChildren('canvas') private canvasRefs!: QueryList<ElementRef<HTMLCanvasElement>>;
  @ViewChild('preElement', { static: true }) private preRef!: ElementRef<HTMLPreElement>;

  // --- Propriétés publiques et privées ---
  public canvasItems: any[] = [];
  private renderers: WebGLRenderer[] = [];
  private debugDetectorInterval: any = null;




    texte = '';

       ngOnInit() {
    this.startDebugDetector();
        this.spinnerService.show();
           this.traiterFichierBAI();

        }


  ngOnDestroy(): void {
    // Appelle la méthode de nettoyage centralisée lors de la destruction du composant.
    this.destroyDataForSecurity('Composant détruit');
  }

  // --- Écouteurs d'événements du navigateur ---

  @HostListener('window:blur')
  onWindowBlur(): void {
    this.destroyDataForSecurity('Perte de focus');
  }

async traiterFichierBAI(): Promise<void> {
    try {
        // 1. Génération clé AES-GCM + IV
        const aesKey = await window.crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );
        const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12 bytes pour GCM

        // 2. Export clé AES
        const rawKey = await window.crypto.subtle.exportKey('raw', aesKey);

        // 3. Import clé RSA
        const publicKey = await this.importRSAPublicKey(
            await firstValueFrom(
                this.http.get('http://localhost:5050/api/fichier-bai/public-key',
                { responseType: 'text' })
            )
        );

        // 4. Chiffrement RSA de la clé AES
        const encryptedKey = await window.crypto.subtle.encrypt(
            { name: 'RSA-OAEP' },
            publicKey,
            rawKey
        );

        // 5. Envoi au backend
        const encryptedResponse = await firstValueFrom(
            this.http.post(
                'http://localhost:5050/api/fichier-bai/chiffrer',
                {
                    aesKeyEncrypted: this.arrayBufferToBase64(encryptedKey),
                    iv: this.arrayBufferToBase64(iv),
                    algorithm: 'AES-GCM-RSA-OAEP'
                },
                    { responseType: 'text' } // On attend du texte brut
            )
        );

    // 7. Traiter la réponse chiffrée
        const fullData = this.base64ToArrayBuffer(encryptedResponse);


        // L'IV est les premiers 12 octets (GCM)
        const responseIv = fullData.slice(0, 12);


        // Le reste est le texte chiffré + tag (16 bytes)
        const ciphertextWithTag = fullData.slice(12);


        // 8. Déchiffrer avec GCM
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: responseIv,
                  tagLength: 128
            },
            aesKey,
            ciphertextWithTag
        );

        // 9. Convertir en texte
      //  this.texte = new TextDecoder().decode(decryptedBuffer);
       // console.log('Contenu déchiffré:', this.texte);
        const fullname =  'Jack Tremblley';
        const code =  'DK2563';
     this.displayDecryptedContent(new TextDecoder().decode(decryptedBuffer), fullname, code);

    } catch (error) {
        console.error('Erreur:', error);
        throw error;
    }
}


private async getPublicKey(): Promise<CryptoKey> {
    const pem = await firstValueFrom(
        this.http.get('http://localhost:5050/api/fichier-bai/public-key', { responseType: 'text' })
    );
    return this.importRSAPublicKey(pem);
}

private async importRSAPublicKey(pem: string): Promise<CryptoKey> {
    const pemContents = pem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g, '');
    const binaryDer = this.base64ToArrayBuffer(pemContents);

    return window.crypto.subtle.importKey(
        'spki',
        binaryDer,
        { name: 'RSA-OAEP', hash: { name: 'SHA-256' } },
        true,
        ['encrypt']
    );
}

private arrayBufferToBase64(buffer: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}



  // --- Hooks du cycle de vie d'Angular ---


  // --- Méthodes publiques ---

  public displayDecryptedContent(dataTexte: string, fullname: string, codeUnique: string): void {
    const allLines = dataTexte.split('\n');
    const textChunks: string[] = [];
    const chunkSize = 500;

    if (allLines.length > 0 && dataTexte.length > 0) {
        for (let i = 0; i < allLines.length; i += chunkSize) {
            textChunks.push(allLines.slice(i, i + chunkSize).join('\n'));
        }
    }

    this.canvasItems = Array.from({ length: textChunks.length }, (_, i) => i);
    const visibleWatermark = `Confidentiel - ${codeUnique} - ${fullname}`;

    // Le setTimeout garantit que le DOM a été mis à jour par Angular.
    setTimeout(() => {
        this.destroyAllRenderers(); // Nettoie les anciens renderers avant d'en créer de nouveaux.
        const canvases = this.canvasRefs.toArray();
        canvases.forEach((canvasRef, index) => {
            const renderer = this.webglService.createRenderer();
            if (renderer.init(canvasRef.nativeElement)) {
                this.renderers.push(renderer);
                const textChunk = textChunks[index];
                if (textChunk) {
                    renderer.renderText(textChunk, this.preRef.nativeElement, visibleWatermark);
                }

            } else {
                console.error(`Impossible d'initialiser WebGL pour le canevas ${index}`);
            }
        });
         this.spinnerService.hide();
    }, 0);
  }

  // --- Méthodes privées de sécurité et de nettoyage ---

  private startDebugDetector(): void {
    this.ngZone.runOutsideAngular(() => {
      const dimensionThreshold = 160;
      const timingThreshold = 500;

      this.debugDetectorInterval = setInterval(() => {
        const startTime = performance.now();
        debugger;
        const endTime = performance.now();

        const devtoolsOpenByDimension = (window.outerWidth - window.innerWidth > dimensionThreshold) ||
                                        (window.outerHeight - window.innerHeight > dimensionThreshold);
        const devtoolsOpenByTiming = (endTime - startTime) > timingThreshold;

        if (devtoolsOpenByDimension || devtoolsOpenByTiming) {
          this.ngZone.run(() => {
            this.destroyDataForSecurity('Outils de développement détectés');
          });
        }
      }, 1000);
    });
  }

  /**
   * Méthode de nettoyage centralisée.
   * @param reason La raison du nettoyage, pour les logs.
   */
  private destroyDataForSecurity(reason: string): void {
    // N'exécute le nettoyage que s'il y a quelque chose à nettoyer.
    if (this.renderers.length === 0 && !this.debugDetectorInterval) {
      return;
    }

    console.warn(`Contenu effacé par mesure de sécurité (${reason}).`);

    this.destroyAllRenderers();
    this.canvasItems = [];

    if (this.debugDetectorInterval) {
        clearInterval(this.debugDetectorInterval);
        this.debugDetectorInterval = null; // Bonne pratique de réinitialiser la variable.
    }
  }

  private destroyAllRenderers(): void {
      this.renderers.forEach(renderer => renderer.destroy());
      this.renderers = [];
  }

}
