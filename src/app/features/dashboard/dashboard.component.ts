/** Angular Imports */
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

/** Third Party Imports */
import { Button, Input } from '@ntv360/component-pantry'; 

@Component({
  selector: 'app-dashboard',
  // 👇 Removed NgIf from this array
  imports: [RouterLink, FormsModule, Button, Input],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  standalone: true,
})
export class DashboardComponent {
  private readonly router = inject(Router);

  workId = '';

  openWorkItem(): void {
    if (!this.workId) return;
    
    const cleaned = this.cleanId(this.workId);

    if (!this.isUuid(cleaned)) return;

    void this.router.navigate(['/work-items', cleaned]);
  }

  // Helper method to clean the string
  private cleanId(value: string): string {
    return (value ?? '').trim().replace(/^\{|\}$/g, '');
  }

  isUuid(value: string): boolean {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      value
    );
  }

  // 👇 New getter to use in the HTML template
  get isInvalidWorkId(): boolean {
    if (!this.workId) return false; // Don't show error if input is empty
    const cleaned = this.cleanId(this.workId);
    return !this.isUuid(cleaned);
  }
}