import { Component, inject, computed, OnInit, OnDestroy } from '@angular/core';
import { AuthStore } from '@resttek/web-shared';
import { TableStatus } from '../../models/table.model';
import { TableStore } from '../../store/table.store';

@Component({
  selector: 'app-mesas',
  standalone: true,
  templateUrl: './mesas.component.html',
  styleUrl: './mesas.component.css'
})
export class MesasComponent implements OnInit, OnDestroy {
  private readonly authStore = inject(AuthStore);
  readonly tableStore = inject(TableStore);

  readonly statuses: TableStatus[] = ['libre', 'ocupada', 'reservada'];

  readonly canChangeStatus = computed(() => {
    const role = this.authStore.userRole();
    return role === 'admin' || role === 'manager' || role === 'camarero';
  });

  ngOnInit(): void {
    const restaurantId = this.authStore.user()?.restaurantId;
    if (restaurantId) {
      this.tableStore.startPolling(restaurantId);
    }
  }

  ngOnDestroy(): void {
    this.tableStore.stopPolling();
  }

  changeStatus(tableId: string, event: Event): void {
    const restaurantId = this.authStore.user()?.restaurantId;
    if (!restaurantId) return;
    const status = (event.target as HTMLSelectElement).value as TableStatus;
    this.tableStore.updateStatus(restaurantId, tableId, status);
  }
}
