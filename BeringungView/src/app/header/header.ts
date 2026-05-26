import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { VogelEintragungModalService } from '../services/vogel-eintragung-modal.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  private readonly modalService = inject(VogelEintragungModalService);
  protected readonly isProduction = environment.production;

  protected openModal(): void {
    this.modalService.open();
  }
}
