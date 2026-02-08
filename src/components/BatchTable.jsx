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

export default function BatchTable({ batches, loading }) {
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <p className="text-sm text-gray-400">Loading batches...</p>
      </div>
    )
  }

  if (batches.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <p className="text-sm text-gray-500">No bulk tag batches found.</p>
        <p className="text-xs text-gray-400 mt-1">Upload a CSV to create your first batch.</p>
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tag Category</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tag Value</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Records</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {batches.map((batch) => (
              <tr
                key={batch.id}
                onClick={() => navigate(`/batch/${batch.id}`)}
                className="hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(batch.created_at)}</td>
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{batch.batch_name || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {batch.tag_categories?.display_name || '-'}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-800 whitespace-nowrap">
                  {batch.tag_value?.replace(/_/g, ' ')}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right font-mono whitespace-nowrap">
                  {batch.record_count?.toLocaleString()}
                </td>
                <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={batch.status} /></td>
                <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">{batch.submitted_by_email || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
