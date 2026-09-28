import { api } from '../../app/baseApi';

export const extensionsApi = api.injectEndpoints({
  endpoints: build => ({
    getExtensions: build.query({
      query: () => '/extensions',
      keepUnusedDataFor: 300,
    }),
    sendSmsReceipt: build.mutation({
      query: body => ({ url: '/extensions/sms/send', method: 'POST', body }),
    }),
  }),
  overrideExisting: false,
});

export const { useGetExtensionsQuery, useSendSmsReceiptMutation } = extensionsApi;
