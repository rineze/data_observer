import { useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function ReviewPanel({ observation, session, onReviewComplete }) {
  const [decision, setDecision] = useState(null)
  const [comments, setComments] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!decision) return

    if (decision === 'rejected' && !comments.trim()) {
      toast.error('A comment is required when rejecting.')
      return
    }

    setSubmitting(true)

    const { error: reviewError } = await supabase.from('observation_reviews').insert({
      observation_id: observation.id,
      reviewer_id: session.user.id,
      reviewer_email: session.user.email,
      decision,
      comments: comments.trim() || null,
    })

    if (reviewError) {
      toast.error('Failed to submit review.')
      setSubmitting(false)
      return
    }

    const { error: updateError } = await supabase
      .from('observations')
      .update({ status: decision })
      .eq('id', observation.id)

    if (updateError) {
      toast.error('Review saved but status update failed.')
      setSubmitting(false)
      return
    }

    toast.success(`Observation ${decision}.`)
    onReviewComplete()
  }

  if (observation.status !== 'pending') {
    return (
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <p className="text-sm text-gray-500">
          This observation has already been <span className="font-medium">{observation.status}</span>.
        </p>
      </div>
    )
  }

  return (
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
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-2.5 px-4 bg-slate-700 text-white rounded-md text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Submitting...' : `Confirm ${decision === 'approved' ? 'Approval' : 'Rejection'}`}
          </button>
        </>
      )}
    </div>
  )
}
