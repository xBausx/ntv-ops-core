import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [NgClass],
  template: `
    <div 
      [ngClass]="classes"
      class="skeleton-shimmer rounded-lg"
      [style.width]="width"
      [style.height]="height"
    ></div>
  `,
})
export class SkeletonComponent {
  @Input() width: string = '100%';
  @Input() height: string = '1rem';
  @Input() variant: 'text' | 'rectangle' | 'circle' | 'button' = 'text';
  @Input() className: string = '';

  get classes(): string[] {
    const baseClasses = ['skeleton-shimmer'];
    
    switch (this.variant) {
      case 'text':
        baseClasses.push('rounded-md');
        break;
      case 'rectangle':
        baseClasses.push('rounded-xl');
        break;
      case 'circle':
        baseClasses.push('rounded-full');
        break;
      case 'button':
        baseClasses.push('rounded-xl', 'h-10');
        break;
    }
    
    if (this.className) {
      baseClasses.push(this.className);
    }
    
    return baseClasses;
  }
}

@Component({
  selector: 'app-skeleton-card',
  standalone: true,
  imports: [SkeletonComponent],
  template: `
    <div class="card-modern p-6 space-y-4">
      <div class="space-y-3">
        <app-skeleton 
          variant="text" 
          height="1.5rem" 
          width="60%">
        </app-skeleton>
        <app-skeleton 
          variant="text" 
          height="1rem" 
          width="90%">
        </app-skeleton>
        <app-skeleton 
          variant="text" 
          height="1rem" 
          width="75%">
        </app-skeleton>
      </div>
      <div class="flex gap-2 pt-2">
        <app-skeleton 
          variant="button" 
          width="6rem">
        </app-skeleton>
        <app-skeleton 
          variant="button" 
          width="5rem">
        </app-skeleton>
      </div>
    </div>
  `,
})
export class SkeletonCardComponent {}

@Component({
  selector: 'app-skeleton-table',
  standalone: true,
  imports: [SkeletonComponent],
  template: `
    <div class="space-y-3">
      <!-- Header -->
      <div class="grid grid-cols-6 gap-4 p-4 border-b border-white/10">
        @for (col of headerCols; track $index) {
          <app-skeleton 
            variant="text" 
            height="0.875rem" 
            [width]="col.width">
          </app-skeleton>
        }
      </div>
      
      <!-- Rows -->
      @for (row of rowItems; track $index) {
        <div class="grid grid-cols-6 gap-4 p-4 border-b border-white/5">
          @for (col of dataCols; track $index) {
            <app-skeleton 
              variant="text" 
              height="1rem" 
              [width]="col.width">
            </app-skeleton>
          }
        </div>
      }
    </div>
  `,
})
export class SkeletonTableComponent {
  @Input() rows: number = 5;

  get rowItems(): any[] {
    return new Array(this.rows);
  }
  
  headerCols = [
    { width: '80%' },
    { width: '60%' },
    { width: '100%' },
    { width: '70%' },
    { width: '90%' },
    { width: '60%' }
  ];
  
  dataCols = [
    { width: '70%' },
    { width: '40%' },
    { width: '85%' },
    { width: '60%' },
    { width: '75%' },
    { width: '50%' }
  ];
}

@Component({
  selector: 'app-skeleton-form',
  standalone: true,
  imports: [SkeletonComponent],
  template: `
    <div class="space-y-6">
      @for (field of fieldItems; track $index) {
        <div class="space-y-2">
          <app-skeleton 
            variant="text" 
            height="0.875rem" 
            width="25%">
          </app-skeleton>
          <app-skeleton 
            variant="rectangle" 
            height="3rem" 
            width="100%">
          </app-skeleton>
        </div>
      }
      
      <div class="flex justify-end gap-3 pt-4">
        <app-skeleton 
          variant="button" 
          width="5rem">
        </app-skeleton>
        <app-skeleton 
          variant="button" 
          width="6rem">
        </app-skeleton>
      </div>
    </div>
  `,
})
export class SkeletonFormComponent {
  @Input() fields: number = 4;

  get fieldItems(): any[] {
    return new Array(this.fields);
  }
}