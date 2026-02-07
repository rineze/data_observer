import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ObservationDetail from '../components/ObservationDetail'
import ReviewPanel from '../components/ReviewPanel'

export default function Review({ session }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [observation, setObservation] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      const [obsResult, revResult] = await Promise.all([
        supabase.from('observations').select('*').eq('id', id).single(),
        supabase
          .from('observation_reviews')
          .select('*')
          .eq('observation_id', id)
          .order('reviewed_at', { ascending: false }),
      ])

      if (!obsResult.error) setObservation(obsResult.data)
      if (!revResult.error) setReviews(revResult.data || [])
      setLoading(false)
    }

    fetchData()
  }, [id])

  const handleReviewComplete = () => {
    navigate('/dashboard')
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-sm text-gray-400">Loading observation...</p>
      </div>
    )
  }

  if (!observation) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-sm text-gray-500">Observation not found.</p>
        <Link to="/dashboard" className="text-sm text-slate-600 hover:underline mt-2 inline-block">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link to="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Back to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Detail panel */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <ObservationDetail observation={observation} />
        </div>

        {/* Review panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <ReviewPanel
              observation={observation}
              session={session}
              onReviewComplete={handleReviewComplete}
            />
          </div>

          {/* Review history */}
          {reviews.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Review History</p>
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div key={rev.id} className="text-sm border-l-2 border-gray-200 pl-3">
                    <p className="text-gray-900 font-medium capitalize">{rev.decision}</p>
                    <p className="text-gray-500 text-xs">{rev.reviewer_email}</p>
                    {rev.comments && <p className="text-gray-600 mt-1">{rev.comments}</p>}
                    <p className="text-gray-400 text-xs mt-1">
                      {new Date(rev.reviewed_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
