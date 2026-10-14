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
  }),
  overrideExisting: false,
});

export const {
  useGetEmployeesQuery,
  useGetEmployeeQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
  useGetSalaryHistoryQuery,
  usePaySalaryMutation,
} = employeesApi;
