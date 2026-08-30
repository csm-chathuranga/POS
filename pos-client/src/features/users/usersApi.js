import { api } from '../../app/baseApi';

export const usersApi = api.injectEndpoints({
  endpoints: build => ({
    getUsers: build.query({
      query: () => '/users',
      keepUnusedDataFor: 7200,
      providesTags: (r) =>
        r ? [...r.map(u => ({ type: 'Users', id: u.id })), { type: 'Users', id: 'LIST' }]
          : [{ type: 'Users', id: 'LIST' }],
    }),
    createUser: build.mutation({
      query: body => ({ url: '/users', method: 'POST', body }),
      invalidatesTags: [{ type: 'Users', id: 'LIST' }],
    }),
    updateUser: build.mutation({
      query: ({ id, ...body }) => ({ url: `/users/${id}`, method: 'PUT', body }),
      invalidatesTags: (r, e, { id }) => [{ type: 'Users', id }, { type: 'Users', id: 'LIST' }],
    }),
    deleteUser: build.mutation({
      query: id => ({ url: `/users/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Users', id: 'LIST' }],
    }),
    // Feature management
    getAllFeatures: build.query({
      query: () => '/features',
      keepUnusedDataFor: 3600,
    }),
    getUserFeatures: build.query({
      query: id => `/users/${id}/features`,
      providesTags: (r, e, id) => [{ type: 'UserFeatures', id }],
    }),
    setUserFeatures: build.mutation({
      query: ({ id, features }) => ({ url: `/users/${id}/features`, method: 'PUT', body: { features } }),
      invalidatesTags: (r, e, { id }) => [{ type: 'UserFeatures', id }],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetAllFeaturesQuery,
  useGetUserFeaturesQuery,
  useSetUserFeaturesMutation,
} = usersApi;
