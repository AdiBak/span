/** Anchor ids and default labels for dashboard section jump nav. */
export const DASHBOARD_SECTION_IDS = {
  yourInfo: 'dashboard-section-your-info',
  leaveExtension: 'dashboard-section-leave-extension',
  billManagement: 'dashboard-section-bill-management',
  billSubmission: 'dashboard-section-bill-submission',
  applications: 'dashboard-section-applications',
  ideasSuggestions: 'dashboard-section-ideas-suggestions',
  volunteerHours: 'dashboard-section-volunteer-hours',
  hrReports: 'dashboard-section-hr-reports',
  execConduct: 'dashboard-section-exec-conduct',
  memberManagement: 'dashboard-section-member-management',
  schoolsPartners: 'dashboard-section-schools-partners',
  mediumBlog: 'dashboard-section-medium-blog',
  changePassword: 'dashboard-section-change-password',
  resignFromSpan: 'dashboard-section-resign',
}

export const DASHBOARD_SECTION_LABELS = {
  yourInfo: 'Your Info',
  leaveExtension: 'Leave & Extension Requests',
  billManagement: 'Bill Management',
  billSubmission: 'Bill Submission',
  applications: 'New Member Applications',
  ideasSuggestions: 'Ideas & Suggestions',
  volunteerHours: 'Volunteer Hours',
  hrReports: 'HR Reports',
  execConduct: 'Executive Conduct',
  memberManagement: 'Member Management',
  schoolsPartners: 'Schools, Partners & Advisors',
  mediumBlog: 'Medium (Blog)',
  changePassword: 'Change Password',
  resignFromSpan: 'Resign from SPAN',
}

/**
 * Build sorted nav items from dashboardOrder and a visibility map (key → boolean).
 * Optional labelOverrides for keys like billManagement on team-lead view.
 */
export function buildDashboardSectionNavItems(dashboardOrder, visibility, labelOverrides = {}) {
  if (!dashboardOrder) return []

  return Object.entries(dashboardOrder)
    .filter(([key, order]) => order !== 99 && visibility[key] && DASHBOARD_SECTION_IDS[key])
    .sort(([, a], [, b]) => a - b)
    .map(([key]) => ({
      key,
      id: DASHBOARD_SECTION_IDS[key],
      label: labelOverrides[key] || DASHBOARD_SECTION_LABELS[key],
    }))
}

export function scrollToDashboardSection(sectionId) {
  const el = document.getElementById(sectionId)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
