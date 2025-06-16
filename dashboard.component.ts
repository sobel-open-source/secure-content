import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatListModule } from '@angular/material/list';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { PageHeaderComponent } from '@shared';
import { StatistiqueService } from './statistique.service';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { finalize } from 'rxjs';
import { Statistique } from './model.statistique';
import { FichierBaiComponent } from './fichier-bai/fichier-bai.component';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PageHeaderComponent,
        MatButtonModule,
        MatCardModule,
        MatChipsModule,
        MatListModule,
        MatGridListModule,
        MatTableModule,
        MatTabsModule,
        NgxSpinnerModule,
        MatIconModule
    ]
})
export class DashboardComponent implements OnInit{

  protected readonly statistiqueService = inject(StatistiqueService);
  protected readonly spinnerService = inject(NgxSpinnerService);
  protected readonly changeDetectorRef = inject(ChangeDetectorRef);

    protected readonly dialog = inject(MatDialog);




      visualisationFichierBai() {
        const dialogRef = this.dialog.open(FichierBaiComponent, {
          data: {},
          autoFocus: 'dialog',
          width: '40vw',
          height: '80vh',
          position: {
            top: '2vh',
          },
          disableClose: true,
        });

        dialogRef.afterClosed().subscribe(result => {
          console.log(`Dialog result: ${result}`);
        });
      }


}
