import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Table, TableStatus } from '../models/table.model';
import { TableService } from '../services/table.service';

@Injectable({ providedIn: 'root' })
export class TableStore {
  private readonly tableService = inject(TableService);

  private readonly _tables = signal<Table[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  readonly tables = this._tables.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  async load(restaurantId: string): Promise<void> {
    this._loading.set(true);
    try {
      const tables = await firstValueFrom(this.tableService.getAll(restaurantId));
      this._tables.set(tables);
      this._error.set(null);
    } catch (err: any) {
      this._error.set(err.error?.message || err.message || 'Error al cargar mesas');
    } finally {
      this._loading.set(false);
    }
  }

  async updateStatus(restaurantId: string, id: string, status: TableStatus): Promise<void> {
    const previous = this._tables().find(t => t.id === id)?.status;
    if (!previous) return;
    this.setLocalStatus(id, status);
    this._error.set(null);
    try {
      const updated = await firstValueFrom(this.tableService.updateStatus(restaurantId, id, { status }));
      this._tables.update(tables => tables.map(t => (t.id === id ? updated : t)));
    } catch (err: any) {
      this.setLocalStatus(id, previous);
      this._error.set(err.error?.message || err.message || 'Error al actualizar la mesa');
    }
  }

  startPolling(restaurantId: string): void {
    this.stopPolling();
    this.load(restaurantId);
    this.pollingInterval = setInterval(() => {
      this.load(restaurantId);
    }, 30000);
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private setLocalStatus(id: string, status: TableStatus): void {
    this._tables.update(tables => tables.map(t => (t.id === id ? { ...t, status } : t)));
  }
}
