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
import { BaiFichierService, PaginatedResponse } from './bai.service';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Subscription } from 'rxjs';
import { SecureWebGLService } from './secure-webgl.service';
import { WebGLRenderer } from './webgl-renderer.class';

import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';


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
        MatGridListModule,
        MatProgressSpinnerModule
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






    texte = '';

       ngOnInit() {


 // Le piège est activé dès l'initialisation du composant, AVANT l'arrivée des données.
    this.chargerPageBai(0);
    this.startDebugDetector();

        }


async chargerPageBai(pageNumber: number): Promise<void> {
   this.spinnerService.show();
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
        const paginatedResponse = await firstValueFrom(
            this.http.post<PaginatedResponse>(
                'http://localhost:5050/api/fichier-bai/chiffrer',
                {
                    aesKeyEncrypted: this.arrayBufferToBase64(encryptedKey),
                    iv: this.arrayBufferToBase64(iv),
                    algorithm: 'AES-GCM-RSA-OAEP',
                    page: pageNumber,
                    size: 1500,
                },
                    { responseType: 'json' } // On attend du texte brut
            )
        );

    // 7. Traiter la réponse chiffrée
        const fullData = this.base64ToArrayBuffer(paginatedResponse.content);

        this.totalPages = paginatedResponse.totalPages;
        this.setPage(paginatedResponse.pageNumber);


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
 this.spinnerService.hide();
    } catch (error) {
        console.error('Erreur:', error);
         this.spinnerService.hide();
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



 // --- Injections et références de la vue ---
  private webglService = inject(SecureWebGLService);
  private ngZone = inject(NgZone);

  @ViewChildren('canvas') private canvasRefs!: QueryList<ElementRef<HTMLCanvasElement>>;
  @ViewChild('preElement', { static: true }) private preRef!: ElementRef<HTMLPreElement>;

  // --- Propriétés publiques et privées ---
  public canvasItems: any[] = [];
  private renderers: WebGLRenderer[] = [];
  private debugDetectorInterval: any = null;

  // --- Hooks du cycle de vie d'Angular ---

  ngOnDestroy(): void {
    // Appelle la méthode de nettoyage centralisée lors de la destruction du composant.
    this.destroyDataForSecurity('Composant détruit');
  }

  // --- Écouteurs d'événements du navigateur ---

  @HostListener('window:blur')
  onWindowBlur(): void {
    //this.destroyDataForSecurity('Perte de focus');
  }

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
  /*  this.ngZone.runOutsideAngular(() => {
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
    }); */
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

// Propriétés du composant simplifiées
public totalPages = 0;
public currentPage: number | null = null;
private lastScrollTop = 0;
private isResettingScroll = false;

// @ViewChild('preRef') private preRef: ElementRef;

/**
 * Met à jour l'état de la pagination de manière fiable.
 */
private setPage(page: number): void {
  if (this.currentPage === page) {
    return;
  }
  this.currentPage = page;
  const previousPage = (page > 0) ? page - 1 : null;
  const nextPage = (page < this.totalPages - 1) ? page + 1 : null;
  console.log(`État mis à jour -> Précédente: ${previousPage}, Courante: ${this.currentPage}, Suivante: ${nextPage}`);
}

/**
 * Vérifie s'il y a une page précédente disponible.
 */
private hasPreviousPage(): boolean {
  return this.currentPage !== null && this.currentPage > 0;
}

/**
 * Vérifie s'il y a une page suivante disponible.
 */
private hasNextPage(): boolean {
  return this.currentPage !== null && this.currentPage < this.totalPages - 1;
}

/**
 * Gère les événements de défilement pour les deux directions.
 */


// Durée en ms pendant laquelle l'utilisateur doit "forcer" le scroll
private readonly WHEEL_HOLD_DURATION = 500;
// Délai après lequel on considère que le scroll s'est arrêté
private readonly WHEEL_STOP_DELAY = 250;

// Minuteurs de chargement
private wheelUpTimer: any = null;
private wheelDownTimer: any = null;

// Minuteur pour détecter l'arrêt de la molette
private wheelStopDetectorTimer: any = null;

// Flag de traitement
private isWheelProcessing = false;

public async onWheel(event: WheelEvent): Promise<void> {
    if (this.isWheelProcessing || this.isResettingScroll) {
        return;
    }

    const element = event.currentTarget as HTMLElement;

    // --- On réinitialise le détecteur d'arrêt à chaque coup de molette ---
    // C'est la partie la plus importante.
    clearTimeout(this.wheelStopDetectorTimer);
    this.wheelStopDetectorTimer = setTimeout(() => {
        // Si ce minuteur se déclenche, c'est que la molette s'est arrêtée.
        // On annule alors les minuteurs de chargement en cours.
        console.log('Molette arrêtée. Annulation des minuteurs de chargement.');
        clearTimeout(this.wheelUpTimer);
        this.wheelUpTimer = null;
        clearTimeout(this.wheelDownTimer);
        this.wheelDownTimer = null;
    }, this.WHEEL_STOP_DELAY);


    // --- LOGIQUE POUR LE SCROLL VERS LE HAUT ---
    const isAtTop = element.scrollTop === 0;
    const isScrollingUp = event.deltaY < 0;

    if (isAtTop && isScrollingUp && this.hasPreviousPage()) {
        event.preventDefault();
        // On ne démarre le minuteur de chargement que s'il n'est pas déjà lancé
        if (!this.wheelUpTimer) {
            console.log('Démarrage du minuteur de chargement HAUT...');
            this.wheelUpTimer = setTimeout(async () => {
                this.isWheelProcessing = true;
                try {
                    await this.chargerPagePrecedente();
                } finally {
                    this.isWheelProcessing = false;
                    this.wheelUpTimer = null;
                }
            }, this.WHEEL_HOLD_DURATION);
        }
    }

    // --- LOGIQUE POUR LE SCROLL VERS LE BAS ---
    const isAtBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 1;
    const isScrollingDown = event.deltaY > 0;

    if (isAtBottom && isScrollingDown && this.hasNextPage()) {
        event.preventDefault();
        // On ne démarre le minuteur de chargement que s'il n'est pas déjà lancé
        if (!this.wheelDownTimer) {
            console.log('Démarrage du minuteur de chargement BAS...');
            this.wheelDownTimer = setTimeout(async () => {
                this.isWheelProcessing = true;
                try {
                    await this.chargerPageSuivante();
                } finally {
                    this.isWheelProcessing = false;
                    this.wheelDownTimer = null;
                }
            }, this.WHEEL_HOLD_DURATION);
        }
    }
}

public onScroll(event: Event): void {
    if (this.isResettingScroll) {
        return;
    }

    // Si l'utilisateur scrolle normalement, c'est un "reset" de toutes les intentions.
    // On annule TOUS les minuteurs en attente.
    clearTimeout(this.wheelUpTimer);
    this.wheelUpTimer = null;

    clearTimeout(this.wheelDownTimer);
    this.wheelDownTimer = null;

    clearTimeout(this.wheelStopDetectorTimer);
    this.wheelStopDetectorTimer = null;

    // Le reste de la méthode peut rester si vous en avez besoin pour autre chose.
    const element = event.target as HTMLElement;
    this.lastScrollTop = element.scrollTop <= 0 ? 0 : element.scrollTop;
}

/**
 * Charge la page suivante et met à jour l'état.
 * Le scroll revient automatiquement en haut.
 */
private async chargerPageSuivante(): Promise<void> {
  if (!this.hasNextPage()) return;

  const nextPage = this.currentPage! + 1;
  await this.chargerPageBai(nextPage);
  this.setPage(nextPage);
  this.scrollToTop();
}

/**
 * Charge la page précédente et remet le scroll en haut.
 */
private async chargerPagePrecedente(): Promise<void> {
  if (!this.hasPreviousPage()) return;

  const previousPage = this.currentPage! - 1;
  await this.chargerPageBai(previousPage);
  this.setPage(previousPage);
  this.scrollToTop();
}

/**
 * Scrolle vers le haut sans déclencher d'effets de bord.
 */
public scrollToTop(): void {
  try {
    this.isResettingScroll = true;
    this.lastScrollTop = 20;
    this.preRef.nativeElement.scrollTop = 20;

    // Réactive la détection après un court délai
    setTimeout(() => {
      this.isResettingScroll = false;
    }, 2000);
  } catch (err) {
    console.error('L\'élément de scroll n\'a pas pu être trouvé.', err);
    this.isResettingScroll = false;
  }
}





}
