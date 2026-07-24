// Canonical color palette, consolidating the near-identical `const C = {...}`
// objects duplicated across pages/components (LogNew, AllLogs, Dashboard,
// EditLogModal, DisputeModal, buyer/Dashboard). Existing per-file copies are
// left as-is; new shared components import from here.
export const C = {
  primary:     '#1e6b3c',
  primaryDark: '#155230',
  accent:      '#E8A33D',
  bg:          '#F4F7F5',
  text:        '#1A1A1A',
  muted:       '#6B7280',
  border:      '#E5E7EB',
  white:       '#FFFFFF',
  danger:      '#B3261E',
  dangerBg:    '#FDECEA',
  successBg:   '#E7F4EC',
  warnBg:      '#FBF3E4',
  warnText:    '#8A5A14',
};
