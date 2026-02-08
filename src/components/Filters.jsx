const STATUSES = ['all', 'pending', 'approved', 'rejected', 'applied']

const FIELD_TYPES = [
  { key: 'all', label: 'All Fields' },
  { key: 'term_date', label: 'Termination Date' },
  { key: 'effective_date', label: 'Effective Date' },
  { key: 'credentialing_status', label: 'Credentialing Status' },
  { key: 'enrollment_status', label: 'Enrollment Status' },
]

export default function Filters({ filters, onChange }) {
  const update = (key, value) => {
    onChange({ ...filters, [key]: value })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={filters.status}
        onChange={(e) => update('status', e.target.value)}
        className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
          </option>
        ))}
      </select>

      <select
        value={filters.field}
        onChange={(e) => update('field', e.target.value)}
        className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
      >
        {FIELD_TYPES.map((f) => (
          <option key={f.key} value={f.key}>{f.label}</option>
        ))}
      </select>

      <input
        type="date"
        value={filters.dateFrom}
        onChange={(e) => update('dateFrom', e.target.value)}
        className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
        placeholder="From"
      />

      <input
        type="date"
        value={filters.dateTo}
        onChange={(e) => update('dateTo', e.target.value)}
        className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
        placeholder="To"
      />

      {(filters.status !== 'all' || filters.field !== 'all' || filters.dateFrom || filters.dateTo) && (
        <button
          onClick={() => onChange({ status: 'all', field: 'all', dateFrom: '', dateTo: '' })}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
