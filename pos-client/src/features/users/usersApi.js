import { api } from '../../app/baseApi';

export const usersApi = api.injectEndpoints({
  endpoints: build => ({
    getUsers: build.query({
      query: () => '/users',
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
  }),
});

export const {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} = usersApi;
