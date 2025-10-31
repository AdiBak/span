import React from 'react'

function CollaboratorModal({ collaborators, bill, members, onClose }) {
  const findMemberByName = (fullName) => {
    const lowerName = fullName.trim().toLowerCase()
    return members.find(m => {
      const memberFullName = `${m.first_name} ${m.last_name}`.toLowerCase()
      return memberFullName === lowerName
    })
  }

  const fullCollaborators = (collaborators || [])
    .map(name => findMemberByName(name))
    .filter(Boolean)
    .sort((a, b) => a.last_name.toLowerCase().localeCompare(b.last_name.toLowerCase()))

  if (!bill) return null

  return (
    <div 
      className="modal fade show d-block" 
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} 
      tabIndex="-1"
      onClick={onClose}
    >
      <div 
        className="modal-dialog modal-dialog-centered"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <img
                className="state-image"
                src={`/assets/images/states/${bill.state}.svg`}
                alt={`${bill.state} flag`}
                style={{ width: '20px', height: 'auto', marginRight: '8px' }}
              />
              {bill.state} {bill.name} Collaborators
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            {fullCollaborators.length > 0 ? (
              fullCollaborators.map((collab, idx) => (
                <div key={idx} className="d-flex align-items-center px-3 mb-2">
                  <a href={`/directory.html?search=${collab.first_name}+${collab.last_name}`}>
                    <img
                      src={`https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/members-images/${collab.image}`}
                      alt={`${collab.first_name} ${collab.last_name}`}
                      className="collaborator-avatar me-2"
                      style={{ width: '40px', height: '40px', border: '2px solid #ddd', borderRadius: '50%' }}
                    />
                  </a>
                  <span>{collab.first_name} {collab.last_name}</span>
                </div>
              ))
            ) : (
              <p>No collaborators info found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CollaboratorModal

