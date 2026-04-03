import React from 'react'

export default function MemberManagementSection({
  sectionStyleOrder,
  imageBaseUrl,
  allMembersForManagement,
  execMemberPhotoInputRef,
  onExecPhotoFileChange,
  onAddMember,
  memberPhotoError,
  memberPhotoSuccess,
  memberPhotoLoading,
  memberPhotoTarget,
  formatDate,
  formatPhone,
  showViewAsDashboardLink,
  onChangeProfilePhoto,
  onEditMember,
}) {
  const active = allMembersForManagement.filter((m) => m.active !== false)
  const inactive = allMembersForManagement.filter((m) => m.active === false)

  return (
    <section className="mt-5" style={{ order: sectionStyleOrder }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3>Member Management</h3>
        <button type="button" className="btn btn-dark" onClick={onAddMember}>
          <i className="bi bi-person-plus me-2"></i>Add New Member
        </button>
      </div>

      <div className="alert alert-info">
        <i className="bi bi-info-circle me-2"></i>
        When you add a new member, they will automatically receive an email invitation to set up their account.
      </div>

      <input
        ref={execMemberPhotoInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="d-none"
        onChange={onExecPhotoFileChange}
      />
      {(memberPhotoError || memberPhotoSuccess) && (
        <div className="mb-3">
          {memberPhotoError && <div className="small text-danger">{memberPhotoError}</div>}
          {memberPhotoSuccess && <div className="small text-success">{memberPhotoSuccess}</div>}
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="mb-4">
            <h4 className="mb-3">Active Members</h4>
            <div style={{ maxHeight: '600px', overflowY: 'auto', overflowX: 'hidden' }}>
              {active.length > 0 ? (
                <div className="accordion" id="activeMembersAccordion">
                  {active.map((memberItem) => (
                    <div key={memberItem.member_id} className="accordion-item mb-2 shadow-sm border rounded">
                      <h2 className="accordion-header">
                        <button
                          className="accordion-button collapsed bg-white text-dark"
                          type="button"
                          data-bs-toggle="collapse"
                          data-bs-target={`#collapseActiveMember${memberItem.member_id}`}
                          aria-expanded="false"
                        >
                          <div className="d-flex w-100 align-items-center gap-3">
                            {memberItem.image ? (
                              <img
                                src={`${imageBaseUrl}/${memberItem.image}`}
                                alt=""
                                className="rounded-circle flex-shrink-0"
                                style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                              />
                            ) : (
                              <div
                                className="rounded-circle flex-shrink-0 bg-light text-dark d-flex align-items-center justify-content-center"
                                style={{ width: '40px', height: '40px', fontSize: '0.9rem' }}
                              >
                                {memberItem.first_name?.[0]}
                                {memberItem.last_name?.[0]}
                              </div>
                            )}
                            <div className="d-flex flex-column text-start">
                              <div className="d-flex align-items-center gap-2">
                                <span className="fw-bold">
                                  {memberItem.first_name} {memberItem.last_name}
                                </span>
                                <span className="badge bg-secondary">{memberItem.role || 'No Role'}</span>
                              </div>
                              <small className="text-muted">{memberItem.email}</small>
                            </div>
                          </div>
                        </button>
                      </h2>
                      <div
                        id={`collapseActiveMember${memberItem.member_id}`}
                        className="accordion-collapse collapse"
                        data-bs-parent="#activeMembersAccordion"
                      >
                        <div className="accordion-body">
                          <div className="row g-3">
                            <div className="col-12 d-flex align-items-center gap-3 mb-2">
                              {memberItem.image ? (
                                <img
                                  src={`${imageBaseUrl}/${memberItem.image}`}
                                  alt=""
                                  className="rounded-circle"
                                  style={{ width: '64px', height: '64px', objectFit: 'cover' }}
                                />
                              ) : (
                                <div
                                  className="rounded-circle bg-light text-dark d-flex align-items-center justify-content-center"
                                  style={{ width: '64px', height: '64px', fontSize: '1.25rem' }}
                                >
                                  {memberItem.first_name?.[0]}
                                  {memberItem.last_name?.[0]}
                                </div>
                              )}
                              <div>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={(ev) => {
                                    ev.stopPropagation()
                                    onChangeProfilePhoto(memberItem)
                                  }}
                                  disabled={memberPhotoLoading}
                                >
                                  {memberPhotoLoading && memberPhotoTarget === memberItem.member_id ? (
                                    <span className="spinner-border spinner-border-sm me-1" />
                                  ) : (
                                    <i className="bi bi-camera me-1" />
                                  )}
                                  Change profile picture
                                </button>
                              </div>
                            </div>
                            <div className="col-md-6">
                              <strong>Name:</strong>
                              <p className="mt-1 mb-0">
                                {memberItem.first_name} {memberItem.last_name}
                              </p>
                            </div>
                            <div className="col-md-6">
                              <strong>Email:</strong>
                              <p className="mt-1 mb-0">
                                <a href={`mailto:${memberItem.email}`}>{memberItem.email}</a>
                              </p>
                            </div>
                            <div className="col-md-6">
                              <strong>Role:</strong>
                              <p className="mt-1 mb-0">{memberItem.role || '-'}</p>
                            </div>
                            <div className="col-md-6">
                              <strong>Phone:</strong>
                              <p className="mt-1 mb-0">
                                {memberItem.phone ? (
                                  <a href={`tel:${memberItem.phone}`}>
                                    {formatPhone(memberItem.phone.toString())}
                                  </a>
                                ) : (
                                  '-'
                                )}
                              </p>
                            </div>
                            {memberItem.school_name && (
                              <div className="col-md-6">
                                <strong>School:</strong>
                                <p className="mt-1 mb-0">{memberItem.school_name}</p>
                              </div>
                            )}
                            {(memberItem.city || memberItem.state) && (
                              <div className="col-md-6">
                                <strong>Location:</strong>
                                <p className="mt-1 mb-0">
                                  {memberItem.city && memberItem.state
                                    ? `${memberItem.city}, ${memberItem.state}`
                                    : memberItem.city || memberItem.state || '-'}
                                </p>
                              </div>
                            )}
                            <div className="col-12">
                              <strong>Permissions:</strong>
                              <div className="d-flex gap-1 flex-wrap mt-1">
                                {memberItem.volunteer && <span className="badge bg-primary">Volunteer</span>}
                                {memberItem.applications && <span className="badge bg-success">Applications</span>}
                                {memberItem.bills && <span className="badge bg-info">Bills</span>}
                                {memberItem.registration && (
                                  <span className="badge bg-warning text-dark">Registration</span>
                                )}
                                {(memberItem.blog === true || memberItem.blog === 'true') && (
                                  <span className="badge bg-secondary">Blog</span>
                                )}
                                {!memberItem.volunteer &&
                                  !memberItem.applications &&
                                  !memberItem.bills &&
                                  !memberItem.registration &&
                                  !(memberItem.blog === true || memberItem.blog === 'true') && (
                                    <span className="text-muted">No permissions</span>
                                  )}
                              </div>
                            </div>
                            {memberItem.start_date && (
                              <div className="col-md-6">
                                <strong>Start Date:</strong>
                                <p className="mt-1 mb-0">{formatDate(memberItem.start_date)}</p>
                              </div>
                            )}
                            <div className="col-12 mt-2">
                              <div className="d-flex gap-2 flex-wrap">
                                {showViewAsDashboardLink && (
                                  <a
                                    href={`/dashboard?viewAs=${memberItem.member_id}`}
                                    className="btn btn-sm btn-outline-dark"
                                  >
                                    <i className="bi bi-person-square me-1"></i>View dashboard
                                  </a>
                                )}
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => onEditMember(memberItem)}
                                >
                                  <i className="bi bi-pencil me-1"></i>Edit
                                </button>
                                <a
                                  href={`mailto:${memberItem.email}`}
                                  className="btn btn-sm btn-outline-secondary"
                                >
                                  <i className="bi bi-envelope me-1"></i>Email
                                </a>
                                {memberItem.phone && (
                                  <a
                                    href={`sms:${memberItem.phone}`}
                                    className="btn btn-sm btn-outline-secondary"
                                  >
                                    <i className="bi bi-chat-dots me-1"></i>Text
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted">No active members found.</p>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="mb-4">
            <h4 className="mb-3">Inactive Members</h4>
            <div style={{ maxHeight: '600px', overflowY: 'auto', overflowX: 'hidden' }}>
              {inactive.length > 0 ? (
                <div className="accordion" id="inactiveMembersAccordion">
                  {inactive.map((memberItem) => (
                    <div
                      key={memberItem.member_id}
                      className="accordion-item mb-2 shadow-sm border rounded opacity-75"
                    >
                      <h2 className="accordion-header">
                        <button
                          className="accordion-button collapsed bg-white text-dark"
                          type="button"
                          data-bs-toggle="collapse"
                          data-bs-target={`#collapseInactiveMember${memberItem.member_id}`}
                          aria-expanded="false"
                        >
                          <div className="d-flex w-100 align-items-center gap-3">
                            {memberItem.image ? (
                              <img
                                src={`${imageBaseUrl}/${memberItem.image}`}
                                alt=""
                                className="rounded-circle flex-shrink-0"
                                style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                              />
                            ) : (
                              <div
                                className="rounded-circle flex-shrink-0 bg-light text-dark d-flex align-items-center justify-content-center"
                                style={{ width: '40px', height: '40px', fontSize: '0.9rem' }}
                              >
                                {memberItem.first_name?.[0]}
                                {memberItem.last_name?.[0]}
                              </div>
                            )}
                            <div className="d-flex flex-column text-start">
                              <div className="d-flex align-items-center gap-2">
                                <span className="fw-bold">
                                  {memberItem.first_name} {memberItem.last_name}
                                </span>
                                <span className="badge bg-secondary">{memberItem.role || 'No Role'}</span>
                              </div>
                              <small className="text-muted">{memberItem.email}</small>
                            </div>
                          </div>
                        </button>
                      </h2>
                      <div
                        id={`collapseInactiveMember${memberItem.member_id}`}
                        className="accordion-collapse collapse"
                        data-bs-parent="#inactiveMembersAccordion"
                      >
                        <div className="accordion-body">
                          <div className="row g-3">
                            <div className="col-12 d-flex align-items-center gap-3 mb-2">
                              {memberItem.image ? (
                                <img
                                  src={`${imageBaseUrl}/${memberItem.image}`}
                                  alt=""
                                  className="rounded-circle"
                                  style={{ width: '64px', height: '64px', objectFit: 'cover' }}
                                />
                              ) : (
                                <div
                                  className="rounded-circle bg-light text-dark d-flex align-items-center justify-content-center"
                                  style={{ width: '64px', height: '64px', fontSize: '1.25rem' }}
                                >
                                  {memberItem.first_name?.[0]}
                                  {memberItem.last_name?.[0]}
                                </div>
                              )}
                              <div>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={(ev) => {
                                    ev.stopPropagation()
                                    onChangeProfilePhoto(memberItem)
                                  }}
                                  disabled={memberPhotoLoading}
                                >
                                  {memberPhotoLoading && memberPhotoTarget === memberItem.member_id ? (
                                    <span className="spinner-border spinner-border-sm me-1" />
                                  ) : (
                                    <i className="bi bi-camera me-1" />
                                  )}
                                  Change profile picture
                                </button>
                              </div>
                            </div>
                            <div className="col-md-6">
                              <strong>Name:</strong>
                              <p className="mt-1 mb-0">
                                {memberItem.first_name} {memberItem.last_name}
                              </p>
                            </div>
                            <div className="col-md-6">
                              <strong>Email:</strong>
                              <p className="mt-1 mb-0">
                                <a href={`mailto:${memberItem.email}`}>{memberItem.email}</a>
                              </p>
                            </div>
                            <div className="col-md-6">
                              <strong>Role:</strong>
                              <p className="mt-1 mb-0">{memberItem.role || '-'}</p>
                            </div>
                            <div className="col-md-6">
                              <strong>Phone:</strong>
                              <p className="mt-1 mb-0">
                                {memberItem.phone ? (
                                  <a href={`tel:${memberItem.phone}`}>
                                    {formatPhone(memberItem.phone.toString())}
                                  </a>
                                ) : (
                                  '-'
                                )}
                              </p>
                            </div>
                            {memberItem.school_name && (
                              <div className="col-md-6">
                                <strong>School:</strong>
                                <p className="mt-1 mb-0">{memberItem.school_name}</p>
                              </div>
                            )}
                            {(memberItem.city || memberItem.state) && (
                              <div className="col-md-6">
                                <strong>Location:</strong>
                                <p className="mt-1 mb-0">
                                  {memberItem.city && memberItem.state
                                    ? `${memberItem.city}, ${memberItem.state}`
                                    : memberItem.city || memberItem.state || '-'}
                                </p>
                              </div>
                            )}
                            <div className="col-12">
                              <strong>Permissions:</strong>
                              <div className="d-flex gap-1 flex-wrap mt-1">
                                {memberItem.volunteer && <span className="badge bg-primary">Volunteer</span>}
                                {memberItem.applications && <span className="badge bg-success">Applications</span>}
                                {memberItem.bills && <span className="badge bg-info">Bills</span>}
                                {memberItem.registration && (
                                  <span className="badge bg-warning text-dark">Registration</span>
                                )}
                                {(memberItem.blog === true || memberItem.blog === 'true') && (
                                  <span className="badge bg-secondary">Blog</span>
                                )}
                                {!memberItem.volunteer &&
                                  !memberItem.applications &&
                                  !memberItem.bills &&
                                  !memberItem.registration &&
                                  !(memberItem.blog === true || memberItem.blog === 'true') && (
                                    <span className="text-muted">No permissions</span>
                                  )}
                              </div>
                            </div>
                            {memberItem.start_date && (
                              <div className="col-md-6">
                                <strong>Start Date:</strong>
                                <p className="mt-1 mb-0">{formatDate(memberItem.start_date)}</p>
                              </div>
                            )}
                            <div className="col-12 mt-2">
                              <div className="d-flex gap-2 flex-wrap">
                                {showViewAsDashboardLink && (
                                  <a
                                    href={`/dashboard?viewAs=${memberItem.member_id}`}
                                    className="btn btn-sm btn-outline-dark"
                                  >
                                    <i className="bi bi-person-square me-1"></i>View dashboard
                                  </a>
                                )}
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => onEditMember(memberItem)}
                                >
                                  <i className="bi bi-pencil me-1"></i>Edit
                                </button>
                                <a
                                  href={`mailto:${memberItem.email}`}
                                  className="btn btn-sm btn-outline-secondary"
                                >
                                  <i className="bi bi-envelope me-1"></i>Email
                                </a>
                                {memberItem.phone && (
                                  <a
                                    href={`sms:${memberItem.phone}`}
                                    className="btn btn-sm btn-outline-secondary"
                                  >
                                    <i className="bi bi-chat-dots me-1"></i>Text
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted">No inactive members found.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
