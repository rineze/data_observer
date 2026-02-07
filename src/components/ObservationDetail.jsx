import StatusBadge from './StatusBadge'

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const EVIDENCE_LABELS = {
  email: 'Email',
  phone_call: 'Phone Call',
  payer_portal: 'Payer Portal',
  letter: 'Letter',
  internal_record: 'Internal Record',
  other: 'Other',
}

export default function ObservationDetail({ observation }) {
  if (!observation) return null

  const obs = observation

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{obs.provider_name}</h2>
          <p className="text-sm text-gray-500 font-mono">NPI: {obs.provider_npi}</p>
        </div>
        <StatusBadge status={obs.status} />
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Payer</p>
          <p className="text-gray-900">{obs.payer_name || 'N/A'}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Field Observed</p>
          <p className="text-gray-900">{obs.field_observed}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Submitted By</p>
          <p className="text-gray-900">{obs.submitted_by_email || 'Unknown'}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Submitted</p>
          <p className="text-gray-900">{formatDate(obs.created_at)}</p>
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div>
        <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Data Comparison</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-400 mb-1">{obs.system_a_name || 'System A'}</p>
            <p className="text-sm font-medium text-gray-700">{obs.system_a_value || 'N/A'}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-400 mb-1">{obs.system_b_name || 'System B'}</p>
            <p className="text-sm font-medium text-gray-700">{obs.system_b_value || 'N/A'}</p>
          </div>
          <div className="bg-slate-700 rounded-lg p-4">
            <p className="text-xs text-slate-300 mb-1">Corrected Value</p>
            <p className="text-sm font-bold text-white">{obs.corrected_value}</p>
          </div>
        </div>
      </div>

      {/* Evidence */}
      <div>
        <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Evidence</p>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="text-xs text-gray-400 mb-1">Type: {EVIDENCE_LABELS[obs.evidence_type] || obs.evidence_type}</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{obs.evidence_notes || 'No notes provided.'}</p>
        </div>
      </div>
    </div>
  )
}
