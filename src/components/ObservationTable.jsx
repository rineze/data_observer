import { useNavigate } from 'react-router-dom'
import StatusBadge from './StatusBadge'

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function ObservationTable({ observations, loading }) {
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <p className="text-sm text-gray-400">Loading observations...</p>
      </div>
    )
  }

  if (observations.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <p className="text-sm text-gray-500">No observations found.</p>
        <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or submit a new observation.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider NPI</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Field</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Corrected Value</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {observations.map((obs) => (
              <tr
                key={obs.id}
                onClick={() => navigate(`/review/${obs.id}`)}
                className="hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(obs.created_at)}</td>
                <td className="px-4 py-3 text-sm text-gray-900 font-mono whitespace-nowrap">{obs.provider_npi}</td>
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{obs.provider_name}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{obs.payer_name || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{obs.field_observed}</td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-800 whitespace-nowrap">{obs.corrected_value}</td>
                <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={obs.status} /></td>
                <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">{obs.submitted_by_email || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
