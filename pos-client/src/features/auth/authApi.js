import { api } from '../../app/baseApi';

export const authApi = api.injectEndpoints({
  endpoints: build => ({
    login:  build.mutation({ query: body => ({ url: '/auth/login', method: 'POST', body }) }),
    logout: build.mutation({ query: ()   => ({ url: '/auth/logout', method: 'POST' }) }),
    me:     build.query({   query: ()   => '/me' }),
  }),
});

export const { useLoginMutation, useLogoutMutation, useMeQuery } = authApi;
