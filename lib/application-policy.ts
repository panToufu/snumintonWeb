// Keep the database trigger's limit in sync when changing this policy.
export const MAX_OB_APPLICATIONS_PER_EVENT = 4;
export const OB_CAPACITY_ERROR_CODE = "OB_CAPACITY_REACHED";
export const OB_CAPACITY_ERROR_MESSAGE = `OB는 한 운동에 최대 ${MAX_OB_APPLICATIONS_PER_EVENT}명까지 신청할 수 있습니다. 현재 OB 신청이 마감되었습니다.`;
