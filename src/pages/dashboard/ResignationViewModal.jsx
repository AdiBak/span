import React, { useState, useEffect, useMemo } from 'react'
import { RESIGN_STATUS_LABEL, LEGACY_RESIGN_STATUS_LABEL, resignStatusBadgeClass } from './resignationStatusConfig'

export default function ResignationViewModal({
  open,
  row,
  memberName,
  memberActive = true,
  formatDateLong,
  onClose,
  onUpdateResignationStatus,
  onDelete,
  onDeactivateFromDirectory,
}) {
  const [statusSaving, setStatusSaving] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [localStatus, setLocalStatus] = useState(row?.status ?? '')

  useEffect(() => {
    if (row) setLocalStatus(row.status ?? '')
  }, [row?.resignation_id, row?.status])

  const statusDisplay =
    RESIGN_STATUS_LABEL[localStatus] || LEGACY_RESIGN_STATUS_LABEL[localStatus] || localStatus

  const statusButtons = useMemo(() => {
    const base = Object.keys(RESIGN_STATUS_LABEL)
    if (!RESIGN_STATUS_LABEL[localStatus] && localStatus) return [localStatus, ...base]
    return base
  }, [localStatus])

  const statusButtonClass = (status, active) => {
    if (status === 'requested') return active ? 'btn-warning' : 'btn-outline-warning'
    if (status === 'meeting_scheduled') return active ? 'btn-primary' : 'btn-outline-primary'
    if (status === 'met') return active ? 'btn-success' : 'btn-outline-success'
    if (status === 'honorable_letter_sent') return active ? 'btn-dark' : 'btn-outline-dark'
    if (status === 'withdrawn') return active ? 'btn-secondary' : 'btn-outline-secondary'
    return active ? 'btn-secondary' : 'btn-outline-secondary'
  }

  const handleStatusChange = async (next) => {
    if (!row?.resignation_id) return
    if (next === localStatus) return
    setStatusSaving(true)
    try {
      await onUpdateResignationStatus(row.resignation_id, next)
      setLocalStatus(next)
    } finally {
      setStatusSaving(false)
    }
  }

  if (!open || !row) return null

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: 'block', zIndex: 1065 }}
        onClick={(e) => {
          if (e.target.className.includes('modal fade show')) onClose()
        }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Resignation request</h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <dl className="row mb-0 small">
                <dt className="col-sm-3 text-muted">Member</dt>
                <dd className="col-sm-9">{memberName}</dd>
                <dt className="col-sm-3 text-muted">Submitted</dt>
                <dd className="col-sm-9">{formatDateLong(row.created_at)}</dd>
                <dt className="col-sm-3 text-muted align-top pt-1">Status</dt>
                <dd className="col-sm-9">
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <span className={`badge ${resignStatusBadgeClass(localStatus)}`}>{statusDisplay}</span>
                  </div>
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {statusButtons.map((status) => {
                      const label = RESIGN_STATUS_LABEL[status] || LEGACY_RESIGN_STATUS_LABEL[status] || status
                      const active = localStatus === status
                      const tone = statusButtonClass(status, active)
                      return (
                        <button
                          key={status}
                          type="button"
                          className={`btn btn-sm ${tone}`}
                          onClick={() => handleStatusChange(status)}
                          disabled={statusSaving}
                        >
                          {label}
                        </button>
                      )
                    })}
                    {statusSaving && (
                      <span className="spinner-border spinner-border-sm text-secondary" role="status" />
                    )}
                  </div>
                </dd>
                {row.directors_notified_at && (
                  <>
                    <dt className="col-sm-3 text-muted">Directors notified</dt>
                    <dd className="col-sm-9">{formatDateLong(row.directors_notified_at)}</dd>
                  </>
                )}
                <dt className="col-sm-3 text-muted align-top pt-1">Message</dt>
                <dd className="col-sm-9">
                  <div className="border rounded bg-light p-3" style={{ whiteSpace: 'pre-wrap' }}>
                    {row.message?.trim() ? (
                      row.message
                    ) : (
                      <span className="text-muted fst-italic">No message provided.</span>
                    )}
                  </div>
                </dd>
                {row.exec_notes?.trim() && (
                  <>
                    <dt className="col-sm-3 text-muted align-top pt-1">Exec notes</dt>
                    <dd className="col-sm-9">
                      <div className="border rounded p-3 small" style={{ whiteSpace: 'pre-wrap' }}>
                        {row.exec_notes}
                      </div>
                    </dd>
                  </>
                )}
              </dl>

              {localStatus === 'honorable_letter_sent' && (
                <div className="alert alert-secondary mt-3 mb-0">
                  <div className="fw-semibold mb-1">Directory</div>
                  {memberActive === false ? (
                    <p className="small mb-0 text-muted">Already removed from directory.</p>
                  ) : typeof onDeactivateFromDirectory === 'function' ? (
                    <>
                      <p className="small mb-2">
                        Honorable letter is sent. Confirm to hide this member from the public directory.
                        Prior credited work stays on the site.
                      </p>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        disabled={deactivating}
                        onClick={async () => {
                          setDeactivating(true)
                          try {
                            await onDeactivateFromDirectory(row.member_id)
                          } finally {
                            setDeactivating(false)
                          }
                        }}
                      >
                        {deactivating ? 'Removing…' : 'Remove from directory'}
                      </button>
                    </>
                  ) : null}
                </div>
              )}
            </div>
            <div className="modal-footer">
              {typeof onDelete === 'function' && (
                <button
                  type="button"
                  className="btn btn-outline-danger me-auto"
                  onClick={async () => {
                    const ok = await onDelete(row.resignation_id)
                    if (ok !== false) onClose()
                  }}
                >
                  <i className="bi bi-trash me-1" />
                  Delete request
                </button>
              )}
              <button type="button" className="btn btn-dark" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1060 }} />
    </>
  )
}
