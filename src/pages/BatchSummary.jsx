import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function BatchSummary() {
  const [batches, setBatches] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const [batchResult, catResult] = await Promise.all([
        supabase
          .from('bulk_batches')
          .select('*, tag_categories(display_name, category_key)')
          .order('created_at', { ascending: false }),
        supabase.from('tag_categories').select('*').eq('is_active', true),
      ])

      if (!batchResult.error) setBatches(batchResult.data || [])
      if (!catResult.error) setCategories(catResult.data || [])
      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-12 text-center">
        <p className="text-sm text-gray-400">Loading summary...</p>
      </div>
    )
  }

  // Aggregate stats
  const totalBatches = batches.length
  const totalRecords = batches.reduce((sum, b) => sum + (b.record_count || 0), 0)

  const statusCounts = { pending: 0, approved: 0, rejected: 0, applied: 0 }
  batches.forEach((b) => {
    if (statusCounts[b.status] !== undefined) statusCounts[b.status]++
  })

  const statusRecords = { pending: 0, approved: 0, rejected: 0, applied: 0 }
  batches.forEach((b) => {
    if (statusRecords[b.status] !== undefined) statusRecords[b.status] += b.record_count || 0
  })

  // By category
  const byCategory = {}
  batches.forEach((b) => {
    const catName = b.tag_categories?.display_name || 'Unknown'
    if (!byCategory[catName]) byCategory[catName] = { batches: 0, records: 0, values: {} }
    byCategory[catName].batches++
    byCategory[catName].records += b.record_count || 0
    const val = b.tag_value?.replace(/_/g, ' ') || 'unknown'
    byCategory[catName].values[val] = (byCategory[catName].values[val] || 0) + (b.record_count || 0)
  })

  // By submitter
  const bySubmitter = {}
  batches.forEach((b) => {
    const email = b.submitted_by_email || 'Unknown'
    if (!bySubmitter[email]) bySubmitter[email] = { batches: 0, records: 0 }
    bySubmitter[email].batches++
    bySubmitter[email].records += b.record_count || 0
  })

  // Recent activity (last 10)
  const recentBatches = batches.slice(0, 10)

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Bulk Tag Summary</h1>
        <p className="text-sm text-gray-500 mt-1">Aggregate analytics across all batch tagging activity.</p>
      </div>

      {/* Top-level stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Total Batches</p>
          <p className="text-3xl font-semibold text-gray-900 mt-1">{totalBatches}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Total Records Tagged</p>
          <p className="text-3xl font-semibold text-gray-900 mt-1">{totalRecords.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Categories Used</p>
          <p className="text-3xl font-semibold text-gray-900 mt-1">{Object.keys(byCategory).length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Contributors</p>
          <p className="text-3xl font-semibold text-gray-900 mt-1">{Object.keys(bySubmitter).length}</p>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Status Breakdown</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { status: 'pending', color: 'bg-amber-500' },
            { status: 'approved', color: 'bg-green-500' },
            { status: 'rejected', color: 'bg-red-500' },
            { status: 'applied', color: 'bg-blue-500' },
          ].map(({ status, color }) => (
            <div key={status} className="space-y-2">
              <div className="flex items-center justify-between">
                <StatusBadge status={status} />
                <span className="text-sm font-semibold text-gray-900">{statusCounts[status]}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`${color} h-2 rounded-full transition-all`}
                  style={{ width: totalBatches > 0 ? `${(statusCounts[status] / totalBatches) * 100}%` : '0%' }}
                />
              </div>
              <p className="text-xs text-gray-400">{statusRecords[status].toLocaleString()} records</p>
            </div>
          ))}
        </div>
      </div>

      {/* By category */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">By Tag Category</p>
        {Object.keys(byCategory).length === 0 ? (
          <p className="text-sm text-gray-500">No batches submitted yet.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(byCategory)
              .sort((a, b) => b[1].records - a[1].records)
              .map(([catName, data]) => (
                <div key={catName} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-900">{catName}</p>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-900">{data.records.toLocaleString()}</span>
                      <span className="text-xs text-gray-400 ml-1">records</span>
                      <span className="text-xs text-gray-300 mx-2">&middot;</span>
                      <span className="text-xs text-gray-500">{data.batches} {data.batches === 1 ? 'batch' : 'batches'}</span>
                    </div>
                  </div>
                  {/* Bar for relative size */}
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
                    <div
                      className="bg-slate-600 h-1.5 rounded-full"
                      style={{ width: totalRecords > 0 ? `${(data.records / totalRecords) * 100}%` : '0%' }}
                    />
                  </div>
                  {/* Tag value breakdown */}
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(data.values)
                      .sort((a, b) => b[1] - a[1])
                      .map(([val, count]) => (
                        <span key={val} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-md text-xs text-gray-600 border border-gray-100">
                          <span className="font-medium">{val}</span>
                          <span className="text-gray-400">{count.toLocaleString()}</span>
                        </span>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* By submitter */}
      {Object.keys(bySubmitter).length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">By Submitter</p>
          <div className="space-y-3">
            {Object.entries(bySubmitter)
              .sort((a, b) => b[1].records - a[1].records)
              .map(([email, data]) => (
                <div key={email} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-700">{email}</span>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-900">{data.records.toLocaleString()}</span>
                    <span className="text-xs text-gray-400 ml-1">records</span>
                    <span className="text-xs text-gray-300 mx-2">&middot;</span>
                    <span className="text-xs text-gray-500">{data.batches} {data.batches === 1 ? 'batch' : 'batches'}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {recentBatches.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Recent Activity</p>
          <div className="space-y-3">
            {recentBatches.map((b) => (
              <div key={b.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <StatusBadge status={b.status} />
                  <div>
                    <p className="text-sm text-gray-900">{b.batch_name || 'Unnamed batch'}</p>
                    <p className="text-xs text-gray-400">
                      {b.tag_categories?.display_name} = {b.tag_value?.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono text-gray-700">{b.record_count?.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">{formatDate(b.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
