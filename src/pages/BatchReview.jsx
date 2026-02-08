import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import StatusBadge from '../components/StatusBadge'

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

export default function BatchReview({ session }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [batch, setBatch] = useState(null)
  const [sampleRecords, setSampleRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [decision, setDecision] = useState(null)
  const [comments, setComments] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      const [batchResult, recordsResult] = await Promise.all([
        supabase
          .from('bulk_batches')
          .select('*, tag_categories(display_name, category_key)')
          .eq('id', id)
          .single(),
        supabase
          .from('bulk_records')
          .select('*')
          .eq('batch_id', id)
          .limit(20),
      ])

      if (!batchResult.error) setBatch(batchResult.data)
      if (!recordsResult.error) setSampleRecords(recordsResult.data || [])
      setLoading(false)
    }

    fetchData()
  }, [id])

  const handleReview = async () => {
    if (!decision) return
    if (decision === 'rejected' && !comments.trim()) {
      toast.error('A comment is required when rejecting.')
      return
    }

    setSubmitting(true)

    const { error: reviewError } = await supabase.from('observation_reviews').insert({
      observation_id: null,
      reviewer_id: session.user.id,
      reviewer_email: session.user.email,
      decision,
      comments: comments.trim() ? `[Batch: ${batch.id}] ${comments.trim()}` : `[Batch: ${batch.id}] Approved`,
    })

    // Even if review insert has issues (no observation_id FK), update batch status
    const { error: updateError } = await supabase
      .from('bulk_batches')
      .update({ status: decision })
      .eq('id', id)

    if (updateError) {
      toast.error('Failed to update batch status.')
      setSubmitting(false)
      return
    }

    toast.success(`Batch ${decision}.`)
    navigate('/dashboard')
  }

  const handleDownload = () => {
    if (!batch) return

    // Fetch all records for download
    const downloadAll = async () => {
      const { data, error } = await supabase
        .from('bulk_records')
        .select('record_identifier, original_row')
        .eq('batch_id', id)

      if (error || !data) {
        toast.error('Failed to fetch records for download.')
        return
      }

      // Build CSV from original_row JSONB
      if (data.length === 0) return

      const allKeys = new Set()
      data.forEach((r) => {
        if (r.original_row) Object.keys(r.original_row).forEach((k) => allKeys.add(k))
      })
      const headers = [...allKeys]

      const csvRows = [headers.join(',')]
      data.forEach((r) => {
        const row = headers.map((h) => {
          const val = r.original_row?.[h] ?? ''
          const str = String(val)
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str
        })
        csvRows.push(row.join(','))
      })

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `batch_${batch.batch_name || batch.id}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }

    downloadAll()
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-sm text-gray-400">Loading batch...</p>
      </div>
    )
  }

  if (!batch) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-sm text-gray-500">Batch not found.</p>
        <Link to="/dashboard" className="text-sm text-slate-600 hover:underline mt-2 inline-block">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  // Get column headers from sample records
  const sampleKeys = sampleRecords.length > 0 && sampleRecords[0].original_row
    ? Object.keys(sampleRecords[0].original_row)
    : []

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <Link to="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Back to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Batch detail */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{batch.batch_name || 'Unnamed Batch'}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{formatDate(batch.created_at)}</p>
              </div>
              <StatusBadge status={batch.status} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Tag Category</p>
                <p className="text-gray-900">{batch.tag_categories?.display_name || '-'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Tag Value</p>
                <p className="font-semibold text-slate-800">{batch.tag_value?.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">ID Column</p>
                <p className="text-gray-900 font-mono">{batch.id_column_name}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Record Count</p>
                <p className="text-gray-900 font-mono">{batch.record_count?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Submitted By</p>
                <p className="text-gray-900">{batch.submitted_by_email}</p>
              </div>
            </div>

            {batch.notes && (
              <div className="mb-6">
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm text-gray-700">{batch.notes}</p>
              </div>
            )}

            <button
              onClick={handleDownload}
              className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
            >
              Download Batch CSV
            </button>
          </div>

          {/* Sample records */}
          {sampleRecords.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-700">
                  Sample Records <span className="text-gray-400 font-normal">(showing {sampleRecords.length} of {batch.record_count?.toLocaleString()})</span>
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      {sampleKeys.slice(0, 6).map((k) => (
                        <th key={k} className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sampleRecords.map((rec) => (
                      <tr key={rec.id}>
                        <td className="px-3 py-2 text-gray-900 font-mono whitespace-nowrap">{rec.record_identifier}</td>
                        {sampleKeys.slice(0, 6).map((k) => (
                          <td key={k} className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-[180px] truncate">
                            {rec.original_row?.[k]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Review panel */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 h-fit">
          {batch.status !== 'pending' ? (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-500">
                This batch has been <span className="font-medium">{batch.status}</span>.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-400 text-xs uppercase tracking-wider">Review Decision</p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDecision('approved')}
                  className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium border transition-colors ${
                    decision === 'approved'
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-green-700 border-green-300 hover:bg-green-50'
                  }`}
                >
                  Approve
                </button>
                <button
                  onClick={() => setDecision('rejected')}
                  className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium border transition-colors ${
                    decision === 'rejected'
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-red-700 border-red-300 hover:bg-red-50'
                  }`}
                >
                  Reject
                </button>
              </div>

              {decision && (
                <>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Comments {decision === 'rejected' && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      rows={3}
                      placeholder={decision === 'rejected' ? 'Reason for rejection (required)...' : 'Optional comments...'}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent resize-none"
                    />
                  </div>
                  <button
                    onClick={handleReview}
                    disabled={submitting}
                    className="w-full py-2.5 px-4 bg-slate-700 text-white rounded-md text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? 'Submitting...' : `Confirm ${decision === 'approved' ? 'Approval' : 'Rejection'}`}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
