import { api } from '../../app/baseApi';

const coopCityApi = api.injectEndpoints({
  endpoints: b => ({
    getCoopStores: b.query({
      query: () => '/coop-city/stores',
      providesTags: ['CoopStores'],
    }),
    createCoopStore: b.mutation({
      query: body => ({ url: '/coop-city/stores', method: 'POST', body }),
      invalidatesTags: ['CoopStores'],
    }),
    deleteCoopStore: b.mutation({
      query: id => ({ url: `/coop-city/stores/${id}`, method: 'DELETE' }),
      invalidatesTags: ['CoopStores'],
    }),
    getCoopTransfers: b.query({
      query: () => '/coop-city/transfers',
      providesTags: ['CoopTransfers'],
    }),
    getCoopTransfer: b.query({
      query: id => `/coop-city/transfers/${id}`,
      providesTags: (r, e, id) => [{ type: 'CoopTransfers', id }],
    }),
    createCoopTransfer: b.mutation({
      query: body => ({ url: '/coop-city/transfers', method: 'POST', body }),
      invalidatesTags: ['CoopTransfers', 'Products'],
    }),
    deleteCoopTransfer: b.mutation({
      query: id => ({ url: `/coop-city/transfers/${id}`, method: 'DELETE' }),
      invalidatesTags: ['CoopTransfers', 'Products'],
    }),
  }),
});

export const {
  useGetCoopStoresQuery,
  useCreateCoopStoreMutation,
  useDeleteCoopStoreMutation,
  useGetCoopTransfersQuery,
  useGetCoopTransferQuery,
  useCreateCoopTransferMutation,
  useDeleteCoopTransferMutation,
} = coopCityApi;
