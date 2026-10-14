import { api } from '../../app/baseApi';

const loadingSheetsApi = api.injectEndpoints({
  endpoints: b => ({
    getLoadingSheets: b.query({
      query: () => '/loading-sheets',
      providesTags: ['LoadingSheets'],
    }),
    getAvailableSales: b.query({
      query: date => `/loading-sheets/available-sales?date=${date}`,
      providesTags: ['LoadingSheets'],
    }),
    getLoadingSheet: b.query({
      query: id => `/loading-sheets/${id}`,
      providesTags: (r, e, id) => [{ type: 'LoadingSheets', id }],
    }),
    createLoadingSheet: b.mutation({
      query: body => ({ url: '/loading-sheets', method: 'POST', body }),
      invalidatesTags: ['LoadingSheets'],
    }),
    addSaleToSheet: b.mutation({
      query: ({ id, invoice_no }) => ({ url: `/loading-sheets/${id}/add-sale`, method: 'POST', body: { invoice_no } }),
      invalidatesTags: (r, e, { id }) => [{ type: 'LoadingSheets', id }, 'LoadingSheets'],
    }),
    removeSaleFromSheet: b.mutation({
      query: ({ id, saleId }) => ({ url: `/loading-sheets/${id}/items/${saleId}`, method: 'DELETE' }),
      invalidatesTags: (r, e, { id }) => [{ type: 'LoadingSheets', id }, 'LoadingSheets'],
    }),
    deliverSheet: b.mutation({
      query: id => ({ url: `/loading-sheets/${id}/deliver`, method: 'POST' }),
      invalidatesTags: (r, e, id) => [{ type: 'LoadingSheets', id }, 'LoadingSheets'],
    }),
    deleteLoadingSheet: b.mutation({
      query: id => ({ url: `/loading-sheets/${id}`, method: 'DELETE' }),
      invalidatesTags: ['LoadingSheets'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetLoadingSheetsQuery,
  useGetLoadingSheetQuery,
  useGetAvailableSalesQuery,
  useCreateLoadingSheetMutation,
  useAddSaleToSheetMutation,
  useRemoveSaleFromSheetMutation,
  useDeliverSheetMutation,
  useDeleteLoadingSheetMutation,
} = loadingSheetsApi;
