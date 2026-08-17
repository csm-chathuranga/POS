import { api } from '../../app/baseApi';

export const customersApi = api.injectEndpoints({
  endpoints: build => ({
    getCustomers: build.query({
      query: params => ({ url: '/customers', params }),
      keepUnusedDataFor: 600,
      providesTags: (r) =>
        r ? [...r.data.map(c => ({ type: 'Customers', id: c.id })), { type: 'Customers', id: 'LIST' }]
          : [{ type: 'Customers', id: 'LIST' }],
    }),
    createCustomer: build.mutation({
      query: body => ({ url: '/customers', method: 'POST', body }),
      invalidatesTags: [{ type: 'Customers', id: 'LIST' }],
    }),
    updateCustomer: build.mutation({
      query: ({ id, ...body }) => ({ url: `/customers/${id}`, method: 'PUT', body }),
      invalidatesTags: (r, e, { id }) => [{ type: 'Customers', id }, { type: 'Customers', id: 'LIST' }],
    }),
    deleteCustomer: build.mutation({
      query: id => ({ url: `/customers/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Customers', id: 'LIST' }],
    }),
    settleCredit: build.mutation({
      query: ({ id, ...body }) => ({ url: `/customers/${id}/settle-credit`, method: 'POST', body }),
      invalidatesTags: (r, e, { id }) => [
        { type: 'Customers', id },
        { type: 'Customers', id: 'LIST' },
        { type: 'Customers', id: `CREDIT-${id}` },
      ],
    }),
    getCreditHistory: build.query({
      query: id => `/customers/${id}/credit-history`,
      providesTags: (r, e, id) => [{ type: 'Customers', id: `CREDIT-${id}` }],
    }),
    quickAddCustomer: build.mutation({
      query: body => ({ url: '/customers/quick-add', method: 'POST', body }),
      invalidatesTags: [{ type: 'Customers', id: 'LIST' }],
    }),
    adjustCredit: build.mutation({
      query: ({ id, ...body }) => ({ url: `/customers/${id}/credit-adjustment`, method: 'POST', body }),
      invalidatesTags: (r, e, { id }) => [
        { type: 'Customers', id },
        { type: 'Customers', id: 'LIST' },
        { type: 'Customers', id: `CREDIT-${id}` },
      ],
    }),
  }),
});

export const {
  useGetCustomersQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
  useSettleCreditMutation,
  useGetCreditHistoryQuery,
  useQuickAddCustomerMutation,
  useAdjustCreditMutation,
} = customersApi;
