import { api } from '../../app/baseApi';

export const purchasesApi = api.injectEndpoints({
  endpoints: build => ({
    getPurchases: build.query({
      query: params => ({ url: '/purchases', params }),
      providesTags: (r) =>
        r ? [...r.data.map(p => ({ type: 'Purchases', id: p.id })), { type: 'Purchases', id: 'LIST' }]
          : [{ type: 'Purchases', id: 'LIST' }],
    }),
    getPurchase: build.query({
      query: id => `/purchases/${id}`,
      providesTags: (r, e, id) => [{ type: 'Purchases', id }],
    }),
    createPurchase: build.mutation({
      query: body => ({ url: '/purchases', method: 'POST', body }),
      invalidatesTags: [{ type: 'Purchases', id: 'LIST' }],
    }),
    deletePurchase: build.mutation({
      query: id => ({ url: `/purchases/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Purchases', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetPurchasesQuery,
  useGetPurchaseQuery,
  useCreatePurchaseMutation,
  useDeletePurchaseMutation,
} = purchasesApi;
