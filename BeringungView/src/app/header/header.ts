import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { VogelEintragungModalService } from '../services/vogel-eintragung-modal.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  private readonly modalService = inject(VogelEintragungModalService);

  protected openModal(): void {
    this.modalService.open();
  }
}
