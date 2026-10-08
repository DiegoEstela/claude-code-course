import { Component, inject, OnInit, signal } from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { TableService } from '../../core/services/table.service'
import { RestaurantService } from '../../core/services/restaurant.service'
import { Table } from '../../core/models/table.model'
import { Restaurant } from '../../core/models/restaurant.model'

@Component({
  selector: 'app-table-select',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container">
      <div class="page-header">
        <div>
          <a routerLink="/restaurants" class="back-link">← Volver a restaurantes</a>
          <h1>{{ restaurant()?.name || 'Elige tu mesa' }}</h1>
        </div>
      </div>

      <div class="people-field form-group">
        <label for="people">¿Cuántas personas sois?</label>
        <input id="people" type="number" min="1" step="1" class="form-control"
               [value]="people() ?? ''" (input)="onPeopleInput($event)" />
      </div>

      @if (people() === null) {
        <p class="hint">Indica el número de personas para ver las mesas disponibles.</p>
      } @else if (loading()) {
        <div class="spinner"></div>
      } @else if (error()) {
        <div class="alert-error">
          {{ error() }}
          <button class="btn btn-secondary btn-sm" (click)="loadTables()">Reintentar</button>
        </div>
      } @else if (tables().length === 0) {
        <div class="empty-state card">
          <p>No hay mesas disponibles para {{ people() }} {{ people() === 1 ? 'persona' : 'personas' }}</p>
        </div>
      } @else {
        <div class="tables-grid">
          @for (table of tables(); track table.id) {
            <div class="table-card card">
              <h3>Mesa {{ table.number }}</h3>
              @if (table.description) {
                <p class="description">{{ table.description }}</p>
              }
              <p class="capacity">Capacidad: {{ table.capacity }}</p>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    .back-link {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 8px;
      display: inline-block;
    }
    .people-field {
      max-width: 280px;
      margin-bottom: 24px;
    }
    .hint {
      color: var(--text-muted);
    }
    .tables-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }
    .table-card {
      padding: 16px 20px;
    }
    .table-card h3 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .description {
      color: var(--text-muted);
      font-size: 13px;
      margin-bottom: 6px;
    }
    .capacity {
      color: var(--text-secondary);
      font-size: 13px;
    }
  `]
})
export class TableSelectComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly tableService = inject(TableService)
  private readonly restaurantService = inject(RestaurantService)

  private restaurantId = ''

  readonly restaurant = signal<Restaurant | null>(null)
  readonly people = signal<number | null>(null)
  readonly tables = signal<Table[]>([])
  readonly loading = signal(false)
  readonly error = signal<string | null>(null)

  ngOnInit(): void {
    this.restaurantId = this.route.snapshot.paramMap.get('id')!
    this.restaurantService.getById(this.restaurantId).subscribe({
      next: (restaurant) => this.restaurant.set(restaurant),
      error: () => {}
    })
  }

  onPeopleInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value)
    if (Number.isInteger(value) && value >= 1) {
      this.people.set(value)
      this.loadTables()
    } else {
      this.people.set(null)
      this.tables.set([])
      this.error.set(null)
    }
  }

  loadTables(): void {
    const people = this.people()
    if (people === null) return

    this.loading.set(true)
    this.error.set(null)
    this.tableService.getAvailable(this.restaurantId, people).subscribe({
      next: (tables) => {
        if (this.people() !== people) return
        this.tables.set(tables)
        this.loading.set(false)
      },
      error: () => {
        if (this.people() !== people) return
        this.error.set('Error al cargar las mesas')
        this.loading.set(false)
      }
    })
  }
}
