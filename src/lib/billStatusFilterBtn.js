/** Bootstrap btn classes for bill status filter chips (filled when active). */
const STATUS_FILTER_BTNS = {
  all: ['btn-secondary', 'btn-outline-secondary'],
  under_review: ['btn-warning', 'btn-outline-warning'],
  approved: ['btn-success', 'btn-outline-success'],
  modified: ['btn-info', 'btn-outline-info'],
  rejected: ['btn-danger', 'btn-outline-danger'],
}

export function billStatusFilterBtnClass(key, active) {
  const pair = STATUS_FILTER_BTNS[key] || STATUS_FILTER_BTNS.all
  return active ? pair[0] : pair[1]
}
