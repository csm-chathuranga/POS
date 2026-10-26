import { api } from '../../app/baseApi';

export const modulesApi = api.injectEndpoints({
  endpoints: build => ({
    getModules: build.query({
      query: () => '/admin/modules',
      providesTags: ['Modules'],
    }),
    toggleModule: build.mutation({
      query: key => ({ url: `/admin/modules/${key}/toggle`, method: 'PATCH' }),
      invalidatesTags: ['Modules', 'Features', 'Me'],
    }),
  }),
  overrideExisting: false,
});

export const { useGetModulesQuery, useToggleModuleMutation } = modulesApi;
