import { useState, useEffect, useCallback } from 'react'
import Papa from 'papaparse'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const STEPS = ['Upload CSV', 'Configure', 'Confirm & Submit']

export default function BulkTag({ session }) {
  const [step, setStep] = useState(0)
  const [file, setFile] = useState(null)
  const [csvData, setCsvData] = useState([])
  const [headers, setHeaders] = useState([])
  const [categories, setCategories] = useState([])
  const [config, setConfig] = useState({
    idColumn: '',
    categoryId: '',
    tagValue: '',
    batchName: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)

  useEffect(() => {
    supabase
      .from('tag_categories')
      .select('*')
      .eq('is_active', true)
      .then(({ data }) => {
        if (data) setCategories(data)
      })
  }, [])

  const selectedCategory = categories.find((c) => c.id === Number(config.categoryId))

  const parseFile = useCallback((f) => {
    setFile(f)
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setHeaders(results.meta.fields || [])
        setCsvData(results.data)
        setStep(1)
      },
      error: () => {
        toast.error('Failed to parse CSV file.')
      },
    })
  }, [])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    const f = e.dataTransfer.files?.[0]
    if (f && f.name.endsWith('.csv')) {
      parseFile(f)
    } else {
      toast.error('Please upload a .csv file.')
    }
  }

  const handleFileInput = (e) => {
    const f = e.target.files?.[0]
    if (f) parseFile(f)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setProgress(0)

    // Create the batch
    const { data: batch, error: batchError } = await supabase
      .from('bulk_batches')
      .insert({
        batch_name: config.batchName.trim() || file.name,
        tag_category_id: Number(config.categoryId),
        tag_value: config.tagValue,
        id_column_name: config.idColumn,
        record_count: csvData.length,
        notes: config.notes.trim() || null,
        status: 'pending',
        submitted_by: session.user.id,
        submitted_by_email: session.user.email,
      })
      .select()
      .single()

    if (batchError) {
      toast.error('Failed to create batch.')
      setSubmitting(false)
      return
    }

    // Insert records in chunks of 500
    const chunkSize = 500
    const totalChunks = Math.ceil(csvData.length / chunkSize)

    for (let i = 0; i < totalChunks; i++) {
      const chunk = csvData.slice(i * chunkSize, (i + 1) * chunkSize)
      const records = chunk.map((row) => ({
        batch_id: batch.id,
        record_identifier: String(row[config.idColumn] || ''),
        original_row: row,
      }))

      const { error } = await supabase.from('bulk_records').insert(records)

      if (error) {
        toast.error(`Failed to insert chunk ${i + 1}/${totalChunks}.`)
        setSubmitting(false)
        return
      }

      setProgress(Math.round(((i + 1) / totalChunks) * 100))
    }

    toast.success(`Batch submitted — ${csvData.length.toLocaleString()} records tagged.`)
    setSubmitting(false)

    // Reset
    setStep(0)
    setFile(null)
    setCsvData([])
    setHeaders([])
    setConfig({ idColumn: '', categoryId: '', tagValue: '', batchName: '', notes: '' })
    setProgress(0)
  }

  const canProceedToConfirm = config.idColumn && config.categoryId && config.tagValue

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Bulk Tag via CSV</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload a CSV file, select an ID column, and apply a tag to all records.
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                i <= step
                  ? 'bg-slate-700 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i + 1}
            </div>
            <span className={`text-sm ${i <= step ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-gray-300" />}
          </div>
        ))}
      </div>

      {/* Step 0: Upload */}
      {step === 0 && (
        <div
          className={`bg-white rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
            dragActive ? 'border-slate-500 bg-slate-50' : 'border-gray-300'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <div className="text-gray-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="text-sm text-gray-600 mb-2">Drag and drop a CSV file here</p>
          <p className="text-xs text-gray-400 mb-4">or</p>
          <label className="inline-block px-4 py-2 bg-slate-700 text-white text-sm font-medium rounded-md cursor-pointer hover:bg-slate-800 transition-colors">
            Browse Files
            <input type="file" accept=".csv" onChange={handleFileInput} className="hidden" />
          </label>
        </div>
      )}

      {/* Step 1: Configure */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Preview */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">{file?.name}</p>
              <p className="text-xs text-gray-400">{csvData.length.toLocaleString()} rows &middot; {headers.length} columns</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    {headers.map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {csvData.slice(0, 10).map((row, i) => (
                    <tr key={i}>
                      {headers.map((h) => (
                        <td key={h} className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-[200px] truncate">
                          {row[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {csvData.length > 10 && (
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-400 text-center">
                Showing first 10 of {csvData.length.toLocaleString()} rows
              </div>
            )}
          </div>

          {/* Configuration */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Tag Configuration</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID Column <span className="text-red-500">*</span>
                </label>
                <select
                  value={config.idColumn}
                  onChange={(e) => setConfig((c) => ({ ...c, idColumn: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                >
                  <option value="">Select column...</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batch Name
                </label>
                <input
                  type="text"
                  value={config.batchName}
                  onChange={(e) => setConfig((c) => ({ ...c, batchName: e.target.value }))}
                  placeholder={file?.name || 'Optional name'}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tag Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={config.categoryId}
                  onChange={(e) => setConfig((c) => ({ ...c, categoryId: e.target.value, tagValue: '' }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.display_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tag Value <span className="text-red-500">*</span>
                </label>
                <select
                  value={config.tagValue}
                  onChange={(e) => setConfig((c) => ({ ...c, tagValue: e.target.value }))}
                  disabled={!selectedCategory}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">Select value...</option>
                  {selectedCategory?.allowed_values?.map((v) => (
                    <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={config.notes}
                onChange={(e) => setConfig((c) => ({ ...c, notes: e.target.value }))}
                rows={2}
                placeholder="Optional context about this batch..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => { setStep(0); setFile(null); setCsvData([]); setHeaders([]) }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Start Over
            </button>
            <button
              onClick={() => setStep(2)}
              disabled={!canProceedToConfirm}
              className="px-6 py-2.5 bg-slate-700 text-white rounded-md text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Review & Confirm
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Confirm */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Batch Summary</p>

            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 mb-6">
              <p className="text-sm text-gray-700">
                Tagging <span className="font-bold text-slate-800">{csvData.length.toLocaleString()}</span> records
                from column <span className="font-mono font-bold text-slate-800">'{config.idColumn}'</span>
                {' '}with <span className="font-bold text-slate-800">{selectedCategory?.display_name}</span>
                {' = '}<span className="font-bold text-slate-800">'{config.tagValue.replace(/_/g, ' ')}'</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">File</p>
                <p className="text-gray-900">{file?.name}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Batch Name</p>
                <p className="text-gray-900">{config.batchName || file?.name}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Record Count</p>
                <p className="text-gray-900">{csvData.length.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Submitted By</p>
                <p className="text-gray-900">{session.user.email}</p>
              </div>
            </div>

            {config.notes && (
              <div className="mb-6">
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm text-gray-700">{config.notes}</p>
              </div>
            )}

            {/* Sample IDs */}
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Sample Record IDs</p>
              <div className="flex flex-wrap gap-2">
                {csvData.slice(0, 12).map((row, i) => (
                  <span key={i} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 font-mono">
                    {row[config.idColumn]}
                  </span>
                ))}
                {csvData.length > 12 && (
                  <span className="px-2 py-1 text-xs text-gray-400">
                    +{(csvData.length - 12).toLocaleString()} more
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {submitting && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Uploading records...</p>
                <p className="text-sm font-medium text-slate-700">{progress}%</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-slate-700 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              disabled={submitting}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-8 py-2.5 bg-slate-700 text-white rounded-md text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Batch'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
