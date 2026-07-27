import React, { useState } from 'react'

export default function MemberRemovalModal({
  open,
  onClose,
  memberRow,
  currentExecMemberId,
  pendingProposal,
  onInitiateRemoval,
  onSecondExecConfirm,
  onCancelProposal,
}) {
  const [step1Confirm, setStep1Confirm] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!open || !memberRow) return null

  const name = `${memberRow.first_name} ${memberRow.last_name}`
  const awaiting =
    pendingProposal &&
    pendingProposal.status === 'awaiting_second' &&
    pendingProposal.member_id === memberRow.member_id
  const canSecondConfirm =
    awaiting &&
    currentExecMemberId &&
    String(pendingProposal.initiated_by) !== String(currentExecMemberId)
  const iAmInitiator =
    awaiting && currentExecMemberId && String(pendingProposal.initiated_by) === String(currentExecMemberId)

  const handleFirst = async () => {
    if (!step1Confirm) return
    setBusy(true)
    try {
      await onInitiateRemoval()
      setStep1Confirm(false)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const handleSecond = async () => {
    setBusy(true)
    try {
      await onSecondExecConfirm()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: 'block', zIndex: 1070 }}
        onClick={(e) => {
          if (e.target.className.includes('modal fade show')) onClose()
        }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header border-danger">
              <h5 className="modal-title text-danger">Removal from SPAN — executive confirmation</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <p>
                This does <strong>not</strong> automatically deactivate accounts or delete work already credited on the
                site. After two executives confirm, use the dual-confirmed list under Executive Conduct to remove them
                from the public directory when ready.
              </p>
              <p className="fw-semibold">{name}</p>

              {awaiting && (
                <div className="alert alert-warning">
                  A removal proposal is <strong>pending a second executive</strong>.
                  {iAmInitiator && <span> You initiated this step; another executive must confirm.</span>}
                  {canSecondConfirm && <span> You can confirm as the second executive.</span>}
                </div>
              )}

              {!awaiting && (
                <>
                  <div className="form-check mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="removalExecAck"
                      checked={step1Confirm}
                      onChange={(e) => setStep1Confirm(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="removalExecAck">
                      I understand this begins a two-executive removal confirmation for this member.
                    </label>
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={!step1Confirm || busy}
                    onClick={handleFirst}
                  >
                    {busy ? 'Saving…' : 'Submit my confirmation (step 1 of 2)'}
                  </button>
                </>
              )}

              {awaiting && canSecondConfirm && (
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={busy}
                  onClick={handleSecond}
                >
                  {busy ? 'Saving…' : 'I confirm as the second executive'}
                </button>
              )}

              {awaiting && onCancelProposal && iAmInitiator && (
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm mt-3 d-block"
                  disabled={busy}
                  onClick={() => onCancelProposal()}
                >
                  Cancel this proposal
                </button>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1065 }} />
    </>
  )
}
