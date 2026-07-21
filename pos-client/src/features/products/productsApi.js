import { api } from '../../app/baseApi';

export const productsApi = api.injectEndpoints({
  endpoints: build => ({
    getProducts: build.query({
      query: params => ({ url: '/products', params }),
      providesTags: (result) =>
        result
          ? [...result.data.map(p => ({ type: 'Products', id: p.id })), { type: 'Products', id: 'LIST' }]
          : [{ type: 'Products', id: 'LIST' }],
    }),
    getProduct: build.query({
      query: id => `/products/${id}`,
      providesTags: (r, e, id) => [{ type: 'Products', id }],
    }),
    createProduct: build.mutation({
      query: body => ({ url: '/products', method: 'POST', body }),
      invalidatesTags: [{ type: 'Products', id: 'LIST' }],
    }),
    updateProduct: build.mutation({
      query: ({ id, ...body }) => ({ url: `/products/${id}`, method: 'PUT', body }),
      invalidatesTags: (r, e, { id }) => [{ type: 'Products', id }, { type: 'Products', id: 'LIST' }],
    }),
    deleteProduct: build.mutation({
      query: id => ({ url: `/products/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Products', id: 'LIST' }],
    }),
    getCategories: build.query({
      query: () => '/categories',
      providesTags: ['Categories'],
    }),
    importProducts: build.mutation({
      query: body => ({ url: '/products/import', method: 'POST', body }),
      invalidatesTags: [{ type: 'Products', id: 'LIST' }],
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
