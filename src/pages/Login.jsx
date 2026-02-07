import { useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const TEST_EMAIL = 'dantest@test.com'
const TEST_PASSWORD = 'testytest'

export default function Login() {
  const [loading, setLoading] = useState(false)

  const handleTestLogin = async () => {
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })

    if (error) {
      toast.error(error.message)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-lg font-bold">PD</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Provider Data Observer</h1>
          <p className="text-sm text-gray-500 mt-1">Document and review enrollment data discrepancies</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-4 text-center">
            Pilot demo — click below to sign in as a test user.
          </p>

          <button
            onClick={handleTestLogin}
            disabled={loading}
            className="w-full py-2.5 bg-slate-700 text-white rounded-md text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In as Test User'}
          </button>

          <p className="text-xs text-gray-400 mt-3 text-center">dantest@test.com</p>
        </div>
      </div>
    </div>
  )
}
