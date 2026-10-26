import { api } from '../../app/baseApi';

export const vanSalesApi = api.injectEndpoints({
  endpoints: build => ({
    getVanTrips:    build.query({ query: () => '/van-sales', providesTags: ['VanTrips'] }),
    getVanTrip:     build.query({ query: id => `/van-sales/${id}`, providesTags: (r, e, id) => [{ type: 'VanTrips', id }] }),
    getSettlement:  build.query({ query: id => `/van-sales/${id}/settlement`, providesTags: (r, e, id) => [{ type: 'VanTrips', id }] }),
    createVanTrip:  build.mutation({ query: body => ({ url: '/van-sales', method: 'POST', body }), invalidatesTags: ['VanTrips'] }),
    addDailyRecord: build.mutation({ query: ({ id, ...body }) => ({ url: `/van-sales/${id}/daily`, method: 'POST', body }), invalidatesTags: (r, e, { id }) => [{ type: 'VanTrips', id }, 'VanTrips'] }),
    addRefill:      build.mutation({ query: ({ id, ...body }) => ({ url: `/van-sales/${id}/refill`, method: 'POST', body }), invalidatesTags: (r, e, { id }) => [{ type: 'VanTrips', id }, 'VanTrips'] }),
    unloadTrip:     build.mutation({ query: ({ id, ...body }) => ({ url: `/van-sales/${id}/unload`, method: 'POST', body }), invalidatesTags: (r, e, { id }) => [{ type: 'VanTrips', id }, 'VanTrips'] }),
    deleteVanTrip:  build.mutation({ query: id => ({ url: `/van-sales/${id}`, method: 'DELETE' }), invalidatesTags: ['VanTrips'] }),
  }),
});

export const {
  useGetVanTripsQuery,
  useGetVanTripQuery,
  useGetSettlementQuery,
  useCreateVanTripMutation,
  useAddDailyRecordMutation,
  useAddRefillMutation,
  useUnloadTripMutation,
  useDeleteVanTripMutation,
} = vanSalesApi;
