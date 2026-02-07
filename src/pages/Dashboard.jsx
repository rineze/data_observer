import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import ObservationTable from '../components/ObservationTable'
import Filters from '../components/Filters'

export default function Dashboard() {
  const [observations, setObservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: 'all',
    field: 'all',
    dateFrom: '',
    dateTo: '',
  })

  const fetchObservations = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from('observations')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }
    if (filters.field !== 'all') {
      query = query.eq('field_observed', filters.field)
    }
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom)
    }
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo + 'T23:59:59')
    }

    const { data, error } = await query

    if (!error) {
      setObservations(data || [])
    }
    setLoading(false)
  }, [filters])

  useEffect(() => {
    fetchObservations()
  }, [fetchObservations])

  const counts = {
    total: observations.length,
    pending: observations.filter((o) => o.status === 'pending').length,
    approved: observations.filter((o) => o.status === 'approved').length,
    rejected: observations.filter((o) => o.status === 'rejected').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Observations Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {counts.total} total &middot; {counts.pending} pending review
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: counts.total, color: 'text-gray-900' },
          { label: 'Pending', value: counts.pending, color: 'text-amber-600' },
          { label: 'Approved', value: counts.approved, color: 'text-green-600' },
          { label: 'Rejected', value: counts.rejected, color: 'text-red-600' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider">{card.label}</p>
            <p className={`text-2xl font-semibold mt-1 ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <Filters filters={filters} onChange={setFilters} />

      <ObservationTable observations={observations} loading={loading} />
    </div>
  )
}
