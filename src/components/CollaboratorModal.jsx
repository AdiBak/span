import React from 'react'

function CollaboratorModal({ collaborators, bill, members, onClose }) {
  // Map state abbreviations/variations to full state names for SVG files
  const getStateFileName = (state) => {
    if (!state) return 'United States'
    
    const stateMap = {
      'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
      'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
      'DC': 'District of Columbia', 'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii',
      'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
      'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine',
      'MD': 'Maryland', 'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota',
      'MS': 'Mississippi', 'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska',
      'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico',
      'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
      'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island',
      'SC': 'South Carolina', 'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas',
      'UT': 'Utah', 'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington',
      'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming', 'US': 'United States'
    }
    
    const stateUpper = state.toUpperCase()
    if (stateMap[stateUpper]) {
      return stateMap[stateUpper]
    }
    
    const fullStateNames = Object.values(stateMap)
    const matched = fullStateNames.find(name => name.toLowerCase() === state.toLowerCase())
    if (matched) {
      return matched
    }
    
    return state
  }
  
  const stateFileName = getStateFileName(bill.state)
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
                src={`/assets/images/states/${stateFileName}.svg`}
                alt={`${bill.state} flag`}
                style={{ width: '20px', height: 'auto', marginRight: '8px' }}
                onError={(e) => {
                  e.target.src = '/assets/images/states/United States.svg'
                }}
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

