import { Component, inject, OnInit, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TableStore } from '../../store/table.store'
import type { TableStatus } from '../../models/table.model'

@Component({
  selector: 'app-table-form',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './table-form.component.html',
  styleUrl: './table-form.component.css'
})
export class TableFormComponent implements OnInit {
  private readonly store = inject(TableStore)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)

  isEditing = false
  tableId: string | null = null
  restaurantId: string = ''
  loading = signal(false)
  error = signal<string | null>(null)

  statuses: TableStatus[] = ['libre', 'ocupada', 'reservada']

  form: { number: number | null, description: string, capacity: number | null, status: TableStatus } = {
    number: null,
    description: '',
    capacity: null,
    status: 'libre'
  }

  get pageTitle(): string {
    return this.isEditing ? 'Editar mesa' : 'Nueva mesa'
  }

  get listUrl(): string {
    return `/restaurants/${this.restaurantId}/tables`
  }

  ngOnInit(): void {
    this.restaurantId = this.route.parent?.snapshot.params['restaurantId'] ?? ''
    const id = this.route.snapshot.paramMap.get('id')

    if (id && this.restaurantId) {
      this.isEditing = true
      this.tableId = id
      this.loadTable()
    }
  }

  private async loadTable(): Promise<void> {
    this.loading.set(true)
    try {
      if (this.store.tables().length === 0) {
        await this.store.loadByRestaurant(this.restaurantId)
      }
      const found = this.store.tables().find(t => t.id === this.tableId)
      if (!found) {
        this.router.navigate(['/restaurants', this.restaurantId, 'tables'])
        return
      }
      this.form = {
        number: found.number,
        description: found.description ?? '',
        capacity: found.capacity,
        status: found.status
      }
    } finally {
      this.loading.set(false)
    }
  }

  async onSubmit(): Promise<void> {
    this.error.set(null)
    const { number, capacity } = this.form
    if (!Number.isInteger(number) || (number as number) < 1) {
      this.error.set('El número de mesa debe ser un entero mayor o igual a 1.')
      return
    }
    if (!Number.isInteger(capacity) || (capacity as number) < 1) {
      this.error.set('La capacidad debe ser un entero mayor o igual a 1.')
      return
    }

    const description = this.form.description.trim() || undefined
    this.loading.set(true)
    try {
      if (this.isEditing && this.tableId) {
        await this.store.update(this.restaurantId, this.tableId, {
          number: number as number,
          description,
          capacity: capacity as number,
          status: this.form.status
        })
      } else {
        await this.store.create(this.restaurantId, {
          number: number as number,
          description,
          capacity: capacity as number
        })
      }
      this.router.navigate(['/restaurants', this.restaurantId, 'tables'])
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Error al guardar la mesa.')
    } finally {
      this.loading.set(false)
    }
  }
}
