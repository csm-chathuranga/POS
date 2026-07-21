import { api } from '../../app/baseApi';

export const salesApi = api.injectEndpoints({
  endpoints: build => ({
    getSales: build.query({
      query: params => ({ url: '/sales', params }),
      providesTags: (r) =>
        r ? [...r.data.map(s => ({ type: 'Sales', id: s.id })), { type: 'Sales', id: 'LIST' }]
          : [{ type: 'Sales', id: 'LIST' }],
    }),
    getSale: build.query({
      query: id => `/sales/${id}`,
      providesTags: (r, e, id) => [{ type: 'Sales', id }],
    }),
    createSale: build.mutation({
      query: body => ({ url: '/sales', method: 'POST', body }),
      invalidatesTags: [{ type: 'Sales', id: 'LIST' }],
    }),
    holdSale: build.mutation({
      query: body => ({ url: '/sales/hold', method: 'POST', body }),
      invalidatesTags: [{ type: 'Sales', id: 'LIST' }],
    }),
    getHeldSales: build.query({
      query: () => '/sales/held',
      providesTags: [{ type: 'Sales', id: 'HELD' }],
    }),
    deleteSale: build.mutation({
      query: id => ({ url: `/sales/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Sales', id: 'LIST' }],
    }),
    returnSale: build.mutation({
      query: ({ id, ...body }) => ({ url: `/sales/${id}/return`, method: 'POST', body }),
      invalidatesTags: (r, e, { id }) => [{ type: 'Sales', id }, { type: 'Sales', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetSalesQuery,
  useGetSaleQuery,
  useCreateSaleMutation,
  useHoldSaleMutation,
  useGetHeldSalesQuery,
  useDeleteSaleMutation,
  useReturnSaleMutation,
} = salesApi;
