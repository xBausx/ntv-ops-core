import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Button } from '@ntv360/component-pantry';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [Button],
  template: `
    <div class="flex flex-col items-center justify-center py-16 px-6 text-center">
      <!-- Icon/Illustration -->
      <div class="relative mb-6">
        <div class="w-24 h-24 rounded-2xl bg-gradient-to-br from-white/5 to-white/10 border border-white/10 flex items-center justify-center">
          <!-- Default icon if no custom icon provided -->
          @if (!customIcon) {
            <svg class="w-10 h-10 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path 
                stroke-linecap="round" 
                stroke-linejoin="round" 
                stroke-width="1.5" 
                [attr.d]="defaultIconPath">
              </path>
            </svg>
          } @else {
            <div [innerHTML]="customIcon"></div>
          }
        </div>
        
        <!-- Subtle glow effect -->
        <div class="absolute inset-0 w-24 h-24 rounded-2xl bg-gradient-to-br from-white/5 to-transparent opacity-60 blur-xl"></div>
      </div>
      
      <!-- Content -->
      <div class="max-w-md space-y-3">
        <h3 class="text-lg font-semibold text-white/90 tracking-tight">
          {{ title }}
        </h3>
        
        @if (description) {
          <p class="text-sm text-white/60 leading-relaxed">
            {{ description }}
          </p>
        }
        
        @if (suggestion) {
          <p class="text-xs text-white/40 leading-relaxed pt-1">
            {{ suggestion }}
          </p>
        }
      </div>
      
      <!-- Actions -->
      @if (showAction && actionText) {
        <div class="mt-8 flex items-center gap-3">
          <button
            class="btn-modern btn-primary"
            (click)="handleAction()"
            [disabled]="actionDisabled"
          >
            {{ actionText }}
          </button>
          
          @if (secondaryActionText) {
            <button
              class="btn-modern btn-secondary"
              (click)="handleSecondaryAction()"
              [disabled]="secondaryActionDisabled"
            >
              {{ secondaryActionText }}
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() title: string = 'No results found';
  @Input() description?: string;
  @Input() suggestion?: string;
  @Input() customIcon?: string;
  @Input() iconType: 'search' | 'add' | 'database' | 'filter' = 'search';
  @Input() showAction: boolean = false;
  @Input() actionText?: string;
  @Input() actionDisabled: boolean = false;
  @Input() secondaryActionText?: string;
  @Input() secondaryActionDisabled: boolean = false;
  
  @Output() action = new EventEmitter<void>();
  @Output() secondaryAction = new EventEmitter<void>();
  
  get defaultIconPath(): string {
    switch (this.iconType) {
      case 'search':
        return 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z';
      case 'add':
        return 'M12 4.5v15m7.5-7.5h-15';
      case 'database':
        return 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4';
      case 'filter':
        return 'M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z';
      default:
        return 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z';
    }
  }
  
  handleAction(): void {
    this.action.emit();
  }
  
  handleSecondaryAction(): void {
    this.secondaryAction.emit();
  }
}