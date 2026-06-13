import { Component, inject } from '@angular/core';

import { LoadingService } from '../../services/system/loading.service';

@Component({
  selector: 'app-loading-spinner',
  imports: [],
  templateUrl: './loading-spinner.html',
  styleUrl: './loading-spinner.css',
})
export class LoadingSpinner {
  public loadingService = inject(LoadingService);
}