import React from 'react'

function CollaboratorAvatars({ collaborators, members, billIndex, onCollaboratorClick }) {
  if (!collaborators || !Array.isArray(collaborators) || collaborators.length === 0) {
    return null
  }

  const findMemberByName = (fullName) => {
    const lowerName = fullName.trim().toLowerCase()
    return members.find(m => {
      const memberFullName = `${m.first_name} ${m.last_name}`.toLowerCase()
      return memberFullName === lowerName
    })
  }

  const maxToShow = 3
  const sortedNames = [...collaborators].sort((a, b) => {
    const aLast = a.trim().split(' ').slice(-1)[0].toLowerCase()
    const bLast = b.trim().split(' ').slice(-1)[0].toLowerCase()
    return aLast.localeCompare(bLast)
  })

  const toShowNames = sortedNames.slice(0, maxToShow)
  const collaboratorMembers = toShowNames
    .map(name => findMemberByName(name))
    .filter(Boolean)

  const extraCount = collaborators.length - maxToShow

  const handleClick = (e) => {
    e.preventDefault()
    if (onCollaboratorClick) {
      onCollaboratorClick(collaborators, billIndex)
    }
  }

  return (
    <div
      className="collaborator-group"
      style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
      onClick={handleClick}
    >
      {collaboratorMembers.map((collab, i) => (
        <img
          key={i}
          src={`https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/members-images/${collab.image}`}
          alt={`${collab.first_name} ${collab.last_name}`}
          title={`${collab.first_name} ${collab.last_name}`}
          className="collaborator-avatar"
          style={{ zIndex: 100 - i }}
        />
      ))}
      {extraCount > 0 && (
        <div
          className="collaborator-avatar collaborator-extra"
          style={{
            zIndex: 95,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: '#6c757d',
            color: 'white',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            borderRadius: '50%',
            cursor: 'pointer',
            marginLeft: '-10px',
            width: '35px',
            height: '35px'
          }}
        >
          +{extraCount}
        </div>
      )}
    </div>
  )
}

export default CollaboratorAvatars

