import { api } from '../../app/baseApi';

export const suppliersApi = api.injectEndpoints({
  endpoints: build => ({
    getSuppliers: build.query({
      query: () => '/suppliers',
      providesTags: (r) =>
        r ? [...r.map(s => ({ type: 'Suppliers', id: s.id })), { type: 'Suppliers', id: 'LIST' }]
          : [{ type: 'Suppliers', id: 'LIST' }],
    }),
    createSupplier: build.mutation({
      query: body => ({ url: '/suppliers', method: 'POST', body }),
      invalidatesTags: [{ type: 'Suppliers', id: 'LIST' }],
    }),
    updateSupplier: build.mutation({
      query: ({ id, ...body }) => ({ url: `/suppliers/${id}`, method: 'PUT', body }),
      invalidatesTags: (r, e, { id }) => [{ type: 'Suppliers', id }, { type: 'Suppliers', id: 'LIST' }],
    }),
    deleteSupplier: build.mutation({
      query: id => ({ url: `/suppliers/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Suppliers', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
} = suppliersApi;
