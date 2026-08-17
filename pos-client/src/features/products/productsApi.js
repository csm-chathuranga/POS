import { api } from '../../app/baseApi';
import { refreshProductCache } from '../../hooks/useProductCache';

export const productsApi = api.injectEndpoints({
  endpoints: build => ({
    getProducts: build.query({
      query: params => ({ url: '/products', params }),
      keepUnusedDataFor: 300,
      providesTags: (result) =>
        result
          ? [...result.data.map(p => ({ type: 'Products', id: p.id })), { type: 'Products', id: 'LIST' }]
          : [{ type: 'Products', id: 'LIST' }],
    }),
    getProduct: build.query({
      query: id => `/products/${id}`,
      keepUnusedDataFor: 1800,
      providesTags: (r, e, id) => [{ type: 'Products', id }],
    }),
    createProduct: build.mutation({
      query: body => ({ url: '/products', method: 'POST', body }),
      invalidatesTags: [{ type: 'Products', id: 'LIST' }],
      onQueryStarted: async (_, { queryFulfilled }) => {
        try { await queryFulfilled; refreshProductCache(); } catch {}
      },
    }),
    updateProduct: build.mutation({
      query: ({ id, ...body }) => ({ url: `/products/${id}`, method: 'PUT', body }),
      invalidatesTags: (r, e, { id }) => [{ type: 'Products', id }, { type: 'Products', id: 'LIST' }],
      onQueryStarted: async (_, { queryFulfilled }) => {
        try { await queryFulfilled; refreshProductCache(); } catch {}
      },
    }),
    deleteProduct: build.mutation({
      query: id => ({ url: `/products/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Products', id: 'LIST' }],
      onQueryStarted: async (_, { queryFulfilled }) => {
        try { await queryFulfilled; refreshProductCache(); } catch {}
      },
    }),
    getCategories: build.query({
      query: () => '/categories',
      keepUnusedDataFor: 7200,
      providesTags: ['Categories'],
    }),
    importProducts: build.mutation({
      query: body => ({ url: '/products/import', method: 'POST', body }),
      invalidatesTags: [{ type: 'Products', id: 'LIST' }],
      onQueryStarted: async (_, { queryFulfilled }) => {
        try { await queryFulfilled; refreshProductCache(); } catch {}
      },
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGetCategoriesQuery,
  useImportProductsMutation,
} = productsApi;
