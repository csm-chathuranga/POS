import { api } from '../../app/baseApi';

export const categoriesApi = api.injectEndpoints({
  endpoints: build => ({
    getCategories: build.query({
      query: () => '/categories',
      keepUnusedDataFor: 7200,
      providesTags: r =>
        r ? [...r.map(c => ({ type: 'Categories', id: c.id })), { type: 'Categories', id: 'LIST' }]
          : [{ type: 'Categories', id: 'LIST' }],
    }),
    createCategory: build.mutation({
      query: body => ({ url: '/categories', method: 'POST', body }),
      invalidatesTags: [{ type: 'Categories', id: 'LIST' }],
    }),
    updateCategory: build.mutation({
      query: ({ id, ...body }) => ({ url: `/categories/${id}`, method: 'PUT', body }),
      invalidatesTags: (r, e, { id }) => [{ type: 'Categories', id }, { type: 'Categories', id: 'LIST' }],
    }),
    deleteCategory: build.mutation({
      query: id => ({ url: `/categories/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Categories', id: 'LIST' }],
    }),
    importCategories: build.mutation({
      query: body => ({ url: '/categories/import', method: 'POST', body }),
      invalidatesTags: [{ type: 'Categories', id: 'LIST' }],
    }),
    truncateCategories: build.mutation({
      query: () => ({ url: '/categories/truncate', method: 'POST', body: { confirm: 'TRUNCATE_CATEGORIES' } }),
      invalidatesTags: [{ type: 'Categories', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useImportCategoriesMutation,
  useTruncateCategoriesMutation,
} = categoriesApi;
