import React from 'react'
import { memberLegalName, memberSiteDisplayName } from '../lib/memberDisplayName'

function CollaboratorAvatars({ collaborators, members, billIndex, onCollaboratorClick }) {
  if (!collaborators || !Array.isArray(collaborators) || collaborators.length === 0) {
    return null
  }

  const findMemberByName = (fullName) => {
    const lowerName = fullName.trim().toLowerCase()
    return members.find((m) => {
      const legal = memberLegalName(m).toLowerCase()
      const site = memberSiteDisplayName(m).toLowerCase()
      const legacy = `${m.first_name || ''} ${m.last_name || ''}`.trim().toLowerCase()
      return legal === lowerName || site === lowerName || legacy === lowerName
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
          alt={memberSiteDisplayName(collab)}
          title={memberSiteDisplayName(collab)}
          className="collaborator-avatar"
          loading="lazy"
          decoding="async"
          width="35"
          height="35"
          style={{ 
            zIndex: 100 - i,
            width: '35px',
            height: '35px',
            objectFit: 'cover',
            borderRadius: '50%'
          }}
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

