import ObservationForm from '../components/ObservationForm'

export default function Submit({ session }) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Submit Observation</h1>
        <p className="text-sm text-gray-500 mt-1">
          Document a data discrepancy you've identified and verified across provider enrollment systems.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <ObservationForm session={session} />
      </div>
    </div>
  )
}
