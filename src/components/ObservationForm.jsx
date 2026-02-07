import { useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const FIELD_TYPES = [
  { key: 'term_date', label: 'Termination Date' },
  { key: 'effective_date', label: 'Effective Date' },
  { key: 'enrollment_status', label: 'Enrollment Status' },
  { key: 'tin', label: 'Tax ID Number (TIN)' },
  { key: 'payer_id', label: 'Payer ID' },
  { key: 'group_npi', label: 'Group NPI' },
  { key: 'billing_npi', label: 'Billing NPI' },
  { key: 'credentialing_status', label: 'Credentialing Status' },
  { key: 'other', label: 'Other' },
]

const EVIDENCE_TYPES = [
  { key: 'email', label: 'Email' },
  { key: 'phone_call', label: 'Phone Call' },
  { key: 'payer_portal', label: 'Payer Portal' },
  { key: 'letter', label: 'Letter' },
  { key: 'internal_record', label: 'Internal Record' },
  { key: 'other', label: 'Other' },
]

const INITIAL_FORM = {
  provider_npi: '',
  provider_name: '',
  payer_name: '',
  field_observed: '',
  system_a_name: '',
  system_a_value: '',
  system_b_name: '',
  system_b_value: '',
  corrected_value: '',
  evidence_type: '',
  evidence_notes: '',
}

export default function ObservationForm({ session }) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }))
  }

  const validate = () => {
    const errs = {}
    if (!form.provider_npi || !/^\d{10}$/.test(form.provider_npi)) {
      errs.provider_npi = 'NPI must be exactly 10 digits'
    }
    if (!form.provider_name.trim()) errs.provider_name = 'Required'
    if (!form.field_observed) errs.field_observed = 'Required'
    if (!form.corrected_value.trim()) errs.corrected_value = 'Required'
    if (!form.evidence_type) errs.evidence_type = 'Required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)

    const { error } = await supabase.from('observations').insert({
      ...form,
      provider_name: form.provider_name.trim(),
      payer_name: form.payer_name.trim() || null,
      corrected_value: form.corrected_value.trim(),
      evidence_notes: form.evidence_notes.trim() || null,
      system_a_name: form.system_a_name.trim() || null,
      system_a_value: form.system_a_value.trim() || null,
      system_b_name: form.system_b_name.trim() || null,
      system_b_value: form.system_b_value.trim() || null,
      status: 'pending',
      submitted_by: session.user.id,
      submitted_by_email: session.user.email,
    })

    setSubmitting(false)

    if (error) {
      toast.error('Failed to submit observation.')
      return
    }

    toast.success('Observation submitted successfully.')
    setForm(INITIAL_FORM)
  }

  const inputClass = (field) =>
    `w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent ${
      errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-300'
    }`

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Provider Info */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-medium text-gray-400 uppercase tracking-wider">Provider Information</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Provider NPI <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.provider_npi}
              onChange={(e) => update('provider_npi', e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit NPI"
              className={inputClass('provider_npi')}
              maxLength={10}
            />
            {errors.provider_npi && <p className="text-xs text-red-500 mt-1">{errors.provider_npi}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Provider Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.provider_name}
              onChange={(e) => update('provider_name', e.target.value)}
              placeholder="Dr. Jane Smith"
              className={inputClass('provider_name')}
            />
            {errors.provider_name && <p className="text-xs text-red-500 mt-1">{errors.provider_name}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payer Name</label>
            <input
              type="text"
              value={form.payer_name}
              onChange={(e) => update('payer_name', e.target.value)}
              placeholder="e.g., Aetna, UHC, BCBS"
              className={inputClass('payer_name')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field Observed <span className="text-red-500">*</span>
            </label>
            <select
              value={form.field_observed}
              onChange={(e) => update('field_observed', e.target.value)}
              className={inputClass('field_observed')}
            >
              <option value="">Select field...</option>
              {FIELD_TYPES.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
            {errors.field_observed && <p className="text-xs text-red-500 mt-1">{errors.field_observed}</p>}
          </div>
        </div>
      </fieldset>

      {/* Source Systems */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-medium text-gray-400 uppercase tracking-wider">Source Systems</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
            <p className="text-xs font-medium text-gray-500">Source System A</p>
            <input
              type="text"
              value={form.system_a_name}
              onChange={(e) => update('system_a_name', e.target.value)}
              placeholder="System name (e.g., Credentialing System)"
              className={inputClass('system_a_name')}
            />
            <input
              type="text"
              value={form.system_a_value}
              onChange={(e) => update('system_a_value', e.target.value)}
              placeholder="Value shown in this system"
              className={inputClass('system_a_value')}
            />
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
            <p className="text-xs font-medium text-gray-500">Source System B</p>
            <input
              type="text"
              value={form.system_b_name}
              onChange={(e) => update('system_b_name', e.target.value)}
              placeholder="System name (e.g., Payer Portal)"
              className={inputClass('system_b_name')}
            />
            <input
              type="text"
              value={form.system_b_value}
              onChange={(e) => update('system_b_value', e.target.value)}
              placeholder="Value shown in this system"
              className={inputClass('system_b_value')}
            />
          </div>
        </div>
      </fieldset>

      {/* Corrected Value */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-medium text-gray-400 uppercase tracking-wider">Resolution</legend>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Corrected Value <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.corrected_value}
            onChange={(e) => update('corrected_value', e.target.value)}
            placeholder="The verified, correct value"
            className={`${inputClass('corrected_value')} !border-slate-400 !bg-slate-50 font-semibold text-slate-800`}
          />
          {errors.corrected_value && <p className="text-xs text-red-500 mt-1">{errors.corrected_value}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Evidence Type <span className="text-red-500">*</span>
            </label>
            <select
              value={form.evidence_type}
              onChange={(e) => update('evidence_type', e.target.value)}
              className={inputClass('evidence_type')}
            >
              <option value="">Select evidence type...</option>
              {EVIDENCE_TYPES.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
            {errors.evidence_type && <p className="text-xs text-red-500 mt-1">{errors.evidence_type}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Evidence Notes</label>
          <textarea
            value={form.evidence_notes}
            onChange={(e) => update('evidence_notes', e.target.value)}
            rows={4}
            placeholder="Describe how you verified this value — include dates, names, reference numbers..."
            className={inputClass('evidence_notes')}
          />
        </div>
      </fieldset>

      <div className="pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="w-full md:w-auto px-8 py-2.5 bg-slate-700 text-white rounded-md text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Submitting...' : 'Submit Observation'}
        </button>
      </div>
    </form>
  )
}
