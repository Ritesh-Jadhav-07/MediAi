export const ROLES = {
  PATIENT: 'PATIENT',
  DOCTOR: 'DOCTOR',
  ADMIN: 'ADMIN',
};

export const TOKEN_KEY = 'accessToken';

export const DASHBOARD_PATH = {
  PATIENT: '/patient/dashboard',
  DOCTOR: '/doctor/dashboard',
  ADMIN: '/admin/dashboard',
};

export const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

export const BLOOD_GROUP_OPTIONS = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
].map((value) => ({ value, label: value }));

export const DAYS_OF_WEEK = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

export const VERIFICATION_STATUS = {
  PENDING: 'PENDING',
  UNDER_REVIEW: 'UNDER_REVIEW',
  INFO_REQUIRED: 'INFO_REQUIRED',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED',
};
