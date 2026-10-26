import { api } from '../../app/baseApi';

export const employeesApi = api.injectEndpoints({
  endpoints: build => ({
    getEmployees: build.query({
      query: () => '/employees',
      providesTags: ['Employees'],
    }),
    getEmployee: build.query({
      query: id => `/employees/${id}`,
      providesTags: ['Employees'],
    }),
    createEmployee: build.mutation({
      query: body => ({ url: '/employees', method: 'POST', body }),
      invalidatesTags: ['Employees'],
    }),
    updateEmployee: build.mutation({
      query: ({ id, ...body }) => ({ url: `/employees/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Employees'],
    }),
    deleteEmployee: build.mutation({
      query: id => ({ url: `/employees/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Employees'],
    }),
    getSalaryHistory: build.query({
      query: id => `/employees/${id}/salary-history`,
      providesTags: ['Employees'],
    }),
    paySalary: build.mutation({
      query: ({ id, ...body }) => ({ url: `/employees/${id}/pay-salary`, method: 'POST', body }),
      invalidatesTags: ['Employees', 'Accounting'],
    }),

    // ── Cash Advances ─────────────────────────────────────────────────────────
    getAdvances: build.query({
      query: id => `/employees/${id}/advances`,
      providesTags: ['Advances'],
    }),
    addAdvance: build.mutation({
      query: ({ id, ...body }) => ({ url: `/employees/${id}/advances`, method: 'POST', body }),
      invalidatesTags: ['Advances'],
    }),
    deleteAdvance: build.mutation({
      query: ({ employeeId, advId }) => ({ url: `/employees/${employeeId}/advances/${advId}`, method: 'DELETE' }),
      invalidatesTags: ['Advances'],
    }),

    // ── Attendance ────────────────────────────────────────────────────────────
    getAttendanceSettings: build.query({
      query: () => '/attendance/settings',
      providesTags: ['Attendance'],
    }),
    updateAttendanceSettings: build.mutation({
      query: body => ({ url: '/attendance/settings', method: 'PUT', body }),
      invalidatesTags: ['Attendance'],
    }),
    syncAttendance: build.mutation({
      query: () => ({ url: '/attendance/sync', method: 'POST' }),
      invalidatesTags: ['Attendance'],
    }),
    getAttendanceRecords: build.query({
      query: ({ month, employee_id } = {}) => {
        const params = new URLSearchParams();
        if (month)       params.set('month', month);
        if (employee_id) params.set('employee_id', employee_id);
        return `/attendance/records?${params}`;
      },
      providesTags: ['Attendance'],
    }),
    getAttendanceSummary: build.query({
      query: ({ month }) => `/attendance/summary?month=${month}`,
      providesTags: ['Attendance'],
    }),
    addAttendanceRecord: build.mutation({
      query: body => ({ url: '/attendance/records', method: 'POST', body }),
      invalidatesTags: ['Attendance'],
    }),
    deleteAttendanceRecord: build.mutation({
      query: id => ({ url: `/attendance/records/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Attendance'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAdvancesQuery,
  useAddAdvanceMutation,
  useDeleteAdvanceMutation,
  useGetEmployeesQuery,
  useGetEmployeeQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
  useGetSalaryHistoryQuery,
  usePaySalaryMutation,
  useGetAttendanceSettingsQuery,
  useUpdateAttendanceSettingsMutation,
  useSyncAttendanceMutation,
  useGetAttendanceRecordsQuery,
  useGetAttendanceSummaryQuery,
  useAddAttendanceRecordMutation,
  useDeleteAttendanceRecordMutation,
} = employeesApi;
