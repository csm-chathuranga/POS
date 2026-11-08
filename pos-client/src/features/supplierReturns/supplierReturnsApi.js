import { api } from '../../app/baseApi';

export const supplierReturnsApi = api.injectEndpoints({
  endpoints: build => ({
    getSupplierReturns: build.query({
      query: params => ({ url: '/supplier-returns', params }),
      providesTags: r =>
        r
          ? [...r.data.map(s => ({ type: 'SupplierReturns', id: s.id })), { type: 'SupplierReturns', id: 'LIST' }]
          : [{ type: 'SupplierReturns', id: 'LIST' }],
    }),
    getSupplierReturn: build.query({
      query: id => `/supplier-returns/${id}`,
      providesTags: (r, e, id) => [{ type: 'SupplierReturns', id }],
    }),
    createSupplierReturn: build.mutation({
      query: body => ({ url: '/supplier-returns', method: 'POST', body }),
      invalidatesTags: [{ type: 'SupplierReturns', id: 'LIST' }, { type: 'Products', id: 'LIST' }],
    }),
    deleteSupplierReturn: build.mutation({
      query: id => ({ url: `/supplier-returns/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'SupplierReturns', id: 'LIST' }, { type: 'Products', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetSupplierReturnsQuery,
  useGetSupplierReturnQuery,
  useCreateSupplierReturnMutation,
  useDeleteSupplierReturnMutation,
} = supplierReturnsApi;
