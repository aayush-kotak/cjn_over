export default function ConfirmModal({ title, children, onConfirm, onCancel, confirmText = 'Yes, Save Entry', loading = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto modal-content">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-light p-5 rounded-t-2xl">
          <h2 className="text-white text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">📋</span> {title}
          </h2>
          <p className="text-green-100 text-sm mt-1">Please review the details below before saving</p>
        </div>

        {/* Content */}
        <div className="p-5">
          {children}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-5 pt-0">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl border-2 border-border text-text-secondary font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-primary-light text-white font-bold text-sm hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : (
              <>✅ {confirmText}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
