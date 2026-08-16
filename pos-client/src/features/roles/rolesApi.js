import { api } from '../../app/baseApi';

const rolesApi = api.injectEndpoints({
  endpoints: b => ({
    getRoles:    b.query({ query: () => '/roles',          providesTags: ['Roles'] }),
    getFeatures: b.query({ query: () => '/roles/features', providesTags: ['Features'] }),
    setRoleFeatures: b.mutation({
      query: ({ id, features }) => ({ url: `/roles/${id}/features`, method: 'PUT', body: { features } }),
      invalidatesTags: ['Roles'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetRolesQuery,
  useGetFeaturesQuery,
  useSetRoleFeaturesMutation,
} = rolesApi;
